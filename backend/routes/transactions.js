// routes/transaction.js
import express from 'express';
import { authenticateToken, requireRole, logActivity } from '../middleware/auth.js';
import { 
  createTransaction, 
  authorizeTransaction, 
  getTransactions,
  submitTransaction,
  updateTransaction
} from '../controllers/transactionController.js';

const router = express.Router();

// Create transaction
router.post(
  '/', 
  authenticateToken, 
  requireRole(['maker', 'authorizer', 'admin']),
  logActivity('create_transaction', 'transactions'),
  createTransaction
);

// Get transactions by date
router.get(
  '/', 
  authenticateToken, 
  requireRole(['maker', 'authorizer', 'admin']),
  logActivity('get_transactions', 'transactions'),
  getTransactions
);

// Submit transaction (maker action - move from draft to submitted)
router.patch(
  '/:id/submit', 
  authenticateToken, 
  requireRole(['maker', 'admin']),
  logActivity('submit_transaction', 'transactions'),
  submitTransaction
);

// Authorize transaction (authorizer action - move from submitted to authorized)
router.patch(
  '/:id/authorize', 
  authenticateToken, 
  requireRole(['authorizer', 'admin']),
  logActivity('authorize_transaction', 'transactions'),
  authorizeTransaction
);

// Update transaction (only draft transactions can be updated)
router.put(
  '/:id', 
  authenticateToken, 
  requireRole(['maker', 'admin']),
  logActivity('update_transaction', 'transactions'),
  updateTransaction
);

export default router;