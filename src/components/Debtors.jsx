import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { formatCurrency, DEFAULT_RATES } from '../utils/currency';
import { sendTelegramNotification } from './TelegramSettingsModal';
import { useToast } from './Toast';

export default function Debtors({
  products = [],
  rates = DEFAULT_RATES,
  currency = 'USD',
  currentStore = 'all',
}) {
  const toast = useToast();
  const [debtors, setDebtors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'completed', 'overdue'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState(null);

  // Form states (Yangi Nasiya Qo'shish)
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [productName, setProductName] = useState('');
  const [storeType, setStoreType] = useState(currentStore === 'moto' ? 'moto' : 'texno');
  const [totalAmount, setTotalAmount] = useState(0);
  const [downPayment, setDownPayment] = useState(0);
  const [monthsCount, setMonthsCount] = useState(12);
  const [dueDay, setDueDay] = useState(10);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // To'lov qilish modal formulasi
  const [payAmount, setPayAmount] = useState(0);
  const [payNote, setPayNote] = useState('');

  // Initial Mock Debtors (Namuna uchun)
  const mockDebtors = [
    {
      id: 'deb-1',
      client_name: "Alisher Ro'ziyev",
      phone: "+998 90 123 45 67",
      product_name: "iPhone 15 Pro Max 256GB",
      store_type: 'texno',
      total_amount: 1350,
      down_payment: 350,
      remaining_amount: 1000,
      monthly_payment: 100,
      months_count: 10,
      due_day: 15,
      status: 'active',
      created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
      last_payment_date: new Date(Date.now() - 15 * 86400000).toISOString(),
      notes: "Pasport nusxasi bor"
    },
    {
      id: 'deb-2',
      client_name: "Sardor Karimov",
      phone: "+998 93 987 65 43",
      product_name: "Skuter RX 150cc Sport",
      store_type: 'moto',
      total_amount: 1250,
      down_payment: 250,
      remaining_amount: 1000,
      monthly_payment: 125,
      months_count: 8,
      due_day: 5,
      status: 'overdue',
      created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
      last_payment_date: new Date(Date.now() - 35 * 86400000).toISOString(),
      notes: "Kaska qo'shib berilgan"
    }
  ];

  // Ma'lumotlarni yuklash (Supabase yoki LocalStorage)
  const fetchDebtors = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.from('debtors').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setDebtors(data || []);
      } else {
        let local = JSON.parse(localStorage.getItem('local_debtors') || '[]');
        if (local.length === 0 && !localStorage.getItem('local_debtors_seeded')) {
          local = mockDebtors;
          localStorage.setItem('local_debtors', JSON.stringify(local));
          localStorage.setItem('local_debtors_seeded', 'true');
        }
        setDebtors(local);
      }
    } catch (e) {
      console.warn("Debtors loading fallback:", e);
      let local = JSON.parse(localStorage.getItem('local_debtors') || '[]');
      if (local.length === 0) local = mockDebtors;
      setDebtors(local);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebtors();
  }, []);

  // Modalni ochish
  const openModal = () => {
    setClientName('');
    setPhone('+998 ');
    setProductName('');
    setStoreType(currentStore === 'moto' ? 'moto' : 'texno');
    setTotalAmount(0);
    setDownPayment(0);
    setMonthsCount(12);
    setDueDay(10);
    setNotes('');
    setIsModalOpen(true);
  };

  // Yangi Nasiya Saqlash
  const handleSaveDebtor = async (e) => {
    e.preventDefault();
    if (!clientName || !totalAmount) {
      toast.warning("Iltimos, mijoz ismi va umumiy summani kiriting!");
      return;
    }

    setIsSaving(true);
    const rate = rates[currency] || 1;
    const totalUsd = (parseFloat(totalAmount) || 0) / rate;
    const downUsd = (parseFloat(downPayment) || 0) / rate;
    const remainingUsd = Math.max(0, totalUsd - downUsd);
    const mCount = parseInt(monthsCount, 10) || 1;
    const monthlyUsd = Math.round(remainingUsd / mCount);

    const newDebtor = {
      client_name: clientName,
      phone: phone || '—',
      product_name: productName || 'Noma\'lum tovar',
      store_type: storeType,
      total_amount: totalUsd,
      down_payment: downUsd,
      remaining_amount: remainingUsd,
      monthly_payment: monthlyUsd,
      months_count: mCount,
      due_day: parseInt(dueDay, 10) || 10,
      status: remainingUsd <= 0 ? 'completed' : 'active',
      notes: notes || '',
      created_at: new Date().toISOString(),
      last_payment_date: new Date().toISOString()
    };

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from('debtors').insert([newDebtor]);
        if (error) throw error;
      } else {
        let local = JSON.parse(localStorage.getItem('local_debtors') || '[]');
        local.unshift({ id: `deb-${Date.now()}`, ...newDebtor });
        localStorage.setItem('local_debtors', JSON.stringify(local));
      }

      // Telegram Xabarnomasi
      const tgMsg =
        `📋 <b>YANGI NASIYA RASMIYLASHTIRILDI!</b>\n\n` +
        `👤 Mijoz: <b>${clientName}</b> (${phone})\n` +
        `📦 Tovar: ${productName}\n` +
        `🏪 Do'kon: ${storeType === 'moto' ? '🏍️ Moto Bozor' : '⚡ Texno Bozor'}\n` +
        `💵 Jami Narxi: $${totalUsd.toFixed(0)} (${formatCurrency(totalUsd, 'UZS', rates)})\n` +
        `💰 Boshlang'ich: $${downUsd.toFixed(0)}\n` +
        `📉 Qolgan Qarz: <b>$${remainingUsd.toFixed(0)}</b>\n` +
        `📅 Oylik To'lov: $${monthlyUsd.toFixed(0)} / oy (Har oyning ${dueDay}-sanasi)\n` +
        `⏱️ Muddat: ${mCount} oy`;
      sendTelegramNotification(tgMsg);

      toast.success("Nasiya bitimi muvaffaqiyatli rasmiylashtirildi! ✅");
      setIsModalOpen(false);
      fetchDebtors();
    } catch (err) {
      console.error(err);
      toast.error("Nasiyani saqlashda xatolik: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // To'lov Qabul Qilish Modalini Ochish
  const openPayModal = (debtor) => {
    setSelectedDebtor(debtor);
    const rate = rates[currency] || 1;
    setPayAmount(Math.round((debtor.monthly_payment || 0) * rate));
    setPayNote('');
    setIsPayModalOpen(true);
  };

  // To'lovni Bazaga Qayd Etish
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedDebtor || !payAmount) return;

    const rate = rates[currency] || 1;
    const payUsd = (parseFloat(payAmount) || 0) / rate;
    const newRemaining = Math.max(0, selectedDebtor.remaining_amount - payUsd);
    const newStatus = newRemaining <= 0 ? 'completed' : 'active';

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('debtors')
          .update({
            remaining_amount: newRemaining,
            status: newStatus,
            last_payment_date: new Date().toISOString()
          })
          .eq('id', selectedDebtor.id);
        if (error) throw error;
      } else {
        let local = JSON.parse(localStorage.getItem('local_debtors') || '[]');
        local = local.map(d => d.id === selectedDebtor.id ? {
          ...d,
          remaining_amount: newRemaining,
          status: newStatus,
          last_payment_date: new Date().toISOString()
        } : d);
        localStorage.setItem('local_debtors', JSON.stringify(local));
      }

      // Telegram xabarnomasi
      const tgMsg =
        `💵 <b>NASIYA TO'LOVI QABUL QILINDI!</b>\n\n` +
        `👤 Mijoz: <b>${selectedDebtor.client_name}</b>\n` +
        `📦 Tovar: ${selectedDebtor.product_name}\n` +
        `💰 Qabul qilindi: <b>$${payUsd.toFixed(0)}</b> (${formatCurrency(payUsd, 'UZS', rates)})\n` +
        `📉 Qolgan Qarz: <b>$${newRemaining.toFixed(0)}</b>\n` +
        `📊 Holat: ${newStatus === 'completed' ? '✅ TO' + 'LIQ YOPILDI!' : '⚡ Faol'}`;
      sendTelegramNotification(tgMsg);

      toast.success(newRemaining <= 0 ? "Tabriklaymiz! Qarz to'liq yopildi! 🎉" : "To'lov muvaffaqiyatli qabul qilindi! ✅");
      setIsPayModalOpen(false);
      fetchDebtors();
    } catch (err) {
      console.error(err);
      toast.error("To'lovni saqlashda xatolik: " + err.message);
    }
  };

  // O'chirish
  const handleDeleteDebtor = async (id) => {
    if (!window.confirm("Haqiqatan ham ushbu nasiya yozuvini o'chirmoqchisiz?")) return;
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from('debtors').delete().eq('id', id);
        if (error) throw error;
      } else {
        let local = JSON.parse(localStorage.getItem('local_debtors') || '[]');
        local = local.filter(d => d.id !== id);
        localStorage.setItem('local_debtors', JSON.stringify(local));
      }
      toast.success("Nasiya yozuvi o'chirildi.");
      fetchDebtors();
    } catch (err) {
      toast.error("O'chirishda xatolik: " + err.message);
    }
  };

  // Excel Eksport
  const handleExportExcel = () => {
    if (debtors.length === 0) {
      toast.warning("Excel eksport qilish uchun ma'lumotlar yo'q!");
      return;
    }

    const exportData = debtors.map((d, idx) => ({
      "№": idx + 1,
      "Mijoz Ismi": d.client_name,
      "Telefon": d.phone,
      "Tovar Nomi": d.product_name,
      "Do'kon": d.store_type === 'moto' ? 'Moto Bozor' : 'Texno Bozor',
      "Jami Summa ($)": d.total_amount || 0,
      "Boshlang'ich ($)": d.down_payment || 0,
      "Qolgan Qarz ($)": d.remaining_amount || 0,
      "Oylik To'lov ($)": d.monthly_payment || 0,
      "Har Oyning Sanasi": d.due_day || 10,
      "Holat": d.status === 'completed' ? 'Tugallangan' : d.status === 'overdue' ? 'Muddati o\'tgan' : 'Faol',
      "Izoh": d.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Nasiyadorlar Ro'yxati");
    XLSX.writeFile(wb, `Nasiyadorlar_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Filtrlangan Nasiyadorlar
  const filteredDebtors = debtors.filter(d => {
    const matchesStore = currentStore === 'all' || (d.store_type || 'texno') === currentStore;
    const matchesStatus = filterStatus === 'all' || d.status === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (d.client_name && d.client_name.toLowerCase().includes(q)) ||
      (d.phone && d.phone.toLowerCase().includes(q)) ||
      (d.product_name && d.product_name.toLowerCase().includes(q));
    return matchesStore && matchesStatus && matchesSearch;
  });

  // Metrikalarni hisoblash
  const totalDebtUsd = filteredDebtors.reduce((acc, d) => acc + (d.remaining_amount || 0), 0);
  const monthlyExpectedUsd = filteredDebtors.filter(d => d.status === 'active' || d.status === 'overdue').reduce((acc, d) => acc + (d.monthly_payment || 0), 0);
  const overdueCount = filteredDebtors.filter(d => d.status === 'overdue').length;

  const fmtPrimary = (val) => formatCurrency(val, currency, rates);
  const fmtSecondary = (val) => formatCurrency(val, currency === 'USD' ? 'UZS' : 'USD', rates);

  return (
    <div className="page-fade-in">
      {/* Page Header */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div className="page-title">
          <h1>Nasiyadorlar Daftari (Qarzlar)</h1>
          <p>Mijozlarning bo'lib to'lash (nasiya) shartnomalari, to'lovlar grafigi va qarzdorlik nazorati</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleExportExcel} className="btn-secondary" style={{ fontSize: '13px', padding: '8px 14px' }}>
            📥 Excel Eksport (.xlsx)
          </button>
          <button onClick={openModal} className="btn-primary" style={{ fontSize: '13px', padding: '8px 18px' }}>
            + Yangi Nasiya Bitimi
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '24px', marginBottom: '4px' }}>📉</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Jami Qolgan Qarz</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--neon-pink)', marginTop: '4px' }}>
            {fmtPrimary(totalDebtUsd)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{fmtSecondary(totalDebtUsd)}</div>
        </div>

        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '24px', marginBottom: '4px' }}>💵</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Oylik Kutilayotgan Tushum</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--neon-green)', marginTop: '4px' }}>
            {fmtPrimary(monthlyExpectedUsd)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{fmtSecondary(monthlyExpectedUsd)}</div>
        </div>

        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '24px', marginBottom: '4px' }}>👥</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nasiyadorlar Soni</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--neon-blue)', marginTop: '4px' }}>
            {filteredDebtors.length} kishi
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Faol: {filteredDebtors.filter(d => d.status === 'active').length} | Tugallangan: {filteredDebtors.filter(d => d.status === 'completed').length}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '24px', marginBottom: '4px' }}>⚠️</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Muddati O'tganlar</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: overdueCount > 0 ? 'var(--neon-red)' : 'var(--neon-green)', marginTop: '4px' }}>
            {overdueCount} kishi
          </div>
          <div style={{ fontSize: '12px', color: overdueCount > 0 ? 'var(--neon-red)' : 'var(--text-muted)' }}>
            {overdueCount > 0 ? 'Muddati kechikkan to\'lovlar bor' : 'Kechikishlar yo\'q'}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Mijoz ismi, telefoni yoki tovar nomi bo'yicha qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ maxWidth: '340px' }}
          />

          <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
            {[
              { key: 'all', label: 'Barchasi' },
              { key: 'active', label: '⚡ Faol' },
              { key: 'overdue', label: '⚠️ Kechikkan' },
              { key: 'completed', label: '✅ Yopilgan' },
            ].map(st => (
              <button
                key={st.key}
                onClick={() => setFilterStatus(st.key)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: filterStatus === st.key ? 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple))' : 'transparent',
                  color: filterStatus === st.key ? '#fff' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Yuklanmoqda...</div>
        ) : filteredDebtors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📜</div>
            <div>Hech qanday nasiya bitimi topilmadi.</div>
          </div>
        ) : (
          <div className="table-container">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)' }}>Mijoz / Telefon</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)' }}>Tovar & Do'kon</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)' }}>Jami / Qolgan Qarz</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)' }}>Oylik To'lov</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)' }}>Sanasi (Har Oy)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)' }}>Holat</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filteredDebtors.map(debtor => {
                  const isOverdue = debtor.status === 'overdue';
                  const isCompleted = debtor.status === 'completed';

                  return (
                    <tr key={debtor.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#fff', fontSize: '14px' }}>{debtor.client_name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--neon-blue)', marginTop: '2px' }}>{debtor.phone}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '13px' }}>{debtor.product_name}</div>
                        <div style={{ fontSize: '11px', color: debtor.store_type === 'moto' ? 'var(--neon-pink)' : 'var(--neon-blue)' }}>
                          {debtor.store_type === 'moto' ? '🏍️ Moto Bozor' : '⚡ Texno Bozor'}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--neon-pink)' }}>
                          {fmtPrimary(debtor.remaining_amount)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Jami: {fmtPrimary(debtor.total_amount)}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--neon-green)' }}>
                          {fmtPrimary(debtor.monthly_payment)} / oy
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {debtor.months_count} oyga bo'lingan
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600' }}>Har oyning {debtor.due_day}-sanasi</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: '700',
                          background: isCompleted ? 'rgba(0, 245, 212, 0.15)' : isOverdue ? 'rgba(255, 56, 96, 0.15)' : 'rgba(0, 242, 254, 0.15)',
                          color: isCompleted ? 'var(--neon-green)' : isOverdue ? 'var(--neon-red)' : 'var(--neon-blue)',
                          border: `1px solid ${isCompleted ? 'var(--neon-green)' : isOverdue ? 'var(--neon-red)' : 'var(--neon-blue)'}`
                        }}>
                          {isCompleted ? '✅ Yopilgan' : isOverdue ? '⚠️ Kechikkan' : '⚡ Faol'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          {!isCompleted && (
                            <button
                              onClick={() => openPayModal(debtor)}
                              className="btn-primary"
                              style={{ fontSize: '12px', padding: '6px 12px' }}
                            >
                              💵 To'lov Qabul Qilish
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteDebtor(debtor.id)}
                            style={{ background: 'rgba(255,56,96,0.1)', border: '1px solid rgba(255,56,96,0.3)', color: '#ff3860', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal 1: Yangi Nasiya Qo'shish */}
      {isModalOpen && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-card" style={{ maxWidth: '560px', width: '90%', maxHeight: '85vh', overflowY: 'auto', padding: '24px' }}>
            <div className="modal-header">
              <h2>+ Yangi Nasiya Bitimi</h2>
              <button onClick={() => setIsModalOpen(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleSaveDebtor} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
              <div className="form-group">
                <label>Mijoz F.I.SH (Ismi-familiyasi) *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Masalan: Alisher Ro'ziyev"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Telefon Raqami *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="+998 90 123 45 67"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Tovar Nomi</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Masalan: iPhone 15 Pro"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Do'kon Turi</label>
                  <select className="form-control" value={storeType} onChange={(e) => setStoreType(e.target.value)}>
                    <option value="texno">⚡ Texno Bozor</option>
                    <option value="moto">🏍️ Moto Bozor</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Jami Tovar Narxi ({currency}) *</label>
                  <input
                    type="number"
                    className="form-control"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Boshlang'ich To'lov ({currency})</label>
                  <input
                    type="number"
                    className="form-control"
                    value={downPayment}
                    onChange={(e) => setDownPayment(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Bo'lib to'lash muddati (Oylar)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={monthsCount}
                    onChange={(e) => setMonthsCount(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Har oyning to'lov sanasi</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    className="form-control"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Qo'shimcha Izoh (Pasport, Kafillik b.)</label>
                <textarea
                  className="form-control"
                  rows="2"
                  placeholder="Pasport seriyasi, manzil va h.k."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                ></textarea>
              </div>

              <button type="submit" disabled={isSaving} className="btn-primary" style={{ width: '100%', justifyContent: 'center', height: '44px', marginTop: '10px' }}>
                {isSaving ? 'Saqlanmoqda...' : '💾 Bitimni Saqlash'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal 2: To'lov Qabul Qilish */}
      {isPayModalOpen && selectedDebtor && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-card" style={{ maxWidth: '440px', width: '90%' }}>
            <div className="modal-header">
              <h2>💵 To'lov Qabul Qilish</h2>
              <button onClick={() => setIsPayModalOpen(false)} className="close-btn">&times;</button>
            </div>
            <div style={{ margin: '14px 0', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
              <div style={{ fontWeight: '700', color: '#fff', fontSize: '15px' }}>{selectedDebtor.client_name}</div>
              <div style={{ color: 'var(--neon-pink)', fontSize: '13px', marginTop: '4px' }}>
                Hozirgi Qolgan Qarz: <strong>{fmtPrimary(selectedDebtor.remaining_amount)}</strong>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label>Qabul Qilingan Summa ({currency}) *</label>
                <input
                  type="number"
                  className="form-control"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', height: '44px' }}>
                ✅ To'lovni Tasdiqlash
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
