import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Search, 
  Printer 
} from 'lucide-react';
import { formatCurrency, DEFAULT_RATES } from '../utils/currency';
import Button from './ui/Button';
import Card from './ui/Card';
import Input from './ui/Input';

export default function CreditCalculator({ products = [], rates = DEFAULT_RATES }) {
  const [calcCurrency, setCalcCurrency] = useState('USD');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Aniq raqamli kiritish inputlari (No Sliders!)
  const [productPrice, setProductPrice] = useState(3500000);
  const [downPayment, setDownPayment] = useState(500000);
  const [duration, setDuration] = useState(12);
  const [annualRate, setAnnualRate] = useState(26);
  const [calcType, setCalcType] = useState('annuity'); // 'annuity' yoki 'differential'

  const [monthlyPaymentDisplay, setMonthlyPaymentDisplay] = useState(0);
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
    setSearchTerm(prod.name);
    setIsSearchOpen(false);

    const price = Math.round(prod.selling_price * (rates[calcCurrency] || 1));
    setProductPrice(price);
    setDownPayment(Math.round(price * 0.15)); // 15% default boshlang'ich
  };

  useEffect(() => {
    const loanAmount = Math.max(0, productPrice - downPayment);
    let monthlyVal = 0;
    let totalPayableVal = 0;
    let interestVal = 0;
    const scheduleData = [];

    if (loanAmount <= 0 || duration <= 0) {
      setMonthlyPaymentDisplay(0);
      setTotalInterest(0);
      setTotalPayable(0);
      setSchedule([]);
      return;
    }

    const monthlyRate = annualRate / 12 / 100;

    if (calcType === 'annuity') {
      // ANNUITET (Teng oylik to'lov)
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

      setMonthlyPaymentDisplay(Math.round(monthlyVal));

    } else {
      // DIFFERENSIAL (Kamayib boruvchi oylik to'lov)
      const monthlyPrincipal = loanAmount / duration;
      let remainingBalance = loanAmount;
      let sumInterest = 0;

      for (let month = 1; month <= duration; month++) {
        const interestPayment = remainingBalance * monthlyRate;
        const totalMonthly = monthlyPrincipal + interestPayment;
        remainingBalance = Math.max(0, remainingBalance - monthlyPrincipal);
        sumInterest += interestPayment;

        scheduleData.push({
          month,
          payment: totalMonthly,
          principal: monthlyPrincipal,
          interest: interestPayment,
          balance: remainingBalance
        });
      }

      interestVal = sumInterest;
      totalPayableVal = loanAmount + interestVal;
      // Differensialda birinchi oydagi eng yuqori to'lov ko'rsatiladi
      setMonthlyPaymentDisplay(Math.round(scheduleData[0]?.payment || 0));
    }

    setTotalInterest(Math.round(interestVal));
    setTotalPayable(Math.round(totalPayableVal));
    setSchedule(scheduleData);
  }, [productPrice, downPayment, duration, annualRate, calcType]);

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
            Annuitet va Differensial hisoblash usullari bo'yicha aniq to'lov grafigi
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

      {/* Controls vs Results Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Controls Card */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calculator size={18} style={{ color: 'var(--brand-accent)' }} />
            Hisob-kitob Parametrlari
          </h2>

          {/* Product Autocomplete Search */}
          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Ombordan Tovar Tanlash (Ixtiyoriy)</label>
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

          {/* Calculation Type Toggle (Annuitet vs Differensial) */}
          <div className="form-group">
            <label className="form-label">Hisoblash Usuli</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setCalcType('annuity')}
                style={{
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--card-border)',
                  background: calcType === 'annuity' ? 'var(--brand-accent)' : 'var(--bg-secondary)',
                  color: calcType === 'annuity' ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                ○ Annuitet (Teng to'lov)
              </button>
              <button
                type="button"
                onClick={() => setCalcType('differential')}
                style={{
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--card-border)',
                  background: calcType === 'differential' ? 'var(--brand-accent)' : 'var(--bg-secondary)',
                  color: calcType === 'differential' ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                ○ Differensial (Kamayuvchi)
              </button>
            </div>
          </div>

          {/* Direct Numeric Input Fields (NO RANGE SLIDERS) */}
          <Input 
            label={`Kredit / Tovar Summasi (${calcCurrency}) *`} 
            type="number" 
            value={productPrice} 
            onChange={(e) => setProductPrice(Math.max(0, parseFloat(e.target.value) || 0))} 
            required 
          />

          <Input 
            label={`Boshlang'ich To'lov (${calcCurrency})`} 
            type="number" 
            value={downPayment} 
            onChange={(e) => setDownPayment(Math.max(0, parseFloat(e.target.value) || 0))} 
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input 
              label="Nasiya Muddati (Oylar soni) *" 
              type="number" 
              value={duration} 
              onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value, 10) || 1))} 
              min="1" 
              max="60" 
              required 
            />

            <Input 
              label="Yillik Foiz Stavkasi (%) *" 
              type="number" 
              value={annualRate} 
              onChange={(e) => setAnnualRate(Math.max(0, parseFloat(e.target.value) || 0))} 
              required 
            />
          </div>
        </Card>

        {/* Results Metrics Display Card */}
        <Card style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h2 className="card-title" style={{ marginBottom: '20px' }}>To'lov Xulosasi va Metrikasi</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
                  {calcType === 'annuity' ? "Oylik Badal To'lovi" : "1-Oydagi Boshlang'ich To'lov"}
                </div>
                <div style={{ fontSize: '32px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--brand-gold)', marginTop: '2px' }}>
                  {formatCurr(monthlyPaymentDisplay)}
                </div>
                {calcType === 'differential' && (
                  <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '2px' }}>
                    * Keyingi oylarda to'lov miqdori bosqichma-bosqich kamayib boradi
                  </div>
                )}
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
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Jami Qaytariladigan Summa (Boshlang'ich bilan)</div>
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
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Oylik To'lovlar Grafigi ({schedule.length} oy) — {calcType === 'annuity' ? 'Annuitet' : 'Differensial'}</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Oy №</th>
              <th>Asosiy Qarz</th>
              <th>Foiz</th>
              <th>Oylik To'lov</th>
              <th>Qolgan Qarz</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map(s => (
              <tr key={s.month}>
                <td style={{ fontWeight: '700' }}>{s.month}-oy</td>
                <td>{formatCurr(s.principal)}</td>
                <td style={{ color: 'var(--warning)' }}>{formatCurr(s.interest)}</td>
                <td style={{ fontWeight: '700', color: 'var(--brand-gold)' }}>{formatCurr(s.payment)}</td>
                <td>{formatCurr(s.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
