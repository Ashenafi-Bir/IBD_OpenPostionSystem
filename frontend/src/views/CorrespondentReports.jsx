import React, { useState, useEffect, useCallback } from 'react';
import { correspondentService } from '../services/api';
import DataTable from '../components/common/DataTable';
import DatePicker from 'react-datepicker';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { AlertTriangle, CheckCircle, Download, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

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

      console.log('Loading report data for date:', date);
      
      const abortController = new AbortController();
      const options = { signal: abortController.signal };
      
      const limitsReportResponse = await correspondentService.getLimitsReport(date, options);
      const cashCoverReportResponse = await correspondentService.getCashCoverReport(date, options);
      
      // Extract the data from the response
      const limitsReport = limitsReportResponse.data;
      const cashCoverReport = cashCoverReportResponse.data;
      
      console.log('Limits report data:', limitsReport);
      console.log('Cash cover report data:', cashCoverReport);
      
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

  const getLimitDisplay = (row) => {
    if (row.maxLimit !== null && row.minLimit !== null) {
      return `${formatNumber(row.minLimit)}%-${formatNumber(row.maxLimit)}%`;
    } else if (row.maxLimit !== null) {
      return `${formatNumber(row.maxLimit)}% maximum`;
    } else if (row.minLimit !== null) {
      return `${formatNumber(row.minLimit)}% minimum`;
    }
    return 'No limits set';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'exceeded':
        return <TrendingUp size={16} color="var(--error-color)" />;
      case 'below':
        return <TrendingDown size={16} color="var(--warning-color)" />;
      default:
        return <CheckCircle size={16} color="var(--success-color)" />;
    }
  };

  const getStatusText = (status, variation) => {
    switch (status) {
      case 'exceeded':
        return `Exceeded by ${formatNumber(variation)}%`;
      case 'below':
        return `Below by ${formatNumber(variation)}%`;
      default:
        return 'Within Limits';
    }
  };
  
  const limitsColumns = [
    { 
      key: 'bankName', 
      title: 'Name of the Bank',
      render: (value, row) => (
        <div>
          <div style={{ fontWeight: '600' }}>{value}</div>
          {row.accountNumber && (
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Acc: {row.accountNumber}
            </div>
          )}
        </div>
      )
    },
    { 
      key: 'currency', 
      title: 'Currency Type',
      render: (value) => value || 'USD'
    },
    { 
      key: 'balance', 
      title: 'Balance at Corr. Acct', 
      render: (value) => formatCurrency(value),
      align: 'right'
    },
    { 
      key: 'percentage', 
      title: 'Total Percentage', 
      render: (value) => `${formatNumber(value, 1)}%`,
      align: 'right'
    },
    { 
      key: 'maxLimit', 
      title: 'Max Limit', 
      render: (value, row) => value !== null ? `${formatNumber(value)}%` : '-',
      align: 'right'
    },
    { 
      key: 'limitDisplay', 
      title: 'Limit Type', 
      render: (value, row) => getLimitDisplay(row)
    },
    { 
      key: 'status', 
      title: 'Status', 
      render: (value, row) => (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          color: row.status === 'normal' ? 'var(--success-color)' : 
                 row.status === 'exceeded' ? 'var(--error-color)' : 'var(--warning-color)'
        }}>
          {getStatusIcon(row.status)}
          <span>{getStatusText(row.status, row.variation)}</span>
        </div>
      )
    },
  ];

  const cashCoverColumns = [
    { key: 'bankName', title: 'Bank Name' },
    { key: 'currency', title: 'Currency' },
    { key: 'balance', title: 'Balance', render: (value) => formatCurrency(value), align: 'right' },
    { key: 'percentage', title: 'Percentage', render: (value) => `${formatNumber(value, 1)}%`, align: 'right' },
    { 
      key: 'status', 
      title: 'Limit Status', 
      render: (value, row) => (
        <span style={{ 
          color: row.status === 'normal' ? 'var(--success-color)' : 
                 row.status === 'exceeded' ? 'var(--error-color)' : 'var(--warning-color)'
        }}>
          {getStatusText(row.status, row.variation)}
        </span>
      )
    },
  ];

  // Safe data accessors
  const getCurrencies = () => {
    return reportData.limitsReport?.currencies || {};
  };

  const getAlerts = () => {
    return reportData.limitsReport?.alerts || [];
  };

  const getCashCoverData = () => {
    return reportData.cashCoverReport?.cashCover || {};
  };

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
        <h1>Correspondent Bank Reports</h1>
        
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
          Limits Compliance Report
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
        <button
          onClick={() => setActiveTab('summary')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'summary' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'summary' ? 'var(--primary-color)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: activeTab === 'summary' ? '600' : '400'
          }}
        >
          Summary Report
        </button>
      </div>

      {/* Limits Report */}
      {activeTab === 'limits' && (
        <div>
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Daily Limits Compliance Report</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Percentage calculated as: (Bank Balance / Total Currency Balance) × 100%
            </p>
            
            {getAlerts().length > 0 && (
              <div style={{
                background: 'var(--error-light)',
                border: '1px solid var(--error-color)',
                color: 'var(--error-color)',
                padding: '1rem',
                borderRadius: '6px',
                marginBottom: '1.5rem'
              }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <AlertTriangle size={20} />
                  Limit Alerts ({getAlerts().length})
                </h4>
                <ul>
                  {getAlerts().map((alert, index) => (
                    <li key={index} style={{ marginBottom: '0.25rem' }}>
                      <strong>{alert.bankName}</strong> ({alert.currency}): {alert.percentage.toFixed(2)}% 
                      ({alert.limitType} limit: {alert.limitPercentage}%)
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {Object.keys(getCurrencies()).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <p>No correspondent bank data available for the selected date.</p>
                <p>Please check if balances have been added for {selectedDate.toISOString().split('T')[0]}.</p>
              </div>
            ) : (
              Object.entries(getCurrencies()).map(([currency, data]) => (
                <div key={currency} style={{ marginBottom: '2.5rem' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '1rem',
                    padding: '1rem',
                    background: 'var(--background-secondary)',
                    borderRadius: '6px'
                  }}>
                    <h4 style={{ margin: 0 }}>{currency} Currency</h4>
                    <div style={{ display: 'flex', gap: '2rem' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Balance</div>
                        <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>{formatCurrency(data.totalBalance)}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Percentage</div>
                        <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>100.0%</div>
                      </div>
                    </div>
                  </div>
                  
                  {data.banks && data.banks.length > 0 ? (
                    <DataTable
                      columns={limitsColumns}
                      data={data.banks}
                      loading={refreshing}
                      showPagination={false}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      No bank data available for {currency} currency.
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Cash Cover Report */}
      {activeTab === 'cashCover' && (
        <div>
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Cash Cover Report - Top Banks by Currency</h3>
            
            {Object.keys(getCashCoverData()).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <p>No cash cover data available for the selected date.</p>
              </div>
            ) : (
              Object.entries(getCashCoverData()).map(([currency, banks]) => (
                <div key={currency} style={{ marginBottom: '2.5rem' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '1rem',
                    padding: '1rem',
                    background: 'var(--background-secondary)',
                    borderRadius: '6px'
                  }}>
                    <h4 style={{ margin: 0 }}>{currency} Cash Cover</h4>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Balance</div>
                      <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                        {formatCurrency(banks.reduce((sum, bank) => sum + (bank.balance || 0), 0))}
                      </div>
                    </div>
                  </div>
                  
                  {banks && banks.length > 0 ? (
                    <DataTable
                      columns={cashCoverColumns}
                      data={banks}
                      loading={refreshing}
                      showPagination={false}
                    />
                  ) : (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                      No cash cover data available for {currency}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Summary Report */}
      {activeTab === 'summary' && (
        <div>
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Summary Report</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div className="stat-card">
                <div className="stat-label">Total Currencies</div>
                <div className="stat-value">
                  {Object.keys(getCurrencies()).length}
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-label">Total Banks</div>
                <div className="stat-value">
                  {Object.values(getCurrencies()).reduce((sum, currency) => sum + (currency.banks?.length || 0), 0)}
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-label">Active Alerts</div>
                <div className="stat-value" style={{ color: 'var(--error-color)' }}>
                  {getAlerts().length}
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-label">Report Date</div>
                <div className="stat-value">
                  {selectedDate.toISOString().split('T')[0]}
                </div>
              </div>
            </div>

            {/* Currency Summary Table */}
            {Object.keys(getCurrencies()).length > 0 ? (
              <>
                <h4 style={{ marginBottom: '1rem' }}>Currency Summary</h4>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Currency</th>
                      <th>Total Balance</th>
                      <th>Number of Banks</th>
                      <th>Alerts</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(getCurrencies()).map(([currency, data]) => {
                      const currencyAlerts = getAlerts().filter(alert => alert.currency === currency) || [];
                      const hasAlerts = currencyAlerts.length > 0;
                      
                      return (
                        <tr key={currency}>
                          <td>{currency}</td>
                          <td>{formatCurrency(data.totalBalance || 0)}</td>
                          <td>{data.banks?.length || 0}</td>
                          <td>
                            <span style={{ color: hasAlerts ? 'var(--error-color)' : 'var(--success-color)' }}>
                              {currencyAlerts.length} alert{currencyAlerts.length !== 1 ? 's' : ''}
                            </span>
                          </td>
                          <td>
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '0.25rem',
                              color: hasAlerts ? 'var(--error-color)' : 'var(--success-color)'
                            }}>
                              {hasAlerts ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                              {hasAlerts ? 'Needs Attention' : 'Normal'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <p>No data available for summary report.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CorrespondentReports;