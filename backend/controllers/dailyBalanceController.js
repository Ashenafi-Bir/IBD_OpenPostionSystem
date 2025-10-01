import models from '../models/index.js';
import { body, param, query } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';
import { BalanceService } from '../services/balanceService.js'; // Adjust the path as necessary

import { Op } from 'sequelize';

export const getDailyBalances = [
  query('date').isDate().withMessage('Invalid date format'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const { date } = req.query;
      
      const balances = await models.DailyBalance.findAll({
        where: { balanceDate: date },
        include: [
          { 
            model: models.Currency,
            attributes: ['id', 'code', 'name'] 
          },
          { 
            model: models.BalanceItem,
            attributes: ['id', 'name', 'category', 'code'] 
          },
          { 
            model: models.User, 
            as: 'Creator', 
            attributes: ['fullName'] 
          },
          { 
            model: models.User, 
            as: 'Authorizer', 
            attributes: ['fullName'] 
          }
        ],
        order: [
          ['currency_id', 'ASC'],
          ['item_id', 'ASC']
        ]
      });

      res.json(balances);
    } catch (error) {
      console.error('Error fetching daily balances:', error);
      res.status(500).json({ error: 'Failed to fetch daily balances' });
    }
  }
];

// Update the getBalanceReports function
export const getBalanceReports = [
  query('date').isDate().withMessage('Invalid date format'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const { date } = req.query;
      
      // Get all balances for the date
      const balances = await models.DailyBalance.findAll({
        where: { 
          balanceDate: date,
          status: 'authorized'
        },
        include: [
          { 
            model: models.Currency,
            attributes: ['id', 'code', 'name'] 
          },
          { 
            model: models.BalanceItem,
            attributes: ['id', 'name', 'category', 'code'] 
          }
        ]
      });

      // Calculate cash on hand for each currency using BalanceService
      const cashOnHandData = {};
      const currencies = await models.Currency.findAll({ where: { isActive: true } });
      
      for (const currency of currencies) {
        try {
          const cashOnHandInfo = await BalanceService.calculateCashOnHand(currency.code, date);
          cashOnHandData[currency.code] = cashOnHandInfo;
        } catch (error) {
          console.error(`Error calculating cash on hand for ${currency.code}:`, error);
          // Fallback calculation
          const cashOnHandItem = await models.BalanceItem.findOne({
            where: { code: 'CASH_ON_HAND' }
          });

          if (cashOnHandItem) {
            const cashBalance = balances.find(b => 
              b.currency_id === currency.id && b.item_id === cashOnHandItem.id
            );

            // Get yesterday's date
            const yesterday = new Date(date);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            // Get yesterday's cash on hand
            const yesterdayBalance = await models.DailyBalance.findOne({
              where: {
                balanceDate: yesterdayStr,
                currency_id: currency.id,
                item_id: cashOnHandItem.id,
                status: 'authorized'
              }
            });

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

            const yesterdayAmount = yesterdayBalance ? parseFloat(yesterdayBalance.amount) : 0;
            const todayAmount = cashBalance ? parseFloat(cashBalance.amount) : yesterdayAmount + purchaseAmount - saleAmount;

            cashOnHandData[currency.code] = {
              currency: currency.code,
              yesterdayBalance: yesterdayAmount,
              todayPurchase: purchaseAmount,
              todaySale: saleAmount,
              todayCashOnHand: todayAmount,
              calculationDate: date,
              isManualEntry: !!cashBalance
            };
          }
        }
      }

      // Calculate totals using BalanceService
      let totalsData;
      try {
        totalsData = await BalanceService.calculateTotals(date);
      } catch (error) {
        console.error('Error calculating totals:', error);
        // Fallback calculation
        totalsData = await calculateTotalsFallback(date, balances, cashOnHandData);
      }

      res.json({
        cashOnHand: Object.values(cashOnHandData),
        totals: totalsData,
        date: date
      });
    } catch (error) {
      console.error('Error generating balance reports:', error);
      res.status(500).json({ error: 'Failed to generate balance reports' });
    }
  }
];

