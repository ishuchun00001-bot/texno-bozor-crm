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
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  PackageCheck, 
  AlertTriangle 
} from 'lucide-react';
import { formatCurrency, DEFAULT_RATES } from '../utils/currency';
import { mockProducts } from '../utils/mockData';
import Card from './ui/Card';
import Badge from './ui/Badge';

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

export default function Dashboard({ 
  products: parentProducts = [], 
  sales: parentSales = [], 
  saleItems: parentSaleItems = [], 
  loading, 
  rates = DEFAULT_RATES, 
  currency = 'USD', 
  currentStore = 'all' 
}) {
  const [filter, setFilter] = useState('monthly');
  const [filteredSales, setFilteredSales] = useState([]);
  const [metrics, setMetrics] = useState({
    revenue: 0,
    cost: 0,
    profit: 0,
    stockCount: 0,
    stockValue: 0
  });

  const [lowStockProducts, setLowStockProducts] = useState([]);

  const storeLabel = currentStore === 'moto' 
    ? 'Moto Bozor' 
    : currentStore === 'texno' 
    ? 'Texno Bozor' 
    : 'Barcha Do\'konlar';

  useEffect(() => {
    let totalStock = 0;
    let totalStockVal = 0;
    parentProducts.forEach(p => {
      totalStock += p.stock || 0;
      totalStockVal += (p.stock || 0) * (p.cost_price || 0);
    });

    const lowStock = parentProducts.filter(p => p.stock <= 5);
    setLowStockProducts(lowStock);

    const now = new Date();
    let cutoffDate = new Date();

    if (filter === 'daily') {
      cutoffDate.setHours(0, 0, 0, 0);
    } else if (filter === 'weekly') {
      cutoffDate.setDate(now.getDate() - 7);
    } else if (filter === 'monthly') {
      cutoffDate.setDate(now.getDate() - 30);
    } else {
      cutoffDate = new Date(0);
    }

    const filtered = parentSales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= cutoffDate;
    });

    setFilteredSales(filtered);

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

  const formatDateLabel = (dInput) => {
    try {
      const d = new Date(dInput);
      if (isNaN(d.getTime())) return 'Bugun';
      return d.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' });
    } catch {
      return 'Bugun';
    }
  };

  const getLineChartData = () => {
    const dataMap = {};
    const limit = filter === 'daily' ? 1 : filter === 'weekly' ? 7 : 30;
    const now = new Date();

    if (filter === 'all') {
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
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.08)',
          tension: 0.3,
          fill: true,
          pointRadius: 3
        },
        {
          label: `Sof Foyda (${currency})`,
          data: profits,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          tension: 0.3,
          fill: true,
          pointRadius: 3
        }
      ]
    };
  };

  const getBarChartData = () => {
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
          backgroundColor: 'rgba(99, 102, 241, 0.8)',
          borderRadius: 6,
        }
      ]
    };
  };

  const formatPrimary = (val) => formatCurrency(val, currency, rates);
  const formatSecondary = (val) => {
    const secondaryCurr = currency === 'USD' ? 'UZS' : 'USD';
    return formatCurrency(val, secondaryCurr, rates);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="skeleton" style={{ width: '180px', height: '28px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: '95px' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
              Asosiy Boshqaruv Paneli
            </h1>
            <Badge variant="info">{storeLabel}</Badge>
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Tizim ko'rsatkichlari va savdo tahlillari
          </p>
        </div>

        {/* Date Filter Tabs */}
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
          {[
            { id: 'daily', label: 'Kunlik' },
            { id: 'weekly', label: 'Haftalik' },
            { id: 'monthly', label: 'Oylik' },
            { id: 'all', label: 'Barchasi' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: filter === t.id ? 'var(--brand-accent)' : 'transparent',
                color: filter === t.id ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="kpi-subtitle">Umumiy Tushum</span>
            <div className="kpi-icon-wrapper" style={{ color: 'var(--brand-accent)' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div className="kpi-value">{formatPrimary(metrics.revenue)}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {formatSecondary(metrics.revenue)}
          </div>
        </div>

        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="kpi-subtitle">Tovarlar Tannarxi</span>
            <div className="kpi-icon-wrapper" style={{ color: 'var(--text-muted)' }}>
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="kpi-value">{formatPrimary(metrics.cost)}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {formatSecondary(metrics.cost)}
          </div>
        </div>

        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="kpi-subtitle">Sof Foyda</span>
            <div className="kpi-icon-wrapper" style={{ color: 'var(--success)' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--success)' }}>{formatPrimary(metrics.profit)}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {formatSecondary(metrics.profit)} (+{metrics.revenue > 0 ? Math.round((metrics.profit / metrics.revenue) * 100) : 0}% marja)
          </div>
        </div>

        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="kpi-subtitle">Ombor Qoldig'i</span>
            <div className="kpi-icon-wrapper" style={{ color: 'var(--warning)' }}>
              <PackageCheck size={18} />
            </div>
          </div>
          <div className="kpi-value">{metrics.stockCount.toLocaleString()} dona</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Jami: {formatPrimary(metrics.stockValue)}
          </div>
        </div>
      </div>

      {/* Main Charts & Stock Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        <Card title="Savdo va Foyda Dinamikasi">
          <div style={{ height: '260px' }}>
            <Line
              data={getLineChartData()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                    labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }
                  },
                  tooltip: {
                    backgroundColor: '#0f1422',
                    titleColor: '#fff',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1
                  }
                },
                scales: {
                  x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } },
                  y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } }
                }
              }}
            />
          </div>
        </Card>

        <Card 
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />
              Zahira Ogohlantirishlari
            </span>
          }
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: '220px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {lowStockProducts.map(p => (
              <div 
                key={p.id} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--card-border)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img 
                    src={p.image_url || mockProducts[0].image_url} 
                    alt={p.name} 
                    style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} 
                  />
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)' }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatPrimary(p.selling_price)}</div>
                  </div>
                </div>
                <Badge variant="danger">{p.stock} dona</Badge>
              </div>
            ))}

            {lowStockProducts.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: '12.5px' }}>
                Zahira kam tovarlar yo'q! ✅
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Top 5 Selling Products Bar Chart */}
      <Card title="Eng Ko'p Sotilgan Tovarlar (Top 5)">
        <div style={{ height: '200px' }}>
          <Bar
            data={getBarChartData()}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: '#0f1422' }
              },
              scales: {
                x: { grid: { display: false }, ticks: { color: '#64748b' } },
                y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b', stepSize: 1 } }
              }
            }}
          />
        </div>
      </Card>
    </div>
  );
}
