import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  onSnapshot,
  writeBatch
} from '../../configs/FirebaseConfig';

/**
 * Base service for Firebase Firestore operations
 * Provides common CRUD operations that can be extended by entity-specific services
 */
class BaseFirebaseService {
  /**
   * @param {string} collectionPath - The Firestore collection path
   * @param {Function} converter - Function to convert Firestore data to model object
   */
  constructor(collectionPath, converter = null) {
    this.collectionPath = collectionPath;
    this.converter = converter;
    this.collectionRef = collection(db, collectionPath);
  }

  /**
   * Convert document data to model if converter exists
   * @param {Object} docData - Document data
   * @returns {Object} - Model object or original data
   * @private
   */
  _convertToModel(docData) {
    if (!docData) return null;
    if (this.converter && typeof this.converter === 'function') {
      return this.converter(docData);
    }
    return docData;
  }

  /**
   * Create a document with auto-generated ID
   * @param {Object} data - Document data
   * @returns {Promise<Object>} - Created document with ID
   */
  async create(data) {
    try {
      const timestamp = serverTimestamp();
      const dataWithTimestamps = {
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp,
        isDeleted: false
      };
      
      const docRef = await addDoc(this.collectionRef, dataWithTimestamps);
      return {
        id: docRef.id,
        ...data
      };
    } catch (error) {
      console.error(`Error creating ${this.collectionPath} document:`, error);
      throw error;
    }
  }

  /**
   * Create a document with a specific ID
   * @param {string} id - Document ID
   * @param {Object} data - Document data
   * @returns {Promise<Object>} - Created document with ID
   */
  async createWithId(id, data) {
    try {
      const timestamp = serverTimestamp();
      const dataWithTimestamps = {
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp,
        isDeleted: false
      };
      
      const docRef = doc(db, this.collectionPath, id);
      await setDoc(docRef, dataWithTimestamps);
      
      return {
        id,
        ...data
      };
    } catch (error) {
      console.error(`Error creating ${this.collectionPath} document with ID:`, error);
      throw error;
    }
  }

