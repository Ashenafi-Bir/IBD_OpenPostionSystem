import express from 'express';
import { 
  getLimitsReport, 
  getCashCoverReport,
  createCorrespondentBalance 
} from '../controllers/correspondentController.js';
import { authenticateToken, requireRole, logActivity } from '../middleware/auth.js';

const router = express.Router();

router.get('/limits', 
  authenticateToken, 
  logActivity('get_limits_report', 'correspondent'),
  getLimitsReport
);

router.get('/cash-cover', 
  authenticateToken, 
  logActivity('get_cash_cover_report', 'correspondent'),
  getCashCoverReport
);

router.post('/balances', 
  authenticateToken, 
  requireRole(['maker', 'authorizer']),
  logActivity('create_correspondent_balance', 'correspondent'),
  createCorrespondentBalance
);

export default router;