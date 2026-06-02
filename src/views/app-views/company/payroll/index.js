// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  Card, Typography, Table, Input, Button, Row, Col, Space, 
  Statistic, Tooltip, Spin, Divider, message, Popconfirm,
  Avatar
} from 'antd';
import { 
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, 
  UserOutlined, SortAscendingOutlined, SortDescendingOutlined
} from '@ant-design/icons';
import { db, collection, getDocs, doc, addDoc, deleteDoc, updateDoc, serverTimestamp } from 'configs/FirebaseConfig';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import PayrollForm from './PayrollForm';
import './employees.css';

const { Title, Text } = Typography;

const PayrollPage = () => {
  const user = useSelector(state => state.auth.user);
  const companyId = user?.company_id || '';
  console.log('User object:', user);
  console.log('Company ID from user:', companyId);
  
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [payrollFormVisible, setPayrollFormVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [sortField, setSortField] = useState('employee_name');
  const [sortOrder, setSortOrder] = useState('ascend');
  
  const [stats, setStats] = useState({
    total: 0,
    total_gross_pay: 0,
    total_net_pay: 0,
  });

  const fetchPayrolls = async () => {
    if (!companyId) {
      console.log('No company ID available');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching payrolls for company:', companyId);
      const payrollRef = collection(db, 'payroll');
      const payrollSnapshot = await getDocs(payrollRef);
      
      let payrollsList = payrollSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          absent_days: doc.data().absent_per_day || 0, // Align with form's absent_per_day
        }))
        .filter(payroll => {
          const payrollCompanyId = payroll.company_id;
          return payrollCompanyId === companyId || payrollCompanyId === `companies/${companyId}` || payrollCompanyId === `/companies/${companyId}`;
        });

      if (searchText) {
        const searchLower = searchText.toLowerCase();
        payrollsList = payrollsList.filter(payroll => 
          (payroll.employee_name?.toLowerCase().includes(searchLower)) || 
          (payroll.employee_id?.includes(searchText)) ||
          (payroll.position?.toLowerCase().includes(searchLower))
        );
        console.log('Search filtered payrolls:', payrollsList.length);
      }
      
      if (sortField && sortOrder) {
        payrollsList = [...payrollsList].sort((a, b) => {
          let aValue = a[sortField];
          let bValue = b[sortField];
          if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue ? bValue.toLowerCase() : '';
          } else {
            aValue = aValue || 0;
            bValue = bValue || 0;
          }
          return sortOrder === 'ascend' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
        });
        console.log(`Sorted payrolls by ${sortField} ${sortOrder}`);
      }
      
      const statsData = {
        total: payrollsList.length,
        total_gross_pay: payrollsList.reduce((sum, payroll) => sum + (payroll.gross_pay || 0), 0),
        total_net_pay: payrollsList.reduce((sum, payroll) => sum + (payroll.net_pay || 0), 0),
      };
      
      setPayrolls(payrollsList);
      setStats(statsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching payrolls:', error);
      message.error('Failed to fetch payrolls');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrolls();
  }, [companyId]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchText(value);
    if (window.searchTimeout) clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(fetchPayrolls, 500);
  };

  const handleSortChange = (field) => {
    const newOrder = field === sortField && sortOrder === 'ascend' ? 'descend' : 'ascend';
    setSortField(field);
    setSortOrder(newOrder);
    fetchPayrolls();
  };

  const handleAddEditPayroll = (isAdd = true, record = null) => {
    setIsEditing(!isAdd);
    setSelectedPayroll(record); // Set the selected payroll record for editing
    setPayrollFormVisible(true);
  };

  const handlePayrollFormSubmit = async (formData) => {
try {
    const cleanData = { ...formData };
    
    const monthlySalary = Number(cleanData.monthly_salary || 0);
    const daysInMonth = Number(cleanData.days_in_month || 30);
    const hoursPerDay = Number(cleanData.hours_per_day || 8);
    const workingDays = Number(cleanData.working_days || 0);
    const overtimeHours = Number(cleanData.overtime_hours || 0);
    const absentDays = Number(cleanData.absent_days || 0);
    const otherDeduction = Number(cleanData.other_deduction || 0);
    const hourlyRate = Number(cleanData.hourly_rate || (monthlySalary / daysInMonth / hoursPerDay));

    const basicPay = Number((monthlySalary * (workingDays / daysInMonth)).toFixed(2));
    const overtimePay = Number((hourlyRate * overtimeHours).toFixed(2));
    const absenceDeduction = Number((monthlySalary / daysInMonth * absentDays).toFixed(2));
    const totalDeduction = Number((absenceDeduction + otherDeduction).toFixed(2));

    const grossPay = Number((basicPay + overtimePay).toFixed(2));
    const netPay = Number((grossPay - totalDeduction).toFixed(2));

    const payrollData = {
      ...cleanData,
      monthly_salary: monthlySalary,
      basic_pay: basicPay,
      overtime_pay: overtimePay,
      absence_deduction: absenceDeduction,
      total_deduction: totalDeduction,
      gross_pay: grossPay,
      net_pay: netPay,
      company_id: companyId,
      CreationDate: serverTimestamp(),
      LastUpdate: serverTimestamp(),
    };

    if (isEditing && selectedPayroll) {
      await updateDoc(doc(db, 'payroll', selectedPayroll.id), payrollData);
      message.success('Payroll updated successfully');
    } else {
      await addDoc(collection(db, 'payroll'), payrollData);
      message.success('Payroll added successfully');
    }

    setPayrollFormVisible(false);
    fetchPayrolls();
  } catch (error) {
    console.error('Error saving payroll:', error);
    message.error('Failed to save payroll');
  }
};

  const handleDeletePayroll = async (payrollId) => {
    try {
      await deleteDoc(doc(db, 'payroll', payrollId));
      message.success('Payroll deleted successfully');
      fetchPayrolls();
    } catch (error) {
      console.error('Error deleting payroll:', error);
      message.error('Failed to delete payroll');
    }
  };

