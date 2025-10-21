/**
 * Deal model interface based on Firestore schema
 */
export const DealModel = {
  id: '',
  company_id: '', // Company ID for data partitioning
  seller_id: '', // ID of the seller assigned to this deal
  contact_id: '', // Reference to related contact (nullable)
  lead_id: '', // Reference to related lead (nullable)
  Source: '', // Source: Leads, Contacts, Freelance
  Amount: 0, // Deal amount/value
  Status: '', // Opened, Gain, Loss
  Description: '',
  Notes: [], // Array of {text, createdBy, createdAt} objects
  CreationDate: null, // Firebase Timestamp
  LastUpdateDate: null, // Firebase Timestamp
  property_id: '' // Reference to related property (nullable)
}

/**
 * Deal Status options
 */
export const DealStatus = {
  OPENED: 'Opened',
  GAIN: 'Gain',
  LOSS: 'Loss'
}

/**
 * Deal Source options
 */
export const DealSource = {
  LEADS: 'Leads',
  CONTACTS: 'Contacts',
  FREELANCE: 'Freelance'
}

/**
 * Convert Firestore document to deal model
 * @param {Object} doc - Firestore document
 * @returns {Object} - Deal model
 */
export const convertToDealModel = (doc) => {
  if (!doc) return null;
  
  return {
    id: doc.id || '',
    company_id: doc.company_id || '',
    seller_id: doc.seller_id || '',
    contact_id: doc.contact_id || '',
    lead_id: doc.lead_id || '',
    Source: doc.Source || DealSource.LEADS,
    Amount: doc.Amount || 0,
    Status: doc.Status || DealStatus.OPENED,
    Description: doc.Description || '',
    Notes: doc.Notes || [],
    CreationDate: doc.CreationDate || null,
    LastUpdateDate: doc.LastUpdateDate || null,
    property_id: doc.property_id || ''
  }
}

export default DealModel;