// Fallback function for totals calculation
async function calculateTotalsFallback(date, balances, cashOnHandData) {
  const currencies = await models.Currency.findAll({ where: { isActive: true } });
  const currencyTotals = {};

  // Initialize totals for each currency
  currencies.forEach(currency => {
    currencyTotals[currency.code] = {
      currency: currency.code,
      asset: 0,
      liability: 0,
      memoAsset: 0,
      memoLiability: 0,
      cashOnHand: cashOnHandData[currency.code]?.todayCashOnHand || 0
    };
  });

  // Sum up balances by category (excluding cash on hand as it's already calculated)
  balances.forEach(balance => {
    const currencyCode = balance.Currency.code;
    const category = balance.BalanceItem.category;
    const amount = parseFloat(balance.amount);

    // Skip cash on hand from manual balances
    if (balance.BalanceItem.code === 'CASH_ON_HAND') {
      return;
    }

    switch (category) {
      case 'asset':
        currencyTotals[currencyCode].asset += amount;
        break;
      case 'liability':
        currencyTotals[currencyCode].liability += amount;
        break;
      case 'memo_asset':
        currencyTotals[currencyCode].memoAsset += amount;
        break;
      case 'memo_liability':
        currencyTotals[currencyCode].memoLiability += amount;
        break;
    }
  });

  // Add cash on hand to total assets and convert to array
  const totalsData = Object.values(currencyTotals).map(currency => {
    const totalAsset = currency.asset + currency.cashOnHand;
    return {
      ...currency,
      asset: totalAsset,
      totalLiability: currency.liability + currency.memoLiability
    };
  });

  return totalsData;
}
export const createDailyBalance = [
  body('balanceDate').isDate().withMessage('Invalid date format'),
  body('currencyId').isInt().withMessage('Invalid currency ID'),
  body('itemId').isInt().withMessage('Invalid item ID'),
  body('amount').isDecimal().withMessage('Invalid amount'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const balanceData = {
        ...req.body,
        currency_id: req.body.currencyId,
        item_id: req.body.itemId,
        created_by: req.user.id,
        status: req.user.role === 'authorizer' ? 'authorized' : 'draft'
      };

      // Check if balance already exists for this date, currency, and item
      const existingBalance = await models.DailyBalance.findOne({
        where: {
          balanceDate: balanceData.balanceDate,
          currency_id: balanceData.currency_id,
          item_id: balanceData.item_id
        }
      });

      if (existingBalance) {
        return res.status(400).json({ error: 'Balance already exists for this date, currency, and item' });
      }

      const balance = await models.DailyBalance.create(balanceData);
      const newBalance = await models.DailyBalance.findByPk(balance.id, {
        include: [
          { model: models.Currency },
          { model: models.BalanceItem },
          { model: models.User, as: 'Creator', attributes: ['fullName'] }
        ]
      });

      res.status(201).json(newBalance);
    } catch (error) {
      console.error('Error creating daily balance:', error);
      res.status(500).json({ error: 'Failed to create daily balance' });
    }
  }
];

export const updateDailyBalance = [
  param('id').isInt().withMessage('Invalid balance ID'),
  body('amount').isDecimal().withMessage('Invalid amount'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const balance = await models.DailyBalance.findByPk(req.params.id);
      
      if (!balance) {
        return res.status(404).json({ error: 'Daily balance not found' });
      }

      if (balance.status === 'authorized' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Cannot update authorized balance' });
      }

      await balance.update({
        amount: req.body.amount,
        status: req.user.role === 'authorizer' ? 'authorized' : 'draft'
      });

      const updatedBalance = await models.DailyBalance.findByPk(balance.id, {
        include: [
          { model: models.Currency },
          { model: models.BalanceItem },
          { model: models.User, as: 'Creator', attributes: ['fullName'] }
        ]
      });

      res.json(updatedBalance);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update daily balance' });
    }
  }
];

export const deleteDailyBalance = [
  param('id').isInt().withMessage('Invalid balance ID'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const balance = await models.DailyBalance.findByPk(req.params.id);
      
      if (!balance) {
        return res.status(404).json({ error: 'Daily balance not found' });
      }

      if (balance.status === 'authorized' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Cannot delete authorized balance' });
      }

      await balance.destroy();
      res.json({ message: 'Daily balance deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete daily balance' });
    }
  }
];

export const submitDailyBalance = [
  param('id').isInt().withMessage('Invalid balance ID'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const balance = await models.DailyBalance.findByPk(req.params.id);
      
      if (!balance) {
        return res.status(404).json({ error: 'Daily balance not found' });
      }

      if (balance.status !== 'draft') {
        return res.status(400).json({ error: 'Only draft balances can be submitted' });
      }

      await balance.update({ status: 'submitted' });
      res.json(balance);
    } catch (error) {
      res.status(500).json({ error: 'Failed to submit daily balance' });
    }
  }
];

export const authorizeDailyBalance = [
  param('id').isInt().withMessage('Invalid balance ID'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const balance = await models.DailyBalance.findByPk(req.params.id);
      
      if (!balance) {
        return res.status(404).json({ error: 'Daily balance not found' });
      }

      if (balance.status !== 'submitted') {
        return res.status(400).json({ error: 'Only submitted balances can be authorized' });
      }

      await balance.update({
        status: 'authorized',
        authorized_by: req.user.id
      });

      res.json(balance);
    } catch (error) {
      res.status(500).json({ error: 'Failed to authorize daily balance' });
    }
  }
];