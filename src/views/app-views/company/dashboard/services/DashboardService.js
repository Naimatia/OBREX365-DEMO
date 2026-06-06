// services/dashboard/DashboardService.js
import { db, collection, getDocs, query, where, Timestamp } from 'configs/FirebaseConfig';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

class DashboardService {
  /**
   * Get date ranges for analytics
   */
  getDateRanges() {
    const now = dayjs();
    const today = now.startOf('day');
    const weekStart = now.startOf('isoWeek');
    const weekEnd = now.endOf('isoWeek');
    const monthStart = now.startOf('month');
    const monthEnd = now.endOf('month');

    return {
      today: { start: today.toDate(), end: today.endOf('day').toDate() },
      week: { start: weekStart.toDate(), end: weekEnd.toDate() },
      month: { start: monthStart.toDate(), end: monthEnd.toDate() }
    };
  }

  /**
   * Get employees list for company
   */
  async getEmployees(companyId) {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('company_id', '==', companyId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching employees:', error);
      return [];
    }
  }

  /**
   * Get attendance data for date range
   */
  async getAttendanceData(companyId, dateRange) {
    try {
      const attendanceRef = collection(db, 'attendance');
      const q = query(
        attendanceRef,
        where('company_id', '==', companyId),
        where('date', '>=', dateRange.start),
        where('date', '<=', dateRange.end)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching attendance:', error);
      return [];
    }
  }

  /**
   * Get leads data for date range
   */
  async getLeadsData(companyId, dateRange) {
    try {
      const leadsRef = collection(db, 'leads');
      const q = query(
        leadsRef,
        where('company_id', '==', companyId),
        where('CreationDate', '>=', dateRange.start),
        where('CreationDate', '<=', dateRange.end)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching leads:', error);
      return [];
    }
  }

  /**
   * Get deals data for date range
   */
  async getDealsData(companyId, dateRange) {
    try {
      const dealsRef = collection(db, 'deals');
      const q = query(
        dealsRef,
        where('company_id', '==', companyId),
        where('CreationDate', '>=', dateRange.start),
        where('CreationDate', '<=', dateRange.end)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching deals:', error);
      return [];
    }
  }

  /**
   * Get meetings data for date range
   */
  async getMeetingsData(companyId, dateRange) {
    try {
      const meetingsRef = collection(db, 'meetings');
      const q = query(
        meetingsRef,
        where('company_id', '==', companyId),
        where('DateTime', '>=', dateRange.start),
        where('DateTime', '<=', dateRange.end)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching meetings:', error);
      return [];
    }
  }

  /**
   * Get previews/viewings data (from leads or separate collection)
   */
  async getPreviewsData(companyId, dateRange) {
    // Assuming previews are stored in a 'previews' collection or as property viewings
    try {
      // This could be from a 'viewings' collection if exists
      const previewsRef = collection(db, 'viewings');
      const q = query(
        previewsRef,
        where('company_id', '==', companyId),
        where('date', '>=', dateRange.start),
        where('date', '<=', dateRange.end)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      // If no viewings collection, return empty array
      console.log('No viewings collection found');
      return [];
    }
  }

  /**
   * Get marketing spend data
   */
  async getMarketingSpend(companyId, dateRange) {
    try {
      // Assuming marketing spend is in 'marketing_spend' collection
      const spendRef = collection(db, 'marketing_spend');
      const q = query(
        spendRef,
        where('company_id', '==', companyId),
        where('date', '>=', dateRange.start),
        where('date', '<=', dateRange.end)
      );
      const snapshot = await getDocs(q);
      const spendData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return spendData.reduce((sum, item) => sum + (item.amount || 0), 0);
    } catch (error) {
      console.error('Error fetching marketing spend:', error);
      return 0;
    }
  }

  /**
   * Calculate Cost Per Lead
   */
  calculateCostPerLead(marketingSpend, totalLeads) {
    if (!totalLeads || totalLeads === 0) return 0;
    return marketingSpend / totalLeads;
  }

  /**
   * Calculate Conversion Rate
   */
  calculateConversionRate(totalLeads, totalDeals) {
    if (!totalLeads || totalLeads === 0) return 0;
    return (totalDeals / totalLeads) * 100;
  }

  /**
   * Calculate Turnover Rate
   * (Employees who left / Average total employees) * 100
   */
  calculateTurnoverRate(employeesLeft, avgTotalEmployees) {
    if (!avgTotalEmployees || avgTotalEmployees === 0) return 0;
    return (employeesLeft / avgTotalEmployees) * 100;
  }

  /**
   * Calculate Attendance Rate
   */
  calculateAttendanceRate(totalEmployees, presentDays, totalWorkingDays) {
    if (!totalEmployees || !totalWorkingDays) return 0;
    const expectedAttendance = totalEmployees * totalWorkingDays;
    if (expectedAttendance === 0) return 0;
    return (presentDays / expectedAttendance) * 100;
  }

  /**
   * Get complete dashboard data
   */
  async getDashboardData(companyId) {
    const ranges = this.getDateRanges();

    // Fetch all data in parallel
    const [
      employees,
      weeklyLeads, monthlyLeads,
      weeklyDeals, monthlyDeals,
      weeklyMeetings, monthlyMeetings,
      weeklyAttendance, monthlyAttendance,
      weeklyPreviews, monthlyPreviews,
      weeklyMarketingSpend, monthlyMarketingSpend
    ] = await Promise.all([
      this.getEmployees(companyId),
      this.getLeadsData(companyId, ranges.week),
      this.getLeadsData(companyId, ranges.month),
      this.getDealsData(companyId, ranges.week),
      this.getDealsData(companyId, ranges.month),
      this.getMeetingsData(companyId, ranges.week),
      this.getMeetingsData(companyId, ranges.month),
      this.getAttendanceData(companyId, ranges.week),
      this.getAttendanceData(companyId, ranges.month),
      this.getPreviewsData(companyId, ranges.week),
      this.getPreviewsData(companyId, ranges.month),
      this.getMarketingSpend(companyId, ranges.week),
      this.getMarketingSpend(companyId, ranges.month)
    ]);

    const totalEmployees = employees.length;
    const newEmployees = employees.filter(e => {
      const joinDate = e.CreationDate?.toDate?.() || e.createdAt?.toDate?.() || e.JoiningDate?.toDate?.();
      return joinDate && dayjs(joinDate).isAfter(ranges.month.start);
    }).length;

    // Weekly KPIs
    const weeklyTotalLeads = weeklyLeads.length;
    const weeklyTotalDeals = weeklyDeals.length;
    const weeklyTotalMeetings = weeklyMeetings.length;
    const weeklyTotalPreviews = weeklyPreviews.length;
    const weeklyCommissionValue = weeklyDeals.reduce((sum, d) => sum + (d.Amount || 0) * 0.05, 0);
    const weeklyCostPerLead = this.calculateCostPerLead(weeklyMarketingSpend, weeklyTotalLeads);
    const weeklyConversionRate = this.calculateConversionRate(weeklyTotalLeads, weeklyTotalDeals);

    // Weekly Attendance calculation
    const weeklyWorkingDays = 5; // Monday-Friday
    const weeklyPresentDays = weeklyAttendance.filter(a => a.status === 'Present' || a.status === 'present').length;
    const weeklyAttendanceRate = this.calculateAttendanceRate(totalEmployees, weeklyPresentDays, weeklyWorkingDays);

    // Monthly KPIs
    const monthlyTotalLeads = monthlyLeads.length;
    const monthlyTotalDeals = monthlyDeals.length;
    const monthlyTotalMeetings = monthlyMeetings.length;
    const monthlyTotalPreviews = monthlyPreviews.length;
    const monthlyCommissionValue = monthlyDeals.reduce((sum, d) => sum + (d.Amount || 0) * 0.05, 0);
    const monthlyCostPerLead = this.calculateCostPerLead(monthlyMarketingSpend, monthlyTotalLeads);
    const monthlyConversionRate = this.calculateConversionRate(monthlyTotalLeads, monthlyTotalDeals);

    // Monthly Attendance calculation
    const monthlyWorkingDays = 22; // Approximate working days in a month
    const monthlyPresentDays = monthlyAttendance.filter(a => a.status === 'Present' || a.status === 'present').length;
    const monthlyAttendanceRate = this.calculateAttendanceRate(totalEmployees, monthlyPresentDays, monthlyWorkingDays);

    return {
      employees: {
        total: totalEmployees,
        newThisMonth: newEmployees,
        turnoverRate: 0 // Would need historical data
      },
      attendance: {
        weekly: weeklyAttendanceRate,
        monthly: monthlyAttendanceRate
      },
      sales: {
        daily: {
          leads: weeklyTotalLeads / 7,
          meetings: weeklyTotalMeetings / 7,
          previews: weeklyTotalPreviews / 7,
          deals: weeklyTotalDeals / 7,
          commission: weeklyCommissionValue / 7,
          costPerLead: weeklyCostPerLead
        },
        weekly: {
          leads: weeklyTotalLeads,
          costPerLead: weeklyCostPerLead,
          meetings: weeklyTotalMeetings,
          previews: weeklyTotalPreviews,
          deals: weeklyTotalDeals,
          commissionValue: weeklyCommissionValue,
          conversionRate: weeklyConversionRate
        },
        monthly: {
          leads: monthlyTotalLeads,
          costPerLead: monthlyCostPerLead,
          meetings: monthlyTotalMeetings,
          previews: monthlyTotalPreviews,
          deals: monthlyTotalDeals,
          commissionValue: monthlyCommissionValue,
          conversionRate: monthlyConversionRate
        }
      },
      marketing: {
        weekly: {
          spend: weeklyMarketingSpend,
          leads: weeklyTotalLeads,
          conversionRate: weeklyConversionRate,
          costPerLead: weeklyCostPerLead
        },
        monthly: {
          spend: monthlyMarketingSpend,
          leads: monthlyTotalLeads,
          conversionRate: monthlyConversionRate,
          costPerLead: monthlyCostPerLead
        }
      },
      rawData: {
        employees,
        weeklyLeads,
        monthlyLeads,
        weeklyDeals,
        monthlyDeals,
        weeklyMeetings,
        monthlyMeetings,
        weeklyAttendance,
        monthlyAttendance
      }
    };
  }
}

export default new DashboardService();