import React, { useState, useEffect } from 'react';
import { dailyBalanceService, currencyService } from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters';
import { Calendar, Download, RefreshCw, Filter, BarChart3, DollarSign, TrendingUp } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';

const BalanceReports = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCurrency, setSelectedCurrency] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [showDateModal, setShowDateModal] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  // Load currencies
  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const data = await currencyService.getAll();
        setCurrencies(data);
      } catch (err) {
        console.error('Error loading currencies:', err);
      }
    };

    loadCurrencies();
  }, []);

  // Load report data
  const loadReportData = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      const data = await dailyBalanceService.getReports(selectedDate.toISOString().split('T')[0]);
      setReportData(data);
    } catch (err) {
      setError(err.message);
      console.error('Error loading balance reports:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (currencies.length > 0) {
      loadReportData();
    }
  }, [selectedDate, currencies.length]);

  const handleRefresh = () => {
    loadReportData(true);
  };

  const handleDateConfirm = () => {
    setSelectedDate(tempDate);
    setShowDateModal(false);
  };

  const handleDateCancel = () => {
    setTempDate(selectedDate);
    setShowDateModal(false);
  };

  // Filter data based on selected currency
  const filteredCashOnHand = reportData?.cashOnHand?.filter(item => 
    selectedCurrency === 'ALL' || item.currency === selectedCurrency
  ) || [];

  const filteredTotals = reportData?.totals?.filter(item => 
    selectedCurrency === 'ALL' || item.currency === selectedCurrency
  ) || [];

  // Calculate currency-wise summary for cards
  const getCurrencySummary = () => {
    if (selectedCurrency === 'ALL') {
      return currencies.map(currency => {
        const cashData = reportData?.cashOnHand?.find(item => item.currency === currency.code);
        const totalsData = reportData?.totals?.find(item => item.currency === currency.code);
        
        return {
          currency: currency.code,
          cashOnHand: cashData?.todayCashOnHand || 0,
          assets: totalsData?.asset || 0,
          liabilities: totalsData?.liability || 0,
          memoAssets: totalsData?.memoAsset || 0,
          memoLiabilities: totalsData?.memoLiability || 0
        };
      });
    } else {
      const cashData = filteredCashOnHand[0];
      const totalsData = filteredTotals[0];
      
      return [{
        currency: selectedCurrency,
        cashOnHand: cashData?.todayCashOnHand || 0,
        assets: totalsData?.asset || 0,
        liabilities: totalsData?.liability || 0,
        memoAssets: totalsData?.memoAsset || 0,
        memoLiabilities: totalsData?.memoLiability || 0
      }];
    }
  };

  const currencySummary = getCurrencySummary();

  const cashOnHandColumns = [
    { key: 'currency', title: 'Currency' },
    { 
      key: 'yesterdayBalance', 
      title: 'Yesterday Balance', 
      render: (value, row) => formatCurrency(value, row.currency)
    },
    { 
      key: 'todayPurchase', 
      title: "Today's Purchases", 
      render: (value, row) => formatCurrency(value, row.currency)
    },
    { 
      key: 'todaySale', 
      title: "Today's Sales", 
      render: (value, row) => formatCurrency(value, row.currency)
    },
    { 
      key: 'todayCashOnHand', 
      title: "Today's Cash on Hand", 
      render: (value, row) => formatCurrency(value, row.currency)
    },
  ];

  const totalsColumns = [
    { key: 'currency', title: 'Currency' },
    { 
      key: 'asset', 
      title: 'Assets', 
      render: (value, row) => formatCurrency(value, row.currency)
    },
    { 
      key: 'liability', 
      title: 'Liabilities', 
      render: (value, row) => formatCurrency(value, row.currency)
    },
    { 
      key: 'memoAsset', 
      title: 'Memo Assets', 
      render: (value, row) => formatCurrency(value, row.currency)
    },
    { 
      key: 'memoLiability', 
      title: 'Memo Liabilities', 
      render: (value, row) => formatCurrency(value, row.currency)
    },
    { 
      key: 'totalLiability', 
      title: 'Total Liability', 
      render: (value, row) => formatCurrency(value, row.currency)
    },
    {
      key: 'netPosition',
      title: 'Net Position',
      render: (value, row) => {
        const netPosition = (row.asset + row.memoAsset) - (row.liability + row.memoLiability);
        return (
          <span style={{ 
            color: netPosition >= 0 ? 'var(--success-color)' : 'var(--error-color)',
            fontWeight: '600'
          }}>
            {formatCurrency(netPosition, row.currency)}
          </span>
        );
      }
    }
  ];

  if (loading && !refreshing) {
    return <LoadingSpinner />;
  }

  if (error && !reportData) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ color: 'var(--error-color)', marginBottom: '1rem' }}>
          Error loading balance reports: {error}
        </div>
        <button onClick={handleRefresh} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart3 size={24} />
          Balance Reports
        </h1>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            className="form-input"
            style={{ width: '150px' }}
          >
            <option value="ALL">All Currencies</option>
            {currencies.map(currency => (
              <option key={currency.code} value={currency.code}>
                {currency.code}
              </option>
            ))}
          </select>
          
          <button 
            onClick={() => setShowDateModal(true)}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Calendar size={16} />
            {formatDate(selectedDate)}
          </button>
          
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-primary"
          >
            <RefreshCw size={16} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          
          <button className="btn btn-success">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Currency-wise Summary Cards */}
      {currencySummary.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Currency-wise Summary</h3>
          <div className="stats-grid">
            {currencySummary.map((summary, index) => (
              <div key={summary.currency} className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <DollarSign size={20} />
                  <h4>{summary.currency} Summary</h4>
                </div>
                
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Assets:</span>
                    <strong>{formatCurrency(summary.assets, summary.currency)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Liabilities:</span>
                    <strong>{formatCurrency(summary.liabilities, summary.currency)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Cash on Hand:</span>
                    <strong>{formatCurrency(summary.cashOnHand, summary.currency)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Net Position:</span>
                    <strong style={{ 
                      color: (summary.assets + summary.memoAssets - summary.liabilities - summary.memoLiabilities) >= 0 
                        ? 'var(--success-color)' 
                        : 'var(--error-color)'
                    }}>
                      {formatCurrency(
                        summary.assets + summary.memoAssets - summary.liabilities - summary.memoLiabilities, 
                        summary.currency
                      )}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cash on Hand Calculation */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Calendar size={20} />
          Cash on Hand Calculation for {formatDate(selectedDate)}
        </h3>
        
        <DataTable
          columns={cashOnHandColumns}
          data={filteredCashOnHand}
          loading={refreshing}
          emptyMessage="No cash on hand data available for selected date and currency"
        />
      </div>

      {/* Totals Report */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Asset and Liability Totals</h3>
        
        <DataTable
          columns={totalsColumns}
          data={filteredTotals}
          loading={refreshing}
          emptyMessage="No balance data available for selected date and currency"
        />
      </div>

      {/* Overall Summary (only when viewing all currencies) */}
      {selectedCurrency === 'ALL' && reportData && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Overall Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Assets</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success-color)' }}>
                {formatCurrency(
                  reportData.totals?.reduce((sum, item) => sum + item.asset, 0) || 0
                )}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Liabilities</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--error-color)' }}>
                {formatCurrency(
                  reportData.totals?.reduce((sum, item) => sum + item.liability, 0) || 0
                )}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Cash on Hand</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                {formatCurrency(
                  reportData.cashOnHand?.reduce((sum, item) => sum + item.todayCashOnHand, 0) || 0
                )}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Report Date</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                {formatDate(reportData.date)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date Selection Modal */}
      <Modal
        isOpen={showDateModal}
        onClose={handleDateCancel}
        title="Select Report Date"
        size="small"
      >
        <div style={{ padding: '1rem 0' }}>
          <label className="form-label">Report Date</label>
          <input
            type="date"
            value={tempDate.toISOString().split('T')[0]}
            onChange={(e) => setTempDate(new Date(e.target.value))}
            className="form-input"
            style={{ width: '100%' }}
          />
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Select the date for which you want to generate the balance report.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
          <button onClick={handleDateCancel} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleDateConfirm} className="btn btn-primary">
            Apply Date
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default BalanceReports;