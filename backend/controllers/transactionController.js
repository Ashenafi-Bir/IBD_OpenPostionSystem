import models from '../models/index.js';
import { body, param } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';
import { Op } from 'sequelize';

export const createTransaction = [
  body('transactionDate').isDate().withMessage('Invalid date format'),
  body('currencyId').isInt().withMessage('Invalid currency ID'),
  body('transactionType').isIn(['purchase', 'sale']).withMessage('Invalid transaction type'),
  body('amount').isDecimal().withMessage('Invalid amount'),
  body('rate').isDecimal().withMessage('Invalid rate'),
  handleValidationErrors,

  async (req, res) => {
    const transaction = await models.sequelize.transaction();
    
    try {
      console.log('📥 Received transaction data:', req.body);
      console.log('👤 User creating transaction:', req.user.id);
      
      const transactionData = {
        transactionDate: req.body.transactionDate,
        currency_id: req.body.currencyId,
        transactionType: req.body.transactionType,
        amount: req.body.amount,
        rate: req.body.rate,
        reference: req.body.reference,
        description: req.body.description,
        created_by: req.user.id,
        status: req.user.role === 'authorizer' ? 'authorized' : 'draft'
      };

      console.log('🔄 Mapped transaction data:', transactionData);

      // Create the transaction
      const newTransaction = await models.FCYTransaction.create(transactionData, { transaction });
      
      // If transaction is immediately authorized, update daily balances
      if (newTransaction.status === 'authorized') {
        await updateDailyBalancesFromTransaction(newTransaction, req.user.id, transaction);
      }

      // Commit the transaction
      await transaction.commit();
      
      // Reload with included currency data
      const transactionWithCurrency = await models.FCYTransaction.findByPk(newTransaction.id, {
        include: [
          {
            model: models.Currency,
            attributes: ['id', 'code', 'name']
          }
        ]
      });
      
      console.log('✅ Transaction created successfully');
      res.status(201).json(transactionWithCurrency);
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error creating transaction:', error);
      res.status(500).json({ 
        error: 'Failed to create transaction',
        details: error.message 
      });
    }
  }
];

export const authorizeTransaction = [
  param('id').isInt().withMessage('Invalid transaction ID'),
  handleValidationErrors,

  async (req, res) => {
    const dbTransaction = await models.sequelize.transaction();
    
    try {
      const transaction = await models.FCYTransaction.findByPk(req.params.id);
      
      if (!transaction) {
        await dbTransaction.rollback();
        return res.status(404).json({ error: 'Transaction not found' });
      }

      if (transaction.status !== 'submitted') {
        await dbTransaction.rollback();
        return res.status(400).json({ error: 'Only submitted transactions can be authorized' });
      }

      // Update transaction status
      await transaction.update({
        status: 'authorized',
        authorized_by: req.user.id
      }, { transaction: dbTransaction });

      // Update daily balances based on the authorized transaction
      await updateDailyBalancesFromTransaction(transaction, req.user.id, dbTransaction);

      // Commit the transaction
      await dbTransaction.commit();

      res.json(transaction);
    } catch (error) {
      await dbTransaction.rollback();
      console.error('Error authorizing transaction:', error);
      res.status(500).json({ error: 'Failed to authorize transaction' });
    }
  }
];

