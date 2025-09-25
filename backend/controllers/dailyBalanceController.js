// dailyBalanceController.js

import models from '../models/index.js';
import { body, param, query } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';

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
            attributes: ['id', 'name', 'category'] 
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
        ],
        // Ensure we get the foreign keys
        attributes: { 
          include: ['item_id', 'currency_id'] 
        }
      });

      console.log('Balances with includes:', JSON.stringify(balances, null, 2));
      res.json(balances);
    } catch (error) {
      console.error('Error fetching daily balances:', error);
      res.status(500).json({ error: 'Failed to fetch daily balances' });
    }
  }
];

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
        currency_id: req.body.currencyId, // Map currencyId to currency_id
        item_id: req.body.itemId, // Map itemId to item_id
        created_by: req.user.id,
        status: req.user.role === 'authorizer' ? 'authorized' : 'draft'
      };

      console.log('Creating balance with data:', balanceData);

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
          { model: models.Currency, as: 'Currency', attributes: ['id', 'code', 'name'] },
          { model: models.BalanceItem, as: 'BalanceItem', attributes: ['id', 'name', 'category'] },
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