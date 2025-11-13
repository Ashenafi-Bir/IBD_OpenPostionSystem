import models from '../models/index.js';
import { body, param } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';

export const getBalanceItems = async (req, res) => {
  try {
    const items = await models.BalanceItem.findAll({
      where: { isActive: true },
      order: [['category', 'ASC'], ['displayOrder', 'ASC']]
    });

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch balance items' });
  }
};

export const createBalanceItem = [
  body('code').notEmpty().withMessage('Code is required'),
  body('name').notEmpty().withMessage('Name is required'),
  body('category').isIn(['asset', 'liability', 'memo_asset', 'memo_liability']).withMessage('Invalid category'),
  body('balanceType').isIn(['on_balance_sheet', 'off_balance_sheet']).withMessage('Invalid balance type'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const itemData = {
        ...req.body,
        created_by: req.user.id
      };

      const existingItem = await models.BalanceItem.findOne({
        where: { code: itemData.code }
      });

      if (existingItem) {
        return res.status(400).json({ error: 'Balance item with this code already exists' });
      }

      const item = await models.BalanceItem.create(itemData);
      res.status(201).json(item);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create balance item' });
    }
  }
];

export const updateBalanceItem = [
  param('id').isInt().withMessage('Invalid item ID'),
  body('category').optional().isIn(['asset', 'liability', 'memo_asset', 'memo_liability']).withMessage('Invalid category'),
  body('balanceType').optional().isIn(['on_balance_sheet', 'off_balance_sheet']).withMessage('Invalid balance type'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const item = await models.BalanceItem.findByPk(req.params.id);
      
      if (!item) {
        return res.status(404).json({ error: 'Balance item not found' });
      }

      await item.update(req.body);
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update balance item' });
    }
  }
];

export const deleteBalanceItem = [
  param('id').isInt().withMessage('Invalid item ID'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const item = await models.BalanceItem.findByPk(req.params.id);
      
      if (!item) {
        return res.status(404).json({ error: 'Balance item not found' });
      }

      // Check if item is used in daily balances
      const usedInBalances = await models.DailyBalance.findOne({
        where: { item_id: item.id }
      });

      if (usedInBalances) {
        return res.status(400).json({ error: 'Cannot delete item that is used in balance records' });
      }

      await item.update({ isActive: false });
      res.json({ message: 'Balance item deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete balance item' });
    }
  }
];