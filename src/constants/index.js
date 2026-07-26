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

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Naqd', color: 'var(--success)' },
  { id: 'card', label: 'Karta (2% bank)', color: 'var(--brand-accent)' },
  { id: 'nasiya', label: 'Nasiya (5% xizmat)', color: 'var(--warning)' },
  { id: 'kredit', label: 'Kredit', color: 'var(--brand-gold)' },
  { id: 'uzum', label: 'Uzum', color: '#7c3aed' },
  { id: 'alif', label: 'Alif', color: '#2563eb' },
  { id: 'mixed', label: '🔀 Aralash', color: '#ec4899' }
];
