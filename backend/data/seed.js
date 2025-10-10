import models from '../models/index.js';
import { hashPassword } from '../utils/helpers.js';

const seedData = async () => {
  try {
    console.log('Starting database seeding...');

    // Create currencies
    const currencies = await models.Currency.bulkCreate([
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
      { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' }
    ], { ignoreDuplicates: true });

    // Create balance items
    const balanceItems = await models.BalanceItem.bulkCreate([
      // Assets
      { code: 'CASH_ON_HAND', name: 'F/Cy Cash on hand', category: 'asset', displayOrder: 1 },
      { code: 'CASH_IN_TRANSIT', name: 'F/Cy Cash in transit (NBE)', category: 'asset', displayOrder: 2 },
      { code: 'SHORT_TIME_DEPOSIT', name: 'Short Time Deposit', category: 'asset', displayOrder: 3 },
      { code: 'CORR_BANK_BALANCE', name: 'F/Cy Correspondent Bank Balance', category: 'asset', displayOrder: 4 },
      { code: 'ODBP', name: 'ODBP', category: 'asset', displayOrder: 5 },
      { code: 'UNCLEARED_EFFECTS', name: 'Uncleared effects - international money transfer', category: 'asset', displayOrder: 6 },
      
      // Liabilities
      { code: 'DIASPORA_AC', name: 'DIASPORA A/C', category: 'liability', displayOrder: 1 },
      { code: 'FCY_SAVING_AC', name: 'FCY SAVING A/C', category: 'liability', displayOrder: 2 },
      { code: 'NR_FCY_AC', name: 'NR-FCY A/C', category: 'liability', displayOrder: 3 },
      { code: 'RETENTION_AC_A', name: 'RETENTION A/C\'\' A\'\'', category: 'liability', displayOrder: 4 },
      { code: 'RETENTION_AC_B', name: 'RETENTION A/C\'\' B\'\'', category: 'liability', displayOrder: 5 },
      
      // Memorandum Items
      { code: 'ACTIVE_LC', name: 'Active Letter of Credit (L/C)', category: 'memo_liability', displayOrder: 1 },
      { code: 'INACTIVE_LC', name: 'Inactive Letter of Credit (L/C)', category: 'memo_liability', displayOrder: 2 },
      { code: 'IBC_100', name: 'IBC (100% Collected)', category: 'memo_asset', displayOrder: 3 },
      { code: 'EPSE', name: 'EPSE', category: 'memo_asset', displayOrder: 4 },
      { code: 'IBC_OUTSTANDING', name: 'IBC Outstanding (with less than 100% deposit)', category: 'memo_liability', displayOrder: 5 },
      { code: 'OUTSTANDING_PO', name: 'Outstanding purchase order (PO)', category: 'memo_liability', displayOrder: 6 },
      { code: 'SUPPLIER_CREDIT_PO', name: 'Supplier Credit PO', category: 'memo_liability', displayOrder: 7 },
      { code: 'SUPPLIER_CREDIT_LC', name: 'Supplier Credit LC', category: 'memo_liability', displayOrder: 8 }
    ], { ignoreDuplicates: true });

    // Create users
    const hashedPassword = await hashPassword('admin123');
    const users = await models.User.bulkCreate([
      {
        username: 'admin',
        email: 'admin@bank.com',
        password: hashedPassword,
        role: 'admin',
        fullName: 'System Administrator'
      },
      {
        username: 'authorizer1',
        email: 'authorizer1@bank.com',
        password: hashedPassword,
        role: 'authorizer',
        fullName: 'Authorizer One'
      },
      {
        username: 'maker1',
        email: 'maker1@bank.com',
        password: hashedPassword,
        role: 'maker',
        fullName: 'Maker One'
      }
    ], { ignoreDuplicates: true });

    // Create sample exchange rates
    const today = new Date().toISOString().split('T')[0];
    const exchangeRates = await models.ExchangeRate.bulkCreate([
      {
        currency_id: 1, // USD
        rateDate: today,
        buyingRate: 100,
        sellingRate: 100,
        midRate: 100,
        created_by: 1
      },
      {
        currency_id: 2, // EUR
        rateDate: today,
        buyingRate: 100,
        sellingRate: 110,
        midRate: 105,
        created_by: 1
      },
      {
        currency_id: 3, // GBP
        rateDate: today,
        buyingRate: 100,
        sellingRate: 120,
        midRate: 110,
        created_by: 1
      }
    ], { ignoreDuplicates: true });

    // Create sample paid-up capital
    const paidUpCapital = await models.PaidUpCapital.bulkCreate([
      {
        capitalAmount: 4200000000.00,
        effectiveDate: today,
        currency: 'ETB',
        notes: 'Initial capital',
        created_by: 1,
        isActive: true
      }
    ], { ignoreDuplicates: true });

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Database seeding failed:', error);
  }
};

export default seedData;