// TEXNO BOZOR ERP V2 — ENTERPRISE CONSTANTS

export const STORE_TYPES = {
  ALL: 'all',
  TEXNO: 'texno',
  MOTO: 'moto'
};

export const PAYMENT_COMMISSION_RATES = {
  CARD: 0.02, // 2% Bank commission
  NASIYA: 0.05 // 5% Nasiya service fee
};

export function getCommissionRates() {
  const saved = localStorage.getItem('commission_settings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        cardRate: parseFloat(parsed.cardRate) || 0.02,
        nasiyaRate: parseFloat(parsed.nasiyaRate) || 0.05
      };
    } catch (e) {
      console.error(e);
    }
  }
  return { cardRate: 0.02, nasiyaRate: 0.05 };
}

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Arenda',
  'Elektr',
  'Suv',
  'Gaz',
  'Internet',
  'Soliq',
  'Ish haqi',
  'Reklama',
  'Transport',
  'Ta\'mirlash',
  'Ofis',
  'Boshqa'
];

export const EXPENSE_STATUSES = [
  { id: 'paid', label: 'To\'langan', color: 'var(--success)' },
  { id: 'pending', label: 'Kutilmoqda', color: 'var(--warning)' },
  { id: 'cancelled', label: 'Bekor qilingan', color: 'var(--danger)' }
];

export const RECURRENCE_TYPES = [
  { id: 'once', label: 'Bir martalik' },
  { id: 'daily', label: 'Kunlik' },
  { id: 'weekly', label: 'Haftalik' },
  { id: 'monthly', label: 'Oylik' },
  { id: 'yearly', label: 'Yillik' }
];

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Naqd', color: 'var(--success)' },
  { id: 'card', label: 'Karta (2% bank)', color: 'var(--brand-accent)' },
  { id: 'nasiya', label: 'Nasiya (5% xizmat)', color: 'var(--warning)' },
  { id: 'kredit', label: 'Kredit', color: 'var(--brand-gold)' },
  { id: 'uzum', label: 'Uzum', color: '#7c3aed' },
  { id: 'alif', label: 'Alif', color: '#2563eb' },
  { id: 'mixed', label: '🔀 Aralash', color: '#ec4899' }
];

/**
 * Formats Uzbek phone numbers to +998 XX XXX-XX-XX
 */
export const formatUzbekPhone = (raw) => {
  if (!raw) return '+998 ';
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('998')) {
    digits = digits.slice(3);
  }
  digits = digits.slice(0, 9);

  let formatted = '+998 ';
  if (digits.length > 0) formatted += digits.slice(0, 2);
  if (digits.length > 2) formatted += ' ' + digits.slice(2, 5);
  if (digits.length > 5) formatted += '-' + digits.slice(5, 7);
  if (digits.length > 7) formatted += '-' + digits.slice(7, 9);

  return formatted;
};

/**
 * Formats prices with space thousand separators (e.g. 1 500 000)
 */
export const formatThousand = (val) => {
  if (val === null || val === undefined || val === '' || val === 0) return '';
  const digits = String(val).replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('ru-RU');
};

/**
 * Parses formatted prices back to numeric integer
 */
export const parseThousand = (val) => {
  if (val === null || val === undefined || val === '') return '';
  const digits = String(val).replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : '';
};
