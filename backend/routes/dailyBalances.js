import express from 'express';
import { 
  getDailyBalances, 
  createDailyBalance, 
  updateDailyBalance, 
  deleteDailyBalance,
  submitDailyBalance,
//   authorizeBalance
} from '../controllers/dailyBalanceController.js';
import { authenticateToken, requireRole, logActivity } from '../middleware/auth.js';

const router = express.Router();

// In your daily balance routes
router.get('/', 
  authenticateToken, 
  logActivity('get_daily_balances', 'daily_balances'),
  getDailyBalances  // Use the new function that includes related data
);

router.post('/', 
  authenticateToken, 
  requireRole(['maker', 'authorizer', 'admin']),
  logActivity('create_daily_balance', 'daily_balances'),
  createDailyBalance
);

router.put('/:id', 
  authenticateToken, 
  requireRole(['maker', 'authorizer', 'admin']),
  logActivity('update_daily_balance', 'daily_balances'),
  updateDailyBalance
);

router.delete('/:id', 
  authenticateToken, 
  requireRole(['maker', 'authorizer', 'admin']),
  logActivity('delete_daily_balance', 'daily_balances'),
  deleteDailyBalance
);

router.patch('/:id/submit', 
  authenticateToken, 
  requireRole(['maker', 'authorizer', 'admin']),
  logActivity('submit_daily_balance', 'daily_balances'),
  submitDailyBalance
);

// router.patch('/:id/authorize', 
//   authenticateToken, 
//   requireRole(['authorizer', 'admin']),
//   logActivity('authorize_daily_balance', 'daily_balances'),
//   authorizeBalance
// );

export default router;