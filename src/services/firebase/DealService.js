// services/firebase/DealService.js
import { db } from 'configs/FirebaseConfig';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp,
  orderBy,
  limit,
  arrayUnion
} from 'firebase/firestore';
import { convertToDealModel, DealStatus, DealSourceEnum, DealPriority } from 'models/DealModel';
import sellerActivityService, { ActivityTypes, EntityTypes } from './SellerActivityService';

class DealService {

  async logDealActivity(sellerId, companyId, activityType, dealId, dealData, details = {}, metadata = {}) {
  return sellerActivityService.logActivity({
    sellerId,
    companyId,
    activityType,
    entityType: EntityTypes.DEAL,
    entityId: dealId,
    entityName: dealData?.Description || details?.name || 'Unknown Deal',
    details: {
      ...details,
      name: dealData?.Description || details?.name,
      amount: dealData?.Amount || details?.amount,
      status: dealData?.Status || details?.status,
      contactName: dealData?.contact_name || details?.contactName,
    },
    metadata: {
      ...metadata,
      amount: dealData?.Amount || details?.amount || metadata?.amount,
      status: dealData?.Status || details?.status || metadata?.status,
    },
  });
}

  /**
   * Create a new deal
   */
  async create(dealData) {
    try {
      // Prepare deal data with all fields
      const deal = {
        // Core fields
        Amount: dealData.Amount || 0,
        Description: dealData.Description || '',
        Status: dealData.Status || DealStatus.OPENED,
        Source: dealData.Source || DealSourceEnum.CONTACTS,
        contact_id: dealData.contact_id || '',
        lead_id: dealData.lead_id || '',
        seller_id: dealData.seller_id || '',
        company_id: dealData.company_id || '',
        property_id: dealData.property_id || '',
        
        // Contact data
        contact_name: dealData.contact_name || '',
        contact_email: dealData.contact_email || '',
        contact_phone: dealData.contact_phone || '',
        region: dealData.region || '',
        lookingFor: dealData.lookingFor || '',
        interestLevel: dealData.interestLevel || '',
        source: dealData.source || '',
        
        // Seller data
        seller_name: dealData.seller_name || '',
        seller_email: dealData.seller_email || '',
        seller_phone: dealData.seller_phone || '',
        
        // Assignment
        assignedTo: dealData.assignedTo || null,
        assignedAt: dealData.assignedAt || serverTimestamp(),
        createdBy: dealData.createdBy || '',
        
        // Additional fields
        source_url: dealData.source_url || '',
        expected_close_date: dealData.expected_close_date || null,
        priority: dealData.priority || DealPriority.MEDIUM,
        tags: dealData.tags || [],
        contact_data: dealData.contact_data || null,
        
        // Notes
        Notes: dealData.Notes || [],
        
        // Timestamps
        CreationDate: serverTimestamp(),
        LastUpdateDate: serverTimestamp()
      };

      // Clean undefined/null values
      Object.keys(deal).forEach(key => {
        if (deal[key] === undefined || deal[key] === null) {
          delete deal[key];
        }
      });

      const docRef = await addDoc(collection(db, 'deals'), deal);
      const dealId = docRef.id;
    
    // Log activity
    if (dealData.seller_id || dealData.createdBy) {
      const sellerId = dealData.seller_id || dealData.createdBy;
      await this.logDealActivity(
        sellerId,
        dealData.company_id,
        ActivityTypes.DEAL_CREATED,
        dealId,
        dealData,
        { 
          name: dealData.Description,
          amount: dealData.Amount,
          contactName: dealData.contact_name,
          source: dealData.Source,
        },
        { 
          status: dealData.Status || DealStatus.OPENED,
          amount: dealData.Amount,
          source: dealData.Source,
        }
      );
    }
      return {
        id: docRef.id,
        ...deal,
        CreationDate: deal.CreationDate,
        LastUpdateDate: deal.LastUpdateDate
      };
    } catch (error) {
      console.error('Error creating deal:', error);
      throw error;
    }
  }

