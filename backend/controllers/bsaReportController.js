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
      const worksheet = workbook.addWorksheet('BSA Report');

      // Build the report structure dynamically based on existing balance items and currencies
      await buildDynamicBSAReportStructure(worksheet, {
        date: dateString,
        financialYear,
        currencies,
        balanceItems,
        exchangeRates,
        dailyBalances,
        paidUpCapital: paidUpCapital ? parseFloat(paidUpCapital.capitalAmount) : 2979527
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
headerCell.font = { bold: true, size: 14, color: { argb: 'FFFF0000' } }; // Bold red font
headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
headerCell.fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF1DCDB' } // Light red background
};

// ✅ Add left border only to the entire merged region (B4:V7)
const startRow = 4;
const endRow = 7;
const leftColumn = 2; // Column B

for (let row = startRow; row <= endRow; row++) {
  worksheet.getRow(row).getCell(leftColumn).border = {
    left: { style: 'thin', color: { argb: 'FF000000' } } // Black left border
  };
}

  // Apply the same background to all merged cells
  for (let row = 4; row <= 7; row++) {
    const worksheetRow = worksheet.getRow(row);
    for (let col = 2; col <= 22; col++) { // Columns B to V
      worksheetRow.getCell(col).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFE6E6' }
      };
    }
  }

  // Institution info with light green background
  const institutionRows = [8, 9, 10, 11];
  worksheet.getCell('B8').value = 'Institution Code';
  worksheet.getCell('C8').value = '0000017';
  
  worksheet.getCell('B9').value = 'Financial Year';
  worksheet.getCell('C9').value = financialYear;
  
  worksheet.getCell('B10').value = 'Start Date';
  worksheet.getCell('C10').value = date;
  
  worksheet.getCell('B11').value = 'End Date';
  worksheet.getCell('C11').value = date;

  // Apply light green background and bold font to institution info
  institutionRows.forEach(rowNum => {
    const worksheetRow = worksheet.getRow(rowNum);
    worksheetRow.getCell('B').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFECF0DF' } // Light green background
    };
    worksheetRow.getCell('C').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFECF0DF' } // Light green background
    };
    worksheetRow.getCell('B').font = { bold: true };
    worksheetRow.getCell('C').font = { bold: true };
  });

  // Calculate dynamic column ranges
  const currencyColStart = 67; // 'C' character code
  const currencyColEnd = currencyColStart + currencies.length - 1;
  const overallExposureCol = String.fromCharCode(currencyColEnd + 1);
  const overallExposureColNum = currencyColEnd - 64 + 1; // Convert to column number (including overall exposure)

  // Table headers - NEW STRUCTURE with merged rows
  const headerRow1 = 14; // Changed from 16 to remove free rows
  const headerRow2 = 15; // Changed from 17 to remove free rows
  
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
  
  worksheet.getCell(`${overallExposureCol}${headerRow1}`).value = 'Overall Exposure';
  worksheet.mergeCells(`${overallExposureCol}${headerRow1}:${overallExposureCol}${headerRow2}`);
  worksheet.getCell(`${overallExposureCol}${headerRow1}`).alignment = { horizontal: 'center', vertical: 'middle' };

  // Second header row - individual currencies
  currencies.forEach((currency, index) => {
    const col = String.fromCharCode(currencyColStart + index);
    worksheet.getCell(`${col}${headerRow2}`).value = currency.code;
    worksheet.getCell(`${col}${headerRow2}`).font = { bold: true };
    worksheet.getCell(`${col}${headerRow2}`).alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Apply styling to header rows - only up to Overall Exposure column
  [headerRow1, headerRow2].forEach(rowNum => {
    const worksheetRow = worksheet.getRow(rowNum);
    for (let col = 1; col <= overallExposureColNum; col++) {
      const cell = worksheetRow.getCell(col);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFFFF' } // Light blue background
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

  let currentRow = 16; // Changed from 18 to remove free rows
  
  // Filter balance items to only include assets and liabilities (no memo items)
  const assetItems = balanceItems.filter(item => 
    item.category === 'asset' && item.isActive
  );
  
  const liabilityItems = balanceItems.filter(item => 
    item.category === 'liability' && item.isActive
  );

  let totalAssetsRow = null;
  let totalLiabilitiesRow = null;

  // Foreign Currency Assets header - SPAN FULL FROM B TO LAST CURRENCY COLUMN
  if (assetItems.length > 0) {
    worksheet.getCell(`A${currentRow}`).value = '1';
    worksheet.getCell(`A${currentRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEEECE0' } // Light yellow
    };
    
    // Merge cells from B to last currency column (not including Overall Exposure)
    const lastCurrencyCol = String.fromCharCode(currencyColEnd);
    worksheet.mergeCells(`B${currentRow}:${lastCurrencyCol}${currentRow}`);
    worksheet.getCell(`B${currentRow}`).value = 'Foreign Currency Assets';
    worksheet.getCell(`B${currentRow}`).font = { bold: true };
    
    // Apply light yellow background to the entire merged area
    for (let col = 1; col <= currencyColEnd - 64 + 1; col++) {
      const cell = worksheet.getRow(currentRow).getCell(col);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEEECE0' } // Light yellow
      };
    }
    
    // Apply borders to this row
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

  // On-balance Sheet Items - only if they exist
if (onBalanceAssets.length > 0) {
  worksheet.getCell(`A${currentRow}`).value = '1.1';
  worksheet.getCell(`B${currentRow}`).value = 'On-balance Sheet Items';

  // ✅ Make both cells bold
  worksheet.getCell(`A${currentRow}`).font = { bold: true };
  worksheet.getCell(`B${currentRow}`).font = { bold: true };

  // Apply thin borders for sub-headers as requested
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
        
        currencies.forEach((currency, colIndex) => {
          const col = String.fromCharCode(currencyColStart + colIndex);
          const amount = getBalanceAmount(currency.id, item.id);
          worksheet.getCell(`${col}${currentRow}`).value = amount / 1000 ;
        });
        
        // Apply borders to data rows
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

    // Off-balance sheet Items - only if they exist
    if (offBalanceAssets.length > 0) {
      worksheet.getCell(`A${currentRow}`).value = '1.2';
      worksheet.getCell(`B${currentRow}`).value = 'Off-balance sheet Items';
      // Apply thin borders for sub-headers as requested
      // ✅ Make both cells bold
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
        
        currencies.forEach((currency, colIndex) => {
          const col = String.fromCharCode(currencyColStart + colIndex);
          const amount = getBalanceAmount(currency.id, item.id);
          worksheet.getCell(`${col}${currentRow}`).value = amount / 1000;
        });
        
        // Apply borders to data rows
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

    // Total Foreign Assets - only if we have asset items
    totalAssetsRow = currentRow;
    worksheet.getCell(`A${totalAssetsRow}`).value = '';
    worksheet.getCell(`B${totalAssetsRow}`).value = 'Total Foreign Assets (sum 1.1 & 1.2)';
    worksheet.getRow(totalAssetsRow).font = { bold: true };
    
    currencies.forEach((currency, colIndex) => {
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
          worksheet.getCell(`${col}${totalAssetsRow}`).value = { formula };
          worksheet.getCell(`${col}${totalAssetsRow}`).font = { bold: true };
        }
      } else {
        worksheet.getCell(`${col}${totalAssetsRow}`).value = 0;
        worksheet.getCell(`${col}${totalAssetsRow}`).font = { bold: true };
      }
    });
    
    // Apply borders to total row
    for (let col = 1; col <= overallExposureColNum; col++) {
      const cell = worksheet.getRow(totalAssetsRow).getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    
    currentRow += 1; // Reduced from 2 to 1 to remove free row
  }

  // Foreign Currency Liabilities - only if they exist - SPAN FULL FROM B TO LAST CURRENCY COLUMN
  if (liabilityItems.length > 0) {
    worksheet.getCell(`A${currentRow}`).value = '2';
    worksheet.getCell(`A${currentRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEEECE0' } // Light yellow
    };
    
    // Merge cells from B to last currency column (not including Overall Exposure)
    const lastCurrencyCol = String.fromCharCode(currencyColEnd);
    worksheet.mergeCells(`B${currentRow}:${lastCurrencyCol}${currentRow}`);
    worksheet.getCell(`B${currentRow}`).value = 'Foreign Currency Liabilities';
    worksheet.getCell(`B${currentRow}`).font = { bold: true };
    
    // Apply light yellow background to the entire merged area
    for (let col = 1; col <= currencyColEnd - 64 + 1; col++) {
      const cell = worksheet.getRow(currentRow).getCell(col);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEEECE0' } // Light yellow
      };
    }
    
    // Apply borders to this row
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

    // On-balance Sheet Items - only if they exist
    if (onBalanceLiabilities.length > 0) {
      worksheet.getCell(`A${currentRow}`).value = '2.1';
      worksheet.getCell(`B${currentRow}`).value = 'On-balance Sheet Items';

        // ✅ Make both cells bold
  worksheet.getCell(`A${currentRow}`).font = { bold: true };
  worksheet.getCell(`B${currentRow}`).font = { bold: true };
      // Apply thin borders for sub-headers as requested
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
        
        currencies.forEach((currency, colIndex) => {
          const col = String.fromCharCode(currencyColStart + colIndex);
          const amount = getBalanceAmount(currency.id, item.id);
          worksheet.getCell(`${col}${currentRow}`).value = amount / 1000 ;
        });
        
        // Apply borders to data rows
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

    // Off-balance Sheet Items - only if they exist
    if (offBalanceLiabilities.length > 0) {
      worksheet.getCell(`A${currentRow}`).value = '2.2';
      worksheet.getCell(`B${currentRow}`).value = 'Off-balance Sheet Items';

    // ✅ Make both cells bold
  worksheet.getCell(`A${currentRow}`).font = { bold: true };
  worksheet.getCell(`B${currentRow}`).font = { bold: true };

      // Apply thin borders for sub-headers as requested
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
        
        currencies.forEach((currency, colIndex) => {
          const col = String.fromCharCode(currencyColStart + colIndex);
          const amount = getBalanceAmount(currency.id, item.id);
          worksheet.getCell(`${col}${currentRow}`).value = amount/ 1000 ;
        });
        
        // Apply borders to data rows
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

    // Total Foreign Liabilities - only if we have liability items
    totalLiabilitiesRow = currentRow;
    worksheet.getCell(`A${totalLiabilitiesRow}`).value = '';
    worksheet.getCell(`B${totalLiabilitiesRow}`).value = 'Total Foreign Liabilities (sum 2.1 & 2.2)';
    worksheet.getRow(totalLiabilitiesRow).font = { bold: true };
    
    currencies.forEach((currency, colIndex) => {
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
          worksheet.getCell(`${col}${totalLiabilitiesRow}`).value = { formula };
          worksheet.getCell(`${col}${totalLiabilitiesRow}`).font = { bold: true };
        }
      } else {
        worksheet.getCell(`${col}${totalLiabilitiesRow}`).value = 0;
        worksheet.getCell(`${col}${totalLiabilitiesRow}`).font = { bold: true };
      }
    });
    
    // Apply borders to total row
    for (let col = 1; col <= overallExposureColNum; col++) {
      const cell = worksheet.getRow(totalLiabilitiesRow).getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    
    currentRow += 1; // Reduced from 2 to 1 to remove free row
  }

  // Fixed calculation rows (as per your requirement)
  if (assetItems.length > 0 && liabilityItems.length > 0 && totalAssetsRow && totalLiabilitiesRow) {
    
    // 3 Foreign Exchange Position in Single Currency
    worksheet.getCell(`A${currentRow}`).value = '3';
    worksheet.getCell(`B${currentRow}`).value = 'Foreign Exchange Position in Single Currency';
    worksheet.getRow(currentRow).font = { bold: true };
    
    // Apply borders to this row
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
    currencies.forEach((currency, colIndex) => {
      const col = String.fromCharCode(currencyColStart + colIndex);
      const assetsCell = `${col}${totalAssetsRow}`;
      const liabilitiesCell = `${col}${totalLiabilitiesRow}`;
      worksheet.getCell(`${col}${currentRow}`).value = {
        formula: `IF((${assetsCell}-${liabilitiesCell}) > 0, (${assetsCell}-${liabilitiesCell}), 0)`
      };
      worksheet.getCell(`${col}${currentRow}`).font = { bold: true };
    });
    const netLongRow = currentRow;
    
    // Apply borders to this row
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
    currencies.forEach((currency, colIndex) => {
      const col = String.fromCharCode(currencyColStart + colIndex);
      const assetsCell = `${col}${totalAssetsRow}`;
      const liabilitiesCell = `${col}${totalLiabilitiesRow}`;
      worksheet.getCell(`${col}${currentRow}`).value = {
        formula: `IF((${assetsCell}-${liabilitiesCell}) > 0, 0, (${assetsCell}-${liabilitiesCell})*(-1))`
      };
      worksheet.getCell(`${col}${currentRow}`).font = { bold: true };
    });
    const netShortRow = currentRow;
    
    // Apply borders to this row
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
    currencies.forEach((currency, colIndex) => {
      const col = String.fromCharCode(currencyColStart + colIndex);
      worksheet.getCell(`${col}${currentRow}`).value = getExchangeRate(currency.id);
      worksheet.getCell(`${col}${currentRow}`).font = { bold: true };
    });
    const exchangeRateRow = currentRow;
    
    // Apply borders to this row
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
    currencies.forEach((currency, colIndex) => {
      const col = String.fromCharCode(currencyColStart + colIndex);
      const netLongCell = `${col}${netLongRow}`;
      const exchangeRateCell = `${col}${exchangeRateRow}`;
      worksheet.getCell(`${col}${currentRow}`).value = {
        formula: `${netLongCell}*${exchangeRateCell}`
      };
      worksheet.getCell(`${col}${currentRow}`).font = { bold: true };
    });
    const netLongBirrRow = currentRow;
    
    // Apply borders to this row
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
    currencies.forEach((currency, colIndex) => {
      const col = String.fromCharCode(currencyColStart + colIndex);
      const netShortCell = `${col}${netShortRow}`;
      const exchangeRateCell = `${col}${exchangeRateRow}`;
      worksheet.getCell(`${col}${currentRow}`).value = {
        formula: `${netShortCell}*${exchangeRateCell}`
      };
      worksheet.getCell(`${col}${currentRow}`).font = { bold: true };
    });
    const netShortBirrRow = currentRow;
    
    // Apply borders to this row
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

    // 7 Net open position ( Greater of 5 or 6)
    worksheet.getCell(`A${currentRow}`).value = '7';
    worksheet.getCell(`B${currentRow}`).value = 'Net open position ( Greater of 5 or 6)';
    worksheet.getRow(currentRow).font = { bold: true };
    currencies.forEach((currency, colIndex) => {
      const col = String.fromCharCode(currencyColStart + colIndex);
      const netLongBirrCell = `${col}${netLongBirrRow}`;
      const netShortBirrCell = `${col}${netShortBirrRow}`;
      worksheet.getCell(`${col}${currentRow}`).value = {
        formula: `MAX(${netLongBirrCell},${netShortBirrCell})`
      };
      worksheet.getCell(`${col}${currentRow}`).font = { bold: true };
    });
    const netOpenRow = currentRow;
    
    // Apply borders to this row
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
    currencies.forEach((currency, colIndex) => {
      const col = String.fromCharCode(currencyColStart + colIndex);
      const netOpenCell = `${col}${netOpenRow}`;
      worksheet.getCell(`${col}${currentRow}`).value = {
        formula: `${netOpenCell}/${paidUpCapital}*100`
      };
      worksheet.getCell(`${col}${currentRow}`).font = { bold: true };
    });
    
    // Apply borders to this row
    for (let col = 1; col <= overallExposureColNum; col++) {
      const cell = worksheet.getRow(currentRow).getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    
    currentRow += 1; // Reduced from 2 to 1 to remove free row

    // 8 Overall Foreign Exchange Position - SPAN LIKE 1ST AND 2ND TITLE
    const overallPositionHeaderRow = currentRow;
    worksheet.getCell(`A${currentRow}`).value = '8';
    worksheet.getCell(`A${currentRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFFFF' } 
    };
    
    // Merge cells from B to last currency column (not including Overall Exposure)
    const lastCurrencyCol = String.fromCharCode(currencyColEnd);
    worksheet.mergeCells(`B${currentRow}:${lastCurrencyCol}${currentRow}`);
    worksheet.getCell(`B${currentRow}`).value = 'Overall Foreign Exchange Position';
    worksheet.getCell(`B${currentRow}`).font = { bold: true };
    
    // Apply light yellow background to the entire merged area
    for (let col = 1; col <= currencyColEnd - 64 + 1; col++) {
      const cell = worksheet.getRow(currentRow).getCell(col);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFFFF' } // Light yellow
      };
    }
    
    // Apply borders to this row - NO BORDER ON BOTTOM LEFT AND RIGHT
    for (let col = 1; col <= overallExposureColNum; col++) {
      const cell = worksheet.getRow(currentRow).getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: col === 1 || col === 2 ?  { style: 'thin' } : undefined, // No bottom border on left and right
        right: { style: 'thin' }
      };
    }
    
    currentRow++;

    // Remove borders and set background for Overall Exposure column above 8.1
    for (let row = headerRow1+2; row < currentRow+1; row++) {
      const cell = worksheet.getRow(row).getCell(overallExposureColNum);
      if (row < currentRow) { // All rows above the current 8.1 row
        cell.border = {
          top: undefined,
          left: {style: 'thin' },
          bottom: undefined,
          right: { style: 'thin' } // Keep only right border
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' } // Light dark background
        };
      }
    }

    // 8.1 Total Long Position (Sum of 5)
    const totalLongRow = currentRow;
    worksheet.getCell(`A${currentRow}`).value = '8.1';
    worksheet.getCell(`B${currentRow}`).value = 'Total Long Position (Sum of 5)';
    worksheet.getRow(currentRow).font = { bold: true };
    let sumFormula = '=';
    currencies.forEach((currency, colIndex) => {
      const col = String.fromCharCode(currencyColStart + colIndex);
      if (colIndex > 0) sumFormula += '+';
      sumFormula += `${col}${netLongBirrRow}`;
    });
    worksheet.getCell(`${overallExposureCol}${currentRow}`).value = { formula: sumFormula };
    worksheet.getCell(`${overallExposureCol}${currentRow}`).font = { bold: true };
    
    // Apply borders to this row - only columns A, B and Overall Exposure have borders
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
        // Currency columns - no borders
        cell.border = {};
          cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' } // Light dark background
        };
      }
    }
    
    currentRow++;

    // 8.2 Total Short Position (Sum of 6)
    const totalShortRow = currentRow;
    worksheet.getCell(`A${currentRow}`).value = '8.2';
    worksheet.getCell(`B${currentRow}`).value = 'Total Short Position (Sum of 6)';
    worksheet.getRow(currentRow).font = { bold: true };
    sumFormula = '=';
    currencies.forEach((currency, colIndex) => {
      const col = String.fromCharCode(currencyColStart + colIndex);
      if (colIndex > 0) sumFormula += '+';
      sumFormula += `${col}${netShortBirrRow}`;
    });
    worksheet.getCell(`${overallExposureCol}${currentRow}`).value = { formula: sumFormula };
    worksheet.getCell(`${overallExposureCol}${currentRow}`).font = { bold: true };
    
    // Apply borders to this row - only columns A, B and Overall Exposure have borders
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
        // Currency columns - no borders
        cell.border = {};
          cell.border = {};
          cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' } // Light dark background
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
    
    // Apply borders to this row - only columns A, B and Overall Exposure have borders
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
        // Currency columns - no borders
        cell.border = {};
          cell.border = {};
          cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' } // Light dark background
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
    
    // Apply borders to this row - only columns A, B and Overall Exposure have borders
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
        // Currency columns - no borders
        cell.border = {};
          cell.border = {};
          cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' } // Light dark background
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
    
    // Apply borders to this row - only columns A, B and Overall Exposure have borders
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
        // Currency columns - no borders
        cell.border = {};
          cell.border = {};
          cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' } // Light dark background
        };
      }
    }
    
    currentRow++;

    // 8.6 Net Open Position Ratio (8.3/8.4*100)
    worksheet.getCell(`A${currentRow}`).value = '8.6';
    worksheet.getCell(`B${currentRow}`).value = 'Net Open Position Ratio (8.3/8.4*100)';
    worksheet.getRow(currentRow).font = { bold: true };
    worksheet.getCell(`${overallExposureCol}${currentRow}`).value = {
      formula: `${overallExposureCol}${overallOpenRow}/${overallExposureCol}${tier1CapitalRow}*100`
    };
    worksheet.getCell(`${overallExposureCol}${currentRow}`).font = { bold: true };
    
    // Apply borders to this row - only columns A, B and Overall Exposure have borders
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
        // Currency columns - no borders
        cell.border = {};
          cell.border = {};
          cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' } // Light dark background
        };
      }
    }
    
    currentRow += 3; // Add 3 rows space as requested
  }

  // Add Description of Country Currency Code section starting from column B
 const currencyDescriptionStartRow = currentRow;

// Merge columns B and C for the title
worksheet.mergeCells(`B${currentRow}:C${currentRow}`);
worksheet.getCell(`B${currentRow}`).value = 'B) Description of Country Currency Code';
worksheet.getCell(`B${currentRow}`).font = { bold: true, size: 12 };
worksheet.getCell(`B${currentRow}`).alignment = { vertical: 'middle', horizontal: 'center' };

  // Apply thin borders to the two rows below main table as requested
  for (let row = currencyDescriptionStartRow; row <= currencyDescriptionStartRow + 1; row++) {
    const worksheetRow = worksheet.getRow(row);
    for (let col = 2; col <= 3; col++) {
      const cell = worksheetRow.getCell(col);
      cell.border = {
        top: { style: undefined },
        left: { style: undefined },
        bottom: { style: undefined },
        right: { style: undefined }
      };
    }
  }
  
  currentRow += 2;

  // Add currency descriptions starting from column B
  const currencyTableStartRow = currentRow;
  currencies.forEach((currency, index) => {
    worksheet.getCell(`B${currentRow}`).value = currency.name;
    worksheet.getCell(`C${currentRow}`).value = currency.code;
    
    // Apply thin borders to currency description table as requested
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
  });
  const currencyTableEndRow = currentRow - 1;

  // Apply formatting
  applyDynamicBSAFormatting(worksheet, currencies.length, currentRow, overallExposureColNum, {
    currencyDescriptionStartRow,
    currencyTableStartRow,
    currencyTableEndRow
  });
}

function applyDynamicBSAFormatting(worksheet, currencyCount, totalRows, overallExposureColNum, currencySection) {
  // Set column widths with perfect padding
  const columns = [
    { width: 8 },  // A: S/No
    { width: 45 }, // B: Particulars
  ];

  // Add currency columns (dynamic width)
  for (let i = 0; i < currencyCount; i++) {
    columns.push({ width: 15 });
  }

  // Add overall exposure column
  columns.push({ width: 18 });

  worksheet.columns = columns;

  // Apply borders and number formatting to all data cells (only up to Overall Exposure column)
  for (let row = 14; row <= totalRows; row++) { // Changed from 16 to 14
    const worksheetRow = worksheet.getRow(row);
    
    // Format currency columns (starting from column C)
    for (let col = 3; col <= (2 + currencyCount); col++) {
      const cell = worksheetRow.getCell(col);
      if (row >= 16 && cell.value !== undefined && cell.value !== null) { // Changed from 18 to 16
        cell.numFmt = '#,##0.00';
      }
    }

    // Format overall exposure column for calculation rows
    const overallExposureCol = 3 + currencyCount;
    const cell = worksheetRow.getCell(overallExposureCol);
    if (row >= 16 && cell.value !== undefined && cell.value !== null) { // Changed from 18 to 16
      cell.numFmt = '#,##0.00';
    }
  }

  // Apply borders to institution info with green background (bold borders as requested)
  for (let row = 8; row <= 11; row++) {
    const worksheetRow = worksheet.getRow(row);
    for (let col = 2; col <= 3; col++) { // Columns B and C
      const cell = worksheetRow.getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
  }

  // Set row heights for better spacing
  for (let row = 1; row <= totalRows; row++) {
    const worksheetRow = worksheet.getRow(row);
    if (row === 1 || row === 6) {
      worksheetRow.height = 25; // Taller for main titles
    } else if (row >= 4 && row <= 7) {
      worksheetRow.height = 20; // Daily Report header rows
    } else if (row === 14 || row === 15) { // Changed from 16/17 to 14/15
      worksheetRow.height = 20; // Header rows
    } else {
      worksheetRow.height = 18; // Regular rows
    }
  }

  // Apply alignment
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      // Center align headers and currency codes
      if ((rowNumber === 14 || rowNumber === 15) || // Changed from 16/17 to 14/15
          (colNumber >= 3 && colNumber <= (2 + currencyCount) && rowNumber === 15)) { // Changed from 17 to 15
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colNumber === 1) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' }; // S/No column
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    });
  });
}