import models from '../models/index.js';
import { hashPassword } from '../utils/helpers.js';
import seedCorrespondentBanks from './seedCorrespondentBanks.js';

const seedData = async () => {
  try {
    console.log('Starting database seeding...');
      // ADD THIS LINE 👇👇👇
    const now = new Date();

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
       // A.1 On-balance Sheet Items
      {
        code: "CURRENCY_ON_HAND",
        name: "Currency on hand",
        category: "asset",
        balanceType: "on_balance_sheet",
        displayOrder: 1,
        createdAt: now,
        updatedAt: now
      },
      {
        code: "DUE_FROM_BANKS",
        name: "Due from banks",
        category: "asset",
        balanceType: "on_balance_sheet",
        displayOrder: 2,
        createdAt: now,
        updatedAt: now
      },
      {
        code: "CHEQUES_IN_TRANSIT",
        name: "Cheques and items in transit",
        category: "asset",
        balanceType: "on_balance_sheet",
        displayOrder: 3,
        createdAt: now,
        updatedAt: now
      },
      {
        code: "LOANS_ADVANCES",
        name: "Loans & advances",
        category: "asset",
        balanceType: "on_balance_sheet",
        displayOrder: 4,
        createdAt: now,
        updatedAt: now
      },
      {
        code: "ACCRUED_INTEREST_RECEIVABLE",
        name: "Accrued interest receivable",
        category: "asset",
        balanceType: "on_balance_sheet",
        displayOrder: 5,
        createdAt: now,
        updatedAt: now
      },
      {
        code: "OTHER_ASSETS_ON",
        name: "Other assets",
        category: "asset",
        balanceType: "on_balance_sheet",
        displayOrder: 6,
        createdAt: now,
        updatedAt: now
      },

      // A.2 Off-balance Sheet Items
      {
        code: "UNDELIVERED_SPOT_PURCHASE",
        name: "Undelivered spot purchase",
        category: "asset",
        balanceType: "off_balance_sheet",
        displayOrder: 7,
        createdAt: now,
        updatedAt: now
      },
      {
        code: "FORWARD_PURCHASE",
        name: "Forward purchase",
        category: "asset",
        balanceType: "off_balance_sheet",
        displayOrder: 8,
        createdAt: now,
        updatedAt: now
      },
      {
        code: "OPTION_SWAPS_DERIVATIVES_ASSET",
        name: "Option, Swaps, Derivatives",
        category: "asset",
        balanceType: "off_balance_sheet",
        displayOrder: 9,
        createdAt: now,
        updatedAt: now
      },
      {
        code: "OTHER_ASSETS_OFF",
        name: "Other assets (Off-balance sheet)",
        category: "asset",
        balanceType: "off_balance_sheet",
        displayOrder: 10,
        createdAt: now,
        updatedAt: now
      },

      //
      // ============================
      // B – LIABILITIES
      // ============================
      //

      // B.1 On-balance Sheet Items
      {
        code: "DUE_TO_BANKS_ABROAD",
        name: "Due to banks abroad",
        category: "liability",
        balanceType: "on_balance_sheet",
        displayOrder: 11,
        createdAt: now,
        updatedAt: now
      },
      {
        code: "FOREIGN_CURRENCY_DEPOSITS",
        name: "Foreign currency deposits",
        category: "liability",
        balanceType: "on_balance_sheet",
        displayOrder: 12,
        createdAt: now,
        updatedAt: now
      },
      {
        code: "BORROWINGS",
        name: "Borrowings",
        category: "liability",
        balanceType: "on_balance_sheet",
        displayOrder: 13,
        createdAt: now,
        updatedAt: now
      },
      {
        code: "ACCRUED_INTEREST_PAYABLE",
        name: "Accrued interest payable",
        category: "liability",
        balanceType: "on_balance_sheet",
        displayOrder: 14,
        createdAt: now,
        updatedAt: now
      },
      {
        code: "OTHER_LIABILITIES_ON",
        name: "Other liabilities",
        category: "liability",
        balanceType: "on_balance_sheet",
        displayOrder: 15,
        createdAt: now,
        updatedAt: now
      },

      // B.2 Off-balance Sheet Items
      {
        code: "UNDELIVERED_SPOT_SALES",
        name: "Undelivered spot sales",
        category: "liability",
        balanceType: "off_balance_sheet",
        displayOrder: 16,
        createdAt: now,
        updatedAt: now
      },
      {
        code: "FORWARD_SALES",
        name: "Forward sales",
        category: "liability",
        balanceType: "off_balance_sheet",
        displayOrder: 17,
        createdAt: now,
        updatedAt: now
      },
      {
        code: "OPTION_SWAPS_DERIVATIVES_LIABILITY",
        name: "Option, Swaps, Derivatives",
        category: "liability",
        balanceType: "off_balance_sheet",
        displayOrder: 18,
        createdAt: now,
        updatedAt: now
      },
      {
        code: "LETTER_OF_CREDIT",
        name: "Letter of credit",
        category: "liability",
        balanceType: "off_balance_sheet",
        displayOrder: 19,
        createdAt: now,
        updatedAt: now
      },
      {
        code: "GUARANTEES",
        name: "Guarantees",
        category: "liability",
        balanceType: "off_balance_sheet",
        displayOrder: 20,
        createdAt: now,
        updatedAt: now
      },
      {
        code: "OTHER_LIABILITIES_OFF",
        name: "Other liabilities (Off-balance sheet)",
        category: "liability",
        balanceType: "off_balance_sheet",
        displayOrder: 21,
        createdAt: now,
        updatedAt: now
      }
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
        capitalAmount: 6080000000.00,
        effectiveDate: today,
        currency: 'ETB',
        notes: 'Initial capital',
        created_by: 1,
        isActive: true
      }
    ], { ignoreDuplicates: true });

    // Seed correspondent banks
    await seedCorrespondentBanks();

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Database seeding failed:', error);
  }
};

export default seedData;