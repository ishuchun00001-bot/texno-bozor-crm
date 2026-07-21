import React, { useState, useEffect } from 'react';
import { formatCurrency, DEFAULT_RATES } from '../utils/currency';

export default function CreditCalculator({ products = [], rates = DEFAULT_RATES }) {
  const [calcCurrency, setCalcCurrency] = useState('USD'); // 'USD', 'UZS', 'EUR', 'RUB'
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productPrice, setProductPrice] = useState(1000);
  const [downPayment, setDownPayment] = useState(200);
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [duration, setDuration] = useState(12); // Oylar soni
  const [annualRate, setAnnualRate] = useState(24); // Yillik foiz
  const [calcType, setCalcType] = useState('annuity'); // 'annuity' yoki 'flat' (oddiy)
  
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [totalInterest, setTotalInterest] = useState(0);
  const [totalPayable, setTotalPayable] = useState(0);
  const [schedule, setSchedule] = useState([]);

  // Valyuta o'zgarganda qiymatlarni konvertatsiya qilish
  const handleCurrencyToggle = (newCurrency) => {
    if (newCurrency === calcCurrency) return;
    
    // Convert from calcCurrency to USD, then from USD to newCurrency
    const priceInUSD = productPrice / (rates[calcCurrency] || 1);
    const newPrice = Math.round(priceInUSD * (rates[newCurrency] || 1));
    
    const downInUSD = downPayment / (rates[calcCurrency] || 1);
    const newDown = Math.round(downInUSD * (rates[newCurrency] || 1));
    
    setProductPrice(newPrice);
    setDownPayment(newDown);
    setCalcCurrency(newCurrency);
  };

  // Mahsulot tanlanganda narxni yangilash
  useEffect(() => {
    if (selectedProductId) {
      const prod = products.find(p => p.id === selectedProductId);
      if (prod) {
        const price = Math.round(prod.selling_price * (rates[calcCurrency] || 1));
        setProductPrice(price);
        // Boshlang'ich to'lov foizini hisoblash
        const downVal = Math.round(price * (downPaymentPercent / 100));
        setDownPayment(downVal);
      }
    }
  }, [selectedProductId, products, calcCurrency, rates, downPaymentPercent]);

  // Hisob-kitoblarni amalga oshirish
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
      // Annuitet usuli
      const monthlyRate = annualRate / 12 / 100;
      if (monthlyRate === 0) {
        monthlyVal = loanAmount / duration;
        totalPayableVal = loanAmount;
      } else {
        monthlyVal = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, duration)) / (Math.pow(1 + monthlyRate, duration) - 1);
        totalPayableVal = monthlyVal * duration;
      }
      interestVal = totalPayableVal - loanAmount;

      // Jadvalni yaratish
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
      // Oddiy (Flat / Oddiy ustama) usuli
      const totalInterestRate = (annualRate / 100) * (duration / 12);
      interestVal = loanAmount * totalInterestRate;
      totalPayableVal = loanAmount + interestVal;
      monthlyVal = totalPayableVal / duration;

      // Jadvalni yaratish
      let remainingBalance = loanAmount;
      const flatInterestPerMonth = interestVal / duration;
      const flatPrincipalPerMonth = loanAmount / duration;

      for (let month = 1; month <= duration; month++) {
        remainingBalance = Math.max(0, remainingBalance - flatPrincipalPerMonth);
        scheduleData.push({
          month,
          payment: monthlyVal,
          principal: flatPrincipalPerMonth,
          interest: flatInterestPerMonth,
          balance: remainingBalance
        });
      }
    }

    setMonthlyPayment(Math.round(monthlyVal));
    setTotalInterest(Math.round(interestVal));
    setTotalPayable(Math.round(totalPayableVal));
    setSchedule(scheduleData);

  }, [productPrice, downPayment, duration, annualRate, calcType]);

  // Boshlang'ich to'lov o'zgarganda foizini hisoblash
  const handleDownPaymentChange = (val) => {
    const value = Math.max(0, Math.min(productPrice, val));
    setDownPayment(value);
    if (productPrice > 0) {
      setDownPaymentPercent(Math.round((value / productPrice) * 100));
    }
  };

  // Boshlang'ich to'lov foizi o'zgarganda summasini hisoblash
  const handlePercentChange = (pct) => {
    const percent = Math.max(0, Math.min(100, pct));
    setDownPaymentPercent(percent);
    setDownPayment(Math.round(productPrice * (percent / 100)));
  };

  const handlePrint = () => {
    window.print();
  };

  const formatPrimary = (val) => {
    const usdVal = val / (rates[calcCurrency] || 1);
    return formatCurrency(usdVal, calcCurrency, rates);
  };

  const formatSecondary = (val) => {
    const usdVal = val / (rates[calcCurrency] || 1);
    const secondaryCurr = calcCurrency === 'USD' ? 'UZS' : 'USD';
    return formatCurrency(usdVal, secondaryCurr, rates);
  };

  return (
    <div className="page-fade-in">
      <div className="page-header">
        <div className="page-title">
          <h1>Kredit Kalkulyatori</h1>
          <p>Mahsulotlar uchun bo'lib-bo'lib to'lash va kredit rejasini hisoblash</p>
        </div>
      </div>

      <div className="calc-grid">
        {/* Sozlamalar paneli */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--neon-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
              Kalkulyator Sozlamalari
            </h2>

            {/* Valyutani almashtirish tugmasi */}
            <div className="chart-actions" style={{ padding: '2px', display: 'flex', gap: '2px' }}>
              {['USD', 'UZS', 'EUR', 'RUB'].map((currKey) => (
                <button 
                  key={currKey}
                  className={`chart-tab ${calcCurrency === currKey ? 'active' : ''}`} 
                  onClick={() => handleCurrencyToggle(currKey)}
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                  type="button"
                >
                  {currKey}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Mahsulotni tanlang (ixtiyoriy)</label>
            <select
              className="form-control"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
            >
              <option value="">-- Mahsulotni tanlash --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({formatCurrency(p.selling_price, calcCurrency, rates)} / {formatCurrency(p.selling_price, calcCurrency === 'USD' ? 'UZS' : 'USD', rates)})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Mahsulot Narxi ({calcCurrency})</label>
            <input
              type="number"
              className="form-control"
              value={productPrice}
              onChange={(e) => {
                setSelectedProductId('');
                setProductPrice(Math.max(0, parseFloat(e.target.value) || 0));
              }}
            />
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              ~ {formatSecondary(productPrice)}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Boshlang'ich to'lov ({calcCurrency})</label>
              <input
                type="number"
                className="form-control"
                value={downPayment}
                onChange={(e) => handleDownPaymentChange(parseFloat(e.target.value) || 0)}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                ~ {formatSecondary(downPayment)}
              </div>
            </div>
            <div className="form-group">
              <label>Boshlang'ich to'lov (%)</label>
              <input
                type="number"
                className="form-control"
                value={downPaymentPercent}
                onChange={(e) => handlePercentChange(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Muddati (Oylar soni)</label>
              <select
                className="form-control"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              >
                <option value="3">3 oy</option>
                <option value="6">6 oy</option>
                <option value="9">9 oy</option>
                <option value="12">12 oy</option>
                <option value="18">18 oy</option>
                <option value="24">24 oy</option>
              </select>
            </div>
            <div className="form-group">
              <label>Yillik foiz ustamasi (%)</label>
              <input
                type="number"
                className="form-control"
                value={annualRate}
                onChange={(e) => setAnnualRate(Math.max(0, parseFloat(e.target.value) || 0))}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Hisoblash Usuli</label>
            <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)' }}>
                <input
                  type="radio"
                  name="calc_type"
                  value="annuity"
                  checked={calcType === 'annuity'}
                  onChange={() => setCalcType('annuity')}
                />
                Annuitet (Teng oylik to'lov)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)' }}>
                <input
                  type="radio"
                  name="calc_type"
                  value="flat"
                  checked={calcType === 'flat'}
                  onChange={() => setCalcType('flat')}
                />
                Oddiy (Flat / Yassi foiz)
              </label>
            </div>
          </div>

          <div className="results-panel">
            <div className="result-box">
              <div className="result-box-label">Oylik To'lov</div>
              <div className="result-box-val">{formatPrimary(monthlyPayment)}</div>
              <span className="currency-subtext" style={{ fontSize: '11px' }}>{formatSecondary(monthlyPayment)}</span>
            </div>
            <div className="result-box">
              <div className="result-box-label">Kredit Summasi</div>
              <div className="result-box-val purple">{formatPrimary(Math.max(0, productPrice - downPayment))}</div>
              <span className="currency-subtext" style={{ fontSize: '11px' }}>{formatSecondary(Math.max(0, productPrice - downPayment))}</span>
            </div>
            <div className="result-box">
              <div className="result-box-label">Jami Ustama (Foiz)</div>
              <div className="result-box-val purple">{formatPrimary(totalInterest)}</div>
              <span className="currency-subtext" style={{ fontSize: '11px' }}>{formatSecondary(totalInterest)}</span>
            </div>
            <div className="result-box">
              <div className="result-box-label">Jami To'lanadigan</div>
              <div className="result-box-val">{formatPrimary(totalPayable)}</div>
              <span className="currency-subtext" style={{ fontSize: '11px' }}>{formatSecondary(totalPayable)}</span>
            </div>
          </div>
        </div>

        {/* To'lovlar grafigi jadvali */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="schedule-header">
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>To'lovlar Jadvali</h2>
          </div>

          <div className="table-container" style={{ flexGrow: 1, maxHeight: '520px', overflowY: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Oy</th>
                  <th>To'lov Summasi</th>
                  <th>Asosiy Qarz to'lovi</th>
                  <th>Foiz to'lovi</th>
                  <th>Qoldiq Qarz</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row) => (
                  <tr key={row.month}>
                    <td>{row.month}-oy</td>
                    <td style={{ fontWeight: '600' }}>
                      {formatPrimary(row.payment)}
                      <span className="currency-subtext" style={{ fontSize: '11px' }}>{formatSecondary(row.payment)}</span>
                    </td>
                    <td>
                      {formatPrimary(row.principal)}
                      <span className="currency-subtext" style={{ fontSize: '11px' }}>{formatSecondary(row.principal)}</span>
                    </td>
                    <td style={{ color: 'var(--neon-pink)' }}>
                      {formatPrimary(row.interest)}
                      <span className="currency-subtext" style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{formatSecondary(row.interest)}</span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {formatPrimary(row.balance)}
                      <span className="currency-subtext" style={{ fontSize: '11px' }}>{formatSecondary(row.balance)}</span>
                    </td>
                  </tr>
                ))}
                {schedule.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                      Hisoblash uchun qiymatlarni kiriting
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Chop etish uchun yashirin toza varaq */}
      <div id="printable-receipt-area" style={{ display: 'none' }}>
        <div className="receipt-header">
          <div className="receipt-logo">⚡ TEXNO BOZOR</div>
          <div style={{fontSize: '11px', marginTop: '4px'}}>Kredit / Muddatli to'lov shartnomasi grafigi</div>
        </div>
        <div className="receipt-row">
          <span>Mahsulot narxi:</span>
          <span>{formatPrimary(productPrice)} ({formatSecondary(productPrice)})</span>
        </div>
        <div className="receipt-row">
          <span>Boshlang'ich to'lov:</span>
          <span>{formatPrimary(downPayment)} ({formatSecondary(downPayment)})</span>
        </div>
        <div className="receipt-row">
          <span>Kredit miqdori:</span>
          <span>{formatPrimary(productPrice - downPayment)} ({formatSecondary(productPrice - downPayment)})</span>
        </div>
        <div className="receipt-row">
          <span>Kredit muddati:</span>
          <span>{duration} oy</span>
        </div>
        <div className="receipt-row">
          <span>Foiz stavkasi:</span>
          <span>{annualRate}% (yillik)</span>
        </div>
        <div className="receipt-row">
          <span>Hisoblash turi:</span>
          <span>{calcType === 'annuity' ? 'Annuitet' : 'Flat'}</span>
        </div>
        <div className="receipt-divider"></div>
        <div className="receipt-row receipt-total">
          <span>Oylik to'lov:</span>
          <span>{formatPrimary(monthlyPayment)} / {formatSecondary(monthlyPayment)}</span>
        </div>
        <div className="receipt-row">
          <span>Jami foiz ustamasi:</span>
          <span>{formatPrimary(totalInterest)} / {formatSecondary(totalInterest)}</span>
        </div>
        <div className="receipt-row receipt-total">
          <span>Jami qaytariladigan:</span>
          <span>{formatPrimary(totalPayable)} / {formatSecondary(totalPayable)}</span>
        </div>
        <div className="receipt-divider"></div>
        <div style={{textAlign: 'center', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px'}}>TO'LOVLAR GRAFIGI</div>
        {schedule.map(row => (
          <div key={row.month} className="receipt-row" style={{fontSize: '11px'}}>
            <span>{row.month}-oy: {formatPrimary(row.payment)}</span>
            <span>Qoldiq: {formatPrimary(row.balance)}</span>
          </div>
        ))}
        <div className="receipt-divider"></div>
        <div style={{textAlign: 'center', fontSize: '10px', marginTop: '10px', color: '#555'}}>
          Hujjat ma'lumot olish maqsadida chop etildi.<br />
          Sana: {new Date().toLocaleDateString('uz-UZ')}
        </div>
      </div>
    </div>
  );
}
