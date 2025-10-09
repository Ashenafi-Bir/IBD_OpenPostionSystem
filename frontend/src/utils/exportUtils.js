import { utils, writeFile } from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper function to format numbers with thousands separators
const formatNumberWithCommas = (num) => {
  if (num === null || num === undefined || num === 0) return '-';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

// Helper function to format currency with parentheses for negative
const formatExportCurrency = (amount) => {
  if (amount === null || amount === undefined || amount === 0) return '-';
  const formatted = formatNumberWithCommas(Math.abs(amount));
  return amount < 0 ? `(${formatted})` : formatted;
};

// Helper function to format percentage
const formatExportPercentage = (percentage) => {
  if (percentage === null || percentage === undefined || percentage === 0) return '-';
  const formatted = formatNumberWithCommas(Math.abs(percentage));
  return percentage < 0 ? `(${formatted})` : formatted;
};

// Excel Export Function
export const exportToExcel = async (exportData) => {
  try {
    const workbook = utils.book_new();
    
    // Format date for display
    const reportDate = new Date(exportData.reportDate);
    const formattedDate = reportDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).toUpperCase();

    // Prepare data for Excel in the exact format from the image
    const excelData = [
      // Header rows
      [exportData.bankName],
      [],
      ['OPEN FOREIGN CURRENCY POSITION REPORT'],
      [`AT THE CLOSE OF BUSINESS ON ${formattedDate}`],
      ['IN THOUSANDS OF BIRR'],
      [],
      // Contact info aligned to right
      ['', '', '', '', '', '', '', '', '', '', `Contact Person: ${exportData.contactPerson}`],
      ['', '', '', '', '', '', '', '', '', '', `${exportData.faxNo}`],
      [],
      // Main table headers
      [
        '','Balance Sheet', '', '','Memorandum Items', '', 'Position',
        '', 'Closing', 'Position Local Currency', '', 'Percentage of Total Capital'
      ],
      [
        '(1)', 'Assets (2)', 'Liab (3)', 'Assets (4)', 'Liabilities (5)', 'Peg Bal (6)',
        'Long(+) (7)', 'Short(-)(8)', 'Rate (9)', 'Long (7x9=10)', 'Short(8x9=11)', '(12)'
      ],
    ];

    // Add currency rows
    exportData.details.forEach(currency => {
      const longPosition = currency.type === 'long' ? Math.abs(currency.position) : 0;
      const shortPosition = currency.type === 'short' ? Math.abs(currency.position) : 0;
      const longLocal = currency.type === 'long' ? Math.abs(currency.positionLocal) : 0;
      const shortLocal = currency.type === 'short' ? Math.abs(currency.positionLocal) : 0;

      excelData.push([
        currency.currency,
        formatExportCurrency(currency.asset),
        formatExportCurrency(currency.liability),
        formatExportCurrency(currency.memoAsset),
        formatExportCurrency(currency.memoLiability),
        '-', // Peg Bal (not in our data)
        longPosition > 0 ? formatExportCurrency(longPosition) : '-',
        shortPosition > 0 ? formatExportCurrency(shortPosition) : '-',
        formatNumberWithCommas(currency.midRate),
        longLocal > 0 ? formatExportCurrency(longLocal) : '-',
        shortLocal > 0 ? formatExportCurrency(shortLocal) : '-',
        formatExportPercentage(currency.percentage)
      ]);
    });

    // Add empty rows for spacing (like in the image)
    for (let i = 0; i < 3; i++) {
      excelData.push(['', '', '', '', '', '', '', '', '', '', '', '0.00%']);
    }

    // Add summary rows
    excelData.push([]);
    excelData.push(['', '', '', '', '', '', '', '', '', '','Total Capital (13)',  formatExportCurrency(exportData.summary.paidUpCapital)]);
    excelData.push(['', '', '', '', '', '', '', '', '', '','Total Long Positions (total column 10 = 15)',  formatExportCurrency(exportData.summary.totalLong)]);
    excelData.push(['', '', '', '', '', '', '', '', '', '','Total Short Positions (total column 11 = 16)',  formatExportCurrency(exportData.summary.totalShort)]);
    excelData.push(['', '', '', '', '', '', '', '', '', '','Overall Open Foreign Currency Position',  formatExportCurrency(exportData.summary.overallOpenPosition)]);
    excelData.push(['', '', '', '', '', '', '', '', '', '','(the greater of 15 or 16 =17)',  formatExportPercentage(exportData.summary.overallPercentage)]);
    // excelData.push(['', '', '', '', '', '', '', '', '', '', '', formatExportPercentage(exportData.summary.overallPercentage)]);

    // Create worksheet
    const worksheet = utils.aoa_to_sheet(excelData);
    
    // Set column widths to match the image layout
    const colWidths = [
      { wch: 15 }, // Currency (1)
      { wch: 12 }, // Assets (2)
      { wch: 10 }, // Liab (3)
      { wch: 12 }, // Memo Assets (4)
      { wch: 15 }, // Memo Liabilities (5)
      { wch: 10 }, // Peg Bal (6)
      { wch: 12 }, // Long Position (7)
      { wch: 12 }, // Short Position (8)
      { wch: 10 }, // Rate (9)
      { wch: 18 }, // Long Local (10)
      { wch: 35 }, // Short Local (11)
      { wch: 20 }  // Percentage (12)
    ];
    worksheet['!cols'] = colWidths;

    // Add some basic styling through cell types
    const range = utils.decode_range(worksheet['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = utils.encode_cell({r:R, c:C});
        if (!worksheet[cell_address]) continue;
        
        // Style headers
        if (R <= 8 || R === 9 || R === 10) {
          worksheet[cell_address].s = {
            font: { bold: true },
            alignment: { horizontal: 'center' }
          };
        }
        
        // Style numbers to be right-aligned
        if (C >= 1 && C <= 11 && R >= 11) {
          worksheet[cell_address].s = {
            alignment: { horizontal: 'right' }
          };
        }
      }
    }

    // Add worksheet to workbook
    utils.book_append_sheet(workbook, worksheet, 'Position Report');

    // Generate file name and save
    const fileName = `Position_Report_${reportDate.toISOString().split('T')[0]}.xlsx`;
    writeFile(workbook, fileName);
    
    return true;
  } catch (error) {
    console.error('Excel export error:', error);
    throw new Error('Failed to generate Excel file');
  }
};

