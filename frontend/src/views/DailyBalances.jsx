import React, { useState, useEffect, useMemo } from 'react';
import { dailyBalanceService, balanceItemService, currencyService } from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import { useForm } from '../hooks/useForm';
import { required, number, composeValidators } from '../utils/validators';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Plus, Edit, Trash2, CheckCircle, Clock, Send, RefreshCw, Download, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';

const DailyBalances = () => {
  const { hasAnyRole } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingBalance, setEditingBalance] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currencies, setCurrencies] = useState([]);
  const [currenciesLoading, setCurrenciesLoading] = useState(true);

  // Data state
  const [balances, setBalances] = useState([]);
  const [balanceItems, setBalanceItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [importError, setImportError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

  // Form state
  const { values, errors, touched, handleChange, handleBlur, validate, reset } = useForm(
    {
      balanceDate: new Date().toISOString().split('T')[0],
      currencyId: '',
      itemId: '',
      amount: ''
    },
    {
      currencyId: required('Currency is required'),
      itemId: required('Balance item is required'),
      amount: composeValidators(required('Amount is required'), number('Must be a number'))
    }
  );

  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const data = await currencyService.getAll();
        setCurrencies(data);
      } catch (err) {
        console.error('Error loading currencies:', err);
      } finally {
        setCurrenciesLoading(false);
      }
    };

    loadCurrencies();
  }, []);

  // Enhanced function to get balance item name
  const getBalanceItemName = (balance) => {
    if (!balance) return 'N/A';
    
    console.log('Looking for item name in balance:', balance);
    
    // First try to find by item_id mapping to balanceItems array
    const itemId = balance.item_id;
    if (itemId && balanceItems.length > 0) {
      const foundItem = balanceItems.find(item => item.id === itemId);
      if (foundItem) {
        console.log('Found item by ID mapping:', foundItem.name);
        return foundItem.name;
      }
    }
    
    // Then try nested objects
    if (balance.BalanceItem && balance.BalanceItem.name) {
      return balance.BalanceItem.name;
    }
    if (balance.balanceItem && balance.balanceItem.name) {
      return balance.balanceItem.name;
    }
    
    // Last resort: check if there's any name property
    if (balance.name) {
      return balance.name;
    }
    
    return 'N/A';
  };

  // Enhanced function to get currency info
  const getCurrencyInfo = (balance) => {
    if (!balance) return { code: 'N/A', name: 'N/A' };
    
    console.log('Looking for currency in balance:', balance);
    
    // First try to find by currency_id mapping to currencies array
    const currencyId = balance.currency_id;
    if (currencyId && currencies.length > 0) {
      const foundCurrency = currencies.find(currency => currency.id === currencyId);
      if (foundCurrency) {
        console.log('Found currency by ID mapping:', foundCurrency);
        return { code: foundCurrency.code, name: foundCurrency.name };
      }
    }
    
    // Then try nested objects
    if (balance.Currency) {
      return { code: balance.Currency.code, name: balance.Currency.name };
    }
    if (balance.currency) {
      return { code: balance.currency.code, name: balance.currency.name };
    }
    
    return { code: 'N/A', name: 'N/A' };
  };

  // Fetch balances
  const loadBalances = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      const abortController = new AbortController();
      const options = { signal: abortController.signal };

      // Load balances
      const data = await dailyBalanceService.getBalances(
        selectedDate.toISOString().split('T')[0],
        options
      );
      
      console.log('Raw balances data from API:', data);
      setBalances(data || []);

      // Load balance items (static list)
      const items = await balanceItemService.getItems(options);
      console.log('Balance items from API:', items);
      setBalanceItems(items || []);

      return () => abortController.abort();
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('DailyBalances fetch error:', err);
        setError(err.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBalances();
  }, [selectedDate]);

  const groupedBalances = useMemo(() => {
    if (!balances || balances.length === 0) return {};
    
    console.log('Grouping balances:', balances);
    
    return balances.reduce((acc, balance) => {
      const currencyInfo = getCurrencyInfo(balance);
      const currency = currencyInfo.code;
      
      if (!acc[currency]) acc[currency] = [];
      acc[currency].push(balance);
      return acc;
    }, {});
  }, [balances, currencies]);

  // Enhanced function to get item ID from balance
  const getBalanceItemId = (balance) => {
    if (!balance) return '';
    return balance.item_id?.toString() || '';
  };

  // Enhanced function to get currency ID from balance
  const getBalanceCurrencyId = (balance) => {
    if (!balance) return '';
    return balance.currency_id?.toString() || '';
  };

  // Refresh function
  const refreshBalances = () => {
    loadBalances(true);
  };

  // CRUD Handlers
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    try {
      // Prepare data for API - ensure we're using the correct field names
      const apiData = {
        balanceDate: values.balanceDate,
        currencyId: values.currencyId, // This should map to currency_id in backend
        itemId: values.itemId, // This should map to item_id in backend
        amount: values.amount
      };

      console.log('Submitting data:', apiData);

      if (editingBalance) {
        await dailyBalanceService.update(editingBalance.id, { amount: values.amount });
      } else {
        await dailyBalanceService.create(apiData);
      }
      
      setShowModal(false);
      setEditingBalance(null);
      reset();
      refreshBalances();
    } catch (error) {
      console.error('Error submitting balance:', error);
    }
  };

  const handleEdit = (balance) => {
    if (!balance) return;
    
    console.log('Editing balance:', balance);
    
    setEditingBalance(balance);
    reset({
      balanceDate: balance.balanceDate || selectedDate.toISOString().split('T')[0],
      currencyId: getBalanceCurrencyId(balance),
      itemId: getBalanceItemId(balance),
      amount: balance.amount?.toString() || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this balance?')) {
      try {
        await dailyBalanceService.delete(id);
        refreshBalances();
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleSubmitBalance = async (id) => {
    try {
      await dailyBalanceService.submit(id);
      refreshBalances();
    } catch (error) {
      console.error(error);
    }
  };

  const handleAuthorize = async (id) => {
    try {
      await dailyBalanceService.authorize(id);
      refreshBalances();
    } catch (error) {
      console.error(error);
    }
  };

  // Excel Import/Export Functions
 // Excel Import/Export Functions
const downloadTemplate = async () => {
  try {
    // Filter for only EUR, USD, GBP currencies
    const targetCurrencies = currencies.filter(currency => 
      ['EUR', 'USD', 'GBP'].includes(currency.code)
    );

    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Prepare data for template - create rows for each balance item and currency combination
    const templateRows = [
      // Headers
      ['Balance Date', 'Currency Code', 'Balance Item Code', 'Amount', 'Notes'],
    ];

    // Get current date for the template
    const currentDate = new Date().toISOString().split('T')[0];

    // Create sample entries for each balance item and currency combination
    targetCurrencies.forEach(currency => {
      balanceItems.forEach(item => {
        templateRows.push([
          currentDate, // Current date
          currency.code, // Currency code
          item.code, // Balance item code
          0.00, // Default amount (user will fill this)
          `Sample ${item.name} for ${currency.code}` // Notes
        ]);
      });
    });

    // Add instructions and reference data
    templateRows.push(
      ['', '', '', '', ''],
      ['INSTRUCTIONS:', '', '', '', ''],
      ['1. Fill in the Amount column for all rows with your actual balance amounts', '', '', '', ''],
      ['2. Do not modify the header row or the first 4 columns (Balance Date, Currency Code, Balance Item Code, Notes)', '', '', '', ''],
      ['3. Balance Date format: YYYY-MM-DD', '', '', '', ''],
      ['4. All currencies (EUR, USD, GBP) and balance items are pre-populated', '', '', '', ''],
      ['5. Amount must be numeric - enter 0.00 if no balance for that item', '', '', '', ''],
      ['6. Delete any rows you do not want to import', '', '', '', ''],
      ['', '', '', '', ''],
      ['TEMPLATE SUMMARY:', '', '', '', ''],
      [`- Currencies: ${targetCurrencies.map(c => c.code).join(', ')}`, '', '', '', ''],
      [`- Balance Items: ${balanceItems.length} items`, '', '', '', ''],
      [`- Total Rows: ${targetCurrencies.length * balanceItems.length}`, '', '', '', ''],
      [`- Date: ${currentDate}`, '', '', '', ''],
      ['', '', '', '', ''],
      ['REFERENCE - CURRENCY DETAILS:', 'Code', 'Name', 'Symbol', ''],
      ...targetCurrencies.map(currency => ['', currency.code, currency.name, currency.symbol || '', '']),
      ['', '', '', '', ''],
      ['REFERENCE - BALANCE ITEMS:', 'Code', 'Name', 'Category', 'Description'],
      ...balanceItems.map(item => ['', item.code, item.name, item.category, item.description || ''])
    );

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(templateRows);
    
    // Set column widths
    const colWidths = [
      { wch: 15 }, // Balance Date
      { wch: 15 }, // Currency Code
      { wch: 20 }, // Balance Item Code
      { wch: 15 }, // Amount
      { wch: 30 }  // Notes
    ];
    ws['!cols'] = colWidths;

    // Add some basic styling to make the template more user-friendly
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

      // Style instruction rows (find them by content)
      for (let row = range.s.r; row <= range.e.r; row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: 0 });
        if (ws[cellAddress] && ws[cellAddress].v && typeof ws[cellAddress].v === 'string') {
          if (ws[cellAddress].v.includes('INSTRUCTIONS:') || 
              ws[cellAddress].v.includes('TEMPLATE SUMMARY:') ||
              ws[cellAddress].v.includes('REFERENCE -')) {
            if (!ws[cellAddress].s) ws[cellAddress].s = {};
            ws[cellAddress].s = {
              font: { bold: true, color: { rgb: "FF0000" } },
              fill: { fgColor: { rgb: "F2F2F2" } }
            };
          }
        }
      }

      // Freeze the header row so it's always visible
      ws['!freeze'] = { x: 0, y: 1 };
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Balances Template');

    // Generate file and download
    const fileName = `daily_balances_comprehensive_template_${currentDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
  } catch (error) {
    console.error('Error downloading template:', error);
    setError('Failed to download template. Please make sure balance items are loaded.');
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
        const expectedHeaders = ['Balance Date', 'Currency Code', 'Balance Item Code', 'Amount', 'Notes'];
        const isValidHeaders = expectedHeaders.every((header, index) => 
          headers[index] === header
        );

        if (!isValidHeaders) {
          setImportError('Invalid template format. Please download the latest template.');
          return;
        }

        // Process data
        const processedData = dataRows.map((row, index) => {
          const [balanceDate, currencyCode, itemCode, amount, notes] = row;
          
          // Find currency and item IDs
          const currency = currencies.find(c => c.code === currencyCode);
          const balanceItem = balanceItems.find(item => item.code === itemCode);

          return {
            balanceDate,
            currencyCode,
            currencyId: currency?.id,
            itemCode,
            itemId: balanceItem?.id,
            amount: parseFloat(amount) || 0,
            notes: notes || '',
            rowNumber: index + 2, // +2 because of header and 1-based indexing
            isValid: currency && balanceItem && amount
          };
        });

        // Validate data
        const invalidRows = processedData.filter(item => !item.isValid);
        if (invalidRows.length > 0) {
          const errorDetails = invalidRows.map(item => 
            `Row ${item.rowNumber}: Invalid currency code (${item.currencyCode}) or balance item code (${item.itemCode})`
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

  const [importPreviewData, setImportPreviewData] = useState([]);

  const confirmImport = async () => {
    try {
      setImportLoading(true);
      setImportError(null);

      const importData = importPreviewData.map(item => ({
        balanceDate: item.balanceDate,
        currencyId: item.currencyId,
        itemId: item.itemId,
        amount: item.amount,
        notes: item.notes
      }));

      const result = await dailyBalanceService.bulkImport(importData);
      
      setImportSuccess(`Successfully imported ${result.created} balances. ${result.updated} balances updated.`);
      setShowImportModal(false);
      setImportPreviewData([]);
      refreshBalances();
      
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

  const balanceColumns = [
    { 
      key: 'item', 
      title: 'Item', 
      render: (value, row) => {
        const itemName = getBalanceItemName(row);
        console.log('Rendering item for row:', row, 'Item name:', itemName);
        return itemName;
      }
    },
    { 
      key: 'currency', 
      title: 'Currency', 
      render: (value, row) => {
        const currencyInfo = getCurrencyInfo(row);
        return (
          <div>
            <div><strong>{currencyInfo.code}</strong></div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {currencyInfo.name}
            </div>
          </div>
        );
      }
    },
    { 
      key: 'amount', 
      title: 'Amount', 
      render: (value) => formatCurrency(value) 
    },
    {
      key: 'status',
      title: 'Status',
      render: (value) => (
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          color: value === 'authorized' ? 'var(--success-color)' :
                 value === 'submitted' ? 'var(--warning-color)' : 'var(--text-secondary)'
        }}>
          {value === 'authorized' ? <CheckCircle size={16} /> :
           value === 'submitted' ? <Send size={16} /> : <Clock size={16} />}
          {value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Draft'}
        </span>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value, row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => handleEdit(row)} 
            className="btn" 
            style={{ padding: '0.25rem', background: 'none' }} 
            disabled={row.status === 'authorized' && !hasAnyRole(['admin'])}
          >
            <Edit size={16} />
          </button>
          {row.status === 'draft' && (
            <button 
              onClick={() => handleSubmitBalance(row.id)} 
              className="btn" 
              style={{ padding: '0.25rem', background: 'none' }}
            >
              <Send size={16} />
            </button>
          )}
          {row.status === 'submitted' && hasAnyRole(['authorizer', 'admin']) && (
            <button 
              onClick={() => handleAuthorize(row.id)} 
              className="btn" 
              style={{ padding: '0.25rem', background: 'none', color: 'var(--success-color)' }}
            >
              <CheckCircle size={16} />
            </button>
          )}
          <button 
            onClick={() => handleDelete(row.id)} 
            className="btn" 
            style={{ padding: '0.25rem', background: 'none' }} 
            disabled={row.status === 'authorized' && !hasAnyRole(['admin'])}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  // UI states
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
        <div className="text-red-500 mb-4">Error loading balances: {error}</div>
        <button
          onClick={() => loadBalances(true)}
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
        <h1>Daily Balances</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="form-input"
          />
          
          {/* Import/Export Buttons */}
          <button
            onClick={downloadTemplate}
            className="btn btn-secondary"
            disabled={currenciesLoading || balanceItems.length === 0}
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
            onClick={() => {
              setEditingBalance(null);
              reset({ 
                balanceDate: selectedDate.toISOString().split('T')[0],
                currencyId: '',
                itemId: '',
                amount: ''
              });
              setShowModal(true);
            }}
            className="btn btn-primary"
          >
            <Plus size={16} /> New Balance
          </button>
          <button
            onClick={() => loadBalances(true)}
            disabled={refreshing}
            className="btn btn-secondary"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
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

      {/* Tables */}
      {Object.entries(groupedBalances).map(([currency, currencyBalances]) => (
        <div key={currency} className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>{currency} Balances</h3>
          <DataTable
            columns={balanceColumns}
            data={currencyBalances}
            loading={loading}
            emptyMessage={`No balances found for ${currency} on ${formatDate(selectedDate)}`}
          />
        </div>
      ))}

      {Object.keys(groupedBalances).length === 0 && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No balances found for selected date</p>
        </div>
      )}

      {/* Create/Edit Balance Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingBalance(null);
          reset();
        }}
        title={editingBalance ? 'Edit Daily Balance' : 'Create Daily Balance'}
        size="medium"
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                name="balanceDate"
                value={values.balanceDate}
                onChange={(e) => handleChange('balanceDate', e.target.value)}
                onBlur={() => handleBlur('balanceDate')}
                className="form-input"
                disabled={!!editingBalance}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Currency</label>
              <select
                name="currencyId"
                value={values.currencyId}
                onChange={(e) => handleChange('currencyId', e.target.value)}
                onBlur={() => handleBlur('currencyId')}
                className="form-input"
                disabled={!!editingBalance || currenciesLoading}
              >
                <option value="">Select Currency</option>
                {currencies.map(currency => (
                  <option key={currency.id} value={currency.id}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
              {touched.currencyId && errors.currencyId && (
                <div className="form-error">{errors.currencyId}</div>
              )}
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Balance Item</label>
              <select
                name="itemId"
                value={values.itemId}
                onChange={(e) => handleChange('itemId', e.target.value)}
                onBlur={() => handleBlur('itemId')}
                className="form-input"
                disabled={!!editingBalance}
              >
                <option value="">Select Balance Item</option>
                {balanceItems?.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.category})
                  </option>
                ))}
              </select>
              {touched.itemId && errors.itemId && (
                <div className="form-error">{errors.itemId}</div>
              )}
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Amount</label>
              <input
                type="number"
                name="amount"
                value={values.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                onBlur={() => handleBlur('amount')}
                className="form-input"
                placeholder="0.00"
                step="0.01"
              />
              {touched.amount && errors.amount && (
                <div className="form-error">{errors.amount}</div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditingBalance(null);
                reset();
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingBalance ? 'Update' : 'Create'} Balance
            </button>
          </div>
        </form>
      </Modal>

      {/* Import Preview Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportPreviewData([]);
          setImportError(null);
        }}
        title="Confirm Bulk Import"
        size="large"
      >
        <div>
          <p style={{ marginBottom: '1rem' }}>
            Please review the {importPreviewData.length} balances that will be imported:
          </p>
          
          <div style={{ maxHeight: '400px', overflow: 'auto', marginBottom: '1rem' }}>
            <table className="table" style={{ fontSize: '0.875rem' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Currency</th>
                  <th>Item Code</th>
                  <th>Amount</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {importPreviewData.slice(0, 50).map((item, index) => (
                  <tr key={index}>
                    <td>{item.balanceDate}</td>
                    <td>{item.currencyCode}</td>
                    <td>{item.itemCode}</td>
                    <td>{formatCurrency(item.amount)}</td>
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
      </Modal>
    </div>
  );
};

export default DailyBalances;