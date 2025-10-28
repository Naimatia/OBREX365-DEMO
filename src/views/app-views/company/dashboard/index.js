import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Avatar, Tag, Badge, List, Statistic, Spin, Typography, Empty, message } from 'antd';
import { motion } from 'framer-motion';
import RegiondataWidget from 'components/shared-components/RegiondataWidget';
import DonutChartWidget from 'components/shared-components/DonutChartWidget';
import ChartWidget from 'components/shared-components/ChartWidget';
import moment from 'moment';
import { COLORS } from 'constants/ChartConstant';
import { auth, db as firestore } from 'configs/FirebaseConfig';
import { getDoc, doc } from 'firebase/firestore';
import ErrorBoundary from 'components/shared-components/ErrorBoundary';
import DashboardService from './services/DashboardService';
import DateRangeFilter from './components/DateRangeFilter';

// Import icons
import { TeamOutlined, DollarCircleOutlined, FileTextOutlined, HomeOutlined, CalendarOutlined } from '@ant-design/icons';

const { Text } = Typography;

// Mock data (used only as fallback)
const companyData = [
  { color: '#3e82f7', name: 'Leads', value: 37 },
  { color: '#04d182', name: 'Deals', value: 25 },
  { color: '#ffc542', name: 'Properties', value: 18 },
  { color: '#fa8c16', name: 'Invoices', value: 12 },
  { color: '#ff6b72', name: 'Contacts', value: 8 },
];

const topSellersData = [
  { name: 'John Smith', deals: 14, amount: 126000, profilePic: '/img/avatars/thumb-1.jpg', status: 'Active', growth: 12.5 },
  { name: 'Ella Johnson', deals: 11, amount: 98500, profilePic: '/img/avatars/thumb-2.jpg', status: 'Active', growth: 8.2 },
];

const propertiesPerformanceData = {
  series: [{ name: 'Revenue', data: [0, 0, 0, 0, 0, 0] }],
  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
};

const teamPerformanceData = {
  series: [1, 1, 1],
  labels: ['Sales', 'Marketing', 'Support'],
};

const currentQuarterData = {
  leadsComparison: 0,
  contactsComparison: 0,
  dealsComparison: 0,
  propertiesComparison: 0,
  revenueComparison: 0,
};

const renderCompanyPerformance = (
  <div className="mb-4">
    <div className="d-flex align-items-center">
      <DollarCircleOutlined style={{ fontSize: '24px', color: '#3e82f7' }} />
      <h2 className="mb-0 ml-2 font-weight-bold">AED 0</h2>
    </div>
    <span className="text-muted">Total Revenue YTD</span>
  </div>
);

