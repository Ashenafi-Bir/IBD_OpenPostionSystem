import models from '../models/index.js';
import { Op } from 'sequelize';

export class CorrespondentService {
  
  static async createBank(bankData, userId) {
    try {
      // Validate currency exists
      const currency = await models.Currency.findByPk(bankData.currencyId);
      if (!currency) {
        throw new Error('Invalid currency ID');
      }

      const bank = await models.CorrespondentBank.create({
        ...bankData,
        createdBy: userId
      });

      return await models.CorrespondentBank.findByPk(bank.id, {
        attributes: [
          'id', 'bankName', 'branchAddress', 'accountNumber', 
          'swiftCode', 'currencyId', 'maxLimit', 'minLimit', 
          'isActive', 'createdBy', 'createdAt', 'updatedAt'
        ],
        include: [{
          model: models.Currency,
          as: 'currency',
          attributes: ['id', 'code', 'name', 'symbol']
        }]
      });
    } catch (error) {
      throw new Error(`Failed to create bank: ${error.message}`);
    }
  }

  static async updateBankLimits(bankId, limits, userId) {
    try {
      const bank = await models.CorrespondentBank.findByPk(bankId);
      if (!bank) {
        throw new Error('Bank not found');
      }

      await bank.update(limits);

      return await models.CorrespondentBank.findByPk(bankId, {
        attributes: [
          'id', 'bankName', 'branchAddress', 'accountNumber', 
          'swiftCode', 'currencyId', 'maxLimit', 'minLimit', 
          'isActive', 'createdBy', 'createdAt', 'updatedAt'
        ],
        include: [{
          model: models.Currency,
          as: 'currency',
          attributes: ['id', 'code', 'name', 'symbol']
        }]
      });
    } catch (error) {
      throw new Error(`Failed to update bank limits: ${error.message}`);
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
      console.log('Starting limits report for date:', date);
      
      // Use raw query approach to avoid Sequelize association issues
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
        alerts: []
      };

      // Group banks by currency code
      banks.forEach(bank => {
        const currencyCode = bank.currencyCode;
        if (!currencies[currencyCode]) {
          currencies[currencyCode] = [];
        }
        currencies[currencyCode].push(bank);
      });

      console.log(`Currencies found: ${Object.keys(currencies).join(', ')}`);

      for (const [currencyCode, currencyBanks] of Object.entries(currencies)) {
        const totalBalance = currencyBanks.reduce((sum, bank) => {
          return sum + (bank.balanceAmount ? parseFloat(bank.balanceAmount) : 0);
        }, 0);

        report.currencies[currencyCode] = {
          totalBalance,
          banks: []
        };

        currencyBanks.forEach(bank => {
          const balance = bank.balanceAmount ? parseFloat(bank.balanceAmount) : 0;
          const percentage = totalBalance > 0 ? (balance / totalBalance) * 100 : 0;

          let limitType = '';
          let limitValue = null;
          let variation = 0;
          let status = 'normal';

          if (bank.maxLimit !== null && percentage > parseFloat(bank.maxLimit)) {
            status = 'exceeded';
            limitType = 'maximum';
            limitValue = bank.maxLimit;
            variation = percentage - parseFloat(bank.maxLimit);
            report.alerts.push({
              bankName: bank.bankName,
              currency: currencyCode,
              balance: balance,
              percentage: percentage,
              limitType: limitType,
              limitValue: limitValue,
              variation: variation,
              status: status
            });
          } else if (bank.minLimit !== null && percentage < parseFloat(bank.minLimit)) {
            status = 'below';
            limitType = 'minimum';
            limitValue = bank.minLimit;
            variation = parseFloat(bank.minLimit) - percentage;
            report.alerts.push({
              bankName: bank.bankName,
              currency: currencyCode,
              balance: balance,
              percentage: percentage,
              limitType: limitType,
              limitValue: limitValue,
              variation: variation,
              status: status
            });
          }

          report.currencies[currencyCode].banks.push({
            id: bank.id,
            bankName: bank.bankName,
            accountNumber: bank.accountNumber,
            balance: balance,
            percentage: percentage,
            maxLimit: bank.maxLimit,
            minLimit: bank.minLimit,
            limitType: limitType,
            limitValue: limitValue,
            variation: variation,
            status: status
          });
        });
      }

      console.log('Report generated successfully');
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
        const sortedBanks = [...currencyData.banks]
          .filter(bank => bank.balance > 0)
          .sort((a, b) => b.balance - a.balance);

        cashCover[currencyCode] = sortedBanks.slice(0, 5);
      }

      return {
        date,
        cashCover,
        alerts: limitsReport.alerts
      };
    } catch (error) {
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