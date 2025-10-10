import React, { useState, useEffect } from 'react';
import { currencyService } from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import { useForm } from '../hooks/useForm';
import { required, composeValidators, minLength, maxLength } from '../utils/validators';
import { Edit, Trash2, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const CurrencyManagement = () => {
  const { hasAnyRole } = useAuth();
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState(null);

  const { values, errors, touched, handleChange, handleBlur, validate, reset } = useForm(
    {
      code: '',
      name: '',
      symbol: ''
    },
    {
      code: composeValidators(
        required('Code is required'),
        minLength(3, 'Code must be 3 characters'),
        maxLength(3, 'Code must be 3 characters')
      ),
      name: required('Name is required'),
      symbol: required('Symbol is required')
    }
  );

  // === Fetching logic (like Dashboard) ===
  const loadCurrencies = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      else setRefreshing(true);

      setError(null);

      const abortController = new AbortController();
      const options = { signal: abortController.signal };

      const data = await currencyService.getAll(options);
      setCurrencies(data);

      return () => abortController.abort();
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
        console.error('Currency loading error:', err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCurrencies();
  }, []);

  const handleRefresh = () => {
    loadCurrencies(true);
  };

  // === CRUD Handlers ===
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      if (editingCurrency) {
        await currencyService.update(editingCurrency.id, values);
      } else {
        await currencyService.create(values);
      }

      setShowModal(false);
      setEditingCurrency(null);
      reset();
      loadCurrencies(true);
    } catch (error) {
      // Error handled by interceptor
    }
  };

  const handleEdit = (currency) => {
    setEditingCurrency(currency);
    reset({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this currency?')) {
      try {
        await currencyService.delete(id);
        loadCurrencies(true);
      } catch (error) {
        // Error handled by interceptor
      }
    }
  };

  // === Table Columns ===
  const currencyColumns = [
    { key: 'code', title: 'Code' },
    { key: 'name', title: 'Name' },
    { key: 'symbol', title: 'Symbol' },
    {
      key: 'isActive',
      title: 'Status',
      render: (value) => (
        <span
          style={{
            color: value ? 'var(--success-color)' : 'var(--error-color)',
            fontWeight: '600'
          }}
        >
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    },
    ...(hasAnyRole(['admin'])
      ? [
          {
            key: 'actions',
            title: 'Actions',
            render: (value, row) => (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleEdit(row)}
                  className="btn"
                  style={{ padding: '0.25rem', background: 'none' }}
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(row.id)}
                  className="btn"
                  style={{ padding: '0.25rem', background: 'none' }}
                  disabled={!row.isActive}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )
          }
        ]
      : [])
  ];

  // === UI States ===
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
        <div className="text-red-500 mb-4">Error loading currencies: {error}</div>
        <button
          onClick={handleRefresh}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  // === Render ===
  return (
    <div>


  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="text-2xl font-bold">Currency Management</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-secondary"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          {hasAnyRole(['admin']) && (
            <button
              onClick={() => {
                setEditingCurrency(null);
                reset();
                setShowModal(true);
              }}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              New Currency
            </button>
          )}
        </div>
      </div>

      <DataTable
        columns={currencyColumns}
        data={currencies || []}
        loading={refreshing}
        emptyMessage="No currencies found"
      />

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingCurrency(null);
          reset();
        }}
        title={editingCurrency ? 'Edit Currency' : 'Create Currency'}
        size="small"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Currency Code (3 letters)</label>
            <input
              type="text"
              name="code"
              value={values.code}
              onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
              onBlur={() => handleBlur('code')}
              className="form-input"
              placeholder="USD"
              maxLength={3}
              disabled={!!editingCurrency}
            />
            {touched.code && errors.code && (
              <div className="form-error">{errors.code}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Currency Name</label>
            <input
              type="text"
              name="name"
              value={values.name}
              onChange={(e) => handleChange('name', e.target.value)}
              onBlur={() => handleBlur('name')}
              className="form-input"
              placeholder="US Dollar"
            />
            {touched.name && errors.name && (
              <div className="form-error">{errors.name}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Symbol</label>
            <input
              type="text"
              name="symbol"
              value={values.symbol}
              onChange={(e) => handleChange('symbol', e.target.value)}
              onBlur={() => handleBlur('symbol')}
              className="form-input"
              placeholder="$"
              maxLength={5}
            />
            {touched.symbol && errors.symbol && (
              <div className="form-error">{errors.symbol}</div>
            )}
          </div>

          <div className="flex gap-2 justify-end mt-6">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditingCurrency(null);
                reset();
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingCurrency ? 'Update' : 'Create'} Currency
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CurrencyManagement;
