import React, { useState, useEffect } from 'react';
import { paidUpCapitalService } from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import { useForm } from '../hooks/useForm';
import { required, number, composeValidators } from '../utils/validators';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Edit, History, DollarSign, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const PaidUpCapital = () => {
  const { hasRole } = useAuth();

  const [capital, setCapital] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { values, errors, touched, handleChange, handleBlur, validate, reset } = useForm(
    {
      capitalAmount: '',
      effectiveDate: new Date().toISOString().split('T')[0],
      currency: 'ETB',
      notes: ''
    },
    {
      capitalAmount: composeValidators(required('Capital amount is required'), number('Must be a number')),
      effectiveDate: required('Effective date is required')
    }
  );

  const loadCapitalData = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      else setRefreshing(true);

      setError(null);
      const abortController = new AbortController();
      const options = { signal: abortController.signal };

      const capitalRes = await paidUpCapitalService.get(options);
      setCapital(capitalRes);

      const historyRes = await paidUpCapitalService.getHistory(options);
      setHistory(historyRes);

      // Reset form with latest values
      reset({
        capitalAmount: capitalRes?.capitalAmount || '',
        effectiveDate: capitalRes?.effectiveDate || new Date().toISOString().split('T')[0],
        currency: capitalRes?.currency || 'ETB',
        notes: ''
      });

      return () => abortController.abort();
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error loading capital data:', err);
        setError(err.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCapitalData();
  }, []);

  const handleRefresh = () => {
    loadCapitalData(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await paidUpCapitalService.update(values);
      setShowModal(false);
      reset();
      loadCapitalData(true);
    } catch (error) {
      // handled globally
    }
  };

  const historyColumns = [
    { key: 'effectiveDate', title: 'Effective Date', render: (value) => formatDate(value) },
    { key: 'capitalAmount', title: 'Amount', render: (value, row) => formatCurrency(value, row.currency) },
    { key: 'currency', title: 'Currency' },
    { key: 'Creator.fullName', title: 'Updated By', render: (value, row) => row.Creator?.fullName },
    { key: 'notes', title: 'Notes' }
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
        <div className="text-red-500 mb-4">Error loading Paid-up Capital: {error}</div>
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
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Paid-up Capital</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            <History size={16} />
            View History
          </button>
          {hasRole(['admin']) && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              <Edit size={16} />
              Update Capital
            </button>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Current Capital Card */}
      <div className="card max-w-md mx-auto mb-8">
        <div className="text-center">
          <div className="bg-blue-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-white">
            <DollarSign size={32} />
          </div>
          <h2 className="text-2xl font-semibold mb-2">
            {formatCurrency(capital?.capitalAmount || 0, capital?.currency || 'ETB')}
          </h2>
          <p className="text-gray-500 mb-1">Current Paid-up Capital</p>
          {capital?.effectiveDate && (
            <p className="text-gray-400 text-sm">
              Effective from {formatDate(capital.effectiveDate)}
            </p>
          )}
        </div>
      </div>

      {/* Update Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          reset({
            capitalAmount: capital?.capitalAmount || '',
            effectiveDate: new Date().toISOString().split('T')[0],
            currency: capital?.currency || 'ETB',
            notes: ''
          });
        }}
        title="Update Paid-up Capital"
        size="small"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Capital Amount</label>
            <input
              type="number"
              name="capitalAmount"
              value={values.capitalAmount}
              onChange={(e) => handleChange('capitalAmount', e.target.value)}
              onBlur={() => handleBlur('capitalAmount')}
              className="form-input"
              placeholder="0.00"
              step="0.01"
            />
            {touched.capitalAmount && errors.capitalAmount && (
              <div className="form-error">{errors.capitalAmount}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Effective Date</label>
            <input
              type="date"
              name="effectiveDate"
              value={values.effectiveDate}
              onChange={(e) => handleChange('effectiveDate', e.target.value)}
              onBlur={() => handleBlur('effectiveDate')}
              className="form-input"
            />
            {touched.effectiveDate && errors.effectiveDate && (
              <div className="form-error">{errors.effectiveDate}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Currency</label>
            <select
              name="currency"
              value={values.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
              className="form-input"
            >
              <option value="ETB">ETB (Ethiopian Birr)</option>
              <option value="USD">USD (US Dollar)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Notes (Optional)</label>
            <textarea
              name="notes"
              value={values.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="form-input"
              rows={3}
              placeholder="Reason for update..."
            />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Update Capital
            </button>
          </div>
        </form>
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        title="Paid-up Capital History"
        size="large"
      >
        <DataTable
          columns={historyColumns}
          data={history || []}
          loading={historyLoading}
          emptyMessage="No capital history found"
        />
        <div className="flex justify-end mt-4">
          <button
            onClick={() => setShowHistory(false)}
            className="btn btn-secondary"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default PaidUpCapital;
