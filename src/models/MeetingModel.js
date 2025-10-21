/**
 * Meeting model interface based on Firestore schema
 */
export const MeetingModel = {
  id: '',
  title: '',
  description: '',
  startTime: null, // Firebase Timestamp
  endTime: null, // Firebase Timestamp
  location: {
    type: '', // Physical, Virtual
    address: '', // Physical address or virtual meeting link
    notes: '' // Additional location notes
  },
  status: '', // Scheduled, Completed, Cancelled, Postponed
  attendees: [
    // {
    //   id: '', // User ID or Contact ID
    //   type: '', // User or Contact
    //   name: '',
    //   email: '',
    //   confirmed: false
    // }
  ],
  relatedTo: {
    type: '', // Lead, Contact, Deal, Property
    id: '' // ID of the related entity
  },
  reminder: null, // Firebase Timestamp for reminder
  notes: '',
  attachments: [], // Array of attachment URLs
  organizer: '', // User ID who organized the meeting
  company_id: '', // Company ID for data partitioning
  createdAt: null, // Firebase Timestamp
  updatedAt: null, // Firebase Timestamp
  createdBy: '', // User ID who created the meeting
  isArchived: false,
  isRecurring: false,
  recurrencePattern: {
    type: '', // Daily, Weekly, Monthly, Yearly
    interval: 1, // Every X days, weeks, months, years
    endDate: null // Firebase Timestamp
  }
}

/**
 * Meeting location type options
 */
export const MeetingLocationType = {
  PHYSICAL: 'Physical',
  VIRTUAL: 'Virtual'
}

/**
 * Meeting status options
 */
export const MeetingStatus = {
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  POSTPONED: 'Postponed',
  IN_PROGRESS: 'In Progress'
}

/**
 * Meeting attendee type options
 */
export const MeetingAttendeeType = {
  USER: 'User',
  CONTACT: 'Contact'
}

/**
 * Meeting related entity types
 */
export const MeetingRelatedType = {
  LEAD: 'Lead',
  CONTACT: 'Contact',
  DEAL: 'Deal',
  PROPERTY: 'Property',
  NONE: 'None'
}

/**
 * Meeting recurrence type options
 */
export const MeetingRecurrenceType = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  YEARLY: 'Yearly'
}

/**
 * Convert Firestore document to meeting model
 * @param {Object} doc - Firestore document
 * @returns {Object} - Meeting model
 */
export const convertToMeetingModel = (doc) => {
  if (!doc) return null;
  
  return {
    id: doc.id || '',
    title: doc.title || '',
    description: doc.description || '',
    startTime: doc.startTime || null,
    endTime: doc.endTime || null,
    location: {
      type: doc.location?.type || MeetingLocationType.VIRTUAL,
      address: doc.location?.address || '',
      notes: doc.location?.notes || ''
    },
    status: doc.status || MeetingStatus.SCHEDULED,
    attendees: doc.attendees || [],
    relatedTo: {
      type: doc.relatedTo?.type || MeetingRelatedType.NONE,
      id: doc.relatedTo?.id || ''
    },
    reminder: doc.reminder || null,
    notes: doc.notes || '',
    attachments: doc.attachments || [],
    organizer: doc.organizer || '',
    company_id: doc.company_id || '',
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
    createdBy: doc.createdBy || '',
    isArchived: doc.isArchived || false,
    isRecurring: doc.isRecurring || false,
    recurrencePattern: {
      type: doc.recurrencePattern?.type || '',
      interval: doc.recurrencePattern?.interval || 1,
      endDate: doc.recurrencePattern?.endDate || null
    }
  }
}

export default MeetingModel;
