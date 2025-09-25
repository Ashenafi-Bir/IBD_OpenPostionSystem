import models from '../models/index.js';
import { BalanceService } from '../services/balanceService.js';
import { body, param, query } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';

export const calculateCashOnHand = [
  param('currency').isLength({ min: 3, max: 3 }).withMessage('Invalid currency code'),
  query('date').isDate().withMessage('Invalid date format'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const { currency } = req.params;
      const { date } = req.query;

      const result = await BalanceService.calculateCashOnHand(currency, date);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];

export const getTotalsReport = [
  query('date').isDate().withMessage('Invalid date format'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const { date } = req.query;
      const result = await BalanceService.calculateTotals(date);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];

// In your balanceController.js - update the getPositionReport function
export const getPositionReport = [
  query('date').isDate().withMessage('Invalid date format'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const { date } = req.query;
      console.log('Position report requested for date:', date); // Add logging
      
      const result = await BalanceService.calculatePosition(date);
      console.log('Position result:', result); // Add logging
      
      res.json(result);
    } catch (error) {
      console.error('Error in getPositionReport:', error); // Detailed error logging
      console.error('Error stack:', error.stack);
      res.status(500).json({ 
        error: 'Failed to generate position report',
        details: error.message 
      });
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
        created_by: req.user.id,
        status: req.user.role === 'authorizer' ? 'authorized' : 'draft'
      };

      const balance = await models.DailyBalance.create(balanceData);
      res.status(201).json(balance);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create balance record' });
    }
  }
];

export const authorizeBalance = [
  param('id').isInt().withMessage('Invalid balance ID'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const balance = await models.DailyBalance.findByPk(req.params.id);
      
      if (!balance) {
        return res.status(404).json({ error: 'Balance record not found' });
      }

      if (balance.status !== 'submitted') {
        return res.status(400).json({ error: 'Only submitted records can be authorized' });
      }

      await balance.update({
        status: 'authorized',
        authorized_by: req.user.id
      });

      res.json(balance);
    } catch (error) {
      res.status(500).json({ error: 'Failed to authorize balance' });
    }
  }
];
