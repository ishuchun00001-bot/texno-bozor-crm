import React, { useState, useEffect } from 'react';
import { Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { RefreshCw, PieChart, TrendingUp } from 'lucide-react';
import { DEFAULT_RATES } from '../utils/currency';
import Button from './ui/Button';
import Card from './ui/Card';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

export default function Analytics({ 
  products = [], 
  sales = [], 
  saleItems = [], 
  expenses = [],
  onRefresh, 
  rates = DEFAULT_RATES, 
  currency = 'USD', 
  currentStore = 'all' 
}) {
  const [categoryChartData, setCategoryChartData] = useState(null);
  const [profitTrendData, setProfitTrendData] = useState(null);

  useEffect(() => {
    const filteredProducts = (products || []).filter(p => p && (currentStore === 'all' || (p.store_type || 'texno') === currentStore));
    const filteredSales = (sales || []).filter(s => s && (currentStore === 'all' || (s.store_type || 'texno') === currentStore));

    const categoryQtyMap = {};
    (saleItems || []).forEach(item => {
      const prod = filteredProducts.find(p => p.id === item.product_id);
      if (prod) {
        const cat = prod.category || 'Boshqa';
        if (!categoryQtyMap[cat]) {
          categoryQtyMap[cat] = 0;
        }
        categoryQtyMap[cat] += item.quantity || 0;
      }
    });

    const catLabels = Object.keys(categoryQtyMap);
    const catQuantities = catLabels.map(cat => categoryQtyMap[cat]);

    setCategoryChartData({
      labels: catLabels.length > 0 ? catLabels : ['Ma\'lumot yo\'q'],
      datasets: [
        {
          data: catQuantities.length > 0 ? catQuantities : [1],
          backgroundColor: ['#6366f1', '#eab308', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'],
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1
        }
      ]
    });

    const sortedSales = [...filteredSales].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const trendMap = {};

    sortedSales.forEach(sale => {
      let dateStr = 'Bugun';
      try {
        const d = new Date(sale.created_at);
        if (!isNaN(d.getTime())) {
          dateStr = d.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' });
        }
      } catch {}

      if (!trendMap[dateStr]) {
        trendMap[dateStr] = { rev: 0, cost: 0, net: 0 };
      }
      const rev = parseFloat(sale.total_amount) || 0;
      const cost = parseFloat(sale.total_cost) || 0;
      const cardComm = parseFloat(sale.card_commission) || 0;
      const nasiyaFee = parseFloat(sale.nasiya_fee) || 0;
      const profit = parseFloat(sale.profit) || (rev - cost);

      trendMap[dateStr].rev += rev;
      trendMap[dateStr].cost += cost;
      trendMap[dateStr].net += (profit - cardComm - nasiyaFee);
    });

    const trendLabels = Object.keys(trendMap);
    const scale = rates[currency] || 1;

    setProfitTrendData({
      labels: trendLabels,
      datasets: [
        {
          label: `Jami Tushum (${currency})`,
          data: trendLabels.map(k => Math.round(trendMap[k].rev * scale)),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.35
        },
        {
          label: `Sof Foyda (${currency})`,
          data: trendLabels.map(k => Math.round(trendMap[k].net * scale)),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.35
        }
      ]
    });
  }, [products, sales, saleItems, expenses, currentStore, currency, rates]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Tahlillar va Hisobotlar
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Savdo dinamikasi, kategoriya ulushi va daromadlar tahlili
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={onRefresh}>
          <RefreshCw size={14} /> Ma'lumotlarni Yangilash
        </Button>
      </div>

      {/* Main Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        {/* Category Doughnut Chart */}
        <Card 
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PieChart size={18} style={{ color: 'var(--brand-accent)' }} />
              Kategoriyalar Ulushi
            </span>
          }
        >
          <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {categoryChartData && (
              <Doughnut
                data={categoryChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Inter' } } }
                  }
                }}
              />
            )}
          </div>
        </Card>

        {/* Revenue vs Cost Line Chart */}
        <Card 
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={18} style={{ color: 'var(--brand-gold)' }} />
              Tushum va Tannarx Solishtirmasi
            </span>
          }
        >
          <div style={{ height: '280px' }}>
            {profitTrendData && (
              <Line
                data={profitTrendData}
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
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
