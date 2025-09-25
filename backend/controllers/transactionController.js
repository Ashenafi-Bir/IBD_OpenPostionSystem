import models from '../models/index.js';
import { body, param } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';

export const createTransaction = [
  body('transactionDate').isDate().withMessage('Invalid date format'),
  body('currencyId').isInt().withMessage('Invalid currency ID'),
  body('transactionType').isIn(['purchase', 'sale']).withMessage('Invalid transaction type'),
  body('amount').isDecimal().withMessage('Invalid amount'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const transactionData = {
        ...req.body,
        created_by: req.user.id,
        status: req.user.role === 'authorizer' ? 'authorized' : 'draft'
      };

      const transaction = await models.FCYTransaction.create(transactionData);
      res.status(201).json(transaction);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create transaction' });
    }
  }
];

export const authorizeTransaction = [
  param('id').isInt().withMessage('Invalid transaction ID'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const transaction = await models.FCYTransaction.findByPk(req.params.id);
      
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      if (transaction.status !== 'submitted') {
        return res.status(400).json({ error: 'Only submitted transactions can be authorized' });
      }

      await transaction.update({
        status: 'authorized',
        authorized_by: req.user.id
      });

      res.json(transaction);
    } catch (error) {
      res.status(500).json({ error: 'Failed to authorize transaction' });
    }
  }
];
export const getTransactions = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date query parameter is required' });

    const transactions = await models.FCYTransaction.findAll({
      where: { transactionDate: date }
    });

    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};