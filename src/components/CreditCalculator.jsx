import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Printer, 
  Sliders 
} from 'lucide-react';
import { formatCurrency, DEFAULT_RATES } from '../utils/currency';
import Button from './ui/Button';
import Card from './ui/Card';
import Input from './ui/Input';

export default function CreditCalculator({ products = [], rates = DEFAULT_RATES }) {
  const [calcCurrency, setCalcCurrency] = useState('USD');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [productPrice, setProductPrice] = useState(1000);
  const [downPayment, setDownPayment] = useState(200);
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [duration, setDuration] = useState(12);
  const [annualRate, setAnnualRate] = useState(24);
  const [calcType] = useState('annuity');
  
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [totalInterest, setTotalInterest] = useState(0);
  const [totalPayable, setTotalPayable] = useState(0);
  const [schedule, setSchedule] = useState([]);

  const matchingProducts = searchTerm.trim() ? products.filter(p =>
    (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.model && p.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  ) : [];

  const handleCurrencyToggle = (newCurrency) => {
    if (newCurrency === calcCurrency) return;
    
    const priceInUSD = productPrice / (rates[calcCurrency] || 1);
    const newPrice = Math.round(priceInUSD * (rates[newCurrency] || 1));
    
    const downInUSD = downPayment / (rates[calcCurrency] || 1);
    const newDown = Math.round(downInUSD * (rates[newCurrency] || 1));
    
    setProductPrice(newPrice);
    setDownPayment(newDown);
    setCalcCurrency(newCurrency);
  };

  const handleSelectProduct = (prod) => {
    setSelectedProductId(prod.id);
    setSearchTerm(prod.name);
    setIsSearchOpen(false);

    const price = Math.round(prod.selling_price * (rates[calcCurrency] || 1));
    setProductPrice(price);
    const downVal = Math.round(price * (downPaymentPercent / 100));
    setDownPayment(downVal);
  };

  useEffect(() => {
    const loanAmount = Math.max(0, productPrice - downPayment);
    let monthlyVal = 0;
    let totalPayableVal = 0;
    let interestVal = 0;
    const scheduleData = [];

    if (loanAmount <= 0) {
      setMonthlyPayment(0);
      setTotalInterest(0);
      setTotalPayable(0);
      setSchedule([]);
      return;
    }

    if (calcType === 'annuity') {
      const monthlyRate = annualRate / 12 / 100;
      if (monthlyRate === 0) {
        monthlyVal = loanAmount / duration;
        totalPayableVal = loanAmount;
      } else {
        monthlyVal = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, duration)) / (Math.pow(1 + monthlyRate, duration) - 1);
        totalPayableVal = monthlyVal * duration;
      }
      interestVal = totalPayableVal - loanAmount;

      let remainingBalance = loanAmount;
      for (let month = 1; month <= duration; month++) {
        const interestPayment = remainingBalance * monthlyRate;
        const principalPayment = monthlyVal - interestPayment;
        remainingBalance = Math.max(0, remainingBalance - principalPayment);

        scheduleData.push({
          month,
          payment: monthlyVal,
          principal: principalPayment,
          interest: interestPayment,
          balance: remainingBalance
        });
      }
    } else {
      const totalInterestRate = (annualRate / 100) * (duration / 12);
      interestVal = loanAmount * totalInterestRate;
      totalPayableVal = loanAmount + interestVal;
      monthlyVal = totalPayableVal / duration;

      const monthlyPrincipal = loanAmount / duration;
      const monthlyInterest = interestVal / duration;
      let remainingBalance = loanAmount;

      for (let month = 1; month <= duration; month++) {
        remainingBalance = Math.max(0, remainingBalance - monthlyPrincipal);
        scheduleData.push({
          month,
          payment: monthlyVal,
          principal: monthlyPrincipal,
          interest: monthlyInterest,
          balance: remainingBalance
        });
      }
    }

    setMonthlyPayment(Math.round(monthlyVal));
    setTotalInterest(Math.round(interestVal));
    setTotalPayable(Math.round(totalPayableVal));
    setSchedule(scheduleData);
  }, [productPrice, downPayment, duration, annualRate, calcType]);

  const handlePriceChange = (val) => {
    const p = Math.max(0, parseFloat(val) || 0);
    setProductPrice(p);
    setDownPayment(Math.round(p * (downPaymentPercent / 100)));
  };

  const handlePercentChange = (pct) => {
    setDownPaymentPercent(pct);
    setDownPayment(Math.round(productPrice * (pct / 100)));
  };

  const formatCurr = (val) => formatCurrency(val, calcCurrency, rates);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Kredit va Muddatli To'lov Kalkulyatori
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Nasiya to'lovi grafigi va oylik badal miqdorini aniq hisoblash
          </p>
        </div>

        {/* Currency Switcher */}
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
          {['USD', 'UZS', 'EUR', 'RUB'].map(c => (
            <button
              key={c}
              onClick={() => handleCurrencyToggle(c)}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: calcCurrency === c ? 'var(--brand-accent)' : 'transparent',
                color: calcCurrency === c ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '11.5px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Controls vs Results */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Controls Card */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={18} style={{ color: 'var(--brand-accent)' }} />
            Hisob-kitob Parametrlari
          </h2>

          {/* Product Autocomplete Search */}
          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Ombordan Tovar Tanlash</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Tovarni qidirish..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setIsSearchOpen(true); }}
                onFocus={() => setIsSearchOpen(true)}
                style={{ paddingLeft: '38px' }}
              />
            </div>
            {isSearchOpen && matchingProducts.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: 'var(--radius-md)',
                zIndex: 200,
                maxHeight: '200px',
                overflowY: 'auto',
                boxShadow: 'var(--shadow-lg)'
              }}>
                {matchingProducts.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProduct(p)}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--card-border)', fontSize: '13px' }}
                  >
                    <div style={{ fontWeight: '600' }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--brand-gold)' }}>{formatCurr(p.selling_price)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Price & Slider */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label className="form-label">Tovar Narxi</label>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--brand-gold)' }}>{formatCurr(productPrice)}</span>
            </div>
            <input
              type="range"
              min="100"
              max="50000"
              step="50"
              value={productPrice}
              onChange={(e) => handlePriceChange(e.target.value)}
              style={{ width: '100%', accentColor: 'var(--brand-accent)' }}
            />
          </div>

          {/* Down Payment & Preset Pills */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label className="form-label">Boshlang'ich To'lov ({downPaymentPercent}%)</label>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--success)' }}>{formatCurr(downPayment)}</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              {[0, 10, 20, 30, 50].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePercentChange(pct)}
                  style={{
                    flex: 1,
                    padding: '4px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--card-border)',
                    background: downPaymentPercent === pct ? 'var(--brand-accent)' : 'var(--bg-secondary)',
                    color: downPaymentPercent === pct ? '#ffffff' : 'var(--text-muted)',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Loan Duration Slider */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label className="form-label">Nasiya Muddati</label>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{duration} oy</span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[3, 6, 9, 12, 18, 24, 36].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDuration(m)}
                  style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--card-border)',
                    background: duration === m ? 'var(--brand-accent)' : 'var(--bg-secondary)',
                    color: duration === m ? '#ffffff' : 'var(--text-muted)',
                    fontSize: '11.5px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {m} oy
                </button>
              ))}
            </div>
          </div>

          {/* Annual Interest Rate */}
          <Input 
            label="Yillik Ustama Foizi (%)" 
            type="number" 
            value={annualRate} 
            onChange={(e) => setAnnualRate(parseFloat(e.target.value) || 0)} 
          />
        </Card>

        {/* Results Metrics Display Card */}
        <Card style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h2 className="card-title" style={{ marginBottom: '20px' }}>To'lov Xulosasi</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Oylik Badal To'lovi</div>
                <div style={{ fontSize: '32px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--brand-gold)', marginTop: '2px' }}>
                  {formatCurr(monthlyPayment)}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Moliya Qarz Summasi</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', marginTop: '2px' }}>{formatCurr(Math.max(0, productPrice - downPayment))}</div>
                </div>

                <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Jami Ustama Foiz</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--warning)', marginTop: '2px' }}>{formatCurr(totalInterest)}</div>
                </div>
              </div>

              <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Jami Qaytariladigan Summa</div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--success)', marginTop: '2px' }}>{formatCurr(totalPayable + downPayment)}</div>
              </div>
            </div>
          </div>

          <Button variant="primary" onClick={() => window.print()} style={{ marginTop: '20px' }}>
            <Printer size={16} /> Grafikni Chop Etish
          </Button>
        </Card>
      </div>

      {/* Schedule Table */}
      <div className="table-container">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', fontWeight: '700' }}>
          Oylik To'lovlar Grafigi ({schedule.length} oy)
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Oy №</th>
              <th>Oylik Badal</th>
              <th>Asosiy Qarz</th>
              <th>Ustama Foiz</th>
              <th>Qoldiq Qarz</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map(s => (
              <tr key={s.month}>
                <td style={{ fontWeight: '700' }}>{s.month}-oy</td>
                <td style={{ fontWeight: '700', color: 'var(--brand-gold)' }}>{formatCurr(s.payment)}</td>
                <td>{formatCurr(s.principal)}</td>
                <td style={{ color: 'var(--warning)' }}>{formatCurr(s.interest)}</td>
                <td>{formatCurr(s.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
