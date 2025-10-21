import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  writeBatch,
  Timestamp 
} from 'firebase/firestore';
import { db } from 'configs/FirebaseConfig';

/**
 * Service for managing todolist in Firestore
 */
const TodoService = {
  /**
   * Get all todos for a company (CEO/HR view)
   * @param {string} companyId - Company ID
   * @returns {Promise<Array>} Array of todos
   */
  async getCompanyTodos(companyId) {
    try {
      const q = query(
        collection(db, 'todolist'),
        where('company_id', '==', companyId),
        orderBy('CreationDate', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const todos = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        todos.push({
          id: doc.id,
          ...data,
          // Convert Firestore timestamps to JS Date objects
          CreationDate: data.CreationDate?.toDate ? data.CreationDate.toDate() : data.CreationDate,
          DateLimit: data.DateLimit?.toDate ? data.DateLimit.toDate() : data.DateLimit,
          LastEdit: data.LastEdit?.toDate ? data.LastEdit.toDate() : data.LastEdit,
          // Ensure Notes array has proper date conversion
          Notes: data.Notes?.map(note => ({
            ...note,
            CreationDate: note.CreationDate?.toDate ? note.CreationDate.toDate() : note.CreationDate
          })) || []
        });
      });
      
      return todos;
    } catch (error) {
      console.error('Error fetching company todos:', error);
      throw error;
    }
  },

  /**
   * Get todos assigned to a specific seller
   * @param {string} sellerId - Seller ID
   * @returns {Promise<Array>} Array of todos assigned to the seller
   */
  async getSellerTodos(sellerId) {
    try {
      const q = query(
        collection(db, 'todolist'),
        where('assignee', '==', sellerId),
        orderBy('CreationDate', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const todos = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        todos.push({
          id: doc.id,
          ...data,
          // Convert Firestore timestamps to JS Date objects
          CreationDate: data.CreationDate?.toDate ? data.CreationDate.toDate() : data.CreationDate,
          DateLimit: data.DateLimit?.toDate ? data.DateLimit.toDate() : data.DateLimit,
          LastEdit: data.LastEdit?.toDate ? data.LastEdit.toDate() : data.LastEdit,
          // Ensure Notes array has proper date conversion
          Notes: data.Notes?.map(note => ({
            ...note,
            CreationDate: note.CreationDate?.toDate ? note.CreationDate.toDate() : note.CreationDate
          })) || []
        });
      });
      
      return todos;
    } catch (error) {
      console.error('Error fetching seller todos:', error);
      throw error;
    }
  },

  /**
   * Create a new todo
   * @param {Object} todoData - Todo data
   * @returns {Promise<string>} Created todo ID
   */
  async createTodo(todoData) {
    try {
      const todoToCreate = {
        ToDo: todoData.title || todoData.ToDo || '',
        Status: todoData.Status || 'ToDo',
        assignee: todoData.assignee || todoData.assigned_to || '',
        company_id: todoData.company_id || '',
        user_id: todoData.user_id || todoData.creator_id || '',
        DateLimit: todoData.DateLimit ? Timestamp.fromDate(new Date(todoData.DateLimit)) : null,
        CreationDate: serverTimestamp(),
        LastEdit: serverTimestamp(),
        Notes: todoData.Notes || []
      };

      const docRef = await addDoc(collection(db, 'todolist'), todoToCreate);
      return docRef.id;
    } catch (error) {
      console.error('Error creating todo:', error);
      throw error;
    }
  },

  /**
   * Update an existing todo
   * @param {string} todoId - Todo ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<void>}
   */
  async updateTodo(todoId, updateData) {
    try {
      const todoRef = doc(db, 'todolist', todoId);
      
      // Clean update data to prevent Firebase timestamp errors
      const cleanUpdateData = {};
      Object.keys(updateData).forEach(key => {
        const value = updateData[key];
        if (value !== undefined && value !== null) {
          // Convert Date objects to Firebase timestamps
          if (value instanceof Date) {
            cleanUpdateData[key] = Timestamp.fromDate(value);
          } else {
            cleanUpdateData[key] = value;
          }
        }
      });
      
      await updateDoc(todoRef, {
        ...cleanUpdateData,
        LastEdit: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating todo:', error);
      throw error;
    }
  },

  /**
   * Update todo status (for Kanban drag & drop)
   * @param {string} todoId - Todo ID
   * @param {string} newStatus - New status
   * @returns {Promise<void>}
   */
  async updateTodoStatus(todoId, newStatus) {
    try {
      const todoRef = doc(db, 'todolist', todoId);
      await updateDoc(todoRef, {
        Status: newStatus,
        LastEdit: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating todo status:', error);
      throw error;
    }
  },

  /**
   * Delete a todo
   * @param {string} todoId - Todo ID
   * @returns {Promise<void>}
   */
  async deleteTodo(todoId) {
    try {
      await deleteDoc(doc(db, 'todolist', todoId));
    } catch (error) {
      console.error('Error deleting todo:', error);
      throw error;
    }
  },

  /**
   * Get a single todo by ID
   * @param {string} todoId - Todo ID
   * @returns {Promise<Object|null>} Todo data or null if not found
   */
  async getTodoById(todoId) {
    try {
      const todoDoc = await getDoc(doc(db, 'todolist', todoId));
      
      if (todoDoc.exists()) {
        const data = todoDoc.data();
        return {
          id: todoDoc.id,
          ...data,
          CreationDate: data.CreationDate?.toDate ? data.CreationDate.toDate() : data.CreationDate,
          DateLimit: data.DateLimit?.toDate ? data.DateLimit.toDate() : data.DateLimit,
          LastEdit: data.LastEdit?.toDate ? data.LastEdit.toDate() : data.LastEdit,
          Notes: data.Notes?.map(note => ({
            ...note,
            CreationDate: note.CreationDate?.toDate ? note.CreationDate.toDate() : note.CreationDate
          })) || []
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching todo:', error);
      throw error;
    }
  },

  /**
   * Add a note to a todo
   * @param {string} todoId - Todo ID
   * @param {string} noteText - Note text
   * @returns {Promise<void>}
   */
  async addNote(todoId, noteText) {
    try {
      const todoRef = doc(db, 'todolist', todoId);
      const todoDoc = await getDoc(todoRef);
      
      if (todoDoc.exists()) {
        const todoData = todoDoc.data();
        const notes = todoData.Notes || [];
        
        const newNote = {
          note: noteText,
          CreationDate: new Date()
        };
        
        await updateDoc(todoRef, {
          Notes: [...notes, newNote],
          LastEdit: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  },

  /**
   * Get all company users for assignee selection (CEO/HR can assign to anyone)
   * @param {string} companyId - Company ID
   * @returns {Promise<Array>} List of company users
   */
  async getCompanyUsers(companyId) {
    try {
      const q = query(
        collection(db, 'users'),
        where('company_id', '==', companyId)
      );
      
      const querySnapshot = await getDocs(q);
      const users = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          id: doc.id,
          uid: doc.id,
          name: `${data.firstname} ${data.lastname}`,
          email: data.email,
          role: data.Role,
          firstname: data.firstname,
          lastname: data.lastname
        });
      });
      
      return users;
    } catch (error) {
      console.error('Error getting company users:', error);
      throw error;
    }
  },

  /**
   * Get all sellers for a company (for assignee selection)
   * @param {string} companyId - Company ID
   * @returns {Promise<Array>} List of sellers
   */
  async getCompanySellers(companyId) {
    try {
      const q = query(
        collection(db, 'users'),
        where('company_id', '==', companyId),
        where('Role', 'in', ['Seller', 'seller'])
      );
      
      const querySnapshot = await getDocs(q);
      const sellers = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        sellers.push({
          id: doc.id,
          uid: doc.id,
          name: `${data.firstname} ${data.lastname}`,
          email: data.email,
          role: data.Role,
          firstname: data.firstname,
          lastname: data.lastname
        });
      });
      
      return sellers;
    } catch (error) {
      console.error('Error getting sellers:', error);
      throw error;
    }
  },

  /**
   * Bulk update todos (for multi-select operations)
   * @param {Array<string>} todoIds - IDs of todos to update
   * @param {Object} updateData - Data to update
   * @returns {Promise<void>}
   */
  async bulkUpdateTodos(todoIds, updateData) {
    try {
      const batch = writeBatch(db);
      
      todoIds.forEach(todoId => {
        const todoRef = doc(db, 'todolist', todoId);
        batch.update(todoRef, {
          ...updateData,
          LastEdit: serverTimestamp()
        });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error bulk updating todos:', error);
      throw error;
    }
  }
};

export default TodoService;
