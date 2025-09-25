import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { transactionService } from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import { useForm } from '../hooks/useForm';
import { required } from '../utils/validators';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Plus, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import DatePicker from 'react-datepicker';

const Transactions = () => {
  const { hasRole } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [transactions, setTransactions] = useState([]);

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
      setTransactions(transactionList);
      
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
      currencyId: required(),
      amount: required(),
      rate: required(),
    }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    try {
      await transactionService.create(values);
      setShowModal(false);
      reset();
      handleRefresh(); // Refresh the list after a successful creation
    } catch (error) {
      // Error is handled by the interceptor
    }
  };

  const handleAuthorize = async (id) => {
    try {
      await transactionService.authorize(id);
      handleRefresh(); // Refresh the list after a successful authorization
    } catch (error) {
      // Error is handled by the interceptor
    }
  };
  
  const transactionColumns = [
    { key: 'transactionDate', title: 'Date', render: (value) => formatDate(value) },
    { key: 'currency.code', title: 'Currency', render: (value, row) => row.currency?.code },
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
              value === 'rejected' ? 'var(--error-color)' : 'var(--warning-color)'
      }}>
        {value === 'authorized' ? <CheckCircle size={16} /> : 
          value === 'rejected' ? <XCircle size={16} /> : <Clock size={16} />}
        {value.charAt(0).toUpperCase() + value.slice(1)}
      </span>
    )},
    ...(hasRole(['authorizer', 'admin']) ? [{
      key: 'actions',
      title: 'Actions',
      render: (value, row) => (
        row.status === 'submitted' && (
          <button 
            onClick={() => handleAuthorize(row.id)}
            className="btn btn-success"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
          >
            Authorize
          </button>
        )
      )
    }] : [])
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
          <DatePicker
            selected={selectedDate}
            onChange={setSelectedDate}
            className="form-input"
            dateFormat="yyyy-MM-dd"
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
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
            disabled={!hasRole(['maker', 'authorizer'])}
          >
            <Plus size={16} />
            New Transaction
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <DataTable
        columns={transactionColumns}
        data={transactions || []}
        loading={refreshing}
      />

      {/* Create Transaction Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          reset();
        }}
        title="Create New Transaction"
      >
        <form onSubmit={handleSubmit}>
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
              />
            </div>

            <div className="form-group">
              <label className="form-label">Currency</label>
              <select
                name="currencyId"
                value={values.currencyId}
                onChange={(e) => handleChange('currencyId', e.target.value)}
                onBlur={() => handleBlur('currencyId')}
                className="form-input"
              >
                <option value="">Select Currency</option>
                <option value="1">USD</option>
                <option value="2">EUR</option>
                <option value="3">GBP</option>
                <option value="4">JPY</option>
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
              >
                <option value="purchase">Purchase</option>
                <option value="sale">Sale</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Amount</label>
              <input
                type="number"
                name="amount"
                value={values.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                onBlur={() => handleBlur('amount')}
                className="form-input"
                placeholder="0.00"
                step="0.01"
              />
              {touched.amount && errors.amount && (
                <div className="form-error">{errors.amount}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Exchange Rate</label>
              <input
                type="number"
                name="rate"
                value={values.rate}
                onChange={(e) => handleChange('rate', e.target.value)}
                onBlur={() => handleBlur('rate')}
                className="form-input"
                placeholder="0.0000"
                step="0.0001"
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
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                reset();
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Transaction
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Transactions;