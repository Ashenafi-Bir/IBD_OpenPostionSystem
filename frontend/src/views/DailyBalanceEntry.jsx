import React, { useState, useEffect } from 'react';
import { correspondentService, currencyService } from '../services/api';
import { Plus, Calendar, DollarSign, X, Save, RefreshCw } from 'lucide-react';

const DailyBalanceEntry = () => {
  const [banks, setBanks] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [selectedBank, setSelectedBank] = useState('');
  const [balanceDate, setBalanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);

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
      
      if (banksArray.length > 0 && !selectedBank) {
        setSelectedBank(banksArray[0].id.toString());
      }
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
    } catch (err) {
      console.error('Failed to load currencies:', err);
      setCurrencies([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedBank || !balanceAmount) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      await correspondentService.addDailyBalance({
        bankId: parseInt(selectedBank),
        balanceDate,
        balanceAmount: parseFloat(balanceAmount),
        notes
      });

      setSuccess('Balance added successfully');
      setBalanceAmount('');
      setNotes('');
      setShowModal(false);
      
      setTimeout(() => {
        loadBanks(true);
      }, 500);
      
    } catch (err) {
      console.error('Error adding balance:', err);
      setError(err.response?.data?.error || err.message || 'Failed to add balance');
    } finally {
      setSubmitting(false);
    }
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

  const getSelectedBankCurrency = () => {
    const bank = banks.find(b => b.id === parseInt(selectedBank));
    const currencyInfo = getCurrencyInfo(bank);
    return currencyInfo.code;
  };

  const getRecentBalances = () => {
    const recentBalances = [];
    
    banks.forEach(bank => {
      if (bank.balances && Array.isArray(bank.balances)) {
        bank.balances.slice(0, 3).forEach(balance => {
          recentBalances.push({
            ...balance,
            bankName: bank.bankName,
            currencyInfo: getCurrencyInfo(bank)
          });
        });
      }
    });
    
    return recentBalances.sort((a, b) => new Date(b.balanceDate) - new Date(a.balanceDate)).slice(0, 10);
  };

  const recentBalances = getRecentBalances();

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
        <h1>Daily Balance Entry</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input
            type="date"
            value={balanceDate}
            onChange={(e) => setBalanceDate(e.target.value)}
            className="form-input"
          />
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
            <Plus size={16} /> Add Balance
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

      {/* Recent Balances Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Recent Balance Entries</h3>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {recentBalances.length} entr{recentBalances.length !== 1 ? 'ies' : 'y'} found
          </span>
        </div>
        
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Bank</th>
                <th>Currency</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentBalances.length > 0 ? (
                recentBalances.map((balance) => (
                  <tr key={balance.id}>
                    <td>{new Date(balance.balanceDate).toLocaleDateString()}</td>
                    <td>{balance.bankName}</td>
                    <td>{balance.currencyInfo.code}</td>
                    <td>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: balance.currencyInfo.code || 'USD'
                      }).format(balance.balanceAmount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    No recent balance entries found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        
        <div className="modal-overlay">
              <div className="form-group1">
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Add Daily Balance</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="modal-close"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                  <div className="form-group">
                    <label className="form-label">Bank *</label>
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="form-input"
                      required
                      disabled={loading}
                    >
                      <option value="">Select a bank</option>
                      {Array.isArray(banks) && banks.map((bank) => {
                        const currencyInfo = getCurrencyInfo(bank);
                        return (
                          <option key={bank.id} value={bank.id}>
                            {bank.bankName} ({currencyInfo.code}) {bank.accountNumber ? `- ${bank.accountNumber}` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <div style={{ position: 'relative' }}>
                      <Calendar size={20} style={{ 
                        position: 'absolute', 
                        left: '10px', 
                        top: '50%', 
                        transform: 'translateY(-50%)', 
                        color: 'var(--text-secondary)' 
                      }} />
                      <input
                        type="date"
                        value={balanceDate}
                        onChange={(e) => setBalanceDate(e.target.value)}
                        className="form-input"
                        style={{ paddingLeft: '40px' }}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Balance Amount *</label>
                    <div style={{ position: 'relative' }}>
                      <DollarSign size={20} style={{ 
                        position: 'absolute', 
                        left: '10px', 
                        top: '50%', 
                        transform: 'translateY(-50%)', 
                        color: 'var(--text-secondary)' 
                      }} />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={balanceAmount}
                        onChange={(e) => setBalanceAmount(e.target.value)}
                        className="form-input"
                        style={{ paddingLeft: '40px' }}
                        placeholder={`Enter amount in ${getSelectedBankCurrency()}`}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Notes (Optional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows="3"
                      className="form-input"
                      placeholder="Additional notes about this balance entry..."
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary"
                  >
                    <Save size={16} style={{ marginRight: '0.5rem' }} />
                    {submitting ? 'Adding Balance...' : 'Add Balance'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        </div>
      )}
    </div>
  );
};

export default DailyBalanceEntry;