import React, { useState, useEffect } from 'react';
import { exchangeRateService, currencyService } from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import { useForm } from '../hooks/useForm';
import { required, number, minValue, composeValidators } from '../utils/validators';
import { formatDate, formatNumber } from '../utils/formatters';
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';

const ExchangeRates = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [rates, setRates] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { values, errors, touched, handleChange, handleBlur, validate, reset } = useForm(
    {
      currencyId: '',
      rateDate: new Date().toISOString().split('T')[0],
      buyingRate: '',
      sellingRate: ''
    },
    {
      currencyId: required('Currency is required'),
      rateDate: required('Date is required'),
      buyingRate: composeValidators(
        required('Buying rate is required'),
        number('Must be a number'),
        minValue(0, 'Must be positive')
      ),
      sellingRate: composeValidators(
        required('Selling rate is required'),
        number('Must be a number'),
        minValue(0, 'Must be positive')
      )
    }
  );

  // Helper function to get currency display name
  const getCurrencyDisplayName = (rate) => {
    if (rate.currency) {
      return `${rate.currency.code} - ${rate.currency.name}`;
    }
    const currency = currencies.find(c => c.id === rate.currency_id);
    return currency ? `${currency.code} - ${currency.name}` : 'N/A';
  };

  // Fetch currencies and rates together
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        setError(null);

        const currenciesData = await currencyService.getAll();
        setCurrencies(currenciesData);

        const ratesData = await exchangeRateService.getRates(selectedDate.toISOString().split('T')[0]);
        const enhancedRates = ratesData.map(rate => {
          const currency = currenciesData.find(c => c.id === rate.currency_id);
          return { ...rate, currency: currency || null };
        });

        setRates(enhancedRates || []);
      } catch (err) {
        setError(err.message || 'Failed to load data');
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [selectedDate]);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const ratesData = await exchangeRateService.getRates(selectedDate.toISOString().split('T')[0]);
      const enhancedRates = ratesData.map(rate => {
        const currency = currencies.find(c => c.id === rate.currency_id);
        return { ...rate, currency: currency || null };
      });
      setRates(enhancedRates || []);
    } catch (err) {
      setError(err.message || 'Failed to refresh data');
      console.error('Error refreshing rates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const dataToSubmit = {
        ...values,
        currency_id: parseInt(values.currencyId)
      };

      if (editingRate) {
        await exchangeRateService.update(editingRate.id, dataToSubmit);
      } else {
        await exchangeRateService.create(dataToSubmit);
      }

      setShowModal(false);
      setEditingRate(null);
      reset();
      handleRefresh();
    } catch (error) {
      console.error('Error submitting exchange rate:', error);
    }
  };

  const handleEdit = (rate) => {
    setEditingRate(rate);

    // ✅ Set form values for editing mode
    reset({
      currencyId: rate.currency_id?.toString() || '',
      rateDate: rate.rateDate || rate.date || selectedDate.toISOString().split('T')[0],
      buyingRate: rate.buyingRate?.toString() || '',
      sellingRate: rate.sellingRate?.toString() || ''
    });

    // Ensure currencyId syncs with form validation
    handleChange('currencyId', rate.currency_id?.toString() || '');

    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this exchange rate?')) {
      try {
        await exchangeRateService.delete(id);
        handleRefresh();
      } catch (error) {
        console.error('Error deleting rate:', error);
      }
    }
  };

  const rateColumns = [
    { key: 'rateDate', title: 'Date', render: (v, row) => formatDate(row.rateDate || row.date) },
    { key: 'currency', title: 'Currency', render: (v, row) => getCurrencyDisplayName(row) },
    { key: 'buyingRate', title: 'Buying Rate', render: (v) => formatNumber(v, 4) },
    { key: 'sellingRate', title: 'Selling Rate', render: (v) => formatNumber(v, 4) },
    {
      key: 'midRate',
      title: 'Mid Rate',
      render: (v, row) => {
        const buying = parseFloat(row.buyingRate) || 0;
        const selling = parseFloat(row.sellingRate) || 0;
        return formatNumber((buying + selling) / 2, 4);
      }
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (v, row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => handleEdit(row)} className="btn" style={{ background: 'none' }}>
            <Edit size={16} />
          </button>
          <button onClick={() => handleDelete(row.id)} className="btn" style={{ background: 'none' }}>
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  if (loading) return <LoadingSpinner />;

  if (error && !rates.length) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ color: 'var(--error-color)', marginBottom: '1rem' }}>
          Error loading exchange rates: {error}
        </div>
        <button onClick={handleRefresh} className="btn btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Exchange Rates</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="form-input"
          />
          <button
            onClick={() => {
              setEditingRate(null);
              reset({
                currencyId: '',
                rateDate: selectedDate.toISOString().split('T')[0],
                buyingRate: '',
                sellingRate: ''
              });
              setShowModal(true);
            }}
            className="btn btn-primary"
            disabled={!currencies.length}
          >
            <Plus size={16} /> New Rate
          </button>
          <button onClick={handleRefresh} disabled={loading} className="btn btn-secondary">
            <RefreshCw size={16} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <DataTable columns={rateColumns} data={rates} loading={loading} emptyMessage="No exchange rates found" />

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingRate(null);
          reset();
        }}
        title={editingRate ? 'Edit Exchange Rate' : 'Create Exchange Rate'}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Currency</label>
              {editingRate ? (
                <>
                  <input
                    type="text"
                    className="form-input"
                    value={getCurrencyDisplayName(editingRate)}
                    disabled
                    style={{ background: 'var(--surface-color)' }}
                  />
                  {/* ✅ Hidden field now wired properly */}
                  <input
                    type="hidden"
                    name="currencyId"
                    value={values.currencyId}
                    onChange={(e) => handleChange('currencyId', e.target.value)}
                  />
                </>
              ) : (
                <select
                  name="currencyId"
                  value={values.currencyId}
                  onChange={(e) => handleChange('currencyId', e.target.value)}
                  onBlur={() => handleBlur('currencyId')}
                  className="form-input"
                >
                  <option value="">Select Currency</option>
                  {currencies.map(currency => (
                    <option key={currency.id} value={currency.id}>
                      {currency.code} - {currency.name}
                    </option>
                  ))}
                </select>
              )}
              {touched.currencyId && errors.currencyId && (
                <div className="form-error">{errors.currencyId}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                name="rateDate"
                value={values.rateDate}
                onChange={(e) => handleChange('rateDate', e.target.value)}
                onBlur={() => handleBlur('rateDate')}
                className="form-input"
                disabled={!!editingRate}
              />
              {touched.rateDate && errors.rateDate && (
                <div className="form-error">{errors.rateDate}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Buying Rate</label>
              <input
                type="number"
                name="buyingRate"
                value={values.buyingRate}
                onChange={(e) => handleChange('buyingRate', e.target.value)}
                onBlur={() => handleBlur('buyingRate')}
                className="form-input"
                placeholder="0.0000"
                step="0.0001"
                min="0"
              />
              {touched.buyingRate && errors.buyingRate && (
                <div className="form-error">{errors.buyingRate}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Selling Rate</label>
              <input
                type="number"
                name="sellingRate"
                value={values.sellingRate}
                onChange={(e) => handleChange('sellingRate', e.target.value)}
                onBlur={() => handleBlur('sellingRate')}
                className="form-input"
                placeholder="0.0000"
                step="0.0001"
                min="0"
              />
              {touched.sellingRate && errors.sellingRate && (
                <div className="form-error">{errors.sellingRate}</div>
              )}
            </div>
          </div>

          {values.buyingRate && values.sellingRate && (
            <div className="form-group">
              <label className="form-label">Calculated Mid Rate</label>
              <input
                type="text"
                className="form-input"
                value={formatNumber(
                  (parseFloat(values.buyingRate) + parseFloat(values.sellingRate)) / 2,
                  4
                )}
                disabled
                style={{ background: 'var(--surface-color)' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditingRate(null);
                reset();
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingRate ? 'Update' : 'Create'} Rate
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ExchangeRates;
