import express from 'express';
import { 
  getBalanceItems, 
  createBalanceItem, 
  updateBalanceItem, 
  deleteBalanceItem 
} from '../controllers/balanceItemController.js';
import { authenticateToken, requireRole, logActivity } from '../middleware/auth.js';

const router = express.Router();

router.get('/', 
  authenticateToken, 
  logActivity('get_balance_items', 'balance_items'),
  getBalanceItems
);

router.post('/', 
  authenticateToken, 
  requireRole(['admin']),
  logActivity('create_balance_item', 'balance_items'),
  createBalanceItem
);

router.put('/:id', 
  authenticateToken, 
  requireRole(['admin']),
  logActivity('update_balance_item', 'balance_items'),
  updateBalanceItem
);

router.delete('/:id', 
  authenticateToken, 
  requireRole(['admin']),
  logActivity('delete_balance_item', 'balance_items'),
  deleteBalanceItem
);

export default router;