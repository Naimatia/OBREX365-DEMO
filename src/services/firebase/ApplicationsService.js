import BaseFirebaseService from './BaseFirebaseService';
import { serverTimestamp } from '../../configs/FirebaseConfig';

/**
 * Application data converter
 * Converts Firestore data to Application model
 * @param {Object} data - Raw Firestore document data
 * @returns {Object} - Formatted application object
 */
const convertToApplicationModel = (data) => {
  if (!data) return null;
  
  return {
    ...data,
    // Convert Firestore timestamps to JavaScript Date objects
    ApplicantDate: data.ApplicantDate?.toDate ? data.ApplicantDate.toDate() : data.ApplicantDate,
    LastUpdate: data.LastUpdate?.toDate ? data.LastUpdate.toDate() : data.LastUpdate,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
    // Ensure required fields have defaults
    Status: data.Status || 'Pending',
    firstname: data.firstname || '',
    lastname: data.lastname || '',
    Job: data.Job || '',
    CVUrl: data.CVUrl || '',
    email: data.email || '',
    phoneNumber: data.phoneNumber || '',
    notes: data.notes || '',
    experience: data.experience || ''
  };
};

/**
 * Application status constants
 */
export const ApplicationStatus = {
  PENDING: 'Pending',
  REVIEWED: 'Reviewed',
  INTERVIEWED: 'Interviewed',
  HIRED: 'Hired',
  REJECTED: 'Rejected'
};

/**
 * Job position constants
 */
export const JobPositions = [
  'Agent',
  'Sales',
  'Executive Sales',
  'Off Plan Sales',
  'Ready to Move Sales',
  'Team Manager',
  'Sales Manager',
  'Marketing Manager',
  'Marketing Executive',
  'Admin',
  'Support',
  'Accountant',
  'HR',
  'Other'
];

/**
 * Service for managing job applications with Firebase
 * Extends BaseFirebaseService for common CRUD operations
 */
class ApplicationsService extends BaseFirebaseService {
  /**
   * Constructor
   */
  constructor() {
    super('applications', convertToApplicationModel);
  }

  /**
   * Get applications by company ID
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of applications
   */
  async getApplicationsByCompany(companyId, options = {}) {
    const defaultOptions = {
      orderByFields: [['ApplicantDate', 'desc']],
      ...options
    };
    
    return this.getAllByCompany(companyId, defaultOptions);
  }

