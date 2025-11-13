// @ts-nocheck
import React, { useState, useMemo } from 'react';
import {
  Table,
  Tag,
  Space,
  Button,
  Tooltip,
  Input,
  Select,
  DatePicker,
  Dropdown,
  Modal,
  message,
} from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  FilterOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { LeadStatus, LeadInterestLevel } from 'models/LeadModel';
import moment from 'moment';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { confirm } = Modal;

/**
 * SellerLeadList – Clean, interactive, row-clickable lead table
 */
const SellerLeadList = ({
  leads,
  loading,
  onViewLead,
  onEditLead,
  onDeleteLead,
  onUpdateStatus,
  onAddNote,
}) => {
  const [searchText, setSearchText] = useState('');
  const [filteredStatus, setFilteredStatus] = useState(null);
  const [filteredInterest, setFilteredInterest] = useState(null);
  const [dateRange, setDateRange] = useState(null);

  // Filter leads
  const filteredLeads = useMemo(() => {
    let filtered = [...leads];

    if (searchText) {
      filtered = filtered.filter(
        (lead) =>
          lead.name?.toLowerCase().includes(searchText.toLowerCase()) ||
          lead.email?.toLowerCase().includes(searchText.toLowerCase()) ||
          lead.phoneNumber?.includes(searchText) ||
          lead.region?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (filteredStatus) {
      filtered = filtered.filter((lead) => lead.status === filteredStatus);
    }

    if (filteredInterest) {
      filtered = filtered.filter((lead) => lead.InterestLevel === filteredInterest);
    }

    if (dateRange && dateRange.length === 2) {
      filtered = filtered.filter((lead) => {
        if (!lead.CreationDate) return false;
        const leadDate = moment(lead.CreationDate);
        return leadDate.isBetween(dateRange[0], dateRange[1], 'day', '[]');
      });
    }

    return filtered;
  }, [leads, searchText, filteredStatus, filteredInterest, dateRange]);

  // Delete confirmation
  const handleDelete = (lead) => {
    confirm({
      title: 'Delete Lead',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete "${lead.name}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        onDeleteLead(lead.id);
      },
    });
  };

  // Status update
  const handleStatusUpdate = (lead, newStatus) => {
    onUpdateStatus(lead.id, newStatus);
  };

// Get source icon
  const getSourceIcon = (source) => {
    switch (source?.toLowerCase()) {
      case 'facebook':
        return '📘';
      case 'instagram':
        return '📷';
      case 'website':
        return '🌐';
      case 'linkedin':
        return '💼';
      case 'tiktok':
        return '🎵';
      case 'freelance':
        return '💪';
      default:
        return '🔗';
    }
  };

  // Table Columns
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
      render: (text) => <strong>{text || 'Unknown'}</strong>,
    },
    {
      title: 'Region',
      dataIndex: 'region',
      key: 'region',
      render: (text) => text || '-',
    },
    {
      title: 'Source',
      dataIndex: 'RedirectedFrom',
      key: 'source',
      render: (source) =>
        source ? (
          <Space>
            <span>{getSourceIcon(source)}</span>
            <span>{source}</span>
          </Space>
        ) : (
          '-'
        ),
    },
    {
      title: 'Interest',
      dataIndex: 'InterestLevel',
      key: 'interest',
      filters: [
        { text: 'High', value: LeadInterestLevel.HIGH },
        { text: 'Medium', value: LeadInterestLevel.MEDIUM },
        { text: 'Low', value: LeadInterestLevel.LOW },
      ],
      render: (level) => {
        const map = {
          [LeadInterestLevel.HIGH]: { color: 'red', text: 'High' },
          [LeadInterestLevel.MEDIUM]: { color: 'orange', text: 'Medium' },
          [LeadInterestLevel.LOW]: { color: 'blue', text: 'Low' },
        };
        const { color, text } = map[level] || { color: 'default', text: level };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: 'Budget',
      dataIndex: 'Budget',
      key: 'budget',
      render: (budget) =>
        budget ? (
          <Space>
            <DollarOutlined />
            <span>{budget.toLocaleString()}</span>
          </Space>
        ) : (
          '-'
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: 'Pending', value: LeadStatus.PENDING },
        { text: 'Gain', value: LeadStatus.GAIN },
        { text: 'Loss', value: LeadStatus.LOSS },
      ],
      render: (status, record) => {
        const colorMap = {
          [LeadStatus.PENDING]: 'orange',
          [LeadStatus.GAIN]: 'green',
          [LeadStatus.LOSS]: 'red',
        };
        return (
          <Dropdown
            menu={{
              items: Object.values(LeadStatus).map((s) => ({
                key: s,
                label: <Tag color={colorMap[s]}>{s}</Tag>,
                onClick: () => handleStatusUpdate(record, s),
              })),
            }}
            trigger={['click']}
          >
            <Tag color={colorMap[status]} style={{ cursor: 'pointer' }}>
              {status || 'Unknown'}
            </Tag>
          </Dropdown>
        );
      },
    },
    {
      title: 'Created',
      dataIndex: 'CreationDate',
      key: 'created',
      sorter: (a, b) => {
        if (!a.CreationDate || !b.CreationDate) return 0;
        return moment(a.CreationDate).unix() - moment(b.CreationDate).unix();
      },
      render: (date) => (date ? moment(date).format('MMM DD, YYYY') : '-'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onViewLead(record);
              }}
            />
          </Tooltip>

          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onEditLead(record);
              }}
            />
          </Tooltip>

          <Tooltip title="Quick Note">
            <Button
              type="text"
              size="small"
              icon={<FileTextOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                const note = prompt('Enter note:');
                if (note?.trim()) onAddNote(record.id, note.trim());
              }}
            />
          </Tooltip>

         {/**
          * <Tooltip title="Delete">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(record);
              }}
            />
          </Tooltip>
          */} 
        </Space>
      ),
    },
  ];

  // Clear filters
  const clearFilters = () => {
    setSearchText('');
    setFilteredStatus(null);
    setFilteredInterest(null);
    setDateRange(null);
  };

  return (
    <div>
      {/* Filter Bar */}
      <Space
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        <Space wrap>
          <Search
            placeholder="Search leads..."
            allowClear
            style={{ width: 250 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />

          <Select
            placeholder="Filter by status"
            allowClear
            style={{ width: 150 }}
            value={filteredStatus}
            onChange={setFilteredStatus}
          >
            <Option value={LeadStatus.PENDING}>Pending</Option>
            <Option value={LeadStatus.GAIN}>Gain</Option>
            <Option value={LeadStatus.LOSS}>Loss</Option>
          </Select>

          <Select
            placeholder="Filter by interest"
            allowClear
            style={{ width: 150 }}
            value={filteredInterest}
            onChange={setFilteredInterest}
          >
            <Option value={LeadInterestLevel.HIGH}>High Interest</Option>
            <Option value={LeadInterestLevel.MEDIUM}>Medium Interest</Option>
            <Option value={LeadInterestLevel.LOW}>Low Interest</Option>
          </Select>

          <RangePicker
            placeholder={['Start Date', 'End Date']}
            value={dateRange}
            onChange={setDateRange}
            style={{ width: 250 }}
          />

          <Button onClick={clearFilters} icon={<FilterOutlined />}>
            Clear Filters
          </Button>
        </Space>

        <Space>
          <span style={{ color: '#8c8c8c' }}>
            Total: {filteredLeads.length} leads
          </span>
        </Space>
      </Space>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={filteredLeads}
        rowKey="id"
        loading={loading}
        pagination={{
          total: filteredLeads.length,
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} leads`,
        }}
        scroll={{ x: 1000 }}
        onRow={(record) => ({
          onClick: () => onViewLead(record),
          style: { cursor: 'pointer' },
        })}
        rowClassName="clickable-row"
      />
    </div>
  );
};

export default SellerLeadList;