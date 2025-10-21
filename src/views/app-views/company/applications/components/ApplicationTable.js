import React, { useState } from 'react';
import { 
  Table, 
  Button, 
  Tag, 
  Space, 
  Input, 
  Select, 
  Avatar, 
  Tooltip, 
  Modal, 
  message,
  Row,
  Col,
  DatePicker
} from 'antd';
import { 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined, 
  SearchOutlined,
  UserOutlined,
  LinkOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { confirm } = Modal;

// Status color mapping
const statusColors = {
  'Pending': '#faad14',
  'Reviewed': '#1890ff',
  'Interviewed': '#722ed1',
  'Hired': '#52c41a',
  'Rejected': '#f5222d'
};

// Job positions for filtering
const JobPositions = [
  'Agent', 'Sales', 'Executive Sales', 'Off Plan Sales', 'Ready to Move Sales',
  'Team Manager', 'Sales Manager', 'Marketing Manager', 'Marketing Executive',
  'Admin', 'Support', 'Accountant', 'HR', 'Other'
];

const ApplicationTable = ({ 
  applications, 
  loading, 
  onEdit, 
  onDelete, 
  onStatusChange, 
  onViewDetails 
}) => {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobFilter, setJobFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null);

  // Filter applications based on search criteria
  const filteredApplications = applications.filter(application => {
    // Text search filter
    const searchMatch = !searchText || 
      application.firstname?.toLowerCase().includes(searchText.toLowerCase()) ||
      application.lastname?.toLowerCase().includes(searchText.toLowerCase()) ||
      application.Job?.toLowerCase().includes(searchText.toLowerCase()) ||
      application.email?.toLowerCase().includes(searchText.toLowerCase());

    // Status filter
    const statusMatch = statusFilter === 'all' || application.Status === statusFilter;

    // Job filter
    const jobMatch = jobFilter === 'all' || application.Job === jobFilter;

    // Date range filter
    let dateMatch = true;
    if (dateRange && dateRange.length === 2) {
      const applicationDate = moment(application.ApplicantDate);
      dateMatch = applicationDate.isBetween(dateRange[0], dateRange[1], 'day', '[]');
    }

    return searchMatch && statusMatch && jobMatch && dateMatch;
  });

  // Handle status change
  const handleStatusChange = (applicationId, newStatus) => {
    onStatusChange(applicationId, newStatus);
  };

  // Handle delete confirmation
  const handleDelete = (application) => {
    confirm({
      title: 'Delete Application',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete the application for ${application.firstname} ${application.lastname}?`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        onDelete(application.id);
      },
    });
  };

  // Open CV URL in new tab
  const handleViewCV = (cvUrl) => {
    if (cvUrl) {
      window.open(cvUrl, '_blank');
    } else {
      message.info('No CV URL provided for this application');
    }
  };

  // Table columns configuration
  const columns = [
    {
      title: 'Applicant',
      key: 'applicant',
      width: 200,
      render: (_, record) => (
        <Space>
          <Avatar 
            style={{ 
              backgroundColor: statusColors[record.Status] || '#1890ff',
              color: '#fff'
            }}
            icon={<UserOutlined />}
          >
            {record.firstname?.[0]}{record.lastname?.[0]}
          </Avatar>
          <div>
            <div style={{ fontWeight: 'bold' }}>
              {record.firstname} {record.lastname}
            </div>
            {record.email && (
              <div style={{ fontSize: '12px', color: '#666' }}>
                {record.email}
              </div>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Job Position',
      dataIndex: 'Job',
      key: 'job',
      width: 150,
      render: (job) => (
        <Tag color="blue" style={{ borderRadius: '6px' }}>
          {job}
        </Tag>
      ),
    },
 {
    title: 'Status',
    dataIndex: 'Status',
    key: 'status',
    width: 120,
    render: (status, record) => (
      <Select
        value={status}
        size="small"
        bordered={false}
        dropdownStyle={{ padding: 0 }}
        style={{
          width: '100%',
          height: 32,
          backgroundColor: statusColors[status],
          color: 'white',
          fontWeight: '500',
          textAlign: 'center',
          borderRadius: 6,
        }}
        onChange={(newStatus) => handleStatusChange(record.id, newStatus)}
        optionLabelProp="label"
      >
        {Object.keys(statusColors).map((key) => (
          <Option
            key={key}
            value={key}
            label={
              <div
                style={{
                  backgroundColor: statusColors[key],
                  color: 'white',
                  fontWeight: 500,
                  textAlign: 'center',
                  padding: '4px 0',
                  borderRadius: 6,
                }}
              >
                {key}
              </div>
            }
          >
            <div
              style={{
                backgroundColor: statusColors[key],
                color: 'white',
                fontWeight: 500,
                textAlign: 'center',
                padding: '6px 0',
                borderRadius: 6,
              }}
            >
              {key}
            </div>
          </Option>
        ))}
      </Select>
    ),
  },
    {
      title: 'Application Date',
      dataIndex: 'ApplicantDate',
      key: 'date',
      width: 120,
      render: (date) => (
        <span>
          {moment(date).format('MMM DD, YYYY')}
        </span>
      ),
      sorter: (a, b) => moment(a.ApplicantDate).unix() - moment(b.ApplicantDate).unix(),
    },
    {
      title: 'Last Updated',
      dataIndex: 'LastUpdate',
      key: 'lastUpdate',
      width: 120,
      render: (date) => (
        <span style={{ fontSize: '12px', color: '#666' }}>
          {moment(date).fromNow()}
        </span>
      ),
      sorter: (a, b) => moment(a.LastUpdate).unix() - moment(b.LastUpdate).unix(),
    },
    {
      title: 'CV',
      key: 'cv',
      width: 80,
      render: (_, record) => (
        <Tooltip title={record.CVUrl ? 'View CV' : 'No CV provided'}>
          <Button
            type="text"
            size="small"
            icon={<LinkOutlined />}
            onClick={() => handleViewCV(record.CVUrl)}
            disabled={!record.CVUrl}
            style={{
              color: record.CVUrl ? '#1890ff' : '#d9d9d9'
            }}
          />
        </Tooltip>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onViewDetails(record)}
              style={{ color: '#1890ff' }}
            />
          </Tooltip>
          <Tooltip title="Edit Application">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
              style={{ color: '#52c41a' }}
            />
          </Tooltip>
          <Tooltip title="Delete Application">
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
              style={{ color: '#ff4d4f' }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="application-table">
      {/* Filters Section */}
      <div style={{ marginBottom: '16px' }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Input
              placeholder="Search applicants..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              placeholder="Filter by Status"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
            >
              <Option value="all">All Statuses</Option>
              <Option value="Pending">Pending</Option>
              <Option value="Reviewed">Reviewed</Option>
              <Option value="Interviewed">Interviewed</Option>
              <Option value="Hired">Hired</Option>
              <Option value="Rejected">Rejected</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={5}>
            <Select
              placeholder="Filter by Job"
              value={jobFilter}
              onChange={setJobFilter}
              style={{ width: '100%' }}
            >
              <Option value="all">All Positions</Option>
              {JobPositions.map(job => (
                <Option key={job} value={job}>{job}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              value={dateRange}
              onChange={setDateRange}
              placeholder={['Start Date', 'End Date']}
            />
          </Col>
          <Col xs={24} sm={12} md={3}>
            <Button
              onClick={() => {
                setSearchText('');
                setStatusFilter('all');
                setJobFilter('all');
                setDateRange(null);
              }}
            >
              Clear Filters
            </Button>
          </Col>
        </Row>
      </div>

      {/* Results Summary */}
      <div style={{ marginBottom: '16px', color: '#666' }}>
        Showing {filteredApplications.length} of {applications.length} applications
      </div>

      {/* Applications Table */}
      <Table
        columns={columns}
        dataSource={filteredApplications}
        rowKey="id"
        loading={loading}
        pagination={{
          total: filteredApplications.length,
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} applications`,
        }}
        scroll={{ x: 1000 }}
        size="middle"
        rowClassName={(record) => {
          // Highlight recently updated applications
          const isRecent = moment().diff(moment(record.LastUpdate), 'hours') < 24;
          return isRecent ? 'ant-table-row-recent' : '';
        }}
      />

    </div>
  );
};

export default ApplicationTable;
