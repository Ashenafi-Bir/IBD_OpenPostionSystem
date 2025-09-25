import { CorrespondentService } from '../services/correspondentService.js';
import models from '../models/index.js';
import { query, body } from 'express-validator';

import { handleValidationErrors } from '../middleware/validation.js';

export const getLimitsReport = [
  query('date').isDate().withMessage('Invalid date format'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const { date } = req.query;
      const result = await CorrespondentService.calculateLimitsReport(date);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];

export const getCashCoverReport = [
  query('date').isDate().withMessage('Invalid date format'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const { date } = req.query;
      const result = await CorrespondentService.generateCashCoverReport(date);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];

export const createCorrespondentBalance = [
  body('bankId').isInt().withMessage('Invalid bank ID'),
  body('balanceDate').isDate().withMessage('Invalid date format'),
  body('balanceAmount').isDecimal().withMessage('Invalid amount'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const balanceData = {
        ...req.body,
        created_by: req.user.id
      };

      const balance = await models.CorrespondentBalance.create(balanceData);
      res.status(201).json(balance);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create balance record' });
    }
  }
];