/**
 * Invoice model interface based on Firestore schema
 */
export const InvoiceModel = {
  id: '',
  company_id: '', // Company ID for data partitioning
  creator_id: '', // User who created the invoice
  CreationDate: null, // Firebase Timestamp or JS Date
  LastUpdate: null, // Firebase Timestamp or JS Date
  DateLimit: null, // Firebase Timestamp or JS Date
  Status: '', 
  Notes: '',
  Title: '',
  description: '',
  amount: 0,
  paymentUrl: '',
  department: 'general', // Department field
  invoiceNumber: '', // Invoice number
  subtotal: 0, // Subtotal before tax
  taxAmount: 0, // Tax amount
  total: 0, // Total amount
  items: [], // Invoice items
  isDeleted: false // Soft delete flag
}

/**
 * Invoice status options
 */
export const InvoiceStatus = {
  PENDING: 'Pending',
  PAID: 'Paid',
  MISSED: 'Missed',
  CANCELLED: 'Cancelled'
}

/**
 * Invoice discount type options
 */
export const InvoiceDiscountType = {
  PERCENTAGE: 'Percentage',
  FIXED: 'Fixed'
}

/**
 * Invoice payment method options
 */
export const InvoicePaymentMethod = {
  BANK_TRANSFER: 'Bank Transfer',
  CREDIT_CARD: 'Credit Card',
  CASH: 'Cash',
  CHECK: 'Check',
  PAYPAL: 'PayPal',
  OTHER: 'Other'
}

/**
 * Convert Firestore document to invoice model
 * @param {Object} doc - Firestore document
 * @returns {Object} - Invoice model
 */
export const convertToInvoiceModel = (doc) => {
  if (!doc) return null;
  
  const data = doc.data ? doc.data() : doc; // Handle both doc and doc.data cases
  
  return {
    id: doc.id || '',
    Title: data.Title || '',
    amount: data.amount || 0,
    total: data.total || 0,
    subtotal: data.subtotal || 0,
    taxAmount: data.taxAmount || 0,
    invoiceNumber: data.invoiceNumber || `INV-${doc.id?.slice(-6) || Date.now()}`,
    Status: data.Status || InvoiceStatus.PENDING,
    CreationDate: data.CreationDate || null,
    DateLimit: data.DateLimit || null,
    LastUpdate: data.LastUpdate || null,
    Notes: data.Notes || '',
    description: data.description || '',
    paymentUrl: data.paymentUrl || '',
    company_id: data.company_id || '',
    creator_id: data.creator_id || '',
    department: data.department || 'general', // ⭐ ADDED DEPARTMENT FIELD
    items: data.items || [],
    isDeleted: data.isDeleted || false,
  };
};

export default InvoiceModel;