import models from '../models/index.js';

const seedCorrespondentBanks = async () => {
  try {
    console.log('Starting correspondent banks seeding...');

    // USD Correspondent Banks
    const usdBanks = await models.CorrespondentBank.bulkCreate([
      {
        bankName: 'Mashreq Bank PSC., NY',
        branchAddress: 'New York, USA',
        accountNumber: null,
        swiftCode: null,
        currencyId: 1, // USD
        maxLimit: 30.00,
        minLimit: 30.00,
        isActive: true,
        createdBy: 1
      },
      {
        bankName: 'ECO Bank, Paris',
        branchAddress: 'Paris, France',
        accountNumber: null,
        swiftCode: null,
        currencyId: 1, // USD
        maxLimit: 2.00,
        minLimit: null,
        isActive: true,
        createdBy: 1
      },
      {
        bankName: 'Bank of Beirut, Beirut',
        branchAddress: 'Beirut, Lebanon',
        accountNumber: null,
        swiftCode: null,
        currencyId: 1, // USD
        maxLimit: 1.00,
        minLimit: null,
        isActive: true,
        createdBy: 1
      },
      {
        bankName: 'Bank of Africa Mer. Rouge, Djibouti',
        branchAddress: 'Djibouti',
        accountNumber: null,
        swiftCode: null,
        currencyId: 1, // USD
        maxLimit: 5.00,
        minLimit: null,
        isActive: true,
        createdBy: 1
      },
      {
        bankName: 'Bank of Beirut, UK, London',
        branchAddress: 'London, UK',
        accountNumber: null,
        swiftCode: null,
        currencyId: 1, // USD
        maxLimit: 20.00,
        minLimit: null,
        isActive: true,
        createdBy: 1
      },
      {
        bankName: 'CAC International Bank, Djibouti',
        branchAddress: 'Djibouti',
        accountNumber: null,
        swiftCode: null,
        currencyId: 1, // USD
        maxLimit: 20.00,
        minLimit: null,
        isActive: true,
        createdBy: 1
      },
      {
        bankName: 'KCB Bank Kenya, Nairobi',
        branchAddress: 'Nairobi, Kenya',
        accountNumber: null,
        swiftCode: null,
        currencyId: 1, // USD
        maxLimit: 10.00,
        minLimit: null,
        isActive: true,
        createdBy: 1
      },
      {
        bankName: 'AKTIF BANK ISTANBUL',
        branchAddress: 'Istanbul, Turkey',
        accountNumber: null,
        swiftCode: null,
        currencyId: 1, // USD
        maxLimit: 1.00,
        minLimit: null,
        isActive: true,
        createdBy: 1
      },
      {
        bankName: 'EXIM BANK (DJIBOUTI) SA-USD',
        branchAddress: 'Djibouti',
        accountNumber: null,
        swiftCode: null,
        currencyId: 1, // USD
        maxLimit: 1.00,
        minLimit: null,
        isActive: true,
        createdBy: 1
      },
      {
        bankName: 'AFRICAN EXPORT-IMPORT BANK',
        branchAddress: 'Cairo, Egypt',
        accountNumber: null,
        swiftCode: null,
        currencyId: 1, // USD
        maxLimit: 10.00,
        minLimit: 10.00,
        isActive: true,
        createdBy: 1
      }
    ], { ignoreDuplicates: true });

    // EUR Correspondent Banks
    const eurBanks = await models.CorrespondentBank.bulkCreate([
      {
        bankName: 'Banca Poplare Di, Sondrio, Italy',
        branchAddress: 'Sondrio, Italy',
        accountNumber: null,
        swiftCode: null,
        currencyId: 2, // EUR
        maxLimit: 35.00,
        minLimit: null,
        isActive: true,
        createdBy: 1
      },
      {
        bankName: 'Bank of Beirut, S.A.L',
        branchAddress: 'Beirut, Lebanon',
        accountNumber: null,
        swiftCode: null,
        currencyId: 2, // EUR
        maxLimit: 3.00,
        minLimit: null,
        isActive: true,
        createdBy: 1
      },
      {
        bankName: 'Bank of Beirut, UK, London',
        branchAddress: 'London, UK',
        accountNumber: null,
        swiftCode: null,
        currencyId: 2, // EUR
        maxLimit: 30.00,
        minLimit: 30.00,
        isActive: true,
        createdBy: 1
      },
      {
        bankName: 'Bank of Beruit - Frankfurt',
        branchAddress: 'Frankfurt, Germany',
        accountNumber: null,
        swiftCode: null,
        currencyId: 2, // EUR
        maxLimit: 0.00,
        minLimit: 0.00,
        isActive: true,
        createdBy: 1
      },
      {
        bankName: 'ECO Bank, Paris',
        branchAddress: 'Paris, France',
        accountNumber: null,
        swiftCode: null,
        currencyId: 2, // EUR
        maxLimit: 2.00,
        minLimit: null,
        isActive: true,
        createdBy: 1
      },
      {
        bankName: 'ODDO - BHF, Frankfurt',
        branchAddress: 'Frankfurt, Germany',
        accountNumber: null,
        swiftCode: null,
        currencyId: 2, // EUR
        maxLimit: 30.00,
        minLimit: null,
        isActive: true,
        createdBy: 1
      }
    ], { ignoreDuplicates: true });

    // GBP Correspondent Banks
    const gbpBanks = await models.CorrespondentBank.bulkCreate([
      {
        bankName: 'Bank of Beirut, UK, London',
        branchAddress: 'London, UK',
        accountNumber: null,
        swiftCode: null,
        currencyId: 3, // GBP
        maxLimit: 50.00,
        minLimit: 50.00,
        isActive: true,
        createdBy: 1
      },
      {
        bankName: 'ECO Bank, Paris',
        branchAddress: 'Paris, France',
        accountNumber: null,
        swiftCode: null,
        currencyId: 3, // GBP
        maxLimit: 50.00,
        minLimit: null,
        isActive: true,
        createdBy: 1
      }
    ], { ignoreDuplicates: true });

    console.log('Correspondent banks seeding completed successfully!');
    console.log(`Created: ${usdBanks.length} USD banks, ${eurBanks.length} EUR banks, ${gbpBanks.length} GBP banks`);

  } catch (error) {
    console.error('Correspondent banks seeding failed:', error);
    throw error;
  }
};

export default seedCorrespondentBanks;