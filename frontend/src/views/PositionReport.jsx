import React, { useState, useEffect, useCallback } from 'react';
import { balanceService } from '../services/api';
import DataTable from '../components/common/DataTable';
import DatePicker from 'react-datepicker';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { TrendingUp, TrendingDown, Download, RefreshCw } from 'lucide-react';

const PositionReport = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [position, setPosition] = useState(null);

  const loadPositionData = useCallback(async (isRefresh = false) => {
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

      const positionData = await balanceService.getPosition(date, options);
      setPosition(positionData);
      
      return () => abortController.abort();
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
        console.error('Position report loading error:', err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadPositionData();
  }, [loadPositionData]);

  const handleRefresh = () => {
    loadPositionData(true);
  };
  
  const positionColumns = [
    { 
      key: 'currency', 
      title: 'Currency' 
    },
    { 
      key: 'asset', 
      title: 'Assets', 
      render: (value) => formatCurrency(value) 
    },
    { 
      key: 'liability', 
      title: 'Liabilities', 
      render: (value) => formatCurrency(value) 
    },
    { 
      key: 'memoAsset', 
      title: 'Memo Assets', 
      render: (value) => formatCurrency(value) 
    },
    { 
      key: 'memoLiability', 
      title: 'Memo Liabilities', 
      render: (value) => formatCurrency(value) 
    },
    { 
      key: 'position', 
      title: 'Position', 
      render: (value, row) => (
        <span style={{ 
          color: value >= 0 ? 'var(--success-color)' : 'var(--error-color)',
          fontWeight: '600'
        }}>
          {formatCurrency(value)}
        </span>
      )
    },
    { 
      key: 'positionLocal', 
      title: 'Position (Local)', 
      render: (value) => formatCurrency(value, 'ETB') 
    },
    { 
      key: 'percentage', 
      title: '% of Capital', 
      render: (value) => (
        <span style={{ 
          color: Math.abs(value) > 5 ? 'var(--error-color)' : 'inherit'
        }}>
          {formatNumber(value)}%
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
        <div className="text-red-500 mb-4">Error loading position report: {error}</div>
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
        <h1>Position Report</h1>
        
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
            {refreshing ? 'Refresh' : 'Refresh'}
          </button>
          
          <button className="btn btn-secondary">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {position && (
        <>
          {/* Summary Cards */}
          <div className="stats-grid" style={{ marginBottom: '2rem' }}>
            <div className="stat-card">
              <p className="stat-label">Total Long Positions</p>
              <p className="stat-value" style={{ color: 'var(--success-color)' }}>
                {formatCurrency(position.overall.totalLong, 'ETB')}
              </p>
            </div>
            
            <div className="stat-card">
              <p className="stat-label">Total Short Positions</p>
              <p className="stat-value" style={{ color: 'var(--error-color)' }}>
                {formatCurrency(position.overall.totalShort, 'ETB')}
              </p>
            </div>
            
            <div className="stat-card">
              <p className="stat-label">Overall Open Position</p>
              <p className="stat-value">
                {formatCurrency(position.overall.overallOpenPosition, 'ETB')}
              </p>
            </div>
            
            <div className="stat-card">
              <p className="stat-label">% of Total Capital</p>
              <p className="stat-value" style={{ 
                color: Math.abs(position.overall.overallPercentage) > 10 ? 'var(--error-color)' : 'inherit'
              }}>
                {formatNumber(position.overall.overallPercentage)}%
              </p>
            </div>
          </div>

          {/* Detailed Position Table */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Detailed Position by Currency</h3>
            
            <DataTable
              columns={positionColumns}
              data={position.currencies || []}
              loading={refreshing}
            />
          </div>

          {/* Notes */}
          <div className="card" style={{ marginTop: '2rem' }}>
            <h4>Notes</h4>
            <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)' }}>
              <li>Positive position indicates long position (assets exceed liabilities)</li>
              <li>Negative position indicates short position (liabilities exceed assets)</li>
              <li>Positions exceeding 10% of total capital require management attention</li>
              <li>All local currency amounts are calculated using mid exchange rates</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default PositionReport;