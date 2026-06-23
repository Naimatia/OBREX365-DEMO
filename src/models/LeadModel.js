// models/LeadModel.js - Updated with new status system
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
  // New fields
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

  // Assignment tracking
  assignedTo: null,
  assignedAt: null,
  assignedBy: null,

  // View tracking
  lastViewedBy: null,
  viewCount: 0,
  firstViewedAt: null,
  lastViewedAt: null,
  
  // Reveal tracking
  isRevealed: false,
  revealedAt: null,

  // Conversion tracking
  convertedContactId: null,
  convertedAt: null,

  // Timestamps
  createdAt: null,
  updatedAt: null,
};

/**
 * Lead status options - NEW SYSTEM
 */
export const LeadStatus = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  INTERESTED: 'Interested',
  NOT_INTERESTED: 'Not Interested',
  CONVERTED: 'Converted',
  JUNK_LEAD: 'Junk'
};

/**
 * Lead status colors for UI
 */
export const LeadStatusColors = {
  [LeadStatus.NEW]: 'blue',
  [LeadStatus.CONTACTED]: 'geekblue',
  [LeadStatus.INTERESTED]: 'cyan',
  [LeadStatus.NOT_INTERESTED]: 'volcano',
  [LeadStatus.CONVERTED]: 'green',
  [LeadStatus.JUNK_LEAD]: 'red',
};

/**
 * Lead status labels for display
 */
export const LeadStatusLabels = {
  [LeadStatus.NEW]: 'New',
  [LeadStatus.CONTACTED]: 'Contacted',
  [LeadStatus.INTERESTED]: 'Interested',
  [LeadStatus.NOT_INTERESTED]: 'Not Interested',
  [LeadStatus.CONVERTED]: 'Converted'
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
 * Lead interest level colors
 */
export const LeadInterestLevelColors = {
  [LeadInterestLevel.LOW]: 'orange',
  [LeadInterestLevel.MEDIUM]: 'blue',
  [LeadInterestLevel.HIGH]: 'green'
};

/**
 * Lead redirection source options
 */
export const LeadRedirectionSource = {
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
  GOOGLE_ADS: 'GoogleAds',
  WEBSITE: 'Website',
  LINKEDIN: 'LinkedIn',
  DIRECT: 'Direct',
  REFERRAL: 'Referral',
  IMPORT: 'Import',
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
    
    // Spread ALL data first to keep every field
    ...data,

    // Explicitly override / ensure critical fields
    company_id: data.company_id || '',
    seller_id: data.seller_id || '',
    name: data.name || '',
    region: data.region || '',
    RedirectedFrom: data.RedirectedFrom || '',
    status: data.status || LeadStatus.NEW,
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

    // Assignment tracking
    assignedTo: data.assignedTo || null,
    assignedAt: data.assignedAt || null,
    assignedBy: data.assignedBy || null,

    // Conversion tracking
    convertedContactId: data.convertedContactId || null,
    convertedAt: data.convertedAt || null,

    // Timestamps
    CreationDate: data.CreationDate,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
};

export default LeadModel;