import bcrypt from 'bcryptjs';

export const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

export const formatCurrency = (amount, currencyCode = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 5
  }).format(amount);
};

export const formatDate = (date) => {
  return new Date(date).toISOString().split('T')[0];
};

export const calculatePercentage = (part, total) => {
  if (total === 0) return 0;
  return (part / total) * 100;
};

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};