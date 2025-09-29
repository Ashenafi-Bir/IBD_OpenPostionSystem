import React, { useState, useEffect } from 'react';
import { dailyBalanceService, paidUpCapitalService } from '../services/api';
import StatsCard from '../components/dashboard/StatsCard';
import { CurrencyBarChart, CurrencyDoughnutChart } from '../components/dashboard/CurrencyChart';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { DollarSign, TrendingUp, Landmark, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Dashboard = () => {
  const [today] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState(null);
  const [paidUpCapital, setPaidUpCapital] = useState(2979527);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        const [reports, capital] = await Promise.all([
          dailyBalanceService.getReports(today),
          paidUpCapitalService.get()
        ]);

        setReportData(reports);
        setPaidUpCapital(capital.capitalAmount || 2979527);
      } catch (err) {
        setError(err.message);
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [today]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ color: 'var(--error-color)', marginBottom: '1rem' }}>
          Error loading dashboard: {error}
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="btn btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  // Prepare chart data
  const currencyData = {
    labels: reportData?.totals?.map(item => item.currency) || [],
    datasets: [
      {
        label: 'Assets',
        data: reportData?.totals?.map(item => item.asset) || [],
        backgroundColor: '#10b981',
      },
      {
        label: 'Liabilities',
        data: reportData?.totals?.map(item => item.liability) || [],
        backgroundColor: '#ef4444',
      }
    ]
  };

  // Calculate overall position percentage for dashboard
  const overallPosition = reportData?.totals?.reduce((total, currency) => {
    const position = (currency.asset + currency.memoAsset) - (currency.liability + currency.memoLiability);
    return total + position;
  }, 0) || 0;

  const overallPercentage = (overallPosition / paidUpCapital) * 100;

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Dashboard</h1>
      
      {/* Statistics Grid */}
      <div className="stats-grid">
        <StatsCard
          title="Total Assets"
          value={reportData?.totals?.reduce((sum, item) => sum + item.asset, 0) || 0}
          trend="up"
          percentage={2.5}
          icon={DollarSign}
        />
        
        <StatsCard
          title="Total Liabilities"
          value={reportData?.totals?.reduce((sum, item) => sum + item.liability, 0) || 0}
          trend="down"
          percentage={-1.2}
          icon={TrendingUp}
        />
        
        <StatsCard
          title="Open Position"
          value={overallPercentage}
          percentage={true}
          trend={overallPercentage >= 0 ? 'up' : 'down'}
          icon={Landmark}
        />
        
        <StatsCard
          title="Cash on Hand"
          value={reportData?.cashOnHand?.reduce((sum, item) => sum + item.todayCashOnHand, 0) || 0}
          trend="up"
          percentage={1.8}
          icon={AlertTriangle}
        />
      </div>

      {/* Charts */}
      {reportData?.totals && reportData.totals.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          <div className="chart-container">
            <h3>Currency Distribution</h3>
            <CurrencyBarChart data={currencyData} title="Assets vs Liabilities by Currency" />
          </div>
          
          <div className="chart-container">
            <h3>Asset Composition</h3>
            <CurrencyDoughnutChart 
              data={{
                labels: reportData.totals.map(item => item.currency),
                datasets: [{
                  data: reportData.totals.map(item => item.asset),
                  backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
                }]
              }} 
              title="Assets by Currency" 
            />
          </div>
        </div>
      )}

      {/* Quick Overview */}
      <div className="card">
        <h3>Today's Overview</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <strong>Report Date:</strong> {today}
          </div>
          <div>
            <strong>Currencies:</strong> {reportData?.totals?.length || 0}
          </div>
          <div>
            <strong>Paid-up Capital:</strong> {formatCurrency(paidUpCapital, 'ETB')}
          </div>
          <div>
            <strong>Overall Position:</strong> 
            <span style={{ color: overallPercentage >= 0 ? 'var(--success-color)' : 'var(--error-color)', marginLeft: '0.5rem' }}>
              {formatNumber(overallPercentage)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;