import React, { useState, useEffect, useCallback } from 'react';
import { correspondentService } from '../services/api';
import DataTable from '../components/common/DataTable';
import DatePicker from 'react-datepicker';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { AlertTriangle, CheckCircle, Download, RefreshCw } from 'lucide-react';

const CorrespondentReports = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('limits');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState({
    limitsReport: null,
    cashCoverReport: null,
  });

  const loadReportData = useCallback(async (isRefresh = false) => {
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
      
      const limitsReport = await correspondentService.getLimitsReport(date, options);
      const cashCoverReport = await correspondentService.getCashCoverReport(date, options);
      
      setReportData({ limitsReport, cashCoverReport });

      return () => abortController.abort();
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
        console.error('Correspondent reports loading error:', err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const handleRefresh = () => {
    loadReportData(true);
  };
  
  const limitsColumns = [
    { key: 'bankName', title: 'Bank Name' },
    { key: 'balance', title: 'Balance', render: (value) => formatCurrency(value) },
    { key: 'percentage', title: 'Percentage', render: (value) => formatNumber(value) + '%' },
    { key: 'limitPercentage', title: 'Limit', render: (value, row) => formatNumber(value) + '% ' + row.limitType },
    { key: 'variation', title: 'Variation', render: (value) => formatNumber(value) + '%' },
    { 
      key: 'status', 
      title: 'Status', 
      render: (value) => (
        <span style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          color: value === 'normal' ? 'var(--success-color)' : 'var(--error-color)'
        }}>
          {value === 'normal' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      )
    },
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
        <div className="text-red-500 mb-4">Error loading reports: {error}</div>
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
        <h1>Correspondent Reports</h1>
        
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
            className="btn btn-primary"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          
          <button className="btn btn-secondary">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
        <button
          onClick={() => setActiveTab('limits')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'limits' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'limits' ? 'var(--primary-color)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: activeTab === 'limits' ? '600' : '400'
          }}
        >
          Limits Report
        </button>
        <button
          onClick={() => setActiveTab('cashCover')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'cashCover' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'cashCover' ? 'var(--primary-color)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: activeTab === 'cashCover' ? '600' : '400'
          }}
        >
          Cash Cover Report
        </button>
      </div>

      {/* Limits Report */}
      {activeTab === 'limits' && (
        <div>
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Daily Limits on Foreign Currency Balances</h3>
            
            {reportData.limitsReport?.alerts && reportData.limitsReport.alerts.length > 0 && (
              <div style={{
                background: 'var(--error-color)',
                color: 'white',
                padding: '1rem',
                borderRadius: '6px',
                marginBottom: '1rem'
              }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <AlertTriangle size={20} />
                  Alerts ({reportData.limitsReport.alerts.length})
                </h4>
                <ul>
                  {reportData.limitsReport.alerts.map((alert, index) => (
                    <li key={index}>
                      {alert.bank}: {alert.percentage.toFixed(2)}% ({alert.limitType} limit: {alert.limitPercentage}%)
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {Object.entries(reportData.limitsReport?.currencies || {}).map(([currency, data]) => (
              <div key={currency} style={{ marginBottom: '2rem' }}>
                <h4 style={{ marginBottom: '1rem' }}>{currency} - Total Balance: {formatCurrency(data.totalBalance)}</h4>
                <DataTable
                  columns={limitsColumns}
                  data={data.banks}
                  loading={refreshing}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cash Cover Report */}
      {activeTab === 'cashCover' && (
        <div>
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Cash Cover Report</h3>
            
            {reportData.cashCoverReport && Object.entries(reportData.cashCoverReport.cashCover || {}).map(([currency, banks]) => (
              <div key={currency} style={{ marginBottom: '2rem' }}>
                <h4>{currency} Cash Cover</h4>
                {banks.length > 0 ? (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Bank Name</th>
                        <th>Balance</th>
                        <th>Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {banks.map((bank, index) => (
                        <tr key={index}>
                          <td>{bank.bankName}</td>
                          <td>{formatCurrency(bank.balance)}</td>
                          <td>{formatNumber(bank.percentage)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                    No cash cover data available
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CorrespondentReports;