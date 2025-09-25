// routes/transaction.js
import express from 'express';
import { authenticateToken, requireRole, logActivity } from '../middleware/auth.js';
import { createTransaction, authorizeTransaction, getTransactions } from '../controllers/transactionController.js';

const router = express.Router();

// Create transaction
router.post(
  '/', 
  authenticateToken, 
  requireRole(['maker', 'authorizer']),
  logActivity('create_transaction', 'transactions'),
  createTransaction
);

// Authorize transaction
router.patch(
  '/:id/authorize', 
  authenticateToken, 
  requireRole(['authorizer', 'admin']),
  logActivity('authorize_transaction', 'transactions'),
  authorizeTransaction
);

// GET transactions by date
router.get(
  '/', 
  authenticateToken, 
  requireRole(['maker', 'authorizer', 'admin']),
  logActivity('get_transactions', 'transactions'),
  getTransactions
);

export default router;
