import { db as firestore } from 'configs/FirebaseConfig';
import { collection, query, where, getDocs, getDoc, doc, Timestamp } from 'firebase/firestore';
import moment from 'moment';

class DashboardService {
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
      const startDate = dateRange?.[0]?.toDate() || moment().subtract(30, 'days').toDate();
      const endDate = dateRange?.[1]?.toDate() || moment().toDate();
      
      // Convert dates to Firestore Timestamp
      const startTimestamp = Timestamp.fromDate(startDate);
      const endTimestamp = Timestamp.fromDate(endDate);
      
      // Initialize stats object
      const stats = {
        totalLeads: 0,
        totalContacts: 0,
        totalDeals: 0,
        totalProperties: 0,
        totalEmployees: 0,
        totalInvoices: 0,
        totalMeetings: 0,
        pendingInvoiceAmount: 0,
        paidInvoiceAmount: 0,
        revenueData: [],
        leadsStatusDistribution: { Pending: 0, Gain: 0, Loss: 0 },
        dealsStatusDistribution: { Opened: 0, Gain: 0, Loss: 0 },
        propertiesStatusDistribution: { Pending: 0, Sold: 0 },
        topSellers: [],
        recentActivities: [],
        upcomingMeetings: []
      };

      // Fetch leads
      const leadsQuery = query(
        collection(firestore, 'leads'),
        where('company_id', '==', companyId),
        where('CreationDate', '>=', startTimestamp),
        where('CreationDate', '<=', endTimestamp)
      );
      const leadsSnapshot = await getDocs(leadsQuery);
      stats.totalLeads = leadsSnapshot.size;
      
      // Process leads for status distribution
      leadsSnapshot.forEach(doc => {
        const leadData = doc.data();
        if (leadData.status && stats.leadsStatusDistribution.hasOwnProperty(leadData.status)) {
          stats.leadsStatusDistribution[leadData.status]++;
        }
      });

      // Fetch contacts
      const contactsQuery = query(
        collection(firestore, 'contacts'),
        where('company_id', '==', companyId),
        where('CreationDate', '>=', startTimestamp),
        where('CreationDate', '<=', endTimestamp)
      );
      const contactsSnapshot = await getDocs(contactsQuery);
      stats.totalContacts = contactsSnapshot.size;

      // Fetch deals
      const dealsQuery = query(
        collection(firestore, 'deals'),
        where('company_id', '==', companyId),
        where('CreationDate', '>=', startTimestamp),
        where('CreationDate', '<=', endTimestamp)
      );
      const dealsSnapshot = await getDocs(dealsQuery);
      stats.totalDeals = dealsSnapshot.size;
      
      // Process deals for status distribution and revenue data
      const sellerDeals = {};
      dealsSnapshot.forEach(doc => {
        const dealData = doc.data();
        if (dealData.Status && stats.dealsStatusDistribution.hasOwnProperty(dealData.Status)) {
          stats.dealsStatusDistribution[dealData.Status]++;
        }
        
        // Process for revenue data by date
        if (dealData.CreationDate && dealData.Amount) {
          const date = dealData.CreationDate.toDate();
          const dateString = moment(date).format('YYYY-MM-DD');
          const existingEntry = stats.revenueData.find(item => item.date === dateString);
          
          if (existingEntry) {
            existingEntry.value += dealData.Amount;
          } else {
            stats.revenueData.push({
              date: dateString,
              value: dealData.Amount,
              category: 'Revenue'
            });
          }
        }
        
        // Aggregate deals by seller
        if (dealData.seller_id) {
          if (!sellerDeals[dealData.seller_id]) {
            sellerDeals[dealData.seller_id] = {
              totalDeals: 0,
              totalAmount: 0,
              sellerId: dealData.seller_id
            };
          }
          sellerDeals[dealData.seller_id].totalDeals++;
          sellerDeals[dealData.seller_id].totalAmount += dealData.Amount || 0;
        }
      });

      // Fetch properties
      const propertiesQuery = query(
        collection(firestore, 'properties'),
        where('company_id', '==', companyId),
        where('CreationDate', '>=', startTimestamp),
        where('CreationDate', '<=', endTimestamp)
      );
      const propertiesSnapshot = await getDocs(propertiesQuery);
      stats.totalProperties = propertiesSnapshot.size;
      
