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
    try {
      // Deactivate previous active capital
      await models.PaidUpCapital.update(
        { isActive: false },
        { where: { isActive: true } }
      );

      const capitalData = {
        ...req.body,
        created_by: req.user.id,
        isActive: true
      };

      const capital = await models.PaidUpCapital.create(capitalData);
      const newCapital = await models.PaidUpCapital.findByPk(capital.id, {
        include: [{ model: models.User, as: 'Creator', attributes: ['fullName'] }]
      });

      res.json(newCapital);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update paid-up capital' });
    }
  }
];