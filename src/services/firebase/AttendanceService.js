import BaseFirebaseService from './BaseFirebaseService';
import { serverTimestamp } from '../../configs/FirebaseConfig';

/**
 * Attendance data converter
 * Converts Firestore data to Attendance model
 * @param {Object} data - Raw Firestore document data
 * @returns {Object} - Formatted attendance object
 */
const convertToAttendanceModel = (data) => {
  if (!data) return null;
  
  return {
    ...data,
    // Convert Firestore timestamps to JavaScript Date objects
    date: data.date?.toDate ? data.date.toDate() : data.date,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
    // Ensure required fields have defaults
    employeeName: data.employeeName || '',
    payPerHour: data.payPerHour || 0,
    totalHoursWorked: data.totalHoursWorked || 0,
    overtimeHours: data.overtimeHours || 0,
    overtimeRate: data.overtimeRate || 1.5, // 50% overtime
    grossPay: data.grossPay || 0,
    incomeTax: data.incomeTax || 0,
    otherDeductibles: data.otherDeductibles || 0,
    netPay: data.netPay || 0,
    status: data.status || 'Present'
  };
};

/**
 * Attendance status constants
 */
export const AttendanceStatus = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LATE: 'Late',
  SICK_LEAVE: 'Sick Leave',
  VACATION: 'Vacation',
  HALF_DAY: 'Half Day'
};

/**
 * Service for managing employee attendance with Firebase
 * Extends BaseFirebaseService for common CRUD operations
 */
class AttendanceService extends BaseFirebaseService {
  /**
   * Constructor
   */
  constructor() {
    super('attendees', convertToAttendanceModel);
  }

  /**
   * Get attendance records by company ID
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of attendance records
   */
  async getAttendanceByCompany(companyId, options = {}) {
    const defaultOptions = {
      orderByFields: [['date', 'desc']],
      ...options
    };
    
    return this.getAllByCompany(companyId, defaultOptions);
  }