  /**
   * Get a document by ID
   * @param {string} id - Document ID
   * @returns {Promise<Object>} - Document data
   */
  async getById(id) {
    try {
      const docRef = doc(db, this.collectionPath, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      const data = {
        id: docSnap.id,
        ...docSnap.data()
      };
      
      return this._convertToModel(data);
    } catch (error) {
      console.error(`Error getting ${this.collectionPath} document:`, error);
      throw error;
    }
  }

  /**
   * Update a document
   * @param {string} id - Document ID
   * @param {Object} data - Document data to update
   * @returns {Promise<Object>} - Updated document
   */
  async update(id, data) {
    try {
      const docRef = doc(db, this.collectionPath, id);
      
      const updateData = {
        ...data,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(docRef, updateData);
      
      return this.getById(id);
    } catch (error) {
      console.error(`Error updating ${this.collectionPath} document:`, error);
      throw error;
    }
  }

  /**
   * Delete a document (hard delete)
   * @param {string} id - Document ID
   * @returns {Promise<boolean>} - Success status
   */
  async delete(id) {
    try {
      const docRef = doc(db, this.collectionPath, id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error(`Error deleting ${this.collectionPath} document:`, error);
      throw error;
    }
  }

  /**
   * Soft delete a document
   * @param {string} id - Document ID
   * @returns {Promise<Object>} - Updated document
   */
  async softDelete(id) {
    try {
      return this.update(id, {
        isDeleted: true,
        deletedAt: serverTimestamp()
      });
    } catch (error) {
      console.error(`Error soft deleting ${this.collectionPath} document:`, error);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted document
   * @param {string} id - Document ID
   * @returns {Promise<Object>} - Updated document
   */
  async restore(id) {
    try {
      return this.update(id, {
        isDeleted: false,
        deletedAt: null
      });
    } catch (error) {
      console.error(`Error restoring ${this.collectionPath} document:`, error);
      throw error;
    }
  }

  /**
   * Get all documents in collection (with optional filtering)
   * @param {Object} options - Query options
   * @param {Array} options.filters - Array of filter conditions [field, operator, value]
   * @param {Array} options.orderByFields - Array of order fields [field, direction]
   * @param {number} options.limitCount - Number of documents to limit
   * @param {Object} options.startAfterDoc - Document to start after (pagination)
   * @param {boolean} options.includeDeleted - Whether to include soft-deleted documents
   * @returns {Promise<Array>} - Array of documents
   */
  async getAll(options = {
    filters: [],
    orderByFields: [],
    limitCount: 0,
    startAfterDoc: null,
    includeDeleted: false
  }) {
    const {
      filters = [],
      orderByFields = [],
      limitCount = 0,
      startAfterDoc = null,
      includeDeleted = false
    } = options;
    try {
      // Start building the query
      let queryConstraints = [];
      
      // Add filters
      if (Array.isArray(filters) && filters.length > 0) {
        filters.forEach(filter => {
          if (filter.length === 3) {
            queryConstraints.push(where(filter[0], filter[1], filter[2]));
          }
        });
      }
      
      // Add isDeleted filter unless specifically including deleted
      if (!includeDeleted) {
        queryConstraints.push(where('isDeleted', '==', false));
      }
      
      // Add order by
      if (Array.isArray(orderByFields) && orderByFields.length > 0) {
        orderByFields.forEach(orderField => {
          if (Array.isArray(orderField) && orderField.length === 2) {
            queryConstraints.push(orderBy(orderField[0], orderField[1]));
          } else if (typeof orderField === 'string') {
            queryConstraints.push(orderBy(orderField, 'asc'));
          }
        });
      }
      
      // Add limit
      if (limitCount > 0) {
        queryConstraints.push(limit(limitCount));
      }
      
      // Add startAfter for pagination
      if (startAfterDoc) {
        queryConstraints.push(startAfter(startAfterDoc));
      }
      
      // Execute query
      const q = query(this.collectionRef, ...queryConstraints);
      const querySnapshot = await getDocs(q);
      
      // Convert to array of data
      const results = [];
      querySnapshot.forEach(doc => {
        const data = {
          id: doc.id,
          ...doc.data()
        };
        results.push(this._convertToModel(data));
      });
      
      return results;
    } catch (error) {
      console.error(`Error getting ${this.collectionPath} documents:`, error);
      throw error;
    }
  }

  /**
   * Get all documents by company ID
   * @param {string} companyId - Company ID
   * @param {Object} options - Other query options
   * @returns {Promise<Array>} - Array of documents
   */
  async getAllByCompany(companyId, options = {}) {
    try {
      const companyFilter = ['company_id', '==', companyId];
      const filters = options.filters ? [...options.filters, companyFilter] : [companyFilter];
      
      const queryOptions = {
        ...options,
        filters,
        startAfterDoc: options.startAfterDoc || null,
        limitCount: options.limitCount || 0,
        includeDeleted: options.includeDeleted || false,
        orderByFields: options.orderByFields || []
      };
      
      return this.getAll(queryOptions);
    } catch (error) {
      console.error(`Error getting ${this.collectionPath} documents by company:`, error);
      throw error;
    }
  }

  /**
   * Get documents with pagination
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} - Pagination result with items and pagination info
   */
  async getPaginated(options = {
    page: 1,
    pageSize: 20,
    filters: [],
    orderByFields: [['updatedAt', 'desc']],
    includeDeleted: false
  }) {
    const {
      page = 1,
      pageSize = 20,
      filters = [],
      orderByFields = [['updatedAt', 'desc']],
      includeDeleted = false
    } = options;
    try {
      // Get total count (this is not very efficient, but Firestore doesn't have a better way)
      const allConstraints = [];
      
      // Add filters
      if (Array.isArray(filters) && filters.length > 0) {
        filters.forEach(filter => {
          if (filter.length === 3) {
            allConstraints.push(where(filter[0], filter[1], filter[2]));
          }
        });
      }
      
      // Add isDeleted filter unless specifically including deleted
      if (!includeDeleted) {
        allConstraints.push(where('isDeleted', '==', false));
      }
      
      const countQuery = query(this.collectionRef, ...allConstraints);
      const countSnapshot = await getDocs(countQuery);
      const totalCount = countSnapshot.size;
      
      // Calculate pagination values
      const totalPages = Math.ceil(totalCount / pageSize);
      const currentPage = page < 1 ? 1 : page > totalPages ? totalPages : page;
      const offset = (currentPage - 1) * pageSize;
      
      // Get the items
      let items = [];
      
      if (totalCount > 0) {
        // We need to implement offset manually since Firestore doesn't support it directly
        if (offset === 0) {
          // First page, just use limit
          items = await this.getAll({
            filters,
            orderByFields,
            limitCount: pageSize,
            startAfterDoc: null,
            includeDeleted
          });
        } else {
          // For other pages, we need to use startAfter
          // Get all items up to the offset
          const queryConstraints = [...allConstraints];
          
          // Add order by
          if (Array.isArray(orderByFields) && orderByFields.length > 0) {
            orderByFields.forEach(orderField => {
              if (Array.isArray(orderField) && orderField.length === 2) {
                queryConstraints.push(orderBy(orderField[0], orderField[1]));
              } else if (typeof orderField === 'string') {
                queryConstraints.push(orderBy(orderField, 'asc'));
              }
            });
          }
          
          queryConstraints.push(limit(offset + 1));
          
          const q = query(this.collectionRef, ...queryConstraints);
          const querySnapshot = await getDocs(q);
          
          // Use the last document as the startAfter
          const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
          
          if (lastVisible) {
            items = await this.getAll({
              filters,
              orderByFields,
              limitCount: pageSize,
              startAfterDoc: lastVisible,
              includeDeleted
            });
          }
        }
      }
      
      return {
        items,
        pagination: {
          page: currentPage,
          pageSize,
          totalItems: totalCount,
          totalPages
        }
      };
    } catch (error) {
      console.error(`Error getting paginated ${this.collectionPath} documents:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to a document
   * @param {string} id - Document ID
   * @param {Function} callback - Callback function for document updates
   * @returns {Function} - Unsubscribe function
   */
  subscribeToDocument(id, callback) {
    try {
      const docRef = doc(db, this.collectionPath, id);
      
      return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = {
            id: docSnap.id,
            ...docSnap.data()
          };
          callback(this._convertToModel(data));
        } else {
          callback(null);
        }
      });
    } catch (error) {
      console.error(`Error subscribing to ${this.collectionPath} document:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to a collection query
   * @param {Object} options - Query options
   * @param {Function} callback - Callback function for collection updates
   * @returns {Function} - Unsubscribe function
   */
  subscribeToCollection({
    filters = [],
    orderByFields = [],
    limitCount = 0,
    includeDeleted = false
  } = {}, callback) {
    try {
      // Start building the query
      let queryConstraints = [];
      
      // Add filters
      if (Array.isArray(filters) && filters.length > 0) {
        filters.forEach(filter => {
          if (filter.length === 3) {
            queryConstraints.push(where(filter[0], filter[1], filter[2]));
          }
        });
      }
      
      // Add isDeleted filter unless specifically including deleted
      if (!includeDeleted) {
        queryConstraints.push(where('isDeleted', '==', false));
      }
      
      // Add order by
      if (Array.isArray(orderByFields) && orderByFields.length > 0) {
        orderByFields.forEach(orderField => {
          if (Array.isArray(orderField) && orderField.length === 2) {
            queryConstraints.push(orderBy(orderField[0], orderField[1]));
          } else if (typeof orderField === 'string') {
            queryConstraints.push(orderBy(orderField, 'asc'));
          }
        });
      }
      
      // Add limit
      if (limitCount > 0) {
        queryConstraints.push(limit(limitCount));
      }
      
      // Execute query
      const q = query(this.collectionRef, ...queryConstraints);
      
      return onSnapshot(q, (querySnapshot) => {
        const results = [];
        querySnapshot.forEach(doc => {
          const data = {
            id: doc.id,
            ...doc.data()
          };
          results.push(this._convertToModel(data));
        });
        
        callback(results);
      });
    } catch (error) {
      console.error(`Error subscribing to ${this.collectionPath} collection:`, error);
      throw error;
    }
  }

  /**
   * Batch write operations
   * @param {Array} operations - Array of operations to perform
   * @param {Object[]} operations - Array of operation objects
   * @param {string} operations[].type - Operation type ('create', 'createWithId', 'update', 'delete', 'softDelete')
   * @param {string} operations[].id - Document ID (for createWithId, update, delete, softDelete)
   * @param {Object} operations[].data - Document data (for create, createWithId, update)
   * @returns {Promise<boolean>} - Success status
   */
  async batchWrite(operations) {
    try {
      const batch = writeBatch(db);
      const timestamp = serverTimestamp();
      
      operations.forEach(operation => {
        const { type, id, data } = operation;
        
        if (type === 'create' && data) {
          const docRef = doc(collection(db, this.collectionPath));
          batch.set(docRef, {
            ...data,
            createdAt: timestamp,
            updatedAt: timestamp,
            isDeleted: false
          });
        } else if (type === 'createWithId' && id && data) {
          const docRef = doc(db, this.collectionPath, id);
          batch.set(docRef, {
            ...data,
            createdAt: timestamp,
            updatedAt: timestamp,
            isDeleted: false
          });
        } else if (type === 'update' && id && data) {
          const docRef = doc(db, this.collectionPath, id);
          batch.update(docRef, {
            ...data,
            updatedAt: timestamp
          });
        } else if (type === 'delete' && id) {
          const docRef = doc(db, this.collectionPath, id);
          batch.delete(docRef);
        } else if (type === 'softDelete' && id) {
          const docRef = doc(db, this.collectionPath, id);
          batch.update(docRef, {
            isDeleted: true,
            deletedAt: timestamp,
            updatedAt: timestamp
          });
        }
      });
      
      await batch.commit();
      return true;
    } catch (error) {
      console.error(`Error batch writing ${this.collectionPath} documents:`, error);
      throw error;
    }
  }
}

export default BaseFirebaseService;
