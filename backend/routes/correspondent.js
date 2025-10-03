import express from 'express';
import { 
  createBank,
  updateBankLimits,
  getBanks,
  addDailyBalance,
  getBankBalances,
  getLimitsReport,
  getCashCoverReport,
  getActiveAlerts,
  resolveAlert
} from '../controllers/correspondentController.js';
import { authenticateToken, requireRole, logActivity } from '../middleware/auth.js';

const router = express.Router();

// Bank Management
router.post('/banks', 
  authenticateToken, 
  // requireRole(['maker', 'admin']),
  logActivity('create_correspondent_bank', 'correspondent'),
  createBank
);

router.patch('/banks/:id/limits', 
  authenticateToken, 
  // requireRole(['maker', 'admin']),
  logActivity('update_bank_limits', 'correspondent'),
  updateBankLimits
);

router.get('/banks', 
  authenticateToken, 
  logActivity('get_correspondent_banks', 'correspondent'),
  getBanks
);

// Balance Management
router.post('/balances', 
  authenticateToken, 
  // requireRole(['maker', 'authorizer']),
  logActivity('add_daily_balance', 'correspondent'),
  addDailyBalance
);

router.get('/banks/:bankId/balances', 
  authenticateToken, 
  logActivity('get_bank_balances', 'correspondent'),
  getBankBalances
);

// Reports
router.get('/reports/limits', 
  authenticateToken, 
  logActivity('get_limits_report', 'correspondent'),
  getLimitsReport
);

router.get('/reports/cash-cover', 
  authenticateToken, 
  logActivity('get_cash_cover_report', 'correspondent'),
  getCashCoverReport
);

// Alerts
router.get('/alerts', 
  authenticateToken, 
  logActivity('get_active_alerts', 'correspondent'),
  getActiveAlerts
);

router.patch('/alerts/:id/resolve', 
  authenticateToken, 
  // requireRole(['authorizer', 'admin']),
  logActivity('resolve_alert', 'correspondent'),
  resolveAlert
);

export default router;