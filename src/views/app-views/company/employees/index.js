// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Card, Typography, Table, Input, Button, Row, Col, Tag, Space,
  Statistic, Tooltip, Spin, Badge, Divider, message, Popconfirm,
  Select, Form, DatePicker, Avatar
} from 'antd';
import {
  PlusOutlined, SearchOutlined, FilterOutlined,
  EditOutlined, DeleteOutlined, EyeOutlined,
  UserAddOutlined, CalendarOutlined, TeamOutlined,
  UserOutlined, SortAscendingOutlined, SortDescendingOutlined
} from '@ant-design/icons';
import { db, collection, getDocs, doc, addDoc, deleteDoc, updateDoc, serverTimestamp } from 'configs/FirebaseConfig';
import { useSelector } from 'react-redux';
import moment from 'moment';
import EmployeeForm from './EmployeeForm';
import VacationForm from './VacationForm';
import EmployeeDetail from './EmployeeDetail';
import './employees.css';

const { Title, Text } = Typography;
const { Option } = Select;

const EmployeeStatus = {
  WORKING: 'Working',
  VACATION: 'Vacation',
};

const EmployeesPage = () => {
  const user = useSelector(state => state.auth.user);
  const companyId = user?.company_id || '';
  console.log('User object:', user);
  console.log('Company ID from user:', companyId);

  const [employees, setEmployees] = useState([]);
  const [vacations, setVacations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({
    status: null,
    role: null,
  });
  const [employeeFormVisible, setEmployeeFormVisible] = useState(false);
  const [vacationFormVisible, setVacationFormVisible] = useState(false);
  const [employeeDetailVisible, setEmployeeDetailVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('ascend');
  const [stats, setStats] = useState({
    total: 0,
    working: 0,
    onVacation: 0,
  });

  const fetchUsers = async () => {
    try {
      console.log('Fetching users for dropdown');
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const usersList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        displayName: doc.data().displayName || doc.data().email
      }));
      console.log('Fetched users:', usersList.length);
      setUsers(usersList);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchVacations();
    fetchUsers();
  }, [companyId]);

  const fetchEmployees = async () => {
    if (!companyId) {
      console.log('No company ID available');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      console.log('Fetching employees for company:', companyId);
      const employeesRef = collection(db, 'employees');
      const employeesSnapshot = await getDocs(employeesRef);
      const employeesList = employeesSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(employee => {
          const employeeCompanyId = employee.company_id;
          if (typeof employeeCompanyId === 'object' && employeeCompanyId?.path) {
            return employeeCompanyId.path.includes(companyId);
          }
          return employeeCompanyId === companyId ||
            employeeCompanyId === `companies/${companyId}` ||
            employeeCompanyId === `/companies/${companyId}`;
        });
      console.log('Filtered employees:', employeesList.length);
      let filteredEmployees = [...employeesList];
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        filteredEmployees = filteredEmployees.filter(
          employee => {
            return (
              (employee.name?.toLowerCase().includes(searchLower)) ||
              (employee.email?.toLowerCase().includes(searchLower)) ||
              (employee.phoneNumber?.includes(searchText)) ||
              (employee.Role?.toLowerCase().includes(searchLower))
            );
          }
        );
        console.log('Search filtered employees:', filteredEmployees.length);
      }
      if (filters.status) {
        filteredEmployees = filteredEmployees.filter(
          employee => employee.Status === filters.status
        );
        console.log('Status filtered employees:', filteredEmployees.length);
      }
      if (filters.role) {
        filteredEmployees = filteredEmployees.filter(
          employee => employee.Role === filters.role
        );
        console.log('Role filtered employees:', filteredEmployees.length);
      }
      if (sortField && sortOrder) {
        filteredEmployees = [...filteredEmployees].sort((a, b) => {
          let aValue = a[sortField];
          let bValue = b[sortField];
          if (sortField === 'JoiningDate') {
            aValue = aValue ? aValue.toDate().getTime() : 0;
            bValue = bValue ? bValue.toDate().getTime() : 0;
          } else if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue ? bValue.toLowerCase() : '';
          } else {
            aValue = aValue || 0;
            bValue = bValue || 0;
          }
          return sortOrder === 'ascend' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
        });
        console.log(`Sorted employees by ${sortField} ${sortOrder}`);
      }
      const statsData = {
        total: employeesList.length,
        working: employeesList.filter(emp => emp.Status === EmployeeStatus.WORKING).length,
        onVacation: employeesList.filter(emp => emp.Status === EmployeeStatus.VACATION).length,
      };
      setEmployees(filteredEmployees);
      setStats(statsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching employees:', error);
      message.error('Failed to fetch employees');
      setLoading(false);
    }
  };

  const fetchVacations = async () => {
    if (!companyId) return;
    try {
      const vacationsRef = collection(db, 'vacations');
      const vacationsSnapshot = await getDocs(vacationsRef);
      const vacationsList = vacationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVacations(vacationsList);
    } catch (error) {
      console.error('Error fetching vacations:', error);
      message.error('Failed to fetch vacation records');
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchText(value);
    if (window.searchTimeout) {
      clearTimeout(window.searchTimeout);
    }
    window.searchTimeout = setTimeout(() => {
      fetchEmployees();
    }, 500);
  };

  const handleFilterChange = (filterKey, value) => {
    setFilters({
      ...filters,
      [filterKey]: value,
    });
    fetchEmployees();
  };

  const handleSortChange = (field) => {
    const newOrder = field === sortField && sortOrder === 'ascend' ? 'descend' : 'ascend';
    setSortField(field);
    setSortOrder(newOrder);
    fetchEmployees();
  };

  const handleAddEditEmployee = (isAdd = true, employee = null) => {
    console.log('handleAddEditEmployee: isAdd=', isAdd, 'employee=', employee);
    setIsEditing(!isAdd);
    setSelectedEmployee(isAdd ? null : employee);
    setEmployeeFormVisible(true);
  };

  const handleAddVacation = (employee) => {
    setSelectedEmployee(employee);
    setVacationFormVisible(true);
  };

  const handleViewEmployeeDetails = (employee) => {
    setSelectedEmployee(employee);
    setEmployeeDetailVisible(true);
  };

  const handleEmployeeFormSubmit = async (formData) => {
    try {
      const cleanData = { ...formData };
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          cleanData[key] = null;
        }
      });
      console.log('Clean employee data for Firestore:', cleanData);
      if (isEditing && selectedEmployee) {
        const employeeRef = doc(db, 'employees', selectedEmployee.id);
        await updateDoc(employeeRef, {
          ...cleanData,
          LastUpdate: serverTimestamp(),
        });
        message.success('Employee updated successfully');
      } else {
        await addDoc(collection(db, 'employees'), {
          ...cleanData,
          company_id: companyId,
          CreationDate: serverTimestamp(),
          LastUpdate: serverTimestamp(),
        });
        message.success('Employee added successfully');
      }
      setEmployeeFormVisible(false);
      fetchEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      message.error('Failed to save employee');
    }
  };

  const handleVacationFormSubmit = async (formData) => {
    try {
      await addDoc(collection(db, 'vacations'), {
        ...formData,
        CreationDate: serverTimestamp(),
        employee_id: selectedEmployee.id,
      });
      const employeeRef = doc(db, 'employees', selectedEmployee.id);
      await updateDoc(employeeRef, {
        Status: EmployeeStatus.VACATION,
        LastUpdate: serverTimestamp(),
      });
      message.success('Vacation added successfully');
      setVacationFormVisible(false);
      fetchEmployees();
      fetchVacations();
    } catch (error) {
      console.error('Error adding vacation:', error);
      message.error('Failed to add vacation');
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    try {
      const employeeVacations = vacations.filter(v => v.employee_id === employeeId);
      for (const vacation of employeeVacations) {
        await deleteDoc(doc(db, 'vacations', vacation.id));
      }
      await deleteDoc(doc(db, 'employees', employeeId));
      message.success('Employee deleted successfully');
      fetchEmployees();
      fetchVacations();
    } catch (error) {
      console.error('Error deleting employee:', error);
      message.error('Failed to delete employee');
    }
  };

  const getEmployeeVacation = (employeeId) => {
    const now = new Date();
    return vacations.find(v =>
      v.employee_id === employeeId &&
      v.StartDate.toDate() <= now &&
      v.EndDate.toDate() >= now
    );
  };

  const renderStatus = (status) => {
    switch (status) {
      case EmployeeStatus.WORKING:
        return <Tag color="green">Working</Tag>;
      case EmployeeStatus.VACATION:
        return <Tag color="orange">On Vacation</Tag>;
      default:
        return <Tag color="default">{status || 'Unknown'}</Tag>;
    }
  };

  const columns = [
    {
      title: (
        <div onClick={() => handleSortChange('name')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          Name
          {sortField === 'name' && (
            <span style={{ marginLeft: 8 }}>
              {sortOrder === 'ascend' ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
            </span>
          )}
        </div>
      ),
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div className="employee-name-cell" onClick={() => handleViewEmployeeDetails(record)}>
          <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
          <div>
            <Text strong>{text}</Text>
            <div>
              <Text type="secondary">{record.Role}</Text>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <div>
          <div>{record.email}</div>
          <div>{record.phoneNumber}</div>
        </div>
      ),
    },
    {
      title: (
        <div onClick={() => handleSortChange('Salary')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          Salary
          {sortField === 'Salary' && (
            <span style={{ marginLeft: 8 }}>
              {sortOrder === 'ascend' ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
            </span>
          )}
        </div>
      ),
      key: 'salary',
      render: (_, record) => (
        <div>
          <div>AED {record.Salary?.toLocaleString() || '0'}</div>
          <div>Day: {record.DateSalary || 'N/A'}</div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'Status',
      key: 'status',
      render: (status) => renderStatus(status),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Select
            style={{ width: 120 }}
            placeholder="Select status"
            value={selectedKeys[0]}
            onChange={(value) => {
              setSelectedKeys(value ? [value] : []);
              handleFilterChange('status', value);
              confirm();
            }}
            allowClear
            onClear={() => {
              clearFilters();
              handleFilterChange('status', null);
            }}
          >
            {Object.values(EmployeeStatus).map(status => (
              <Select.Option key={status} value={status}>{status}</Select.Option>
            ))}
          </Select>
        </div>
      ),
      filterIcon: filtered => <FilterOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
    },
    {
      title: (
        <div onClick={() => handleSortChange('JoiningDate')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          Joined
          {sortField === 'JoiningDate' && (
            <span style={{ marginLeft: 8 }}>
              {sortOrder === 'ascend' ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
            </span>
          )}
        </div>
      ),
      key: 'joined',
      render: (_, record) => (
        <div>
          {record.JoiningDate ? moment(record.JoiningDate.toDate()).format('MMM DD, YYYY') : 'N/A'}
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              icon={<EyeOutlined />}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleViewEmployeeDetails(record);
              }}
            />
          </Tooltip>
          <Tooltip title="Edit Employee">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleAddEditEmployee(false, record);
              }}
            />
          </Tooltip>
          <Tooltip title="Add Vacation">
            <Button
              icon={<CalendarOutlined />}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleAddVacation(record);
              }}
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this employee?"
            onConfirm={(e) => {
              e.stopPropagation();
              handleDeleteEmployee(record.id);
            }}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete Employee">
              <Button
                icon={<DeleteOutlined />}
                size="small"
                danger
                onClick={(e) => e.stopPropagation()}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="employees-container">
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Title level={2}>Employees Management</Title>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => handleAddEditEmployee(true)}
            >
              Add Employee
            </Button>
          </Col>
        </Row>
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={8}>
            <Statistic
              title="Total Employees"
              value={stats.total}
              prefix={<TeamOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Working"
              value={stats.working}
              valueStyle={{ color: '#52c41a' }}
              prefix={<UserOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="On Vacation"
              value={stats.onVacation}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<CalendarOutlined />}
            />
          </Col>
        </Row>
      </Card>
      <Card style={{ marginTop: 16 }}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search employees..."
              value={searchText}
              onChange={handleSearchChange}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8} md={6} lg={4}>
            <Select
              placeholder="Filter by status"
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              allowClear
            >
              {Object.values(EmployeeStatus).map((status) => (
                <Option key={status} value={status}>{status}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8} md={6} lg={4}>
            <Button
              onClick={() => {
                setFilters({ status: null, role: null });
                setSearchText('');
                fetchEmployees();
              }}
            >
              Reset Filters
            </Button>
          </Col>
        </Row>
        <Table
          columns={columns}
          dataSource={employees}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
      <EmployeeForm
        visible={employeeFormVisible}
        onCancel={() => setEmployeeFormVisible(false)}
        onSubmit={handleEmployeeFormSubmit}
        isEditing={isEditing}
        initialValues={selectedEmployee}
      />
      <VacationForm
        visible={vacationFormVisible}
        onClose={() => setVacationFormVisible(false)}
        onSubmit={handleVacationFormSubmit}
      />
      <EmployeeDetail
        visible={employeeDetailVisible}
        onClose={() => setEmployeeDetailVisible(false)}
        employee={selectedEmployee}
        vacations={vacations}
        onEdit={(employee) => {
          console.log('EmployeeDetail onEdit: employee=', employee);
          setEmployeeDetailVisible(false);
          handleAddEditEmployee(false, employee);
        }}
      />
    </div>
  );
};

export default EmployeesPage;