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
  AlertTriangle,
  Wallet,
  Percent,
  CreditCard
} from 'lucide-react';
import { formatCurrency, DEFAULT_RATES } from '../utils/currency';
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
  expenses: parentExpenses = [],
  loading, 
  rates = DEFAULT_RATES, 
  currency = 'USD', 
  currentStore = 'all' 
}) {
  const [filter, setFilter] = useState('monthly');
  const [filteredSales, setFilteredSales] = useState([]);
  
  const [metrics, setMetrics] = useState({
    todaySalesCount: 0,
    todayRevenue: 0,
    todayProfit: 0,
    todayExpenses: 0,
    totalRevenue: 0,
    grossProfit: 0,
    totalCommissions: 0,
    totalNasiyaFees: 0,
    totalExpenses: 0,
    netProfit: 0,
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
    (parentProducts || []).forEach(p => {
      if (p) {
        totalStock += p.stock || 0;
        totalStockVal += (p.stock || 0) * (p.cost_price || 0);
      }
    });

    const lowStock = (parentProducts || []).filter(p => p && p.stock <= 5);
    setLowStockProducts(lowStock);

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

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

    const filteredSls = parentSales.filter(s => new Date(s.created_at) >= cutoffDate);
    const filteredExps = parentExpenses.filter(e => new Date(e.date || e.created_at) >= cutoffDate);

    setFilteredSales(filteredSls);
    setFilteredExpenses(filteredExps);

    // Today's metrics
    let tSalesCount = 0;
    let tRev = 0;
    let tProf = 0;
    let tExps = 0;

    parentSales.forEach(s => {
      const sDateStr = new Date(s.created_at).toISOString().slice(0, 10);
      if (sDateStr === todayStr) {
        tSalesCount += 1;
        tRev += parseFloat(s.total_amount) || 0;
        tProf += parseFloat(s.profit) || 0;
      }
    });

    parentExpenses.forEach(e => {
      const eDateStr = (e.date || e.created_at || '').slice(0, 10);
      if (eDateStr === todayStr) {
        tExps += parseFloat(e.amount) || 0;
      }
    });

    // Period totals
    let totRev = 0;
    let grossProf = 0;
    let totCommissions = 0;
    let totNasiyaFees = 0;

    filteredSls.forEach(s => {
      totRev += parseFloat(s.total_amount) || 0;
      grossProf += parseFloat(s.profit) || 0;
      totCommissions += parseFloat(s.card_commission) || 0;
      totNasiyaFees += parseFloat(s.nasiya_fee) || 0;
    });

    let totExps = 0;
    filteredExps.forEach(e => {
      totExps += parseFloat(e.amount) || 0;
    });

    const netProf = grossProf - totCommissions - totNasiyaFees - totExps;

    setMetrics({
      todaySalesCount: tSalesCount,
      todayRevenue: Math.round(tRev),
      todayProfit: Math.round(tProf),
      todayExpenses: Math.round(tExps),
      totalRevenue: Math.round(totRev),
      grossProfit: Math.round(grossProf),
      totalCommissions: Math.round(totCommissions),
      totalNasiyaFees: Math.round(totNasiyaFees),
      totalExpenses: Math.round(totExps),
      netProfit: Math.round(netProf),
      stockCount: totalStock,
      stockValue: Math.round(totalStockVal)
    });
  }, [filter, parentProducts, parentSales, parentExpenses]);

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
          label: `Jami Tushum (${currency})`,
          data: revenues,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.08)',
          tension: 0.3,
          fill: true,
          pointRadius: 3
        },
        {
          label: `Foyda (${currency})`,
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
            Moliyaviy ko'rsatkichlar, komissiyalar, xarajatlar va Sof Foyda tahlili
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
          {[
            { id: 'daily', label: 'Bugun' },
            { id: 'weekly', label: 'Shu hafta' },
            { id: 'monthly', label: 'Shu oy' },
            { id: 'all', label: 'Barcha davr' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: filter === f.id ? 'var(--brand-accent)' : 'transparent',
                color: filter === f.id ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '11.5px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 9 Enterprise KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        {/* 1. Bugungi Sotuv */}
        <Card style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Bugungi Sotuv</span>
            <ShoppingBag size={16} style={{ color: 'var(--brand-accent)' }} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            {formatPrimary(metrics.todayRevenue)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {metrics.todaySalesCount} ta tranzaksiya ({formatSecondary(metrics.todayRevenue)})
          </div>
        </Card>

        {/* 2. Bugungi Foyda */}
        <Card style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Bugungi Foyda</span>
            <TrendingUp size={16} style={{ color: 'var(--success)' }} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--success)' }}>
            +{formatPrimary(metrics.todayProfit)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {formatSecondary(metrics.todayProfit)}
          </div>
        </Card>

        {/* 3. Bugungi Harajat */}
        <Card style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Bugungi Harajat</span>
            <Wallet size={16} style={{ color: 'var(--danger)' }} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--danger)' }}>
            -{formatPrimary(metrics.todayExpenses)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {formatSecondary(metrics.todayExpenses)}
          </div>
        </Card>

        {/* 4. Sof Foyda (Net Profit Highlight Card) */}
        <Card style={{ padding: '16px 20px', borderColor: 'rgba(16, 185, 129, 0.4)', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(99, 102, 241, 0.04) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '700', textTransform: 'uppercase' }}>Sof Foyda (Net Profit)</span>
            <DollarSign size={18} style={{ color: 'var(--success)' }} />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--success)' }}>
            {formatPrimary(metrics.netProfit)}
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Komissiyalar va xarajatlar chiqarilgan
          </div>
        </Card>

        {/* 5. Jami Tushum */}
        <Card style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Jami Tushum</span>
            <DollarSign size={16} style={{ color: 'var(--brand-accent)' }} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            {formatPrimary(metrics.totalRevenue)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {formatSecondary(metrics.totalRevenue)}
          </div>
        </Card>

        {/* 6. Jami Komissiyalar (Karta 2%) */}
        <Card style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Bank Komissiyasi (2%)</span>
            <CreditCard size={16} style={{ color: 'var(--warning)' }} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--warning)' }}>
            -{formatPrimary(metrics.totalCommissions)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {formatSecondary(metrics.totalCommissions)}
          </div>
        </Card>

        {/* 7. Jami Nasiya Xarajatlari (5%) */}
        <Card style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Nasiya Xarajati (5%)</span>
            <Percent size={16} style={{ color: 'var(--warning)' }} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--warning)' }}>
            -{formatPrimary(metrics.totalNasiyaFees)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {formatSecondary(metrics.totalNasiyaFees)}
          </div>
        </Card>

        {/* 8. Ombordagi Mahsulotlar */}
        <Card style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Ombordagi Tovarlar</span>
            <PackageCheck size={16} style={{ color: 'var(--brand-accent)' }} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            {metrics.stockCount} dona
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Tannarx qiymati: {formatPrimary(metrics.stockValue)}
          </div>
        </Card>

        {/* 9. Kam Qolgan Mahsulotlar */}
        <Card style={{ padding: '16px 20px', borderColor: lowStockProducts.length > 0 ? 'rgba(239, 68, 68, 0.4)' : undefined }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Kam Qolgan Tovarlar</span>
            <AlertTriangle size={16} style={{ color: lowStockProducts.length > 0 ? 'var(--danger)' : 'var(--text-muted)' }} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-display)', color: lowStockProducts.length > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
            {lowStockProducts.length} turda
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Zahira soni ≤ 5 dona
          </div>
        </Card>
      </div>

      {/* Main Grid: Charts & Top Products */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Sales & Profit Line Chart */}
        <Card title="Savda va Sof Foyda Dinamikasi">
          <div style={{ height: '280px' }}>
            <Line
              data={getLineChartData()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top', labels: { color: '#94a3b8', font: { family: 'Inter' } } }
                },
                scales: {
                  x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#94a3b8' } },
                  y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#94a3b8' } }
                }
              }}
            />
          </div>
        </Card>

        {/* Top Selling Products Bar Chart */}
        <Card title="Eng Ko'p Sotilgan Tovarlar (Top 5)">
          <div style={{ height: '280px' }}>
            <Bar
              data={getBarChartData()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } },
                  y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#94a3b8' } }
                }
              }}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
