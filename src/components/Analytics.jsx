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
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { DEFAULT_RATES } from '../utils/currency';

// Chart.js components registration for Analytics page
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

export default function Analytics({ products = [], sales = [], saleItems = [], onRefresh, rates = DEFAULT_RATES, currency = 'USD', currentStore = 'all' }) {
  const [categoryChartData, setCategoryChartData] = useState(null);
  const [profitTrendData, setProfitTrendData] = useState(null);

  useEffect(() => {
    // Current store filtri
    const filteredProducts = (products || []).filter(p => p && (currentStore === 'all' || (p.store_type || 'texno') === currentStore));
    const filteredSales = (sales || []).filter(s => s && (currentStore === 'all' || (s.store_type || 'texno') === currentStore));

    // 1. Kategoriyalar kesimida sotuvlar ulushi (Doughnut)
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
          backgroundColor: ['#00f2fe', '#9b5de5', '#f15bb5', '#00f5d4', '#fee440', '#ff3860'],
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1
        }
      ]
    });

    // 2. Daromad va Tannarx nisbati (Line)
    const sortedSales = [...filteredSales].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const trendMap = {};

    sortedSales.forEach(sale => {
      let dateStr = 'Bugun';
      try {
        const d = new Date(sale.created_at);
        if (!isNaN(d.getTime())) {
          dateStr = d.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' });
        }
      } catch (e) {}

      if (!trendMap[dateStr]) {
        trendMap[dateStr] = { revenue: 0, cost: 0, profit: 0 };
      }
      trendMap[dateStr].revenue += parseFloat(sale.total_amount) || 0;
      trendMap[dateStr].cost += parseFloat(sale.total_cost) || 0;
      trendMap[dateStr].profit += parseFloat(sale.profit) || 0;
    });

    const trendLabels = Object.keys(trendMap);
    const scale = rates[currency] || 1;
    
    setProfitTrendData({
      labels: trendLabels,
      datasets: [
        {
          label: `Sotuv Summasi (${currency})`,
          data: trendLabels.map(l => Math.round((trendMap[l].revenue || 0) * scale)),
          borderColor: '#00f2fe',
          backgroundColor: 'transparent',
          tension: 0.2
        },
        {
          label: `Sotib Olingan Narxi (${currency})`,
          data: trendLabels.map(l => Math.round((trendMap[l].cost || 0) * scale)),
          borderColor: '#f15bb5',
          backgroundColor: 'transparent',
          tension: 0.2
        },
        {
          label: `Sof Foyda (${currency})`,
          data: trendLabels.map(l => Math.round((trendMap[l].profit || 0) * scale)),
          borderColor: '#00f5d4',
          backgroundColor: 'rgba(0, 245, 212, 0.05)',
          tension: 0.2,
          fill: true
        }
      ]
    });

  }, [products, sales, saleItems, currency, rates]);

  // Ma'lumotlarni zaxira (Backup) qilish (JSON shaklida yuklab olish)
  const handleBackup = () => {
    try {
      const backupData = {
        products: isSupabaseConfigured() ? products : JSON.parse(localStorage.getItem('local_products') || '[]'),
        sales: isSupabaseConfigured() ? sales : JSON.parse(localStorage.getItem('local_sales') || '[]'),
        sale_items: isSupabaseConfigured() ? saleItems : JSON.parse(localStorage.getItem('local_sale_items') || '[]'),
        exported_at: new Date().toISOString()
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `texnobozor_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Zaxiralashda xatolik: " + err.message);
    }
  };

  // Ma'lumotlarni tiklash (Restore)
  const handleRestore = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!data.products || !data.sales) {
          throw new Error("Noto'g'ri zaxira fayl formati!");
        }

        if (isSupabaseConfigured()) {
          // Supabase da tiklash
          alert("Eslatma: Supabase online ma'lumotlarini qayta yozish cheklangan. Offline rejimni tiklashingiz mumkin.");
        } else {
          // LocalStorage rejimida tiklash
          localStorage.setItem('local_products', JSON.stringify(data.products));
          localStorage.setItem('local_sales', JSON.stringify(data.sales));
          localStorage.setItem('local_sale_items', JSON.stringify(data.sale_items || []));
          localStorage.setItem('local_db_seeded', 'true');
          
          alert("Lokal ma'lumotlar zaxiradan muvaffaqiyatli tiklandi! ✅");
          onRefresh();
        }
      } catch (err) {
        alert("Tiklashda xatolik yuz berdi: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="page-fade-in">
      <div className="page-header">
        <div className="page-title">
          <h1>Tahlil va Statistika</h1>
          <p>Kategoriyalar tahlili, sotuvlar rentabelligi va ma'lumotlar zaxirasi</p>
        </div>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Kategoriya tahlili */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', width: '100%' }}>Kategoriyalar kesimida savdo ulushi</h3>
          <div style={{ width: '100%', height: '280px', position: 'relative' }}>
            {categoryChartData ? (
              <Doughnut
                data={categoryChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: '#94a3b8', font: { family: 'Outfit' } }
                    }
                  }
                }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '100px' }}>Yuklanmoqda...</div>
            )}
          </div>
        </div>

        {/* Ma'lumotlarni zaxiralash */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Ma'lumotlar Boshqaruvi va Zaxira</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.6' }}>
              CRM ma'lumotlar xavfsizligini ta'minlash uchun joriy tovarlar ro'yxati va sotuv hisobotlarini JSON formatida yuklab olishingiz mumkin. Keyinchalik ushbu fayl yordamida ma'lumotlarni qayta tiklash imkoniyati mavjud.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button onClick={handleBackup} className="btn-primary" style={{ justifyContent: 'center' }}>
              📥 Ma'lumotlarni zaxiralash (Backup JSON)
            </button>
            
            <div style={{ position: 'relative' }}>
              <input
                type="file"
                id="restore-file-input"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleRestore}
              />
              <button 
                onClick={() => document.getElementById('restore-file-input').click()} 
                className="btn-secondary" 
                style={{ width: '100%', justifyContent: 'center' }}
              >
                📤 Zaxiradan tiklash (Restore JSON)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Savdo rentabelligi line grafigi */}
      <div className="glass-card chart-card" style={{ marginTop: '24px', minHeight: '380px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Sotuv, Tannarx va Sof Foyda nisbati</h3>
        <div className="chart-container">
          {profitTrendData ? (
            <Line
              data={profitTrendData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    labels: { color: '#94a3b8', font: { family: 'Outfit' } }
                  }
                },
                scales: {
                  x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#94a3b8' } },
                  y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#94a3b8' } }
                }
              }}
            />
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '100px' }}>Yuklanmoqda...</div>
          )}
        </div>
      </div>
    </div>
  );
}
