/**
 * Contact status enum
 */
export const ContactStatus = {
  PENDING: 'Pending',
  CONTACTED: 'Contacted',
  DEAL: 'Deal',
  LOSS: 'Loss'
};

/**
 * Contact model interface based on Firestore schema
 */
export const ContactModel = {
  id: '',
  company_id: '', // Company ID for data partitioning
  phoneNumber: '',
  email: '',
  name: '',
  region: '',
  seller_id: '', // ID of the seller assigned to this contact
  status: ContactStatus.PENDING, // Default status is Pending
  CreationDate: null, // Firebase Timestamp
  AffectingDate: null, // Firebase Timestamp - when the contact was assigned to a seller
  LastUpdateDate: null, // Firebase Timestamp
  Notes: [], // Array of {note: string, CreationDate: Timestamp}
  tags: [], // Array of tags for categorization
  socialMedia: {
    linkedin: '',
    facebook: '',
    twitter: '',
    instagram: ''
  }
}

/**
 * Contact type options
 */
export const ContactType = {
  CLIENT: 'Client',
  PROSPECT: 'Prospect',
  PARTNER: 'Partner',
  VENDOR: 'Vendor',
  OTHER: 'Other'
}

/**
 * Convert Firestore document to contact model
 * @param {Object} doc - Firestore document
 * @returns {Object} - Contact model
 */
export const convertToContactModel = (doc) => {
  if (!doc) return null;
  
  return {
    id: doc.id || '',
    firstName: doc.firstName || '',
    lastName: doc.lastName || '',
    email: doc.email || '',
    phone: doc.phone || '',
    mobile: doc.mobile || '',
    address: doc.address || '',
    city: doc.city || '',
    state: doc.state || '',
    zipCode: doc.zipCode || '',
    country: doc.country || '',
    company: doc.company || '',
    position: doc.position || '',
    type: doc.type || ContactType.CLIENT,
    source: doc.source || '',
    notes: doc.notes || '',
    website: doc.website || '',
    assignedTo: doc.assignedTo || '',
    company_id: doc.company_id || '',
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
    createdBy: doc.createdBy || '',
    lastActivity: doc.lastActivity || null,
    isArchived: doc.isArchived || false,
    profilePicture: doc.profilePicture || '',
    birthday: doc.birthday || null,
    tags: doc.tags || [],
    socialMedia: {
      linkedin: doc.socialMedia?.linkedin || '',
      facebook: doc.socialMedia?.facebook || '',
      twitter: doc.socialMedia?.twitter || '',
      instagram: doc.socialMedia?.instagram || ''
    }
  }
}

export default ContactModel;
