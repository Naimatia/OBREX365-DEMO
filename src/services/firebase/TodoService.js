import BaseFirebaseService from './BaseFirebaseService';
import { convertToTodoModel, TodoPriority, TodoStatus, TodoRelatedType, TodoRecurrenceType } from 'models/TodoModel';

/**
 * Service for managing todos with Firebase
 * Extends BaseFirebaseService for common CRUD operations
 */
class TodoService extends BaseFirebaseService {
  /**
   * Constructor
   */
  constructor() {
    super('todos', convertToTodoModel);
  }

  /**
   * Get todos by company ID
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of todos
   */
  async getTodosByCompany(companyId, options = {}) {
    return this.getAllByCompany(companyId, options);
  }

  /**
   * Get todos by status
   * @param {string} companyId - Company ID
   * @param {string} status - Todo status
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of todos
   */
  async getTodosByStatus(companyId, status, options = {}) {
    const statusFilter = ['status', '==', status];
    const filters = options.filters ? [...options.filters, statusFilter] : [statusFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
  }

  /**
   * Get todos by priority
   * @param {string} companyId - Company ID
   * @param {string} priority - Todo priority
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of todos
   */
  async getTodosByPriority(companyId, priority, options = {}) {
    const priorityFilter = ['priority', '==', priority];
    const filters = options.filters ? [...options.filters, priorityFilter] : [priorityFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
  }

  /**
   * Get todos assigned to a specific user
   * @param {string} companyId - Company ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of todos
   */
  async getTodosByAssignedUser(companyId, userId, options = {}) {
    const assignedFilter = ['assignedTo.id', '==', userId];
    const filters = options.filters ? [...options.filters, assignedFilter] : [assignedFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
  }

  /**
   * Get todos for today
   * @param {string} companyId - Company ID
   * @param {string} userId - User ID (optional)
   * @returns {Promise<Array>} - Array of todos
   */
  async getTodosForToday(companyId, userId = null) {
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const filters = [
      ['dueDate', '>=', today],
      ['dueDate', '<', tomorrow],
      ['status', '!=', TodoStatus.COMPLETED]
    ];
    
    // Add user filter if provided
    if (userId) {
      filters.push(['assignedTo.id', '==', userId]);
    }
    
    return this.getAllByCompany(companyId, {
      filters,
      orderByFields: [['priority', 'asc']]
    });
  }

  /**
   * Get todos related to a specific entity (lead, contact, deal, property)
   * @param {string} companyId - Company ID
   * @param {string} relatedType - Related entity type
   * @param {string} relatedId - Related entity ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of todos
   */
  async getTodosByRelatedEntity(companyId, relatedType, relatedId, options = {}) {
    const relatedTypeFilter = ['relatedType', '==', relatedType];
    const relatedIdFilter = ['relatedId', '==', relatedId];
    
    const filters = options.filters ? 
      [...options.filters, relatedTypeFilter, relatedIdFilter] : 
      [relatedTypeFilter, relatedIdFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
  }

  /**
   * Mark todo as completed
   * @param {string} todoId - Todo ID
   * @param {Object} completedByUser - User who completed the todo
   * @returns {Promise<Object>} - Updated todo
   */
  async markAsCompleted(todoId, completedByUser) {
    const todo = await this.getById(todoId);
    
    if (!todo) {
      throw new Error('Todo not found');
    }
    
    // Check if this is a recurring todo
    if (todo.recurrenceType && todo.recurrenceType !== TodoRecurrenceType.NONE) {
      // Create the next occurrence
      const nextTodo = this._createNextRecurrence(todo);
      await this.create(nextTodo);
    }
    
    // Update the current todo
    return this.update(todoId, {
      status: TodoStatus.COMPLETED,
      completedAt: new Date(),
      completedBy: {
        id: completedByUser.id,
        name: completedByUser.firstName + ' ' + completedByUser.lastName
      }
    });
  }

  /**
   * Create the next recurrence of a recurring todo
   * @param {Object} todo - Original todo
   * @returns {Object} - Next todo occurrence
   * @private
   */
  _createNextRecurrence(todo) {
    const nextDueDate = new Date(todo.dueDate);
    
    // Calculate next due date based on recurrence type
    switch(todo.recurrenceType) {
      case TodoRecurrenceType.DAILY:
        nextDueDate.setDate(nextDueDate.getDate() + 1);
        break;
      case TodoRecurrenceType.WEEKLY:
        nextDueDate.setDate(nextDueDate.getDate() + 7);
        break;
      case TodoRecurrenceType.BIWEEKLY:
        nextDueDate.setDate(nextDueDate.getDate() + 14);
        break;
      case TodoRecurrenceType.MONTHLY:
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        break;
      case TodoRecurrenceType.QUARTERLY:
        nextDueDate.setMonth(nextDueDate.getMonth() + 3);
        break;
      case TodoRecurrenceType.YEARLY:
        nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
        break;
      default:
        // No recurrence, should not happen
        return null;
    }
    
    // Create new todo based on the original
    const { id, status, completedAt, completedBy, ...todoData } = todo;
    
    return {
      ...todoData,
      dueDate: nextDueDate,
      status: TodoStatus.NOT_STARTED,
      completedAt: null,
      completedBy: null,
      isRecurrenceOf: id
    };
  }

  /**
   * Update todo status
   * @param {string} todoId - Todo ID
   * @param {string} status - New status
   * @returns {Promise<Object>} - Updated todo
   */
  async updateStatus(todoId, status) {
    // Validate status
    if (!Object.values(TodoStatus).includes(status)) {
      throw new Error(`Invalid todo status: ${status}`);
    }
    
    return this.update(todoId, { status });
  }

  /**
   * Update todo priority
   * @param {string} todoId - Todo ID
   * @param {string} priority - New priority
   * @returns {Promise<Object>} - Updated todo
   */
  async updatePriority(todoId, priority) {
    // Validate priority
    if (!Object.values(TodoPriority).includes(priority)) {
      throw new Error(`Invalid todo priority: ${priority}`);
    }
    
    return this.update(todoId, { priority });
  }

  /**
   * Assign todo to a user
   * @param {string} todoId - Todo ID
   * @param {Object} user - User object with id and name
   * @returns {Promise<Object>} - Updated todo
   */
  async assignTo(todoId, user) {
    return this.update(todoId, { 
      assignedTo: {
        id: user.id,
        name: user.firstName + ' ' + user.lastName
      }
    });
  }

  /**
   * Get overdue todos
   * @param {string} companyId - Company ID
   * @param {string} userId - User ID (optional)
   * @returns {Promise<Array>} - Array of todos
   */
  async getOverdueTodos(companyId, userId = null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const filters = [
      ['dueDate', '<', today],
      ['status', '!=', TodoStatus.COMPLETED]
    ];
    
    // Add user filter if provided
    if (userId) {
      filters.push(['assignedTo.id', '==', userId]);
    }
    
    return this.getAllByCompany(companyId, {
      filters,
      orderByFields: [['dueDate', 'asc']]
    });
  }

  /**
   * Get upcoming todos within date range
   * @param {string} companyId - Company ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} userId - User ID (optional)
   * @returns {Promise<Array>} - Array of todos
   */
  async getUpcomingTodos(companyId, startDate, endDate, userId = null) {
    const filters = [
      ['dueDate', '>=', startDate],
      ['dueDate', '<=', endDate],
      ['status', '!=', TodoStatus.COMPLETED]
    ];
    
    // Add user filter if provided
    if (userId) {
      filters.push(['assignedTo.id', '==', userId]);
    }
    
    return this.getAllByCompany(companyId, {
      filters,
      orderByFields: [['dueDate', 'asc']]
    });
  }

  /**
   * Get todo statistics for user or company
   * @param {string} companyId - Company ID
   * @param {string} userId - User ID (optional)
   * @returns {Promise<Object>} - Todo statistics
   */
  async getTodoStatistics(companyId, userId = null) {
    try {
      // Get all todos for the company or user
      const filters = [];
      
      if (userId) {
        filters.push(['assignedTo.id', '==', userId]);
      }
      
      const todos = await this.getAllByCompany(companyId, { filters });
      
      // Count todos by status
      const countByStatus = {};
      Object.values(TodoStatus).forEach(status => {
        countByStatus[status] = 0;
      });
      
      // Count todos by priority
      const countByPriority = {};
      Object.values(TodoPriority).forEach(priority => {
        countByPriority[priority] = 0;
      });
      
      // Process todos
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let overdueCount = 0;
      let dueTodayCount = 0;
      
      todos.forEach(todo => {
        // Count by status
        if (todo.status) {
          countByStatus[todo.status] = (countByStatus[todo.status] || 0) + 1;
        }
        
        // Count by priority
        if (todo.priority) {
          countByPriority[todo.priority] = (countByPriority[todo.priority] || 0) + 1;
        }
        
        // Check if overdue
        if (todo.dueDate && todo.status !== TodoStatus.COMPLETED) {
          const dueDate = new Date(todo.dueDate);
          
          if (dueDate < today) {
            overdueCount++;
          } else if (
            dueDate.getDate() === today.getDate() &&
            dueDate.getMonth() === today.getMonth() &&
            dueDate.getFullYear() === today.getFullYear()
          ) {
            dueTodayCount++;
          }
        }
      });
      
      return {
        total: todos.length,
        overdueCount,
        dueTodayCount,
        byStatus: countByStatus,
        byPriority: countByPriority,
        completionRate: todos.length > 0 ? 
          countByStatus[TodoStatus.COMPLETED] / todos.length : 0
      };
    } catch (error) {
      console.error('Error getting todo statistics:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const todoService = new TodoService();
export default todoService;
