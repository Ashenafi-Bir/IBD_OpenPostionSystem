import React, { useState, useEffect } from 'react';
import { correspondentService, currencyService } from '../services/api';
import { Plus, Calendar, DollarSign, X, Save, RefreshCw, Download, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

const DailyBalanceEntry = () => {
  const [banks, setBanks] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [selectedBank, setSelectedBank] = useState('');
  const [balanceDate, setBalanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState([]);

  useEffect(() => {
    loadBanks();
    loadCurrencies();
  }, []);

  const loadBanks = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError('');
      
      const response = await correspondentService.getBanks();
      const banksData = response?.data?.data || response?.data || [];
      const banksArray = Array.isArray(banksData) ? banksData : [];
      
      setBanks(banksArray);
      
      if (banksArray.length > 0 && !selectedBank) {
        setSelectedBank(banksArray[0].id.toString());
      }
    } catch (err) {
      console.error('Error loading banks:', err);
      setError('Failed to load banks');
      setBanks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadCurrencies = async () => {
    try {
      const response = await currencyService.getAll();
      const currenciesData = Array.isArray(response) ? response : 
                           Array.isArray(response?.data) ? response.data : [];
      setCurrencies(currenciesData);
    } catch (err) {
      console.error('Failed to load currencies:', err);
      setCurrencies([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedBank || !balanceAmount) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      await correspondentService.addDailyBalance({
        bankId: parseInt(selectedBank),
        balanceDate,
        balanceAmount: parseFloat(balanceAmount),
        notes
      });

      setSuccess('Balance added successfully');
      setBalanceAmount('');
      setNotes('');
      setShowModal(false);
      
      setTimeout(() => {
        loadBanks(true);
      }, 500);
      
    } catch (err) {
      console.error('Error adding balance:', err);
      setError(err.response?.data?.error || err.message || 'Failed to add balance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = () => {
    loadBanks(true);
  };

  const getCurrencyInfo = (bank) => {
    if (!bank) return { code: 'N/A', name: 'N/A' };
    
    if (bank.currency) {
      return { 
        code: bank.currency.code || 'N/A', 
        name: bank.currency.name || 'N/A' 
      };
    }
    
    const currencyId = bank.currencyId;
    if (currencyId && currencies.length > 0) {
      const foundCurrency = currencies.find(currency => currency.id === currencyId);
      if (foundCurrency) {
        return { code: foundCurrency.code, name: foundCurrency.name };
      }
    }
    
    return { code: 'N/A', name: 'N/A' };
  };

  const getSelectedBankCurrency = () => {
    const bank = banks.find(b => b.id === parseInt(selectedBank));
    const currencyInfo = getCurrencyInfo(bank);
    return currencyInfo.code;
  };

  const getRecentBalances = () => {
    const recentBalances = [];
    
    banks.forEach(bank => {
      if (bank.balances && Array.isArray(bank.balances)) {
        bank.balances.slice(0, 3).forEach(balance => {
          recentBalances.push({
            ...balance,
            bankName: bank.bankName,
            currencyInfo: getCurrencyInfo(bank)
          });
        });
      }
    });
    
    return recentBalances.sort((a, b) => new Date(b.balanceDate) - new Date(a.balanceDate)).slice(0, 10);
  };

  // Excel Import/Export Functions
  const downloadTemplate = async () => {
    try {
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Prepare data for template - create rows for each bank
      const templateRows = [
        // Headers
        ['Balance Date', 'Bank ID', 'Bank Name', 'Currency Code', 'Balance Amount', 'Notes'],
      ];

      // Get current date for the template
      const currentDate = new Date().toISOString().split('T')[0];

      // Create sample entries for each bank
      banks.forEach(bank => {
        const currencyInfo = getCurrencyInfo(bank);
        templateRows.push([
          currentDate, // Current date
          bank.id, // Bank ID
          bank.bankName, // Bank Name
          currencyInfo.code, // Currency Code
          0.00, // Default amount (user will fill this)
          `Balance for ${bank.bankName} - REPLACE WITH ACTUAL AMOUNT` // Notes
        ]);
      });

      // Add instructions and reference data
      templateRows.push(
        ['', '', '', '', '', ''],
        ['IMPORTANT INSTRUCTIONS:', '', '', '', '', ''],
        ['1. REPLACE ALL SAMPLE AMOUNTS with your actual balance amounts', '', '', '', '', ''],
        ['2. Do not modify the header row or the first 5 columns (Balance Date, Bank ID, Bank Name, Currency Code, Notes)', '', '', '', '', ''],
        ['3. Balance Date format: YYYY-MM-DD', '', '', '', '', ''],
        ['4. All correspondent banks are pre-populated with their respective currencies', '', '', '', '', ''],
        ['5. Amount must be numeric - enter 0.00 if no balance for that bank', '', '', '', '', ''],
        ['6. Delete any rows you do not want to import', '', '', '', '', ''],
        ['7. Sample amounts are provided for reference only - REPLACE THEM ALL', '', '', '', '', ''],
        ['', '', '', '', '', ''],
        ['TEMPLATE SUMMARY:', '', '', '', '', ''],
        [`- Total Banks: ${banks.length}`, '', '', '', '', ''],
        [`- Total Rows: ${banks.length}`, '', '', '', '', ''],
        [`- Date: ${currentDate}`, '', '', '', '', ''],
        ['', '', '', '', '', ''],
        ['REFERENCE - BANK DETAILS:', 'Bank ID', 'Bank Name', 'Currency', 'Account Number', 'SWIFT Code'],
        ...banks.map(bank => {
          const currencyInfo = getCurrencyInfo(bank);
          return ['', bank.id, bank.bankName, currencyInfo.code, bank.accountNumber || '', bank.swiftCode || ''];
        })
      );

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(templateRows);
      
      // Set column widths
      const colWidths = [
        { wch: 15 }, // Balance Date
        { wch: 10 }, // Bank ID
        { wch: 25 }, // Bank Name
        { wch: 15 }, // Currency Code
        { wch: 15 }, // Balance Amount
        { wch: 40 }  // Notes
      ];
      ws['!cols'] = colWidths;

      // Add styling to make the template more user-friendly
      if (ws['!ref']) {
        const range = XLSX.utils.decode_range(ws['!ref']);
        
        // Style header row (row 0)
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
          if (!ws[cellAddress]) continue;
          if (!ws[cellAddress].s) ws[cellAddress].s = {};
          ws[cellAddress].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4472C4" } },
            alignment: { horizontal: "center" }
          };
        }

        // Style instruction and summary rows
        for (let row = range.s.r; row <= range.e.r; row++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: 0 });
          if (ws[cellAddress] && ws[cellAddress].v && typeof ws[cellAddress].v === 'string') {
            if (ws[cellAddress].v.includes('IMPORTANT INSTRUCTIONS:') || 
                ws[cellAddress].v.includes('TEMPLATE SUMMARY:') ||
                ws[cellAddress].v.includes('REFERENCE -')) {
              if (!ws[cellAddress].s) ws[cellAddress].s = {};
              ws[cellAddress].s = {
                font: { bold: true, color: { rgb: "FF0000" } },
                fill: { fgColor: { rgb: "F2F2F2" } }
              };
            }
          }

          // Highlight sample amount cells to indicate they need to be changed
          const amountCell = XLSX.utils.encode_cell({ r: row, c: 4 });
          if (ws[amountCell] && row > 0 && row <= banks.length) {
            if (!ws[amountCell].s) ws[amountCell].s = {};
            ws[amountCell].s = {
              fill: { fgColor: { rgb: "FFFF00" } }, // Yellow background
              font: { bold: true, color: { rgb: "FF0000" } } // Red bold text
            };
          }
        }

        // Freeze the header row so it's always visible
        ws['!freeze'] = { x: 0, y: 1 };
      }

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Bank Balances Template');

      // Generate file and download
      const fileName = `correspondent_bank_balances_template_${currentDate}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
    } catch (error) {
      console.error('Error downloading template:', error);
      setError('Failed to download template. Please make sure banks are loaded.');
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Remove header row and get data rows
        const headers = jsonData[0];
        const dataRows = jsonData.slice(1).filter(row => row.length > 0 && row[0]); // Skip empty rows

        // Validate headers
        const expectedHeaders = ['Balance Date', 'Bank ID', 'Bank Name', 'Currency Code', 'Balance Amount', 'Notes'];
        const isValidHeaders = expectedHeaders.every((header, index) => 
          headers[index] === header
        );

        if (!isValidHeaders) {
          setImportError('Invalid template format. Please download the latest template.');
          return;
        }

        // Process data
        const processedData = dataRows.map((row, index) => {
          const [balanceDate, bankId, bankName, currencyCode, amount, notes] = row;
          
          // Find bank by ID
          const bank = banks.find(b => b.id === bankId);

          return {
            balanceDate,
            bankId,
            bankName,
            currencyCode,
            amount: parseFloat(amount) || 0,
            notes: notes || '',
            rowNumber: index + 2, // +2 because of header and 1-based indexing
            isValid: bank && amount !== undefined
          };
        });

        // Validate data
        const invalidRows = processedData.filter(item => !item.isValid);
        if (invalidRows.length > 0) {
          const errorDetails = invalidRows.map(item => 
            `Row ${item.rowNumber}: Invalid bank ID (${item.bankId}) or missing amount`
          ).join('\n');
          setImportError(`Invalid data found:\n${errorDetails}`);
          return;
        }

        // Show preview and confirm
        setImportPreviewData(processedData.filter(item => item.isValid));
        setShowImportModal(true);

      } catch (error) {
        console.error('Error processing file:', error);
        setImportError('Error processing file. Please check the format and try again.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = async () => {
    try {
      setImportLoading(true);
      setImportError(null);

      const importData = importPreviewData.map(item => ({
        bankId: item.bankId,
        balanceDate: item.balanceDate,
        balanceAmount: item.amount,
        notes: item.notes
      }));

      const result = await correspondentService.bulkImportBalances(importData);
      
      setImportSuccess(`Successfully imported ${result.created} balances. ${result.updated} balances updated.`);
      setShowImportModal(false);
      setImportPreviewData([]);
      loadBanks(true);
      
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      console.error('Error importing balances:', error);
      setImportError(error.response?.data?.error || 'Failed to import balances');
    } finally {
      setImportLoading(false);
    }
  };

  const recentBalances = getRecentBalances();

  if (loading && !refreshing) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !success) {
    return (
      <div className="text-center p-8">
        <div className="text-red-500 mb-4">Error loading banks: {error}</div>
        <button
          onClick={() => loadBanks(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Daily Balance Entry</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input
            type="date"
            value={balanceDate}
            onChange={(e) => setBalanceDate(e.target.value)}
            className="form-input"
          />
          
          {/* Import/Export Buttons */}
          <button
            onClick={downloadTemplate}
            className="btn btn-secondary"
            disabled={loading || banks.length === 0}
          >
            <Download size={16} /> Download Template
          </button>
          
          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            <Upload size={16} /> Import Excel
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-secondary"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
          >
            <Plus size={16} /> Add Balance
          </button>
        </div>
      </div>

      {/* Import Status Messages */}
      {importError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {importError.split('\n').map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      )}

      {importSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {importSuccess}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {/* Recent Balances Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Recent Balance Entries</h3>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {recentBalances.length} entr{recentBalances.length !== 1 ? 'ies' : 'y'} found
          </span>
        </div>
        
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Bank</th>
                <th>Currency</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentBalances.length > 0 ? (
                recentBalances.map((balance) => (
                  <tr key={balance.id}>
                    <td>{new Date(balance.balanceDate).toLocaleDateString()}</td>
                    <td>{balance.bankName}</td>
                    <td>{balance.currencyInfo.code}</td>
                    <td>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: balance.currencyInfo.code || 'USD'
                      }).format(balance.balanceAmount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    No recent balance entries found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Balance Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="form-group1">
            <div className="modal" style={{ maxWidth: '600px' }}>
              <div className="modal-header">
                <h2 className="modal-title">Add Daily Balance</h2>
                <button 
                  onClick={() => setShowModal(false)}
                  className="modal-close"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                    <div className="form-group">
                      <label className="form-label">Bank *</label>
                      <select
                        value={selectedBank}
                        onChange={(e) => setSelectedBank(e.target.value)}
                        className="form-input"
                        required
                        disabled={loading}
                      >
                        <option value="">Select a bank</option>
                        {Array.isArray(banks) && banks.map((bank) => {
                          const currencyInfo = getCurrencyInfo(bank);
                          return (
                            <option key={bank.id} value={bank.id}>
                              {bank.bankName} ({currencyInfo.code}) {bank.accountNumber ? `- ${bank.accountNumber}` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Date *</label>
                      <div style={{ position: 'relative' }}>
                        <Calendar size={20} style={{ 
                          position: 'absolute', 
                          left: '10px', 
                          top: '50%', 
                          transform: 'translateY(-50%)', 
                          color: 'var(--text-secondary)' 
                        }} />
                        <input
                          type="date"
                          value={balanceDate}
                          onChange={(e) => setBalanceDate(e.target.value)}
                          className="form-input"
                          style={{ paddingLeft: '40px' }}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Balance Amount *</label>
                      <div style={{ position: 'relative' }}>
                        <DollarSign size={20} style={{ 
                          position: 'absolute', 
                          left: '10px', 
                          top: '50%', 
                          transform: 'translateY(-50%)', 
                          color: 'var(--text-secondary)' 
                        }} />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={balanceAmount}
                          onChange={(e) => setBalanceAmount(e.target.value)}
                          className="form-input"
                          style={{ paddingLeft: '40px' }}
                          placeholder={`Enter amount in ${getSelectedBankCurrency()}`}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Notes (Optional)</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows="3"
                        className="form-input"
                        placeholder="Additional notes about this balance entry..."
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn btn-primary"
                    >
                      <Save size={16} style={{ marginRight: '0.5rem' }} />
                      {submitting ? 'Adding Balance...' : 'Add Balance'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Preview Modal */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Confirm Bulk Import</h2>
              <button 
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreviewData([]);
                  setImportError(null);
                }}
                className="modal-close"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div>
                <p style={{ marginBottom: '1rem' }}>
                  Please review the {importPreviewData.length} balances that will be imported:
                </p>
                
                <div style={{ maxHeight: '400px', overflow: 'auto', marginBottom: '1rem' }}>
                  <table className="table" style={{ fontSize: '0.875rem' }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Bank</th>
                        <th>Currency</th>
                        <th>Amount</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreviewData.slice(0, 50).map((item, index) => (
                        <tr key={index}>
                          <td>{item.balanceDate}</td>
                          <td>{item.bankName}</td>
                          <td>{item.currencyCode}</td>
                          <td>
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: item.currencyCode || 'USD'
                            }).format(item.amount)}
                          </td>
                          <td>{item.notes}</td>
                        </tr>
                      ))}
                      {importPreviewData.length > 50 && (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', fontStyle: 'italic' }}>
                            ... and {importPreviewData.length - 50} more records
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowImportModal(false);
                      setImportPreviewData([]);
                    }}
                    className="btn btn-secondary"
                    disabled={importLoading}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmImport} 
                    className="btn btn-primary"
                    disabled={importLoading}
                  >
                    {importLoading ? 'Importing...' : `Import ${importPreviewData.length} Balances`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyBalanceEntry;