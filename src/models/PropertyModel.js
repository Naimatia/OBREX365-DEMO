/**
 * Property model interface based on Firestore schema
 */
export const PropertyModel = {
  id: '',
  title: '',
  description: '',
  type: '', // Residential, Commercial, Land, etc.
  subType: '', // Apartment, House, Office, etc.
  status: '', // For Sale, For Rent, Sold, Rented
  address: {
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    latitude: 0,
    longitude: 0
  },
  price: 0,
  currency: 'USD',
  size: 0, // Size in square feet/meters
  sizeUnit: 'sqft', // sqft, sqm
  bedrooms: 0,
  bathrooms: 0,
  yearBuilt: 0,
  features: [], // Array of features (pool, garden, etc.)
  amenities: [], // Array of amenities (gym, parking, etc.)
  images: [], // Array of image URLs
  documents: [], // Array of document URLs (floor plans, etc.)
  published: false,
  featured: false,
  ownerId: '', // Owner contact ID
  assignedTo: '', // ID of the seller assigned to this property
  company_id: '', // Company ID for data partitioning
  createdAt: null, // Firebase Timestamp
  updatedAt: null, // Firebase Timestamp
  createdBy: '', // User ID who created the property
  isArchived: false,
  tags: [] // Array of tags for categorization
}

/**
 * Property type options
 */
export const PropertyType = {
  RESIDENTIAL: 'Residential',
  COMMERCIAL: 'Commercial',
  LAND: 'Land',
  INDUSTRIAL: 'Industrial',
  OTHER: 'Other'
}

/**
 * Property subtype options
 */
export const PropertySubType = {
  // Residential
  APARTMENT: 'Apartment',
  HOUSE: 'House',
  VILLA: 'Villa',
  CONDO: 'Condo',
  TOWNHOUSE: 'Townhouse',
  
  // Commercial
  OFFICE: 'Office',
  RETAIL: 'Retail',
  HOTEL: 'Hotel',
  RESTAURANT: 'Restaurant',
  
  // Land
  RESIDENTIAL_LAND: 'Residential Land',
  COMMERCIAL_LAND: 'Commercial Land',
  AGRICULTURAL_LAND: 'Agricultural Land',
  
  // Industrial
  WAREHOUSE: 'Warehouse',
  FACTORY: 'Factory',
  
  // Other
  OTHER: 'Other'
}

/**
 * Property status options
 */
export const PropertyStatus = {
  FOR_SALE: 'For Sale',
  FOR_RENT: 'For Rent',
  SOLD: 'Sold',
  RENTED: 'Rented',
  PENDING: 'Pending',
  OFF_MARKET: 'Off Market'
}

/**
 * Convert Firestore document to property model
 * @param {Object} doc - Firestore document
 * @returns {Object} - Property model
 */
export const convertToPropertyModel = (doc) => {
  if (!doc) return null;
  
  return {
    id: doc.id || '',
    title: doc.title || '',
    description: doc.description || '',
    type: doc.type || PropertyType.RESIDENTIAL,
    subType: doc.subType || PropertySubType.HOUSE,
    status: doc.status || PropertyStatus.FOR_SALE,
    address: {
      street: doc.address?.street || '',
      city: doc.address?.city || '',
      state: doc.address?.state || '',
      zipCode: doc.address?.zipCode || '',
      country: doc.address?.country || '',
      latitude: doc.address?.latitude || 0,
      longitude: doc.address?.longitude || 0
    },
    price: doc.price || 0,
    currency: doc.currency || 'USD',
    size: doc.size || 0,
    sizeUnit: doc.sizeUnit || 'sqft',
    bedrooms: doc.bedrooms || 0,
    bathrooms: doc.bathrooms || 0,
    yearBuilt: doc.yearBuilt || 0,
    features: doc.features || [],
    amenities: doc.amenities || [],
    images: doc.images || [],
    documents: doc.documents || [],
    published: doc.published || false,
    featured: doc.featured || false,
    ownerId: doc.ownerId || '',
    assignedTo: doc.assignedTo || '',
    company_id: doc.company_id || '',
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
    createdBy: doc.createdBy || '',
    isArchived: doc.isArchived || false,
    tags: doc.tags || []
  }
}

export default PropertyModel;
