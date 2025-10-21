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
  message
} from 'antd';
import { 
  EyeOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SearchOutlined, 
  FilterOutlined,
  FileTextOutlined,
  MoreOutlined,
  ExclamationCircleOutlined,
  WhatsAppOutlined,
  MailOutlined,
  DollarOutlined,
  StarOutlined,
  ShareAltOutlined
} from '@ant-design/icons';
import { LeadStatus, LeadInterestLevel } from 'models/LeadModel';
import moment from 'moment';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { confirm } = Modal;

/**
 * LeadList component for sellers to view and manage their leads
 */
const SellerLeadList = ({ 
  leads, 
  loading, 
  onViewLead, 
  onEditLead, 
  onDeleteLead,
  onUpdateStatus,
  onAddNote
}) => {
  const [searchText, setSearchText] = useState('');
  const [filteredStatus, setFilteredStatus] = useState(null);
  const [filteredInterest, setFilteredInterest] = useState(null);
  const [dateRange, setDateRange] = useState(null);

  // Filter leads based on search and filters
  const filteredLeads = useMemo(() => {
    let filtered = [...leads];

    // Search filter
    if (searchText) {
      filtered = filtered.filter(lead =>
        lead.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchText.toLowerCase()) ||
        lead.phoneNumber?.includes(searchText) ||
        lead.region?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Status filter
    if (filteredStatus) {
      filtered = filtered.filter(lead => lead.status === filteredStatus);
    }

    // Interest level filter
    if (filteredInterest) {
      filtered = filtered.filter(lead => lead.InterestLevel === filteredInterest);
    }

    // Date range filter
    if (dateRange && dateRange.length === 2) {
      filtered = filtered.filter(lead => {
        if (!lead.CreationDate) return false;
        const leadDate = moment(lead.CreationDate);
        return leadDate.isBetween(dateRange[0], dateRange[1], 'day', '[]');
      });
    }

    return filtered;
  }, [leads, searchText, filteredStatus, filteredInterest, dateRange]);

  // Handle delete confirmation
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

  // Handle status update
  const handleStatusUpdate = (lead, newStatus) => {
    onUpdateStatus(lead.id, newStatus);
  };

  // Handle communication actions
  const handleSendEmail = (lead) => {
    if (lead.email) {
      const subject = `Follow up - ${lead.name}`;
      const body = `Hi ${lead.name},\n\nI wanted to follow up with you regarding your inquiry from ${lead.RedirectedFrom}.\n\nBest regards`;
      window.open(`mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    } else {
      message.warning('No email address available');
    }
  };

  const handleSendWhatsApp = (lead) => {
    if (lead.phoneNumber) {
      const cleanPhone = lead.phoneNumber.replace(/[\s\-\(\)]/g, '');
      const message = `Hi ${lead.name}, I wanted to follow up with you regarding your inquiry from ${lead.RedirectedFrom}.`;
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      message.warning('No phone number available');
    }
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

  // Table columns
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
      render: (text, record) => (
        <Button type="link" onClick={() => onViewLead(record)} style={{ padding: 0 }}>
          {text || 'Unknown'}
        </Button>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          {record.email && (
            <Space>
              <span style={{ fontSize: '12px' }}>{record.email}</span>
              <Tooltip title="Send Email">
                <Button 
                  type="text" 
                  size="small" 
                  icon={<MailOutlined />}
                  onClick={() => handleSendEmail(record)}
                />
              </Tooltip>
            </Space>
          )}
          {record.phoneNumber && (
            <Space>
              <span style={{ fontSize: '12px' }}>{record.phoneNumber}</span>
              <Tooltip title="WhatsApp">
                <Button 
                  type="text" 
                  size="small" 
                  icon={<WhatsAppOutlined />}
                  onClick={() => handleSendWhatsApp(record)}
                  style={{ color: '#25D366' }}
                />
              </Tooltip>
            </Space>
          )}
        </Space>
      ),
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
      render: (source) => source ? (
        <Space>
          <span>{getSourceIcon(source)}</span>
          <span>{source}</span>
        </Space>
      ) : '-',
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
        switch (level) {
          case LeadInterestLevel.HIGH:
            return <Tag color="red">High</Tag>;
          case LeadInterestLevel.MEDIUM:
            return <Tag color="orange">Medium</Tag>;
          case LeadInterestLevel.LOW:
            return <Tag color="blue">Low</Tag>;
          default:
            return level ? <Tag color="default">{level}</Tag> : '-';
        }
      },
    },
    {
      title: 'Budget',
      dataIndex: 'Budget',
      key: 'budget',
      render: (budget) => budget ? (
        <Space>
          <DollarOutlined />
          <span>{budget.toLocaleString()}</span>
        </Space>
      ) : '-',
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
        let color = 'default';
        switch (status) {
          case LeadStatus.PENDING:
            color = 'orange';
            break;
          case LeadStatus.GAIN:
            color = 'green';
            break;
          case LeadStatus.LOSS:
            color = 'red';
            break;
        }
        
        return (
          <Dropdown 
            menu={{
              items: [
                {
                  key: LeadStatus.PENDING,
                  label: <Tag color="orange">Pending</Tag>,
                  onClick: () => handleStatusUpdate(record, LeadStatus.PENDING)
                },
                {
                  key: LeadStatus.GAIN,
                  label: <Tag color="green">Gain</Tag>,
                  onClick: () => handleStatusUpdate(record, LeadStatus.GAIN)
                },
                {
                  key: LeadStatus.LOSS,
                  label: <Tag color="red">Loss</Tag>,
                  onClick: () => handleStatusUpdate(record, LeadStatus.LOSS)
                }
              ]
            }}
            trigger={['click']}
          >
            <Tag color={color} style={{ cursor: 'pointer' }}>
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
      render: (date) => date ? moment(date).format('MMM DD, YYYY') : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Dropdown 
          menu={{
            items: [
              {
                key: 'view',
                icon: <EyeOutlined />,
                label: 'View Details',
                onClick: () => onViewLead(record)
              },
              {
                key: 'edit',
                icon: <EditOutlined />,
                label: 'Edit',
                onClick: () => onEditLead(record)
              },
              {
                key: 'note',
                icon: <FileTextOutlined />,
                label: 'Quick Note',
                onClick: () => {
                  const note = prompt('Enter note:');
                  if (note && note.trim()) {
                    onAddNote(record.id, note.trim());
                  }
                }
              },
              {
                type: 'divider'
              },
              {
                key: 'delete',
                icon: <DeleteOutlined />,
                label: 'Delete',
                danger: true,
                onClick: () => handleDelete(record)
              }
            ]
          }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  // Clear all filters
  const clearFilters = () => {
    setSearchText('');
    setFilteredStatus(null);
    setFilteredInterest(null);
    setDateRange(null);
  };

  return (
    <div>
      {/* Filters */}
      <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
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
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} leads`,
        }}
        scroll={{ x: 1000 }}
      />
    </div>
  );
};

export default SellerLeadList;
