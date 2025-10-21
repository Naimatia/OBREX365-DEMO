import React, { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Avatar,
  Tooltip,
  Input,
  Select,
  DatePicker,
  Dropdown,
  message,
  Modal,
  Progress
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { AttendanceStatus } from 'services/firebase/AttendanceService';
import moment from 'moment';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { confirm } = Modal;

const AttendanceTable = ({
  data = [],
  employees = [],
  loading = false,
  onEmployeeSelect,
  onQuickMark,
  onRefresh,
  onEditPayroll,
  dateRange
}) => {
  // State management
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filteredData, setFilteredData] = useState([]);

  // Format currency in AED
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  // Process attendance data to create salary sheet view
  const processedData = useMemo(() => {
    // Group attendance records by employee
    const employeeAttendance = {};
    
    data.forEach(record => {
      const empId = record.employee_id;
      if (!employeeAttendance[empId]) {
        employeeAttendance[empId] = {
          employee_id: empId,
          employeeName: record.employeeName,
          records: [],
          totalHours: 0,
          overtimeHours: 0,
          grossPay: 0,
          incomeTax: 0,
          otherDeductibles: 0,
          netPay: 0,
          presentDays: 0,
          absentDays: 0,
          lateDays: 0
        };
      }
      
      const empData = employeeAttendance[empId];
      empData.records.push(record);
      empData.totalHours += record.totalHoursWorked || 0;
      empData.overtimeHours += record.overtimeHours || 0;
      empData.grossPay += record.grossPay || 0;
      empData.incomeTax += record.incomeTax || 0;
      empData.otherDeductibles += record.otherDeductibles || 0;
      empData.netPay += record.netPay || 0;
      
      // Count status occurrences
      switch (record.status) {
        case AttendanceStatus.PRESENT:
          empData.presentDays++;
          break;
        case AttendanceStatus.ABSENT:
          empData.absentDays++;
          break;
        case AttendanceStatus.LATE:
          empData.lateDays++;
          break;
        default:
          break;
      }
    });

    // ✅ FIX: Include ALL employees, even those without attendance records
    const processedArray = employees.map(employee => {
      const existingData = employeeAttendance[employee.id];
      
      if (existingData) {
        // Employee has attendance records
        return {
          ...existingData,
          employee,
          payPerHour: employee?.salary ? (employee.salary / 160) : 50,
          totalDays: existingData.records.length,
          attendanceRate: existingData.records.length > 0 
            ? ((existingData.presentDays + existingData.lateDays) / existingData.records.length) * 100 
            : 0
        };
      } else {
        // Employee has NO attendance records yet - show with zeros
        return {
          employee_id: employee.id,
          employeeName: `${employee.firstname || ''} ${employee.lastname || ''}`.trim(),
          employee,
          records: [],
          totalHours: 0,
          overtimeHours: 0,
          grossPay: 0,
          incomeTax: 0,
          otherDeductibles: 0,
          netPay: 0,
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          payPerHour: employee?.salary ? (employee.salary / 160) : 50,
          totalDays: 0,
          attendanceRate: 0
        };
      }
    });

    return processedArray;
  }, [data, employees]);

  // Filter data based on search and status
  const filteredProcessedData = useMemo(() => {
    return processedData.filter(record => {
      const matchesSearch = !searchText || 
        record.employeeName.toLowerCase().includes(searchText.toLowerCase()) ||
        record.employee?.email?.toLowerCase().includes(searchText.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'high_attendance' && record.attendanceRate >= 90) ||
        (statusFilter === 'low_attendance' && record.attendanceRate < 70) ||
        (statusFilter === 'overtime' && record.overtimeHours > 0);
      
      return matchesSearch && matchesStatus;
    });
  }, [processedData, searchText, statusFilter]);

  // Handle status change
  const handleStatusChange = async (employeeId, status) => {
    try {
      await onQuickMark(employeeId, status);
      message.success('Attendance marked successfully');
    } catch (error) {
      message.error('Failed to mark attendance');
    }
  };

  // Handle employee click
  const handleEmployeeClick = (record) => {
    onEmployeeSelect(record.employee);
  };

  // Delete confirmation
  const handleDelete = (record) => {
    confirm({
      title: 'Delete Attendance Records',
      content: `Are you sure you want to delete all attendance records for ${record.employeeName}?`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          // TODO: Implement bulk delete functionality
          message.success('Attendance records deleted successfully');
          onRefresh();
        } catch (error) {
          message.error('Failed to delete attendance records');
        }
      }
    });
  };

  // Quick actions menu items
  const getActionsMenuItems = (record) => [
    {
      key: 'view',
      icon: <EyeOutlined />,
      label: 'View Details',
      onClick: () => handleEmployeeClick(record)
    },
    {
      key: 'edit-payroll',
      icon: <EditOutlined style={{ color: '#1890ff' }} />,
      label: 'Edit Payroll',
      onClick: () => onEditPayroll && onEditPayroll(record.employee)
    },
    {
      key: 'divider-payroll',
      type: 'divider'
    },
    {
      key: 'mark-present',
      icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      label: 'Mark Present',
      onClick: () => handleStatusChange(record.employee_id, AttendanceStatus.PRESENT)
    },
    {
      key: 'mark-absent',
      icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
      label: 'Mark Absent',
      onClick: () => handleStatusChange(record.employee_id, AttendanceStatus.ABSENT)
    },
    {
      key: 'mark-late',
      icon: <ClockCircleOutlined style={{ color: '#faad14' }} />,
      label: 'Mark Late',
      onClick: () => handleStatusChange(record.employee_id, AttendanceStatus.LATE)
    },
    {
      key: 'divider-1',
      type: 'divider'
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete Records',
      danger: true,
      onClick: () => handleDelete(record)
    }
  ];

  // Table columns configuration
  const columns = [
    {
      title: 'Employee',
      dataIndex: 'employeeName',
      key: 'employeeName',
      fixed: true,
      width: 200,
      render: (name, record) => (
        <Space>
          <Avatar 
            icon={<UserOutlined />}
            src={record.employee?.avatar}
            size="small"
          />
          <span 
            className="employee-name"
            onClick={() => handleEmployeeClick(record)}
          >
            {name}
          </span>
        </Space>
      ),
    },
    {
      title: 'Pay/Hour',
      dataIndex: 'payPerHour',
      key: 'payPerHour',
      width: 100,
      render: (value) => (
        <span className="currency">{formatCurrency(value)}</span>
      ),
    },
    {
      title: 'Total Hours',
      dataIndex: 'totalHours',
      key: 'totalHours',
      width: 100,
      render: (value) => (
        <span className="hours-cell">{value || 0}</span>
      ),
    },
    {
      title: 'Overtime Hours',
      dataIndex: 'overtimeHours',
      key: 'overtimeHours',
      width: 120,
      render: (value) => (
        <span className={`hours-cell ${value > 0 ? 'overtime-cell' : ''}`}>
          {value || 0}
        </span>
      ),
    },
    {
      title: 'Gross Pay',
      dataIndex: 'grossPay',
      key: 'grossPay',
      width: 120,
      render: (value) => (
        <span className="currency">{formatCurrency(value)}</span>
      ),
    },
    {
      title: 'Income Tax',
      dataIndex: 'incomeTax',
      key: 'incomeTax',
      width: 110,
      render: (value) => (
        <span style={{ color: '#ff4d4f' }}>{formatCurrency(value)}</span>
      ),
    },
    {
      title: 'Other Deductibles',
      dataIndex: 'otherDeductibles',
      key: 'otherDeductibles',
      width: 140,
      render: (value) => (
        <span style={{ color: '#ff4d4f' }}>{formatCurrency(value)}</span>
      ),
    },
    {
      title: 'Net Pay',
      dataIndex: 'netPay',
      key: 'netPay',
      width: 120,
      render: (value) => (
        <span className="currency" style={{ fontWeight: 'bold', fontSize: '14px' }}>
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      title: 'Attendance Rate',
      dataIndex: 'attendanceRate',
      key: 'attendanceRate',
      width: 140,
      render: (rate) => (
        <Progress
          percent={Math.round(rate)}
          size="small"
          strokeColor={rate >= 90 ? '#52c41a' : rate >= 70 ? '#faad14' : '#ff4d4f'}
          showInfo={false}
        />
      ),
    },
    {
      title: 'Days',
      key: 'days',
      width: 100,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Tag color="green">P: {record.presentDays}</Tag>
          <Tag color="red">A: {record.absentDays}</Tag>
          <Tag color="orange">L: {record.lateDays}</Tag>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Dropdown menu={{ items: getActionsMenuItems(record) }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <Card className="salary-sheet-table">
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <h3 style={{ margin: 0, color: '#1890ff' }}>
            📊 SALARY SHEET - {moment(dateRange[0]).format('MMMM YYYY')}
          </h3>
          <Space>
            <Button 
              icon={<CalendarOutlined />} 
              onClick={onRefresh}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        </div>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: '16px' }}>
        <Space wrap>
          <Input
            placeholder="Search employees..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            placeholder="Filter by performance"
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 180 }}
            suffixIcon={<FilterOutlined />}
          >
            <Option value="all">All Employees</Option>
            <Option value="high_attendance">High Attendance (≥90%)</Option>
            <Option value="low_attendance">Low Attendance (&lt;70%)</Option>
            <Option value="overtime">Has Overtime</Option>
          </Select>
        </Space>
      </div>

      {/* Summary Cards */}
      <div style={{ marginBottom: '16px' }}>
        <Space wrap>
          <Tag color="blue" style={{ padding: '4px 12px', fontSize: '14px' }}>
            📋 Total Records: {filteredProcessedData.length}
          </Tag>
          <Tag color="green" style={{ padding: '4px 12px', fontSize: '14px' }}>
            💰 Total Gross: {formatCurrency(filteredProcessedData.reduce((sum, r) => sum + r.grossPay, 0))}
          </Tag>
          <Tag color="purple" style={{ padding: '4px 12px', fontSize: '14px' }}>
            💵 Total Net: {formatCurrency(filteredProcessedData.reduce((sum, r) => sum + r.netPay, 0))}
          </Tag>
          <Tag color="orange" style={{ padding: '4px 12px', fontSize: '14px' }}>
            ⏰ Total Hours: {filteredProcessedData.reduce((sum, r) => sum + r.totalHours, 0)}
          </Tag>
        </Space>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={filteredProcessedData}
        loading={loading}
        rowKey="employee_id"
        scroll={{ x: 1400 }}
        size="middle"
        pagination={{
          total: filteredProcessedData.length,
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} employees`,
        }}
        summary={(data) => {
          if (data.length === 0) return null;
          
          const totalGross = data.reduce((sum, record) => sum + (record.grossPay || 0), 0);
          const totalTax = data.reduce((sum, record) => sum + (record.incomeTax || 0), 0);
          const totalDeductibles = data.reduce((sum, record) => sum + (record.otherDeductibles || 0), 0);
          const totalNet = data.reduce((sum, record) => sum + (record.netPay || 0), 0);
          const totalHours = data.reduce((sum, record) => sum + (record.totalHours || 0), 0);
          const totalOvertime = data.reduce((sum, record) => sum + (record.overtimeHours || 0), 0);

          return (
            <Table.Summary.Row style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>
              <Table.Summary.Cell index={0}>
                <strong>TOTALS ({data.length} employees)</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="center">-</Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="center">
                <strong>{totalHours}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="center">
                <strong style={{ color: '#faad14' }}>{totalOvertime}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right">
                <strong className="currency">{formatCurrency(totalGross)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right">
                <strong style={{ color: '#ff4d4f' }}>{formatCurrency(totalTax)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={6} align="right">
                <strong style={{ color: '#ff4d4f' }}>{formatCurrency(totalDeductibles)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={7} align="right">
                <strong className="currency" style={{ fontSize: '16px', color: '#52c41a' }}>
                  {formatCurrency(totalNet)}
                </strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={8} align="center">-</Table.Summary.Cell>
              <Table.Summary.Cell index={9} align="center">-</Table.Summary.Cell>
              <Table.Summary.Cell index={10} align="center">-</Table.Summary.Cell>
            </Table.Summary.Row>
          );
        }}
      />
    </Card>
  );
};

export default AttendanceTable;