  /**
   * Get deals for a seller
   */
  async getDealsBySeller(sellerId) {
    try {
      const q = query(
        collection(db, 'deals'),
        where('seller_id', '==', sellerId),
        orderBy('CreationDate', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const deals = [];
      
      querySnapshot.forEach((doc) => {
        deals.push(convertToDealModel(doc));
      });
      
      return deals;
    } catch (error) {
      console.error('Error getting seller deals:', error);
      throw error;
    }
  }

  /**
   * Get deals by company
   */
  async getDealsByCompany(companyId) {
    try {
      const q = query(
        collection(db, 'deals'),
        where('company_id', '==', companyId),
        orderBy('CreationDate', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const deals = [];
      
      querySnapshot.forEach((doc) => {
        deals.push(convertToDealModel(doc));
      });
      
      return deals;
    } catch (error) {
      console.error('Error getting company deals:', error);
      throw error;
    }
  }

  /**
   * Get deals by contact ID
   */
  async getDealsByContact(contactId) {
    try {
      const q = query(
        collection(db, 'deals'),
        where('contact_id', '==', contactId),
        orderBy('CreationDate', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const deals = [];
      
      querySnapshot.forEach((doc) => {
        deals.push(convertToDealModel(doc));
      });
      
      return deals;
    } catch (error) {
      console.error('Error getting deals by contact:', error);
      throw error;
    }
  }

  /**
   * Update a deal
   */
  async update(dealId, updateData) {
    try {
      const dealRef = doc(db, 'deals', dealId);
      
      // Clean undefined/null values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined || updateData[key] === null) {
          delete updateData[key];
        }
      });
      
      await updateDoc(dealRef, {
        ...updateData,
        LastUpdateDate: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating deal:', error);
      throw error;
    }
  }

  /**
   * Delete a deal
   */
  async delete(dealId) {
    try {
      await deleteDoc(doc(db, 'deals', dealId));
    } catch (error) {
      console.error('Error deleting deal:', error);
      throw error;
    }
  }

  /**
   * Get a deal by ID
   */
async getById(dealId, sellerId = null) {
  try {
    const docRef = doc(db, 'deals', dealId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const deal = convertToDealModel(docSnap);
      
      // Log view if sellerId provided
      if (sellerId) {
        await this.logDealActivity(
          sellerId,
          deal.company_id,
          ActivityTypes.DEAL_VIEWED,
          dealId,
          deal,
          { 
            name: deal.Description,
            amount: deal.Amount,
            contactName: deal.contact_name,
          },
          { 
            status: deal.Status,
            amount: deal.Amount,
          }
        );
      }
      
      return deal;
    }
    return null;
  } catch (error) {
    console.error('Error getting deal:', error);
    throw error;
  }
}

  /**
   * Add a note to a deal
   */
async addNote(dealId, noteText) {
  try {
    const dealRef = doc(db, 'deals', dealId);
    const deal = await this.getById(dealId);
    
    const newNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      note: noteText.trim(),
      CreationDate: new Date(),
      CreatedBy: null
    };

    await updateDoc(dealRef, {
      Notes: arrayUnion(newNote),
      LastUpdateDate: serverTimestamp()
    });
    
    // Log note addition
    if (deal) {
      await this.logDealActivity(
        deal.seller_id || deal.createdBy,
        deal.company_id,
        ActivityTypes.DEAL_NOTE_ADDED,
        dealId,
        deal,
        { 
          name: deal.Description,
          note: noteText.substring(0, 100) + (noteText.length > 100 ? '...' : ''),
          noteId: newNote.id,
        },
        { 
          noteLength: noteText.length,
        }
      );
    }
  } catch (error) {
    console.error('Error adding note:', error);
    throw error;
  }
}

  /**
   * Update deal status
   */
async updateStatus(dealId, newStatus) {
  try {
    const deal = await this.getById(dealId);
    if (!deal) {
      throw new Error('Deal not found');
    }

    const oldStatus = deal.Status;

    await this.update(dealId, { Status: newStatus });
    
    // Log status change
    await this.logDealActivity(
      deal.seller_id || deal.createdBy,
      deal.company_id,
      ActivityTypes.DEAL_STATUS_CHANGED,
      dealId,
      deal,
      { 
        name: deal.Description,
        amount: deal.Amount,
        previousStatus: oldStatus,
        newStatus: newStatus,
        contactName: deal.contact_name,
      },
      { 
        oldStatus: oldStatus, 
        newStatus: newStatus,
        amount: deal.Amount,
      }
    );
    
    // If won or lost, log specifically
    if (newStatus === DealStatus.WON) {
      await this.logDealActivity(
        deal.seller_id || deal.createdBy,
        deal.company_id,
        ActivityTypes.DEAL_WON,
        dealId,
        deal,
        { 
          name: deal.Description,
          amount: deal.Amount,
          contactName: deal.contact_name,
        },
        { 
          wonAt: new Date().toISOString(),
          amount: deal.Amount,
        }
      );
    } else if (newStatus === DealStatus.LOST) {
      await this.logDealActivity(
        deal.seller_id || deal.createdBy,
        deal.company_id,
        ActivityTypes.DEAL_LOST,
        dealId,
        deal,
        { 
          name: deal.Description,
          amount: deal.Amount,
          contactName: deal.contact_name,
        },
        { 
          lostAt: new Date().toISOString(),
          amount: deal.Amount,
        }
      );
    }
    
    return true;
  } catch (error) {
    console.error('Error updating deal status:', error);
    throw error;
  }
}
}

// Create and export the instance
const dealService = new DealService();

// Export both the class and the instance
export { DealService };
export default dealService;