/**
 * History/Activity Log model interface based on Firestore schema
 * Used to track all activities in the system
 */
export const HistoryModel = {
  id: '',
  action: '', // Created, Updated, Deleted, Contacted, etc.
  entityType: '', // Lead, Contact, Deal, Property, etc.
  entityId: '', // ID of the related entity
  description: '', // Human-readable description of the activity
  details: {}, // Additional details specific to the activity type
  performedBy: '', // User ID who performed the action
  company_id: '', // Company ID for data partitioning
  timestamp: null, // Firebase Timestamp
  isSystem: false // Whether this was system-generated or user action
}

/**
 * History action types
 */
export const HistoryAction = {
  CREATED: 'Created',
  UPDATED: 'Updated',
  DELETED: 'Deleted',
  ARCHIVED: 'Archived',
  RESTORED: 'Restored',
  CONTACTED: 'Contacted',
  ASSIGNED: 'Assigned',
  STATUS_CHANGED: 'Status Changed',
  COMMENT_ADDED: 'Comment Added',
  FILE_UPLOADED: 'File Uploaded',
  EMAIL_SENT: 'Email Sent',
  MEETING_SCHEDULED: 'Meeting Scheduled',
  INVOICE_GENERATED: 'Invoice Generated',
  PAYMENT_RECEIVED: 'Payment Received',
  LOGIN: 'Login',
  LOGOUT: 'Logout'
}

/**
 * History entity types
 */
export const HistoryEntityType = {
  LEAD: 'Lead',
  CONTACT: 'Contact',
  DEAL: 'Deal',
  PROPERTY: 'Property',
  INVOICE: 'Invoice',
  TODO: 'Todo',
  MEETING: 'Meeting',
  USER: 'User',
  COMPANY: 'Company',
  SYSTEM: 'System'
}

/**
 * Convert Firestore document to history model
 * @param {Object} doc - Firestore document
 * @returns {Object} - History model
 */
export const convertToHistoryModel = (doc) => {
  if (!doc) return null;
  
  return {
    id: doc.id || '',
    action: doc.action || '',
    entityType: doc.entityType || '',
    entityId: doc.entityId || '',
    description: doc.description || '',
    details: doc.details || {},
    performedBy: doc.performedBy || '',
    company_id: doc.company_id || '',
    timestamp: doc.timestamp || null,
    isSystem: doc.isSystem || false
  }
}

export default HistoryModel;
