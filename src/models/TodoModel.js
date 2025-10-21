/**
 * Todo model interface based on Firestore schema
 */
export const TodoModel = {
  id: '',
  title: '',
  description: '',
  dueDate: null, // Firebase Timestamp
  priority: '', // High, Medium, Low
  status: '', // Pending, In Progress, Completed, Cancelled
  relatedTo: {
    type: '', // Lead, Contact, Deal, Property
    id: '' // ID of the related entity
  },
  assignedTo: '', // ID of the user assigned to this todo
  company_id: '', // Company ID for data partitioning
  createdAt: null, // Firebase Timestamp
  updatedAt: null, // Firebase Timestamp
  createdBy: '', // User ID who created the todo
  completedAt: null, // Firebase Timestamp when completed
  completedBy: '', // User ID who completed the todo
  reminder: null, // Firebase Timestamp for reminder
  isRecurring: false,
  recurrencePattern: {
    type: '', // Daily, Weekly, Monthly, Yearly
    interval: 1, // Every X days, weeks, months, years
    endDate: null // Firebase Timestamp
  }
}

/**
 * Todo priority options
 */
export const TodoPriority = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low'
}

/**
 * Todo status options
 */
export const TodoStatus = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
}

/**
 * Todo related entity types
 */
export const TodoRelatedType = {
  LEAD: 'Lead',
  CONTACT: 'Contact',
  DEAL: 'Deal',
  PROPERTY: 'Property',
  NONE: 'None'
}

/**
 * Todo recurrence type options
 */
export const TodoRecurrenceType = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  YEARLY: 'Yearly'
}

/**
 * Convert Firestore document to todo model
 * @param {Object} doc - Firestore document
 * @returns {Object} - Todo model
 */
export const convertToTodoModel = (doc) => {
  if (!doc) return null;
  
  return {
    id: doc.id || '',
    title: doc.title || '',
    description: doc.description || '',
    dueDate: doc.dueDate || null,
    priority: doc.priority || TodoPriority.MEDIUM,
    status: doc.status || TodoStatus.PENDING,
    relatedTo: {
      type: doc.relatedTo?.type || TodoRelatedType.NONE,
      id: doc.relatedTo?.id || ''
    },
    assignedTo: doc.assignedTo || '',
    company_id: doc.company_id || '',
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
    createdBy: doc.createdBy || '',
    completedAt: doc.completedAt || null,
    completedBy: doc.completedBy || '',
    reminder: doc.reminder || null,
    isRecurring: doc.isRecurring || false,
    recurrencePattern: {
      type: doc.recurrencePattern?.type || '',
      interval: doc.recurrencePattern?.interval || 1,
      endDate: doc.recurrencePattern?.endDate || null
    }
  }
}

export default TodoModel;
