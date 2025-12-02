import React, { useState, useEffect, useRef, useCallback } from 'react';
import { dailyBalanceService, currencyService, paidUpCapitalService, exchangeRateService, bsaReportService } from '../services/api';
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
  const [dataLoaded, setDataLoaded] = useState(false);
  const [bsaLoading, setBsaLoading] = useState(false);

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

  // Load paid-up capital for specific date
  const loadPaidUpCapitalForDate = useCallback(async (date) => {
    try {
      const dateString = date.toISOString().split('T')[0];
      const data = await paidUpCapitalService.getForDate(dateString);
      if (data && data.capitalAmount) {
        setPaidUpCapital(data.capitalAmount);
      } else {
        // Fallback to default if no capital found for date
        setPaidUpCapital(2979527);
      }
    } catch (err) {
      console.error('Error loading paid-up capital for date:', err);
      setPaidUpCapital(2979527); // Fallback to default
    }
  }, []);

  // Calculate position data with proper error handling and validation
  const calculatePosition = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setDataLoaded(false);

      // Validate date
      const dateString = selectedDate.toISOString().split('T')[0];
      if (!dateString || isNaN(new Date(dateString).getTime())) {
        throw new Error('Invalid date selected');
      }

      // Load paid-up capital for the selected date first
      await loadPaidUpCapitalForDate(selectedDate);

      // Fetch all data in parallel
      const [balanceReports, exchangeRates, currencies] = await Promise.all([
        dailyBalanceService.getReports(dateString).catch(err => {
          console.error('Error loading balance reports:', err);
          throw new Error(`Failed to load balance reports: ${err.message}`);
        }),
        exchangeRateService.getRates(dateString).catch(err => {
          console.error('Error loading exchange rates:', err);
          throw new Error(`Failed to load exchange rates: ${err.message}`);
        }),
        currencyService.getAll().catch(err => {
          console.error('Error loading currencies:', err);
          throw new Error(`Failed to load currencies: ${err.message}`);
        })
      ]);

      // Validate data structure
      if (!balanceReports || !Array.isArray(balanceReports.totals)) {
        throw new Error('Invalid balance reports data structure');
      }

      if (!exchangeRates || !Array.isArray(exchangeRates)) {
        throw new Error('Invalid exchange rates data structure');
      }

      if (!currencies || !Array.isArray(currencies)) {
        throw new Error('Invalid currencies data structure');
      }

      const positionReport = {
        currencies: [],
        overall: {
          totalLong: 0,
          totalShort: 0,
          overallOpenPosition: 0,
          overallPercentage: 0,
          paidUpCapital: paidUpCapital,
          calculationDate: dateString
        }
      };

      // Process each currency with data validation
      for (const currency of currencies) {
        if (!currency || !currency.code) continue;

        const currencyTotals = balanceReports.totals.find(
          (t) => t && t.currency === currency.code
        );
        
        if (!currencyTotals) continue;

        const exchangeRate = exchangeRates.find(
          (rate) =>
            (rate.currency && rate.currency.code === currency.code) ||
            (rate.currency_id && rate.currency_id === currency.id)
        );
        
        if (!exchangeRate || !exchangeRate.midRate) continue;

        // Calculate position with safe number parsing
        const asset = Number(currencyTotals.asset) || 0;
        const memoAsset = Number(currencyTotals.memoAsset) || 0;
        const liability = Number(currencyTotals.liability) || 0;
        const memoLiability = Number(currencyTotals.memoLiability) || 0;
        
        const position = (asset + memoAsset) - (liability + memoLiability);
        const midRate = parseFloat(exchangeRate.midRate) || 1;
        
        // Avoid NaN and Infinity values
        const positionLocal = isFinite(position * midRate) ? position * midRate : 0;
        const percentage = isFinite((positionLocal / paidUpCapital) * 100) 
          ? (positionLocal / paidUpCapital) * 100 
          : 0;

        positionReport.currencies.push({
          currency: currency.code,
          asset,
          liability,
          memoAsset,
          memoLiability,
          position,
          midRate,
          positionLocal,
          percentage,
          type: position >= 0 ? 'long' : 'short'
        });
      }

      // ORIGINAL NET POSITION CALCULATION LOGIC
      const positivePositions = positionReport.currencies
        .filter((c) => c.positionLocal > 0)
        .reduce((sum, c) => sum + c.positionLocal, 0);

      const negativePositions = positionReport.currencies
        .filter((c) => c.positionLocal < 0)
        .reduce((sum, c) => sum + Math.abs(c.positionLocal), 0);

      // Set total long and short
      positionReport.overall.totalLong = positivePositions;
      positionReport.overall.totalShort = negativePositions;

      // Determine net position based on which is larger
      if (negativePositions > positivePositions) {
        positionReport.overall.overallOpenPosition = -negativePositions;
      } else {
        positionReport.overall.overallOpenPosition = positivePositions;
      }

      positionReport.overall.overallPercentage =
        (positionReport.overall.overallOpenPosition / paidUpCapital) * 100;

      // Update paid-up capital in the report with the actual value used
      positionReport.overall.paidUpCapital = paidUpCapital;

      // Only set state if data is valid
      setPositionData(positionReport);
      setDataLoaded(true);
      
    } catch (err) {
      console.error('Error calculating position:', err);
      setError(err.message || 'An unexpected error occurred');
      setPositionData(null);
      setDataLoaded(false);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, paidUpCapital, loadPaidUpCapitalForDate]);

  // Use useEffect with proper cleanup to prevent race conditions
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (isMounted) {
        await calculatePosition();
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [calculatePosition]);

  // Handle date change - reload data when date changes
  const handleDateChange = (date) => {
    setSelectedDate(date);
    // The useEffect will automatically trigger because selectedDate changes
  };

  // Add BSA Report handler
  const handleBSAReport = async () => {
    try {
      setBsaLoading(true);
      const dateString = selectedDate.toISOString().split('T')[0];
      await bsaReportService.generate(dateString);
    } catch (error) {
      console.error('Error generating BSA report:', error);
      alert('Failed to generate BSA report: ' + error.message);
    } finally {
      setBsaLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (!positionData || !dataLoaded) return;
    
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
          paidUpCapital: positionData.overall.paidUpCapital,
          calculationDate: positionData.overall.calculationDate
        },
        details: positionData.currencies.map(currency => ({
          currency: formatCurrencyName(currency.currency),
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
      } else if (format === 'bsa') {
        await handleBSAReport();
        return;
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
            onChange={(e) => handleDateChange(new Date(e.target.value))}
            className="form-input"
            max={new Date().toISOString().split('T')[0]}
          />

          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button 
              className="btn btn-primary"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              disabled={exportLoading || !dataLoaded}
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
                  disabled={exportLoading || !dataLoaded}
                  style={{
                    width: '100%',
                    padding: '0.5rem 1rem',
                    border: 'none',
                    backgroundColor: 'transparent',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: dataLoaded ? 'pointer' : 'not-allowed',
                    opacity: dataLoaded ? 1 : 0.6
                  }}
                >
                  <Table size={16} />
                  Export to Excel
                </button>
                <button 
                  className="dropdown-item"
                  onClick={() => handleExport('pdf')}
                  disabled={exportLoading || !dataLoaded}
                  style={{
                    width: '100%',
                    padding: '0.5rem 1rem',
                    border: 'none',
                    backgroundColor: 'transparent',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: dataLoaded ? 'pointer' : 'not-allowed',
                    opacity: dataLoaded ? 1 : 0.6,
                    borderTop: '1px solid #dee2e6'
                  }}
                >
                  <FileText size={16} />
                  Export to PDF
                </button>
                <button 
                  className="dropdown-item"
                  onClick={() => handleExport('bsa')}
                  disabled={bsaLoading || !dataLoaded}
                  style={{
                    width: '100%',
                    padding: '0.5rem 1rem',
                    border: 'none',
                    backgroundColor: 'transparent',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: dataLoaded ? 'pointer' : 'not-allowed',
                    opacity: dataLoaded ? 1 : 0.6,
                    borderTop: '1px solid #dee2e6'
                  }}
                >
                  {bsaLoading ? (
                    <LoadingSpinner size="small" />
                  ) : (
                    <FileText size={16} />
                  )}
                  BSA Report
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {positionData && dataLoaded && (
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

          {/* Capital Information Card */}
          <div className="card" style={{ marginBottom: '2rem', backgroundColor: '#f8f9fa' }}>
            <h4 style={{ marginBottom: '1rem' }}>Capital Information</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <strong>Paid-up Capital:</strong> {formatCurrency(positionData.overall.paidUpCapital, 'ETB')}
              </div>
              <div>
                <strong>Effective Date:</strong> {positionData.overall.calculationDate}
              </div>
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6c757d' }}>
              <em>Using capital effective on or before the report date</em>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Detailed Position by Currency</h3>
            <DataTable 
              columns={positionColumns} 
              data={positionData.currencies || []} 
              emptyMessage="No currency data available for the selected date"
            />
          </div>

          {/* Notes */}
          <div className="card" style={{ marginTop: '2rem' }}>
            <h4>Notes</h4>
            <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)' }}>
              <li>Positive = long position (assets exceed liabilities)</li>
              <li>Negative = short position (liabilities exceed assets)</li>
              <li>Positions &gt; 15% and &le; 0% of capital require management attention</li>
              <li>Local amounts use mid exchange rates</li>
              <li>Paid-up Capital: {formatCurrency(positionData.overall.paidUpCapital, 'ETB')} (effective for {positionData.overall.calculationDate})</li>
              <li>Report Date: {selectedDate.toISOString().split('T')[0]}</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default PositionReport;