import models from '../models/index.js';
import { Op } from 'sequelize';

export class BalanceService {
  // Get current paid-up capital
  static async getCurrentPaidUpCapital() {
    try {
      const capital = await models.PaidUpCapital.findOne({
        where: { isActive: true },
        order: [['effectiveDate', 'DESC']]
      });
      
      return capital ? parseFloat(capital.capitalAmount) : 2979527;
    } catch (error) {
      console.error('Error fetching paid-up capital:', error);
      return 2979527; // Fallback to default
    }
  }

  // Get paid-up capital for specific date (FIXED - uses effective date logic)
  static async getPaidUpCapitalForDate(date) {
    try {
      const capital = await models.PaidUpCapital.findOne({
        where: {
          effectiveDate: { [Op.lte]: date },
          isActive: true
        },
        order: [['effectiveDate', 'DESC']]
      });
      
      return capital ? parseFloat(capital.capitalAmount) : 2979527;
    } catch (error) {
      console.error('Error fetching paid-up capital for date:', error);
      return 2979527; // Fallback to default
    }
  }

  // Calculate today's cash on hand from yesterday's balance plus purchases minus sales
  static async calculateCashOnHand(currencyCode, date) {
    try {
      const currency = await models.Currency.findOne({ where: { code: currencyCode } });
      if (!currency) {
        throw new Error(`Currency ${currencyCode} not found`);
      }

      // Get cash on hand balance item
      const cashOnHandItem = await models.BalanceItem.findOne({ 
        where: { code: 'CASH_ON_HAND' } 
      });

      // Check if there's a manually updated cash on hand balance for today
      const todayCashBalance = await models.DailyBalance.findOne({
        where: {
          balanceDate: date,
          currency_id: currency.id,
          item_id: cashOnHandItem.id,
          status: 'authorized'
        }
      });

      // If there's a manual entry for today, use that value directly
      if (todayCashBalance) {
        const todayAmount = parseFloat(todayCashBalance.amount);
        
        // Get yesterday's balance for reference
        const yesterday = new Date(date);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const yesterdayBalance = await models.DailyBalance.findOne({
          where: {
            balanceDate: yesterdayStr,
            currency_id: currency.id,
            item_id: cashOnHandItem.id,
            status: 'authorized'
          }
        });

        const startingBalance = yesterdayBalance ? parseFloat(yesterdayBalance.amount) : 0;

        // Get today's transactions for reporting
        const todayTransactions = await models.FCYTransaction.findAll({
          where: {
            transactionDate: date,
            currency_id: currency.id,
            status: 'authorized'
          }
        });

        let purchaseAmount = 0;
        let saleAmount = 0;

        todayTransactions.forEach(transaction => {
          const amount = parseFloat(transaction.amount);
          if (transaction.transactionType === 'purchase') {
            purchaseAmount += amount;
          } else if (transaction.transactionType === 'sale') {
            saleAmount += amount;
          }
        });

        return {
          currency: currencyCode,
          yesterdayBalance: startingBalance,
          todayPurchase: purchaseAmount,
          todaySale: saleAmount,
          todayCashOnHand: todayAmount,
          calculationDate: date,
          isManualEntry: true
        };
      }

      // If no manual entry, calculate from yesterday + transactions
      const yesterday = new Date(date);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Get yesterday's cash on hand balance
      const yesterdayBalance = await models.DailyBalance.findOne({
        where: {
          balanceDate: yesterdayStr,
          currency_id: currency.id,
          item_id: cashOnHandItem.id,
          status: 'authorized'
        }
      });

      let startingBalance = 0;
      if (yesterdayBalance) {
        startingBalance = parseFloat(yesterdayBalance.amount);
      }

      // Get today's transactions
      const todayTransactions = await models.FCYTransaction.findAll({
        where: {
          transactionDate: date,
          currency_id: currency.id,
          status: 'authorized'
        }
      });

      let purchaseAmount = 0;
      let saleAmount = 0;

      todayTransactions.forEach(transaction => {
        const amount = parseFloat(transaction.amount);
        if (transaction.transactionType === 'purchase') {
          purchaseAmount += amount;
        } else if (transaction.transactionType === 'sale') {
          saleAmount += amount;
        }
      });

      const todayCashOnHand = startingBalance + purchaseAmount - saleAmount;

      return {
        currency: currencyCode,
        yesterdayBalance: startingBalance,
        todayPurchase: purchaseAmount,
        todaySale: saleAmount,
        todayCashOnHand: todayCashOnHand,
        calculationDate: date,
        isManualEntry: false
      };
    } catch (error) {
      throw new Error(`Failed to calculate cash on hand: ${error.message}`);
    }
  }

