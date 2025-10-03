import { CorrespondentService } from '../services/correspondentService.js';
import models from '../models/index.js';
import { query, body, param } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';
import { Op } from 'sequelize';

// Bank Management
export const createBank = [
  body('bankName').notEmpty().withMessage('Bank name is required'),
  body('currencyId').isInt().withMessage('Currency ID must be a valid integer'),
  body('maxLimit').optional().isFloat({ min: 0, max: 100 }).withMessage('Max limit must be between 0 and 100'),
  body('minLimit').optional().isFloat({ min: 0, max: 100 }).withMessage('Min limit must be between 0 and 100'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const bank = await CorrespondentService.createBank(req.body, req.user.id);
      res.status(201).json({
        success: true,
        data: bank,
        message: 'Bank created successfully'
      });
    } catch (error) {
      console.error('Error in createBank:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
];

export const updateBankLimits = [
  param('id').isInt().withMessage('Invalid bank ID'),
  body('maxLimit').optional().isFloat({ min: 0, max: 100 }).withMessage('Max limit must be between 0 and 100'),
  body('minLimit').optional().isFloat({ min: 0, max: 100 }).withMessage('Min limit must be between 0 and 100'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const bank = await CorrespondentService.updateBankLimits(req.params.id, req.body, req.user.id);
      res.json({
        success: true,
        data: bank,
        message: 'Bank limits updated successfully'
      });
    } catch (error) {
      console.error('Error in updateBankLimits:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
];

export const getBanks = [
  query('currencyId').optional().isInt(),
  handleValidationErrors,

  async (req, res) => {
    try {
      const whereClause = { isActive: true };
      if (req.query.currencyId) {
        whereClause.currencyId = req.query.currencyId;
      }

      // FIXED: Explicitly define attributes to prevent Sequelize from adding currency_id
      const banks = await models.CorrespondentBank.findAll({
        where: whereClause,
        attributes: [
          'id', 'bankName', 'branchAddress', 'accountNumber', 
          'swiftCode', 'currencyId', 'maxLimit', 'minLimit', 
          'isActive', 'createdBy', 'createdAt', 'updatedAt'
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
            attributes: ['id', 'balanceAmount', 'balanceDate'],
            separate: true,
            limit: 1,
            order: [['balanceDate', 'DESC']]
          }
        ],
        order: [
          [{ model: models.Currency, as: 'currency' }, 'code', 'ASC'],
          ['bankName', 'ASC']
        ]
      });

      res.json({
        success: true,
        data: banks
      });
    } catch (error) {
      console.error('Error in getBanks:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
];

// Balance Management - NO LIMIT VALIDATION
export const addDailyBalance = [
  body('bankId').isInt().withMessage('Invalid bank ID'),
  body('balanceDate').isDate().withMessage('Invalid date format'),
  body('balanceAmount').isFloat({ min: 0 }).withMessage('Balance amount must be positive'),
  body('notes').optional().isString(),
  handleValidationErrors,

  async (req, res) => {
    try {
      const balance = await CorrespondentService.addDailyBalance(req.body, req.user.id);
      res.status(201).json({
        success: true,
        data: balance,
        message: 'Balance added successfully'
      });
    } catch (error) {
      console.error('Error in addDailyBalance:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
];

export const getBankBalances = [
  param('bankId').isInt().withMessage('Invalid bank ID'),
  query('startDate').optional().isDate(),
  query('endDate').optional().isDate(),
  handleValidationErrors,

  async (req, res) => {
    try {
      const whereClause = { bankId: req.params.bankId };
      
      if (req.query.startDate && req.query.endDate) {
        whereClause.balanceDate = {
          [Op.between]: [req.query.startDate, req.query.endDate]
        };
      }

      const balances = await models.CorrespondentBalance.findAll({
        where: whereClause,
        include: [{
          model: models.CorrespondentBank,
          as: 'bank',
          include: [{
            model: models.Currency,
            as: 'currency',
            attributes: ['id', 'code', 'name', 'symbol']
          }]
        }],
        order: [['balanceDate', 'DESC']],
        limit: req.query.limit ? parseInt(req.query.limit) : 30
      });

      res.json({
        success: true,
        data: balances
      });
    } catch (error) {
      console.error('Error in getBankBalances:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
];

// Reports - These will show limit violations but won't prevent entry
export const getLimitsReport = [
  query('date').isDate().withMessage('Invalid date format'),
  handleValidationErrors,

  async (req, res) => {
    try {
      console.log('Getting limits report for date:', req.query.date);
      const report = await CorrespondentService.generateLimitsReport(req.query.date);
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Error in getLimitsReport:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
];

export const getCashCoverReport = [
  query('date').isDate().withMessage('Invalid date format'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const report = await CorrespondentService.generateCashCoverReport(req.query.date);
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Error in getCashCoverReport:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
];

// Alerts - These will track limit violations for reporting
export const getActiveAlerts = [
  query('date').optional().isDate(),
  handleValidationErrors,

  async (req, res) => {
    try {
      const alerts = await CorrespondentService.getActiveAlerts(req.query.date);
      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      console.error('Error in getActiveAlerts:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
];

export const resolveAlert = [
  param('id').isInt().withMessage('Invalid alert ID'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const alert = await CorrespondentService.resolveAlert(req.params.id, req.user.id);
      res.json({
        success: true,
        data: alert,
        message: 'Alert resolved successfully'
      });
    } catch (error) {
      console.error('Error in resolveAlert:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
];