  /**
   * Get attendance records by employee ID
   * @param {string} companyId - Company ID
   * @param {string} employeeId - Employee ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of attendance records
   */
  async getAttendanceByEmployee(companyId, employeeId, options = {}) {
    const employeeFilter = ['employee_id', '==', employeeId];
    const filters = options.filters ? [...options.filters, employeeFilter] : [employeeFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters,
      orderByFields: [['date', 'desc']]
    });
  }

  /**
   * Get attendance records by date range
   * @param {string} companyId - Company ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of attendance records
   */
  async getAttendanceByDateRange(companyId, startDate, endDate, options = {}) {
    const dateFilters = [
      ['date', '>=', startDate],
      ['date', '<=', endDate]
    ];
    const filters = options.filters ? [...options.filters, ...dateFilters] : dateFilters;
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters,
      orderByFields: [['date', 'desc']]
    });
  }

  /**
   * Get attendance records by status
   * @param {string} companyId - Company ID
   * @param {string} status - Attendance status
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of attendance records
   */
  async getAttendanceByStatus(companyId, status, options = {}) {
    const statusFilter = ['status', '==', status];
    const filters = options.filters ? [...options.filters, statusFilter] : [statusFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters,
      orderByFields: [['date', 'desc']]
    });
  }

  /**
   * Create a new attendance record with auto-calculation
   * @param {Object} attendanceData - Attendance data
   * @returns {Promise<Object>} - Created attendance object
   */
  async createAttendanceRecord(attendanceData) {
    // Validate required fields
    if (!attendanceData.employee_id) {
      throw new Error('Employee ID is required');
    }
    if (!attendanceData.company_id) {
      throw new Error('Company ID is required');
    }
    if (!attendanceData.employeeName?.trim()) {
      throw new Error('Employee name is required');
    }

    // Calculate payroll data
    const calculatedData = this.calculatePayroll(attendanceData);

    const newRecord = {
      ...attendanceData,
      ...calculatedData,
      date: attendanceData.date || serverTimestamp(),
      status: attendanceData.status || AttendanceStatus.PRESENT,
      employeeName: attendanceData.employeeName.trim()
    };
    
    try {
      const result = await this.create(newRecord);
      console.log('Attendance record created successfully:', result.id);
      return result;
    } catch (error) {
      console.error('Error creating attendance record:', error);
      throw error;
    }
  }

  /**
   * Update an attendance record with recalculation
   * @param {string} attendanceId - Attendance ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Updated attendance object
   */
  async updateAttendanceRecord(attendanceId, updateData) {
    // Recalculate payroll if relevant fields are updated
    const calculatedData = this.calculatePayroll(updateData);
    
    const updatedData = {
      ...updateData,
      ...calculatedData
    };
    
    try {
      const result = await this.update(attendanceId, updatedData);
      console.log('Attendance record updated successfully:', attendanceId);
      return result;
    } catch (error) {
      console.error('Error updating attendance record:', error);
      throw error;
    }
  }

  /**
   * Mark attendance for an employee
   * @param {string} employeeId - Employee ID
   * @param {string} companyId - Company ID
   * @param {string} employeeName - Employee name
   * @param {string} status - Attendance status
   * @param {Object} additionalData - Additional data
   * @returns {Promise<Object>} - Created attendance object
   */
  async markAttendance(employeeId, companyId, employeeName, status, additionalData = {}) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of day

    // Check if attendance already exists for today
    const existingAttendance = await this.getAttendanceByEmployee(companyId, employeeId, {
      filters: [['date', '>=', today]]
    });

    if (existingAttendance.length > 0) {
      // Update existing record
      return this.updateAttendanceRecord(existingAttendance[0].id, {
        status,
        ...additionalData
      });
    } else {
      // Create new record
      return this.createAttendanceRecord({
        employee_id: employeeId,
        company_id: companyId,
        employeeName,
        status,
        date: serverTimestamp(),
        ...additionalData
      });
    }
  }

  /**
   * Calculate payroll data based on hours and rates
   * @param {Object} data - Input data
   * @returns {Object} - Calculated payroll data
   */
  calculatePayroll(data) {
    const {
      payPerHour = 0,
      totalHoursWorked = 0,
      overtimeHours = 0,
      overtimeRate = 1.5,
      incomeTaxRate = 0.1, // 10% default
      otherDeductibles = 0
    } = data;

    // Calculate regular hours (max 8 hours per day at regular rate)
    const regularHours = Math.min(totalHoursWorked, 8);
    const actualOvertimeHours = overtimeHours || Math.max(0, totalHoursWorked - 8);

    // Calculate pay components
    const regularPay = regularHours * payPerHour;
    const overtimePay = actualOvertimeHours * payPerHour * overtimeRate;
    const grossPay = regularPay + overtimePay;

    // Calculate deductions
    const incomeTax = grossPay * incomeTaxRate;
    const totalDeductibles = incomeTax + otherDeductibles;
    const netPay = Math.max(0, grossPay - totalDeductibles);

    return {
      regularHours,
      overtimeHours: actualOvertimeHours,
      regularPay,
      overtimePay,
      grossPay,
      incomeTax,
      totalDeductibles,
      netPay
    };
  }

  /**
   * Get monthly attendance statistics
   * @param {string} companyId - Company ID
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {Promise<Object>} - Monthly statistics
   */
  async getMonthlyStatistics(companyId, month, year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    try {
      const records = await this.getAttendanceByDateRange(companyId, startDate, endDate);
      
      const stats = {
        totalRecords: records.length,
        totalEmployees: new Set(records.map(r => r.employee_id)).size,
        totalHours: records.reduce((sum, r) => sum + (r.totalHoursWorked || 0), 0),
        totalOvertimeHours: records.reduce((sum, r) => sum + (r.overtimeHours || 0), 0),
        totalGrossPay: records.reduce((sum, r) => sum + (r.grossPay || 0), 0),
        totalNetPay: records.reduce((sum, r) => sum + (r.netPay || 0), 0),
        statusBreakdown: {}
      };

      // Calculate status breakdown
      Object.values(AttendanceStatus).forEach(status => {
        stats.statusBreakdown[status] = records.filter(r => r.status === status).length;
      });

      return stats;
    } catch (error) {
      console.error('Error fetching monthly statistics:', error);
      throw error;
    }
  }

  /**
   * Get employee attendance summary
   * @param {string} companyId - Company ID
   * @param {string} employeeId - Employee ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} - Employee summary
   */
  async getEmployeeAttendanceSummary(companyId, employeeId, startDate, endDate) {
    try {
      const records = await this.getAttendanceByEmployee(companyId, employeeId, {
        filters: [
          ['date', '>=', startDate],
          ['date', '<=', endDate]
        ]
      });

      const summary = {
        totalDays: records.length,
        totalHours: records.reduce((sum, r) => sum + (r.totalHoursWorked || 0), 0),
        totalOvertimeHours: records.reduce((sum, r) => sum + (r.overtimeHours || 0), 0),
        totalGrossPay: records.reduce((sum, r) => sum + (r.grossPay || 0), 0),
        totalNetPay: records.reduce((sum, r) => sum + (r.netPay || 0), 0),
        statusBreakdown: {}
      };

      // Calculate status breakdown
      Object.values(AttendanceStatus).forEach(status => {
        summary.statusBreakdown[status] = records.filter(r => r.status === status).length;
      });

      return summary;
    } catch (error) {
      console.error('Error fetching employee summary:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const attendanceService = new AttendanceService();
export default attendanceService;

// Also export the class for testing purposes
export { AttendanceService };