// PDF Export Function
export const exportToPDF = async (exportData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Format date for display
      const reportDate = new Date(exportData.reportDate);
      const formattedDate = reportDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).toUpperCase();

      let yPosition = 20;

      // Header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(exportData.bankName, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;

      doc.setFontSize(12);
      doc.text('OPEN FOREIGN CURRENCY POSITION REPORT', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 6;

      doc.setFontSize(10);
      doc.text(`AT THE CLOSE OF BUSINESS ON ${formattedDate}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;

      doc.text('IN THOUSANDS OF BIRR', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Contact info
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Contact Person: ${exportData.contactPerson}`, pageWidth - 20, yPosition, { align: 'right' });
      yPosition += 4;
      doc.text(exportData.faxNo, pageWidth - 20, yPosition, { align: 'right' });
      yPosition += 10;

      // Prepare table data
      const headers = [
        ['Balance Sheet', 'Memorandum Items', 'Position', 'Closing', 'Position Local Currency', '% Total Capital']
      ];

      const subHeaders = [
        '(1)', 'Assets (2)', 'Liab (3)', 'Assets (4)', 'Liabilities (5)', 'Peg Bal (6)',
        'Long(+) (7)', 'Short(-)(8)', 'Rate (9)', 'Long (7x9=10)', 'Short(8x9=11)', '(12)'
      ];

      const tableData = exportData.details.map(currency => {
        const longPosition = currency.type === 'long' ? Math.abs(currency.position) : 0;
        const shortPosition = currency.type === 'short' ? Math.abs(currency.position) : 0;
        const longLocal = currency.type === 'long' ? Math.abs(currency.positionLocal) : 0;
        const shortLocal = currency.type === 'short' ? Math.abs(currency.positionLocal) : 0;

        return [
          currency.currency,
          formatExportCurrency(currency.asset),
          formatExportCurrency(currency.liability),
          formatExportCurrency(currency.memoAsset),
          formatExportCurrency(currency.memoLiability),
          '-', // Peg Bal
          longPosition > 0 ? formatExportCurrency(longPosition) : '-',
          shortPosition > 0 ? formatExportCurrency(shortPosition) : '-',
          formatNumberWithCommas(currency.midRate),
          longLocal > 0 ? formatExportCurrency(longLocal) : '-',
          shortLocal > 0 ? formatExportCurrency(shortLocal) : '-',
          formatExportPercentage(currency.percentage)
        ];
      });

      // Add empty rows
      for (let i = 0; i < 3; i++) {
        tableData.push(['', '', '', '', '', '', '', '', '', '', '', '0.00%']);
      }

  // Add summary data
      tableData.push([]);
      tableData.push(['', '', '', '', '', '', '', 'Total Capital (13)', '', formatExportCurrency(exportData.summary.paidUpCapital)]);
      tableData.push([ '', '', '', '', '', '', '', 'Total Long Positions (total column 10 = 15)', '', formatExportCurrency(exportData.summary.totalLong)]);
      tableData.push([ '', '', '', '', '', '', '', 'Total Short Positions (total column 11 = 16)', '', formatExportCurrency(exportData.summary.totalShort)]);
      tableData.push([ '', '', '', '', '', '', '', 'Overall Open Foreign Currency Position', '', formatExportCurrency(exportData.summary.overallOpenPosition)]);
      tableData.push([ '', '', '', '', '', '', '', '(the greater of 15 or 16 =17)', '', '']);
      tableData.push([ '', '', '', '', '', '', '', '', '', formatExportPercentage(exportData.summary.overallPercentage)]);

      // Create table
      autoTable(doc, {
        startY: yPosition,
        head: [subHeaders],
        body: tableData,
        theme: 'grid',
        styles: { 
          fontSize: 7, 
          cellPadding: 2,
          lineColor: [0, 0, 0],
          lineWidth: 0.1
        },
        headStyles: { 
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          lineWidth: 0.1
        },
        columnStyles: {
          0: { cellWidth: 18, fontStyle: 'bold' },
          1: { cellWidth: 12, halign: 'right' },
          2: { cellWidth: 10, halign: 'right' },
          3: { cellWidth: 12, halign: 'right' },
          4: { cellWidth: 15, halign: 'right' },
          5: { cellWidth: 10, halign: 'right' },
          6: { cellWidth: 12, halign: 'right' },
          7: { cellWidth: 12, halign: 'right' },
          8: { cellWidth: 10, halign: 'right' },
          9: { cellWidth: 18, halign: 'right' },
          10: { cellWidth: 18, halign: 'right' },
          11: { cellWidth: 15, halign: 'right' }
        },
        margin: { left: 14, right: 14 },
        didDrawPage: function (data) {
          // Add main headers after table is drawn
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          
          const tableStartX = data.settings.margin.left;
          const cellWidth = (pageWidth - 28) / 12;
          
          // Main header positions
          const mainHeaders = [
            { text: 'Balance Sheet', x: tableStartX + cellWidth * 0.5, width: 2 },
            { text: 'Memorandum Items', x: tableStartX + cellWidth * 2.5, width: 2 },
            { text: 'Position', x: tableStartX + cellWidth * 5.5, width: 2 },
            { text: 'Closing', x: tableStartX + cellWidth * 7.5, width: 1 },
            { text: 'Position Local Currency', x: tableStartX + cellWidth * 8.5, width: 2 },
            { text: 'Percentage of Total Capital', x: tableStartX + cellWidth * 10.5, width: 1 }
          ];
          
          mainHeaders.forEach(header => {
            doc.text(header.text, header.x, yPosition - 5, { 
              align: 'center',
              maxWidth: cellWidth * header.width
            });
          });
        }
      });

      // Footer
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        `Generated on: ${new Date().toLocaleString()}`,
        pageWidth / 2,
        finalY,
        { align: 'center' }
      );

      // Save the PDF
      const fileName = `Position_Report_${reportDate.toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      resolve(true);
    } catch (error) {
      console.error('PDF export error:', error);
      reject(new Error('Failed to generate PDF file'));
    }
  });
};