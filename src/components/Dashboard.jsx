import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { mockProducts, generateMockSales } from '../utils/mockData';
import { formatCurrency, DEFAULT_RATES } from '../utils/currency';

// Chart.js kutubxonasini ro'yxatdan o'tkazish
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard({ products: parentProducts = [], sales: parentSales = [], saleItems: parentSaleItems = [], loading, rates = DEFAULT_RATES, currency = 'USD', currentStore = 'all' }) {
  const [filter, setFilter] = useState('monthly'); // 'daily', 'weekly', 'monthly', 'all'
  const [filteredSales, setFilteredSales] = useState([]);
  const [metrics, setMetrics] = useState({
    revenue: 0,
    cost: 0,
    profit: 0,
    stockCount: 0,
    stockValue: 0
  });

  const [lowStockProducts, setLowStockProducts] = useState([]);

  // Store title banner label
  const storeLabel = currentStore === 'moto' 
    ? '🏍️ Moto Bozor' 
    : currentStore === 'texno' 
    ? '⚡ Texno Bozor' 
    : '🌐 Barcha Do\'konlar';

  // Filtrlash va Metrikalarni hisoblash
  useEffect(() => {
    // Jami ombor hisob-kitoblari
    let totalStock = 0;
    let totalStockVal = 0;
    parentProducts.forEach(p => {
      totalStock += p.stock || 0;
      totalStockVal += (p.stock || 0) * (p.cost_price || 0);
    });

    // Kam qolgan tovarlar (stock < 5)
    const lowStock = parentProducts.filter(p => p.stock <= 5);
    setLowStockProducts(lowStock);

    // Vaqt oralig'i bo'yicha filtr
    const now = new Date();
    let cutoffDate = new Date();

    if (filter === 'daily') {
      cutoffDate.setHours(0, 0, 0, 0); // Bugun 00:00 dan boshlab
    } else if (filter === 'weekly') {
      cutoffDate.setDate(now.getDate() - 7); // O'tgan 7 kun
    } else if (filter === 'monthly') {
      cutoffDate.setDate(now.getDate() - 30); // O'tgan 30 kun
    } else {
      cutoffDate = new Date(0); // Barchasi
    }

    const filtered = parentSales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= cutoffDate;
    });

    setFilteredSales(filtered);

    // Metrikalarni hisoblash
    let rev = 0;
    let cost = 0;
    let prof = 0;

    filtered.forEach(sale => {
      rev += parseFloat(sale.total_amount) || 0;
      cost += parseFloat(sale.total_cost) || 0;
      prof += parseFloat(sale.profit) || 0;
    });

    setMetrics({
      revenue: Math.round(rev),
      cost: Math.round(cost),
      profit: Math.round(prof),
      stockCount: totalStock,
      stockValue: Math.round(totalStockVal)
    });

  }, [filter, parentProducts, parentSales]);

  // Safe date formatter
  const formatDateLabel = (dInput) => {
    try {
      const d = new Date(dInput);
      if (isNaN(d.getTime())) return 'Bugun';
      return d.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' });
    } catch (e) {
      return 'Bugun';
    }
  };

  // Diagrammalar uchun ma'lumotlarni tayyorlash
  const getLineChartData = () => {
    // Sanalar bo'yicha guruhlash
    const dataMap = {};
    
    // So'nggi kunlar ro'yxatini yaratish (agar haftalik yoki oylik bo'lsa)
    const limit = filter === 'daily' ? 1 : filter === 'weekly' ? 7 : 30;
    const now = new Date();

    if (filter === 'all') {
      // Barcha sotuvlarni sanasi bo'yicha tartiblash
      (filteredSales || []).forEach(sale => {
        const dateStr = formatDateLabel(sale.created_at);
        if (!dataMap[dateStr]) {
          dataMap[dateStr] = { revenue: 0, profit: 0 };
        }
        dataMap[dateStr].revenue += parseFloat(sale.total_amount) || 0;
        dataMap[dateStr].profit += parseFloat(sale.profit) || 0;
      });
    } else {
      for (let i = limit - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = formatDateLabel(d);
        dataMap[dateStr] = { revenue: 0, profit: 0 };
      }

      (filteredSales || []).forEach(sale => {
        const dateStr = formatDateLabel(sale.created_at);
        if (dataMap[dateStr]) {
          dataMap[dateStr].revenue += parseFloat(sale.total_amount) || 0;
          dataMap[dateStr].profit += parseFloat(sale.profit) || 0;
        }
      });
    }

    const labels = Object.keys(dataMap);
    const scale = rates[currency] || 1;
    const revenues = labels.map(l => Math.round((dataMap[l].revenue || 0) * scale));
    const profits = labels.map(l => Math.round((dataMap[l].profit || 0) * scale));

    return {
      labels,
      datasets: [
        {
          label: `Tushum (${currency})`,
          data: revenues,
          borderColor: '#00f2fe',
          backgroundColor: 'rgba(0, 242, 254, 0.1)',
          tension: 0.3,
          fill: true,
        },
        {
          label: `Sof Foyda (${currency})`,
          data: profits,
          borderColor: '#9b5de5',
          backgroundColor: 'rgba(155, 93, 229, 0.1)',
          tension: 0.3,
          fill: true,
        }
      ]
    };
  };

  const getBarChartData = () => {
    // Har bir mahsulot bo'yicha sotuvlar soni
    const productSalesMap = {};
    
    (parentSaleItems || []).forEach(item => {
      const prod = (parentProducts || []).find(p => p && p.id === item.product_id);
      if (prod) {
        if (!productSalesMap[prod.name]) {
          productSalesMap[prod.name] = 0;
        }
        productSalesMap[prod.name] += item.quantity || 0;
      }
    });

    // Eng ko'p sotilgan 5 tasini olish
    const sortedProducts = Object.keys(productSalesMap)
      .map(name => ({ name, qty: productSalesMap[name] }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return {
      labels: sortedProducts.map(p => p.name),
      datasets: [
        {
          label: 'Sotilgan donalar soni',
          data: sortedProducts.map(p => p.qty),
          backgroundColor: 'rgba(0, 245, 212, 0.7)',
          borderColor: '#00f5d4',
          borderWidth: 1,
          borderRadius: 6,
        }
      ]
    };
  };

  const formatPrimary = (val) => {
    return formatCurrency(val, currency, rates);
  };

  const formatSecondary = (val) => {
    const secondaryCurr = currency === 'USD' ? 'UZS' : 'USD';
    return formatCurrency(val, secondaryCurr, rates);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ width: '150px', height: '30px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', animation: 'pulse 1.5s infinite' }}></div>
        <div className="metrics-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card" style={{ height: '120px', animation: 'pulse 1.5s infinite' }}></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-fade-in">
      {/* Sahifa Sarlavhasi */}
      <div className="page-header">
        <div className="page-title">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>Asosiy panel</span>
            <span className="badge-category" style={{
              fontSize: '13px',
              padding: '4px 12px',
              background: currentStore === 'moto' ? 'rgba(241, 91, 181, 0.15)' : 'rgba(0, 242, 254, 0.15)',
              color: currentStore === 'moto' ? 'var(--neon-pink)' : 'var(--neon-blue)',
              border: `1px solid ${currentStore === 'moto' ? 'var(--neon-pink)' : 'var(--neon-blue)'}`
            }}>
              {storeLabel}
            </span>
          </h1>
          <p>Do'kon ko'rsatkichlari, zaxiralar va savdo tahlillari</p>
        </div>

        {/* Filtr tabs */}
        <div className="chart-actions">
          <button className={`chart-tab ${filter === 'daily' ? 'active' : ''}`} onClick={() => setFilter('daily')}>Kunlik</button>
          <button className={`chart-tab ${filter === 'weekly' ? 'active' : ''}`} onClick={() => setFilter('weekly')}>Haftalik</button>
          <button className={`chart-tab ${filter === 'monthly' ? 'active' : ''}`} onClick={() => setFilter('monthly')}>Oylik</button>
          <button className={`chart-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Barchasi</button>
        </div>
      </div>

      {/* Metrikalar jadvali */}
      <div className="metrics-grid">
        <div className="glass-card metric-card blue">
          <div className="metric-header">
            <span>Umumiy Tushum</span>
            <div className="metric-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
          </div>
          <div className="metric-value">
            {formatPrimary(metrics.revenue)}
            <span className="currency-subtext">
              {formatSecondary(metrics.revenue)}
            </span>
          </div>
          <div className="metric-change positive">
            <span>↑ Savdo faolligi</span>
          </div>
        </div>
 
        <div className="glass-card metric-card purple">
          <div className="metric-header">
            <span>Sotilgan tovarlar tannarxi</span>
            <div className="metric-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M12 4v16M2 8h20M2 16h20"></path></svg>
            </div>
          </div>
          <div className="metric-value">
            {formatPrimary(metrics.cost)}
            <span className="currency-subtext">
              {formatSecondary(metrics.cost)}
            </span>
          </div>
          <div className="metric-change">
            <span>Kirim narxi bo'yicha</span>
          </div>
        </div>
 
        <div className="glass-card metric-card green">
          <div className="metric-header">
            <span>Sof Foyda</span>
            <div className="metric-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 6l-9.5 9.5-5-5L1 18"></path><polyline points="17 6 23 6 23 12"></polyline></svg>
            </div>
          </div>
          <div className="metric-value" style={{color: 'var(--neon-green)'}}>
            {formatPrimary(metrics.profit)}
            <span className="currency-subtext" style={{color: 'var(--text-secondary)'}}>
              {formatSecondary(metrics.profit)}
            </span>
          </div>
          <div className="metric-change positive">
            <span>+{metrics.revenue > 0 ? Math.round((metrics.profit / metrics.revenue) * 100) : 0}% rentabellik</span>
          </div>
        </div>
 
        <div className="glass-card metric-card pink">
          <div className="metric-header">
            <span>Ombor Zahirasi</span>
            <div className="metric-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </div>
          </div>
          <div className="metric-value">{metrics.stockCount} dona</div>
          <div className="metric-change">
            <span>Jami qiymati: {`${formatPrimary(metrics.stockValue)} (${formatSecondary(metrics.stockValue)})`}</span>
          </div>
        </div>
      </div>

      {/* Grafiklarning joylashuvi */}
      <div className="dashboard-grid">
        {/* Foyda va tushum dinamikasi */}
        <div className="glass-card chart-card">
          <div className="chart-header">
            <h2 style={{fontSize: '18px', fontWeight: '700'}}>Savdo va Foyda dinamikasi</h2>
            <span style={{fontSize: '12px', color: 'var(--text-muted)'}}>Line tahlili</span>
          </div>
          <div className="chart-container">
            <Line
              data={getLineChartData()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                    labels: { color: '#94a3b8', font: { family: 'Outfit' } }
                  },
                  tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#0e1122',
                    titleColor: '#fff',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderWidth: 1
                  }
                },
                scales: {
                  x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#94a3b8' } },
                  y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#94a3b8' } }
                }
              }}
            />
          </div>
        </div>

        {/* Zahira ogohlantirishi */}
        <div className="glass-card" style={{display: 'flex', flexDirection: 'column'}}>
          <h2 style={{fontSize: '18px', fontWeight: '700', marginBottom: '16px'}}>Zahira Ogohlantirishi</h2>
          <p style={{fontSize: '13px', color: 'var(--text-secondary)'}}>Omborda 5 donadan kam qolgan tovarlar</p>

          <div className="alert-list" style={{overflowY: 'auto', flexGrow: 1, maxHeight: '280px'}}>
            {lowStockProducts.map(p => (
              <div key={p.id} className="alert-item">
                <div className="alert-avatar">
                  <img src={p.image_url || mockProducts[0].image_url} alt={p.name} />
                </div>
                <div className="alert-details">
                  <div className="alert-name">{p.name}</div>
                  <div className="alert-meta">Sotish: {`${formatPrimary(p.selling_price)} / ${formatSecondary(p.selling_price)}`}</div>
                </div>
                <div className="alert-badge danger">
                  {p.stock} dona qoldi
                </div>
              </div>
            ))}
            {lowStockProducts.length === 0 && (
              <div style={{textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0'}}>
                Zahira kam mahsulotlar mavjud emas. Hammasi joyida! ✅
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pastki grafik: Top mahsulotlar */}
      <div className="glass-card chart-card" style={{minHeight: '320px'}}>
        <div className="chart-header">
          <h2 style={{fontSize: '18px', fontWeight: '700'}}>Eng ko'p sotilgan mahsulotlar (Top 5)</h2>
        </div>
        <div className="chart-container" style={{maxHeight: '240px'}}>
          <Bar
            data={getBarChartData()}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: '#0e1122' }
              },
              scales: {
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
                y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#94a3b8', stepSize: 1 } }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
