import models from '../models/index.js';
import ExcelJS from 'exceljs';
import { Op } from 'sequelize';

export const generateBSAReport = [
  async (req, res) => {
    try {
      const { date } = req.query;
      
      if (!date) {
        return res.status(400).json({ error: 'Date parameter is required' });
      }

      const reportDate = new Date(date);
      if (isNaN(reportDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }

      const dateString = reportDate.toISOString().split('T')[0];
      const financialYear = reportDate.getFullYear();

      // Fetch all required data
      const [currencies, exchangeRates, balanceItems, paidUpCapital, dailyBalances] = await Promise.all([
        models.Currency.findAll({ 
          where: { isActive: true },
          order: [['code', 'ASC']]
        }),
        models.ExchangeRate.findAll({
          where: { 
            rateDate: dateString,
            isActive: true 
          },
          include: [models.Currency]
        }),
        models.BalanceItem.findAll({ 
          where: { 
            isActive: true,
            category: { [Op.in]: ['asset', 'liability'] }
          },
          order: [['category', 'ASC'], ['balanceType', 'ASC'], ['displayOrder', 'ASC']]
        }),
        // FIXED: Get paid-up capital for the specific date
        models.PaidUpCapital.findOne({
          where: {
            effectiveDate: { [Op.lte]: dateString },
            isActive: true
          },
          order: [['effectiveDate', 'DESC']]
        }),
        models.DailyBalance.findAll({
          where: {
            balanceDate: dateString,
            status: 'authorized'
          },
          include: [
            { model: models.Currency },
            { model: models.BalanceItem }
          ]
        })
      ]);

      // Create workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('NEW BSA (2)');

      // FIXED: Calculate the actual paid-up capital to use (in thousands for the report)
      const actualPaidUpCapital = paidUpCapital 
        ? parseFloat(paidUpCapital.capitalAmount) / 1000  // Convert to thousands
        : 6080000000 / 1000; // Fallback to default in thousands

      // Build the report structure dynamically based on existing balance items and currencies
      await buildDynamicBSAReportStructure(worksheet, {
        date: dateString,
        financialYear,
        currencies,
        balanceItems,
        exchangeRates,
        dailyBalances,
        paidUpCapital: actualPaidUpCapital, // This is now in thousands
        paidUpCapitalDetails: paidUpCapital ? {
          amount: paidUpCapital.capitalAmount,
          effectiveDate: paidUpCapital.effectiveDate,
          currency: paidUpCapital.currency
        } : {
          amount: 6080000000,
          effectiveDate: dateString,
          currency: 'ETB'
        }
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=BSA_Report_${dateString}.xlsx`);

      // Write to response
      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      console.error('Error generating BSA report:', error);
      res.status(500).json({ error: 'Failed to generate BSA report: ' + error.message });
    }
  }
];

// Function to build the BSA report structure dynamically
async function buildDynamicBSAReportStructure(worksheet, data) {
  const { date, financialYear, currencies, balanceItems, exchangeRates, dailyBalances, paidUpCapital } = data;

  // Helper function to get balance amount
  const getBalanceAmount = (currencyId, itemId) => {
    const balance = dailyBalances.find(db => 
      db.currency_id === currencyId && 
      db.item_id === itemId
    );
    return balance ? parseFloat(balance.amount) : 0;
  };

  // Helper function to get exchange rate
  const getExchangeRate = (currencyId) => {
    const rate = exchangeRates.find(er => 
      er.currency_id === currencyId
    );
    return rate ? parseFloat(rate.midRate) : 1;
  };

  // Reorder currencies: USD, EUR, CHF, GBP first, then others alphabetically
  const reorderCurrencies = (currencies) => {
    const priorityOrder = ['USD', 'EUR', 'CHF', 'GBP'];
    const priorityCurrencies = [];
    const otherCurrencies = [];
    
    currencies.forEach(currency => {
      if (priorityOrder.includes(currency.code)) {
        priorityCurrencies.push(currency);
      } else {
        otherCurrencies.push(currency);
      }
    });
    
    // Sort priority currencies according to priorityOrder
    priorityCurrencies.sort((a, b) => {
      return priorityOrder.indexOf(a.code) - priorityOrder.indexOf(b.code);
    });
    
    // Sort other currencies alphabetically
    otherCurrencies.sort((a, b) => a.code.localeCompare(b.code));
    
    return [...priorityCurrencies, ...otherCurrencies];
  };

  const orderedCurrencies = reorderCurrencies(currencies);

  // Title and headers (fixed as per requirement)
  worksheet.mergeCells('B1:V1');
  worksheet.getCell('B1').value = 'ANNEXES';
  worksheet.getCell('B1').font = { bold: true, size: 14 };
  worksheet.getCell('B1').alignment = { horizontal: 'center' };

  worksheet.mergeCells('B2:V2');
  worksheet.getCell('B2').value = 'A) Reporting Template';
  worksheet.getCell('B2').font = { bold: true, size: 12 };
  worksheet.getCell('B2').alignment = { horizontal: 'center' };

  // Daily Report header spanning rows 4-7 with light red background
  worksheet.mergeCells('B4:V7');
  const headerCell = worksheet.getCell('B4');
  headerCell.value = 'Daily Report on Foreign Currency Positions';
  headerCell.font = { bold: true, size: 14, color: { argb: 'FFFF0000' } };
  headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
  headerCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1DCDB' }
  };

  // Add left border to the entire merged region
  const startRow = 4;
  const endRow = 7;
  const leftColumn = 2;
  for (let row = startRow; row <= endRow; row++) {
    worksheet.getRow(row).getCell(leftColumn).border = {
      left: { style: 'thin', color: { argb: 'FF000000' } }
    };
  }

  // Apply background to all merged cells
  for (let row = 4; row <= 7; row++) {
    const worksheetRow = worksheet.getRow(row);
    for (let col = 2; col <= 22; col++) {
      worksheetRow.getCell(col).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFE6E6' }
      };
    }
  }

  // Institution info with light green background
  worksheet.getCell('B8').value = 'Instiution Code';
  worksheet.getCell('C8').value = '0000017';
  
  worksheet.getCell('B9').value = 'Financial Year';
  worksheet.getCell('C9').value = financialYear;
  
  worksheet.getCell('B10').value = 'Start Date';
  worksheet.getCell('C10').value = date;
  
  worksheet.getCell('B11').value = 'End Date';
  worksheet.getCell('C11').value = date;

  // Apply light green background and bold font to institution info
  for (let row = 8; row <= 11; row++) {
    const worksheetRow = worksheet.getRow(row);
    worksheetRow.getCell('B').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFECF0DF' }
    };
    worksheetRow.getCell('C').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFECF0DF' }
    };
    worksheetRow.getCell('B').font = { bold: true };
    worksheetRow.getCell('C').font = { bold: true };
  }

  // Calculate dynamic column ranges
  // We need columns for: orderedCurrencies + 3 Others columns + 1 Overall Exposure
  const currencyColStart = 67; // 'C' character code
  const currencyColEnd = currencyColStart + orderedCurrencies.length - 1;
  const othersColStart = currencyColEnd + 1;
  const othersColEnd = othersColStart + 2; // 3 columns total
  const overallExposureCol = String.fromCharCode(othersColEnd + 1);
  const overallExposureColNum = overallExposureCol.charCodeAt(0) - 64;

  // Add "In Thousands" note in the column just before Others in Single Currency header
  const lastCurrencyCol = String.fromCharCode(currencyColEnd);
  worksheet.getCell(`${lastCurrencyCol}13`).value = 'In Thousands';
  worksheet.getCell(`${lastCurrencyCol}13`).font = { italic: true };
  worksheet.getCell(`${lastCurrencyCol}13`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFFF00' }   // Yellow background
  };

  // Table headers - NEW STRUCTURE with merged rows
  const headerRow1 = 14;
  const headerRow2 = 15;
  
  // First header row
  worksheet.getCell(`A${headerRow1}`).value = 'S/No';
  worksheet.mergeCells(`A${headerRow1}:A${headerRow2}`);
  worksheet.getCell(`A${headerRow1}`).alignment = { horizontal: 'center', vertical: 'middle' };
  
  worksheet.getCell(`B${headerRow1}`).value = 'Particulars';
  worksheet.mergeCells(`B${headerRow1}:B${headerRow2}`);
  worksheet.getCell(`B${headerRow1}`).alignment = { horizontal: 'center', vertical: 'middle' };
  
  worksheet.getCell(`C${headerRow1}`).value = 'SINGLE CURRENCY EXPOSURE';
  worksheet.mergeCells(`C${headerRow1}:${String.fromCharCode(currencyColEnd)}${headerRow1}`);
  worksheet.getCell(`C${headerRow1}`).alignment = { horizontal: 'center', vertical: 'middle' };
  
  worksheet.getCell(`${String.fromCharCode(othersColStart)}${headerRow1}`).value = 'Others in Single Currency';
  worksheet.mergeCells(`${String.fromCharCode(othersColStart)}${headerRow1}:${String.fromCharCode(othersColEnd)}${headerRow1}`);
  worksheet.getCell(`${String.fromCharCode(othersColStart)}${headerRow1}`).alignment = { horizontal: 'center', vertical: 'middle' };
  
  worksheet.getCell(`${overallExposureCol}${headerRow1}`).value = 'Overall Exposure';
  worksheet.mergeCells(`${overallExposureCol}${headerRow1}:${overallExposureCol}${headerRow2}`);
  worksheet.getCell(`${overallExposureCol}${headerRow1}`).alignment = { horizontal: 'center', vertical: 'middle' };

  // Second header row - individual currencies
  orderedCurrencies.forEach((currency, index) => {
    const col = String.fromCharCode(currencyColStart + index);
    worksheet.getCell(`${col}${headerRow2}`).value = currency.code;
    worksheet.getCell(`${col}${headerRow2}`).font = { bold: true };
    worksheet.getCell(`${col}${headerRow2}`).alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Add Others column headers (empty in sample)
  for (let i = 0; i < 3; i++) {
    const col = String.fromCharCode(othersColStart + i);
    worksheet.getCell(`${col}${headerRow2}`).value = '';
    worksheet.getCell(`${col}${headerRow2}`).alignment = { horizontal: 'center', vertical: 'middle' };
  }

  // Apply styling to header rows
  [headerRow1, headerRow2].forEach(rowNum => {
    const worksheetRow = worksheet.getRow(rowNum);
    for (let col = 1; col <= overallExposureColNum; col++) {
      const cell = worksheetRow.getCell(col);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFFFF' }
      };
      cell.font = { bold: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
  });

  let currentRow = 16;
  
  // Filter balance items
  const assetItems = balanceItems.filter(item => 
    item.category === 'asset' && item.isActive
  );
  
  const liabilityItems = balanceItems.filter(item => 
    item.category === 'liability' && item.isActive
  );

  let totalAssetsRow = null;
  let totalLiabilitiesRow = null;

  // Foreign Currency Assets header
  if (assetItems.length > 0) {
    worksheet.getCell(`A${currentRow}`).value = '1';
    worksheet.getCell(`A${currentRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEEECE0' }
    };
    
    // Merge cells from B to last Others column (not including Overall Exposure)
    const lastOthersCol = String.fromCharCode(othersColEnd);
    worksheet.mergeCells(`B${currentRow}:${lastOthersCol}${currentRow}`);
    worksheet.getCell(`B${currentRow}`).value = 'Foreign Currency Assets';
    worksheet.getCell(`B${currentRow}`).font = { bold: true };
    
    // Apply light yellow background to the entire merged area
    for (let col = 1; col <= othersColEnd - 64 + 1; col++) {
      const cell = worksheet.getRow(currentRow).getCell(col);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEEECE0' }
      };
    }
    
    // Apply borders
    for (let col = 1; col <= overallExposureColNum; col++) {
      const cell = worksheet.getRow(currentRow).getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    
    currentRow++;

    // Group assets by balance type
    const onBalanceAssets = assetItems.filter(item => item.balanceType === 'on_balance_sheet');
    const offBalanceAssets = assetItems.filter(item => item.balanceType === 'off_balance_sheet');

    // On-balance Sheet Items
    if (onBalanceAssets.length > 0) {
      worksheet.getCell(`A${currentRow}`).value = '1.1';
      worksheet.getCell(`B${currentRow}`).value = 'On-balance Sheet Items';
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      worksheet.getCell(`B${currentRow}`).font = { bold: true };

      for (let col = 1; col <= overallExposureColNum; col++) {
        const cell = worksheet.getRow(currentRow).getCell(col);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }

      currentRow++;

      // Add each on-balance asset item
      onBalanceAssets.forEach((item, index) => {
        worksheet.getCell(`A${currentRow}`).value = `1.1.${index + 1}`;
        worksheet.getCell(`B${currentRow}`).value = item.name;
        
        orderedCurrencies.forEach((currency, colIndex) => {
          const col = String.fromCharCode(currencyColStart + colIndex);
          const amount = getBalanceAmount(currency.id, item.id);
          worksheet.getCell(`${col}${currentRow}`).value = amount / 1000;
        });
        
        // Apply borders (Others columns remain empty)
        for (let col = 1; col <= overallExposureColNum; col++) {
          const cell = worksheet.getRow(currentRow).getCell(col);
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        }
        
        currentRow++;
      });
    }

    // Off-balance sheet Items
    if (offBalanceAssets.length > 0) {
      worksheet.getCell(`A${currentRow}`).value = '1.2';
      worksheet.getCell(`B${currentRow}`).value = 'Off-balance sheet Items';
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      worksheet.getCell(`B${currentRow}`).font = { bold: true };
      
      for (let col = 1; col <= overallExposureColNum; col++) {
        const cell = worksheet.getRow(currentRow).getCell(col);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
      currentRow++;

      // Add each off-balance asset item
      offBalanceAssets.forEach((item, index) => {
        worksheet.getCell(`A${currentRow}`).value = `1.2.${index + 1}`;
        worksheet.getCell(`B${currentRow}`).value = item.name;
        
        orderedCurrencies.forEach((currency, colIndex) => {
          const col = String.fromCharCode(currencyColStart + colIndex);
          const amount = getBalanceAmount(currency.id, item.id);
          worksheet.getCell(`${col}${currentRow}`).value = amount / 1000;
        });
        
        // Apply borders (Others columns remain empty)
        for (let col = 1; col <= overallExposureColNum; col++) {
          const cell = worksheet.getRow(currentRow).getCell(col);
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        }
        
        currentRow++;
      });
    }

    // Total Foreign Assets
    totalAssetsRow = currentRow;
    worksheet.getCell(`A${totalAssetsRow}`).value = '';
    worksheet.getCell(`B${totalAssetsRow}`).value = 'Total Foreign Assets (sum 1.1 & 1.2)';
    worksheet.getRow(totalAssetsRow).font = { bold: true };
    
    orderedCurrencies.forEach((currency, colIndex) => {
      const col = String.fromCharCode(currencyColStart + colIndex);
      
      // Calculate start and end rows for assets
      const assetStartRow = onBalanceAssets.length > 0 ? headerRow2 + 3 : 
                           offBalanceAssets.length > 0 ? currentRow - offBalanceAssets.length : currentRow;
      const assetEndRow = currentRow - 1;
      
      if (assetStartRow < assetEndRow) {
        let formula = '';
        for (let row = assetStartRow; row <= assetEndRow; row++) {
          if (worksheet.getCell(`${col}${row}`).value !== undefined) {
            if (formula) formula += '+';
            formula += `${col}${row}`;
          }
        }
        if (formula) {
          worksheet.getCell(`${col}${totalAssetsRow}`).value = { formula: `=${formula}` };
          worksheet.getCell(`${col}${totalAssetsRow}`).font = { bold: true };
        }
      } else {
        worksheet.getCell(`${col}${totalAssetsRow}`).value = 0;
        worksheet.getCell(`${col}${totalAssetsRow}`).font = { bold: true };
      }
    });
    
    // Others columns remain empty (no 0 values)
    for (let i = 0; i < 3; i++) {
      const col = String.fromCharCode(othersColStart + i);
      // Leave empty - no value set
      worksheet.getCell(`${col}${totalAssetsRow}`).font = { bold: true };
    }
    
    // Apply borders
    for (let col = 1; col <= overallExposureColNum; col++) {
      const cell = worksheet.getRow(totalAssetsRow).getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    
    currentRow += 1;
  }

  // Foreign Currency Liabilities
  if (liabilityItems.length > 0) {
    worksheet.getCell(`A${currentRow}`).value = '2';
    worksheet.getCell(`A${currentRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEEECE0' }
    };
    
    // Merge cells from B to last Others column (not including Overall Exposure)
    const lastOthersCol = String.fromCharCode(othersColEnd);
    worksheet.mergeCells(`B${currentRow}:${lastOthersCol}${currentRow}`);
    worksheet.getCell(`B${currentRow}`).value = 'Foreign Currency Liabilities';
    worksheet.getCell(`B${currentRow}`).font = { bold: true };
    
    // Apply light yellow background to the entire merged area
    for (let col = 1; col <= othersColEnd - 64 + 1; col++) {
      const cell = worksheet.getRow(currentRow).getCell(col);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEEECE0' }
      };
    }
    
    // Apply borders
    for (let col = 1; col <= overallExposureColNum; col++) {
      const cell = worksheet.getRow(currentRow).getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    
    currentRow++;

    // Group liabilities by balance type
    const onBalanceLiabilities = liabilityItems.filter(item => item.balanceType === 'on_balance_sheet');
    const offBalanceLiabilities = liabilityItems.filter(item => item.balanceType === 'off_balance_sheet');

    // On-balance Sheet Items
    if (onBalanceLiabilities.length > 0) {
      worksheet.getCell(`A${currentRow}`).value = '2.1';
      worksheet.getCell(`B${currentRow}`).value = 'On-balance Sheet Items';
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      worksheet.getCell(`B${currentRow}`).font = { bold: true };
      
      for (let col = 1; col <= overallExposureColNum; col++) {
        const cell = worksheet.getRow(currentRow).getCell(col);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
      currentRow++;

      // Add each on-balance liability item
      onBalanceLiabilities.forEach((item, index) => {
        worksheet.getCell(`A${currentRow}`).value = `2.1.${index + 1}`;
        worksheet.getCell(`B${currentRow}`).value = item.name;
        
        orderedCurrencies.forEach((currency, colIndex) => {
          const col = String.fromCharCode(currencyColStart + colIndex);
          const amount = getBalanceAmount(currency.id, item.id);
          worksheet.getCell(`${col}${currentRow}`).value = amount / 1000;
        });
        
        // Apply borders (Others columns remain empty)
        for (let col = 1; col <= overallExposureColNum; col++) {
          const cell = worksheet.getRow(currentRow).getCell(col);
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        }
        
        currentRow++;
      });
    }

    // Off-balance Sheet Items
    if (offBalanceLiabilities.length > 0) {
      worksheet.getCell(`A${currentRow}`).value = '2.2';
      worksheet.getCell(`B${currentRow}`).value = 'Off-balance Sheet Items';
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      worksheet.getCell(`B${currentRow}`).font = { bold: true };
      
      for (let col = 1; col <= overallExposureColNum; col++) {
        const cell = worksheet.getRow(currentRow).getCell(col);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
      currentRow++;

      // Add each off-balance liability item
      offBalanceLiabilities.forEach((item, index) => {
        worksheet.getCell(`A${currentRow}`).value = `2.2.${index + 1}`;
        worksheet.getCell(`B${currentRow}`).value = item.name;
        
        orderedCurrencies.forEach((currency, colIndex) => {
          const col = String.fromCharCode(currencyColStart + colIndex);
          const amount = getBalanceAmount(currency.id, item.id);
          worksheet.getCell(`${col}${currentRow}`).value = amount / 1000;
        });
        
        // Apply borders (Others columns remain empty)
        for (let col = 1; col <= overallExposureColNum; col++) {
          const cell = worksheet.getRow(currentRow).getCell(col);
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        }
        
        currentRow++;
      });
    }

    // Total Foreign Liabilities
    totalLiabilitiesRow = currentRow;
    worksheet.getCell(`A${totalLiabilitiesRow}`).value = '';
    worksheet.getCell(`B${totalLiabilitiesRow}`).value = 'Total Foreign Liabilities (sum 2.1 & 2.2)';
    worksheet.getRow(totalLiabilitiesRow).font = { bold: true };
    
    orderedCurrencies.forEach((currency, colIndex) => {
      const col = String.fromCharCode(currencyColStart + colIndex);
      
      // Calculate start and end rows for liabilities
      const liabilityStartRow = onBalanceLiabilities.length > 0 ? 
                               (assetItems.length > 0 ? totalAssetsRow + 3 : headerRow2 + 3) : 
                               currentRow - offBalanceLiabilities.length;
      const liabilityEndRow = currentRow - 1;
      
      if (liabilityStartRow < liabilityEndRow) {
        let formula = '';
        for (let row = liabilityStartRow; row <= liabilityEndRow; row++) {
          if (worksheet.getCell(`${col}${row}`).value !== undefined) {
            if (formula) formula += '+';
            formula += `${col}${row}`;
          }
        }
        if (formula) {
          worksheet.getCell(`${col}${totalLiabilitiesRow}`).value = { formula: `=${formula}` };
          worksheet.getCell(`${col}${totalLiabilitiesRow}`).font = { bold: true };
        }
      } else {
        worksheet.getCell(`${col}${totalLiabilitiesRow}`).value = 0;
        worksheet.getCell(`${col}${totalLiabilitiesRow}`).font = { bold: true };
      }
    });
    
    // Others columns remain empty (no 0 values)
    for (let i = 0; i < 3; i++) {
      const col = String.fromCharCode(othersColStart + i);
      // Leave empty - no value set
      worksheet.getCell(`${col}${totalLiabilitiesRow}`).font = { bold: true };
    }
    
    // Apply borders
    for (let col = 1; col <= overallExposureColNum; col++) {
      const cell = worksheet.getRow(totalLiabilitiesRow).getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    
    currentRow += 1;
  }

  // Fixed calculation rows (as per your requirement)
  if (assetItems.length > 0 && liabilityItems.length > 0 && totalAssetsRow && totalLiabilitiesRow) {
    
    // 3 Foreign Exchange Position in Single Currency
    worksheet.getCell(`A${currentRow}`).value = '3';
    worksheet.getCell(`B${currentRow}`).value = 'Foreign Exchange Position in Single Currency';
    worksheet.getRow(currentRow).font = { bold: true };
    
    // Apply borders
    for (let col = 1; col <= overallExposureColNum; col++) {
      const cell = worksheet.getRow(currentRow).getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    
    currentRow++;

    // 3.1 Net long position (where assets less liabilities is +)
    worksheet.getCell(`A${currentRow}`).value = '3.1';
    worksheet.getCell(`B${currentRow}`).value = 'Net long position (where assets less liabilities is +)';
    worksheet.getRow(currentRow).font = { bold: true };
    
    // Add formulas for all currency columns including Others (from 3.1 onward, use formulas)
    for (let colIndex = 0; colIndex < orderedCurrencies.length + 3; colIndex++) {
      const col = String.fromCharCode(currencyColStart + colIndex);
      const assetsCell = `${col}${totalAssetsRow}`;
      const liabilitiesCell = `${col}${totalLiabilitiesRow}`;
      worksheet.getCell(`${col}${currentRow}`).value = {
        formula: `IF((${assetsCell}-${liabilitiesCell}) > 0, (${assetsCell}-${liabilitiesCell}), 0)`
      };
      worksheet.getCell(`${col}${currentRow}`).font = { bold: true };
    }
    const netLongRow = currentRow;
    
    // Apply borders
    for (let col = 1; col <= overallExposureColNum; col++) {
      const cell = worksheet.getRow(currentRow).getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    
    currentRow++;

    // 3.2 Net short position (where assets less liabilities is -)
    worksheet.getCell(`A${currentRow}`).value = '3.2';
    worksheet.getCell(`B${currentRow}`).value = 'Net short position (where assets less liabilities is -)';
    worksheet.getRow(currentRow).font = { bold: true };
    
    // Add formulas for all currency columns including Others
    for (let colIndex = 0; colIndex < orderedCurrencies.length + 3; colIndex++) {
      const col = String.fromCharCode(currencyColStart + colIndex);
      const assetsCell = `${col}${totalAssetsRow}`;
      const liabilitiesCell = `${col}${totalLiabilitiesRow}`;
      worksheet.getCell(`${col}${currentRow}`).value = {
        formula: `IF((${assetsCell}-${liabilitiesCell}) > 0, 0, (${assetsCell}-${liabilitiesCell})*(-1))`
      };
      worksheet.getCell(`${col}${currentRow}`).font = { bold: true };
    }
    const netShortRow = currentRow;
    
    // Apply borders
    for (let col = 1; col <= overallExposureColNum; col++) {
      const cell = worksheet.getRow(currentRow).getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    
    currentRow++;

    // 4 Exchange rate
    worksheet.getCell(`A${currentRow}`).value = '4';
    worksheet.getCell(`B${currentRow}`).value = 'Exchange rate';
    worksheet.getRow(currentRow).font = { bold: true };
    
    orderedCurrencies.forEach((currency, colIndex) => {
      const col = String.fromCharCode(currencyColStart + colIndex);
      worksheet.getCell(`${col}${currentRow}`).value = getExchangeRate(currency.id);
      worksheet.getCell(`${col}${currentRow}`).font = { bold: true };
    });
    
    // Others columns get 0 (from 3.1 onward)
    for (let i = 0; i < 3; i++) {
      const col = String.fromCharCode(othersColStart + i);
      worksheet.getCell(`${col}${currentRow}`).value = 0;
      worksheet.getCell(`${col}${currentRow}`).font = { bold: true };
    }
    
    const exchangeRateRow = currentRow;
    
    // Apply borders
    for (let col = 1; col <= overallExposureColNum; col++) {
      const cell = worksheet.getRow(currentRow).getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    
    currentRow++;

    // 5 Net long position in Birr (3.1*4)
    worksheet.getCell(`A${currentRow}`).value = '5';
    worksheet.getCell(`B${currentRow}`).value = 'Net long position in Birr (3.1*4)';
    worksheet.getRow(currentRow).font = { bold: true };
    
    // Add formulas for all currency columns including Others
    for (let colIndex = 0; colIndex < orderedCurrencies.length + 3; colIndex++) {
      const col = String.fromCharCode(currencyColStart + colIndex);
      const netLongCell = `${col}${netLongRow}`;
      const exchangeRateCell = `${col}${exchangeRateRow}`;
      worksheet.getCell(`${col}${currentRow}`).value = {
        formula: `${netLongCell}*${exchangeRateCell}`
      };
      worksheet.getCell(`${col}${currentRow}`).font = { bold: true };
    }
    const netLongBirrRow = currentRow;
    
    // Apply borders
    for (let col = 1; col <= overallExposureColNum; col++) {
      const cell = worksheet.getRow(currentRow).getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    
    currentRow++;

    // 6 Net short position in Birr (3.2*4)
    worksheet.getCell(`A${currentRow}`).value = '6';
    worksheet.getCell(`B${currentRow}`).value = 'Net short position in Birr (3.2*4)';
    worksheet.getRow(currentRow).font = { bold: true };
    
    // Add formulas for all currency columns including Others
    for (let colIndex = 0; colIndex < orderedCurrencies.length + 3; colIndex++) {
      const col = String.fromCharCode(currencyColStart + colIndex);
      const netShortCell = `${col}${netShortRow}`;
      const exchangeRateCell = `${col}${exchangeRateRow}`;
      worksheet.getCell(`${col}${currentRow}`).value = {
        formula: `${netShortCell}*${exchangeRateCell}`
      };
      worksheet.getCell(`${col}${currentRow}`).font = { bold: true };
    }
    const netShortBirrRow = currentRow;
    
    // Apply borders
    for (let col = 1; col <= overallExposureColNum; col++) {
      const cell = worksheet.getRow(currentRow).getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    
    currentRow++;

    // 7 Net open position (Greater of 5 or 6)
    worksheet.getCell(`A${currentRow}`).value = '7';
    worksheet.getCell(`B${currentRow}`).value = 'Net open position ( Greater of 5 or 6)';
    worksheet.getRow(currentRow).font = { bold: true };
    
    // Add formulas for all currency columns including Others
    for (let colIndex = 0; colIndex < orderedCurrencies.length + 3; colIndex++) {
      const col = String.fromCharCode(currencyColStart + colIndex);
      const netLongBirrCell = `${col}${netLongBirrRow}`;
      const netShortBirrCell = `${col}${netShortBirrRow}`;
      worksheet.getCell(`${col}${currentRow}`).value = {
        formula: `MAX(${netLongBirrCell},${netShortBirrCell})`
      };
      worksheet.getCell(`${col}${currentRow}`).font = { bold: true };
    }
    const netOpenRow = currentRow;
    
    // Apply borders
    for (let col = 1; col <= overallExposureColNum; col++) {
      const cell = worksheet.getRow(currentRow).getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    
    currentRow++;

    // 7.1 Net Open Position Ratio (7/8.4*100)
    worksheet.getCell(`A${currentRow}`).value = '7.1';
    worksheet.getCell(`B${currentRow}`).value = 'Net Open Position Ratio (7/8.4*100)';
    worksheet.getRow(currentRow).font = { bold: true };

    // Add formulas for all currency columns including Others
    for (let colIndex = 0; colIndex < orderedCurrencies.length + 3; colIndex++) {
      const col = String.fromCharCode(currencyColStart + colIndex);
      const netOpenCell = `${col}${netOpenRow}`;

      // Apply approximation using ROUND(... , 2)
      worksheet.getCell(`${col}${currentRow}`).value = {
        formula: `ROUND(${netOpenCell}/${paidUpCapital}*100, 2)`
      };

      worksheet.getCell(`${col}${currentRow}`).font = { bold: true };
    }
    
    // Apply borders
    for (let col = 1; col <= overallExposureColNum; col++) {
      const cell = worksheet.getRow(currentRow).getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    
    currentRow += 1;

    // 8 Overall Foreign Exchange Position
    const overallPositionHeaderRow = currentRow;
    worksheet.getCell(`A${currentRow}`).value = '8';
    worksheet.getCell(`A${currentRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFFFF' } 
    };
    
    // Merge cells from B to last Others column
    const lastOthersCol = String.fromCharCode(othersColEnd);
    worksheet.mergeCells(`B${currentRow}:${lastOthersCol}${currentRow}`);
    worksheet.getCell(`B${currentRow}`).value = 'Overall Foreign Exchange Position';
    worksheet.getCell(`B${currentRow}`).font = { bold: true };
    
    // Apply background to the entire merged area
    for (let col = 1; col <= othersColEnd - 64 + 1; col++) {
      const cell = worksheet.getRow(currentRow).getCell(col);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFFFF' }
      };
    }
    
    // Apply borders
    for (let col = 1; col <= overallExposureColNum; col++) {
      const cell = worksheet.getRow(currentRow).getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: col === 1 || col === 2 ? { style: 'thin' } : undefined,
        right: { style: 'thin' }
      };
    }
    
    currentRow++;

    // Remove borders and set background for Overall Exposure column above 8.1
    for (let row = headerRow1+2; row < currentRow+1; row++) {
      const cell = worksheet.getRow(row).getCell(overallExposureColNum);
      if (row < currentRow) {
        cell.border = {
          top: undefined,
          left: {style: 'thin' },
          bottom: undefined,
          right: { style: 'thin' }
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' }
        };
      }
    }

    // 8.1 Total Long Position (Sum of 5)
    const totalLongRow = currentRow;
    worksheet.getCell(`A${currentRow}`).value = '8.1';
    worksheet.getCell(`B${currentRow}`).value = 'Total Long Position (Sum of 5)';
    worksheet.getRow(currentRow).font = { bold: true };
    
    // Build sum formula for all currency columns including Others
    let sumFormula = '';
    for (let colIndex = 0; colIndex < orderedCurrencies.length + 3; colIndex++) {
      const col = String.fromCharCode(currencyColStart + colIndex);
      if (colIndex > 0) sumFormula += '+';
      sumFormula += `${col}${netLongBirrRow}`;
    }
    worksheet.getCell(`${overallExposureCol}${currentRow}`).value = { formula: `=${sumFormula}` };
    worksheet.getCell(`${overallExposureCol}${currentRow}`).font = { bold: true };
    
    // Apply borders - only columns A, B and Overall Exposure have borders
    for (let col = 1; col <= overallExposureColNum; col++) {
      const cell = worksheet.getRow(currentRow).getCell(col);
      if (col === 1 || col === 2 || col === overallExposureColNum) {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      } else {
        // Currency and Others columns - no borders, light dark background
        cell.border = {};
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' }
        };
      }
    }
    
    currentRow++;

    // 8.2 Total Short Position (Sum of 6)
    const totalShortRow = currentRow;
    worksheet.getCell(`A${currentRow}`).value = '8.2';
    worksheet.getCell(`B${currentRow}`).value = 'Total Short Position (Sum of 6)';
    worksheet.getRow(currentRow).font = { bold: true };
    
    // Build sum formula for all currency columns including Others
    sumFormula = '';
    for (let colIndex = 0; colIndex < orderedCurrencies.length + 3; colIndex++) {
      const col = String.fromCharCode(currencyColStart + colIndex);
      if (colIndex > 0) sumFormula += '+';
      sumFormula += `${col}${netShortBirrRow}`;
    }
    worksheet.getCell(`${overallExposureCol}${currentRow}`).value = { formula: `=${sumFormula}` };
    worksheet.getCell(`${overallExposureCol}${currentRow}`).font = { bold: true };
    
    // Apply borders
    for (let col = 1; col <= overallExposureColNum; col++) {
      const cell = worksheet.getRow(currentRow).getCell(col);
      if (col === 1 || col === 2 || col === overallExposureColNum) {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      } else {
        cell.border = {};
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' }
        };
      }
    }
    
    currentRow++;

    // 8.3 Overall open position (Greater of 8.1 or 8.2)
    const overallOpenRow = currentRow;
    worksheet.getCell(`A${currentRow}`).value = '8.3';
    worksheet.getCell(`B${currentRow}`).value = 'Overall open position (Greater of 8.1 or 8.2)';
    worksheet.getRow(currentRow).font = { bold: true };
    worksheet.getCell(`${overallExposureCol}${currentRow}`).value = {
      formula: `MAX(${overallExposureCol}${totalLongRow},${overallExposureCol}${totalShortRow})`
    };
    worksheet.getCell(`${overallExposureCol}${currentRow}`).font = { bold: true };
    
    // Apply borders
    for (let col = 1; col <= overallExposureColNum; col++) {
      const cell = worksheet.getRow(currentRow).getCell(col);
      if (col === 1 || col === 2 || col === overallExposureColNum) {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      } else {
        cell.border = {};
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' }
        };
      }
    }
    
    currentRow++;

    // 8.4 Tire 1 Capital
    const tier1CapitalRow = currentRow;
    worksheet.getCell(`A${currentRow}`).value = '8.4';
    worksheet.getCell(`B${currentRow}`).value = 'Tire 1 Capital';
    worksheet.getRow(currentRow).font = { bold: true };
    worksheet.getCell(`${overallExposureCol}${currentRow}`).value = paidUpCapital;
    worksheet.getCell(`${overallExposureCol}${currentRow}`).font = { bold: true };
    
    // Apply borders
    for (let col = 1; col <= overallExposureColNum; col++) {
      const cell = worksheet.getRow(currentRow).getCell(col);
      if (col === 1 || col === 2 || col === overallExposureColNum) {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      } else {
        cell.border = {};
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' }
        };
      }
    }
    
    currentRow++;

    // 8.5 Overall open position limit (15%*8.4)
    worksheet.getCell(`A${currentRow}`).value = '8.5';
    worksheet.getCell(`B${currentRow}`).value = 'Overall open position limit (15%*8.4)';
    worksheet.getRow(currentRow).font = { bold: true };
    worksheet.getCell(`${overallExposureCol}${currentRow}`).value = {
      formula: `0.15*${overallExposureCol}${tier1CapitalRow}`
    };
    worksheet.getCell(`${overallExposureCol}${currentRow}`).font = { bold: true };
    
    // Apply borders
    for (let col = 1; col <= overallExposureColNum; col++) {
      const cell = worksheet.getRow(currentRow).getCell(col);
      if (col === 1 || col === 2 || col === overallExposureColNum) {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      } else {
        cell.border = {};
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' }
        };
      }
    }
    
    currentRow++;

    // 8.6 Net Open Position Ratio (8.3/8.4*100)
    worksheet.getCell(`A${currentRow}`).value = '8.6';
    worksheet.getCell(`B${currentRow}`).value = 'Net Open Position Ratio (8.3/8.4*100)';
    worksheet.getRow(currentRow).font = { bold: true };
   worksheet.getCell(`${overallExposureCol}${currentRow}`).value = {
  formula: `ROUND(${overallExposureCol}${overallOpenRow}/${overallExposureCol}${tier1CapitalRow}*100, 2)`
};

    worksheet.getCell(`${overallExposureCol}${currentRow}`).font = { bold: true };
    
    // Apply borders
    for (let col = 1; col <= overallExposureColNum; col++) {
      const cell = worksheet.getRow(currentRow).getCell(col);
      if (col === 1 || col === 2 || col === overallExposureColNum) {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      } else {
        cell.border = {};
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' }
        };
      }
    }
    
    currentRow += 3;
  }

  // Add Description of Country Currency Code section
  const currencyDescriptionStartRow = currentRow;

  // Merge columns B and C for the title
  worksheet.mergeCells(`B${currentRow}:C${currentRow}`);
  worksheet.getCell(`B${currentRow}`).value = 'B) Descriprion of Country Currency Code';
  worksheet.getCell(`B${currentRow}`).font = { bold: true, size: 12 };
  worksheet.getCell(`B${currentRow}`).alignment = { vertical: 'middle', horizontal: 'center' };

  currentRow += 2;

  // Add currency descriptions starting from column B
  const currencyNames = {
    'USD': 'Untied State of American Dollar',
    'EUR': 'European Union of Euro',
    'CHF': 'Swiss Franc',
    'GBP': 'Great British Pound Sterling',
    'JPY': 'Japanese Yen',
    'DJF': 'Djiboutian Franc',
    'KES': 'Kenyan Shilling',
    'INR': 'Indian Rupee',
    'DKK': 'Danish Krone',
    'SEK': 'Swedish Krona',
    'SAR': 'Saudi Riyal',
    'CAD': 'Canadian dollar',
    'AED': 'UAE Dirham',
    'AUD': 'Australian dollar',
    'CNY': 'Chinese Yuan',
    'NOK': 'Norwegian Krone',
    'KWD': 'Kuwaiti Dinar'
  };

  // Add all currencies in the same order as they appear in the table
  orderedCurrencies.forEach((currency) => {
    if (currencyNames[currency.code]) {
      worksheet.getCell(`B${currentRow}`).value = currencyNames[currency.code];
      worksheet.getCell(`C${currentRow}`).value = currency.code;
      
      // Apply thin borders
      for (let col = 2; col <= 3; col++) {
        const cell = worksheet.getRow(currentRow).getCell(col);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
      
      currentRow++;
    }
  });

  // Apply formatting
  applyDynamicBSAFormatting(worksheet, orderedCurrencies.length, currentRow, overallExposureColNum, othersColEnd);
}

