import BaseFirebaseService from './BaseFirebaseService';
import { convertToInvoiceModel, InvoiceStatus, InvoiceDiscountType, InvoicePaymentMethod } from 'models/InvoiceModel';
import { db, collection, getDocs, query, where, serverTimestamp, addDoc, doc, updateDoc, getDoc } from 'configs/FirebaseConfig';

class InvoiceService extends BaseFirebaseService {
  constructor() {
    super('invoices', convertToInvoiceModel);
  }

  async getInvoicesByCompany(companyId, options = {}) {
    return this.getAllByCompany(companyId, options);
  }

  async createInvoice(invoiceData, items = []) {
    try {
      console.log('Creating invoice with data:', invoiceData); // Debug log

      const { total, subtotal, taxAmount } = this._calculateInvoiceTotals(invoiceData, items);
      const invoiceNumber = await this._generateInvoiceNumber(invoiceData.company_id);

      const newInvoice = {
        // Basic info
        Title: invoiceData.Title || '',
        description: invoiceData.description || '',
        amount: Number(invoiceData.amount || 0),
        
        // Department - Ensure this is properly set
        department: invoiceData.department || 'general',
        
        // Financial details
        subtotal: subtotal || Number(invoiceData.amount || 0),
        taxAmount: taxAmount || 0,
        total: total || Number(invoiceData.amount || 0),
        
        // Status and dates
        Status: invoiceData.Status || InvoiceStatus.PENDING,
        CreationDate: serverTimestamp(),
        DateLimit: invoiceData.DateLimit || null,
        LastUpdate: serverTimestamp(),
        
        // NEW: Payment Date from receipt
        paymentDate: invoiceData.paymentDate || null,
        
        // Relations
        company_id: invoiceData.company_id,
        creator_id: invoiceData.creator_id,
        
        // Additional fields
        Notes: invoiceData.Notes || '',
        paymentUrl: invoiceData.paymentUrl || '',
        invoiceNumber: invoiceNumber,
        
        // Items and history
        items: items || [],
        paymentHistory: [],
        totalPaid: 0,
        
        // Metadata
        isDeleted: false,
        isSynced: true
      };

      // Add optional fields if they exist
      if (invoiceData.contactId) newInvoice.contactId = invoiceData.contactId;
      if (invoiceData.dealId) newInvoice.dealId = invoiceData.dealId;
      if (invoiceData.discount) newInvoice.discount = invoiceData.discount;
      if (invoiceData.discountType) newInvoice.discountType = invoiceData.discountType;
      if (invoiceData.taxRate) newInvoice.taxRate = invoiceData.taxRate;

      console.log('Saving invoice to Firestore:', newInvoice); // Debug log

      const docRef = await addDoc(collection(db, 'invoices'), newInvoice);
      const createdDoc = await getDoc(docRef);
      
      const result = convertToInvoiceModel({ id: docRef.id, ...createdDoc.data() });
      console.log('Invoice created successfully:', result); // Debug log
      
      return result;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  async updateInvoice(invoiceId, updateData) {
    try {
      console.log('Updating invoice:', invoiceId, updateData); // Debug log

      const invoiceRef = doc(db, 'invoices', invoiceId);
      
      // Prepare update data
      const dataToUpdate = {
        ...updateData,
        LastUpdate: serverTimestamp()
      };

      // Ensure department is included
      if (updateData.department) {
        dataToUpdate.department = updateData.department;
      }

      // Handle DateLimit if provided
      if (updateData.DateLimit) {
        if (updateData.DateLimit.toDate) {
          dataToUpdate.DateLimit = updateData.DateLimit.toDate();
        } else if (updateData.DateLimit instanceof Date) {
          dataToUpdate.DateLimit = updateData.DateLimit;
        } else {
          dataToUpdate.DateLimit = new Date(updateData.DateLimit);
        }
      }

      // NEW: Handle paymentDate if provided
      if (updateData.paymentDate) {
        if (updateData.paymentDate.toDate) {
          dataToUpdate.paymentDate = updateData.paymentDate.toDate();
        } else if (updateData.paymentDate instanceof Date) {
          dataToUpdate.paymentDate = updateData.paymentDate;
        } else {
          dataToUpdate.paymentDate = new Date(updateData.paymentDate);
        }
      }

      // Ensure amount is a number
      if (updateData.amount !== undefined) {
        dataToUpdate.amount = Number(updateData.amount);
      }

      // Handle Status update
      if (updateData.Status) {
        dataToUpdate.Status = updateData.Status;
      }

      console.log('Updating invoice with data:', dataToUpdate); // Debug log

      await updateDoc(invoiceRef, dataToUpdate);
      
      // Get the updated document
      const updatedDoc = await getDoc(invoiceRef);
      
      const result = convertToInvoiceModel({
        id: invoiceId,
        ...updatedDoc.data()
      });
      
      console.log('Invoice updated successfully:', result); // Debug log
      
      return result;
    } catch (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }
  }

  async _generateInvoiceNumber(companyId) {
    try {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');

      const invoicesQuery = query(
        collection(db, 'invoices'),
        where('company_id', '==', companyId),
        where('invoiceNumber', '>=', `INV-${year}${month}-`),
        where('invoiceNumber', '<', `INV-${year}${month}-Z`)
      );

      const querySnapshot = await getDocs(invoicesQuery);
      const count = querySnapshot.size + 1;
      return `INV-${year}${month}-${String(count).padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating invoice number:', error);
      const timestamp = Date.now();
      return `INV-${timestamp}`;
    }
  }

  _calculateInvoiceTotals(invoiceData, items) {
    let subtotal = 0;
    
    if (items && items.length > 0) {
      subtotal = items.reduce((sum, item) => {
        const quantity = item.quantity || 1;
        const price = item.price || 0;
        return sum + (quantity * price);
      }, 0);
    } else if (invoiceData.amount) {
      subtotal = Number(invoiceData.amount);
    }

    let discountAmount = 0;
    if (invoiceData.discount) {
      if (invoiceData.discountType === InvoiceDiscountType.PERCENTAGE) {
        discountAmount = subtotal * (invoiceData.discount / 100);
      } else {
        discountAmount = invoiceData.discount;
      }
    }

    const taxableAmount = subtotal - discountAmount;
    const taxAmount = invoiceData.taxRate ? taxableAmount * (invoiceData.taxRate / 100) : 0;
    const total = taxableAmount + taxAmount;

    return { subtotal, discountAmount, taxAmount, total };
  }

  async updateStatus(invoiceId, status) {
    if (!Object.values(InvoiceStatus).includes(status)) {
      throw new Error(`Invalid invoice status: ${status}`);
    }
    return this.update(invoiceId, { Status: status, LastUpdate: serverTimestamp() });
  }

async markAsPaid(invoiceId, paymentDetails = {}) {
  try {
    if (!invoiceId) {
      throw new Error('Invoice ID is required');
    }
    
    const invoice = await this.getById(invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    // If paymentDate is provided in paymentDetails, use it
    // Otherwise use current date
    const paymentDate = paymentDetails.paymentDate || new Date();

    // Create payment record WITHOUT serverTimestamp() in the array
    const payment = {
      amount: invoice.total || invoice.amount || 0,
      method: paymentDetails.method || InvoicePaymentMethod.OTHER,
      reference: paymentDetails.reference || '',
      notes: paymentDetails.notes || '',
      paymentDate: paymentDate instanceof Date ? paymentDate : new Date(paymentDate),
      createdAt: new Date() // Use regular Date instead of serverTimestamp
    };

    const paymentHistory = invoice.paymentHistory || [];
    paymentHistory.push(payment);

    // Update invoice with payment date from receipt
    const updateData = {
      paymentHistory: paymentHistory,
      totalPaid: invoice.total || invoice.amount || 0,
      Status: InvoiceStatus.PAID,
      paymentDate: paymentDate instanceof Date ? paymentDate : new Date(paymentDate),
      LastUpdate: new Date() // Use regular Date instead of serverTimestamp
    };

    // Use the update method with the collection path
    const docRef = doc(db, this.collectionPath, invoiceId);
    await updateDoc(docRef, updateData);
    
    const updatedDoc = await getDoc(docRef);
    return this._convertToModel({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    throw error;
  }
}

  async deleteInvoice(invoiceId) {
    return this.update(invoiceId, { isDeleted: true, LastUpdate: serverTimestamp() });
  }


// Override the base update method to ensure proper handling
async update(id, data) {
  try {
    if (!id) {
      throw new Error('Document ID is required for update');
    }
    
    console.log('Base update called:', id, data); // Debug log
    
    // Use the collection path from the base class
    const docRef = doc(db, this.collectionPath, id);
    
    const updateData = {
      ...data,
      LastUpdate: serverTimestamp()
    };

    // Ensure department is included if present
    if (data.department) {
      updateData.department = data.department;
    }

    // Handle DateLimit if present
    if (data.DateLimit) {
      if (data.DateLimit.toDate) {
        updateData.DateLimit = data.DateLimit.toDate();
      } else if (data.DateLimit instanceof Date) {
        updateData.DateLimit = data.DateLimit;
      } else {
        updateData.DateLimit = new Date(data.DateLimit);
      }
    }

    // Handle paymentDate if present
    if (data.paymentDate) {
      if (data.paymentDate.toDate) {
        updateData.paymentDate = data.paymentDate.toDate();
      } else if (data.paymentDate instanceof Date) {
        updateData.paymentDate = data.paymentDate;
      } else {
        updateData.paymentDate = new Date(data.paymentDate);
      }
    }

    // Ensure amount is a number if present
    if (data.amount !== undefined) {
      updateData.amount = Number(data.amount);
    }

    console.log('Updating invoice with data:', updateData); // Debug log

    await updateDoc(docRef, updateData);
    
    const updatedDoc = await getDoc(docRef);
    return this._convertToModel({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error(`Error updating document in ${this.collectionPath}:`, error);
    throw error;
  }
}

  // NEW: Get invoices by payment date range
  async getInvoicesByPaymentDateRange(companyId, startDate, endDate) {
    try {
      let q = query(
        collection(db, 'invoices'),
        where('company_id', '==', companyId),
        where('isDeleted', '==', false)
      );

      if (startDate) {
        q = query(q, where('paymentDate', '>=', startDate));
      }
      if (endDate) {
        q = query(q, where('paymentDate', '<=', endDate));
      }

      const querySnapshot = await getDocs(q);
      const invoices = [];
      querySnapshot.forEach((doc) => {
        invoices.push(this.convertToModel({ id: doc.id, ...doc.data() }));
      });
      
      return invoices;
    } catch (error) {
      console.error('Error getting invoices by payment date range:', error);
      throw error;
    }
  }

  // NEW: Get invoices by due date range (keeping for backward compatibility)
  async getInvoicesByDueDateRange(companyId, startDate, endDate) {
    try {
      let q = query(
        collection(db, 'invoices'),
        where('company_id', '==', companyId),
        where('isDeleted', '==', false)
      );

      if (startDate) {
        q = query(q, where('DateLimit', '>=', startDate));
      }
      if (endDate) {
        q = query(q, where('DateLimit', '<=', endDate));
      }

      const querySnapshot = await getDocs(q);
      const invoices = [];
      querySnapshot.forEach((doc) => {
        invoices.push(this.convertToModel({ id: doc.id, ...doc.data() }));
      });
      
      return invoices;
    } catch (error) {
      console.error('Error getting invoices by due date range:', error);
      throw error;
    }
  }

  // NEW: Get invoices with payment date in current month
  async getInvoicesByCurrentMonth(companyId) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return this.getInvoicesByPaymentDateRange(companyId, startOfMonth, endOfMonth);
  }
}

const invoiceService = new InvoiceService();
export default invoiceService;