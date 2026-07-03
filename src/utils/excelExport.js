import * as XLSX from 'xlsx';

/**
 * Format currency for display
 */
const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
};

/**
 * Format date for display
 */
const formatDate = (date) => {
  if (!date) return 'N/A';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('en-AE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Get status badge text
 */
const getStatusText = (status) => {
  const statusMap = {
    'pending': 'Pending',
    'paid': 'Paid',
    'missed': 'Missed',
    'cancelled': 'Cancelled',
    'PENDING': 'Pending',
    'PAID': 'Paid',
    'MISSED': 'Missed',
    'CANCELLED': 'Cancelled'
  };
  return statusMap[status] || status;
};

/**
 * Get department label
 */
const getDepartmentLabel = (department) => {
  const deptMap = {
    'office_supply': 'Office Supply',
    'marketing_expense': 'Marketing Expense',
    'office_operations': 'Office Operations',
    'general': 'General'
  };
  return deptMap[department] || department || 'General';
};

/**
 * Generate Excel from invoice data
 */
export const exportInvoicesToExcel = (invoices, filters = {}) => {
  if (!invoices || invoices.length === 0) {
    alert('No invoices to export. Please apply filters to see data.');
    return;
  }

  // Prepare data for Excel
  const excelData = invoices.map((invoice, index) => ({
    '#': index + 1,
    'Invoice Number': invoice.invoiceNumber || 'N/A',
    'Title': invoice.Title || 'Untitled',
    'Description': invoice.description || '',
    'Department': getDepartmentLabel(invoice.department),
    'Status': getStatusText(invoice.Status),
    'Amount (AED)': Number(invoice.amount || 0),
    'Subtotal (AED)': Number(invoice.subtotal || 0),
    'Tax Amount (AED)': Number(invoice.taxAmount || 0),
    'Total (AED)': Number(invoice.total || invoice.amount || 0),
    'Total Paid (AED)': Number(invoice.totalPaid || 0),
    'Creation Date': formatDate(invoice.CreationDate),
    'Due Date': formatDate(invoice.DateLimit),
    'Payment Date': formatDate(invoice.paymentDate),
    'Notes': invoice.Notes || '',
    'Payment Method': invoice.paymentMethod || 'N/A',
    'Payment Reference': invoice.paymentReference || 'N/A',
  }));

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Auto-size columns (optional)
  const colWidths = [
    { wch: 4 },   // #
    { wch: 15 },  // Invoice Number
    { wch: 25 },  // Title
    { wch: 30 },  // Description
    { wch: 18 },  // Department
    { wch: 12 },  // Status
    { wch: 15 },  // Amount
    { wch: 15 },  // Subtotal
    { wch: 15 },  // Tax Amount
    { wch: 15 },  // Total
    { wch: 15 },  // Total Paid
    { wch: 15 },  // Creation Date
    { wch: 15 },  // Due Date
    { wch: 15 },  // Payment Date
    { wch: 30 },  // Notes
    { wch: 18 },  // Payment Method
    { wch: 20 },  // Payment Reference
  ];
  worksheet['!cols'] = colWidths;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoices');

  // Add summary sheet
  const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.totalPaid || 0), 0);
  const paidCount = invoices.filter(inv => inv.Status === 'PAID' || inv.Status === 'paid').length;
  const pendingCount = invoices.filter(inv => inv.Status === 'PENDING' || inv.Status === 'pending').length;
  const missedCount = invoices.filter(inv => inv.Status === 'MISSED' || inv.Status === 'missed').length;

  const summaryData = [
    ['INVOICE SUMMARY REPORT'],
    [''],
    ['Generated On:', new Date().toLocaleString()],
    [''],
    ['Summary Statistics'],
    ['Total Invoices:', invoices.length],
    ['Total Amount:', formatCurrency(totalAmount)],
    ['Total Paid:', formatCurrency(totalPaid)],
    ['Paid Invoices:', paidCount],
    ['Pending Invoices:', pendingCount],
    ['Missed Invoices:', missedCount],
    [''],
    ['Filter Applied:'],
    ['Status:', filters.status || 'All'],
    ['Department:', filters.department || 'All'],
    ['Year:', filters.year || 'All'],
    ['Month:', filters.month !== undefined && filters.month !== '' ? 
      ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][filters.month] 
      : 'All'],
    ['Filter Type:', filters.filterType === 'paymentDate' ? 'Payment Date' : 'Creation Date'],
  ];

  const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summaryWS, 'Summary');

  // Generate Excel file using the built-in method
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/octet-stream' });

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `Invoices_Export_${timestamp}.xlsx`;

  // Create download link and trigger download (works without file-saver)
  const url = window.URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};