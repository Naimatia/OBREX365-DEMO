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

      // Convert date fields if they're dayjs objects
      if (updateData.DateLimit) {
        if (updateData.DateLimit.toDate) {
          dataToUpdate.DateLimit = updateData.DateLimit.toDate();
        } else {
          dataToUpdate.DateLimit = new Date(updateData.DateLimit);
        }
      }

      // Ensure amount is a number
      if (updateData.amount) {
        dataToUpdate.amount = Number(updateData.amount);
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

  // Keep all other methods the same...
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
    const invoice = await this.getById(invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    const payment = {
      amount: invoice.total || invoice.amount || 0,
      method: paymentDetails.method || InvoicePaymentMethod.OTHER,
      reference: paymentDetails.reference || '',
      notes: paymentDetails.notes || '',
      paymentDate: new Date(),
      createdAt: serverTimestamp()
    };

    const paymentHistory = invoice.paymentHistory || [];
    paymentHistory.push(payment);

    return this.update(invoiceId, {
      paymentHistory,
      totalPaid: invoice.total || invoice.amount || 0,
      Status: InvoiceStatus.PAID,
      LastUpdate: serverTimestamp()
    });
  }

  async deleteInvoice(invoiceId) {
    return this.update(invoiceId, { isDeleted: true, LastUpdate: serverTimestamp() });
  }

  // Override the base update method to ensure proper handling
  async update(id, data) {
    try {
      console.log('Base update called:', id, data); // Debug log
      const docRef = doc(db, this.collectionName, id);
      
      const updateData = {
        ...data,
        LastUpdate: serverTimestamp()
      };

      // Ensure department is included if present
      if (data.department) {
        updateData.department = data.department;
      }

      await updateDoc(docRef, updateData);
      
      const updatedDoc = await getDoc(docRef);
      return this.convertToModel({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      console.error(`Error updating document in ${this.collectionName}:`, error);
      throw error;
    }
  }
}

const invoiceService = new InvoiceService();
export default invoiceService;