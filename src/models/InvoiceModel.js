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
  paymentUrl: ''
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
    company_id: data.companyId || data.company_id || '',
    creator_id: data.creatorId || data.creator_id || '',
    CreationDate: data.createdAt || data.creationDate || data.CreationDate || null,
    LastUpdate: data.updatedAt || data.lastUpdate || data.LastUpdate || null,
    DateLimit: data.dateLimit || data.DateLimit || null,
    Status: data.status || data.Status || InvoiceStatus.PENDING,
    Notes: data.Notes || data.notes || '',
    Title: data.title || data.Title || '',
    description: data.description || '',
    amount: Number(data.amount || 0),
    paymentUrl: data.paymentUrl || data.payment_url || ''
  };
};

export default InvoiceModel;
