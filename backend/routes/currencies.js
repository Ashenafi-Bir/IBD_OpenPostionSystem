import express from 'express';
import { 
  getCurrencies, 
  getCurrencyById, 
  createCurrency, 
  updateCurrency, 
  deleteCurrency 
} from '../controllers/currencyController.js';
import { authenticateToken, requireRole, logActivity } from '../middleware/auth.js';

const router = express.Router();

router.get('/', 
  authenticateToken, 
  logActivity('get_currencies', 'currencies'),
  getCurrencies
);

router.get('/:id', 
  authenticateToken, 
  logActivity('get_currency', 'currencies'),
  getCurrencyById
);

router.post('/', 
  authenticateToken, 
  requireRole(['admin']),
  logActivity('create_currency', 'currencies'),
  createCurrency
);

router.put('/:id', 
  authenticateToken, 
  requireRole(['admin']),
  logActivity('update_currency', 'currencies'),
  updateCurrency
);

router.delete('/:id', 
  authenticateToken, 
  requireRole(['admin']),
  logActivity('delete_currency', 'currencies'),
  deleteCurrency
);

export default router;