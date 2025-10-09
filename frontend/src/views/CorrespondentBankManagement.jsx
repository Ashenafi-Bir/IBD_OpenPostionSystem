import React, { useState, useEffect } from 'react';
import { correspondentService, currencyService } from '../services/api';
import { Plus, Edit, Save, X, AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

const CorrespondentBankManagement = () => {
  const [banks, setBanks] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
  const [deletingBank, setDeletingBank] = useState(null);
  const [formData, setFormData] = useState({
    bankName: '',
    branchAddress: '',
    accountNumber: '',
    swiftCode: '',
    currencyId: '',
    maxLimit: '',
    minLimit: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadBanks();
    loadCurrencies();
  }, []);

  const loadBanks = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError('');
      
      const response = await correspondentService.getBanks();
      const banksData = response?.data?.data || response?.data || [];
      const banksArray = Array.isArray(banksData) ? banksData : [];
      
      setBanks(banksArray);
    } catch (err) {
      console.error('Error loading banks:', err);
      setError('Failed to load banks');
      setBanks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadCurrencies = async () => {
    try {
      const response = await currencyService.getAll();
      const currenciesData = Array.isArray(response) ? response : 
                           Array.isArray(response?.data) ? response.data : [];
      setCurrencies(currenciesData);
      
      if (currenciesData.length > 0 && !formData.currencyId) {
        setFormData(prev => ({ 
          ...prev, 
          currencyId: currenciesData[0].id.toString() 
        }));
      }
    } catch (err) {
      console.error('Failed to load currencies:', err);
      setCurrencies([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Prepare the data properly - don't send null for empty optional fields
      const submitData = {
        ...formData,
        currencyId: parseInt(formData.currencyId),
        // Only include maxLimit if it has a value, otherwise omit it
        ...(formData.maxLimit && { maxLimit: parseFloat(formData.maxLimit) }),
        // Only include minLimit if it has a value, otherwise omit it
        ...(formData.minLimit && { minLimit: parseFloat(formData.minLimit) })
      };

      // Remove empty string values that could cause issues
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === '' || submitData[key] === null) {
          delete submitData[key];
        }
      });

      console.log('Submitting data:', submitData);

      let response;
      if (editingBank) {
        // Use updateBank for full editing instead of updateBankLimits
        response = await correspondentService.updateBank(editingBank.id, submitData);
        setSuccess('Bank updated successfully');
      } else {
        response = await correspondentService.createBank(submitData);
        setSuccess('Bank created successfully');
      }

      setShowModal(false);
      setEditingBank(null);
      setFormData({
        bankName: '',
        branchAddress: '',
        accountNumber: '',
        swiftCode: '',
        currencyId: currencies.length > 0 ? currencies[0].id.toString() : '',
        maxLimit: '',
        minLimit: ''
      });
      
      setTimeout(() => {
        loadBanks(true);
      }, 500);
      
    } catch (err) {
      console.error('Error submitting form:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        url: err.config?.url
      });
      
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.message || 
                          'Operation failed. Please try again.';
      setError(errorMessage);
    }
  };

  const handleEdit = (bank) => {
    setEditingBank(bank);
    setFormData({
      bankName: bank.bankName,
      branchAddress: bank.branchAddress || '',
      accountNumber: bank.accountNumber || '',
      swiftCode: bank.swiftCode || '',
      currencyId: bank.currencyId?.toString() || '',
      maxLimit: bank.maxLimit?.toString() || '',
      minLimit: bank.minLimit?.toString() || ''
    });
    setShowModal(true);
  };

  const handleDelete = (bank) => {
    setDeletingBank(bank);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      setError('');
      await correspondentService.deleteBank(deletingBank.id);
      setSuccess('Bank deleted successfully');
      setShowDeleteModal(false);
      setDeletingBank(null);
      loadBanks(true);
    } catch (err) {
      console.error('Error deleting bank:', err);
      setError('Failed to delete bank');
    }
  };

  const cancelEdit = () => {
    setEditingBank(null);
    setShowModal(false);
    setFormData({
      bankName: '',
      branchAddress: '',
      accountNumber: '',
      swiftCode: '',
      currencyId: currencies.length > 0 ? currencies[0].id.toString() : '',
      maxLimit: '',
      minLimit: ''
    });
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeletingBank(null);
  };

  const handleRefresh = () => {
    loadBanks(true);
  };

  const getCurrencyInfo = (bank) => {
    if (!bank) return { code: 'N/A', name: 'N/A' };
    
    if (bank.currency) {
      return { 
        code: bank.currency.code || 'N/A', 
        name: bank.currency.name || 'N/A' 
      };
    }
    
    const currencyId = bank.currencyId;
    if (currencyId && currencies.length > 0) {
      const foundCurrency = currencies.find(currency => currency.id === currencyId);
      if (foundCurrency) {
        return { code: foundCurrency.code, name: foundCurrency.name };
      }
    }
    
    return { code: 'N/A', name: 'N/A' };
  };

  if (loading && !refreshing) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !success) {
    return (
      <div className="text-center p-8">
        <div className="text-red-500 mb-4">Error loading banks: {error}</div>
        <button
          onClick={() => loadBanks(true)}
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
        <h1>Correspondent Bank Management</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
          >
            <Plus size={16} /> New Bank
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {/* Banks Table */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Correspondent Banks</h3>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {banks.length} bank{banks.length !== 1 ? 's' : ''} found
          </span>
        </div>
        
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Bank Name</th>
                <th>Currency</th>
                <th>Account Number</th>
                <th>SWIFT Code</th>
                <th>Max Limit</th>
                <th>Min Limit</th>
                <th style={{ width: '140px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(banks) && banks.length > 0 ? (
                banks.map((bank) => {
                  const currencyInfo = getCurrencyInfo(bank);
                  return (
                    <tr key={bank.id}>
                      <td>
                        <div>
                          <div style={{ fontWeight: '600' }}>{bank.bankName}</div>
                          {bank.branchAddress && (
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                              {bank.branchAddress}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <div style={{ fontWeight: '600' }}>{currencyInfo.code}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {currencyInfo.name}
                          </div>
                        </div>
                      </td>
                      <td>{bank.accountNumber || '-'}</td>
                      <td>{bank.swiftCode || '-'}</td>
                      <td>{bank.maxLimit ? `${bank.maxLimit}%` : '-'}</td>
                      <td>{bank.minLimit ? `${bank.minLimit}%` : '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            onClick={() => handleEdit(bank)} 
                            className="btn" 
                            style={{ padding: '0.25rem', background: 'none' }}
                            title="Edit Bank"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(bank)} 
                            className="btn" 
                            style={{ padding: '0.25rem', background: 'none' }}
                            title="Delete Bank"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      <AlertTriangle size={48} style={{ margin: '0 auto 1rem', color: 'var(--border-color)' }} />
                      <p style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>No banks found</p>
                      <p>Create your first bank to get started</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        
        <div className="modal-overlay">
           <div className="form-group1">
          <div className="modal" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingBank ? 'Edit Bank' : 'Create New Bank'}
              </h2>
              <button 
                onClick={cancelEdit}
                className="modal-close"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                  <div className="form-group">
                    <label className="form-label">Bank Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Currency *</label>
                    <select
                      required
                      value={formData.currencyId}
                      onChange={(e) => setFormData({ ...formData, currencyId: e.target.value })}
                      className="form-input"
                    >
                      <option value="">Select Currency</option>
                      {currencies.map(currency => (
                        <option key={currency.id} value={currency.id}>
                          {currency.code} - {currency.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Account Number</label>
                    <input
                      type="text"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">SWIFT Code</label>
                    <input
                      type="text"
                      value={formData.swiftCode}
                      onChange={(e) => setFormData({ ...formData, swiftCode: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Max Limit (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.maxLimit}
                      onChange={(e) => setFormData({ ...formData, maxLimit: e.target.value })}
                      className="form-input"
                      placeholder="Optional"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Min Limit (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.minLimit}
                      onChange={(e) => setFormData({ ...formData, minLimit: e.target.value })}
                      className="form-input"
                      placeholder="Optional"
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Branch Address</label>
                    <textarea
                      value={formData.branchAddress}
                      onChange={(e) => setFormData({ ...formData, branchAddress: e.target.value })}
                      rows="3"
                      className="form-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    <Save size={16} style={{ marginRight: '0.5rem' }} />
                    {editingBank ? 'Update Bank' : 'Create Bank'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingBank && (
        <div className="modal-overlay">
           <div className="form-group1">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Confirm Delete</h2>
              <button 
                onClick={cancelDelete}
                className="modal-close"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <AlertTriangle size={48} style={{ color: '#e53e3e', marginBottom: '1rem' }} />
                <h3 style={{ marginBottom: '0.5rem' }}>Delete Bank</h3>
                <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                  Are you sure you want to delete <strong>{deletingBank.bankName}</strong>? 
                  This action cannot be undone.
                </p>
                
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button
                    onClick={cancelDelete}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="btn btn-danger"
                  >
                    <Trash2 size={16} style={{ marginRight: '0.5rem' }} />
                    Delete Bank
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}
    </div>
  );
};

export default CorrespondentBankManagement;