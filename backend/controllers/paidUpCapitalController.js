import models from '../models/index.js';
import { body, param } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';

export const getPaidUpCapital = async (req, res) => {
  try {
    const capital = await models.PaidUpCapital.findOne({
      where: { isActive: true },
      order: [['effectiveDate', 'DESC']],
      include: [{ model: models.User, as: 'Creator', attributes: ['fullName'] }]
    });

    res.json(capital || { capitalAmount: 2979527, currency: 'ETB' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch paid-up capital' });
  }
};

export const getPaidUpCapitalForDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    // Find the active capital that was effective on or before the given date
    const capital = await models.PaidUpCapital.findOne({
      where: {
        effectiveDate: { [models.Sequelize.Op.lte]: date },
        isActive: true
      },
      order: [['effectiveDate', 'DESC']],
      include: [{ model: models.User, as: 'Creator', attributes: ['fullName'] }]
    });

    res.json(capital || { capitalAmount: 2979527, currency: 'ETB' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch paid-up capital for date' });
  }
};

export const getPaidUpCapitalHistory = async (req, res) => {
  try {
    const history = await models.PaidUpCapital.findAll({
      order: [['effectiveDate', 'DESC']],
      include: [{ model: models.User, as: 'Creator', attributes: ['fullName'] }]
    });

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch capital history' });
  }
};

export const updatePaidUpCapital = [
  body('capitalAmount').isDecimal().withMessage('Invalid capital amount'),
  body('effectiveDate').isDate().withMessage('Invalid date format'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Invalid currency code'),
  handleValidationErrors,

  async (req, res) => {
    const transaction = await models.sequelize.transaction();
    try {
      // Deactivate previous active capital
      await models.PaidUpCapital.update(
        { isActive: false },
        { 
          where: { isActive: true },
          transaction 
        }
      );

      const capitalData = {
        ...req.body,
        created_by: req.user.id,
        isActive: true
      };

      const capital = await models.PaidUpCapital.create(capitalData, { transaction });
      
      // Commit transaction
      await transaction.commit();

      const newCapital = await models.PaidUpCapital.findByPk(capital.id, {
        include: [{ model: models.User, as: 'Creator', attributes: ['fullName'] }]
      });

      res.json(newCapital);
    } catch (error) {
      await transaction.rollback();
      console.error('Error updating paid-up capital:', error);
      res.status(500).json({ error: 'Failed to update paid-up capital' });
    }
  }
];