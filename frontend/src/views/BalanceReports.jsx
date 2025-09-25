import React, { useState, useEffect, useCallback } from 'react';
import { balanceService } from '../services/api';
import DataTable from '../components/common/DataTable';
import DatePicker from 'react-datepicker';
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters';
import { Calendar, Download, Filter, RefreshCw } from 'lucide-react';

const BalanceReports = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState({
    cashOnHand: null,
    totals: null,
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

      const totals = await balanceService.getTotals(date, options);
      const cashOnHand = await balanceService.getCashOnHand(selectedCurrency, date, options);
      
      setReportData({ totals, cashOnHand });
      
      return () => abortController.abort();
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
        console.error('Balance reports loading error:', err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate, selectedCurrency]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const handleRefresh = () => {
    loadReportData(true);
  };
  
  const cashOnHandColumns = [
    { key: 'currency', title: 'Currency' },
    { key: 'yesterdayBalance', title: 'Yesterday Balance', render: (value) => formatCurrency(value, selectedCurrency) },
    { key: 'todayPurchase', title: "Today's Purchases", render: (value) => formatCurrency(value, selectedCurrency) },
    { key: 'todaySale', title: "Today's Sales", render: (value) => formatCurrency(value, selectedCurrency) },
    { key: 'todayCashOnHand', title: "Today's Cash on Hand", render: (value) => formatCurrency(value, selectedCurrency) },
  ];

  const totalsColumns = [
    { key: 'currency', title: 'Currency' },
    { key: 'asset', title: 'Assets', render: (value) => formatCurrency(value) },
    { key: 'liability', title: 'Liabilities', render: (value) => formatCurrency(value) },
    { key: 'memoAsset', title: 'Memo Assets', render: (value) => formatCurrency(value) },
    { key: 'memoLiability', title: 'Memo Liabilities', render: (value) => formatCurrency(value) },
    { key: 'totalLiability', title: 'Total Liability', render: (value) => formatCurrency(value) },
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
        <h1>Balance Reports</h1>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            className="form-input"
            style={{ width: '120px' }}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="JPY">JPY</option>
          </select>
          
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

      {/* Cash on Hand Calculation */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Calendar size={20} />
          Cash on Hand Calculation for {formatDate(selectedDate)}
        </h3>
        
        <DataTable
          columns={cashOnHandColumns}
          data={reportData.cashOnHand ? [reportData.cashOnHand] : []}
          loading={refreshing}
        />
      </div>

      {/* Totals Report */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Asset and Liability Totals</h3>
        
        <DataTable
          columns={totalsColumns}
          data={reportData.totals || []}
          loading={refreshing}
        />
      </div>
    </div>
  );
};

export default BalanceReports;