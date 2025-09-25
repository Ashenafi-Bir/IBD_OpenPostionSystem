import React, { useState, useEffect } from 'react';
import { balanceService } from '../services/api';
import StatsCard from '../components/dashboard/StatsCard';
import { CurrencyBarChart, CurrencyDoughnutChart } from '../components/dashboard/CurrencyChart';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { DollarSign, TrendingUp, Landmark, AlertTriangle, RefreshCw } from 'lucide-react';

const Dashboard = () => {
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    totals: null,
    position: null,
    cashOnHand: {}
  });

  const loadDashboardData = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      // Create abort controller for this request session
      const abortController = new AbortController();
      const options = { signal: abortController.signal };

      // Load data sequentially to prevent overwhelming the backend
      const totals = await balanceService.getTotals(date, options);
      setDashboardData(prev => ({ ...prev, totals }));

      const position = await balanceService.getPosition(date, options);
      setDashboardData(prev => ({ ...prev, position }));

      // Load cash on hand data sequentially for each currency
      const currencies = ['USD', 'EUR', 'GBP'];
      const cashOnHandData = {};
      
      for (const currency of currencies) {
        try {
          const cashData = await balanceService.getCashOnHand(currency, date, options);
          cashOnHandData[currency] = cashData;
          setDashboardData(prev => ({
            ...prev,
            cashOnHand: { ...prev.cashOnHand, [currency]: cashData }
          }));
          
          // Small delay between requests to prevent overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
          if (err.name !== 'AbortError') {
            console.error(`Failed to load cash data for ${currency}:`, err);
          }
        }
      }

      return () => abortController.abort();
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
        console.error('Dashboard data loading error:', err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [date]);

  const handleRefresh = () => {
    loadDashboardData(true);
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
        <div className="text-red-500 mb-4">Error loading dashboard data: {error}</div>
        <button 
          onClick={handleRefresh}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  // Prepare chart data
  const currencyData = {
    labels: dashboardData.totals?.map(item => item.currency) || [],
    datasets: [
      {
        label: 'Assets',
        data: dashboardData.totals?.map(item => item.asset) || [],
        backgroundColor: '#10b981',
      },
      {
        label: 'Liabilities',
        data: dashboardData.totals?.map(item => item.liability) || [],
        backgroundColor: '#ef4444',
      }
    ]
  };

  const positionData = {
    labels: dashboardData.position?.currencies?.map(item => item.currency) || [],
    datasets: [
      {
        label: 'Position (%)',
        data: dashboardData.position?.currencies?.map(item => item.percentage) || [],
        backgroundColor: [
          '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'
        ],
      }
    ]
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Assets (USD)"
          value={dashboardData.totals?.find(t => t.currency === 'USD')?.asset || 0}
          currency="USD"
          trend="up"
          percentage={2.5}
          icon={DollarSign}
          loading={refreshing}
        />
        
        <StatsCard
          title="Total Liabilities (USD)"
          value={dashboardData.totals?.find(t => t.currency === 'USD')?.liability || 0}
          currency="USD"
          trend="down"
          percentage={-1.2}
          icon={TrendingUp}
          loading={refreshing}
        />
        
        <StatsCard
          title="Open Position"
          value={dashboardData.position?.overall?.overallPercentage || 0}
          percentage={true}
          trend={dashboardData.position?.overall?.overallPercentage >= 0 ? 'up' : 'down'}
          icon={Landmark}
          loading={refreshing}
        />
        
        <StatsCard
          title="Alerts"
          value={3}
          trend="up"
          percentage={50}
          icon={AlertTriangle}
          loading={refreshing}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Currency Distribution</h3>
          <CurrencyBarChart data={currencyData} title="Assets vs Liabilities by Currency" />
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Position Distribution</h3>
          <CurrencyDoughnutChart data={positionData} title="Position by Currency" />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <p className="text-gray-600">Dashboard content will be expanded with more widgets and data visualizations.</p>
      </div>
    </div>
  );
};

export default Dashboard;