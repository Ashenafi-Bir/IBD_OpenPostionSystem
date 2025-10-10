import React, { useState, useEffect } from 'react';
import { dailyBalanceService, paidUpCapitalService } from '../services/api';
import StatsCard from '../components/dashboard/StatsCard';
import { CurrencyBarChart, CurrencyDoughnutChart } from '../components/dashboard/CurrencyChart';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { DollarSign, TrendingUp, Landmark, AlertTriangle, Banknote, Scale, PieChart } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import './Dashboard.css'; // We'll create this for additional styling

const Dashboard = () => {
  const [today] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState(null);
  const [paidUpCapital, setPaidUpCapital] = useState(2979527);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState('ALL');

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

  // Filter data based on selected currency
  const filteredTotals = selectedCurrency === 'ALL' 
    ? reportData?.totals 
    : reportData?.totals?.filter(item => item.currency === selectedCurrency);

  const filteredCashOnHand = selectedCurrency === 'ALL'
    ? reportData?.cashOnHand
    : reportData?.cashOnHand?.filter(item => item.currency === selectedCurrency);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
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

  // Prepare chart data for all currencies
  const currencyData = {
    labels: reportData?.totals?.map(item => item.currency) || [],
    datasets: [
      {
        label: 'Assets',
        data: reportData?.totals?.map(item => item.asset) || [],
        backgroundColor: '#10b981',
        borderColor: '#0da271',
        borderWidth: 1
      },
      {
        label: 'Liabilities',
        data: reportData?.totals?.map(item => item.liability) || [],
        backgroundColor: '#ef4444',
        borderColor: '#dc2626',
        borderWidth: 1
      },
      {
        label: 'Cash on Hand',
        data: reportData?.cashOnHand?.map(item => item.todayCashOnHand) || [],
        backgroundColor: '#3b82f6',
        borderColor: '#2563eb',
        borderWidth: 1
      }
    ]
  };

  // Calculate position for each currency
  const currencyPositions = reportData?.totals?.map(currency => {
    const position = (currency.asset + currency.memoAsset) - (currency.liability + currency.memoLiability);
    const positionPercentage = (position / paidUpCapital) * 100;
    return {
      ...currency,
      position,
      positionPercentage,
      type: position >= 0 ? 'long' : 'short'
    };
  }) || [];


  
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Financial Dashboard</h1>
        <div className="date-filter">
          <span className="report-date">Report Date: {today}</span>
          <select 
            value={selectedCurrency} 
            onChange={(e) => setSelectedCurrency(e.target.value)}
            className="currency-select"
          >
            <option value="ALL">All Currencies</option>
            {reportData?.totals?.map(currency => (
              <option key={currency.currency} value={currency.currency}>
                {currency.currency}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Currency Summary Cards */}
      <div className="currency-summary-section">
        <h2>
          <Banknote size={24} />
          Currency Summary {selectedCurrency !== 'ALL' && `- ${selectedCurrency}`}
        </h2>
        
        <div className="currency-cards-grid">
          {filteredTotals?.map((currency) => (
            <div key={currency.currency} className="card">
              <div className="currency-header">
                <h3>{currency.currency}</h3>
                <span className={`position-badge ${currencyPositions.find(c => c.currency === currency.currency)?.type}`}>
                  {currencyPositions.find(c => c.currency === currency.currency)?.type?.toUpperCase()}
                </span>
              </div>
              
              <div className="currency-stats">
                <div className="stat-row">
                  <span className="stat-label">Total Assets:</span>
                  <span className="stat-value asset">
                    {formatCurrency(currency.asset, currency.currency)}
                  </span>
                </div>
                
                <div className="stat-row">
                  <span className="stat-label">Cash on Hand:</span>
                  <span className="stat-value cash">
                    {formatCurrency(
                      filteredCashOnHand?.find(c => c.currency === currency.currency)?.todayCashOnHand || 0, 
                      currency.currency
                    )}
                  </span>
                </div>
                
                <div className="stat-row">
                  <span className="stat-label">Total Liabilities:</span>
                  <span className="stat-value liability">
                    {formatCurrency(currency.liability, currency.currency)}
                  </span>
                </div>
                
                <div className="stat-row">
                  <span className="stat-label">Memo Assets:</span>
                  <span className="stat-value memo-asset">
                    {formatCurrency(currency.memoAsset, currency.currency)}
                  </span>
                </div>
                
                <div className="stat-row">
                  <span className="stat-label">Memo Liabilities:</span>
                  <span className="stat-value memo-liability">
                    {formatCurrency(currency.memoLiability, currency.currency)}
                  </span>
                </div>
                
                <div className="stat-row  card">
                  <span className="stat-label">Net Position:</span>
                  <span className={`stat-value ${
                    currencyPositions.find(c => c.currency === currency.currency)?.type
                  }`}>
                    {formatCurrency(
                      currencyPositions.find(c => c.currency === currency.currency)?.position || 0, 
                      currency.currency
                    )}
                  </span>
                </div>
                
                <div className="stat-row">
                  <span className="stat-label">Position %:</span>
                  <span className={`stat-value ${
                    currencyPositions.find(c => c.currency === currency.currency)?.type
                  }`}>
                    {formatNumber(
                      currencyPositions.find(c => c.currency === currency.currency)?.positionPercentage || 0
                    )}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cash on Hand Details */}
      <div className="cash-on-hand-section">
        <h2>
          <DollarSign size={24} />
          Cash on Hand Details {selectedCurrency !== 'ALL' && `- ${selectedCurrency}`}
        </h2>
        
        <div className=" card cash-cards-grid">
          {filteredCashOnHand?.map((cash) => (
            <div key={cash.currency} className=" card cash-card">
              <div className="cash-header">
                <h3>{cash.currency} Cash Flow</h3>
              </div>
              
              <div className="cash-stats">
                <div className="stat-row">
                  <span className="stat-label">Yesterday's Balance:</span>
                  <span className="stat-value">
                    {formatCurrency(cash.yesterdayBalance, cash.currency)}
                  </span>
                </div>
                
                <div className=" stat-row positive">
                  <span className="stat-label">Today's Purchases:</span>
                  <span className="stat-value">
                    +{formatCurrency(cash.todayPurchase, cash.currency)}
                  </span>
                </div>
                
                <div className="stat-row negative">
                  <span className="stat-label">Today's Sales:</span>
                  <span className="stat-value">
                    -{formatCurrency(cash.todaySale, cash.currency)}
                  </span>
                </div>
                
                <div className="card  highlight">
                  <span className="stat-label">Today's Cash on Hand:</span>
                  <span className="stat-value cash-total">
                    {formatCurrency(cash.todayCashOnHand, cash.currency)}
                  </span>
                </div>
                
                <div className="stat-row">
                  <span className="stat-label">Calculation Type:</span>
                  <span className={`stat-value ${cash.isManualEntry ? 'manual' : 'auto'}`}>
                    {cash.isManualEntry ? 'Manual Entry' : 'Auto Calculated'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Section */}
      {reportData?.totals && reportData.totals.length > 0 && (
        <div className="charts-section">
          <h2>
            <PieChart size={24} />
            Visual Analytics
          </h2>
          
          <div className="charts-grid">
            <div className="chart-container">
              <h3>Assets vs Liabilities by Currency</h3>
              <CurrencyBarChart 
                data={currencyData} 
                title="Financial Position by Currency" 
              />
            </div>
            
            <div className="chart-container">
              <h3>Cash on Hand Distribution</h3>
              <CurrencyDoughnutChart 
                data={{
                  labels: reportData.cashOnHand.map(item => item.currency),
                  datasets: [{
                    data: reportData.cashOnHand.map(item => item.todayCashOnHand),
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16']
                  }]
                }} 
                title="Cash Distribution" 
              />
            </div>
          </div>
        </div>
      )}

      {/* Position Overview */}
      <div className="position-overview">
        <h2>
          <Scale size={5} />
          Position Overview
        </h2>
        
        <div className="position-cards">
          <div className="card position-card long">
            <h2>Long Positions</h2>
            {currencyPositions
              .filter(c => c.type === 'long')
              .map(currency => (
                <div key={currency.currency} className="position-item">
                  <span>{currency.currency}</span>
                  <span>{formatNumber(currency.positionPercentage)}%</span>
                </div>
              ))}
          </div>
          
          <div className=" card position-card short">
            <h2>Short Positions</h2>
            {currencyPositions
              .filter(c => c.type === 'short')
              .map(currency => (
                <div key={currency.currency} className="position-item">
                  <span>{currency.currency}</span>
                  <span>{formatNumber(currency.positionPercentage)}%</span>
                </div>
              ))}
          </div>
          
          <div className=" card position-card info">
            <h2>Capital Information</h2>
            <div className="capital-info">
              <div className="info-item">
                <span>Paid-up Capital:</span>
                <span>{formatCurrency(paidUpCapital, 'ETB')}</span>
              </div>
              <div className="info-item">
                <span>Total Currencies:</span>
                <span>{reportData?.totals?.length || 0}</span>
              </div>
              <div className="info-item">
                <span>Reporting Date:</span>
                <span>{today}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;