// Helper function to update daily balances based on transaction
async function updateDailyBalancesFromTransaction(transaction, userId, dbTransaction) {
  try {
    console.log('🔄 Updating daily balances for transaction:', transaction.id);
    
    // Get the cash on hand balance item
    const cashOnHandItem = await models.BalanceItem.findOne({
      where: { code: 'CURRENCY_ON_HAND' }
    }, { transaction: dbTransaction });

    if (!cashOnHandItem) {
      throw new Error('Cash on hand balance item not found');
    }

    // Check for existing cash on hand entry for today
    const todayCashBalance = await models.DailyBalance.findOne({
      where: {
        balanceDate: transaction.transactionDate,
        currency_id: transaction.currency_id,
        item_id: cashOnHandItem.id,
        status: 'authorized'
      }
    }, { transaction: dbTransaction });

    // Determine the starting amount based on today's or yesterday's balance
    let startingAmount = 0;

    if (todayCashBalance) {
      startingAmount = parseFloat(todayCashBalance.amount);
      console.log('ℹ️ Using today\'s cash balance:', startingAmount);
    } else {
      // Get yesterday's balance if today's is not available
      const yesterday = new Date(transaction.transactionDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const yesterdayBalance = await models.DailyBalance.findOne({
        where: {
          balanceDate: yesterdayStr,
          currency_id: transaction.currency_id,
          item_id: cashOnHandItem.id,
          status: 'authorized'
        }
      }, { transaction: dbTransaction });

      startingAmount = yesterdayBalance ? parseFloat(yesterdayBalance.amount) : 0;
      console.log('ℹ️ Using yesterday\'s cash balance:', startingAmount);
    }

    // Calculate new cash on hand amount based on transaction type
    const transactionAmount = parseFloat(transaction.amount);
    let newAmount = startingAmount;

    if (transaction.transactionType === 'purchase') {
      newAmount += transactionAmount; // Add purchase amount
    } else if (transaction.transactionType === 'sale') {
      newAmount -= transactionAmount; // Subtract sale amount
    }

    if (todayCashBalance) {
      // Update existing balance for today
      await todayCashBalance.update({
        amount: newAmount,
        status: 'authorized',
        authorized_by: userId
      }, { transaction: dbTransaction });
      console.log(`✅ Updated cash on hand balance for today: ${startingAmount} -> ${newAmount}`);
    } else {
      // Create a new balance record for today
      await models.DailyBalance.create({
        balanceDate: transaction.transactionDate,
        currency_id: transaction.currency_id,
        item_id: cashOnHandItem.id,
        amount: newAmount,
        status: 'authorized',
        created_by: userId,
        authorized_by: userId
      }, { transaction: dbTransaction });
      console.log(`✅ Created new cash on hand balance for today: ${newAmount}`);
    }

    // Update related balances if necessary
    await updateRelatedBalances(transaction, userId, dbTransaction);

  } catch (error) {
    console.error('❌ Error updating daily balances:', error);
    throw error;
  }
}

// Helper function to update other related balance items
async function updateRelatedBalances(transaction, userId, dbTransaction) {
  try {
    const transactionAmount = parseFloat(transaction.amount);
    
    // Update "Due from Banks" for purchases (asset increase)
    if (transaction.transactionType === 'purchase') {
      const dueFromBanksItem = await models.BalanceItem.findOne({
        where: { code: 'DUE_FROM_BANKS' }
      }, { transaction: dbTransaction });

      if (dueFromBanksItem) {
        await updateOrCreateBalance(
          transaction.transactionDate,
          transaction.currency_id,
          dueFromBanksItem.id,
          transactionAmount, // Increase due from banks
          userId,
          dbTransaction
        );
      }
    }

    // Update "Due to Banks" for sales (liability decrease)
    if (transaction.transactionType === 'sale') {
      const dueToBanksItem = await models.BalanceItem.findOne({
        where: { code: 'DUE_TO_BANKS' }
      }, { transaction: dbTransaction });

      if (dueToBanksItem) {
        await updateOrCreateBalance(
          transaction.transactionDate,
          transaction.currency_id,
          dueToBanksItem.id,
          -transactionAmount, // Decrease due to banks
          userId,
          dbTransaction
        );
      }
    }

  } catch (error) {
    console.error('❌ Error updating related balances:', error);
    // Don't throw here - we don't want to fail the main transaction if related balances fail
  }
}

// Generic function to update or create a balance
async function updateOrCreateBalance(date, currencyId, itemId, amount, userId, dbTransaction) {
  const existingBalance = await models.DailyBalance.findOne({
    where: {
      balanceDate: date,
      currency_id: currencyId,
      item_id: itemId
    }
  }, { transaction: dbTransaction });

  if (existingBalance) {
    const currentAmount = parseFloat(existingBalance.amount);
    const newAmount = currentAmount + amount;
    
    await existingBalance.update({
      amount: newAmount,
      status: 'authorized',
      authorized_by: userId
    }, { transaction: dbTransaction });
  } else {
    await models.DailyBalance.create({
      balanceDate: date,
      currency_id: currencyId,
      item_id: itemId,
      amount: amount,
      status: 'authorized',
      created_by: userId,
      authorized_by: userId
    }, { transaction: dbTransaction });
  }
}

export const getTransactions = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date query parameter is required' });

    const transactions = await models.FCYTransaction.findAll({
      where: { transactionDate: date },
      include: [
        {
          model: models.Currency,
          attributes: ['id', 'code', 'name']
        }
      ]
    });

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};
// Submit transaction (maker action)
export const submitTransaction = [
  param('id').isInt().withMessage('Invalid transaction ID'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const transaction = await models.FCYTransaction.findByPk(req.params.id);
      
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      if (transaction.status !== 'draft') {
        return res.status(400).json({ error: 'Only draft transactions can be submitted' });
      }

      await transaction.update({ status: 'submitted' });
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ error: 'Failed to submit transaction' });
    }
  }
];

// Update transaction
export const updateTransaction = [
  param('id').isInt().withMessage('Invalid transaction ID'),
  body('currencyId').isInt().withMessage('Invalid currency ID'),
  body('transactionType').isIn(['purchase', 'sale']).withMessage('Invalid transaction type'),
  body('amount').isDecimal().withMessage('Invalid amount'),
  body('rate').isDecimal().withMessage('Invalid rate'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const transaction = await models.FCYTransaction.findByPk(req.params.id);
      
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      if (transaction.status !== 'draft') {
        return res.status(400).json({ error: 'Only draft transactions can be updated' });
      }

      const updateData = {
        ...req.body,
        currency_id: req.body.currencyId,
        amount: req.body.amount,
        rate: req.body.rate
      };

      await transaction.update(updateData);
      
      const updatedTransaction = await models.FCYTransaction.findByPk(transaction.id, {
        include: [
          {
            model: models.Currency,
            attributes: ['id', 'code', 'name']
          }
        ]
      });

      res.json(updatedTransaction);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update transaction' });
    }
  }
];