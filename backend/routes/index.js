import express from 'express';
import authRoutes from './auth.js';
import correspondentRoutes from './correspondent.js';
import transactionRoutes from './transactions.js';
import exchangeRateRoutes from './exchangeRates.js';
import balanceItemRoutes from './balanceItems.js';
import paidUpCapitalRoutes from './paidUpCapital.js';
import dailyBalanceRoutes from './dailyBalances.js';
import currencyRoutes from './currencies.js';
import userRoutes from './users.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/correspondent', correspondentRoutes);
router.use('/transactions', transactionRoutes);
router.use('/exchange-rates', exchangeRateRoutes);
router.use('/balance-items', balanceItemRoutes);
router.use('/paid-up-capital', paidUpCapitalRoutes);
router.use('/daily-balances', dailyBalanceRoutes);
router.use('/currencies', currencyRoutes);

export default router;