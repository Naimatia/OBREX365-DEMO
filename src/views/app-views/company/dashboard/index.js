import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Row, Col, Card, Avatar, Select, Tag, Badge, List, Statistic, Alert, Spin, Typography, Space, Empty } from 'antd';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import RegiondataWidget from 'components/shared-components/RegiondataWidget';
import DonutChartWidget from 'components/shared-components/DonutChartWidget'
import Flex from 'components/shared-components/Flex'
import ChartWidget from 'components/shared-components/ChartWidget';
import NumberFormat from 'react-number-format';
import moment from 'moment';
import { COLORS } from 'constants/ChartConstant';
import { auth, db as firestore } from 'configs/FirebaseConfig';
import { collection, query, where, getDocs, getDoc, doc, Timestamp } from 'firebase/firestore';
import ErrorBoundary from 'components/shared-components/ErrorBoundary';

// Import our custom components
import StatsCard from './components/StatsCard';
import DateRangeFilter from './components/DateRangeFilter';
import ActivityTimeline from './components/ActivityTimeline';
import PerformanceChart from './components/PerformanceChart';
import DashboardService from './services/DashboardService';

// Import icons
import {
  TeamOutlined,
  DollarCircleOutlined,
  FileTextOutlined,
  HomeOutlined,
  CalendarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  UserOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  ContactsOutlined,
  MailOutlined,
  BankOutlined,
  BarChartOutlined,
  PieChartOutlined,
  RiseOutlined,
  LoadingOutlined,
  InfoCircleOutlined,
  AlertOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { Option } = Select;

// Company Dashboard Data
const companyData = [
  {
    color: '#3e82f7',
    name: 'Leads',
    value: '37%'
  },
  {
    color: '#04d182',
    name: 'Deals',
    value: '25%'
  },
  {
    color: '#ffc542',
    name: 'Properties',
    value: '18%'
  },
  {
    color: '#fa8c16',
    name: 'Invoices',
    value: '12%'
  },
  {
    color: '#ff6b72',
    name: 'Contacts',
    value: '8%'
  }
];

const topSellersData = [
  {
    name: 'John Smith',
    deals: 14,
    amount: 126000,
    avatar: '/img/avatars/thumb-1.jpg',
    growth: 12.5
  },
  {
    name: 'Ella Johnson',
    deals: 11,
    amount: 98500,
    avatar: '/img/avatars/thumb-2.jpg',
    growth: 8.2
  },
  {
    name: 'Michael Davis',
    deals: 9,
    amount: 87000,
    avatar: '/img/avatars/thumb-3.jpg',
    growth: -3.1
  },
  {
    name: 'Sarah Wilson',
    deals: 7,
    amount: 65800,
    avatar: '/img/avatars/thumb-4.jpg',
    growth: 7.5
  },
  {
    name: 'Robert Brown',
    deals: 5,
    amount: 42300,
    avatar: '/img/avatars/thumb-5.jpg',
    growth: -1.8
  }
];

const propertiesPerformanceData = {
  series: [
    {
      name: "Listings",
      data: [35, 41, 62, 42, 13, 18, 29, 25, 31, 15, 22, 18]
    },
    {
      name: "Sales",
      data: [12, 14, 18, 16, 5, 7, 12, 10, 13, 8, 9, 7]
    }
  ],
  categories: [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]
};

// Team Performance Data
const teamPerformanceData = {
  series: [76, 68, 58],
  labels: ["Sales Team", "Marketing Team", "Support Team"]
};

// Current Quarter Stats
const currentQuarterData = {
  series: [
    {
      name: "Current Quarter",
      data: [42, 48, 56, 52, 58, 63, 69, 74, 81, 85, 90, 92]
    },
    {
      name: "Previous Quarter",
      data: [36, 42, 48, 45, 50, 52, 57, 62, 68, 71, 75, 78]
    }
  ],
  categories: [
    'Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 
    'Week 7', 'Week 8', 'Week 9', 'Week 10', 'Week 11', 'Week 12'
  ]
};

const renderCompanyPerformance = (
  <div className="mb-4">
    <div className="d-flex align-items-center">
      <DollarCircleOutlined style={{ fontSize: '24px', color: '#3e82f7' }} />
      <h2 className="mb-0 ml-2 font-weight-bold">$534,895</h2>
    </div>
    <span className="text-muted">Total Revenue YTD</span>
  </div>
)

const CompanyDashboard = () => {
  // State management
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState(null);
  const [comparisonData, setComparisonData] = useState(currentQuarterData);
  const [topSellers, setTopSellers] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [revenueData, setRevenueData] = useState({
    series: propertiesPerformanceData.series,
    categories: propertiesPerformanceData.categories
  });
  const [leadsStatusData, setLeadsStatusData] = useState(companyData);
  const [dealsStatusData, setDealsStatusData] = useState(companyData);
  const [employeesRoleData, setEmployeesRoleData] = useState(teamPerformanceData);
  
  // Date range filter state
  const [dateRange, setDateRange] = useState({
    startDate: moment().startOf('month').toDate(),
    endDate: moment().endOf('month').toDate(),
    selectedPreset: 'month'
  });
  
  const direction = 'ltr'; // Default direction
  const userId = auth.currentUser?.uid;
  
  // Handle date range changes from the DateRangeFilter component
  // Main function to fetch all dashboard data
  const fetchDashboardData = useCallback(async (startDate, endDate, currentUserId = null) => {
    // Use provided userId or fallback to component state userId
    const effectiveUserId = currentUserId || userId;
    
    if (!effectiveUserId) {
      console.warn('fetchDashboardData called with no userId');
      return;
    }
    
    console.log('fetchDashboardData started with dates:', { startDate, endDate, userId: effectiveUserId });
    setLoading(true);
    try {
      // Get company ID from user document
      console.log('Fetching user document for userId:', effectiveUserId);
      const userDocRef = doc(firestore, 'users', effectiveUserId);
      const userDocSnap = await getDoc(userDocRef);
      
      console.log('User document exists:', userDocSnap.exists());
      
      const userData = userDocSnap.data();
      console.log('Full user document data:', userData);
      console.log('Company ID from user document:', userData?.company_id);
      
      if (!userDocSnap.exists()) {
        console.error('User document does not exist in Firestore');
        setLoading(false);
        return;
      }
      
      // Check for company ID with various possible field names
      let companyId = null;
      
      // Try all possible field name variations
      const possibleFields = ['company_id', 'companyId', 'company', 'companyID', 'organizationId', 'organization_id'];
      for (const field of possibleFields) {
        if (userData && userData[field]) {
          companyId = userData[field];
          console.log(`Found company ID in field '${field}':`, companyId);
          break;
        }
      }
      
      if (!companyId) {
        console.error('No company ID field found in user document with any known field name. Available fields:', Object.keys(userData));
        setLoading(false);
        return;
      }
      console.log('Found company ID:', companyId);
      
      const dateRange = [Timestamp.fromDate(startDate), Timestamp.fromDate(endDate)];
      console.log('Using date range:', { dateRange });
      
      // Default values in case of errors
      let stats = null;
      let comparison = null;
      let sellers = [];
      let activity = [];
      let meetings = [];
      let revenue = { series: [], categories: [] };
      let leadsStatus = [];
      let dealsStatus = [];
      let employeesData = { series: [], labels: [] };
      
      try {
        console.log('Starting parallel data fetching for companyId:', companyId);
        
        // Parallel data fetching to improve performance
        const promises = [
          DashboardService.fetchCompanyStats(companyId, dateRange),
          DashboardService.calculateComparisons(companyId, dateRange),
          DashboardService.fetchTopSellers(companyId, dateRange),
          DashboardService.fetchRecentActivity(companyId, dateRange),
          DashboardService.fetchUpcomingMeetings(companyId),
          DashboardService.fetchRevenueData(companyId, dateRange),
          DashboardService.fetchLeadsStatusDistribution(companyId, dateRange),
          DashboardService.fetchDealsStatusDistribution(companyId, dateRange),
          DashboardService.fetchEmployeesRoleDistribution(companyId)
        ];
        
        console.log('All promises created, waiting for Promise.all');
        
        const results = await Promise.all(promises);
        console.log('Promise.all completed, results:', results);
        
        // Assign results to variables with better logging
        const [
          statsResult,
          comparisonResult, 
          topSellersResult,
          recentActivityResult,
          upcomingMeetingsResult,
          revenueDataResult,
          leadsStatusResult,
          dealsStatusResult,
          employeesRoleResult
        ] = results;
        
        // Assign results to variables with type checking
        stats = statsResult && typeof statsResult === 'object' && !Array.isArray(statsResult) ? statsResult : null;
        comparison = comparisonResult && typeof comparisonResult === 'object' && !Array.isArray(comparisonResult) ? comparisonResult : {};
        sellers = Array.isArray(topSellersResult) ? topSellersResult : [];
        activity = Array.isArray(recentActivityResult) ? recentActivityResult : [];
        meetings = Array.isArray(upcomingMeetingsResult) ? upcomingMeetingsResult : [];
        // Handle revenue data properly, ensuring it has the right structure
        revenue = (revenueDataResult && 
                typeof revenueDataResult === 'object' && 
                'series' in revenueDataResult && 
                'categories' in revenueDataResult) ? 
                revenueDataResult : { series: [], categories: [] };
        leadsStatus = Array.isArray(leadsStatusResult) ? leadsStatusResult : [];
        dealsStatus = Array.isArray(dealsStatusResult) ? dealsStatusResult : [];
        // Handle employees role data properly, ensuring it has the right structure
        employeesData = (employeesRoleResult && 
                typeof employeesRoleResult === 'object' && 
                'series' in employeesRoleResult && 
                'labels' in employeesRoleResult) ? 
                employeesRoleResult : { series: [], labels: [] };
        
        console.log('Data assigned from service calls:', { 
          hasStats: !!stats, 
          hasComparison: !!comparison,
          sellersCount: sellers?.length || 0,
          activityCount: activity?.length || 0
        });
      } catch (error) {
        console.error('Error in Promise.all for dashboard data:', error);
        // We'll use the default values declared above
      }
      
      // Carefully handle data with type safety
      setStatsData(stats || null);
      
      // Format comparison data for charts with safer handling
      try {
        if (comparison && typeof comparison === 'object') {
          // Directly map the comparison data to chart format
          const comparisonChartData = {
            series: [
              {
                name: 'Current Period',
                data: [stats?.totalLeads || 0, stats?.totalContacts || 0, stats?.totalDeals || 0, 
                      stats?.totalProperties || 0, stats?.totalInvoices || 0]
              },
              {
                name: 'Previous Period',
                data: [comparison.leads || 0, comparison.contacts || 0, comparison.deals || 0, 
                      comparison.properties || 0, comparison.invoices || 0]
              }
            ],
            categories: ['Leads', 'Contacts', 'Deals', 'Properties', 'Invoices']
          };
          setComparisonData(comparisonChartData);
        } else {
          // Use default data
          setComparisonData(currentQuarterData);
        }
      } catch (error) {
        console.error('Error formatting comparison data:', error);
        setComparisonData(currentQuarterData);
      }
      
      // Handle array data with defaults
      setTopSellers(Array.isArray(sellers) ? sellers : topSellersData);
      setRecentActivity(Array.isArray(activity) ? activity : []);
      setUpcomingMeetings(Array.isArray(meetings) ? meetings : []);
      
      // Handle revenue data with more robust type checking
      try {
        if (revenue && typeof revenue === 'object' && 
            'series' in revenue && Array.isArray(revenue.series) && 
            'categories' in revenue && Array.isArray(revenue.categories)) {
          
          // Check if the series array has data objects with 'data' property
          const hasSeries = revenue.series.length > 0 && 
                          typeof revenue.series[0] === 'object' && 
                          'data' in revenue.series[0] && 
                          Array.isArray(revenue.series[0].data) &&
                          revenue.series[0].data.length > 0;
          
          // Check if categories array has items
          const hasCategories = revenue.categories.length > 0;
          
          if (hasSeries && hasCategories) {
            setRevenueData({
              series: revenue.series,
              categories: revenue.categories
            });
          } else {
            setRevenueData(propertiesPerformanceData);
          }
        } else {
          setRevenueData(propertiesPerformanceData);
        }
      } catch (error) {
        console.error('Error processing revenue data:', error);
        setRevenueData(propertiesPerformanceData);
      }
      
      // Handle leads status data
      if (Array.isArray(leadsStatus) && leadsStatus.length > 0) {
        // Convert number values to string format to match expected type
        const formattedLeadsData = leadsStatus.map(item => ({
          name: item.name,
          value: String(item.value || 0) + '%', // Convert to string and add percentage
          color: item.color || '#8c8c8c'
        }));
        setLeadsStatusData(formattedLeadsData);
      } else {
        // Set default data
        setLeadsStatusData(companyData);
      }
      
      // Handle deals status data
      if (Array.isArray(dealsStatus) && dealsStatus.length > 0) {
        // Convert number values to string format to match expected type
        const formattedDealsData = dealsStatus.map(item => ({
          name: item.name,
          value: String(item.value || 0) + '%', // Convert to string and add percentage
          color: item.color || '#8c8c8c'
        }));
        setDealsStatusData(formattedDealsData);
      } else {
        // Set default data
        setDealsStatusData(companyData);
      }
      // Handle employees role data with safe object property access
      if (employeesData && typeof employeesData === 'object' && 
          'series' in employeesData && Array.isArray(employeesData.series) &&
          'labels' in employeesData && Array.isArray(employeesData.labels)) {
        // Only set if we have valid data
        if (employeesData.series.length > 0 && employeesData.labels.length > 0) {
          setEmployeesRoleData({
            series: employeesData.series,
            labels: employeesData.labels
          });
        } else {
          // Use default data if empty arrays
          setEmployeesRoleData(teamPerformanceData);
        }
      } else {
        // Use default data if structure is invalid
        setEmployeesRoleData(teamPerformanceData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Handle date range changes from the DateRangeFilter component
  const handleDateRangeChange = (range) => {
    setDateRange(range);
    fetchDashboardData(range.startDate, range.endDate);
  };

  // Add an auth state listener to ensure we have the latest auth state
  // and trigger dashboard data fetch when auth changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      console.log('Auth state changed:', { 
        isLoggedIn: !!user, 
        userId: user?.uid,
        email: user?.email
      });
      
      if (user?.uid) {
        console.log('User authenticated, fetching dashboard data for userId:', user.uid);
        fetchDashboardData(dateRange.startDate, dateRange.endDate, user.uid);
      }
    });
    
    // Clean up listener on unmount
    return () => unsubscribe();
  }, [dateRange, fetchDashboardData]);
  
  // Initialize dashboard data on component mount
  useEffect(() => {
    console.log('Dashboard component mounted or deps changed. Auth state:', {
      currentUser: auth.currentUser,
      userId: userId,
      dateRange: dateRange
    });
    
    if (userId) {
      console.log('Fetching dashboard data with userId:', userId);
      fetchDashboardData(dateRange.startDate, dateRange.endDate);
    } else {
      console.warn('No userId available, cannot fetch dashboard data');
      console.log('You may need to sign in again or check user permissions');
    }
  }, [userId, fetchDashboardData, dateRange.startDate, dateRange.endDate]);

  return (
    <>
      <Row gutter={16}>
        <Col xs={24} sm={24} md={24} lg={24} xl={18}>
          <Row gutter={16} className="mb-4">
            <Col xs={24} sm={12} md={12} lg={6}>
              <Card>
                <Statistic
                  title="Total Properties"
                  value={statsData?.totalProperties || 0}
                  prefix={<HomeOutlined />}
                  valueStyle={{ color: COLORS[0] }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={12} lg={6}>
              <Card>
                <Statistic
                  title="Active Deals"
                  value={statsData?.totalDeals || 0}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: COLORS[1] }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={12} lg={6}>
              <Card>
                <Statistic
                  title="Total Employees"
                  value={statsData?.totalEmployees || 0}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: COLORS[2] }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={12} lg={6}>
              <Card>
                <Statistic
                  title="This Month Revenue"
                  value={statsData?.monthlyRevenue || 0}
                  prefix="AED "
                  valueStyle={{ color: COLORS[3] }}
                />
              </Card>
            </Col>
          </Row>
          <ChartWidget
            series={revenueData?.series || propertiesPerformanceData.series} 
            xAxis={revenueData?.categories || propertiesPerformanceData.categories} 
            title="Revenue Performance"
            height={400}
            type="line"
            direction={direction}
            customOptions={{
              colors: [COLORS[0], COLORS[2]],
              stroke: {
                curve: 'smooth'
              }
            }}
            extra={
              <DateRangeFilter 
                onRangeChange={handleDateRangeChange}
                dateRange={{
                  startDate: dateRange.startDate,
                  endDate: dateRange.endDate
                }}
                setDateRange={setDateRange}
                rangeType={dateRange.selectedPreset}
                setRangeType={(preset) => setDateRange({...dateRange, selectedPreset: preset})}
              />
            }
          />
        </Col>
        <Col xs={24} sm={24} md={24} lg={24} xl={6}>
          <DonutChartWidget 
            series={employeesRoleData?.series || teamPerformanceData.series} 
            labels={employeesRoleData?.labels || teamPerformanceData.labels} 
            title="Team Performance"
            bodyClass="my-3"
            extra={
              <div className="mt-4">
                <Row justify="center">
                  <Col xs={20} sm={20} md={20} lg={24}>
                    {(employeesRoleData?.labels || teamPerformanceData.labels).map((label, index) => (
                      <div className="d-flex align-items-center justify-content-between mb-3" key={label}>
                        <div className="d-flex" style={{ gap: '5px' }}>
                          <Badge color={COLORS[index % COLORS.length]} />
                          <span className="text-gray-light">{label}</span>
                        </div>
                        <span className="font-weight-bold text-dark">{(employeesRoleData?.series || teamPerformanceData.series)[index]}%</span>
                      </div>
                    ))}
                  </Col>
                </Row>
              </div>
            }
          />
          <Card title="Calendar" className="mt-4" extra={<CalendarOutlined />}>
            <p>Upcoming meetings:</p>
            {upcomingMeetings && upcomingMeetings.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={upcomingMeetings}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      title={item.title || 'Untitled Meeting'}
                      description={item.date ? new Date(item.date).toLocaleString() : 'No date specified'}
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No upcoming meetings" />
            )}
          </Card>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} sm={24} md={24} lg={12} xl={12}>
          <RegiondataWidget 
            title="Business Distribution"
            data={leadsStatusData || companyData}
            content={renderCompanyPerformance}
          />
          {loading && <div className="text-center py-3"><Spin /></div>}
        </Col>
        <Col xs={24} sm={24} md={24} lg={12} xl={12}>
          <Card title="Top Sellers" extra={<TeamOutlined />}>
            {topSellers && topSellers.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={topSellers}
                renderItem={item => (
                  <List.Item>
                    <div className="d-flex align-items-center justify-content-between w-100">
                      <div className="d-flex align-items-center">
                        <Avatar src={item.profilePic || 'https://via.placeholder.com/30'} size={30} className="mr-2" />
                        <span>{item.name || item.firstName + ' ' + item.lastName}</span>
                      </div>
                      <div>
                        <Tag color={item.status === 'active' ? 'success' : 'default'}>{item.status || 'Active'}</Tag>
                        <span className="ml-2 text-muted">AED {item.sales || item.totalSales || 0}</span>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No top sellers data available" />
            )}
          </Card>
        </Col>
      </Row>
      <Row gutter={16} className="mt-4">
        <Col xs={24}>
          <Card title="Performance Comparison" extra={
              <div>
                {loading && <Spin size="small" className="mr-2" />}
                <Text type="secondary">Data from {moment(dateRange.startDate).format('MMM DD')} - {moment(dateRange.endDate).format('MMM DD, YYYY')}</Text>
              </div>
            }>
            <ChartWidget
              series={comparisonData?.series || currentQuarterData.series}
              xAxis={comparisonData?.categories || currentQuarterData.categories}
              height={400}
              type="area"
              direction={direction}
              customOptions={{
                colors: [COLORS[3], COLORS[4]],
                fill: {
                  type: 'gradient',
                  gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.7,
                    opacityTo: 0.2,
                    stops: [0, 90, 100]
                  }
                }
              }}
            />
          </Card>
        </Col>
      </Row>
    </>
  )
}

const DashboardWithErrorBoundary = () => (
  <ErrorBoundary>
    <CompanyDashboard />
  </ErrorBoundary>
);

export default DashboardWithErrorBoundary;
