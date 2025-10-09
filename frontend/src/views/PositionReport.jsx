import React, { useState, useEffect, useRef } from 'react';
import { dailyBalanceService, currencyService, paidUpCapitalService, exchangeRateService } from '../services/api';
import DataTable from '../components/common/DataTable';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { Download, Calculator, FileText, Table, ChevronDown } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

const PositionReport = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [positionData, setPositionData] = useState(null);
  const [paidUpCapital, setPaidUpCapital] = useState(2979527);
  const [exportLoading, setExportLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

      const balanceReports = await dailyBalanceService.getReports(
        selectedDate.toISOString().split('T')[0]
      );

      const exchangeRates = await exchangeRateService.getRates(
        selectedDate.toISOString().split('T')[0]
      );

      if (!balanceReports || !exchangeRates) {
        throw new Error('Failed to load required data');
      }

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

      // Calculate totals
      positionReport.overall.totalLong = positionReport.currencies
        .filter((c) => c.type === 'long')
        .reduce((sum, c) => sum + c.positionLocal, 0);

      positionReport.overall.totalShort = Math.abs(positionReport.currencies
        .filter((c) => c.type === 'short')
        .reduce((sum, c) => sum + c.positionLocal, 0));

      positionReport.overall.overallOpenPosition =
        positionReport.overall.totalLong - positionReport.overall.totalShort;

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

  const handleExport = async (format) => {
    if (!positionData) return;
    
    try {
      setExportLoading(true);
      setDropdownOpen(false);
      
      const exportData = {
        reportTitle: 'OPEN FOREIGN CURRENCY POSITION REPORT',
        reportDate: selectedDate,
        bankName: 'ADDIS INTERNATIONAL BANK S.C.',
        contactPerson: 'Phone No. 011 557 09 92',
        faxNo: 'Fax No. 011-557 05 28',
        summary: {
          totalLong: positionData.overall.totalLong,
          totalShort: positionData.overall.totalShort,
          overallOpenPosition: positionData.overall.overallOpenPosition,
          overallPercentage: positionData.overall.overallPercentage,
          paidUpCapital: positionData.overall.paidUpCapital
        },
        details: positionData.currencies.map(currency => ({
          currency:formatCurrencyName(currency.currency),
          asset: currency.asset,
          liability: currency.liability,
          memoAsset: currency.memoAsset,
          memoLiability: currency.memoLiability,
          position: currency.position,
          midRate: currency.midRate,
          positionLocal: currency.positionLocal,
          percentage: currency.percentage,
          type: currency.type
        }))
      };

      if (format === 'excel') {
        await exportToExcel(exportData);
      } else if (format === 'pdf') {
        await exportToPDF(exportData);
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export report: ' + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  // Helper function to format currency names
  const formatCurrencyName = (code) => {
    const names = {
      'USD': 'US Dollars',
      'EUR': 'EURO',
      'CHF': 'Swiss Frank',
      'GBP': 'Pound Sterling',
      'JPY': 'Japanese Yen',
      'SEK': 'Swedish kroner'
    };
    return names[code] || code;
  };

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

          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button 
              className="btn btn-primary"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              disabled={exportLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {exportLoading ? (
                <LoadingSpinner size="small" />
              ) : (
                <>
                  <Download size={16} />
                  Export
                  <ChevronDown size={16} />
                </>
              )}
            </button>
            
            {dropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.25rem',
                backgroundColor: 'white',
                border: '1px solid #dee2e6',
                borderRadius: '0.375rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                zIndex: 1000,
                minWidth: '160px'
              }}>
                <button 
                  className="dropdown-item"
                  onClick={() => handleExport('excel')}
                  disabled={exportLoading}
                  style={{
                    width: '100%',
                    padding: '0.5rem 1rem',
                    border: 'none',
                    backgroundColor: 'transparent',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  <Table size={16} />
                  Export to Excel
                </button>
                <button 
                  className="dropdown-item"
                  onClick={() => handleExport('pdf')}
                  disabled={exportLoading}
                  style={{
                    width: '100%',
                    padding: '0.5rem 1rem',
                    border: 'none',
                    backgroundColor: 'transparent',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    borderTop: '1px solid #dee2e6'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  <FileText size={16} />
                  Export to PDF
                </button>
              </div>
            )}
          </div>
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
              <li>Positions &gt; 15% and &le; 0% of capital require management attention</li>
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