  static async calculateTotals(date) {
    try {
      const currencies = await models.Currency.findAll({ where: { isActive: true } });
      const result = [];

      for (const currency of currencies) {
        // First, ensure we have today's cash on hand calculated
        const cashOnHandData = await this.calculateCashOnHand(currency.code, date);
        
        const balances = await models.DailyBalance.findAll({
          where: {
            balanceDate: date,
            currency_id: currency.id,
            status: 'authorized'
          },
          include: [{
            model: models.BalanceItem,
            attributes: ['category', 'code']
          }]
        });

        let totalAsset = 0;
        let totalLiability = 0;
        let totalMemoAsset = 0;
        let totalMemoLiability = 0;

        // Add all balance items except cash on hand (we'll use calculated value)
        balances.forEach(balance => {
          const amount = parseFloat(balance.amount);
          
          // Skip cash on hand from manual balances if we're using calculated value
          if (balance.BalanceItem.code === 'CASH_ON_HAND') {
            return; // Skip manual entry if we're using calculated value
          }
          
          switch (balance.BalanceItem.category) {
            case 'asset':
              totalAsset += amount;
              break;
            case 'liability':
              totalLiability += amount;
              break;
            case 'memo_asset':
              totalMemoAsset += amount;
              break;
            case 'memo_liability':
              totalMemoLiability += amount;
              break;
          }
        });

        // Add the calculated cash on hand to total asset
        totalAsset += cashOnHandData.todayCashOnHand;

        result.push({
          currency: currency.code,
          asset: totalAsset,
          liability: totalLiability,
          memoAsset: totalMemoAsset,
          memoLiability: totalMemoLiability,
          totalLiability: totalLiability + totalMemoLiability,
          cashOnHand: cashOnHandData.todayCashOnHand
        });
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to calculate totals: ${error.message}`);
    }
  }

  // Calculate bank position with dynamic capital (FIXED - uses date-specific capital)
  static async calculatePosition(date) {
    try {
      const currencies = await models.Currency.findAll({ where: { isActive: true } });
      const exchangeRates = await models.ExchangeRate.findAll({
        where: { rateDate: date, isActive: true },
        include: [models.Currency]
      });

      // Get dynamic paid-up capital for the specific date
      const paidUpCapital = await this.getPaidUpCapitalForDate(date);
      
      const positionReport = {
        currencies: [],
        overall: {
          totalLong: 0,
          totalShort: 0,
          overallOpenPosition: 0,
          overallPercentage: 0,
          paidUpCapital: paidUpCapital,
          calculationDate: date
        }
      };

      for (const currency of currencies) {
        const totals = await this.calculateTotals(date);
        const currencyTotals = totals.find(t => t.currency === currency.code);
        
        if (!currencyTotals) continue;

        const exchangeRate = exchangeRates.find(rate => 
          rate?.Currency?.code === currency.code
        );

        if (!exchangeRate) continue;

        const position = (currencyTotals.asset + currencyTotals.memoAsset) - 
                         (currencyTotals.liability + currencyTotals.memoLiability);

        const positionLocal = position * parseFloat(exchangeRate.midRate);
        const percentage = (positionLocal / paidUpCapital) * 100;

        positionReport.currencies.push({
          currency: currency.code,
          asset: currencyTotals.asset,
          liability: currencyTotals.liability,
          memoAsset: currencyTotals.memoAsset,
          memoLiability: currencyTotals.memoLiability,
          cashOnHand: currencyTotals.cashOnHand,
          position: position,
          midRate: parseFloat(exchangeRate.midRate),
          positionLocal: positionLocal,
          percentage: percentage,
          type: position >= 0 ? 'long' : 'short'
        });
      }

      // Calculate overall position
      positionReport.overall.totalLong = positionReport.currencies
        .filter(c => c.type === 'long')
        .reduce((sum, c) => sum + c.positionLocal, 0);

      positionReport.overall.totalShort = positionReport.currencies
        .filter(c => c.type === 'short')
        .reduce((sum, c) => sum + c.positionLocal, 0);

      positionReport.overall.overallOpenPosition = 
        positionReport.overall.totalLong + positionReport.overall.totalShort;

      positionReport.overall.overallPercentage = 
        (positionReport.overall.overallOpenPosition / paidUpCapital) * 100;

      return positionReport;
    } catch (error) {
      throw new Error(`Failed to calculate position: ${error.message}`);
    }
  }

  // New method to get capital for date range
  static async getCapitalForDateRange(startDate, endDate) {
    try {
      const capitals = await models.PaidUpCapital.findAll({
        where: {
          effectiveDate: {
            [Op.between]: [startDate, endDate]
          }
        },
        order: [['effectiveDate', 'ASC']]
      });

      return capitals;
    } catch (error) {
      throw new Error(`Failed to fetch capital for date range: ${error.message}`);
    }
  }
}