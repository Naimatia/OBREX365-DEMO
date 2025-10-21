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
  Menu,
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
  PhoneOutlined
} from '@ant-design/icons';
import { ContactStatus } from 'models/ContactModel';
import moment from 'moment';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { confirm } = Modal;

/**
 * ContactList component for sellers to view and manage their contacts
 */
const SellerContactList = ({ 
  contacts, 
  loading, 
  onViewContact, 
  onEditContact, 
  onDeleteContact,
  onUpdateStatus,
  onAddNote
}) => {
  const [searchText, setSearchText] = useState('');
  const [filteredStatus, setFilteredStatus] = useState(null);
  const [dateRange, setDateRange] = useState(null);

  // Filter contacts based on search and filters
  const filteredContacts = useMemo(() => {
    let filtered = [...contacts];

    // Search filter
    if (searchText) {
      filtered = filtered.filter(contact =>
        contact.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchText.toLowerCase()) ||
        contact.phoneNumber?.includes(searchText)
      );
    }

    // Status filter
    if (filteredStatus) {
      filtered = filtered.filter(contact => contact.status === filteredStatus);
    }

    // Date range filter
    if (dateRange && dateRange.length === 2) {
      filtered = filtered.filter(contact => {
        if (!contact.AffectingDate) return false;
        const contactDate = moment(contact.AffectingDate);
        return contactDate.isBetween(dateRange[0], dateRange[1], 'day', '[]');
      });
    }

    return filtered;
  }, [contacts, searchText, filteredStatus, dateRange]);

  // Handle delete confirmation
  const handleDelete = (contact) => {
    confirm({
      title: 'Delete Contact',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete "${contact.name}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        onDeleteContact(contact.id);
      },
    });
  };

  // Handle status update with contact info
  const handleStatusUpdate = (contact, newStatus) => {
    onUpdateStatus(contact.id, newStatus);
  };

  // Handle quick actions
  const handleSendEmail = (contact) => {
    if (contact.email) {
      const subject = `Follow up - ${contact.name}`;
      const body = `Hi ${contact.name},\n\nI wanted to follow up with you.\n\nBest regards`;
      window.open(`mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    } else {
      message.warning('No email address available');
    }
  };

  const handleSendWhatsApp = (contact) => {
    if (contact.phoneNumber) {
      const cleanPhone = contact.phoneNumber.replace(/[\s\-\(\)]/g, '');
      const message = `Hi ${contact.name}, I wanted to follow up with you regarding your inquiry.`;
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      message.warning('No phone number available');
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
        <Button type="link" onClick={() => onViewContact(record)} style={{ padding: 0 }}>
          {text || 'Unknown'}
        </Button>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (text, record) => text ? (
        <Space>
          <span>{text}</span>
          <Tooltip title="Send Email">
            <Button 
              type="text" 
              size="small" 
              icon={<MailOutlined />}
              onClick={() => handleSendEmail(record)}
            />
          </Tooltip>
        </Space>
      ) : '-',
    },
    {
      title: 'Phone',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      render: (text, record) => text ? (
        <Space>
          <span>{text}</span>
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
      ) : '-',
    },
    {
      title: 'Country',
      dataIndex: 'country',
      key: 'country',
      render: (text) => text || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: 'Pending', value: ContactStatus.PENDING },
        { text: 'Contacted', value: ContactStatus.CONTACTED },
        { text: 'Deal', value: ContactStatus.DEAL },
        { text: 'Loss', value: ContactStatus.LOSS },
      ],
      render: (status, record) => {
        let color = 'default';
        switch (status) {
          case ContactStatus.PENDING:
            color = 'orange';
            break;
          case ContactStatus.CONTACTED:
            color = 'blue';
            break;
          case ContactStatus.DEAL:
            color = 'green';
            break;
          case ContactStatus.LOSS:
            color = 'red';
            break;
          default:
            color = 'default';
        }
        
        return (
          <Dropdown 
            menu={{
              items: [
                {
                  key: ContactStatus.PENDING,
                  label: <Tag color="orange">Pending</Tag>,
                  onClick: () => handleStatusUpdate(record, ContactStatus.PENDING)
                },
                {
                  key: ContactStatus.CONTACTED,
                  label: <Tag color="blue">Contacted</Tag>,
                  onClick: () => handleStatusUpdate(record, ContactStatus.CONTACTED)
                },
                {
                  key: ContactStatus.DEAL,
                  label: <Tag color="green">Deal</Tag>,
                  onClick: () => handleStatusUpdate(record, ContactStatus.DEAL)
                },
                {
                  key: ContactStatus.LOSS,
                  label: <Tag color="red">Loss</Tag>,
                  onClick: () => handleStatusUpdate(record, ContactStatus.LOSS)
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
      title: 'Assignment Date',
      dataIndex: 'AffectingDate',
      key: 'AffectingDate',
      sorter: (a, b) => {
        if (!a.AffectingDate || !b.AffectingDate) return 0;
        return moment(a.AffectingDate).unix() - moment(b.AffectingDate).unix();
      },
      render: (date) => date ? moment(date).format('YYYY-MM-DD') : '-',
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
                onClick: () => onViewContact(record)
              },
              {
                key: 'edit',
                icon: <EditOutlined />,
                label: 'Edit',
                onClick: () => onEditContact(record)
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
    setDateRange(null);
  };

  return (
    <div>
      {/* Filters */}
      <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space wrap>
          <Search
            placeholder="Search contacts..."
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
            <Option value={ContactStatus.PENDING}>Pending</Option>
            <Option value={ContactStatus.CONTACTED}>Contacted</Option>
            <Option value={ContactStatus.DEAL}>Deal</Option>
            <Option value={ContactStatus.LOSS}>Loss</Option>
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
            Total: {filteredContacts.length} contacts
          </span>
        </Space>
      </Space>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={filteredContacts}
        rowKey="id"
        loading={loading}
        pagination={{
          total: filteredContacts.length,
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} contacts`,
        }}
        scroll={{ x: 800 }}
      />
    </div>
  );
};

export default SellerContactList;
