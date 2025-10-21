/**
 * Lead model interface based on Firestore schema
 */
export const LeadModel = {
  id: '',
  company_id: '', // Company ID for data partitioning
  seller_id: '', // Optional, ID of the seller assigned to this lead
  name: '',
  region: '',
  RedirectedFrom: '', // Source of lead
  CreationDate: null, // Firebase Timestamp
  status: '', // Pending, Gain, Loss
  phoneNumber: '',
  email: '',
  InterestLevel: '', // Low, Medium, High
  Budget: 0,
  Notes: [] // Array of {note, CreationDate} objects
}

/**
 * Lead status options
 */
export const LeadStatus = {
  PENDING: 'Pending',
  GAIN: 'Gain',
  LOSS: 'Loss'
}

/**
 * Lead interest level options
 */
export const LeadInterestLevel = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High'
}

/**
 * Lead redirection source options
 */
export const LeadRedirectionSource = {
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  TIKTOK: 'Tiktok',
  GOOGLE_ADS: 'GoogleAds',
  WEBSITE: 'Website',
  LINKEDIN: 'LinkedIn',
  OTHER: 'Other'
}

/**
 * Convert Firestore document to lead model
 * @param {Object} doc - Firestore document
 * @returns {Object} - Lead model
 */
export const convertToLeadModel = (doc) => {
  if (!doc) return null;
  
  const data = doc.data ? doc.data() : doc;
  
  return {
    id: doc.id || '',
    company_id: data.company_id || '',
    seller_id: data.seller_id || '',
    name: data.name || '',
    region: data.region || '',
    RedirectedFrom: data.RedirectedFrom || '',
    CreationDate: data.CreationDate || null,
    status: data.status || LeadStatus.PENDING,
    phoneNumber: data.phoneNumber || '',
    email: data.email || '',
    InterestLevel: data.InterestLevel || LeadInterestLevel.MEDIUM,
    Budget: data.Budget || 0,
    Notes: data.Notes || []
  }
}

export default LeadModel;
