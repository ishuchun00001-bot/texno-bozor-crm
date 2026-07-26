import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Users, 
  Plus, 
  Search, 
  FileSpreadsheet, 
  CreditCard, 
  Trash2, 
  Phone 
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { formatCurrency, DEFAULT_RATES } from '../utils/currency';
import { sendTelegramNotification } from './TelegramSettingsModal';
import { useToast } from './Toast';
import Button from './ui/Button';
import Badge from './ui/Badge';
import Card from './ui/Card';
import Input from './ui/Input';
import Modal from './ui/Modal';

export default function Debtors({
  rates = DEFAULT_RATES,
  currency = 'USD',
  currentStore = 'all',
}) {
  const toast = useToast();
  const [debtors, setDebtors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
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

  const fetchDebtors = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.from('debtors').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setDebtors(data || []);
      } else {
        let local = [];
        try {
          const parsed = JSON.parse(localStorage.getItem('local_debtors') || '[]');
          local = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          console.error(e);
          local = [];
        }

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

  const openPayModal = (debtor) => {
    setSelectedDebtor(debtor);
    const rate = rates[currency] || 1;
    setPayAmount(Math.round((debtor.monthly_payment || 0) * rate));
    setIsPayModalOpen(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedDebtor || !payAmount) return;

    const rate = rates[currency] || 1;
    const payUsdRaw = (parseFloat(payAmount) || 0) / rate;
    const payUsd = Math.min(selectedDebtor.remaining_amount, payUsdRaw);
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

      const tgMsg =
        `💵 <b>NASIYA TO'LOVI QABUL QILINDI!</b>\n\n` +
        `👤 Mijoz: <b>${selectedDebtor.client_name}</b>\n` +
        `📦 Tovar: ${selectedDebtor.product_name}\n` +
        `💰 Qabul qilindi: <b>$${payUsd.toFixed(0)}</b> (${formatCurrency(payUsd, 'UZS', rates)})\n` +
        `📉 Qolgan Qarz: <b>$${newRemaining.toFixed(0)}</b>\n` +
        `📊 Holat: ${newStatus === 'completed' ? '✅ TO\'LIQ YOPILDI!' : '⚡ Faol'}`;
      sendTelegramNotification(tgMsg);

      toast.success(newRemaining <= 0 ? "Tabriklaymiz! Qarz to'liq yopildi! 🎉" : "To'lov muvaffaqiyatli qabul qilindi! ✅");
      setIsPayModalOpen(false);
      fetchDebtors();
    } catch (err) {
      console.error(err);
      toast.error("To'lovni saqlashda xatolik: " + err.message);
    }
  };

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

  const getDebtorStatus = (d) => {
    if (!d || d.remaining_amount <= 0) return 'completed';
    const todayDate = new Date().getDate();
    if (d.due_day && todayDate > d.due_day) {
      return 'overdue';
    }
    return d.status || 'active';
  };

  const filteredDebtors = debtors.map(d => ({ ...d, computedStatus: getDebtorStatus(d) })).filter(d => {
    const matchesStore = currentStore === 'all' || (d.store_type || 'texno') === currentStore;
    const matchesStatus = filterStatus === 'all' || d.computedStatus === filterStatus;
    const matchesQuery = 
      (d.client_name && d.client_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.phone && d.phone.includes(searchQuery)) ||
      (d.product_name && d.product_name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStore && matchesStatus && matchesQuery;
  });

  const totalRemainingUsd = filteredDebtors.reduce((sum, d) => sum + (parseFloat(d.remaining_amount) || 0), 0);

  const formatPrimary = (val) => formatCurrency(val, currency, rates);
  const formatSecondary = (val) => {
    const sec = currency === 'USD' ? 'UZS' : 'USD';
    return formatCurrency(val, sec, rates);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Nasiya va Qarzlar Boshqaruvi
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Muddatli to'lovlar, qarzdorliklar va to'lov grafigi monitoringi
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button variant="secondary" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet size={14} /> Export (Excel)
          </Button>
          <Button variant="primary" onClick={openModal}>
            <Plus size={16} /> Yangi Nasiya Rasmiylashtirish
          </Button>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <Card style={{ padding: '16px 20px', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Jami Qarzlar Qoldig'i</div>
          <div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--danger)', marginTop: '4px' }}>
            {formatPrimary(totalRemainingUsd)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatSecondary(totalRemainingUsd)}</div>
        </Card>

        <Card style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Faol Nasiyadorlar</div>
          <div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginTop: '4px' }}>
            {filteredDebtors.filter(d => d.status === 'active').length} kishi
          </div>
        </Card>

        <Card style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Muddati O'tganlar</div>
          <div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--warning)', marginTop: '4px' }}>
            {filteredDebtors.filter(d => d.status === 'overdue').length} kishi
          </div>
        </Card>
      </div>

      {/* Search & Filter Toolbar */}
      <Card style={{ padding: '16px 20px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Mijoz ismi, telefon raqami yoki tovar bo'yicha qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
        </div>

        <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
          {[
            { id: 'all', label: 'Barchasi' },
            { id: 'active', label: 'Faol' },
            { id: 'overdue', label: 'Muddati o\'tgan' },
            { id: 'completed', label: 'Yopilgan' }
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setFilterStatus(s.id)}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: filterStatus === s.id ? 'var(--brand-accent)' : 'transparent',
                color: filterStatus === s.id ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '11.5px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Enterprise Data Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Mijoz Ismi va Telefon</th>
              <th>Tovar Nomi</th>
              <th>Jami Narxi</th>
              <th>Boshlang'ich To'lov</th>
              <th>Qolgan Qarz</th>
              <th>Oylik To'lov</th>
              <th>Har Oyning Sanasi</th>
              <th>Holat</th>
              <th style={{ textAlign: 'right' }}>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3].map(i => (
                <tr key={i}><td colSpan="9"><div className="skeleton" style={{ height: '36px' }} /></td></tr>
              ))
            ) : filteredDebtors.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <Users size={36} style={{ marginBottom: '10px', opacity: 0.5 }} />
                  <div>Nasiyadorlar ro'yxati bo'sh!</div>
                </td>
              </tr>
            ) : (
              filteredDebtors.map(d => (
                <tr key={d.id}>
                  <td>
                    <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{d.client_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--brand-accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={10} /> {d.phone}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: '600' }}>{d.product_name}</div>
                    <Badge variant="info">{d.store_type === 'moto' ? 'Moto Bozor' : 'Texno Bozor'}</Badge>
                  </td>
                  <td>
                    <div>{formatPrimary(d.total_amount)}</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{formatSecondary(d.total_amount)}</div>
                  </td>
                  <td>
                    <div style={{ color: 'var(--success)', fontWeight: '600' }}>{formatPrimary(d.down_payment)}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: '700', color: 'var(--danger)' }}>{formatPrimary(d.remaining_amount)}</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{formatSecondary(d.remaining_amount)}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: '600', color: 'var(--brand-gold)' }}>{formatPrimary(d.monthly_payment)} / oy</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{d.months_count} oy davomida</div>
                  </td>
                  <td>
                    <Badge variant="warning">Har oyning {d.due_day}-kuni</Badge>
                  </td>
                  <td>
                    {d.status === 'completed' ? (
                      <Badge variant="success">Yopilgan ✅</Badge>
                    ) : d.status === 'overdue' ? (
                      <Badge variant="danger">Muddati o'tgan ⚠️</Badge>
                    ) : (
                      <Badge variant="info">Faol ⚡</Badge>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      {d.remaining_amount > 0 && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => openPayModal(d)}
                        >
                          <CreditCard size={13} /> To'lov
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        iconOnly
                        onClick={() => handleDeleteDebtor(d.id)}
                        title="O'chirish"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Yangi Nasiya Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Yangi Nasiya Rasmiylashtirish"
        maxWidth="540px"
      >
        <form onSubmit={handleSaveDebtor} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input 
            label="Mijoz F.I.SH. *" 
            value={clientName} 
            onChange={(e) => setClientName(e.target.value)} 
            placeholder="Masalan: Alisher Karimov" 
            required 
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input label="Telefon Raqam *" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" required />
            <Input label="Tovar Nomi *" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="iPhone 15 Pro Max" required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input label={`Jami Summa (${currency}) *`} type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} min="0" required />
            <Input label={`Boshlang'ich (${currency})`} type="number" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} min="0" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input label="Muddat (Oylar soni)" type="number" value={monthsCount} onChange={(e) => setMonthsCount(e.target.value)} min="1" max="36" />
            <Input label="Har Oyning Sanasi (1-31)" type="number" value={dueDay} onChange={(e) => setDueDay(e.target.value)} min="1" max="31" />
          </div>

          <div className="form-group">
            <label className="form-label">Qo'shimcha Izoh</label>
            <textarea className="form-control" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Pasport nusxasi olingan, kafil bor..." rows="2" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Bekor qilish</Button>
            <Button variant="primary" type="submit" loading={isSaving}>
              Rasmiylashtirish
            </Button>
          </div>
        </form>
      </Modal>

      {/* To'lov Qabul Qilish Modal */}
      <Modal
        isOpen={isPayModalOpen && !!selectedDebtor}
        onClose={() => setIsPayModalOpen(false)}
        title="To'lov Qabul Qilish"
        maxWidth="440px"
      >
        {selectedDebtor && (
          <>
            <div style={{ marginBottom: '16px', background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{selectedDebtor.client_name}</div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{selectedDebtor.product_name}</div>
              <div style={{ fontSize: '12px', color: 'var(--danger)', fontWeight: '700', marginTop: '4px' }}>
                Hozirgi qarz: {formatPrimary(selectedDebtor.remaining_amount)}
              </div>
            </div>

            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Input 
                label={`To'lanayotgan Summa (${currency}) *`} 
                type="number" 
                value={payAmount} 
                onChange={(e) => setPayAmount(e.target.value)} 
                min="1" 
                required 
                autoFocus 
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <Button variant="secondary" type="button" onClick={() => setIsPayModalOpen(false)}>Bekor qilish</Button>
                <Button variant="primary" type="submit">To'lovni Tasdiqlash</Button>
              </div>
            </form>
          </>
        )}
      </Modal>
    </div>
  );
}
