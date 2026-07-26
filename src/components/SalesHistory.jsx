import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Receipt, 
  Search, 
  FileSpreadsheet, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Printer 
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { formatCurrency, DEFAULT_RATES } from '../utils/currency';
import { useToast } from './Toast';
import Button from './ui/Button';
import Badge from './ui/Badge';
import Card from './ui/Card';

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
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [filterStore, setFilterStore] = useState(currentStore);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSaleId, setExpandedSaleId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);
  const [selectedReceiptSale, setSelectedReceiptSale] = useState(null);

  useEffect(() => {
    setFilterStore(currentStore);
  }, [currentStore]);

  const getFilteredSales = () => {
    let filtered = [...sales];

    if (filterStore !== 'all') {
      filtered = filtered.filter(s => (s.store_type || 'texno') === filterStore);
    }

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

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        String(s.id).toLowerCase().includes(q) ||
        String(s.total_amount).includes(q)
      );
    }

    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return filtered;
  };

  const filteredSales = getFilteredSales();

  const totals = filteredSales.reduce((acc, s) => ({
    revenue: acc.revenue + (parseFloat(s.total_amount) || 0),
    cost: acc.cost + (parseFloat(s.total_cost) || 0),
    profit: acc.profit + (parseFloat(s.profit) || 0),
  }), { revenue: 0, cost: 0, profit: 0 });

  const handleDelete = async (saleId) => {
    if (!window.confirm("Bu savdoni o'chirishni tasdiqlaysizmi? Ombordagi tovarlar qayta tiklanadi.")) return;
    setIsDeleting(saleId);
    try {
      const itemsToDelete = saleItems.filter(i => i.sale_id === saleId);

      if (isSupabaseConfigured()) {
        // Ombordagi tovarlar sonini qayta tiklash
        for (const item of itemsToDelete) {
          const prod = products.find(p => p.id === item.product_id);
          if (prod) {
            const restoredStock = (prod.stock || 0) + (item.quantity || 1);
            await supabase.from('products').update({ stock: restoredStock }).eq('id', prod.id);

            await supabase.from('inventory_movements').insert([{
              product_id: prod.id,
              movement_type: 'cancellation',
              quantity: item.quantity || 1,
              note: `Sotuv bekori ID: #${saleId.toString().substring(0, 8)}`,
              created_at: new Date().toISOString()
            }]);
          }
        }

        const { error } = await supabase.from('sales').delete().eq('id', saleId);
        if (error) throw error;
      } else {
        let localProds = JSON.parse(localStorage.getItem('local_products') || '[]');
        let localSales = JSON.parse(localStorage.getItem('local_sales') || '[]');
        let localItems = JSON.parse(localStorage.getItem('local_sale_items') || '[]');
        let localMovements = JSON.parse(localStorage.getItem('local_inventory_movements') || '[]');

        // Omborni qayta tiklash
        itemsToDelete.forEach(item => {
          localProds = localProds.map(p => p.id === item.product_id ? { ...p, stock: (p.stock || 0) + (item.quantity || 1) } : p);
          
          localMovements.push({
            id: `mov-cancel-${Date.now()}`,
            product_id: item.product_id,
            movement_type: 'cancellation',
            quantity: item.quantity || 1,
            note: `Sotuv bekori ID: #${saleId.substring(0, 8)}`,
            created_at: new Date().toISOString()
          });
        });

        localStorage.setItem('local_products', JSON.stringify(localProds));
        localStorage.setItem('local_sales', JSON.stringify(localSales.filter(s => s.id !== saleId)));
        localStorage.setItem('local_sale_items', JSON.stringify(localItems.filter(i => i.sale_id !== saleId)));
        localStorage.setItem('local_inventory_movements', JSON.stringify(localMovements));
      }
      toast.success("Sotuv bekor qilindi va ombor soni qayta tiklandi! ✅");
      onRefresh();
    } catch (err) {
      console.error(err);
      toast.error('O\'chirishda xatolik: ' + err.message);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleExportExcel = () => {
    if (filteredSales.length === 0) return;

    const exportData = filteredSales.map((s, idx) => ({
      "№": idx + 1,
      "Sotuv ID": s.id,
      "Sana": new Date(s.created_at).toLocaleString('uz-UZ'),
      "Do'kon": s.store_type === 'moto' ? 'Moto Bozor' : 'Texno Bozor',
      "Jami Summa ($)": s.total_amount || 0,
      "Tannarx ($)": s.total_cost || 0,
      "Sof Foyda ($)": s.profit || 0,
      "To'lov Turi": s.payment_method || 'Naqd',
      "Jami Summa (SO'M)": Math.round((s.total_amount || 0) * (rates['UZS'] || 12800)),
      "Sof Foyda (SO'M)": Math.round((s.profit || 0) * (rates['UZS'] || 12800))
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sotuvlar Tarixi");
    XLSX.writeFile(workbook, `Texno_Bozor_Sotuvlar_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const getSaleItemsForSale = (saleId) => {
    return saleItems.filter(i => i.sale_id === saleId);
  };

  const formatPrimary = (val) => formatCurrency(val, currency, rates);
  const formatSecondary = (val) => {
    const sec = currency === 'USD' ? 'UZS' : 'USD';
    return formatCurrency(val, sec, rates);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Export Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Sotuvlar Tarixi
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Barcha amalga oshirilgan savdolar va tushumlar hisoboti
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button variant="secondary" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet size={14} /> Export (Excel)
          </Button>
        </div>
      </div>

      {/* Totals Metric Summary Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <Card style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Jami Savdolar</div>
          <div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginTop: '4px' }}>
            {filteredSales.length} ta
          </div>
        </Card>

        <Card style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Umumiy Tushum</div>
          <div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--brand-gold)', marginTop: '4px' }}>
            {formatPrimary(totals.revenue)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatSecondary(totals.revenue)}</div>
        </Card>

        <Card style={{ padding: '16px 20px', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Jami Sof Foyda</div>
          <div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--success)', marginTop: '4px' }}>
            {formatPrimary(totals.profit)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatSecondary(totals.profit)}</div>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card style={{ padding: '16px 20px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Sotuv ID yoki summa bo'yicha qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
        </div>

        {/* Period Filter Buttons */}
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
          {[
            { id: 'today', label: 'Bugun' },
            { id: 'week', label: 'Shu Hafta' },
            { id: 'month', label: 'Shu Oy' },
            { id: 'all', label: 'Barchasi' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setFilterPeriod(p.id)}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: filterPeriod === p.id ? 'var(--brand-accent)' : 'transparent',
                color: filterPeriod === p.id ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '11.5px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Data Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}></th>
              <th>Sotuv ID</th>
              <th>Sana va Vaqt</th>
              <th>Do'kon</th>
              <th>Jami Summa</th>
              <th>Sof Foyda</th>
              <th>To'lov Turi</th>
              <th style={{ textAlign: 'right' }}>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <Receipt size={36} style={{ marginBottom: '10px', opacity: 0.5 }} />
                  <div>Mos keluvchi sotuvlar tarixi topilmadi!</div>
                </td>
              </tr>
            ) : (
              filteredSales.map(sale => {
                const isExpanded = expandedSaleId === sale.id;
                const items = getSaleItemsForSale(sale.id);

                return (
                  <React.Fragment key={sale.id}>
                    <tr>
                      <td>
                        <button
                          onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                      <td>
                        <code style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--brand-gold)' }}>#{sale.id.toString().substring(0, 8)}</code>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', fontWeight: '500' }}>{new Date(sale.created_at).toLocaleDateString('uz-UZ')}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(sale.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td>
                        <Badge variant="info">
                          {sale.store_type === 'moto' ? 'Moto Bozor' : 'Texno Bozor'}
                        </Badge>
                      </td>
                      <td>
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{formatPrimary(sale.total_amount)}</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{formatSecondary(sale.total_amount)}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '700', color: 'var(--success)' }}>{formatPrimary(sale.profit)}</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{formatSecondary(sale.profit)}</div>
                      </td>
                      <td>
                        <Badge variant="success">
                          {sale.payment_method || 'Naqd'}
                        </Badge>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <Button
                            variant="secondary"
                            iconOnly
                            onClick={() => setSelectedReceiptSale(sale)}
                            title="Chek ko'rish"
                          >
                            <Printer size={14} />
                          </Button>
                          <Button
                            variant="danger"
                            iconOnly
                            onClick={() => handleDelete(sale.id)}
                            disabled={isDeleting === sale.id}
                            title="O'chirish"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Items Drawer Row */}
                    {isExpanded && (
                      <tr>
                        <td colSpan="8" style={{ background: 'var(--bg-secondary)', padding: '16px 24px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--brand-gold)', textTransform: 'uppercase', marginBottom: '8px' }}>
                                Sotilgan Tovarlar Tarkibi ({items.length} dona)
                              </div>
                              {items.length === 0 ? (
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tovar detali saqlanmagan.</div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {items.map(item => {
                                    const prod = products.find(p => p.id === item.product_id);
                                    const itemPrice = item.selling_price || item.price || item.unit_price || (prod ? prod.selling_price : 0);
                                    const itemCost = item.cost_price || (prod ? prod.cost_price : 0);
                                    const qty = item.quantity || 1;
                                    const itemProfit = (itemPrice - itemCost) * qty;

                                    return (
                                      <div key={item.id || item.product_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--text-secondary)', padding: '4px 0', borderBottom: '1px dashed var(--card-border)' }}>
                                        <div>
                                          <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>• {prod ? prod.name : 'Tovar ID: ' + item.product_id}</span>
                                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>(x{qty} dona)</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                          <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{formatPrimary(itemPrice * qty)}</span>
                                          <span style={{ fontWeight: '600', color: 'var(--success)', fontSize: '11.5px' }}>(+{formatPrimary(itemProfit)})</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Payment Breakdown & Commissions */}
                            <div style={{ background: 'var(--card-bg)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                              <div style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-primary)', borderBottom: '1px solid var(--card-border)', paddingBottom: '4px' }}>
                                To'lov Tafsilotlari:
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>To'lov Usuli:</span>
                                <Badge variant="success">{sale.payment_method || 'Naqd'}</Badge>
                              </div>
                              {sale.card_commission > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--warning)' }}>
                                  <span>Bank 2% Komissiya:</span>
                                  <span>-{formatPrimary(sale.card_commission)}</span>
                                </div>
                              )}
                              {sale.nasiya_fee > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--warning)' }}>
                                  <span>Nasiya 5% Xarajat:</span>
                                  <span>-{formatPrimary(sale.nasiya_fee)}</span>
                                </div>
                              )}
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', color: 'var(--success)', borderTop: '1px solid var(--card-border)', paddingTop: '4px', marginTop: '2px' }}>
                                <span>Sof Tushum:</span>
                                <span>{formatPrimary(sale.net_amount || (sale.total_amount - (sale.card_commission || 0) - (sale.nasiya_fee || 0)))}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* POS Thermal Receipt Modal */}
      {selectedReceiptSale && (
        <div className="modal-backdrop" onClick={() => setSelectedReceiptSale(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px', padding: '24px', background: '#ffffff', color: '#000000', borderRadius: '12px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '1px dashed #000', paddingBottom: '12px' }}>
              <div style={{ fontSize: '18px', fontWeight: '900', letterSpacing: '-0.5px' }}>TEXNO MOTO BOZOR</div>
              <div style={{ fontSize: '11px', color: '#555' }}>Rasmiy Xarid Kvitansiyasi</div>
              <div style={{ fontSize: '10px', color: '#777', marginTop: '4px' }}>Check #: {selectedReceiptSale.id}</div>
              <div style={{ fontSize: '10px', color: '#777' }}>Sana: {new Date(selectedReceiptSale.created_at).toLocaleString('uz-UZ')}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', marginBottom: '16px' }}>
              {getSaleItemsForSale(selectedReceiptSale.id).map(item => {
                const prod = products.find(p => p.id === item.product_id);
                const itemPrice = item.selling_price || item.price || item.unit_price || (prod ? prod.selling_price : 0);
                const qty = item.quantity || 1;
                return (
                  <div key={item.id || item.product_id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{prod ? prod.name : 'Tovar'} x{qty}</span>
                    <span style={{ fontWeight: '700' }}>{formatPrimary(itemPrice * qty)}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ borderTop: '1px dashed #000', paddingTop: '10px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '900' }}>
                <span>JAMI:</span>
                <span>{formatPrimary(selectedReceiptSale.total_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#555', marginTop: '2px' }}>
                <span>To'lov usuli:</span>
                <span style={{ fontWeight: '700' }}>{selectedReceiptSale.payment_method || 'Naqd'}</span>
              </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '11px', color: '#666', marginBottom: '16px' }}>
              Xaridingiz uchun rahmat! 😊
            </div>

            <div className="no-print" style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => window.print()}
                style={{ flex: 1, padding: '10px', background: '#000', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
              >
                🖨️ Chop etish
              </button>
              <button 
                onClick={() => setSelectedReceiptSale(null)}
                style={{ padding: '10px 14px', background: '#eee', color: '#000', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
