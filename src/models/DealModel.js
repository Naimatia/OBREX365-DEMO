// models/DealModel.js

/**
 * Deal model interface based on Firestore schema
 */
export const DealModel = {
  id: '',
  company_id: '', // Company ID for data partitioning
  seller_id: '', // ID of the seller assigned to this deal
  contact_id: '', // Reference to related contact
  lead_id: '', // Reference to related lead
  Source: '', // Source: Leads, Contacts, Freelance, Facebook, etc.
  Amount: 0, // Deal amount/value
  Status: '', // Opened, Proposal, Won, Lost
  Description: '',
  Notes: [], // Array of {id, note, CreationDate, CreatedBy} objects
  CreationDate: null, // Firebase Timestamp
  LastUpdateDate: null, // Firebase Timestamp
  property_id: '', // Reference to related property
  
  // Contact data
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  region: '',
  lookingFor: '',
  interestLevel: '',
  source: '',
  
  // Seller data
  seller_name: '',
  seller_email: '',
  seller_phone: '',
  
  // Additional fields
  assignedTo: null, // { id, name, email, phone }
  assignedAt: null, // Firebase Timestamp
  createdBy: '', // User ID who created the deal
  source_url: '', // Original source URL if applicable
  expected_close_date: null, // Expected closing date
  priority: 'medium', // low, medium, high
  tags: [], // Array of tags
  contact_data: null // Full contact data snapshot (backup)
}

/**
 * Deal Status options
 */
export const DealStatus = {
  OPENED: 'Opened',
  PROPOSAL: 'Proposal',
  WON: 'Won',
  LOST: 'Lost',
  GAIN: 'Gain', // Legacy
  LOSS: 'Loss' // Legacy
}

/**
 * Deal Status colors
 */
export const DealStatusColors = {
  [DealStatus.OPENED]: 'blue',
  [DealStatus.PROPOSAL]: 'purple',
  [DealStatus.WON]: 'gold',
  [DealStatus.LOST]: 'red',
  [DealStatus.GAIN]: 'green',
  [DealStatus.LOSS]: 'red'
}

/**
 * Deal Status labels
 */
export const DealStatusLabels = {
  [DealStatus.OPENED]: 'Opened',
  [DealStatus.PROPOSAL]: 'Proposal',
  [DealStatus.WON]: 'Won',
  [DealStatus.LOST]: 'Lost',
  [DealStatus.GAIN]: 'Gain',
  [DealStatus.LOSS]: 'Loss'
}

/**
 * Deal Source options
 */
export const DealSourceEnum = {
  LEADS: 'Leads',
  CONTACTS: 'Contacts',
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  WEBSITE: 'Website',
  LINKEDIN: 'LinkedIn',
  TIKTOK: 'TikTok',
  FREELANCE: 'Freelance'
};

/**
 * Deal Source with icons and colors
 */
export const DealSource = [
  { value: DealSourceEnum.LEADS, icon: '🧲', color: '#1890ff' },
  { value: DealSourceEnum.CONTACTS, icon: '👥', color: '#52c41a' },
  { value: DealSourceEnum.FACEBOOK, icon: '📘', color: '#1877F2' },
  { value: DealSourceEnum.INSTAGRAM, icon: '📷', color: '#E4405F' },
  { value: DealSourceEnum.WEBSITE, icon: '🌐', color: '#52c41a' },
  { value: DealSourceEnum.LINKEDIN, icon: '💼', color: '#0A66C2' },
  { value: DealSourceEnum.TIKTOK, icon: '🎵', color: '#ff0050' },
  { value: DealSourceEnum.FREELANCE, icon: '💪', color: '#fa8c16' }
];

/**
 * Deal priority options
 */
export const DealPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

export const DealPriorityColors = {
  [DealPriority.LOW]: 'blue',
  [DealPriority.MEDIUM]: 'orange',
  [DealPriority.HIGH]: 'red'
};

export const DealPriorityLabels = {
  [DealPriority.LOW]: 'Low',
  [DealPriority.MEDIUM]: 'Medium',
  [DealPriority.HIGH]: 'High'
};

/**
 * Convert Firestore document to deal model
 * @param {Object} doc - Firestore document
 * @returns {Object} - Deal model
 */
export const convertToDealModel = (doc) => {
  if (!doc) return null;
  
  const data = doc.data ? doc.data() : doc;
  
  return {
    id: doc.id || '',
    company_id: data.company_id || '',
    seller_id: data.seller_id || '',
    contact_id: data.contact_id || '',
    lead_id: data.lead_id || '',
    Source: data.Source || DealSourceEnum.CONTACTS,
    Amount: data.Amount || 0,
    Status: data.Status || DealStatus.OPENED,
    Description: data.Description || '',
    Notes: data.Notes || [],
    CreationDate: data.CreationDate || data.createdAt || null,
    LastUpdateDate: data.LastUpdateDate || data.updatedAt || null,
    property_id: data.property_id || '',
    
    // Contact data
    contact_name: data.contact_name || '',
    contact_email: data.contact_email || '',
    contact_phone: data.contact_phone || '',
    region: data.region || '',
    lookingFor: data.lookingFor || '',
    interestLevel: data.interestLevel || '',
    source: data.source || '',
    
    // Seller data
    seller_name: data.seller_name || '',
    seller_email: data.seller_email || '',
    seller_phone: data.seller_phone || '',
    
    // Additional fields
    assignedTo: data.assignedTo || null,
    assignedAt: data.assignedAt || null,
    createdBy: data.createdBy || '',
    source_url: data.source_url || '',
    expected_close_date: data.expected_close_date || null,
    priority: data.priority || DealPriority.MEDIUM,
    tags: data.tags || [],
    contact_data: data.contact_data || null,
    
    // Timestamps
    createdAt: data.createdAt || data.CreationDate || null,
    updatedAt: data.updatedAt || data.LastUpdateDate || null
  };
};

export default DealModel;