      // Process properties for status distribution
      propertiesSnapshot.forEach(doc => {
        const propertyData = doc.data();
        if (propertyData.Status && stats.propertiesStatusDistribution.hasOwnProperty(propertyData.Status)) {
          stats.propertiesStatusDistribution[propertyData.Status]++;
        }
      });

      // Fetch employees
      const employeesQuery = query(
        collection(firestore, 'employees'),
        where('company_id', '==', companyId)
      );
      const employeesSnapshot = await getDocs(employeesQuery);
      stats.totalEmployees = employeesSnapshot.size;

      // Fetch invoices
      const invoicesQuery = query(
        collection(firestore, 'invoices'),
        where('company_id', '==', companyId),
        where('CreationDate', '>=', startTimestamp),
        where('CreationDate', '<=', endTimestamp)
      );
      const invoicesSnapshot = await getDocs(invoicesQuery);
      stats.totalInvoices = invoicesSnapshot.size;
      
      // Process invoices for amounts
      invoicesSnapshot.forEach(doc => {
        const invoiceData = doc.data();
        if (invoiceData.amount) {
          if (invoiceData.Status === 'Paid') {
            stats.paidInvoiceAmount += invoiceData.amount;
          } else if (invoiceData.Status === 'Pending') {
            stats.pendingInvoiceAmount += invoiceData.amount;
          }
        }
      });

      // Fetch meetings
      const meetingsQuery = query(
        collection(firestore, 'meetings'),
        where('company_id', '==', companyId),
        where('DateTime', '>=', startTimestamp)
      );
      const meetingsSnapshot = await getDocs(meetingsQuery);
      stats.totalMeetings = meetingsSnapshot.size;
      
      // Get upcoming meetings (future dates only)
      const now = new Date();
      const upcomingMeetings = [];
      meetingsSnapshot.forEach(doc => {
        const meetingData = doc.data();
        const meetingWithId = { id: doc.id, ...meetingData };
        if (meetingData.DateTime && meetingData.DateTime.toDate() > now) {
          upcomingMeetings.push(meetingWithId);
        }
      });
      
      // Sort meetings by date and limit to 5
      stats.upcomingMeetings = upcomingMeetings
        .sort((a, b) => a.DateTime.toDate() - b.DateTime.toDate())
        .slice(0, 5);

      // Fetch user details to populate seller names
      const sellerIds = Object.keys(sellerDeals);
      const sellerPromises = sellerIds.map(sellerId => getDoc(doc(firestore, 'users', sellerId)));
      const sellerSnapshots = await Promise.all(sellerPromises);
      
      // Map seller data with user details
      stats.topSellers = sellerIds.map((sellerId, index) => {
        const userData = sellerSnapshots[index].exists() ? sellerSnapshots[index].data() : null;
        return {
          id: sellerId,
          name: userData ? `${userData.firstname} ${userData.lastname}` : 'Unknown User',
          pictureUrl: userData?.pictureUrl || null,
          deals: sellerDeals[sellerId].totalDeals,
          amount: sellerDeals[sellerId].totalAmount
        };
      }).sort((a, b) => b.amount - a.amount).slice(0, 5); // Sort by amount and limit to top 5

      // Fetch recent history/activities
      const historyQuery = query(
        collection(firestore, 'history'),
        where('company_id', '==', companyId),
        where('DateTime', '>=', startTimestamp),
        where('DateTime', '<=', endTimestamp)
      );
      const historySnapshot = await getDocs(historyQuery);
      
      const activities = [];
      historySnapshot.forEach(doc => {
        activities.push({
          id: doc.id,
          ...doc.data(),
          type: 'activity'
        });
      });
      
      // Sort activities by datetime and limit to 10
      stats.recentActivities = activities
        .sort((a, b) => b.DateTime.toDate() - a.DateTime.toDate())
        .slice(0, 10);

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
    
    const currentStart = currentDateRange[0].toDate();
    const currentEnd = currentDateRange[1].toDate();
    
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
