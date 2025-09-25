import models from '../models/index.js';
import { body, param, query } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';

export const getExchangeRates = [
  query('date').optional().isDate().withMessage('Invalid date format'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const { date } = req.query;
      const whereClause = date ? { rateDate: date } : {};
      
      const rates = await models.ExchangeRate.findAll({
        where: whereClause,
        include: [models.Currency],
        order: [['rateDate', 'DESC'], ['currency_id', 'ASC']]
      });

      res.json(rates);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch exchange rates' });
    }
  }
];

export const createExchangeRate = [
  body('currencyId').isInt().withMessage('Invalid currency ID'),
  body('rateDate').isDate().withMessage('Invalid date format'),
  body('buyingRate').isDecimal().withMessage('Invalid buying rate'),
  body('sellingRate').isDecimal().withMessage('Invalid selling rate'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const rateData = {
        ...req.body,
        midRate: (parseFloat(req.body.buyingRate) + parseFloat(req.body.sellingRate)) / 2,
        created_by: req.user.id
      };

      // Check if rate already exists for this date and currency
      const existingRate = await models.ExchangeRate.findOne({
        where: {
          currency_id: rateData.currencyId,
          rateDate: rateData.rateDate
        }
      });

      if (existingRate) {
        return res.status(400).json({ error: 'Exchange rate already exists for this date and currency' });
      }

      const rate = await models.ExchangeRate.create(rateData);
      const newRate = await models.ExchangeRate.findByPk(rate.id, {
        include: [models.Currency]
      });

      res.status(201).json(newRate);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create exchange rate' });
    }
  }
];

export const updateExchangeRate = [
  param('id').isInt().withMessage('Invalid rate ID'),
  body('buyingRate').optional().isDecimal().withMessage('Invalid buying rate'),
  body('sellingRate').optional().isDecimal().withMessage('Invalid selling rate'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const rate = await models.ExchangeRate.findByPk(req.params.id);
      
      if (!rate) {
        return res.status(404).json({ error: 'Exchange rate not found' });
      }

      const updateData = { ...req.body };
      
      if (updateData.buyingRate || updateData.sellingRate) {
        const buyingRate = updateData.buyingRate ? parseFloat(updateData.buyingRate) : parseFloat(rate.buyingRate);
        const sellingRate = updateData.sellingRate ? parseFloat(updateData.sellingRate) : parseFloat(rate.sellingRate);
        updateData.midRate = (buyingRate + sellingRate) / 2;
      }

      await rate.update(updateData);
      const updatedRate = await models.ExchangeRate.findByPk(rate.id, {
        include: [models.Currency]
      });

      res.json(updatedRate);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update exchange rate' });
    }
  }
];

export const deleteExchangeRate = [
  param('id').isInt().withMessage('Invalid rate ID'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const rate = await models.ExchangeRate.findByPk(req.params.id);
      
      if (!rate) {
        return res.status(404).json({ error: 'Exchange rate not found' });
      }

      await rate.destroy();
      res.json({ message: 'Exchange rate deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete exchange rate' });
    }
  }
];