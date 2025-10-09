import express from 'express';
import { 
  getDailyBalances, 
  getBalanceReports,
  createDailyBalance, 
  updateDailyBalance, 
  deleteDailyBalance,
  submitDailyBalance,
  authorizeDailyBalance,
  bulkImportDailyBalances // NEW
} from '../controllers/dailyBalanceController.js';
import { authenticateToken, requireRole, logActivity } from '../middleware/auth.js';

const router = express.Router();

router.get('/', 
  authenticateToken, 
  logActivity('get_daily_balances', 'daily_balances'),
  getDailyBalances
);

router.get('/reports', 
  authenticateToken, 
  logActivity('get_balance_reports', 'daily_balances'),
  getBalanceReports
);

router.post('/', 
  authenticateToken, 
  requireRole(['maker', 'authorizer', 'admin']),
  logActivity('create_daily_balance', 'daily_balances'),
  createDailyBalance
);

// NEW: Bulk import route
router.post('/bulk-import', 
  authenticateToken, 
  requireRole(['maker', 'authorizer', 'admin']),
  logActivity('bulk_import_daily_balances', 'daily_balances'),
  bulkImportDailyBalances
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

router.patch('/:id/authorize', 
  authenticateToken, 
  requireRole(['authorizer', 'admin']),
  logActivity('authorize_daily_balance', 'daily_balances'),
  authorizeDailyBalance
);

export default router;