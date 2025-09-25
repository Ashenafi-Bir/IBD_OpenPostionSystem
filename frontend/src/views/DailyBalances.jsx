import React, { useState, useEffect, useMemo } from 'react';
import { dailyBalanceService, balanceItemService, currencyService  } from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import { useForm } from '../hooks/useForm';
import { required, number, composeValidators } from '../utils/validators';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Plus, Edit, Trash2, CheckCircle, Clock, Send, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const DailyBalances = () => {
  const { hasRole } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingBalance, setEditingBalance] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currencies, setCurrencies] = useState([]);
  const [currenciesLoading, setCurrenciesLoading] = useState(true);

  // Data state
  const [balances, setBalances] = useState([]);
  const [balanceItems, setBalanceItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const { values, errors, touched, handleChange, handleBlur, validate, reset } = useForm(
    {
      balanceDate: new Date().toISOString().split('T')[0],
      currencyId: '',
      itemId: '',
      amount: ''
    },
    {
      currencyId: required('Currency is required'),
      itemId: required('Balance item is required'),
      amount: composeValidators(required('Amount is required'), number('Must be a number'))
    }
  );

  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const data = await currencyService.getAll();
        setCurrencies(data);
      } catch (err) {
        console.error('Error loading currencies:', err);
      } finally {
        setCurrenciesLoading(false);
      }
    };

    loadCurrencies();
  }, []);

  // Enhanced function to get balance item name with debugging
  const getBalanceItemName = (balance) => {
    if (!balance) return 'N/A';
    
    // Try all possible property name variations
    const itemName = 
      balance.balanceItem?.name ||
      balance.item?.name ||
      balance.balance_item?.name ||
      balance.balanceItemName ||
      balance.itemName ||
      balance.name;
    
    console.log('Balance object:', balance);
    console.log('Attempting to find item name. Found:', itemName);
    
    return itemName || 'N/A';
  };

  // Fetch balances like Dashboard
  const loadBalances = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      const abortController = new AbortController();
      const options = { signal: abortController.signal };

      // Load balances
      const data = await dailyBalanceService.getBalances(
        selectedDate.toISOString().split('T')[0],
        options
      );
      
      console.log('Raw balances data from API:', data);
      setBalances(data || []);

      // Load balance items (static list)
      const items = await balanceItemService.getItems(options);
      console.log('Balance items from API:', items);
      setBalanceItems(items || []);

      return () => abortController.abort();
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('DailyBalances fetch error:', err);
        setError(err.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBalances();
  }, [selectedDate]);

  const groupedBalances = useMemo(() => {
    if (!balances || balances.length === 0) return {};
    
    console.log('Grouping balances:', balances);
    
    return balances.reduce((acc, balance) => {
      const currency = balance.currency?.code || balance.currencyCode || 'Unknown';
      if (!acc[currency]) acc[currency] = [];
      acc[currency].push(balance);
      return acc;
    }, {});
  }, [balances]);

  // Enhanced function to get item ID from balance with all possible variations
  const getBalanceItemId = (balance) => {
    if (!balance) return '';
    
    return (
      balance.item_id?.toString() ||
      balance.itemId?.toString() ||
      balance.balanceItem?.id?.toString() ||
      balance.balance_item_id?.toString() ||
      balance.balanceItemId?.toString() ||
      ''
    );
  };

  // Enhanced function to get currency ID from balance with all possible variations
  const getBalanceCurrencyId = (balance) => {
    if (!balance) return '';
    
    return (
      balance.currency_id?.toString() ||
      balance.currencyId?.toString() ||
      balance.currency?.id?.toString() ||
      ''
    );
  };

  // Refresh function
  const refreshBalances = () => {
    loadBalances(true);
  };

  // CRUD Handlers
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    try {
      if (editingBalance) {
        await dailyBalanceService.update(editingBalance.id, { amount: values.amount });
      } else {
        await dailyBalanceService.create(values);
      }
      
      setShowModal(false);
      setEditingBalance(null);
      reset();
      refreshBalances();
    } catch (error) {
      console.error('Error submitting balance:', error);
    }
  };

  const handleEdit = (balance) => {
    if (!balance) return;
    
    console.log('Editing balance:', balance);
    
    setEditingBalance(balance);
    reset({
      balanceDate: balance.balanceDate || selectedDate.toISOString().split('T')[0],
      currencyId: getBalanceCurrencyId(balance),
      itemId: getBalanceItemId(balance),
      amount: balance.amount?.toString() || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this balance?')) {
      try {
        await dailyBalanceService.delete(id);
        refreshBalances();
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleSubmitBalance = async (id) => {
    try {
      await dailyBalanceService.submit(id);
      refreshBalances();
    } catch (error) {
      console.error(error);
    }
  };

  const handleAuthorize = async (id) => {
    try {
      await dailyBalanceService.authorize(id);
      refreshBalances();
    } catch (error) {
      console.error(error);
    }
  };

  const balanceColumns = [
    { 
      key: 'item', 
      title: 'Item', 
      render: (value, row) => {
        const itemName = getBalanceItemName(row);
        console.log('Rendering item for row:', row, 'Item name:', itemName);
        return itemName;
      }
    },
    { 
      key: 'amount', 
      title: 'Amount', 
      render: (value) => formatCurrency(value) 
    },
    {
      key: 'status',
      title: 'Status',
      render: (value) => (
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          color: value === 'authorized' ? 'var(--success-color)' :
                 value === 'submitted' ? 'var(--warning-color)' : 'var(--text-secondary)'
        }}>
          {value === 'authorized' ? <CheckCircle size={16} /> :
           value === 'submitted' ? <Send size={16} /> : <Clock size={16} />}
          {value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Draft'}
        </span>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value, row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => handleEdit(row)} 
            className="btn" 
            style={{ padding: '0.25rem', background: 'none' }} 
            disabled={row.status === 'authorized' && !hasRole(['admin'])}
          >
            <Edit size={16} />
          </button>
          {row.status === 'draft' && (
            <button 
              onClick={() => handleSubmitBalance(row.id)} 
              className="btn" 
              style={{ padding: '0.25rem', background: 'none' }}
            >
              <Send size={16} />
            </button>
          )}
          {row.status === 'submitted' && hasRole(['authorizer', 'admin']) && (
            <button 
              onClick={() => handleAuthorize(row.id)} 
              className="btn" 
              style={{ padding: '0.25rem', background: 'none', color: 'var(--success-color)' }}
            >
              <CheckCircle size={16} />
            </button>
          )}
          <button 
            onClick={() => handleDelete(row.id)} 
            className="btn" 
            style={{ padding: '0.25rem', background: 'none' }} 
            disabled={row.status === 'authorized' && !hasRole(['admin'])}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  // UI states
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
        <div className="text-red-500 mb-4">Error loading balances: {error}</div>
        <button
          onClick={() => loadBalances(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Daily Balances</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="form-input"
          />
          <button
            onClick={() => {
              setEditingBalance(null);
              reset({ 
                balanceDate: selectedDate.toISOString().split('T')[0],
                currencyId: '',
                itemId: '',
                amount: ''
              });
              setShowModal(true);
            }}
            className="btn btn-primary"
          >
            <Plus size={16} /> New Balance
          </button>
          <button
            onClick={() => loadBalances(true)}
            disabled={refreshing}
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Debug info - remove in production */}
      <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f5f5f5', borderRadius: '4px' }}>
        <small>
          <strong>Debug Info:</strong> Loaded {balances.length} balances, {balanceItems.length} balance items. 
          Check console for detailed balance structure.
        </small>
      </div>

      {/* Tables */}
      {Object.entries(groupedBalances).map(([currency, currencyBalances]) => (
        <div key={currency} className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>{currency} Balances</h3>
          <DataTable
            columns={balanceColumns}
            data={currencyBalances}
            loading={loading}
            emptyMessage={`No balances found for ${currency} on ${formatDate(selectedDate)}`}
          />
        </div>
      ))}

      {Object.keys(groupedBalances).length === 0 && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No balances found for selected date</p>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingBalance(null);
          reset();
        }}
        title={editingBalance ? 'Edit Daily Balance' : 'Create Daily Balance'}
        size="medium"
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                name="balanceDate"
                value={values.balanceDate}
                onChange={(e) => handleChange('balanceDate', e.target.value)}
                onBlur={() => handleBlur('balanceDate')}
                className="form-input"
                disabled={!!editingBalance}
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
                disabled={!!editingBalance || currenciesLoading}
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

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Balance Item</label>
              <select
                name="itemId"
                value={values.itemId}
                onChange={(e) => handleChange('itemId', e.target.value)}
                onBlur={() => handleBlur('itemId')}
                className="form-input"
                disabled={!!editingBalance}
              >
                <option value="">Select Balance Item</option>
                {balanceItems?.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.category})
                  </option>
                ))}
              </select>
              {touched.itemId && errors.itemId && (
                <div className="form-error">{errors.itemId}</div>
              )}
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
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
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditingBalance(null);
                reset();
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingBalance ? 'Update' : 'Create'} Balance
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DailyBalances;