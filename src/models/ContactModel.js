// models/ContactModel.js
/**
 * Contact status enum - Matching Lead statuses for consistency
 */
export const ContactStatus = {
  ACTIVE: 'active',
  HOT: 'hot',
  COLD: 'cold',
  NEW: 'new',
  CONTACTED: 'contacted',
  INTERESTED: 'interested',
  NOT_INTERESTED: 'not_interested',
  CONVERTED: 'converted',
  PENDING: 'pending',
  DEAL: 'deal',
  LOSS: 'loss',
  NO_RESPONSE: 'no_response',
  JUNK_LEAD: 'junk_lead',
  PROPOSAL: 'proposal'
};

/**
 * Contact status labels for display
 */
export const ContactStatusLabels = {
  [ContactStatus.ACTIVE]: 'Active',
  [ContactStatus.HOT]: 'Hot',
  [ContactStatus.COLD]: 'Cold',
  [ContactStatus.NEW]: 'New',
  [ContactStatus.CONTACTED]: 'Contacted',
  [ContactStatus.INTERESTED]: 'Interested',
  [ContactStatus.NOT_INTERESTED]: 'Not Interested',
  [ContactStatus.CONVERTED]: 'Converted',
  [ContactStatus.PENDING]: 'Pending',
  [ContactStatus.DEAL]: 'Deal',
  [ContactStatus.LOSS]: 'Loss',
  [ContactStatus.NO_RESPONSE]: 'No Response',
  [ContactStatus.JUNK_LEAD]: 'Junk Lead',
};

/**
 * Contact status colors for UI
 */
export const ContactStatusColors = {
  [ContactStatus.ACTIVE]: 'green',
  [ContactStatus.HOT]: 'red',
  [ContactStatus.COLD]: 'blue',
  [ContactStatus.NEW]: 'blue',
  [ContactStatus.CONTACTED]: 'orange',
  [ContactStatus.INTERESTED]: 'green',
  [ContactStatus.NOT_INTERESTED]: 'red',
  [ContactStatus.CONVERTED]: 'purple',
  [ContactStatus.PENDING]: 'default',
  [ContactStatus.DEAL]: 'gold',
  [ContactStatus.LOSS]: 'red',
  [ContactStatus.NO_RESPONSE]: 'default',
  [ContactStatus.JUNK_LEAD]: 'purple',
};

/**
 * Contact type options
 */
export const ContactType = {
  CLIENT: 'Client',
  PROSPECT: 'Prospect',
  PARTNER: 'Partner',
  VENDOR: 'Vendor',
  LEAD: 'Lead',
  CUSTOMER: 'Customer',
  OTHER: 'Other'
};

/**
 * Contact model interface based on Firestore schema
 */
export const ContactModel = {
  id: '',
  company_id: '', // Company ID for data partitioning
  leadId: '', // Reference to the original lead
  phoneNumber: '',
  phone: '',
  mobile: '',
  email: '',
  name: '',
  firstName: '',
  lastName: '',
  region: '',
  seller_id: '', // ID of the seller assigned to this contact
  status: ContactStatus.ACTIVE, // Default status is Active
  CreationDate: null, // Firebase Timestamp
  AffectingDate: null, // Firebase Timestamp - when the contact was assigned to a seller
  LastUpdateDate: null, // Firebase Timestamp
  Notes: [], // Array of {note: string, CreationDate: Timestamp}
  tags: [], // Array of tags for categorization
  
  // Additional fields from lead
  secondaryEmail: '',
  phoneNumber2: '',
  lookingFor: '',
  Budget: null,
  InterestLevel: '',
  source: '',
  assignedTo: null,
  assignedAt: null,
  
  // Contact specific fields
  address: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
  company: '',
  position: '',
  type: ContactType.LEAD,
  website: '',
  createdBy: '',
  lastActivity: null,
  isArchived: false,
  profilePicture: '',
  birthday: null,
  
  // Social media
  socialMedia: {
    linkedin: '',
    facebook: '',
    twitter: '',
    instagram: ''
  },
  
  // Timestamps
  createdAt: null,
  updatedAt: null,
};

/**
 * Convert Firestore document to contact model
 * @param {Object} doc - Firestore document
 * @returns {Object} - Contact model
 */
export const convertToContactModel = (doc) => {
  if (!doc) return null;

  const data = doc.data ? doc.data() : doc;

  return {
    id: doc.id || '',
    
    // Spread all data first
    ...data,
    
    // Ensure all fields exist with defaults
    firstName: data.firstName || data.name?.split(' ')[0] || '',
    lastName: data.lastName || data.name?.split(' ').slice(1).join(' ') || '',
    name: data.name || '',
    phoneNumber: data.phoneNumber || data.phone || '',
    phone: data.phone || data.phoneNumber || '',
    mobile: data.mobile || '',
    email: data.email || '',
    company_id: data.company_id || '',
    leadId: data.leadId || '',
    region: data.region || '',
    seller_id: data.seller_id || '',
    status: data.status || ContactStatus.ACTIVE,
    CreationDate: data.CreationDate || data.createdAt || null,
    AffectingDate: data.AffectingDate || null,
    LastUpdateDate: data.LastUpdateDate || data.updatedAt || null,
    Notes: Array.isArray(data.Notes) ? data.Notes : [],
    tags: Array.isArray(data.tags) ? data.tags : [],
    
    // Additional fields from lead
    secondaryEmail: data.secondaryEmail || '',
    phoneNumber2: data.phoneNumber2 || '',
    lookingFor: data.lookingFor || '',
    Budget: data.Budget || null,
    InterestLevel: data.InterestLevel || '',
    source: data.source || data.RedirectedFrom || '',
    assignedTo: data.assignedTo || null,
    assignedAt: data.assignedAt || null,
    
    // Contact specific fields
    address: data.address || '',
    city: data.city || '',
    state: data.state || '',
    zipCode: data.zipCode || '',
    country: data.country || '',
    company: data.company || '',
    position: data.position || '',
    type: data.type || ContactType.LEAD,
    website: data.website || '',
    createdBy: data.createdBy || '',
    lastActivity: data.lastActivity || null,
    isArchived: data.isArchived || false,
    profilePicture: data.profilePicture || '',
    birthday: data.birthday || null,
    
    // Social media
    socialMedia: {
      linkedin: data.socialMedia?.linkedin || '',
      facebook: data.socialMedia?.facebook || '',
      twitter: data.socialMedia?.twitter || '',
      instagram: data.socialMedia?.instagram || ''
    },
    
    // Timestamps
    createdAt: data.createdAt || data.CreationDate || null,
    updatedAt: data.updatedAt || data.LastUpdateDate || null,
  };
};

export default ContactModel;