  /**
   * Get applications by status for a company
   * @param {string} companyId - Company ID
   * @param {string} status - Application status
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of applications
   */
  async getApplicationsByStatus(companyId, status, options = {}) {
    const statusFilter = ['Status', '==', status];
    const filters = options.filters ? [...options.filters, statusFilter] : [statusFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters,
      orderByFields: [['ApplicantDate', 'desc']]
    });
  }

  /**
   * Get applications by job position for a company
   * @param {string} companyId - Company ID
   * @param {string} job - Job position
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of applications
   */
  async getApplicationsByJob(companyId, job, options = {}) {
    const jobFilter = ['Job', '==', job];
    const filters = options.filters ? [...options.filters, jobFilter] : [jobFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters,
      orderByFields: [['ApplicantDate', 'desc']]
    });
  }

  /**
   * Create a new application
   * @param {Object} applicationData - Application data
   * @returns {Promise<Object>} - Created application object
   */
  async createApplication(applicationData) {
    // Validate required fields
    if (!applicationData.firstname?.trim()) {
      throw new Error('First name is required');
    }
    if (!applicationData.lastname?.trim()) {
      throw new Error('Last name is required');
    }
    if (!applicationData.Job) {
      throw new Error('Job position is required');
    }
    if (!applicationData.company_id) {
      throw new Error('Company ID is required');
    }

    const newApplication = {
      ...applicationData,
      // Add application-specific timestamps
      ApplicantDate: applicationData.ApplicantDate || serverTimestamp(),
      LastUpdate: serverTimestamp(),
      Status: applicationData.Status || ApplicationStatus.PENDING,
      // Ensure required fields
      firstname: applicationData.firstname.trim(),
      lastname: applicationData.lastname.trim(),
      Job: applicationData.Job,
      CVUrl: applicationData.CVUrl?.trim() || '',
      email: applicationData.email?.trim() || '',
      phoneNumber: applicationData.phoneNumber?.trim() || '',
      notes: applicationData.notes?.trim() || '',
      experience: applicationData.experience?.trim() || ''
    };
    
    try {
      const result = await this.create(newApplication);
      console.log('Application created successfully:', result.id);
      return result;
    } catch (error) {
      console.error('Error creating application:', error);
      throw error;
    }
  }

  /**
   * Update an application
   * @param {string} applicationId - Application ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Updated application object
   */
  async updateApplication(applicationId, updateData) {
    const updatedData = {
      ...updateData,
      LastUpdate: serverTimestamp()
    };
    
    try {
      const result = await this.update(applicationId, updatedData);
      console.log('Application updated successfully:', applicationId);
      return result;
    } catch (error) {
      console.error('Error updating application:', error);
      throw error;
    }
  }

  /**
   * Update application status
   * @param {string} applicationId - Application ID
   * @param {string} status - New status
   * @returns {Promise<Object>} - Updated application object
   */
  async updateApplicationStatus(applicationId, status) {
    // Validate status
    if (!Object.values(ApplicationStatus).includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    try {
      const result = await this.update(applicationId, {
        Status: status,
        LastUpdate: serverTimestamp()
      });
      
      console.log('Application status updated successfully:', applicationId, status);
      return result;
    } catch (error) {
      console.error('Error updating application status:', error);
      throw error;
    }
  }

  /**
   * Delete an application (hard delete)
   * @param {string} applicationId - Application ID
   * @returns {Promise<boolean>} - Success status
   */
  async deleteApplication(applicationId) {
    try {
      const result = await this.delete(applicationId);
      console.log('Application deleted successfully:', applicationId);
      return result;
    } catch (error) {
      console.error('Error deleting application:', error);
      throw error;
    }
  }

  /**
   * Soft delete an application
   * @param {string} applicationId - Application ID
   * @returns {Promise<Object>} - Updated application object
   */
  async softDeleteApplication(applicationId) {
    try {
      const result = await this.softDelete(applicationId);
      console.log('Application soft deleted successfully:', applicationId);
      return result;
    } catch (error) {
      console.error('Error soft deleting application:', error);
      throw error;
    }
  }

  /**
   * Bulk update application statuses
   * @param {Array} applicationIds - Array of application IDs
   * @param {string} status - New status for all applications
   * @returns {Promise<boolean>} - Success status
   */
  async bulkUpdateStatus(applicationIds, status) {
    // Validate status
    if (!Object.values(ApplicationStatus).includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    const operations = applicationIds.map(id => ({
      type: 'update',
      id,
      data: {
        Status: status,
        LastUpdate: serverTimestamp()
      }
    }));
    
    try {
      const result = await this.batchWrite(operations);
      console.log(`Bulk updated ${applicationIds.length} applications to status: ${status}`);
      return result;
    } catch (error) {
      console.error('Error bulk updating application statuses:', error);
      throw error;
    }
  }

  /**
   * Get application statistics for a company
   * @param {string} companyId - Company ID
   * @returns {Promise<Object>} - Statistics object
   */
  async getApplicationStatistics(companyId) {
    try {
      const applications = await this.getApplicationsByCompany(companyId);
      
      const stats = {
        total: applications.length,
        pending: applications.filter(app => app.Status === ApplicationStatus.PENDING).length,
        reviewed: applications.filter(app => app.Status === ApplicationStatus.REVIEWED).length,
        interviewed: applications.filter(app => app.Status === ApplicationStatus.INTERVIEWED).length,
        hired: applications.filter(app => app.Status === ApplicationStatus.HIRED).length,
        rejected: applications.filter(app => app.Status === ApplicationStatus.REJECTED).length,
        // Job distribution
        jobStats: {}
      };

      // Calculate job statistics
      applications.forEach(app => {
        if (app.Job) {
          stats.jobStats[app.Job] = (stats.jobStats[app.Job] || 0) + 1;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error fetching application statistics:', error);
      throw error;
    }
  }

  /**
   * Search applications by text across multiple fields
   * @param {string} companyId - Company ID
   * @param {string} searchText - Text to search for
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of matching applications
   */
  async searchApplications(companyId, searchText, options = {}) {
    try {
      // Get all applications first (Firestore doesn't support full-text search)
      const applications = await this.getApplicationsByCompany(companyId, options);
      
      if (!searchText?.trim()) {
        return applications;
      }
      
      const searchTerm = searchText.toLowerCase().trim();
      
      return applications.filter(app => {
        return (
          app.firstname?.toLowerCase().includes(searchTerm) ||
          app.lastname?.toLowerCase().includes(searchTerm) ||
          app.email?.toLowerCase().includes(searchTerm) ||
          app.Job?.toLowerCase().includes(searchTerm) ||
          app.phoneNumber?.includes(searchTerm) ||
          app.notes?.toLowerCase().includes(searchTerm) ||
          app.experience?.toLowerCase().includes(searchTerm)
        );
      });
    } catch (error) {
      console.error('Error searching applications:', error);
      throw error;
    }
  }

  /**
   * Get applications with pagination
   * @param {string} companyId - Company ID
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} - Paginated results
   */
  async getApplicationsPaginated(companyId, options = {}) {
    const defaultOptions = {
      page: 1,
      pageSize: 20,
      orderByFields: [['ApplicantDate', 'desc']],
      ...options,
      filters: [
        ['company_id', '==', companyId],
        ...(options.filters || [])
      ]
    };
    
    return this.getPaginated(defaultOptions);
  }
}

// Create and export a singleton instance
const applicationsService = new ApplicationsService();
export default applicationsService;

// Also export the class for testing purposes
export { ApplicationsService };
