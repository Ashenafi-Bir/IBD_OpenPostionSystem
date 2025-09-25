import express from 'express';
import { 
  calculateCashOnHand, 
  getTotalsReport, 
  getPositionReport,
  createDailyBalance,
  authorizeBalance
} from '../controllers/balanceController.js';
import { authenticateToken, requireRole, logActivity } from '../middleware/auth.js';

const router = express.Router();

router.get('/cash-on-hand/:currency', 
  authenticateToken, 
  logActivity('calculate_cash_on_hand', 'balances'),
  calculateCashOnHand
);

router.get('/totals', 
  authenticateToken, 
  logActivity('get_totals_report', 'balances'),
  getTotalsReport
);

router.get('/position', 
  authenticateToken, 
  logActivity('get_position_report', 'balances'),
  getPositionReport
);

router.post('/', 
  authenticateToken, 
  requireRole(['maker', 'authorizer']),
  logActivity('create_balance', 'balances'),
  createDailyBalance
);

router.patch('/:id/authorize', 
  authenticateToken, 
  requireRole(['authorizer', 'admin']),
  logActivity('authorize_balance', 'balances'),
  authorizeBalance
);

export default router;