const columns = [
  {
    title: 'Employee Name',
    dataIndex: 'employee_name',
    key: 'employee_name',
    sorter: true,
    sortOrder: sortField === 'employee_name' && sortOrder,
    render: (text) => (
      <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
        <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff', marginRight: 8 }} />
        <Text strong style={{ color: '#1890ff' }}>{text || 'N/A'}</Text>
      </div>
    ),
  },
  {
    title: 'Employee ID',
    dataIndex: 'employee_id',
    key: 'employee_id',
    sorter: true,
    sortOrder: sortField === 'employee_id' && sortOrder,
  },
  {
    title: 'Position',
    dataIndex: 'position',
    key: 'position',
    sorter: true,
    sortOrder: sortField === 'position' && sortOrder,
  },
  {
    title: 'Monthly Salary',
    dataIndex: 'monthly_salary',
    key: 'monthly_salary',
    sorter: true,
    sortOrder: sortField === 'monthly_salary' && sortOrder,
    render: (value) => (
      <Text strong style={{ color: '#52c41a' }}>
        AED {value?.toLocaleString() || '0'}
      </Text>
    ),
  },
  {
    title: 'Days in Month',
    dataIndex: 'days_in_month',
    key: 'days_in_month',
    sorter: true,
    sortOrder: sortField === 'days_in_month' && sortOrder,
    render: (value) => value || 30,
  },
  {
    title: 'Hours per Day',
    dataIndex: 'hours_per_day',
    key: 'hours_per_day',
    sorter: true,
    sortOrder: sortField === 'hours_per_day' && sortOrder,
    render: (value) => value || 8,
  },
  {
    title: 'Working Days',
    dataIndex: 'working_days',
    key: 'working_days',
    sorter: true,
    sortOrder: sortField === 'working_days' && sortOrder,
  },
  {
    title: 'Basic Pay',
    dataIndex: 'basic_pay',
    key: 'basic_pay',
    sorter: true,
    sortOrder: sortField === 'basic_pay' && sortOrder,
    render: (value) => (
      <Text strong style={{ color: '#52c41a' }}>
        AED {value?.toLocaleString() || '0'}
      </Text>
    ),
  },
  {
    title: 'Overtime Hours',
    dataIndex: 'overtime_hours',
    key: 'overtime_hours',
    sorter: true,
    sortOrder: sortField === 'overtime_hours' && sortOrder,
  },
  {
    title: 'Overtime Pay',
    dataIndex: 'overtime_pay',
    key: 'overtime_pay',
    sorter: true,
    sortOrder: sortField === 'overtime_pay' && sortOrder,
    render: (value) => (
      <Text style={{ color: '#52c41a' }}>
        AED {value?.toLocaleString() || '0'}
      </Text>
    ),
  },
  {
    title: 'Absent Days',
    dataIndex: 'absent_days',
    key: 'absent_days',
    sorter: true,
    sortOrder: sortField === 'absent_days' && sortOrder,
    render: (value) => (
      <Text style={{ color: value > 0 ? '#faad14' : '#333' }}>
        {value || 0} days
      </Text>
    ),
  },
  {
    title: 'Absence Deduction',
    dataIndex: 'absence_deduction',
    key: 'absence_deduction',
    sorter: true,
    sortOrder: sortField === 'absence_deduction' && sortOrder,
    render: (value) => (
      <Text style={{ color: '#ff4d4f' }}>
        AED {value?.toLocaleString() || '0'}
      </Text>
    ),
  },
  {
    title: 'Other Deduction',
    dataIndex: 'other_deduction',
    key: 'other_deduction',
    sorter: true,
    sortOrder: sortField === 'other_deduction' && sortOrder,
    render: (value) => (
      <Text style={{ color: '#ff4d4f' }}>
        AED {value?.toLocaleString() || '0'}
      </Text>
    ),
  },
  {
    title: 'Total Deduction',
    dataIndex: 'total_deduction',
    key: 'total_deduction',
    sorter: true,
    sortOrder: sortField === 'total_deduction' && sortOrder,
    render: (value) => (
      <Text strong style={{ color: '#ff4d4f' }}>
        AED {value?.toLocaleString() || '0'}
      </Text>
    ),
  },
  {
    title: 'Gross Pay',
    dataIndex: 'gross_pay',
    key: 'gross_pay',
    sorter: true,
    sortOrder: sortField === 'gross_pay' && sortOrder,
    render: (value) => (
      <Text strong style={{ color: '#52c41a' }}>
        AED {value?.toLocaleString() || '0'}
      </Text>
    ),
  },
  {
    title: 'Net Pay',
    dataIndex: 'net_pay',
    key: 'net_pay',
    sorter: true,
    sortOrder: sortField === 'net_pay' && sortOrder,
    render: (value) => (
      <Text strong style={{ color: value > 0 ? '#1890ff' : '#ff4d4f' }}>
        AED {value?.toLocaleString() || '0'}
      </Text>
    ),
  },
  {
    title: 'Actions',
    key: 'actions',
    fixed: 'right',
    render: (_, record) => (
      <Space>
        <Tooltip title="Edit">
          <Button 
            icon={<EditOutlined />} 
            size="small" 
            style={{ background: '#1890ff', color: '#fff', borderColor: '#1890ff' }}
            onClick={(e) => {
              e.stopPropagation();
              handleAddEditPayroll(false, record);
            }}
          />
        </Tooltip>
        <Popconfirm
          title="Delete this payroll record?"
          onConfirm={(e) => {
            e.stopPropagation();
            handleDeletePayroll(record.id);
          }}
        >
          <Button 
            icon={<DeleteOutlined />} 
            size="small" 
            danger
            onClick={(e) => e.stopPropagation()}
          />
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
            <Title level={2}>Payroll Management</Title>
          </Col>
          <Col>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => handleAddEditPayroll(true)}
            >
              Add Payroll
            </Button>
          </Col>
        </Row>
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={8}>
            <Statistic title="Total Payroll Records" value={stats.total} prefix={<UserOutlined />} />
          </Col>
          <Col span={8}>
            <Statistic 
              title="Total Gross Pay" 
              value={stats.total_gross_pay} 
              valueStyle={{ color: '#52c41a' }}
              prefix={<UserOutlined />} 
              formatter={value => `AED ${value.toLocaleString()}`}
            />
          </Col>
          <Col span={8}>
            <Statistic 
              title="Total Net Pay" 
              value={stats.total_net_pay} 
              valueStyle={{ color: '#1890ff' }}
              prefix={<UserOutlined />} 
              formatter={value => `AED ${value.toLocaleString()}`}
            />
          </Col>
        </Row>
      </Card>
      <Card style={{ marginTop: 16 }}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search payrolls by name, ID, or position..."
              value={searchText}
              onChange={handleSearchChange}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8} md={6} lg={4}>
            <Button onClick={() => { setSearchText(''); fetchPayrolls(); }}>
              Reset Search
            </Button>
          </Col>
        </Row>
        <Table 
          columns={columns} 
          dataSource={payrolls} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }} // Enable horizontal scrolling for wide tables
          style={{ overflowX: 'auto' }}
          className="excel-table"
        />
      </Card>
      <PayrollForm
        visible={payrollFormVisible}
        onCancel={() => setPayrollFormVisible(false)}
        onSubmit={handlePayrollFormSubmit}
        isEditing={isEditing}
        initialValues={selectedPayroll}
      />
    </div>
  );
};

export default PayrollPage;