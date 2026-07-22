import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { formatCurrency, DEFAULT_RATES } from '../utils/currency';
import { useToast } from './Toast';

export default function SalesHistory({
  sales = [],
  saleItems = [],
  products = [],
  onRefresh,
  rates = DEFAULT_RATES,
  currency = 'USD',
  currentStore = 'all',
}) {
  const toast = useToast();
  const [filterPeriod, setFilterPeriod] = useState('all'); // 'today','week','month','all'
  const [filterStore, setFilterStore] = useState(currentStore);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSaleId, setExpandedSaleId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);

  // currentStore prop o'zgarganda filterni yangilash
  useEffect(() => {
    setFilterStore(currentStore);
  }, [currentStore]);

  // Filtrlash
  const getFilteredSales = () => {
    let filtered = [...sales];

    // Do'kon filtri
    if (filterStore !== 'all') {
      filtered = filtered.filter(s => (s.store_type || 'texno') === filterStore);
    }

    // Vaqt filtri
    const now = new Date();
    if (filterPeriod === 'today') {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(s => new Date(s.created_at) >= start);
    } else if (filterPeriod === 'week') {
      const start = new Date(now.getTime() - 7 * 86400000);
      filtered = filtered.filter(s => new Date(s.created_at) >= start);
    } else if (filterPeriod === 'month') {
      const start = new Date(now.getTime() - 30 * 86400000);
      filtered = filtered.filter(s => new Date(s.created_at) >= start);
    }

    // Qidiruv
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        String(s.id).toLowerCase().includes(q) ||
        String(s.total_amount).includes(q)
      );
    }

    // Sanasi bo'yicha teskari tartiblash (yangi → eski)
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return filtered;
  };

  const filteredSales = getFilteredSales();

  // Jami hisob-kitoblar
  const totals = filteredSales.reduce((acc, s) => ({
    revenue: acc.revenue + (parseFloat(s.total_amount) || 0),
    cost: acc.cost + (parseFloat(s.total_cost) || 0),
    profit: acc.profit + (parseFloat(s.profit) || 0),
  }), { revenue: 0, cost: 0, profit: 0 });

  // Savdoni o'chirish
  const handleDelete = async (saleId) => {
    if (!window.confirm("Bu savdoni o'chirishni tasdiqlaysizmi? Bu amalni qaytarib bo'lmaydi!")) return;
    setIsDeleting(saleId);
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from('sales').delete().eq('id', saleId);
        if (error) throw error;
      } else {
        const localSales = JSON.parse(localStorage.getItem('local_sales') || '[]');
        const localItems = JSON.parse(localStorage.getItem('local_sale_items') || '[]');
        localStorage.setItem('local_sales', JSON.stringify(localSales.filter(s => s.id !== saleId)));
        localStorage.setItem('local_sale_items', JSON.stringify(localItems.filter(i => i.sale_id !== saleId)));
      }
      toast.success("Sotuv muvaffaqiyatli o'chirildi! ✅");
      onRefresh();
    } catch (err) {
      console.error(err);
      toast.error('O\'chirishda xatolik: ' + err.message);
    } finally {
      setIsDeleting(null);
    }
  };

  // Excel eksport
  const handleExportExcel = () => {
    if (filteredSales.length === 0) return;

    const exportData = filteredSales.map((s, idx) => {
      // Bu savdodagi tovarlar
      const items = saleItems.filter(i => i.sale_id === s.id);
      const itemNames = items.map(i => {
        const prod = products.find(p => p.id === i.product_id);
        return prod ? `${prod.name} x${i.quantity}` : `Tovar x${i.quantity}`;
      }).join('; ');

      const date = new Date(s.created_at);
      return {
        '№': idx + 1,
        'Sana': date.toLocaleDateString('uz-UZ'),
        'Vaqt': date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
        "Do'kon": (s.store_type || 'texno') === 'moto' ? 'Moto Bozor' : 'Texno Bozor',
        'Tovarlar': itemNames || '—',
        'Jami Summa ($)': parseFloat(s.total_amount) || 0,
        'Sof Foyda ($)': parseFloat(s.profit) || 0,
        "Jami Summa (So'm)": Math.round((parseFloat(s.total_amount) || 0) * (rates.UZS || 12800)),
        "Sof Foyda (So'm)": Math.round((parseFloat(s.profit) || 0) * (rates.UZS || 12800)),
      };
    });

    // Jami qator
    exportData.push({
      '№': '',
      'Sana': 'JAMI:',
      'Vaqt': '',
      "Do'kon": '',
      'Tovarlar': `${filteredSales.length} ta savdo`,
      'Jami Summa ($)': parseFloat(totals.revenue.toFixed(2)),
      'Sof Foyda ($)': parseFloat(totals.profit.toFixed(2)),
      "Jami Summa (So'm)": Math.round(totals.revenue * (rates.UZS || 12800)),
      "Sof Foyda (So'm)": Math.round(totals.profit * (rates.UZS || 12800)),
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sotuvlar Tarixi');
    XLSX.writeFile(wb, `Sotuvlar_Tarixi_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const fmt = (val) => formatCurrency(val, currency, rates);
  const fmtUzs = (val) => formatCurrency(val, 'UZS', rates);

  const storeLabel = (type) => {
    if (type === 'moto') return { label: '🏍️ Moto', color: 'var(--neon-pink)' };
    return { label: '⚡ Texno', color: 'var(--neon-blue)' };
  };

  const periodLabels = [
    { key: 'today', label: 'Bugun' },
    { key: 'week', label: '7 kun' },
    { key: 'month', label: '30 kun' },
    { key: 'all', label: 'Hammasi' },
  ];

  return (
    <div className="page-fade-in">
      {/* Header */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div className="page-title">
          <h1>Sotuvlar Tarixi</h1>
          <p>Barcha savdolar ro'yxati, filtrlash va Excel hisobot eksporti</p>
        </div>
        <button
          onClick={handleExportExcel}
          className="btn-primary"
          disabled={filteredSales.length === 0}
          style={{ fontSize: '13px', padding: '8px 18px' }}
        >
          📥 Excel Eksport ({filteredSales.length} ta)
        </button>
      </div>

      {/* Metrika kartalar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Savdolar Soni', value: filteredSales.length + ' ta', icon: '🧾', color: 'var(--neon-blue)' },
          { label: 'Jami Tushum', value: fmt(totals.revenue), icon: '💵', color: 'var(--neon-green)' },
          { label: 'Sof Foyda', value: fmt(totals.profit), icon: '📈', color: 'var(--neon-purple)' },
          { label: "Foyda (So'm)", value: fmtUzs(totals.profit), icon: '🏦', color: 'var(--neon-pink)' },
        ].map((m, i) => (
          <div key={i} className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '24px' }}>{m.icon}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Filtrlar */}
      <div className="glass-card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {/* Qidiruv */}
          <input
            type="text"
            className="form-control"
            placeholder="Savdo ID bo'yicha qidirish..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ maxWidth: '260px', padding: '8px 12px', fontSize: '13px' }}
          />

          {/* Vaqt filtri */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
            {periodLabels.map(p => (
              <button
                key={p.key}
                onClick={() => setFilterPeriod(p.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '7px',
                  border: 'none',
                  background: filterPeriod === p.key ? 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple))' : 'transparent',
                  color: filterPeriod === p.key ? '#fff' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Do'kon filtri */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
            {[
              { key: 'all', label: '🌐 Hammasi' },
              { key: 'texno', label: '⚡ Texno' },
              { key: 'moto', label: '🏍️ Moto' },
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setFilterStore(s.key)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '7px',
                  border: 'none',
                  background: filterStore === s.key ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: filterStore === s.key ? '#fff' : 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sotuvlar jadvali */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredSales.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🧾</div>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>Savdolar topilmadi</div>
            <div style={{ fontSize: '13px', marginTop: '6px' }}>Filtr yoki qidiruv shartlarini o'zgartiring</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)' }}>
                  {['Sana & Vaqt', "Do'kon", 'Jami Summa', 'Sof Foyda', 'Tovarlar', 'Amallar'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale, idx) => {
                  const items = saleItems.filter(i => i.sale_id === sale.id);
                  const isExpanded = expandedSaleId === sale.id;
                  const date = new Date(sale.created_at);
                  const sl = storeLabel(sale.store_type);

                  return (
                    <React.Fragment key={sale.id}>
                      <tr
                        style={{
                          borderBottom: '1px solid var(--card-border)',
                          background: isExpanded ? 'rgba(0,242,254,0.04)' : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                          transition: 'background 0.2s',
                          cursor: 'pointer',
                        }}
                        onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                      >
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                            {date.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: '700',
                            color: sl.color,
                            background: sl.color + '22',
                            padding: '3px 10px',
                            borderRadius: '20px',
                            border: `1px solid ${sl.color}44`,
                          }}>
                            {sl.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--neon-green)' }}>
                            {fmt(parseFloat(sale.total_amount) || 0)}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {fmtUzs(parseFloat(sale.total_amount) || 0)}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--neon-purple)' }}>
                            +{fmt(parseFloat(sale.profit) || 0)}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {items.length} turdagi tovar
                          </span>
                          <span style={{ marginLeft: '8px', fontSize: '12px', color: isExpanded ? 'var(--neon-blue)' : 'var(--text-muted)' }}>
                            {isExpanded ? '▲' : '▼'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(sale.id); }}
                            disabled={isDeleting === sale.id}
                            style={{
                              background: 'rgba(255,56,96,0.1)',
                              border: '1px solid rgba(255,56,96,0.3)',
                              color: '#ff3860',
                              borderRadius: '8px',
                              padding: '4px 10px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            {isDeleting === sale.id ? '...' : '🗑️'}
                          </button>
                        </td>
                      </tr>

                      {/* Kengaytirilgan tovarlar ro'yxati */}
                      {isExpanded && (
                        <tr style={{ background: 'rgba(0,242,254,0.03)' }}>
                          <td colSpan={6} style={{ padding: '0 16px 14px 48px' }}>
                            <div style={{ borderLeft: '2px solid var(--neon-blue)', paddingLeft: '16px', marginTop: '8px' }}>
                              {items.length === 0 ? (
                                <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Tovar ma'lumotlari topilmadi</div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {items.map(item => {
                                    const prod = products.find(p => p.id === item.product_id);
                                    return (
                                      <div key={item.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '12px' }}>
                                        <span style={{ color: 'var(--neon-blue)', fontWeight: '700', minWidth: '24px' }}>×{item.quantity}</span>
                                        <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                                          {prod ? prod.name : 'Noma\'lum tovar'}
                                        </span>
                                        {prod && (
                                          <span style={{ color: 'var(--text-muted)' }}>
                                            {prod.brand && `[${prod.brand}]`}
                                          </span>
                                        )}
                                        <span style={{ marginLeft: 'auto', color: 'var(--neon-green)', fontWeight: '600' }}>
                                          {fmt((item.selling_price || 0) * item.quantity)}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
