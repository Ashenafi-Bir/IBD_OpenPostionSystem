import React, { useState, useEffect } from 'react';
import { dailyBalanceService, currencyService, paidUpCapitalService, exchangeRateService } from '../services/api';
import DataTable from '../components/common/DataTable';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { Download, Calculator } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';

const PositionReport = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [positionData, setPositionData] = useState(null);
  const [paidUpCapital, setPaidUpCapital] = useState(2979527); // Default value

  // Load paid-up capital
  useEffect(() => {
    const loadPaidUpCapital = async () => {
      try {
        const data = await paidUpCapitalService.get();
        setPaidUpCapital(data.capitalAmount || 2979527);
      } catch (err) {
        console.error('Error loading paid-up capital:', err);
      }
    };

    loadPaidUpCapital();
  }, []);

  // Calculate position data
  const calculatePosition = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get balance reports
      const balanceReports = await dailyBalanceService.getReports(
        selectedDate.toISOString().split('T')[0]
      );

      // Get exchange rates for the date
      const exchangeRates = await exchangeRateService.getRates(
        selectedDate.toISOString().split('T')[0]
      );

      if (!balanceReports || !exchangeRates) {
        throw new Error('Failed to load required data');
      }

      // Get all currencies
      const currencies = await currencyService.getAll();

      const positionReport = {
        currencies: [],
        overall: {
          totalLong: 0,
          totalShort: 0,
          overallOpenPosition: 0,
          overallPercentage: 0,
          paidUpCapital: paidUpCapital
        }
      };

      for (const currency of currencies) {
        const currencyTotals = balanceReports.totals.find(
          (t) => t.currency === currency.code
        );
        if (!currencyTotals) continue;

        // ✅ Safely match exchange rate by currency object OR currency_id
        const exchangeRate = exchangeRates.find(
          (rate) =>
            (rate.currency && rate.currency.code === currency.code) ||
            (rate.currency_id && rate.currency_id === currency.id)
        );
        if (!exchangeRate) continue;

        const position =
          currencyTotals.asset +
          currencyTotals.memoAsset -
          (currencyTotals.liability + currencyTotals.memoLiability);

        const midRate = parseFloat(exchangeRate.midRate);
        const positionLocal = position * midRate;
        const percentage = (positionLocal / paidUpCapital) * 100;

        positionReport.currencies.push({
          currency: currency.code,
          asset: currencyTotals.asset,
          liability: currencyTotals.liability,
          memoAsset: currencyTotals.memoAsset,
          memoLiability: currencyTotals.memoLiability,
          position,
          midRate,
          positionLocal,
          percentage,
          type: position >= 0 ? 'long' : 'short'
        });
      }

      // Totals
      positionReport.overall.totalLong = positionReport.currencies
        .filter((c) => c.type === 'long')
        .reduce((sum, c) => sum + c.positionLocal, 0);

      positionReport.overall.totalShort = positionReport.currencies
        .filter((c) => c.type === 'short')
        .reduce((sum, c) => sum + c.positionLocal, 0);

      positionReport.overall.overallOpenPosition =
        positionReport.overall.totalLong + positionReport.overall.totalShort;

      positionReport.overall.overallPercentage =
        (positionReport.overall.overallOpenPosition / paidUpCapital) * 100;

      setPositionData(positionReport);
    } catch (err) {
      setError(err.message);
      console.error('Error calculating position:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculatePosition();
  }, [selectedDate, paidUpCapital]);

  const positionColumns = [
    { key: 'currency', title: 'Currency' },
    { key: 'asset', title: 'Assets', render: (v) => formatCurrency(v) },
    { key: 'liability', title: 'Liabilities', render: (v) => formatCurrency(v) },
    { key: 'memoAsset', title: 'Memo Assets', render: (v) => formatCurrency(v) },
    { key: 'memoLiability', title: 'Memo Liabilities', render: (v) => formatCurrency(v) },
    {
      key: 'position',
      title: 'Position',
      render: (value) => (
        <span
          style={{
            color: value >= 0 ? 'var(--success-color)' : 'var(--error-color)',
            fontWeight: '600'
          }}
        >
          {formatCurrency(value)}
        </span>
      )
    },
    {
      key: 'positionLocal',
      title: 'Position (Local)',
      render: (v) => formatCurrency(v, 'ETB')
    },
    {
      key: 'percentage',
      title: '% of Capital',
      render: (value) => (
        <span style={{ color: Math.abs(value) > 5 ? 'var(--error-color)' : 'inherit' }}>
          {formatNumber(value)}%
        </span>
      )
    }
  ];

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ color: 'var(--error-color)', marginBottom: '1rem' }}>
          Error loading position report: {error}
        </div>
        <button onClick={calculatePosition} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}
      >
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calculator size={24} />
          Position Report
        </h1>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="form-input"
          />

          <button className="btn btn-primary">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {positionData && (
        <>
          {/* Summary Cards */}
          <div className="stats-grid" style={{ marginBottom: '2rem' }}>
            <div className="stat-card">
              <p className="stat-label">Total Long Positions</p>
              <p className="stat-value1" style={{ color: 'var(--success-color)' }}>
                {formatCurrency(positionData.overall.totalLong, 'ETB')}
              </p>
            </div>

            <div className="stat-card">
              <p className="stat-label">Total Short Positions</p>
              <p className="stat-value1" style={{ color: 'var(--error-color)' }}>
                {formatCurrency(positionData.overall.totalShort, 'ETB')}
              </p>
            </div>

            <div className="stat-card">
              <p className="stat-label">Overall Open Position</p>
              <p className="stat-value1">
                {formatCurrency(positionData.overall.overallOpenPosition, 'ETB')}
              </p>
            </div>

            <div className="stat-card">
              <p className="stat-label">% of Total Capital</p>
              <p
                className="stat-value1"
                style={{
                  color:
                    Math.abs(positionData.overall.overallPercentage) > 10
                      ? 'var(--error-color)'
                      : 'inherit'
                }}
              >
                {formatNumber(positionData.overall.overallPercentage)}%
              </p>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Detailed Position by Currency</h3>
            <DataTable columns={positionColumns} data={positionData.currencies || []} />
          </div>

          {/* Notes */}
          <div className="card" style={{ marginTop: '2rem' }}>
            <h4>Notes</h4>
            <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)' }}>
              <li>Positive = long position (assets exceed liabilities)</li>
              <li>Negative = short position (liabilities exceed assets)</li>
              <li>Positions &gt; 10% of capital require management attention</li>
              <li>Local amounts use mid exchange rates</li>
              <li>Paid-up Capital: {formatCurrency(paidUpCapital, 'ETB')}</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default PositionReport;
