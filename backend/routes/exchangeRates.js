import express from 'express';
import { 
  getExchangeRates, 
  createExchangeRate, 
  updateExchangeRate, 
  deleteExchangeRate 
} from '../controllers/exchangeRateController.js';
import { authenticateToken, requireRole, logActivity } from '../middleware/auth.js';

const router = express.Router();

router.get('/', 
  authenticateToken, 
  logActivity('get_exchange_rates', 'exchange_rates'),
  getExchangeRates
);

router.post('/', 
  authenticateToken, 
  requireRole(['maker', 'authorizer', 'admin']),
  logActivity('create_exchange_rate', 'exchange_rates'),
  createExchangeRate
);

router.put('/:id', 
  authenticateToken, 
  requireRole(['maker', 'authorizer', 'admin']),
  logActivity('update_exchange_rate', 'exchange_rates'),
  updateExchangeRate
);

router.delete('/:id', 
  authenticateToken, 
  requireRole(['admin']),
  logActivity('delete_exchange_rate', 'exchange_rates'),
  deleteExchangeRate
);

export default router;