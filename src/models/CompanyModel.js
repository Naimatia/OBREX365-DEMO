/**
 * Company model interface based on Firestore schema
 */
export const CompanyModel = {
  id: '',
  name: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
  phone: '',
  email: '',
  website: '',
  logo: '',
  industry: '',
  description: '',
  createdAt: null, // Firebase Timestamp
  updatedAt: null, // Firebase Timestamp
  ownerId: '', // ID of CEO who created the company
  active: true
}

/**
 * Convert Firestore document to company model
 * @param {Object} doc - Firestore document
 * @returns {Object} - Company model
 */
export const convertToCompanyModel = (doc) => {
  if (!doc) return null;
  
  return {
    id: doc.id || '',
    name: doc.name || '',
    address: doc.address || '',
    city: doc.city || '',
    state: doc.state || '',
    zipCode: doc.zipCode || '',
    country: doc.country || '',
    phone: doc.phone || '',
    email: doc.email || '',
    website: doc.website || '',
    logo: doc.logo || '',
    industry: doc.industry || '',
    description: doc.description || '',
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
    ownerId: doc.ownerId || '',
    active: doc.active !== undefined ? doc.active : true
  }
}

export default CompanyModel;