const CompanyDashboard = () => {
  // State management
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [comparisonData, setComparisonData] = useState(currentQuarterData);
  const [topSellers, setTopSellers] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [revenueData, setRevenueData] = useState(propertiesPerformanceData);
  const [leadsStatusData, setLeadsStatusData] = useState(companyData);
  const [dealsStatusData, setDealsStatusData] = useState(companyData);
  const [employeesRoleData, setEmployeesRoleData] = useState(teamPerformanceData);
  const [dateRange, setDateRange] = useState({
    startDate: moment().startOf('month').toDate(),
    endDate: moment().endOf('month').toDate(),
    selectedPreset: 'month',
  });

  const direction = 'ltr';

  const fetchDashboardData = useCallback(
    async (startDate, endDate, currentUserId = null) => {
      const effectiveUserId = currentUserId || userId;
      if (!effectiveUserId) {
        console.warn('fetchDashboardData: No userId available');
        message.error('Please sign in to view dashboard data');
        setLoading(false);
        return;
      }
      if (!companyId) {
        console.warn('fetchDashboardData: No companyId available');
        message.error('Company data not found. Please contact support.');
        setLoading(false);
        return;
      }
      if (!startDate || !endDate || moment(endDate).isBefore(startDate)) {
        console.warn('fetchDashboardData: Invalid date range', { startDate, endDate });
        message.error('Invalid date range selected. Please choose a valid range.');
        setLoading(false);
        return;
      }

      console.log('fetchDashboardData started with:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        userId: effectiveUserId,
        companyId,
      });
      setLoading(true);

      try {
        const [stats, comparisonStats, revenueDataResult, leadsStatusResult, dealsStatusResult, employeesRoleResult] = await Promise.all([
          DashboardService.fetchCompanyStats(companyId, [startDate, endDate]),
          DashboardService.fetchComparisonStats(companyId, [startDate, endDate]),
          DashboardService.fetchRevenueData(companyId, [startDate, endDate]),
          DashboardService.fetchLeadsStatusDistribution(companyId, [startDate, endDate]),
          DashboardService.fetchDealsStatusDistribution(companyId, [startDate, endDate]),
          DashboardService.fetchEmployeesRoleDistribution(companyId),
        ]);

        if (!stats) {
          console.warn('fetchDashboardData: No stats returned from fetchCompanyStats');
          message.warning('No data available for the selected period.');
        } else {
          console.log('fetchCompanyStats results:', {
            totalLeads: stats.totalLeads,
            totalContacts: stats.totalContacts,
            totalDeals: stats.totalDeals,
            totalProperties: stats.totalProperties,
            monthlyRevenue: stats.monthlyRevenue,
            totalEmployees: employeesRoleData.series.reduce((sum, count) => sum + count, 0),
            topSellersCount: stats.topSellers.length,
            recentActivitiesCount: stats.recentActivities.length,
            upcomingMeetingsCount: stats.upcomingMeetings.length,
          });
          if (stats.totalLeads === 0 && stats.totalDeals === 0 && stats.totalProperties === 0 && stats.monthlyRevenue === 0) {
            console.warn('All stats are zero. Check Firestore data or query parameters:', {
              companyId,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            });
            message.warning('No data found for the selected period. Try a different date range or verify Firestore data.');
          }
          if (stats.topSellers.length === 0) {
            console.warn('No top sellers found. Check employees or deals data for companyId:', companyId);
          }
        }

        setStatsData(stats || null);
        setTopSellers(stats?.topSellers || []);
        setRecentActivity(stats?.recentActivities || []);
        setUpcomingMeetings(stats?.upcomingMeetings || []);
        setRevenueData(revenueDataResult || propertiesPerformanceData);
        setLeadsStatusData(leadsStatusResult || companyData);
        setDealsStatusData(dealsStatusResult || companyData);
        setEmployeesRoleData(employeesRoleResult || teamPerformanceData);
        setComparisonData(comparisonStats && stats ? DashboardService.calculateComparisons(stats, comparisonStats) : currentQuarterData);
      } catch (error) {
        console.error('fetchDashboardData error:', error);
        message.error('Failed to load dashboard data. Please try again later.');
        setStatsData(null);
        setTopSellers([]);
        setRecentActivity([]);
        setUpcomingMeetings([]);
        setRevenueData(propertiesPerformanceData);
        setLeadsStatusData(companyData);
        setDealsStatusData(companyData);
        setEmployeesRoleData(teamPerformanceData);
        setComparisonData(currentQuarterData);
      } finally {
        setLoading(false);
      }
    },
    [userId, companyId]
  );

  useEffect(() => {
    console.log('useEffect: Setting up auth listener with dateRange:', {
      startDate: dateRange.startDate?.toISOString(),
      endDate: dateRange.endDate?.toISOString(),
    });
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      console.log('Auth state changed:', {
        isLoggedIn: !!user,
        userId: user?.uid,
        email: user?.email,
      });
      if (user?.uid) {
        setUserId(user.uid);
        try {
          const userDocRef = doc(firestore, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            if (!userData.company_id) {
              console.error('No company_id found in user document:', user.uid);
              message.error('Company data not found. Please contact support.');
              setLoading(false);
              return;
            }
            setCompanyId(userData.company_id);
            console.log('User authenticated, fetching dashboard data for userId:', user.uid, 'companyId:', userData.company_id);
            fetchDashboardData(dateRange.startDate, dateRange.endDate, user.uid);
          } else {
            console.error('User document does not exist in Firestore:', user.uid);
            message.error('User data not found. Please contact support.');
            setLoading(false);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          message.error('Failed to load user data. Please try again.');
          setLoading(false);
        }
      } else {
        console.warn('No authenticated user, skipping data fetch');
        setUserId(null);
        setCompanyId(null);
        setLoading(false);
      }
    });
    return () => {
      console.log('useEffect: Cleaning up auth listener');
      unsubscribe();
    };
  }, [dateRange.startDate, dateRange.endDate, fetchDashboardData]);

  const handleDateRangeChange = (range) => {
    if (range && range.startDate && range.endDate && !moment(range.endDate).isBefore(range.startDate)) {
      console.log('handleDateRangeChange: Setting dateRange:', {
        startDate: range.startDate.toISOString(),
        endDate: range.endDate.toISOString(),
        selectedPreset: range.selectedPreset,
      });
      setDateRange({
        startDate: moment(range.startDate).startOf('day').toDate(),
        endDate: moment(range.endDate).endOf('day').toDate(),
        selectedPreset: range.selectedPreset || 'custom',
      });
      if (userId && companyId) {
        console.log('handleDateRangeChange: Triggering fetchDashboardData with new date range');
        fetchDashboardData(range.startDate, range.endDate);
      }
    } else {
      console.warn('handleDateRangeChange: Invalid date range, resetting to default');
      message.warning('Please select a valid date range.');
      setDateRange({
        startDate: moment().startOf('month').toDate(),
        endDate: moment().endOf('month').toDate(),
        selectedPreset: 'month',
      });
    }
  };

  return (
    <ErrorBoundary>
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
                  value={employeesRoleData?.series.reduce((sum, count) => sum + count, 0) || 0}
                  prefix={<TeamOutlined />}
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
              stroke: { curve: 'smooth' },
            }}
            extra={
              <DateRangeFilter
                onRangeChange={handleDateRangeChange}
                dateRange={{
                  startDate: dateRange.startDate,
                  endDate: dateRange.endDate,
                }}
                setDateRange={setDateRange}
                rangeType={dateRange.selectedPreset}
                setRangeType={(preset) => setDateRange({ ...dateRange, selectedPreset: preset })}
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
                        <span className="font-weight-bold text-dark">
                          {(employeesRoleData?.series || teamPerformanceData.series)[index]}%
                        </span>
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
                renderItem={(item) => (
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
          {loading && (
            <div className="text-center py-3">
              <Spin />
            </div>
          )}
        </Col>
        <Col xs={24} sm={24} md={24} lg={12} xl={12}>
          <Card title="Top Sellers" extra={<TeamOutlined />}>
            {topSellers && topSellers.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={topSellers}
                renderItem={(item) => (
                  <List.Item>
                    <div className="d-flex align-items-center justify-content-between w-100">
                      <div className="d-flex align-items-center">
                        <Avatar src={item.profilePic || 'https://via.placeholder.com/30'} size={30} className="mr-2" />
                        <span>{item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Unknown'}</span>
                      </div>
                      <div>
                        <Tag color={item.status === 'Active' ? 'success' : 'default'}>{item.status || 'Active'}</Tag>
                        <span className="ml-2 text-muted">AED {item.amount || 0}</span>
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
          <Card
            title="Performance Comparison"
            extra={
              <div>
                {loading && <Spin size="small" className="mr-2" />}
                <Text type="secondary">
                  Data from {moment(dateRange.startDate).format('MMM DD')} -{' '}
                  {moment(dateRange.endDate).format('MMM DD, YYYY')}
                </Text>
              </div>
            }
          >
            <ChartWidget
              series={comparisonData?.series || [{ name: 'Current', data: [0, 0, 0] }, { name: 'Previous', data: [0, 0, 0] }]}
              xAxis={comparisonData?.categories || ['Week 1', 'Week 2', 'Week 3']}
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
                    stops: [0, 90, 100],
                  },
                },
              }}
            />
          </Card>
        </Col>
      </Row>
    </ErrorBoundary>
  );
};

export default CompanyDashboard;