import express from 'express';
import { 
  getPaidUpCapital, 
  getPaidUpCapitalHistory, 
  updatePaidUpCapital ,
   getPaidUpCapitalForDate
} from '../controllers/paidUpCapitalController.js';
import { authenticateToken, requireRole, logActivity } from '../middleware/auth.js';

const router = express.Router();

router.get('/', 
  authenticateToken, 
  logActivity('get_paid_up_capital', 'paid_up_capital'),
  getPaidUpCapital
);
router.get('/for-date', 
  authenticateToken, 
  logActivity('get_paid_up_capital', 'paid_up_capital'),
  getPaidUpCapitalForDate
);

router.get('/history', 
  authenticateToken, 
  logActivity('get_capital_history', 'paid_up_capital'),
  getPaidUpCapitalHistory
);

router.put('/', 
  authenticateToken, 
  requireRole(['admin']),
  logActivity('update_paid_up_capital', 'paid_up_capital'),
  updatePaidUpCapital
);

export default router;