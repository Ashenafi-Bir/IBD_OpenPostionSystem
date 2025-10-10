import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { transactionService, currencyService } from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import { useForm } from '../hooks/useForm';
import { required } from '../utils/validators';
import { formatCurrency, formatDate, formatNumber } from '../utils/formatters';
import { Plus, CheckCircle, XCircle, Clock, RefreshCw, Send, Edit } from 'lucide-react';
import DatePicker from 'react-datepicker';

const Transactions = () => {
  const { user, hasAnyRole, hasRole } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [currenciesLoading, setCurrenciesLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Load currencies for the dropdown
  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const data = await currencyService.getAll();
        setCurrencies(data || []);
      } catch (err) {
        console.error('Error loading currencies:', err);
        setCurrencies([]);
      } finally {
        setCurrenciesLoading(false);
      }
    };

    loadCurrencies();
  }, []);

  const loadTransactions = useCallback(async (isRefresh = false) => {
    const date = selectedDate.toISOString().split('T')[0];
    try {
      if (!isRefresh) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      const abortController = new AbortController();
      const options = { signal: abortController.signal };

      const transactionList = await transactionService.getList({ date }, options);
      console.log('Raw transactions data from API:', transactionList);
      setTransactions(transactionList || []);
      
      return () => abortController.abort();
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
        console.error('Transactions loading error:', err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleRefresh = () => {
    loadTransactions(true);
  };

  const { values, errors, touched, handleChange, handleBlur, validate, reset } = useForm(
    {
      transactionDate: new Date().toISOString().split('T')[0],
      currencyId: '',
      transactionType: 'purchase',
      amount: '',
      rate: '',
      reference: '',
      description: ''
    },
    {
      currencyId: required('Currency is required'),
      amount: required('Amount is required'),
      rate: required('Rate is required'),
    }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    try {
      // Ensure currencyId is properly formatted as number
      const submitData = {
        ...values,
        currencyId: parseInt(values.currencyId, 10),
        amount: parseFloat(values.amount),
        rate: parseFloat(values.rate)
      };

      console.log('Creating transaction with data:', submitData);
      await transactionService.create(submitData);
      setShowModal(false);
      reset();
      handleRefresh(); // Refresh the list after a successful creation
    } catch (error) {
      console.error('Error creating transaction:', error);
      // Error is handled by the interceptor
    }
  };

  const handleAuthorize = async (id) => {
    try {
      await transactionService.authorize(id);
      handleRefresh(); // Refresh the list after a successful authorization
    } catch (error) {
      console.error('Error authorizing transaction:', error);
      // Error is handled by the interceptor
    }
  };

  const handleSubmitTransaction = async (id) => {
    try {
      await transactionService.submit(id);
      handleRefresh(); // Refresh the list after a successful submission
    } catch (error) {
      console.error('Error submitting transaction:', error);
      // Error is handled by the interceptor
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    reset({
      transactionDate: transaction.transactionDate,
      currencyId: transaction.currency_id?.toString() || '',
      transactionType: transaction.transactionType,
      amount: transaction.amount?.toString() || '',
      rate: transaction.rate?.toString() || '',
      reference: transaction.reference || '',
      description: transaction.description || ''
    });
    setShowModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    try {
      const updateData = {
        ...values,
        currencyId: parseInt(values.currencyId, 10),
        amount: parseFloat(values.amount),
        rate: parseFloat(values.rate)
      };

      await transactionService.update(editingTransaction.id, updateData);
      setShowModal(false);
      setEditingTransaction(null);
      reset();
      handleRefresh();
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  // Get currency info
  const getTransactionCurrencyInfo = (transaction) => {
    if (!transaction) return { code: 'N/A', name: 'N/A' };
    
    console.log('Transaction currency_id:', transaction.currency_id);
    
    // If currency_id is null, we can't look it up
    if (transaction.currency_id === null) {
      return { code: 'MISSING', name: 'Currency not set' };
    }
    
    // Try to find currency by ID
    if (transaction.currency_id && currencies.length > 0) {
      const foundCurrency = currencies.find(currency => 
        currency.id === transaction.currency_id
      );
      if (foundCurrency) {
        return { 
          code: foundCurrency.code, 
          name: foundCurrency.name 
        };
      }
    }
    
    return { code: 'N/A', name: 'N/A' };
  };

  // Check if user can edit the transaction
  const canEditTransaction = (transaction) => {
    if (hasAnyRole(['admin'])) return true;
    if (hasAnyRole(['maker']) && transaction.status === 'draft') return true;
    return false;
  };

  // Check if user can submit the transaction
  const canSubmitTransaction = (transaction) => {
    if (hasAnyRole(['admin'])) return true;
    if (hasAnyRole(['maker']) && transaction.status === 'draft') return true;
    return false;
  };

  // Check if user can authorize the transaction
  const canAuthorizeTransaction = (transaction) => {
    if (hasAnyRole(['admin'])) return true;
    if (hasAnyRole(['authorizer']) && transaction.status === 'submitted') return true;
    return false;
  };

  const transactionColumns = [
    { key: 'transactionDate', title: 'Date', render: (value) => formatDate(value) },
    { 
      key: 'currency', 
      title: 'Currency', 
      render: (value, row) => {
        const currencyInfo = getTransactionCurrencyInfo(row);
        return (
          <div>
            <div><strong>{currencyInfo.code}</strong></div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {currencyInfo.name}
            </div>
          </div>
        );
      }
    },
    { key: 'transactionType', title: 'Type', render: (value) => (
      <span style={{ 
        color: value === 'purchase' ? 'var(--success-color)' : 'var(--error-color)',
        fontWeight: '600'
      }}>
        {value.toUpperCase()}
      </span>
    )},
    { key: 'amount', title: 'Amount', render: (value) => formatCurrency(value) },
    { key: 'rate', title: 'Rate', render: (value) => formatNumber(value, 4) },
    { key: 'reference', title: 'Reference' },
    { key: 'status', title: 'Status', render: (value) => (
      <span style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.25rem',
        color: value === 'authorized' ? 'var(--success-color)' : 
              value === 'rejected' ? 'var(--error-color)' : 
              value === 'submitted' ? 'var(--warning-color)' : 'var(--text-secondary)'
      }}>
        {value === 'authorized' ? <CheckCircle size={16} /> : 
          value === 'rejected' ? <XCircle size={16} /> : 
          value === 'submitted' ? <Clock size={16} /> : <Clock size={16} />}
        {value.charAt(0).toUpperCase() + value.slice(1)}
      </span>
    )},
    {
      key: 'actions',
      title: 'Actions',
      render: (value, row) => (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Edit Button - for draft transactions */}
          {canEditTransaction(row) && (
            <button 
              onClick={() => handleEdit(row)}
              className="btn btn-secondary"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
              title="Edit Transaction"
            >
              <Edit size={14} />
            </button>
          )}
          
          {/* Submit Button - for draft transactions by makers */}
          {canSubmitTransaction(row) && (
            <button 
              onClick={() => handleSubmitTransaction(row.id)}
              className="btn btn-warning"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
              title="Submit for Authorization"
            >
              <Send size={14} />
            </button>
          )}
          
          {/* Authorize Button - for submitted transactions by authorizers */}
          {canAuthorizeTransaction(row) && (
            <button 
              onClick={() => handleAuthorize(row.id)}
              className="btn btn-success"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
              title="Authorize Transaction"
            >
              <CheckCircle size={14} />
            </button>
          )}
        </div>
      )
    }
  ];

  if (loading && !refreshing) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="text-red-500 mb-4">Error loading transactions: {error}</div>
        <button 
          onClick={handleRefresh}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Transactions</h1>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="form-input"
          />
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-secondary"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button 
            onClick={() => {
              setEditingTransaction(null);
              setShowModal(true);
            }}
            className="btn btn-primary"
            disabled={!hasAnyRole(['maker', 'authorizer', 'admin'])}
          >
            <Plus size={16} />
            New Transaction
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <DataTable
        columns={transactionColumns}
        data={transactions}
        loading={refreshing}
        emptyMessage="No transactions found for selected date"
      />

      {/* Create/Edit Transaction Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingTransaction(null);
          reset();
        }}
        title={editingTransaction ? "Edit Transaction" : "Create New Transaction"}
      >
        <form onSubmit={editingTransaction ? handleUpdate : handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Transaction Date</label>
              <input
                type="date"
                name="transactionDate"
                value={values.transactionDate}
                onChange={(e) => handleChange('transactionDate', e.target.value)}
                onBlur={() => handleBlur('transactionDate')}
                className="form-input"
                disabled={editingTransaction && editingTransaction.status !== 'draft'}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Currency *</label>
              <select
                name="currencyId"
                value={values.currencyId}
                onChange={(e) => handleChange('currencyId', e.target.value)}
                onBlur={() => handleBlur('currencyId')}
                className="form-input"
                disabled={currenciesLoading || (editingTransaction && editingTransaction.status !== 'draft')}
              >
                <option value="">Select Currency</option>
                {currencies.map(currency => (
                  <option key={currency.id} value={currency.id}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
              {touched.currencyId && errors.currencyId && (
                <div className="form-error">{errors.currencyId}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Transaction Type</label>
              <select
                name="transactionType"
                value={values.transactionType}
                onChange={(e) => handleChange('transactionType', e.target.value)}
                className="form-input"
                disabled={editingTransaction && editingTransaction.status !== 'draft'}
              >
                <option value="purchase">Purchase</option>
                <option value="sale">Sale</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Amount *</label>
              <input
                type="number"
                name="amount"
                value={values.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                onBlur={() => handleBlur('amount')}
                className="form-input"
                placeholder="0.00"
                step="0.01"
                min="0"
                disabled={editingTransaction && editingTransaction.status !== 'draft'}
              />
              {touched.amount && errors.amount && (
                <div className="form-error">{errors.amount}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Exchange Rate *</label>
              <input
                type="number"
                name="rate"
                value={values.rate}
                onChange={(e) => handleChange('rate', e.target.value)}
                onBlur={() => handleBlur('rate')}
                className="form-input"
                placeholder="0.0000"
                step="0.0001"
                min="0"
                disabled={editingTransaction && editingTransaction.status !== 'draft'}
              />
              {touched.rate && errors.rate && (
                <div className="form-error">{errors.rate}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Reference</label>
              <input
                type="text"
                name="reference"
                value={values.reference}
                onChange={(e) => handleChange('reference', e.target.value)}
                className="form-input"
                placeholder="Reference number"
                disabled={editingTransaction && editingTransaction.status !== 'draft'}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              name="description"
              value={values.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="form-input"
              rows={3}
              placeholder="Transaction description"
              disabled={editingTransaction && editingTransaction.status !== 'draft'}
            />
          </div>

          {editingTransaction && (
            <div className="alert alert-info">
              <strong>Transaction Status:</strong> {editingTransaction.status}
              <br />
              {editingTransaction.status !== 'draft' && (
                <small>This transaction can no longer be edited as it has been submitted for authorization.</small>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditingTransaction(null);
                reset();
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingTransaction ? 'Update Transaction' : 'Create Transaction'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Transactions;