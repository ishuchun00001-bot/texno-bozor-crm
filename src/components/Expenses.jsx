import React, { useState } from 'react';
import { 
  Wallet, 
  Plus, 
  Search, 
  FileSpreadsheet, 
  Trash2, 
  Tag, 
  User 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { formatCurrency, DEFAULT_RATES } from '../utils/currency';
import { useToast } from './Toast';
import Button from './ui/Button';
import Badge from './ui/Badge';
import Card from './ui/Card';
import Input from './ui/Input';
import Modal from './ui/Modal';

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Arenda',
  'Elektr',
  'Suv',
  'Internet',
  'Soliq',
  'Ish haqi',
  'Reklama',
  'Transport',
  'Ta\'mirlash',
  'Boshqa'
];

export const RECURRENCE_TYPES = [
  { id: 'once', label: 'Bir martalik' },
  { id: 'daily', label: 'Kunlik' },
  { id: 'weekly', label: 'Haftalik' },
  { id: 'monthly', label: 'Oylik' },
  { id: 'yearly', label: 'Yillik' }
];

export default function Expenses({
  expenses = [],
  onRefresh,
  loading = false,
  rates = DEFAULT_RATES,
  currency = 'USD',
  currentStore = 'all'
}) {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRecurrence] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Custom Categories State
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('custom_expense_categories');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return DEFAULT_EXPENSE_CATEGORIES; }
    }
    return DEFAULT_EXPENSE_CATEGORIES;
  });

  const [newCatName, setNewCatName] = useState('');

  // Expense Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(DEFAULT_EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [recurrence, setRecurrence] = useState('once');
  const [notes, setNotes] = useState('');
  const [storeType, setStoreType] = useState(currentStore === 'moto' ? 'moto' : 'texno');
  const [status, setStatus] = useState('paid');
  const [createdBy, setCreatedBy] = useState('Admin');
  const [isSaving, setIsSaving] = useState(false);

  const openAddModal = () => {
    setTitle('');
    setCategory(categories[0] || 'Arenda');
    setAmount(0);
    setDate(new Date().toISOString().slice(0, 10));
    setRecurrence('once');
    setStatus('paid');
    setNotes('');
    setStoreType(currentStore === 'moto' ? 'moto' : 'texno');
    setCreatedBy('Admin');
    setIsModalOpen(true);
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const cat = newCatName.trim();
    if (categories.includes(cat)) {
      toast.warning('Ushbu kategoriya allaqachon mavjud!');
      return;
    }
    const updated = [...categories, cat];
    setCategories(updated);
    localStorage.setItem('custom_expense_categories', JSON.stringify(updated));
    setCategory(cat);
    setNewCatName('');
    setIsCategoryModalOpen(false);
    toast.success('Yangi kategoriya qo\'shildi! ✅');
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!title || !amount) {
      toast.warning('Iltimos, xarajat nomi va summasini kiriting!');
      return;
    }

    setIsSaving(true);
    const rate = rates[currency] || 1;
    const amountUsd = (parseFloat(amount) || 0) / rate;

    const expenseData = {
      title,
      category,
      amount: amountUsd,
      date,
      recurrence,
      status: status || 'paid',
      store_type: storeType,
      notes: notes || '',
      created_by: createdBy || 'Admin',
      created_at: new Date(date).toISOString()
    };

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from('expenses').insert([expenseData]);
        if (error) throw error;
      } else {
        let local = [];
        try {
          const parsed = JSON.parse(localStorage.getItem('local_expenses') || '[]');
          local = Array.isArray(parsed) ? parsed : [];
        } catch (err) {
          local = [];
        }
        local.unshift({ id: `exp-${Date.now()}`, ...expenseData });
        localStorage.setItem('local_expenses', JSON.stringify(local));
      }

      toast.success('Xarajat muvaffaqiyatli saqlandi! ✅');
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      toast.error('Xarajatni saqlashda xatolik: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm("Haqiqatan ham ushbu xarajatni o'chirmoqchisiz?")) return;

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from('expenses').delete().eq('id', id);
        if (error) throw error;
      } else {
        let local = JSON.parse(localStorage.getItem('local_expenses') || '[]');
        local = local.filter(e => e.id !== id);
        localStorage.setItem('local_expenses', JSON.stringify(local));
      }
      toast.success('Xarajat o\'chirildi.');
      onRefresh();
    } catch (err) {
      toast.error('O\'chirishda xatolik: ' + err.message);
    }
  };

  const handleExportExcel = () => {
    if (expenses.length === 0) {
      toast.warning('Eksport qilish uchun xarajatlar mavjud emas!');
      return;
    }

    const exportData = filteredExpenses.map((exp, idx) => ({
      "№": idx + 1,
      "Xarajat Nomi": exp.title || '',
      "Kategoriya": exp.category || '',
      "Summa ($)": exp.amount || 0,
      "Summa (SO'M)": Math.round((exp.amount || 0) * (rates['UZS'] || 12800)),
      "Davriylik": RECURRENCE_TYPES.find(r => r.id === exp.recurrence)?.label || 'Bir martalik',
      "Sana": exp.date || '',
      "Kim kiritgan": exp.created_by || 'Admin',
      "Izoh": exp.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Xarajatlar");
    XLSX.writeFile(wb, `Texno_Bozor_Xarajatlar_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const filteredExpenses = expenses.filter(exp => {
    const matchesStore = currentStore === 'all' || (exp.store_type || 'texno') === currentStore;
    const matchesCategory = selectedCategory === 'all' || exp.category === selectedCategory;
    const matchesRecurrence = selectedRecurrence === 'all' || exp.recurrence === selectedRecurrence;
    const matchesSearch = 
      (exp.title && exp.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (exp.notes && exp.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (exp.created_by && exp.created_by.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStore && matchesCategory && matchesRecurrence && matchesSearch;
  });

  const totalExpenseUsd = filteredExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  const formatPrimary = (val) => formatCurrency(val, currency, rates);
  const formatSecondary = (val) => {
    const sec = currency === 'USD' ? 'UZS' : 'USD';
    return formatCurrency(val, sec, rates);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Xarajatlar Moduli
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Operatsion xarajatlar, arenda, maosh va kommunal to'lovlar hisobi
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" onClick={() => setIsCategoryModalOpen(true)}>
            <Tag size={14} /> + Kategoriya
          </Button>

          <Button variant="secondary" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet size={14} /> Export (Excel)
          </Button>

          <Button variant="primary" onClick={openAddModal}>
            <Plus size={16} /> Yangi Xarajat Qo'shish
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <Card style={{ padding: '16px 20px', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Jami Xarajatlar Summasi</div>
          <div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--danger)', marginTop: '4px' }}>
            {formatPrimary(totalExpenseUsd)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatSecondary(totalExpenseUsd)}</div>
        </Card>

        <Card style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Xarajatlar Soni</div>
          <div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginTop: '4px' }}>
            {filteredExpenses.length} ta
          </div>
        </Card>

        <Card style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Kategoriyalar Turi</div>
          <div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--brand-gold)', marginTop: '4px' }}>
            {categories.length} ta
          </div>
        </Card>
      </div>

      {/* Search & Filter Toolbar */}
      <Card style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Xarajat nomi, izoh yoki kiritgan shaxs bo'yicha qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
          </div>

          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Natija: <strong style={{ color: 'var(--text-primary)' }}>{filteredExpenses.length}</strong> ta xarajat
          </div>
        </div>

        {/* Categories Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '5px 12px',
              borderRadius: 'var(--radius-full)',
              fontSize: '12px',
              fontWeight: '600',
              border: '1px solid var(--card-border)',
              background: selectedCategory === 'all' ? 'var(--brand-accent)' : 'var(--bg-secondary)',
              color: selectedCategory === 'all' ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Barcha Kategoriyalar
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '12px',
                fontWeight: '600',
                border: '1px solid var(--card-border)',
                background: selectedCategory === cat ? 'var(--brand-accent)' : 'var(--bg-secondary)',
                color: selectedCategory === cat ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </Card>

      {/* Enterprise Data Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Xarajat Nomi</th>
              <th>Kategoriya</th>
              <th>Summa</th>
              <th>Davriylik</th>
              <th>Sana</th>
              <th>Kim Kiritgan</th>
              <th>Izoh</th>
              <th style={{ textAlign: 'right' }}>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3].map(i => (
                <tr key={i}><td colSpan="8"><div className="skeleton" style={{ height: '36px' }} /></td></tr>
              ))
            ) : filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <Wallet size={36} style={{ marginBottom: '10px', opacity: 0.5 }} />
                  <div>Xarajatlar topilmadi!</div>
                </td>
              </tr>
            ) : (
              filteredExpenses.map(exp => {
                const recLabel = RECURRENCE_TYPES.find(r => r.id === exp.recurrence)?.label || 'Bir martalik';
                return (
                  <tr key={exp.id}>
                    <td>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{exp.title}</div>
                    </td>
                    <td>
                      <Badge variant="info">{exp.category || 'Umumiy'}</Badge>
                    </td>
                    <td>
                      <div style={{ fontWeight: '700', color: 'var(--danger)' }}>{formatPrimary(exp.amount)}</div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{formatSecondary(exp.amount)}</div>
                    </td>
                    <td>
                      <Badge variant="warning">{recLabel}</Badge>
                    </td>
                    <td>
                      <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{exp.date || '-'}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={11} /> {exp.created_by || 'Admin'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{exp.notes || '-'}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Button variant="danger" iconOnly onClick={() => handleDeleteExpense(exp.id)} title="O'chirish">
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Yangi Xarajat Qo'shish"
        maxWidth="500px"
      >
        <form onSubmit={handleSaveExpense} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Xarajat Nomi *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Masalan: Avgust oyi ijara haqi (Arenda)"
            required
            autoFocus
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Kategoriya</label>
              <select
                className="form-control"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Davriylik</label>
              <select
                className="form-control"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
              >
                {RECURRENCE_TYPES.map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label={`Summasi (${currency}) *`}
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              required
            />

            <Input
              label="Sana *"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <Input
            label="Kim kiritmoqda"
            value={createdBy}
            onChange={(e) => setCreatedBy(e.target.value)}
            placeholder="Admin / Operator"
          />

          <div className="form-group">
            <label className="form-label">Qo'shimcha Izoh</label>
            <textarea
              className="form-control"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Kvitansiya raqami yoki to'lov maqsadi..."
              rows="2"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Bekor qilish</Button>
            <Button variant="primary" type="submit" loading={isSaving}>Saqlash</Button>
          </div>
        </form>
      </Modal>

      {/* Add Custom Category Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Yangi Kategoriya Qo'shish"
        maxWidth="400px"
      >
        <form onSubmit={handleAddCategory} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Kategoriya Nomi *"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Masalan: Kanselyariya, Bonus"
            required
            autoFocus
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button variant="secondary" type="button" onClick={() => setIsCategoryModalOpen(false)}>Bekor qilish</Button>
            <Button variant="primary" type="submit">Qo'shish</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
