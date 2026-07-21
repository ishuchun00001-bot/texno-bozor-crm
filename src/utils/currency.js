export const DEFAULT_RATES = {
  USD: 1,
  UZS: 12800,
  RUB: 88,
  EUR: 0.92
};

/**
 * ExchangeRate-API orqali USD ga nisbatan kurslarni yuklash
 */
export const fetchExchangeRates = async () => {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!response.ok) throw new Error('Kurslarni yuklab bo\'lmadi');
    const data = await response.json();
    if (data && data.result === 'success' && data.rates) {
      return {
        USD: 1,
        UZS: parseFloat(data.rates.UZS) || DEFAULT_RATES.UZS,
        RUB: parseFloat(data.rates.RUB) || DEFAULT_RATES.RUB,
        EUR: parseFloat(data.rates.EUR) || DEFAULT_RATES.EUR,
      };
    }
    throw new Error('API xato qaytardi');
  } catch (error) {
    console.error('Kurslarni olishda xatolik:', error);
    throw error;
  }
};

/**
 * Qiymatni tanlangan valyutaga ko'paytirib formatlash
 */
export const formatCurrency = (val, curr, rates = DEFAULT_RATES) => {
  const rate = rates[curr] || 1;
  const converted = val * rate;

  switch (curr) {
    case 'USD':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      }).format(converted);
    case 'EUR':
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0
      }).format(converted);
    case 'RUB':
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: 0
      }).format(converted);
    case 'UZS':
    default:
      return new Intl.NumberFormat('uz-UZ', {
        style: 'decimal',
        maximumFractionDigits: 0
      }).format(converted) + ' SO\'M';
  }
};

/**
 * Valyuta uchun 1 birlikning UZS dagi qiymatini qaytaradi
 */
export const getRateInUZS = (currKey, rates = DEFAULT_RATES) => {
  if (currKey === 'USD') return rates.UZS;
  if (currKey === 'UZS') return 1;
  // EUR to UZS: rates.UZS / rates.EUR
  const rateToUSD = rates[currKey] || 1;
  return Math.round(rates.UZS / rateToUSD);
};
