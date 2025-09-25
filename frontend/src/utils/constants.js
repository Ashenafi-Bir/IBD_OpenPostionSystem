export const CURRENCIES = {
  USD: { code: 'USD', name: 'US Dollar', symbol: '$' },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€' },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£' },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  CHF: { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  SEK: { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' }
};

export const BALANCE_CATEGORIES = {
  asset: { label: 'Assets', color: '#10b981' },
  liability: { label: 'Liabilities', color: '#ef4444' },
  memo_asset: { label: 'Memo Assets', color: '#8b5cf6' },
  memo_liability: { label: 'Memo Liabilities', color: '#f59e0b' }
};

export const USER_ROLES = {
  admin: { label: 'Administrator', level: 3 },
  authorizer: { label: 'Authorizer', level: 2 },
  maker: { label: 'Maker', level: 1 }
};

export const TRANSACTION_TYPES = {
  purchase: { label: 'Purchase', color: 'success' },
  sale: { label: 'Sale', color: 'danger' }
};

export const STATUS_COLORS = {
  draft: 'gray',
  submitted: 'blue',
  authorized: 'green',
  rejected: 'red'
};