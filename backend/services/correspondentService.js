import models from '../models/index.js';
import { Op } from 'sequelize';

export class CorrespondentService {
  
  static async createBank(bankData, userId) {
  let transaction;
  
  try {
    transaction = await models.sequelize.transaction();
    
    // Validate currency exists
    const currency = await models.Currency.findByPk(bankData.currencyId, { transaction });
    if (!currency) {
      throw new Error('Invalid currency ID');
    }

    // Check if bank with same name, currency, and account number already exists
    const existingBank = await models.sequelize.query(
      `SELECT id FROM correspondent_banks 
       WHERE bankName = ? AND currencyId = ? AND accountNumber = ? AND isActive = true`,
      {
        replacements: [bankData.bankName, bankData.currencyId, bankData.accountNumber || ''],
        type: models.sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    if (existingBank.length > 0) {
      throw new Error('A bank with the same name, currency, and account number already exists.');
    }

    console.log('Creating bank with data:', bankData);
    
    // Use raw query to avoid Sequelize naming issues
    const fields = [];
    const placeholders = [];
    const values = [];
    
    // Define all possible fields
    const fieldMappings = {
      bankName: 'bankName',
      branchAddress: 'branchAddress',
      accountNumber: 'accountNumber',
      swiftCode: 'swiftCode',
      currencyId: 'currencyId',
      maxLimit: 'maxLimit',
      minLimit: 'minLimit',
      isActive: 'isActive',
      createdBy: 'createdBy',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    };
    
    Object.keys(fieldMappings).forEach(key => {
      if (bankData[key] !== undefined && bankData[key] !== null && bankData[key] !== '') {
        fields.push(fieldMappings[key]);
        placeholders.push('?');
        values.push(bankData[key]);
      }
    });
    
    // Add default values for required fields that might be missing
    if (!fields.includes('isActive')) {
      fields.push('isActive');
      placeholders.push('?');
      values.push(true);
    }
    
    if (!fields.includes('createdBy')) {
      fields.push('createdBy');
      placeholders.push('?');
      values.push(userId);
    }
    
    const now = new Date();
    if (!fields.includes('createdAt')) {
      fields.push('createdAt');
      placeholders.push('?');
      values.push(now);
    }
    
    if (!fields.includes('updatedAt')) {
      fields.push('updatedAt');
      placeholders.push('?');
      values.push(now);
    }
    
    // Execute the insert
    const result = await models.sequelize.query(
      `INSERT INTO correspondent_banks (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`,
      {
        replacements: values,
        type: models.sequelize.QueryTypes.INSERT,
        transaction
      }
    );

    const bankId = result[0];

    await transaction.commit();

    // Return the created bank with currency info
    const createdBanks = await models.sequelize.query(
      `SELECT 
        cb.id, cb.bankName, cb.branchAddress, cb.accountNumber, cb.swiftCode,
        cb.currencyId, cb.maxLimit, cb.minLimit, cb.isActive, cb.createdBy,
        cb.createdAt, cb.updatedAt,
        c.id as 'currency.id', c.code as 'currency.code', c.name as 'currency.name', c.symbol as 'currency.symbol'
      FROM correspondent_banks cb
      LEFT JOIN currencies c ON cb.currencyId = c.id
      WHERE cb.id = ?`,
      {
        replacements: [bankId],
        type: models.sequelize.QueryTypes.SELECT
      }
    );

    if (createdBanks.length === 0) {
      throw new Error('Bank not found after creation');
    }

    const createdBank = createdBanks[0];
    const resultBank = {
      id: createdBank.id,
      bankName: createdBank.bankName,
      branchAddress: createdBank.branchAddress,
      accountNumber: createdBank.accountNumber,
      swiftCode: createdBank.swiftCode,
      currencyId: createdBank.currencyId,
      maxLimit: createdBank.maxLimit,
      minLimit: createdBank.minLimit,
      isActive: createdBank.isActive,
      createdBy: createdBank.createdBy,
      createdAt: createdBank.createdAt,
      updatedAt: createdBank.updatedAt,
      currency: {
        id: createdBank['currency.id'],
        code: createdBank['currency.code'],
        name: createdBank['currency.name'],
        symbol: createdBank['currency.symbol']
      }
    };

    return resultBank;
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Database error in createBank:', error);
    
    // Handle specific error cases
    if (error.message.includes('already exists')) {
      throw new Error(error.message);
    } else if (error.message.includes('Duplicate entry')) {
      throw new Error('A bank with the same name, currency, and account number already exists.');
    } else if (error.message.includes('foreign key constraint')) {
      throw new Error('Invalid currency selected.');
    }
    
    throw new Error(`Failed to create bank: ${error.message}`);
  }
}
// Updated updateBank method using raw queries to avoid Sequelize naming issues
static async updateBank(bankId, bankData, userId) {
  let transaction;
  
  try {
    transaction = await models.sequelize.transaction();
    
    // First, verify the bank exists using a simple query
    const existingBank = await models.sequelize.query(
      'SELECT id FROM correspondent_banks WHERE id = ? AND isActive = true',
      {
        replacements: [bankId],
        type: models.sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    if (existingBank.length === 0) {
      throw new Error('Bank not found');
    }

    // Validate currency if being updated
    if (bankData.currencyId) {
      const currency = await models.Currency.findByPk(bankData.currencyId, { transaction });
      if (!currency) {
        throw new Error('Invalid currency ID');
      }
    }

    console.log('Updating bank with data:', bankData);
    
    // Build the update query dynamically
    const updateFields = [];
    const updateValues = [];
    
    Object.keys(bankData).forEach(key => {
      if (bankData[key] !== undefined && key !== 'id') {
        updateFields.push(`${key} = ?`);
        updateValues.push(bankData[key]);
      }
    });
    
    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }
    
    updateValues.push(bankId);
    
    // Execute raw update query
    await models.sequelize.query(
      `UPDATE correspondent_banks SET ${updateFields.join(', ')} WHERE id = ?`,
      {
        replacements: updateValues,
        type: models.sequelize.QueryTypes.UPDATE,
        transaction
      }
    );

    await transaction.commit();

    // Return updated bank using a raw query to avoid association issues
    const updatedBanks = await models.sequelize.query(
      `SELECT 
        cb.id, cb.bankName, cb.branchAddress, cb.accountNumber, cb.swiftCode,
        cb.currencyId, cb.maxLimit, cb.minLimit, cb.isActive, cb.createdBy,
        cb.createdAt, cb.updatedAt,
        c.id as 'currency.id', c.code as 'currency.code', c.name as 'currency.name', c.symbol as 'currency.symbol'
      FROM correspondent_banks cb
      LEFT JOIN currencies c ON cb.currencyId = c.id
      WHERE cb.id = ?`,
      {
        replacements: [bankId],
        type: models.sequelize.QueryTypes.SELECT
      }
    );

    if (updatedBanks.length === 0) {
      throw new Error('Bank not found after update');
    }

    // Transform the raw result to match the expected format
    const updatedBank = updatedBanks[0];
    const result = {
      id: updatedBank.id,
      bankName: updatedBank.bankName,
      branchAddress: updatedBank.branchAddress,
      accountNumber: updatedBank.accountNumber,
      swiftCode: updatedBank.swiftCode,
      currencyId: updatedBank.currencyId,
      maxLimit: updatedBank.maxLimit,
      minLimit: updatedBank.minLimit,
      isActive: updatedBank.isActive,
      createdBy: updatedBank.createdBy,
      createdAt: updatedBank.createdAt,
      updatedAt: updatedBank.updatedAt,
      currency: {
        id: updatedBank['currency.id'],
        code: updatedBank['currency.code'],
        name: updatedBank['currency.name'],
        symbol: updatedBank['currency.symbol']
      }
    };

    return result;
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Database error in updateBank:', error);
    console.error('Error details:', {
      bankId,
      bankData,
      errorMessage: error.message,
      errorStack: error.stack
    });
    throw new Error(`Failed to update bank: ${error.message}`);
  }
}

// Also update updateBankLimits to use the same approach
static async updateBankLimits(bankId, limits, userId) {
  let transaction;
  
  try {
    transaction = await models.sequelize.transaction();
    
    // Verify bank exists
    const existingBank = await models.sequelize.query(
      'SELECT id FROM correspondent_banks WHERE id = ? AND isActive = true',
      {
        replacements: [bankId],
        type: models.sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    if (existingBank.length === 0) {
      throw new Error('Bank not found');
    }

    // Build update fields
    const updateFields = [];
    const updateValues = [];
    
    if (limits.maxLimit !== undefined) {
      updateFields.push('maxLimit = ?');
      updateValues.push(limits.maxLimit);
    }
    if (limits.minLimit !== undefined) {
      updateFields.push('minLimit = ?');
      updateValues.push(limits.minLimit);
    }
    
    if (updateFields.length === 0) {
      throw new Error('No limit fields to update');
    }
    
    updateValues.push(bankId);
    
    // Execute raw update
    await models.sequelize.query(
      `UPDATE correspondent_banks SET ${updateFields.join(', ')} WHERE id = ?`,
      {
        replacements: updateValues,
        type: models.sequelize.QueryTypes.UPDATE,
        transaction
      }
    );

    await transaction.commit();

    // Return updated bank
    const updatedBanks = await models.sequelize.query(
      `SELECT 
        cb.id, cb.bankName, cb.branchAddress, cb.accountNumber, cb.swiftCode,
        cb.currencyId, cb.maxLimit, cb.minLimit, cb.isActive, cb.createdBy,
        cb.createdAt, cb.updatedAt,
        c.id as 'currency.id', c.code as 'currency.code', c.name as 'currency.name', c.symbol as 'currency.symbol'
      FROM correspondent_banks cb
      LEFT JOIN currencies c ON cb.currencyId = c.id
      WHERE cb.id = ?`,
      {
        replacements: [bankId],
        type: models.sequelize.QueryTypes.SELECT
      }
    );

    if (updatedBanks.length === 0) {
      throw new Error('Bank not found after update');
    }

    const updatedBank = updatedBanks[0];
    const result = {
      id: updatedBank.id,
      bankName: updatedBank.bankName,
      branchAddress: updatedBank.branchAddress,
      accountNumber: updatedBank.accountNumber,
      swiftCode: updatedBank.swiftCode,
      currencyId: updatedBank.currencyId,
      maxLimit: updatedBank.maxLimit,
      minLimit: updatedBank.minLimit,
      isActive: updatedBank.isActive,
      createdBy: updatedBank.createdBy,
      createdAt: updatedBank.createdAt,
      updatedAt: updatedBank.updatedAt,
      currency: {
        id: updatedBank['currency.id'],
        code: updatedBank['currency.code'],
        name: updatedBank['currency.name'],
        symbol: updatedBank['currency.symbol']
      }
    };

    return result;
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Database error in updateBankLimits:', error);
    throw new Error(`Failed to update bank limits: ${error.message}`);
  }
}

  // Updated deleteBank method with simpler approach
  static async deleteBank(bankId, userId) {
    let transaction;
    
    try {
      transaction = await models.sequelize.transaction();
      
      const bank = await models.CorrespondentBank.findByPk(bankId, { transaction });
      if (!bank) {
        throw new Error('Bank not found');
      }

      // Check if bank has any balances
      const balances = await models.CorrespondentBalance.count({
        where: { bankId },
        transaction
      });

      if (balances > 0) {
        throw new Error('Cannot delete bank with existing balances. Please remove balances first.');
      }

      // Use direct destroy instead of update for better performance
      await bank.destroy({ transaction });
      await transaction.commit();
      
      return true;
    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error('Database error in deleteBank:', error);
      console.error('Error details:', {
        bankId,
        errorMessage: error.message,
        errorStack: error.stack
      });
      throw new Error(`Failed to delete bank: ${error.message}`);
    }
  }

  // Alternative delete method using raw query if above doesn't work
  static async deleteBankAlternative(bankId, userId) {
    try {
      // Use raw query to avoid Sequelize naming issues
      const result = await models.sequelize.query(
        'DELETE FROM correspondent_banks WHERE id = ?',
        {
          replacements: [bankId],
          type: models.sequelize.QueryTypes.DELETE
        }
      );
      
      return true;
    } catch (error) {
      console.error('Database error in deleteBankAlternative:', error);
      throw new Error(`Failed to delete bank: ${error.message}`);
    }
  }

  static async addDailyBalance(balanceData, userId) {
    const transaction = await models.sequelize.transaction();
    
    try {
      const { bankId, balanceDate, balanceAmount, notes } = balanceData;

      const existingBalance = await models.CorrespondentBalance.findOne({
        where: { bankId, balanceDate },
        transaction
      });

      let balance;
      if (existingBalance) {
        balance = await existingBalance.update({
          balanceAmount,
          notes,
          createdBy: userId
        }, { transaction });
      } else {
        balance = await models.CorrespondentBalance.create({
          bankId,
          balanceDate,
          balanceAmount,
          notes,
          createdBy: userId
        }, { transaction });
      }

      // Check limits for reporting purposes only (no restriction on entry)
      await this.checkAndCreateAlerts(bankId, balanceDate, transaction);
      
      await transaction.commit();

      return await models.CorrespondentBalance.findByPk(balance.id, {
        include: [{
          model: models.CorrespondentBank,
          as: 'bank',
          attributes: [
            'id', 'bankName', 'branchAddress', 'accountNumber', 
            'swiftCode', 'currencyId', 'maxLimit', 'minLimit'
          ],
          include: [{
            model: models.Currency,
            as: 'currency',
            attributes: ['id', 'code', 'name', 'symbol']
          }]
        }]
      });
    } catch (error) {
      await transaction.rollback();
      throw new Error(`Failed to add daily balance: ${error.message}`);
    }
  }

  // This method only creates alerts for reporting, doesn't restrict entry
  static async checkAndCreateAlerts(bankId, balanceDate, transaction) {
    try {
      const bank = await models.CorrespondentBank.findByPk(bankId, {
        attributes: [
          'id', 'bankName', 'currencyId', 'maxLimit', 'minLimit'
        ],
        include: [
          {
            model: models.Currency,
            as: 'currency',
            attributes: ['id', 'code', 'name', 'symbol']
          },
          {
            model: models.CorrespondentBalance,
            as: 'balances',
            where: { balanceDate },
            required: false
          }
        ],
        transaction
      });

      if (!bank || !bank.balances || bank.balances.length === 0) {
        return;
      }

      const currencyBanks = await models.CorrespondentBank.findAll({
        where: { 
          currencyId: bank.currencyId,
          isActive: true 
        },
        attributes: ['id', 'currencyId', 'maxLimit', 'minLimit'],
        include: [
          {
            model: models.Currency,
            as: 'currency',
            attributes: ['id', 'code', 'name', 'symbol']
          },
          {
            model: models.CorrespondentBalance,
            as: 'balances',
            where: { balanceDate },
            required: false
          }
        ],
        transaction
      });

      const totalBalance = currencyBanks.reduce((sum, currBank) => {
        const balance = currBank.balances?.[0]?.balanceAmount;
        return sum + (balance ? parseFloat(balance) : 0);
      }, 0);

      if (totalBalance === 0) return;

      const currentBalance = parseFloat(bank.balances[0].balanceAmount);
      const currentPercentage = (currentBalance / totalBalance) * 100;

      const violations = bank.checkLimits(currentPercentage);

      for (const violation of violations) {
        const existingAlert = await models.CorrespondentAlert.findOne({
          where: {
            bankId,
            alertDate: balanceDate,
            alertType: violation.type,
            isResolved: false
          },
          transaction
        });

        if (!existingAlert) {
          await models.CorrespondentAlert.create({
            bankId,
            alertType: violation.type,
            currentPercentage,
            limitPercentage: violation.limit,
            variation: violation.variation,
            alertDate: balanceDate
          }, { transaction });
        }
      }
    } catch (error) {
      // Don't throw error here - we don't want to prevent balance entry
      console.error('Error checking limits for reporting:', error.message);
    }
  }

  static async generateLimitsReport(date) {
    try {
      console.log('Starting enhanced limits report for date:', date);
      
      // Get all active banks with their balances for the date
      const banks = await models.sequelize.query(`
        SELECT 
          cb.id,
          cb.bankName,
          cb.accountNumber,
          cb.swiftCode,
          cb.maxLimit,
          cb.minLimit,
          cb.currencyId,
          c.code as currencyCode,
          c.name as currencyName,
          c.symbol as currencySymbol,
          bal.balanceAmount,
          bal.balanceDate
        FROM correspondent_banks cb
        LEFT JOIN currencies c ON cb.currencyId = c.id
        LEFT JOIN correspondent_balances bal ON cb.id = bal.bankId AND bal.balanceDate = ?
        WHERE cb.isActive = true
        ORDER BY c.code ASC, cb.bankName ASC
      `, {
        replacements: [date],
        type: models.sequelize.QueryTypes.SELECT
      });

      console.log(`Found ${banks.length} banks for report`);

      const currencies = {};
      const report = {
        date,
        currencies: {},
        alerts: [],
        summary: {
          totalBalance: 0,
          totalPercentage: 100,
          totalMaxLimit: 100
        }
      };

      // First pass: Calculate total balances per currency
      banks.forEach(bank => {
        const currencyCode = bank.currencyCode || 'USD'; // Default to USD if null
        const balance = bank.balanceAmount ? parseFloat(bank.balanceAmount) : 0;
        
        if (!currencies[currencyCode]) {
          currencies[currencyCode] = {
            totalBalance: 0,
            banks: []
          };
        }
        currencies[currencyCode].totalBalance += balance;
      });

      // Second pass: Calculate percentages and check limits
      for (const [currencyCode, currencyData] of Object.entries(currencies)) {
        const currencyBanks = banks.filter(bank => (bank.currencyCode || 'USD') === currencyCode);
        
        report.currencies[currencyCode] = {
          totalBalance: currencyData.totalBalance,
          banks: []
        };

        currencyBanks.forEach(bank => {
          const balance = bank.balanceAmount ? parseFloat(bank.balanceAmount) : 0;
          const percentage = currencyData.totalBalance > 0 ? 
            (balance / currencyData.totalBalance) * 100 : 0;

          let status = 'normal';
          let limitType = '';
          let variation = 0;
          let limitPercentage = null;

          // Check against limits
          if (bank.maxLimit !== null && percentage > parseFloat(bank.maxLimit)) {
            status = 'exceeded';
            limitType = 'maximum';
            limitPercentage = bank.maxLimit;
            variation = percentage - parseFloat(bank.maxLimit);
            
            report.alerts.push({
              bankName: bank.bankName,
              currency: currencyCode,
              balance: balance,
              percentage: percentage,
              limitType: limitType,
              limitPercentage: limitPercentage,
              variation: variation,
              status: status
            });
          } else if (bank.minLimit !== null && percentage < parseFloat(bank.minLimit)) {
            status = 'below';
            limitType = 'minimum';
            limitPercentage = bank.minLimit;
            variation = parseFloat(bank.minLimit) - percentage;
            
            report.alerts.push({
              bankName: bank.bankName,
              currency: currencyCode,
              balance: balance,
              percentage: percentage,
              limitType: limitType,
              limitPercentage: limitPercentage,
              variation: variation,
              status: status
            });
          } else {
            // Within limits - determine which limit is more relevant for display
            if (bank.maxLimit !== null && bank.minLimit !== null) {
              limitType = 'both';
              limitPercentage = `${bank.minLimit}-${bank.maxLimit}`;
            } else if (bank.maxLimit !== null) {
              limitType = 'maximum';
              limitPercentage = bank.maxLimit;
            } else if (bank.minLimit !== null) {
              limitType = 'minimum';
              limitPercentage = bank.minLimit;
            }
          }

          report.currencies[currencyCode].banks.push({
            id: bank.id,
            bankName: bank.bankName,
            accountNumber: bank.accountNumber,
            currency: currencyCode,
            balance: balance,
            percentage: percentage,
            maxLimit: bank.maxLimit,
            minLimit: bank.minLimit,
            limitType: limitType,
            limitPercentage: limitPercentage,
            variation: variation,
            status: status
          });
        });

        // Sort banks by balance descending for better presentation
        report.currencies[currencyCode].banks.sort((a, b) => b.balance - a.balance);
      }

      console.log('Enhanced report generated successfully');
      console.log('Currencies found:', Object.keys(report.currencies));
      console.log('Total alerts:', report.alerts.length);
      
      return report;
    } catch (error) {
      console.error('Error in generateLimitsReport:', error);
      throw new Error(`Failed to generate limits report: ${error.message}`);
    }
  }

  static async generateCashCoverReport(date) {
    try {
      const limitsReport = await this.generateLimitsReport(date);
      const cashCover = {};

      for (const [currencyCode, currencyData] of Object.entries(limitsReport.currencies)) {
        // Get top banks by balance for cash cover report
        const sortedBanks = [...(currencyData.banks || [])]
          .filter(bank => bank.balance > 0)
          .sort((a, b) => b.balance - a.balance);

        cashCover[currencyCode] = sortedBanks.slice(0, 10); // Top 10 banks
      }

      return {
        date,
        cashCover,
        alerts: limitsReport.alerts,
        summary: limitsReport.summary
      };
    } catch (error) {
      console.error('Error in generateCashCoverReport:', error);
      throw new Error(`Failed to generate cash cover report: ${error.message}`);
    }
  }

  static async getActiveAlerts(date = null) {
    try {
      const whereClause = {
        isResolved: false
      };

      if (date) {
        whereClause.alertDate = date;
      }

      const alerts = await models.CorrespondentAlert.findAll({
        where: whereClause,
        include: [{
          model: models.CorrespondentBank,
          as: 'bank',
          attributes: [
            'id', 'bankName', 'currencyId'
          ],
          include: [{
            model: models.Currency,
            as: 'currency',
            attributes: ['id', 'code', 'name', 'symbol']
          }]
        }],
        order: [['alertDate', 'DESC'], ['createdAt', 'DESC']]
      });

      return alerts;
    } catch (error) {
      throw new Error(`Failed to get active alerts: ${error.message}`);
    }
  }

  static async resolveAlert(alertId, userId) {
    try {
      const alert = await models.CorrespondentAlert.findByPk(alertId);
      if (!alert) {
        throw new Error('Alert not found');
      }

      await alert.update({
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: userId
      });

      return alert;
    } catch (error) {
      throw new Error(`Failed to resolve alert: ${error.message}`);
    }
  }
}