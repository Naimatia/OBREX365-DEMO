// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Card, Typography, Table, Input, Button, Row, Col, Space,
  Statistic, Tooltip, message, Popconfirm, DatePicker, Alert, Form
} from 'antd';
import {
  PlusOutlined, SearchOutlined,
  EditOutlined, DeleteOutlined, EyeOutlined,
  CalendarOutlined, TeamOutlined, SortAscendingOutlined, SortDescendingOutlined
} from '@ant-design/icons';
import { db, collection, query, where, getDocs, doc, addDoc, deleteDoc, updateDoc, serverTimestamp } from 'configs/FirebaseConfig';
import { useSelector } from 'react-redux';
import moment from 'moment';
import AttendanceForm from './components/AttendanceForm';
import AttendanceDetail from './components/AttendanceDetail';
import './attendees.css';

const { Title, Text } = Typography;

const AttendancePage = () => {
  const user = useSelector(state => state.auth.user);
  const companyId = user?.company_id || '';

  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({ month_year: null });
  const [attendanceFormVisible, setAttendanceFormVisible] = useState(false);
  const [attendanceDetailVisible, setAttendanceDetailVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('ascend');
  const [stats, setStats] = useState({
    total_employees: 0,
    total_attended: 0,
    total_sick_pto: 0,
    total_unpaid_leave: 0,
    total_holiday_nonwork: 0,
    total_no_show: 0
  });

  const [form] = Form.useForm(); // Form instance for DatePicker

  // Fetch data when companyId or filters change
  useEffect(() => {
    fetchAttendances();
  }, [companyId, filters.month_year]);

  const fetchAttendances = async () => {
    if (!companyId) {
      message.error('No company ID available');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Fetching attendances with filters:', filters);

      const attendancesRef = collection(db, 'attendances');
      let q = query(attendancesRef, where('company_id', '==', companyId));

      // Apply month filter if selected
      if (filters.month_year) {
        console.log('📅 Applying month filter:', filters.month_year);
        q = query(q, where('month_year', '==', filters.month_year.trim()));
      }

      const snapshot = await getDocs(q);
      console.log('📊 Firestore returned', snapshot.size, 'documents');

      let list = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          month_year: data.month_year?.trim() || data.month_year
        };
      });

      // Apply search filter
      if (searchText.trim()) {
        const lower = searchText.toLowerCase().trim();
        list = list.filter(att =>
          att.name?.toLowerCase().includes(lower) ||
          att.department?.toLowerCase().includes(lower)
        );
      }

      // Apply sorting
      if (sortField && sortOrder) {
        list.sort((a, b) => {
          let aVal = a[sortField] || '';
          let bVal = b[sortField] || '';
          if (typeof aVal === 'string') aVal = aVal.toLowerCase();
          if (typeof bVal === 'string') bVal = bVal.toLowerCase();
          if (aVal < bVal) return sortOrder === 'ascend' ? -1 : 1;
          if (aVal > bVal) return sortOrder === 'ascend' ? 1 : -1;
          return 0;
        });
      }

      // Calculate statistics
      const aggregatedStats = list.reduce(
        (acc, att) => ({
          total_employees: list.length,
          total_attended: acc.total_attended + (att.totals?.attended || 0),
          total_sick_pto: acc.total_sick_pto + (att.totals?.sick_pto || 0),
          total_unpaid_leave: acc.total_unpaid_leave + (att.totals?.unpaid_leave || 0),
          total_holiday_nonwork: acc.total_holiday_nonwork + (att.totals?.holiday_nonwork || 0),
          total_no_show: acc.total_no_show + (att.totals?.no_show || 0)
        }),
        {
          total_employees: 0,
          total_attended: 0,
          total_sick_pto: 0,
          total_unpaid_leave: 0,
          total_holiday_nonwork: 0,
          total_no_show: 0
        }
      );

      console.log('✅ Final results:', list.length, 'records');
      setAttendances(list);
      setStats(aggregatedStats);

      if (list.length === 0) {
        if (filters.month_year) {
          message.info(`No attendance records found for ${filters.month_year}`);
        } else {
          message.info('No attendance records found');
        }
      }

    } catch (error) {
      console.error('❌ Error fetching attendances:', error);
      if (error.code === 'failed-precondition') {
        message.error('Missing Firestore index. Please create the required index.');
      } else {
        message.error('Failed to fetch attendances: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchText(e.target.value);
  };

  // Search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchAttendances();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchText]);

  // Simplified month filter handling
  const handleMonthFilterChange = (date, dateString) => {
    console.log('📅 Month filter changed:', dateString);
    setFilters(prev => ({
      ...prev,
      month_year: dateString ? dateString.trim() : null
    }));
  };

  const handleSortChange = (field) => {
    const newOrder = field === sortField && sortOrder === 'ascend' ? 'descend' : 'ascend';
    setSortField(field);
    setSortOrder(newOrder);
  };

  // Re-sort when sort changes
  useEffect(() => {
    if (attendances.length > 0) {
      const sortedAttendances = [...attendances].sort((a, b) => {
        let aVal = a[sortField] || '';
        let bVal = b[sortField] || '';
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        if (aVal < bVal) return sortOrder === 'ascend' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'ascend' ? 1 : -1;
        return 0;
      });
      setAttendances(sortedAttendances);
    }
  }, [sortField, sortOrder]);

  const handleAddEditAttendance = (isAdd = true) => {
    setIsEditing(!isAdd);
    if (isAdd) setSelectedAttendance(null);
    setAttendanceFormVisible(true);
  };

  const handleAttendanceFormSubmit = async (formData) => {
    try {
      const daysInMonth = moment(formData.month_year, 'YYYY-MM').daysInMonth();
      const days = isEditing && selectedAttendance?.days
        ? { ...selectedAttendance.days }
        : Array.from({ length: daysInMonth }, (_, i) => i + 1).reduce((acc, day) => ({ ...acc, [day]: '' }), {});

      const data = {
        ...formData,
        month_year: formData.month_year.trim(),
        days,
        totals: isEditing && selectedAttendance?.totals
          ? { ...selectedAttendance.totals }
          : {
              attended: 0,
              sick_pto: 0,
              unpaid_leave: 0,
              holiday_nonwork: 0,
              no_show: 0,
              attendance_percentage: 0
            },
        company_id: companyId,
        last_update: serverTimestamp(),
        ...(isEditing ? {} : { creation_date: serverTimestamp() }),
      };

      // Check for duplicates
      const attendancesRef = collection(db, 'attendances');
      const q = query(
        attendancesRef,
        where('company_id', '==', companyId),
        where('name', '==', formData.name),
        where('month_year', '==', formData.month_year.trim())
      );
      const snapshot = await getDocs(q);
      const isDuplicate = snapshot.docs.some(doc => !isEditing || doc.id !== selectedAttendance?.id);

      if (isDuplicate) {
        message.error('Attendance record for this employee and month already exists');
        return;
      }

      if (isEditing && selectedAttendance) {
        await updateDoc(doc(db, 'attendances', selectedAttendance.id), data);
        message.success('Attendance updated successfully');
      } else {
        await addDoc(collection(db, 'attendances'), data);
        message.success('Attendance created successfully');
      }

      setAttendanceFormVisible(false);
      setSelectedAttendance(null);
      fetchAttendances();
    } catch (error) {
      console.error('Error saving attendance:', error);
      message.error('Failed to save attendance: ' + error.message);
    }
  };

  const handleDeleteAttendance = async (id) => {
    try {
      await deleteDoc(doc(db, 'attendances', id));
      message.success('Attendance record deleted');
      fetchAttendances();
    } catch (error) {
      console.error('Error deleting:', error);
      message.error('Failed to delete: ' + error.message);
    }
  };

  const handleViewAttendanceDetails = (att) => {
    setSelectedAttendance(att);
    setAttendanceDetailVisible(true);
  };

  const handleResetFilters = () => {
    setFilters({ month_year: null });
    setSearchText('');
    form.resetFields(); // Reset the DatePicker form field
  };

  const columns = [
    {
      title: (
        <div
          onClick={() => handleSortChange('name')}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          Name
          {sortField === 'name' && (
            sortOrder === 'ascend' ? <SortAscendingOutlined /> : <SortDescendingOutlined />
          )}
        </div>
      ),
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => <Text strong>{text} {record.title && `(${record.title})`}</Text>,
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: 'Month/Year',
      dataIndex: 'month_year',
      key: 'month_year',
    },
    {
      title: 'Attendance %',
      key: 'attendance_percentage',
      render: (_, record) => `${((record.totals?.attendance_percentage || 0) * 100).toFixed(1)}%`,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="View/Edit Days">
            <Button
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleViewAttendanceDetails(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => {
                setSelectedAttendance(record);
                handleAddEditAttendance(false);
              }}
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this attendance record?"
            onConfirm={() => handleDeleteAttendance(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="attendance-container">
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Title level={2} style={{ margin: 0 }}>Attendance Management</Title>
          </Col>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAddEditAttendance(true)}>
              Add Attendance Sheet
            </Button>
          </Col>
        </Row>

        {/* Stats Row */}
        <Row gutter={16} style={{ marginTop: 24 }}>
          <Col xs={24} sm={8}>
            <Statistic title="Total Records" value={stats.total_employees} prefix={<TeamOutlined />} />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic title="Total Attended Days" value={stats.total_attended} prefix={<CalendarOutlined />} />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic title="Total Sick/PTO Days" value={stats.total_sick_pto} />
          </Col>
        </Row>
      </Card>

      {/* Filters and Table Card */}
      <Card style={{ marginTop: 16 }}>
        {/* Filters Row */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={12}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search by name or department..."
              value={searchText}
              onChange={handleSearchChange}
              allowClear
            />
          </Col>
          <Col xs={24} md={6}>
            <Form form={form}>
              <Form.Item name="month_year" noStyle>
                <DatePicker
                  picker="month"
                  placeholder="Filter by Month"
                  onChange={handleMonthFilterChange}
                  allowClear
                  format="YYYY-MM"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Form>
          </Col>
          <Col xs={24} md={6}>
            <Button onClick={handleResetFilters} style={{ width: '100%' }}>
              Reset Filters
            </Button>
          </Col>
        </Row>

        {/* Active Filter Indicator */}
        {filters.month_year && (
          <Alert
            message={`Showing records for: ${filters.month_year}`}
            type="info"
            showIcon
            closable
            onClose={() => setFilters({ month_year: null })}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Table */}
        <Table
          columns={columns}
          dataSource={attendances}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} records`
          }}
          locale={{
            emptyText: filters.month_year
              ? `No attendance records found for ${filters.month_year}`
              : 'No attendance records found'
          }}
        />
      </Card>

      {/* Modals */}
      <AttendanceForm
        visible={attendanceFormVisible}
        onCancel={() => {
          setAttendanceFormVisible(false);
          setSelectedAttendance(null);
        }}
        onSubmit={handleAttendanceFormSubmit}
        isEditing={isEditing}
        initialValues={selectedAttendance}
      />

      <AttendanceDetail
        visible={attendanceDetailVisible}
        onClose={() => {
          setAttendanceDetailVisible(false);
          setSelectedAttendance(null);
        }}
        attendance={selectedAttendance}
        onUpdate={(updatedData) => {
          const totals = calculateTotals(updatedData.days);
          updateDoc(doc(db, 'attendances', updatedData.id), {
            days: updatedData.days,
            totals,
            last_update: serverTimestamp()
          });
          fetchAttendances();
          message.success('Daily attendance updated successfully');
        }}
      />
    </div>
  );
};

const calculateTotals = (days) => {
  const totals = {
    attended: 0,
    sick_pto: 0,
    unpaid_leave: 0,
    holiday_nonwork: 0,
    no_show: 0
  };

  Object.values(days).forEach(status => {
    if (status === 'Y') totals.attended++;
    else if (status === 'P') totals.sick_pto++;
    else if (status === 'U') totals.unpaid_leave++;
    else if (status === 'H') totals.holiday_nonwork++;
    else if (status === 'N') totals.no_show++;
  });

  const totalDays = Object.keys(days).length;
  const nonWorkDays = totals.holiday_nonwork;
  totals.attendance_percentage = totalDays > 0 && nonWorkDays < totalDays ? totals.attended / (totalDays - nonWorkDays) : 0;

  return totals;
};

export default AttendancePage;