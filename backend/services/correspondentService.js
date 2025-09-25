import models from '../models/index.js';

export class CorrespondentService {
  // Calculate daily limits and generate alerts
  static async calculateLimitsReport(date) {
    try {
      const banks = await models.CorrespondentBank.findAll({
        where: { isActive: true },
        include: [
          { model: models.Currency },
          { 
            model: models.CorrespondentBalance,
            where: { balanceDate: date },
            required: false
          }
        ]
      });

      // Group by currency
      const currencies = {};
      banks.forEach(bank => {
        const currencyCode = bank.Currency.code;
        if (!currencies[currencyCode]) {
          currencies[currencyCode] = [];
        }
        currencies[currencyCode].push(bank);
      });

      const report = {
        date: date,
        currencies: {},
        alerts: []
      };

      for (const [currencyCode, currencyBanks] of Object.entries(currencies)) {
        // Calculate total balance for the currency
        const totalBalance = currencyBanks.reduce((sum, bank) => {
          const balance = bank.CorrespondentBalances?.[0]?.balanceAmount || 0;
          return sum + parseFloat(balance);
        }, 0);

        report.currencies[currencyCode] = {
          totalBalance: totalBalance,
          banks: []
        };

        // Calculate percentages and check limits
        currencyBanks.forEach(bank => {
          const balance = bank.CorrespondentBalances?.[0]?.balanceAmount || 0;
          const percentage = totalBalance > 0 ? (balance / totalBalance) * 100 : 0;

          let status = 'normal';
          let variation = 0;

          if (bank.limitType === 'max' && percentage > bank.limitPercentage) {
            status = 'exceeded';
            variation = percentage - bank.limitPercentage;
          } else if (bank.limitType === 'min' && percentage < bank.limitPercentage) {
            status = 'below';
            variation = bank.limitPercentage - percentage;
          }

          if (status !== 'normal') {
            report.alerts.push({
              bank: bank.bankName,
              currency: currencyCode,
              balance: balance,
              percentage: percentage,
              limitType: bank.limitType,
              limitPercentage: bank.limitPercentage,
              variation: variation,
              status: status
            });
          }

          report.currencies[currencyCode].banks.push({
            bankName: bank.bankName,
            balance: balance,
            percentage: percentage,
            limitType: bank.limitType,
            limitPercentage: bank.limitPercentage,
            variation: variation,
            status: status
          });
        });
      }

      return report;
    } catch (error) {
      throw new Error(`Failed to calculate limits report: ${error.message}`);
    }
  }

  // Generate cash cover report
  static async generateCashCoverReport(date) {
    try {
      const report = await this.calculateLimitsReport(date);
      const cashCover = {};

      for (const [currencyCode, currencyData] of Object.entries(report.currencies)) {
        // Find banks with sufficient balance for cash cover
        const coverBanks = currencyData.banks
          .filter(bank => bank.balance > 0)
          .sort((a, b) => b.balance - a.balance);

        cashCover[currencyCode] = coverBanks.slice(0, 3); // Top 3 banks
      }

      return {
        date: date,
        cashCover: cashCover,
        alerts: report.alerts
      };
    } catch (error) {
      throw new Error(`Failed to generate cash cover report: ${error.message}`);
    }
  }
}