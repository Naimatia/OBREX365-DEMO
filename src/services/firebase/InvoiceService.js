import BaseFirebaseService from './BaseFirebaseService';
import { convertToInvoiceModel, InvoiceStatus, InvoiceDiscountType, InvoicePaymentMethod } from 'models/InvoiceModel';
import { db, collection, getDocs, query, where, serverTimestamp, addDoc } from 'configs/FirebaseConfig';

/**
 * Service for managing invoices with Firebase
 * Extends BaseFirebaseService for common CRUD operations
 */
class InvoiceService extends BaseFirebaseService {
  /**
   * Constructor
   */
  constructor() {
    super('invoices', convertToInvoiceModel);
  }

  /**
   * Get invoices by company ID
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of invoices
   */
  async getInvoicesByCompany(companyId, options = {}) {
    return this.getAllByCompany(companyId, options);
  }

  

  /**
   * Get invoices by status
   * @param {string} companyId - Company ID
   * @param {string} status - Invoice status
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of invoices
   */
  async getInvoicesByStatus(companyId, status, options = {}) {
    const statusFilter = ['status', '==', status];
    const filters = options.filters ? [...options.filters, statusFilter] : [statusFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
  }

  /**
   * Get invoices for a specific contact
   * @param {string} companyId - Company ID
   * @param {string} contactId - Contact ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of invoices
   */
  async getInvoicesByContact(companyId, contactId, options = {}) {
    const contactFilter = ['contactId', '==', contactId];
    const filters = options.filters ? [...options.filters, contactFilter] : [contactFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
  }

  /**
   * Get invoices for a specific deal
   * @param {string} companyId - Company ID
   * @param {string} dealId - Deal ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of invoices
   */
  async getInvoicesByDeal(companyId, dealId, options = {}) {
    const dealFilter = ['dealId', '==', dealId];
    const filters = options.filters ? [...options.filters, dealFilter] : [dealFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
  }

  /**
   * Get overdue invoices
   * @param {string} companyId - Company ID
   * @returns {Promise<Array>} - Array of invoices
   */
  async getOverdueInvoices(companyId) {
    const today = new Date();
    const statusFilter = ['status', '==', InvoiceStatus.PENDING];
    const dueDateFilter = ['dueDate', '<', today];
    
    return this.getAllByCompany(companyId, {
      filters: [statusFilter, dueDateFilter],
      orderByFields: [['dueDate', 'asc']]
    });
  }

  /**
   * Create a new invoice with items
   * @param {Object} invoiceData - Invoice data
   * @param {Array} items - Invoice items
   * @returns {Promise<Object>} - Created invoice
   */
async createInvoice(invoiceData, items = []) {
  try {
    const { total, subtotal, taxAmount } = this._calculateInvoiceTotals(invoiceData, items);
    
    const invoiceNumber = await this._generateInvoiceNumber(invoiceData.company_id);
    
    const newInvoice = {
      ...invoiceData,
      invoiceNumber,
      items,
      subtotal,
      taxAmount,
      total,
      Status: invoiceData.Status || InvoiceStatus.PENDING,
      CreationDate: serverTimestamp(),
      LastUpdate: serverTimestamp(),
      company_id: invoiceData.company_id,
      creator_id: invoiceData.creator_id,
      Notes: invoiceData.Notes || '',
      Title: invoiceData.Title || '',
      description: invoiceData.description || '',
      amount: Number(invoiceData.amount || 0),
      paymentUrl: invoiceData.paymentUrl || '',
      isDeleted: false
    };
    
    const createdDoc = await this.create(newInvoice);
    return convertToInvoiceModel({ id: createdDoc.id, ...newInvoice });
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
}

  /**
   * Generate a unique invoice number
   * @param {string} companyId - Company ID
   * @returns {Promise<string>} - Invoice number
   * @private
   */
  async _generateInvoiceNumber(companyId) {
    try {
      // Get current year and month
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      
      // Get company invoices for the current year/month
      const invoicesQuery = query(
        collection(db, 'invoices'),
        where('companyId', '==', companyId),
        where('invoiceNumber', '>=', `INV-${year}${month}-`),
        where('invoiceNumber', '<', `INV-${year}${month}-Z`)
      );
      
      const querySnapshot = await getDocs(invoicesQuery);
      const count = querySnapshot.size + 1;
      
      // Format: INV-YYYYMM-XXXX (e.g. INV-202307-0001)
      return `INV-${year}${month}-${String(count).padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating invoice number:', error);
      // Fallback to timestamp-based number
      const timestamp = Date.now();
      return `INV-${timestamp}`;
    }
  }

  /**
   * Calculate invoice totals
   * @param {Object} invoiceData - Invoice data
   * @param {Array} items - Invoice items
   * @returns {Object} - Calculated totals
   * @private
   */
  _calculateInvoiceTotals(invoiceData, items) {
    // Calculate subtotal from items
    const subtotal = items.reduce((sum, item) => {
      const quantity = item.quantity || 1;
      const price = item.price || 0;
      return sum + (quantity * price);
    }, 0);
    
    // Calculate discount amount
    let discountAmount = 0;
    
    if (invoiceData.discount) {
      if (invoiceData.discountType === InvoiceDiscountType.PERCENTAGE) {
        discountAmount = subtotal * (invoiceData.discount / 100);
      } else {
        discountAmount = invoiceData.discount;
      }
    }
    
    // Calculate tax
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = invoiceData.taxRate ? 
      taxableAmount * (invoiceData.taxRate / 100) : 0;
    
    // Calculate total
    const total = taxableAmount + taxAmount;
    
    return {
      subtotal,
      discountAmount,
      taxAmount,
      total
    };
  }

  /**
   * Update invoice status
   * @param {string} invoiceId - Invoice ID
   * @param {string} status - New status
   * @returns {Promise<Object>} - Updated invoice
   */
  async updateStatus(invoiceId, status) {
    // Validate status
    if (!Object.values(InvoiceStatus).includes(status)) {
      throw new Error(`Invalid invoice status: ${status}`);
    }
    
    return this.update(invoiceId, {
      status,
      statusUpdatedAt: serverTimestamp()
    });
  }

  /**
   * Add payment to an invoice
   * @param {string} invoiceId - Invoice ID
   * @param {Object} payment - Payment details
   * @returns {Promise<Object>} - Updated invoice
   */
  async addPayment(invoiceId, payment) {
    try {
      const invoice = await this.getById(invoiceId);
      
      if (!invoice) {
        throw new Error('Invoice not found');
      }
      
      // Add payment to history
      const paymentHistory = invoice.paymentHistory || [];
      const newPayment = {
        ...payment,
        paymentDate: payment.paymentDate || new Date(),
        createdAt: serverTimestamp()
      };
      
      paymentHistory.push(newPayment);
      
      // Calculate total paid amount
      const totalPaid = paymentHistory.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      // Update invoice
      let status = invoice.status;
      
      if (totalPaid >= invoice.total) {
        status = InvoiceStatus.PAID;
      } else if (totalPaid > 0) {
        status = InvoiceStatus.PARTIALLY_PAID;
      }
      
      return this.update(invoiceId, {
        paymentHistory,
        totalPaid,
        status,
        statusUpdatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding payment to invoice:', error);
      throw error;
    }
  }

  /**
   * Send invoice by email
   * @param {string} invoiceId - Invoice ID
   * @param {string} recipientEmail - Recipient email
   * @returns {Promise<boolean>} - Success status
   */
  async sendInvoiceByEmail(invoiceId, recipientEmail) {
    try {
      // This would normally use Firebase Functions to send emails
      // For now, we'll just record the send attempt
      
      const invoice = await this.getById(invoiceId);
      
      if (!invoice) {
        throw new Error('Invoice not found');
      }
      
      // Create send history entry
      const sendHistory = invoice.sendHistory || [];
      sendHistory.push({
        to: recipientEmail,
        sentAt: new Date(),
        status: 'sent'
      });
      
      // Update invoice
      await this.update(invoiceId, { 
        sendHistory,
        lastSentAt: serverTimestamp(),
        status: InvoiceStatus.SENT
      });
      
      return true;
    } catch (error) {
      console.error('Error sending invoice by email:', error);
      throw error;
    }
  }

  /**
   * Mark invoice as paid
   * @param {string} invoiceId - Invoice ID
   * @param {Object} paymentDetails - Payment details
   * @returns {Promise<Object>} - Updated invoice
   */
  async markAsPaid(invoiceId, paymentDetails = {}) {
    const invoice = await this.getById(invoiceId);
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    
    // Create payment record
    const payment = {
      amount: invoice.total,
      method: paymentDetails.method || InvoicePaymentMethod.OTHER,
      reference: paymentDetails.reference || '',
      notes: paymentDetails.notes || '',
      paymentDate: new Date(),
      createdAt: serverTimestamp()
    };
    
    // Add payment to history
    const paymentHistory = invoice.paymentHistory || [];
    paymentHistory.push(payment);
    
    // Update invoice
    return this.update(invoiceId, {
      paymentHistory,
      totalPaid: invoice.total,
      status: InvoiceStatus.PAID,
      statusUpdatedAt: serverTimestamp()
    });
  }

  /**
   * Create invoice items for a service or property
   * @param {string} invoiceId - Invoice ID
   * @param {Array} items - Items to add
   * @returns {Promise<Object>} - Updated invoice
   */
  async addInvoiceItems(invoiceId, items) {
    const invoice = await this.getById(invoiceId);
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    
    // Add items to invoice
    const currentItems = invoice.items || [];
    const updatedItems = [...currentItems, ...items];
    
    // Recalculate totals
    const { subtotal, taxAmount, total } = this._calculateInvoiceTotals(invoice, updatedItems);
    
    // Update invoice
    return this.update(invoiceId, {
      items: updatedItems,
      subtotal,
      taxAmount,
      total,
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Generate analytics for invoices
   * @param {string} companyId - Company ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} - Invoice analytics
   */
  async generateInvoiceAnalytics(companyId, startDate, endDate) {
    try {
      // Get invoices for the date range
      const createdAtStartFilter = ['createdAt', '>=', startDate];
      const createdAtEndFilter = ['createdAt', '<=', endDate];
      
      const invoices = await this.getAllByCompany(companyId, {
        filters: [createdAtStartFilter, createdAtEndFilter]
      });
      
      // Calculate totals by status
      const totalsByStatus = {};
      Object.values(InvoiceStatus).forEach(status => {
        totalsByStatus[status] = 0;
      });
      
      let totalAmount = 0;
      let totalPaidAmount = 0;
      let totalOverdueAmount = 0;
      
      const today = new Date();
      
      invoices.forEach(invoice => {
        if (invoice.status) {
          totalsByStatus[invoice.status] = 
            (totalsByStatus[invoice.status] || 0) + (invoice.total || 0);
        }
        
        totalAmount += invoice.total || 0;
        totalPaidAmount += invoice.totalPaid || 0;
        
        // Check for overdue
        if (
          invoice.status === InvoiceStatus.PENDING && 
          invoice.dueDate && 
          new Date(invoice.dueDate) < today
        ) {
          totalOverdueAmount += invoice.total || 0;
        }
      });
      
      // Calculate collection rate
      const collectionRate = totalAmount > 0 ? 
        (totalPaidAmount / totalAmount) * 100 : 0;
      
      return {
        invoiceCount: invoices.length,
        totalAmount,
        totalPaidAmount,
        totalOverdueAmount,
        collectionRate,
        totalsByStatus
      };
    } catch (error) {
      console.error('Error generating invoice analytics:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const invoiceService = new InvoiceService();
export default invoiceService;
