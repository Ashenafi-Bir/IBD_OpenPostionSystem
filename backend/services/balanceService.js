import models from '../models/index.js';
import { Op } from 'sequelize';

export class BalanceService {
  // Calculate today's cash on hand from yesterday's balance plus purchases minus sales
  static async calculateCashOnHand(currencyCode, date) {
    try {
      const currency = await models.Currency.findOne({ where: { code: currencyCode } });
      if (!currency) {
        throw new Error(`Currency ${currencyCode} not found`);
      }

      const yesterday = new Date(date);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Get yesterday's cash on hand balance
      const cashOnHandItem = await models.BalanceItem.findOne({ 
        where: { code: 'CASH_ON_HAND' } 
      });

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
        calculationDate: date
      };
    } catch (error) {
      throw new Error(`Failed to calculate cash on hand: ${error.message}`);
    }
  }

  // Calculate totals for assets, liabilities, and memorandum items
  static async calculateTotals(date) {
    try {
      const currencies = await models.Currency.findAll({ where: { isActive: true } });
      const result = [];

      for (const currency of currencies) {
        const balances = await models.DailyBalance.findAll({
          where: {
            balanceDate: date,
            currency_id: currency.id,
            status: 'authorized'
          },
          include: [{
            model: models.BalanceItem,
            attributes: ['category']
          }]
        });

        let totalAsset = 0;
        let totalLiability = 0;
        let totalMemoAsset = 0;
        let totalMemoLiability = 0;

        balances.forEach(balance => {
          const amount = parseFloat(balance.amount);
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

        result.push({
          currency: currency.code,
          asset: totalAsset,
          liability: totalLiability,
          memoAsset: totalMemoAsset,
          memoLiability: totalMemoLiability,
          totalLiability: totalLiability + totalMemoLiability
        });
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to calculate totals: ${error.message}`);
    }
  }

  // Calculate bank position
  static async calculatePosition(date) {
    try {
      const currencies = await models.Currency.findAll({ where: { isActive: true } });
      const exchangeRates = await models.ExchangeRate.findAll({
        where: { rateDate: date, isActive: true },
        include: [models.Currency]
      });

      const paidUpCapital = 2979527; // Should come from config
      const positionReport = {
        currencies: [],
        overall: {
          totalLong: 0,
          totalShort: 0,
          overallOpenPosition: 0,
          overallPercentage: 0,
          paidUpCapital: paidUpCapital
        }
      };

      for (const currency of currencies) {
        const totals = await this.calculateTotals(date);
        const currencyTotals = totals.find(t => t.currency === currency.code);
        
        if (!currencyTotals) continue;

        // Fix: Use a more defensive check to prevent 'Cannot read properties of null' error
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
}