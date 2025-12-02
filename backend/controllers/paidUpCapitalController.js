import models from '../models/index.js';
import { body, param } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';
import { Op } from 'sequelize';

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

    // Find the capital that was effective on or before the given date
    const capital = await models.PaidUpCapital.findOne({
      where: {
        effectiveDate: { [Op.lte]: date },
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
      const { capitalAmount, effectiveDate, currency, notes } = req.body;
      
      // Check if there's already a capital record for this date
      const existingCapitalForDate = await models.PaidUpCapital.findOne({
        where: { effectiveDate },
        transaction
      });

      if (existingCapitalForDate) {
        // Update the existing record
        await existingCapitalForDate.update({
          capitalAmount,
          currency,
          notes,
          created_by: req.user.id,
          isActive: true
        }, { transaction });
      } else {
        // For backdated entries, we need to handle the timeline properly
        const newEffectiveDate = new Date(effectiveDate);
        const today = new Date();
        
        if (newEffectiveDate > today) {
          // Future date - deactivate current and create new future record
          await models.PaidUpCapital.update(
            { isActive: false },
            { 
              where: { isActive: true },
              transaction 
            }
          );
        } else {
          // Backdated entry - find the capital that was active before this date
          const capitalBeforeNewDate = await models.PaidUpCapital.findOne({
            where: {
              effectiveDate: { [Op.lt]: effectiveDate },
              isActive: true
            },
            order: [['effectiveDate', 'DESC']],
            transaction
          });

          // If the new backdated capital should become active immediately,
          // we need to deactivate the current one
          const currentCapital = await models.PaidUpCapital.findOne({
            where: { isActive: true },
            order: [['effectiveDate', 'DESC']],
            transaction
          });

          if (currentCapital && newEffectiveDate > new Date(currentCapital.effectiveDate)) {
            // New effective date is after current capital's date, so deactivate current
            await currentCapital.update({ isActive: false }, { transaction });
          }
        }

        // Create the new capital record
        await models.PaidUpCapital.create({
          capitalAmount,
          effectiveDate,
          currency,
          notes,
          created_by: req.user.id,
          isActive: true
        }, { transaction });
      }
      
      // Commit transaction
      await transaction.commit();

      // Return the updated capital for the effective date
      const updatedCapital = await models.PaidUpCapital.findOne({
        where: { effectiveDate },
        include: [{ model: models.User, as: 'Creator', attributes: ['fullName'] }]
      });

      res.json(updatedCapital);
    } catch (error) {
      await transaction.rollback();
      console.error('Error updating paid-up capital:', error);
      res.status(500).json({ error: 'Failed to update paid-up capital' });
    }
  }
];

// New endpoint to get capital timeline
export const getCapitalTimeline = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let whereCondition = {};
    if (startDate && endDate) {
      whereCondition.effectiveDate = {
        [Op.between]: [startDate, endDate]
      };
    }

    const timeline = await models.PaidUpCapital.findAll({
      where: whereCondition,
      order: [['effectiveDate', 'ASC']],
      include: [{ model: models.User, as: 'Creator', attributes: ['fullName'] }]
    });

    res.json(timeline);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch capital timeline' });
  }
};