function applyDynamicBSAFormatting(worksheet, currencyCount, totalRows, overallExposureColNum, othersColEnd) {
  // Set column widths with perfect padding
  const columns = [
    { width: 8 },  // A: S/No
    { width: 45 }, // B: Particulars
  ];

  // Add currency columns (dynamic width)
  for (let i = 0; i < currencyCount; i++) {
    columns.push({ width: 15 });
  }

  // Add 3 Others columns
  for (let i = 0; i < 3; i++) {
    columns.push({ width: 15 });
  }

  // Add overall exposure column
  columns.push({ width: 18 });

  worksheet.columns = columns;

  // Apply borders and number formatting to all data cells
  for (let row = 14; row <= totalRows; row++) {
    const worksheetRow = worksheet.getRow(row);
    
    // Format all currency and Others columns
    for (let col = 3; col <= (overallExposureColNum - 1); col++) {
      const cell = worksheetRow.getCell(col);
      if (row >= 16 && cell.value !== undefined && cell.value !== null) {
        if (typeof cell.value === 'number') {
          cell.numFmt = '#,##0.00';
        }
      }
    }

    // Format overall exposure column
    const cell = worksheetRow.getCell(overallExposureColNum);
    if (row >= 16 && cell.value !== undefined && cell.value !== null) {
      if (typeof cell.value === 'number') {
        cell.numFmt = '#,##0.00';
      }
    }
  }

  // Apply borders to institution info
  for (let row = 8; row <= 11; row++) {
    const worksheetRow = worksheet.getRow(row);
    for (let col = 2; col <= 3; col++) {
      const cell = worksheetRow.getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
  }

  // Set row heights
  for (let row = 1; row <= totalRows; row++) {
    const worksheetRow = worksheet.getRow(row);
    if (row === 1 || row === 6) {
      worksheetRow.height = 25;
    } else if (row >= 4 && row <= 7) {
      worksheetRow.height = 20;
    } else if (row === 14 || row === 15) {
      worksheetRow.height = 20;
    } else {
      worksheetRow.height = 18;
    }
  }

  // Apply alignment
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      // Center align headers and currency codes
      if ((rowNumber === 14 || rowNumber === 15) ||
          (colNumber >= 3 && colNumber <= (overallExposureColNum - 1) && rowNumber === 15)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colNumber === 1) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    });
  });
}