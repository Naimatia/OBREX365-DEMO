/**
 * Lead model interface based on Firestore schema
 */
export const LeadModel = {
  id: '',
  company_id: '',
  seller_id: '',
  name: '',
  region: '',
  RedirectedFrom: '',
  CreationDate: null,
  status: '',
  phoneNumber: '',
  email: '',
  secondaryEmail: '',
  phoneNumber2: '',
  InterestLevel: '',
  Budget: 0,
  Notes: [],
  // New fields added
  lookingFor: '',
  meta_lead_id: '',
  meta_form_id: '',
  meta_form_name: '',
  meta_ad_name: '',
  meta_campaign: '',
  meta_adset: '',
  meta_platform: '',
  raw_meta_fields: {},
  sourceDetails: {},
};

/**
 * Lead status options
 */
export const LeadStatus = {
  PENDING: 'Pending',
  GAIN: 'Gain',
  LOSS: 'Loss',
  NO_RESPONSE: 'No Response',
  NOT_INTERESTED: 'Not Interested',
  JUNK_LEAD: 'Junk Lead',
};

/**
 * Lead interest level options
 */
export const LeadInterestLevel = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High'
};

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
};

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
    
    // IMPORTANT: Spread ALL data first to keep every field
    ...data,

    // Explicitly override / ensure critical fields
    company_id: data.company_id || '',
    seller_id: data.seller_id || '',
    name: data.name || '',
    region: data.region || '',
    RedirectedFrom: data.RedirectedFrom || '',
    status: data.status || LeadStatus.PENDING,
    InterestLevel: data.InterestLevel || LeadInterestLevel.MEDIUM,
    Budget: data.Budget || '',
    lookingFor: data.lookingFor || '',

    // Meta Fields (Critical for Facebook leads)
    meta_lead_id: data.meta_lead_id || '',
    meta_form_id: data.meta_form_id || '',
    meta_form_name: data.meta_form_name || '',
    meta_ad_name: data.meta_ad_name || '',
    meta_campaign: data.meta_campaign || '',
    meta_adset: data.meta_adset || '',
    meta_platform: data.meta_platform || 'fb',

    // Raw data backup
    raw_meta_fields: data.raw_meta_fields || {},
    sourceDetails: data.sourceDetails || {},

    // Timestamps
    CreationDate: data.CreationDate,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
};

export default LeadModel;