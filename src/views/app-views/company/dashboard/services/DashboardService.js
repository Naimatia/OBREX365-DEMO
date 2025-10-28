import { db as firestore } from 'configs/FirebaseConfig';
import { collection, query, where, getDocs, getDoc, doc, orderBy, limit, Timestamp } from 'firebase/firestore';
import moment from 'moment';

class DashboardService {
  /**
   * Fetch company statistics based on date range and user's company_id
   */

/**
 * Fetch company statistics based on date range and user's company_id
 */
static async fetchCompanyStats(companyId, dateRange) {
  console.log('DashboardService.fetchCompanyStats called with:', { companyId, dateRange });
  if (!companyId) {
    console.error('No company ID provided for fetching stats');
    return null;
  }

  try {
    // Validate and set date range
    const startDate = dateRange?.[0] instanceof Date 
      ? dateRange[0] 
      : dateRange?.[0]?.toDate?.() || moment().subtract(30, 'days').toDate();

    const endDate = dateRange?.[1] instanceof Date 
      ? dateRange[1] 
      : dateRange?.[1]?.toDate?.() || moment().toDate();

    if (moment(endDate).isBefore(startDate)) {
      console.error('Invalid date range: endDate is before startDate');
      return null;
    }
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    // -----------------------------------------------------------------
    // 1. Initialise the stats object
    // -----------------------------------------------------------------
    const stats = {
      totalLeads: 0,
      totalContacts: 0,
      totalDeals: 0,
      totalProperties: 0,        // ← Only Available properties
      totalEmployees: 0,
      totalInvoices: 0,
      totalMeetings: 0,
      totalAttendances: 0,
      totalAuditLogs: 0,
      totalPayroll: 0,
      totalTodolist: 0,
      monthlyRevenue: 0,
      paidInvoiceAmount: 0,
      pendingInvoiceAmount: 0,
      leadsStatusDistribution: { Pending: 0, Gain: 0, Loss: 0 },
      dealsStatusDistribution: { Opened: 0, Gain: 0, Loss: 0 },
      topSellers: [],
      recentActivities: [],
      upcomingMeetings: [],
      revenueData: []
    };

    // -----------------------------------------------------------------
    // 2. Helper – generic query + count (with date filter)
    // -----------------------------------------------------------------
    const countCollection = async (colName, extraWhere = []) => {
      const q = query(
        collection(firestore, colName),
        where('company_id', '==', companyId),
        where('CreationDate', '>=', startTimestamp),
        where('CreationDate', '<=', endTimestamp),
        ...extraWhere,
        limit(1000)
      );
      const snap = await getDocs(q).catch(() => ({ size: 0, forEach: () => {} }));
      return snap;
    };

    // -----------------------------------------------------------------
    // 3. SPECIAL: Count Available Properties (NO DATE FILTER)
    // -----------------------------------------------------------------
    const availablePropertiesSnap = await (async () => {
      try {
        const q = query(
          collection(firestore, 'properties'),
          where('company_id', '==', companyId),
          where('Status', '==', 'Available')
        );
        const snap = await getDocs(q);
        console.log(`[INFO] Found ${snap.size} Available properties (status filter only)`);
        return snap;
      } catch (err) {
        console.error('Error fetching available properties:', err);
        return { size: 0, forEach: () => {} };
      }
    })();

    // -----------------------------------------------------------------
    // 4. Run all other queries in parallel (date-filtered)
    // -----------------------------------------------------------------
    const [
      leadsSnap,
      contactsSnap,
      dealsSnap,
      employeesSnap,
      invoicesSnap,
      meetingsSnap,
      attendancesSnap,
      auditLogsSnap,
      payrollSnap,
      todolistSnap,
      activitiesSnap,
      futureMeetingsSnap
    ] = await Promise.all([
      countCollection('leads'),
      countCollection('contacts'),
      countCollection('deals'),
      countCollection('employees'),
      countCollection('invoices'),
      countCollection('meetings'),
      countCollection('attendances'),
      countCollection('audit_logs'),
      countCollection('payroll'),
      countCollection('todolist'),
      // Recent activities
      getDocs(
        query(
          collection(firestore, 'activities'),
          where('company_id', '==', companyId),
          where('CreationDate', '>=', startTimestamp),
          where('CreationDate', '<=', endTimestamp),
          orderBy('CreationDate', 'desc'),
          limit(10)
        )
      ).catch(() => ({ size: 0, forEach: () => {}, docs: [] })),
      // Upcoming meetings
      getDocs(
        query(
          collection(firestore, 'meetings'),
          where('company_id', '==', companyId),
          where('date', '>=', Timestamp.fromDate(moment().toDate())),
          orderBy('date', 'asc'),
          limit(10)
        )
      ).catch(() => ({ size: 0, forEach: () => {}, docs: [] }))
    ]);

    // -----------------------------------------------------------------
    // 5. Assign counts
    // -----------------------------------------------------------------
    stats.totalLeads        = leadsSnap.size;
    stats.totalContacts     = contactsSnap.size;
    stats.totalDeals        = dealsSnap.size;
    stats.totalProperties   = availablePropertiesSnap.size;  // ← Available only
    stats.totalEmployees    = employeesSnap.size;
    stats.totalInvoices     = invoicesSnap.size;
    stats.totalMeetings     = meetingsSnap.size;
    stats.totalAttendances  = attendancesSnap.size;
    stats.totalAuditLogs    = auditLogsSnap.size;
    stats.totalPayroll      = payrollSnap.size;
    stats.totalTodolist     = todolistSnap.size;

    // -----------------------------------------------------------------
    // 6. Status distributions
    // -----------------------------------------------------------------
    leadsSnap.forEach(doc => {
      const leadData = doc.data();
      if (leadData.status) {
        stats.leadsStatusDistribution[leadData.status] = 
          (stats.leadsStatusDistribution[leadData.status] || 0) + 1;
      }
    });

    dealsSnap.forEach(doc => {
      const dealData = doc.data();
      if (dealData.status) {
        stats.dealsStatusDistribution[dealData.status] = 
          (stats.dealsStatusDistribution[dealData.status] || 0) + 1;
      }
    });

    // -----------------------------------------------------------------
    // 7. Invoices – revenue
    // -----------------------------------------------------------------
    invoicesSnap.forEach(doc => {
      const invoiceData = doc.data();
      if (invoiceData.amount && typeof invoiceData.amount === 'number') {
        if (invoiceData.status === 'Paid') {
          stats.paidInvoiceAmount += invoiceData.amount;
          stats.monthlyRevenue += invoiceData.amount;
        } else if (invoiceData.status === 'Pending') {
          stats.pendingInvoiceAmount += invoiceData.amount;
        }
      }
    });

    // -----------------------------------------------------------------
    // 8. Recent activities
    // -----------------------------------------------------------------
    stats.recentActivities = activitiesSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || 'Untitled Activity',
        description: data.description || '',
        date: data.CreationDate?.toDate()?.toISOString() || new Date().toISOString(),
        type: data.type || 'general'
      };
    });

    // -----------------------------------------------------------------
    // 9. Upcoming meetings
    // -----------------------------------------------------------------
    stats.upcomingMeetings = futureMeetingsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || 'Untitled Meeting',
        date: data.date?.toDate()?.toISOString() || new Date().toISOString(),
        location: data.location || 'Not specified',
        attendees: data.attendees || []
      };
    });

    // -----------------------------------------------------------------
    // 10. Top Sellers – Fixed field name: 'role' (lowercase)
    // -----------------------------------------------------------------
    try {
      const sellersQuery = query(
        collection(firestore, 'employees'),
        where('company_id', '==', companyId),
        where('Role', 'in', ['Sales', 'Seller', 'Sales Agent']), // ← Fixed
        limit(5)
      );
      const sellersSnapshot = await getDocs(sellersQuery);

      const sellerDealsPromises = sellersSnapshot.docs.map(async (doc) => {
        const sellerData = doc.data();
        const sellerDealsQuery = query(
          collection(firestore, 'deals'),
          where('company_id', '==', companyId),
          where('assigned_to', '==', doc.id),
          where('CreationDate', '>=', startTimestamp),
          where('CreationDate', '<=', endTimestamp),
          where('status', '==', 'Gain')
        );
        const sellerDealsSnapshot = await getDocs(sellerDealsQuery);
        let totalAmount = 0;
        sellerDealsSnapshot.forEach(dealDoc => {
          const dealData = dealDoc.data();
          if (dealData.Amount && typeof dealData.Amount === 'number') {
            totalAmount += dealData.Amount;
          }
        });
        return {
          name: `${sellerData.firstName || ''} ${sellerData.lastName || ''}`.trim() || sellerData.name || 'Unknown',
          profilePic: sellerData.profilePic || null,
          deals: sellerDealsSnapshot.size,
          amount: totalAmount,
          status: sellerData.status || 'Active',
          growth: 0
        };
      });

      stats.topSellers = await Promise.all(sellerDealsPromises);
      stats.topSellers.sort((a, b) => b.amount - a.amount);
    } catch (error) {
      console.error('Error fetching top sellers:', error);
      stats.topSellers = [];
    }

    // -----------------------------------------------------------------
    // 11. Revenue chart data
    // -----------------------------------------------------------------
    try {
      const durationDays = moment(endDate).diff(moment(startDate), 'days');
      const groupBy = durationDays > 90 ? 'month' : 'day';
      const revenueMap = new Map();

      invoicesSnap.forEach(doc => {
        const invoiceData = doc.data();
        if (invoiceData.status === 'Paid' && invoiceData.amount && typeof invoiceData.amount === 'number') {
          const date = invoiceData.CreationDate?.toDate();
          if (date) {
            const key = groupBy === 'month'
              ? moment(date).format('MMM YYYY')
              : moment(date).format('YYYY-MM-DD');
            revenueMap.set(key, (revenueMap.get(key) || 0) + invoiceData.amount);
          }
        }
      });

      stats.revenueData = Array.from(revenueMap.entries())
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => moment(a.date, groupBy === 'month' ? 'MMM YYYY' : 'YYYY-MM-DD')
          .valueOf() - moment(b.date, groupBy === 'month' ? 'MMM YYYY' : 'YYYY-MM-DD').valueOf());
    } catch (error) {
      console.error('Error processing revenue data:', error);
      stats.revenueData = [];
    }

    return stats;

  } catch (error) {
    console.error('Error fetching company stats:', error);
    return null;
  }
}
  
  /**
   * Fetch performance data for comparison (previous period)
   */
  static async fetchComparisonStats(companyId, currentDateRange) {
    if (!companyId || !currentDateRange || !currentDateRange[0] || !currentDateRange[1]) {
      return null;
    }
    
   const currentStart = currentDateRange[0] instanceof Date 
  ? currentDateRange[0] 
  : currentDateRange[0]?.toDate();

const currentEnd = currentDateRange[1] instanceof Date 
  ? currentDateRange[1] 
  : currentDateRange[1]?.toDate();
    // Calculate the previous period with the same duration
    const duration = moment(currentEnd).diff(moment(currentStart), 'days');
    const previousStart = moment(currentStart).subtract(duration, 'days').toDate();
    const previousEnd = moment(currentStart).subtract(1, 'days').toDate();
    
    // Convert to Firestore timestamps
    const prevStartTimestamp = Timestamp.fromDate(previousStart);
    const prevEndTimestamp = Timestamp.fromDate(previousEnd);
    
    try {
      // Initialize comparison stats
      const comparison = {
        leads: 0,
        contacts: 0,
        deals: 0,
        properties: 0,
        revenue: 0
      };
      
      // Fetch previous leads count
      const leadsQuery = query(
        collection(firestore, 'leads'),
        where('company_id', '==', companyId),
        where('CreationDate', '>=', prevStartTimestamp),
        where('CreationDate', '<=', prevEndTimestamp)
      );
      const leadsSnapshot = await getDocs(leadsQuery);
      comparison.leads = leadsSnapshot.size;
      
      // Fetch previous contacts count
      const contactsQuery = query(
        collection(firestore, 'contacts'),
        where('company_id', '==', companyId),
        where('CreationDate', '>=', prevStartTimestamp),
        where('CreationDate', '<=', prevEndTimestamp)
      );
      const contactsSnapshot = await getDocs(contactsQuery);
      comparison.contacts = contactsSnapshot.size;
      
      // Fetch previous deals count and revenue
      const dealsQuery = query(
        collection(firestore, 'deals'),
        where('company_id', '==', companyId),
        where('CreationDate', '>=', prevStartTimestamp),
        where('CreationDate', '<=', prevEndTimestamp)
      );
      const dealsSnapshot = await getDocs(dealsQuery);
      comparison.deals = dealsSnapshot.size;
      
      // Calculate previous revenue
      dealsSnapshot.forEach(doc => {
        const dealData = doc.data();
        if (dealData.Amount) {
          comparison.revenue += dealData.Amount;
        }
      });
      
      // Fetch previous properties count
      const propertiesQuery = query(
        collection(firestore, 'properties'),
        where('company_id', '==', companyId),
        where('CreationDate', '>=', prevStartTimestamp),
        where('CreationDate', '<=', prevEndTimestamp)
      );
      const propertiesSnapshot = await getDocs(propertiesQuery);
      comparison.properties = propertiesSnapshot.size;
      
      return comparison;
    } catch (error) {
      console.error('Error fetching comparison stats:', error);
      return null;
    }
  }
  
  /**
   * Calculate percentage change between current and previous periods
   */
  static calculateComparisons(currentStats, previousStats) {
    if (!currentStats || !previousStats) {
      return {};
    }
    
    const getPercentChange = (current, previous) => {
      if (previous === 0) {
        return current > 0 ? 100 : 0;
      }
      return ((current - previous) / previous * 100).toFixed(1);
    };
    
    return {
      leadsComparison: Number(getPercentChange(currentStats.totalLeads, previousStats.leads)),
      contactsComparison: Number(getPercentChange(currentStats.totalContacts, previousStats.contacts)),
      dealsComparison: Number(getPercentChange(currentStats.totalDeals, previousStats.deals)),
      propertiesComparison: Number(getPercentChange(currentStats.totalProperties, previousStats.properties)),
      revenueComparison: Number(getPercentChange(
        currentStats.paidInvoiceAmount + currentStats.pendingInvoiceAmount, 
        previousStats.revenue
      )),
    };
  }

  /**
   * Fetch top sellers with their performance metrics
   */
  static async fetchTopSellers(companyId, dateRange) {
    try {
      const stats = await this.fetchCompanyStats(companyId, dateRange);
      return stats?.topSellers || [];
    } catch (error) {
      console.error('Error fetching top sellers:', error);
      return [];
    }
  }
  
  /**
   * Fetch recent activity records
   */
  static async fetchRecentActivity(companyId, dateRange) {
    try {
      const stats = await this.fetchCompanyStats(companyId, dateRange);
      return stats?.recentActivities || [];
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  }
  
  /**
   * Fetch upcoming meetings
   */
  static async fetchUpcomingMeetings(companyId) {
    try {
      const stats = await this.fetchCompanyStats(companyId);
      return stats?.upcomingMeetings || [];
    } catch (error) {
      console.error('Error fetching upcoming meetings:', error);
      return [];
    }
  }
  
  /**
   * Fetch revenue data for chart visualization
   */
  static async fetchRevenueData(companyId, dateRange) {
    try {
      const stats = await this.fetchCompanyStats(companyId, dateRange);
      
      if (!stats || !stats.revenueData || stats.revenueData.length === 0) {
        // Return default monthly data when no real data is available
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();
        
        // Create last 6 months for display
        const categories = [];
        for (let i = 5; i >= 0; i--) {
          const monthIndex = (currentMonth - i + 12) % 12; // Handle wrapping around to previous year
          categories.push(months[monthIndex]);
        }
        
        return {
          series: [{
            name: 'Revenue',
            data: [0, 0, 0, 0, 0, 0] // Default zero values
          }],
          categories: categories
        };
      }
      
      // Process revenue data for chart format
      const sortedData = [...stats.revenueData].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateA - dateB;
      });
      
      return {
        series: [{
          name: 'Revenue',
          data: sortedData.map(item => item.value)
        }],
        categories: sortedData.map(item => item.date)
      };
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      // Return default data on error
      return {
        series: [{
          name: 'Revenue',
          data: [0, 0, 0, 0, 0, 0]
        }],
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
      };
    }
  }
  
  /**
   * Fetch leads status distribution for pie chart
   */
  static async fetchLeadsStatusDistribution(companyId, dateRange) {
    try {
      const stats = await this.fetchCompanyStats(companyId, dateRange);
      
      if (!stats || !stats.leadsStatusDistribution) {
        return [
          { name: 'Pending', value: 0, color: this.getStatusColor('Pending') },
          { name: 'Gain', value: 0, color: this.getStatusColor('Gain') },
          { name: 'Loss', value: 0, color: this.getStatusColor('Loss') }
        ];
      }
      
      // Calculate total for percentage calculation
      const total = Object.values(stats.leadsStatusDistribution).reduce((sum, count) => sum + count, 0);
      
      // Map status distribution to chart format with percentage calculation
      return Object.entries(stats.leadsStatusDistribution).map(([status, count]) => ({
        name: status,
        value: total > 0 ? Math.round((count / total) * 100) : 0,
        color: this.getStatusColor(status)
      }));
    } catch (error) {
      console.error('Error fetching leads status distribution:', error);
      return [
        { name: 'Pending', value: 0, color: this.getStatusColor('Pending') },
        { name: 'Gain', value: 0, color: this.getStatusColor('Gain') },
        { name: 'Loss', value: 0, color: this.getStatusColor('Loss') }
      ];
    }
  }
  
  /**
   * Fetch deals status distribution for pie chart
   */
  static async fetchDealsStatusDistribution(companyId, dateRange) {
    try {
      const stats = await this.fetchCompanyStats(companyId, dateRange);
      
      if (!stats || !stats.dealsStatusDistribution) {
        return [
          { name: 'Opened', value: 0, color: this.getStatusColor('Opened') },
          { name: 'Gain', value: 0, color: this.getStatusColor('Gain') },
          { name: 'Loss', value: 0, color: this.getStatusColor('Loss') }
        ];
      }
      
      // Calculate total for percentage calculation
      const total = Object.values(stats.dealsStatusDistribution).reduce((sum, count) => sum + count, 0);
      
      // Map status distribution to chart format with percentage calculation
      return Object.entries(stats.dealsStatusDistribution).map(([status, count]) => ({
        name: status,
        value: total > 0 ? Math.round((count / total) * 100) : 0,
        color: this.getStatusColor(status)
      }));
    } catch (error) {
      console.error('Error fetching deals status distribution:', error);
      return [
        { name: 'Opened', value: 0, color: this.getStatusColor('Opened') },
        { name: 'Gain', value: 0, color: this.getStatusColor('Gain') },
        { name: 'Loss', value: 0, color: this.getStatusColor('Loss') }
      ];
    }
  }
  
  /**
   * Fetch employees role distribution for donut chart
   */
  static async fetchEmployeesRoleDistribution(companyId) {
    try {
      // Default roles if no data is available
      const defaultRoles = {
        'Sales': 0,
        'Marketing': 0,
        'Support': 0,
        'Management': 0,
        'Admin': 0
      };

      // Fetch all employees
      const employeesQuery = query(
        collection(firestore, 'employees'),
        where('company_id', '==', companyId)
      );
      const employeesSnapshot = await getDocs(employeesQuery);
      
      if (employeesSnapshot.empty) {
        return {
          series: [1, 1, 1], // Default non-zero values to show something in chart
          labels: ['Sales', 'Marketing', 'Support']
        };
      }
      
      // Collect role data
      const roleCount = {...defaultRoles};
      employeesSnapshot.forEach(doc => {
        const employeeData = doc.data();
        const role = employeeData.role || 'Other';
        
        if (!roleCount[role]) {
          roleCount[role] = 0;
        }
        roleCount[role]++;
      });
      
      // Filter out roles with zero count
      const filteredRoles = Object.entries(roleCount)
        .filter(([_, count]) => count > 0)
        .reduce((obj, [role, count]) => {
          obj[role] = count;
          return obj;
        }, {});
      
      // Return in format compatible with charts
      return {
        series: Object.values(filteredRoles),
        labels: Object.keys(filteredRoles)
      };
    } catch (error) {
      console.error('Error fetching employees role distribution:', error);
      // Return default data to prevent UI errors
      return {
        series: [1, 1, 1],
        labels: ['Sales', 'Marketing', 'Support']
      };
    }
  }
  
  /**
   * Get color based on status for consistent UI
   */
  static getStatusColor(status) {
    const statusColors = {
      // Lead statuses
      'Pending': '#faad14',
      'Gain': '#52c41a',
      'Loss': '#f5222d',
      
      // Deal statuses
      'Opened': '#1890ff',
      
      // Property statuses
      'Sold': '#52c41a',
      
      // Default
      'default': '#8c8c8c'
    };
    
    return statusColors[status] || statusColors.default;
  }
}

export default DashboardService;
