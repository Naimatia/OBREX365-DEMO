import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Input,
  Select,
  Modal,
  Form,
  message,
  Tooltip,
  Popconfirm,
  Typography,
  Progress,
  Row,
  Col,
  Statistic,
  Drawer,
  DatePicker,
  Tabs,
  List,
  Avatar
} from 'antd';
import {
  UserAddOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  PhoneOutlined,
  MailOutlined,
  TrophyOutlined,
  CalendarOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import UserService from 'services/firebase/UserService';
import ContactsService from 'services/ContactsService';
import DealsService from 'services/DealsService';
import LeadsService from 'services/LeadsService';
import InvoicesService from 'services/InvoicesService';
import { UserRoles } from 'models/UserModel';
import { auth } from 'configs/FirebaseConfig';
import moment from 'moment';
import dayjs from 'dayjs';

// Import the form components
import AddUserForm from './AddUserForm';
import EditUserForm from './EditUserForm';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

/**
 * Sellers and HR management page
 * Allows CEO and HR users to manage team members
 */
const SellersPage = () => {
  // Get current user data from Redux store
  const user = useSelector(state => state.auth.user);
  const companyId = user?.company_id || '';
  const userRole = user?.Role || '';

  // State management
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState(undefined);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Seller analytics state
  const [sellerProgress, setSellerProgress] = useState({});
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [analyticsVisible, setAnalyticsVisible] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);

  // Check if current user has permission to manage users
  const canManageUsers = [UserRoles.CEO, UserRoles.HR].includes(userRole);

  // Fetch users data - get all users with same company_id
  const fetchUsers = async () => {
    setLoading(true);
    try {
      let fetchedUsers = [];
      if (companyId) {
        console.log('Fetching users for company ID:', companyId);

        // Fetch ALL users with the same company_id (not just HR and SELLER)
        // This ensures we get everyone in the company
        fetchedUsers = await UserService.getUsersByCompanyId(companyId);

        // Exclude current user from the list
        fetchedUsers = fetchedUsers.filter(u => u.id !== user.id);

        // Log detailed information about fetched users
        console.log(`Successfully fetched ${fetchedUsers.length} users for company ${companyId}`);
        console.log('User roles found:', Array.from(new Set(fetchedUsers.map(u => u.Role || u.role))));
      } else {
        console.warn('No company ID found for current user');
      }

      setUsers(fetchedUsers);
      setFilteredUsers(fetchedUsers);

      // Fetch progress for all sellers
      await fetchAllSellersProgress(fetchedUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      message.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  // Calculate seller progress for current month
  const calculateSellerProgress = async (sellerId) => {
    try {
      const startOfMonth = moment().startOf('month').toDate();
      const endOfMonth = moment().endOf('month').toDate();

      // Fetch all contacts for the seller in current month
      const contacts = await ContactsService.getSellerContactsByDateRange(sellerId, startOfMonth, endOfMonth);

      // Calculate contact status counts
      const pending = contacts.filter(c => c.status === 'Pending').length;
      const contacted = contacts.filter(c => c.status === 'Contacted').length;
      const deal = contacts.filter(c => c.status === 'Deal').length;
      const loss = contacts.filter(c => c.status === 'Loss').length;
      const total = contacts.length;

      // Calculate progress percentage (contacted + deal as progress)
      const progressCount = contacted + deal;
      const progressPercentage = total > 0 ? Math.round((progressCount / total) * 100) : 0;

      return {
        total,
        pending,
        contacted,
        deal,
        loss,
        progressCount,
        progressPercentage
      };
    } catch (error) {
      console.error('Error calculating seller progress:', error);
      return {
        total: 0,
        pending: 0,
        contacted: 0,
        deal: 0,
        loss: 0,
        progressCount: 0,
        progressPercentage: 0
      };
    }
  };

  // Fetch progress for all sellers
  const fetchAllSellersProgress = async (usersList) => {
    try {
      const progressData = {};
      const sellers = usersList.filter(u => u.Role === 'Seller' || u.role === 'Seller');

      for (const seller of sellers) {
        const progress = await calculateSellerProgress(seller.id);
        progressData[seller.id] = progress;
      }

      setSellerProgress(progressData);
    } catch (error) {
      console.error('Error fetching sellers progress:', error);
    }
  };

  // Fetch comprehensive seller analytics
  const fetchSellerAnalytics = async (sellerId, startDate, endDate) => {
    try {
      setAnalyticsLoading(true);

      const [contacts, deals, leads, invoices] = await Promise.all([
        ContactsService.getSellerContactsByDateRange(sellerId, startDate, endDate),
        DealsService.getSellerDealsByDateRange(sellerId, startDate, endDate),
        LeadsService.getSellerLeadsByDateRange(companyId, sellerId, startDate, endDate),
        InvoicesService.getSellerInvoicesByDateRange(sellerId, startDate, endDate)
      ]);

      // Calculate contacts analytics
      const contactStats = {
        total: contacts.length,
        pending: contacts.filter(c => c.status === 'Pending').length,
        contacted: contacts.filter(c => c.status === 'Contacted').length,
        deal: contacts.filter(c => c.status === 'Deal').length,
        loss: contacts.filter(c => c.status === 'Loss').length
      };

      // Calculate deals analytics
      const dealStats = {
        total: deals.length,
        pending: deals.filter(d => d.status === 'Pending').length,
        gain: deals.filter(d => d.status === 'Gain').length,
        loss: deals.filter(d => d.status === 'Loss').length,
        totalValue: deals.reduce((sum, deal) => sum + (parseFloat(deal.amount) || 0), 0),
        gainValue: deals.filter(d => d.status === 'Gain').reduce((sum, deal) => sum + (parseFloat(deal.amount) || 0), 0)
      };

      // Calculate leads analytics
      const leadStats = {
        total: leads.length,
        hot: leads.filter(l => l.interestLevel === 'Hot').length,
        warm: leads.filter(l => l.interestLevel === 'Warm').length,
        cold: leads.filter(l => l.interestLevel === 'Cold').length
      };

      // Calculate invoices analytics
      const invoiceStats = {
        total: invoices.length,
        paid: invoices.filter(i => i.status === 'Paid').length,
        pending: invoices.filter(i => i.status === 'Pending').length,
        overdue: invoices.filter(i => i.status === 'Missed' || (i.DateLimit && moment(i.DateLimit).isBefore(moment()))).length,
        totalValue: invoices.reduce((sum, invoice) => sum + (parseFloat(invoice.amount) || 0), 0),
        paidValue: invoices.filter(i => i.status === 'Paid').reduce((sum, invoice) => sum + (parseFloat(invoice.amount) || 0), 0)
      };

      // Calculate overall progress
      const totalTasks = contactStats.total + dealStats.total + leadStats.total;
      const completedTasks = contactStats.contacted + contactStats.deal + dealStats.gain + leadStats.hot;
      const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      const analyticsResult = {
        contacts: contactStats,
        deals: dealStats,
        leads: leadStats,
        invoices: invoiceStats,
        overallProgress,
        dateRange: { startDate, endDate },
        rawData: { contacts, deals, leads, invoices }
      };

      setAnalyticsData(analyticsResult);
      return analyticsResult;
    } catch (error) {
      console.error('Error fetching seller analytics:', error);
      message.error('Failed to load seller analytics');
      return null;
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Handle seller click to show analytics
  const handleSellerClick = async (seller) => {
    setSelectedSeller(seller);
    setAnalyticsVisible(true);

    // Fetch analytics for current month by default
    const startDate = dateRange[0].toDate();
    const endDate = dateRange[1].toDate();
    await fetchSellerAnalytics(seller.id, startDate, endDate);
  };

  // Handle date range change in analytics
  const handleDateRangeChange = async (dates) => {
    if (dates && dates.length === 2 && selectedSeller) {
      setDateRange(dates);
      const startDate = dates[0].toDate();
      const endDate = dates[1].toDate();
      await fetchSellerAnalytics(selectedSeller.id, startDate, endDate);
    }
  };

  // Handle month change in analytics
  const handleMonthChange = async (month) => {
    if (month && selectedSeller) {
      setSelectedMonth(month);
      const startDate = month.startOf('month').toDate();
      const endDate = month.endOf('month').toDate();
      setDateRange([dayjs(startDate), dayjs(endDate)]);
      await fetchSellerAnalytics(selectedSeller.id, startDate, endDate);
    }
  };

  // Get progress color based on percentage
  const getProgressColor = (percentage) => {
    if (percentage >= 80) return '#52c41a'; // Green
    if (percentage >= 60) return '#faad14'; // Orange
    if (percentage >= 40) return '#13c2c2'; // Cyan
    return '#ff4d4f'; // Red
  };

  // Initial data load
  useEffect(() => {
    if (companyId) {
      fetchUsers();
    }
  }, [companyId]);

  // Handle search and filtering
  useEffect(() => {
    let result = [...users];

    // Apply search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      result = result.filter(user =>
        user.firstname?.toLowerCase().includes(searchLower) ||
        user.lastname?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower)
      );
    }

    // Apply role filter
    if (roleFilter) {
      result = result.filter(user => user.Role === roleFilter);
    }

    setFilteredUsers(result);
  }, [searchText, roleFilter, users]);

  // Handle adding a new user
  const handleAddUser = async (values) => {
    try {
      setLoading(true);

      // Get current user's IP address (simplified for demo)
      const getCurrentIP = async () => {
        try {
          const response = await fetch('https://api.ipify.org?format=json');
          const data = await response.json();
          return data.ip;
        } catch {
          return '0.0.0.0'; // Fallback IP
        }
      };

      const ipAddress = await getCurrentIP();

      // Create new user with the exact document structure as specified
      const userData = {
        email: values.email,
        secondaryEmail: values.secondaryEmail,
        password: 'Welcome123!', // Default temporary password


        // Personal information - exact field names as required
        firstname: values.firstname,
        lastname: values.lastname,
        phoneNumber: values.phoneNumber,
        phoneNumber2: values.phoneNumber2,
        phoneNumber3: values.phoneNumber3,



        // Company relationship - using exact field name
        company_id: companyId,

        country: values.country,

        // Role - must be "Seller" for sales team
        Role: values.Role,

        // Timestamps - exact field names with proper format
        CreationDate: new Date(),
        LastLogin: new Date(),

        // Boolean fields - exact as specified
        Notification: false,
        forcePasswordReset: true, // IMPORTANT: Force password reset on first login
        isBanned: false,
        isVerified: false, // New users start unverified

        // Network information
        ipAddress: ipAddress
      };

      console.log('Creating new seller with exact document structure:', { ...userData, password: '***hidden***' });

      // Store current user auth state
      const currentUser = auth.currentUser;

      // Use the new direct seller creation method
      const result = await UserService.createSellerDirectly(userData);

      console.log('Seller created successfully with ID:', result.uid);

      // Inform user about successful creation and refresh requirement
      message.success(
        `${values.firstname} ${values.lastname} added successfully as a ${values.Role}. ` +
        'Please refresh the page to see the new seller in the list.'
      );

      setIsAddModalVisible(false);

      // Refresh the users list
      await fetchUsers();
    } catch (error) {
      console.error('Failed to add seller:', error);
      message.error(`Failed to add seller: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle updating a user
  const handleUpdateUser = async (values) => {
    try {
      setLoading(true);

      // Update user profile
      const updateData = {
        firstname: values.firstname,
        lastName: values.lastname,
        phoneNumber: values.phoneNumber,
        secondaryEmail: values.secondaryEmail,
        phoneNumber2: values.phoneNumber2,
        phoneNumber3: values.phoneNumber3,
        country: values.country,
        Role: values.role
      };

      await UserService.updateUserProfile(currentUser.id, updateData);

      message.success(`${values.firstname} ${values.lastname} updated successfully`);
      setIsEditModalVisible(false);
      fetchUsers(); // Refresh user list
    } catch (error) {
      console.error('Failed to update user:', error);
      message.error(`Failed to update user: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting a user
  const handleDeleteUser = async (userId) => {
    try {
      setLoading(true);
      await UserService.deleteUser(userId);
      message.success('User deleted successfully');
      fetchUsers(); // Refresh user list
    } catch (error) {
      console.error('Failed to delete user:', error);
      message.error(`Failed to delete user: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Show edit modal
  const showEditModal = (user) => {
    setCurrentUser(user);
    setIsEditModalVisible(true);
  };

  // Table columns configuration
  const columns = [
    {
      title: 'Name',
      dataIndex: 'firstname',
      key: 'name',
      sorter: (a, b) => {
        const aName = `${a.firstname || a.firstName || ''} ${a.lastname || a.lastName || ''}`;
        const bName = `${b.firstname || b.firstName || ''} ${b.lastname || b.lastName || ''}`;
        return aName.localeCompare(bName);
      },
      render: (_, record) => {
        const firstName = record.firstname || record.firstName || '';
        const lastName = record.lastname || record.lastName || '';
        return `${firstName} ${lastName}`;
      }
    },
    {
      title: 'Main Email',
      dataIndex: 'email',
      key: 'email',
      sorter: (a, b) => a.email.localeCompare(b.email)
    },

    {
      title: 'Secondary Email',
      dataIndex: 'secondaryEmail',
      key: 'secondaryEmail',
      sorter: (a, b) => a.secondaryEmail.localeCompare(b.secondaryEmail)
    },
    {
      title: 'Role',
      dataIndex: 'Role',
      key: 'role',
      render: (role) => {
        let color;
        switch (role) {
          case UserRoles.SUPER_ADMIN:
            color = '#6DCEEE'; // Theme color from previous components
            break;
          case UserRoles.CEO:
            color = 'gold';
            break;
          case UserRoles.HR:
            color = 'geekblue';
            break;
          case UserRoles.SELLER:
            color = 'green';
            break;
          case UserRoles.COORDINATOR:
            color = 'cyan';
            break;
          case UserRoles.SALES_EXECUTIVE:
            color = 'blue';
            break;
          case UserRoles.AGENT:
            color = 'purple';
            break;
          case UserRoles.TEAM_LEADER:
            color = 'orange';
            break;
          case UserRoles.SALES_MANAGER:
            color = 'magenta';
            break;
          case UserRoles.MARKETING_MANAGER:
            color = 'volcano';
            break;
          case UserRoles.OFF_PLAN_SALES:
            color = '#2db7f5'; // Lighter blue shade
            break;
          case UserRoles.READY_TO_MOVE_SALES:
            color = '#87d068'; // Lighter green shade
            break;
          case UserRoles.SECRETARY:
            color = 'lime';
            break;
          case UserRoles.FRONT_DESK_OFFICER:
            color = 'red';
            break;
          case UserRoles.OFFICE_BOY:
            color = 'pink';
            break;
          case UserRoles.ACCOUNTANT:
            color = '#108ee9'; // Medium blue
            break;
          case UserRoles.HUMAN_RESOURCES:
            color = '#f50'; // Orange-red
            break;
          case UserRoles.PUBLIC_RELATIONS_OFFICER:
            color = '#d4380d'; // Darker red
            break;
          default:
            color = 'default';
        }
        return <Tag color={color}>{role}</Tag>;
      }
    },
    {
      title: 'Phone Numbers',
      dataIndex: 'phoneNumber',
      key: 'phone',
      render: (_, record) => {
        const phones = [
          record.phoneNumber,
          record.phoneNumber2,
          record.phoneNumber3
        ].filter(phone => phone);
        return phones.length > 0 ? (
          phones.map((phone, index) => (
            <div key={index}>{phone}</div>
          ))
        ) : '-';
      }
    },
    {
      title: 'Country',
      dataIndex: 'country',
      key: 'country'
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        if (record.isBanned) {
          return <Tag color="red">Banned</Tag>;
        }
        if (record.forcePasswordReset) {
          return <Tag color="orange">Password Reset Required</Tag>;
        }
        return <Tag color="green">Active</Tag>;
      }
    },
    {
      title: 'Created',
      dataIndex: 'CreationDate', // Match Firestore field
      key: 'CreationDate',
      render: (date) => {
        if (!date) return '-';
        // Handle both Firestore Timestamp and JavaScript Date
        const dateObj = date.toDate ? date.toDate() : new Date(date);
        return moment(dateObj).format('YYYY-MM-DD');
      },
      sorter: (a, b) => {
        const dateA = a.CreationDate ? (a.CreationDate.toDate ? a.CreationDate.toDate() : new Date(a.CreationDate)) : new Date(0);
        const dateB = b.CreationDate ? (b.CreationDate.toDate ? b.CreationDate.toDate() : new Date(b.CreationDate)) : new Date(0);
        return dateA - dateB;
      }
    }
  ];

  // Add actions column if user has permission
  if (canManageUsers) {
    columns.push({
      title: 'Actions',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          {/* Analytics button for sellers */}
          {(record.Role === 'Seller' || record.role === 'Seller') && (
            <Tooltip title="View Analytics">
              <Button
                type="default"
                icon={<EyeOutlined />}
                size="small"
                onClick={() => handleSellerClick(record)}
                style={{ color: '#722ed1', borderColor: '#722ed1' }}
              />
            </Tooltip>
          )}
          <Tooltip title="Edit">
            <Button
              type="primary"
              icon={<EditOutlined />}
              size="small"
              onClick={() => showEditModal(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title="Are you sure you want to delete this user?"
              onConfirm={() => handleDeleteUser(record.id)}
              okText="Yes"
              cancelText="No"
              icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                size="small"
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    });
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <Title level={2}>Team Management</Title>

          {canManageUsers && (
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => setIsAddModalVisible(true)}
            >
              Add Team Member
            </Button>
          )}
        </div>
        <br></br>
        <div className="flex justify-between mb-4">
          <Input
            placeholder="Search by name or email"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          <Select
            placeholder="Filter by role"
            style={{ width: 200 }}
            value={roleFilter}
            onChange={setRoleFilter}
            allowClear
          >
            <Option value={UserRoles.SUPER_ADMIN}>Super Admin</Option>
            <Option value={UserRoles.CEO}>CEO</Option>
            <Option value={UserRoles.HR}>Human Resources (HR)</Option>
            <Option value={UserRoles.SELLER}>Sales Representative</Option>
            <Option value={UserRoles.COORDINATOR}>Coordinator</Option>
            <Option value={UserRoles.SALES_EXECUTIVE}>Sales Executive</Option>
            <Option value={UserRoles.AGENT}>Agent</Option>
            <Option value={UserRoles.TEAM_LEADER}>Team Leader</Option>
            <Option value={UserRoles.SALES_MANAGER}>Sales Manager</Option>
            <Option value={UserRoles.MARKETING_MANAGER}>Marketing Manager</Option>
            <Option value={UserRoles.OFF_PLAN_SALES}>Off-plan Sales</Option>
            <Option value={UserRoles.READY_TO_MOVE_SALES}>Ready to Move Sales</Option>
            <Option value={UserRoles.SECRETARY}>Secretary</Option>
            <Option value={UserRoles.FRONT_DESK_OFFICER}>Front Desk Officer</Option>
            <Option value={UserRoles.OFFICE_BOY}>Office Boy</Option>
            <Option value={UserRoles.ACCOUNTANT}>Accountant</Option>
            <Option value={UserRoles.HUMAN_RESOURCES}>Human Resources</Option>
            <Option value={UserRoles.PUBLIC_RELATIONS_OFFICER}>Public Relations Officer</Option>
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={loading}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50']
          }}
        />
      </Card>

      {/* Add User Modal */}
      <Modal
        title="Add New Team Member"
        visible={isAddModalVisible}
        onCancel={() => setIsAddModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <AddUserForm
          onFinish={handleAddUser}
          onCancel={() => setIsAddModalVisible(false)}
        />
      </Modal>

      {/* Edit User Modal */}
      <Modal
        title="Edit Team Member"
        visible={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        {currentUser && (
          <EditUserForm
            initialValues={currentUser}
            onFinish={handleUpdateUser}
            onCancel={() => setIsEditModalVisible(false)}
          />
        )}
      </Modal>

      {/* Seller Analytics Drawer */}
      <Drawer
        title={
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            margin: '-24px -24px 24px -24px',
            padding: '24px',
            color: 'white'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Avatar
                size={64}
                style={{ backgroundColor: 'rgba(255,255,255,0.2)', fontSize: '24px' }}
                icon={<TrophyOutlined />}
              />
              <div>
                <Title level={3} style={{ color: 'white', margin: 0 }}>
                  {selectedSeller ? `${selectedSeller.firstname || selectedSeller.firstName || ''} ${selectedSeller.lastname || selectedSeller.lastName || ''}` : 'Seller Analytics'}
                </Title>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px' }}>
                  Performance Dashboard & Insights
                </Text>
                {analyticsData && (
                  <div style={{ marginTop: '8px' }}>
                    <Progress
                      percent={analyticsData.overallProgress}
                      strokeColor={'rgba(255,255,255,0.8)'}
                      trailColor={'rgba(255,255,255,0.2)'}
                      size="small"
                      format={percent => (
                        <span style={{ color: 'white', fontSize: '12px' }}>
                          {percent}% Overall Progress
                        </span>
                      )}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        }
        width={800}
        visible={analyticsVisible}
        onClose={() => {
          setAnalyticsVisible(false);
          setSelectedSeller(null);
          setAnalyticsData(null);
        }}
        destroyOnClose
      >
        <div style={{ padding: '0 8px' }}>
          {/* Date Range Filters */}
          <Card
            style={{
              marginBottom: '24px',
              background: 'linear-gradient(135deg, #f6f9fc 0%, #eef2f7 100%)',
              border: '1px solid #e8f4f8'
            }}
          >
            <Row gutter={16} align="middle">
              <Col span={8}>
                <Space direction="vertical" size={4}>
                  <Text strong style={{ color: '#1890ff' }}>
                    <CalendarOutlined /> Quick Filters
                  </Text>
                  <DatePicker
                    picker="month"
                    value={selectedMonth}
                    onChange={handleMonthChange}
                    format="MMMM YYYY"
                    placeholder="Select Month"
                    style={{ width: '100%' }}
                  />
                </Space>
              </Col>
              <Col span={16}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Text strong style={{ color: '#722ed1' }}>
                    <LineChartOutlined /> Custom Date Range
                  </Text>
                  <RangePicker
                    value={dateRange && dateRange.length === 2 ? [dateRange[0], dateRange[1]] : null}
                    onChange={handleDateRangeChange}
                    format="YYYY-MM-DD"
                    style={{ width: '100%' }}
                  />
                </Space>
              </Col>
            </Row>
          </Card>

          {analyticsLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Progress type="circle" percent={75} status="active" />
              <div style={{ marginTop: '16px' }}>
                <Text>Loading comprehensive analytics...</Text>
              </div>
            </div>
          ) : analyticsData ? (
            <Tabs defaultActiveKey="overview" type="card">
              {/* Overview Tab */}
              <TabPane tab="📊 Overview" key="overview">
                <Row gutter={[16, 16]}>
                  {/* Contacts Analytics */}
                  <Col span={12}>
                    <Card
                      title="📞 Contacts Performance"
                      style={{ height: '100%' }}
                      headStyle={{ background: '#f0f9ff', color: '#0369a1' }}
                    >
                      <Row gutter={[8, 8]}>
                        <Col span={12}>
                          <Statistic
                            title="Total Contacts"
                            value={analyticsData.contacts.total}
                            prefix={<PhoneOutlined />}
                            valueStyle={{ color: '#13c2c2' }}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title="Success Rate"
                            value={analyticsData.contacts.total > 0 ? Math.round(((analyticsData.contacts.contacted + analyticsData.contacts.deal) / analyticsData.contacts.total) * 100) : 0}
                            suffix="%"
                            valueStyle={{ color: '#52c41a' }}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title="Contacted"
                            value={analyticsData.contacts.contacted}
                            valueStyle={{ color: '#13c2c2' }}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title="Converted to Deals"
                            value={analyticsData.contacts.deal}
                            valueStyle={{ color: '#52c41a' }}
                          />
                        </Col>
                      </Row>
                    </Card>
                  </Col>

                  {/* Deals Analytics */}
                  <Col span={12}>
                    <Card
                      title="🤝 Deals Performance"
                      style={{ height: '100%' }}
                      headStyle={{ background: '#f6ffed', color: '#389e0d' }}
                    >
                      <Row gutter={[8, 8]}>
                        <Col span={12}>
                          <Statistic
                            title="Total Deals"
                            value={analyticsData.deals.total}
                            valueStyle={{ color: '#722ed1' }}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title="Win Rate"
                            value={analyticsData.deals.total > 0 ? Math.round((analyticsData.deals.gain / analyticsData.deals.total) * 100) : 0}
                            suffix="%"
                            valueStyle={{ color: '#52c41a' }}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title="Won Deals"
                            value={analyticsData.deals.gain}
                            valueStyle={{ color: '#52c41a' }}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title="Revenue (AED)"
                            value={analyticsData.deals.gainValue}
                            formatter={value => `${Number(value).toLocaleString('en-AE')}`}
                            valueStyle={{ color: '#faad14' }}
                          />
                        </Col>
                      </Row>
                    </Card>
                  </Col>

                  {/* Leads Analytics */}
                  <Col span={12}>
                    <Card
                      title="🎯 Leads Quality"
                      style={{ height: '100%' }}
                      headStyle={{ background: '#fff7e6', color: '#d48806' }}
                    >
                      <Row gutter={[8, 8]}>
                        <Col span={12}>
                          <Statistic
                            title="Total Leads"
                            value={analyticsData.leads.total}
                            valueStyle={{ color: '#fa8c16' }}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title="Hot Leads"
                            value={analyticsData.leads.hot}
                            valueStyle={{ color: '#ff4d4f' }}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title="Warm Leads"
                            value={analyticsData.leads.warm}
                            valueStyle={{ color: '#faad14' }}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title="Cold Leads"
                            value={analyticsData.leads.cold}
                            valueStyle={{ color: '#13c2c2' }}
                          />
                        </Col>
                      </Row>
                    </Card>
                  </Col>

                  {/* Invoices Analytics */}
                  <Col span={12}>
                    <Card
                      title="💰 Invoices Status"
                      style={{ height: '100%' }}
                      headStyle={{ background: '#f6f0ff', color: '#531dab' }}
                    >
                      <Row gutter={[8, 8]}>
                        <Col span={12}>
                          <Statistic
                            title="Total Invoices"
                            value={analyticsData.invoices.total}
                            valueStyle={{ color: '#722ed1' }}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title="Payment Rate"
                            value={analyticsData.invoices.total > 0 ? Math.round((analyticsData.invoices.paid / analyticsData.invoices.total) * 100) : 0}
                            suffix="%"
                            valueStyle={{ color: '#52c41a' }}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title="Paid (AED)"
                            value={analyticsData.invoices.paidValue}
                            formatter={value => `${Number(value).toLocaleString('en-AE')}`}
                            valueStyle={{ color: '#52c41a' }}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title="Overdue"
                            value={analyticsData.invoices.overdue}
                            valueStyle={{ color: '#ff4d4f' }}
                          />
                        </Col>
                      </Row>
                    </Card>
                  </Col>
                </Row>

                {/* Progress Notes */}
                <Card
                  title="📈 Performance Notes"
                  style={{ marginTop: '24px' }}
                  headStyle={{ background: '#f0f9ff', color: '#0369a1' }}
                >
                  <List
                    size="small"
                    dataSource={[
                      {
                        icon: '🎯',
                        text: `Overall productivity: ${analyticsData.overallProgress}% completion rate`,
                        type: analyticsData.overallProgress >= 70 ? 'success' : analyticsData.overallProgress >= 50 ? 'warning' : 'danger'
                      },
                      {
                        icon: '📞',
                        text: `Contact efficiency: ${analyticsData.contacts.total > 0 ? Math.round(((analyticsData.contacts.contacted + analyticsData.contacts.deal) / analyticsData.contacts.total) * 100) : 0}% contact success rate`,
                        type: 'info'
                      },
                      {
                        icon: '💰',
                        text: `Revenue generated: AED ${Number(analyticsData.deals.gainValue + analyticsData.invoices.paidValue).toLocaleString('en-AE')} from closed deals and paid invoices`,
                        type: 'success'
                      },
                      {
                        icon: '⚠️',
                        text: analyticsData.invoices.overdue > 0 ? `${analyticsData.invoices.overdue} overdue invoices require attention` : 'All invoices are up to date',
                        type: analyticsData.invoices.overdue > 0 ? 'danger' : 'success'
                      }
                    ]}
                    renderItem={item => (
                      <List.Item>
                        <Text
                          type={item.type === 'warning' ? 'warning' : undefined}
                          style={{
                            color: item.type === 'success' ? '#52c41a' :
                              item.type === 'warning' ? '#faad14' :
                                item.type === 'danger' ? '#ff4d4f' : undefined
                          }}
                        >
                          {item.icon} {item.text}
                        </Text>
                      </List.Item>
                    )}
                  />
                </Card>
              </TabPane>

              {/* Detailed Data Tab */}
              <TabPane tab="📋 Detailed Data" key="details">
                <Tabs type="line" tabPosition="left">
                  <TabPane tab={`Contacts (${analyticsData.contacts.total})`} key="contacts">
                    <List
                      size="small"
                      header={<Text strong>All contacts in selected period</Text>}
                      dataSource={analyticsData.rawData.contacts.slice(0, 20)}
                      renderItem={contact => (
                        <List.Item>
                          <List.Item.Meta
                            avatar={<Avatar style={{ backgroundColor: contact.status === 'Deal' ? '#52c41a' : contact.status === 'Contacted' ? '#13c2c2' : contact.status === 'Loss' ? '#ff4d4f' : '#faad14' }}>{contact.name?.charAt(0) || 'C'}</Avatar>}
                            title={contact.name || 'Unnamed Contact'}
                            description={`${contact.email || 'No email'} | ${contact.phoneNumber || 'No phone'} | Status: ${contact.status || 'Unknown'}`}
                          />
                          <Text type="secondary">{moment(contact.CreationDate).format('MMM DD, YYYY')}</Text>
                        </List.Item>
                      )}
                    />
                  </TabPane>

                  <TabPane tab={`Deals (${analyticsData.deals.total})`} key="deals">
                    <List
                      size="small"
                      header={<Text strong>All deals in selected period</Text>}
                      dataSource={analyticsData.rawData.deals.slice(0, 20)}
                      renderItem={deal => (
                        <List.Item>
                          <List.Item.Meta
                            avatar={<Avatar style={{ backgroundColor: deal.status === 'Gain' ? '#52c41a' : deal.status === 'Loss' ? '#ff4d4f' : '#faad14' }}>{deal.title?.charAt(0) || 'D'}</Avatar>}
                            title={deal.title || 'Unnamed Deal'}
                            description={`Amount: AED ${Number(deal.amount || 0).toLocaleString('en-AE')} | Status: ${deal.status || 'Unknown'}`}
                          />
                          <Text type="secondary">{moment(deal.CreationDate).format('MMM DD, YYYY')}</Text>
                        </List.Item>
                      )}
                    />
                  </TabPane>

                  <TabPane tab={`Leads (${analyticsData.leads.total})`} key="leads">
                    <List
                      size="small"
                      header={<Text strong>All leads in selected period</Text>}
                      dataSource={analyticsData.rawData.leads.slice(0, 20)}
                      renderItem={lead => (
                        <List.Item>
                          <List.Item.Meta
                            avatar={<Avatar style={{ backgroundColor: lead.interestLevel === 'Hot' ? '#ff4d4f' : lead.interestLevel === 'Warm' ? '#faad14' : '#13c2c2' }}>{lead.name?.charAt(0) || 'L'}</Avatar>}
                            title={lead.name || 'Unnamed Lead'}
                            description={`${lead.email || 'No email'} | Interest: ${lead.interestLevel || 'Unknown'} | Budget: AED ${Number(lead.budget || 0).toLocaleString('en-AE')}`}
                          />
                          <Text type="secondary">{moment(lead.CreationDate).format('MMM DD, YYYY')}</Text>
                        </List.Item>
                      )}
                    />
                  </TabPane>

                  <TabPane tab={`Invoices (${analyticsData.invoices.total})`} key="invoices">
                    <List
                      size="small"
                      header={<Text strong>All invoices in selected period</Text>}
                      dataSource={analyticsData.rawData.invoices.slice(0, 20)}
                      renderItem={invoice => (
                        <List.Item>
                          <List.Item.Meta
                            avatar={<Avatar style={{ backgroundColor: invoice.status === 'Paid' ? '#52c41a' : invoice.status === 'Pending' ? '#faad14' : '#ff4d4f' }}>{invoice.title?.charAt(0) || 'I'}</Avatar>}
                            title={invoice.title || 'Unnamed Invoice'}
                            description={`Amount: AED ${Number(invoice.amount || 0).toLocaleString('en-AE')} | Status: ${invoice.status || 'Unknown'}`}
                          />
                          <Text type="secondary">{moment(invoice.CreationDate).format('MMM DD, YYYY')}</Text>
                        </List.Item>
                      )}
                    />
                  </TabPane>
                </Tabs>
              </TabPane>
            </Tabs>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Text type="secondary">Select a date range to view analytics</Text>
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
};

export default SellersPage;