import React, { useState, useEffect, useMemo } from 'react';
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
  Badge,
  message,
  Modal
} from 'antd';
import { 
  EyeOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SearchOutlined, 
  FilterOutlined,
  FileTextOutlined,
  UserSwitchOutlined,
  MoreOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { ContactStatus } from 'models/ContactModel';
import moment from 'moment';
import { useSelector } from 'react-redux';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

/**
 * ContactList component for displaying and managing contacts
 */
const ContactList = ({ 
  contacts, 
  loading, 
  onViewContact, 
  onEditContact, 
  onDeleteContact,
  onSelectChange,
  onAssignSeller,
  onUpdateStatus,
  onAddNote,
  sellers
}) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [filteredStatus, setFilteredStatus] = useState(null);
  const [filteredSeller, setFilteredSeller] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [dateFilter, setDateFilter] = useState('CreationDate'); // 'CreationDate', 'AffectingDate'

  // Get current user role
  const { user } = useSelector((state) => state.auth);
  const userRole = user?.Role || null;

  // Reset selected rows when contacts change
  useEffect(() => {
    setSelectedRowKeys([]);
  }, [contacts]);

  // Notify parent component when selection changes
  useEffect(() => {
    onSelectChange(selectedRowKeys);
  }, [selectedRowKeys, onSelectChange]);

  // Table columns definition
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text, record) => (
        <a onClick={() => onViewContact(record)}>{text}</a>
      ),
      filteredValue: searchText ? [searchText] : null,
      onFilter: (value, record) => {
        return record.name.toLowerCase().includes(value.toLowerCase());
      },
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (text) => text || '-',
      filteredValue: searchText ? [searchText] : null,
      onFilter: (value, record) => {
        return record.email?.toLowerCase().includes(value.toLowerCase());
      },
    },
    {
      title: 'Phone',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      render: (text) => text || '-',
    },
    {
      title: 'Region',
      dataIndex: 'region',
      key: 'region',
      render: (text) => text || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
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
        return <Tag color={color}>{status || 'Unknown'}</Tag>;
      },
      filters: [
        { text: 'Pending', value: ContactStatus.PENDING },
        { text: 'Contacted', value: ContactStatus.CONTACTED },
        { text: 'Deal', value: ContactStatus.DEAL },
        { text: 'Loss', value: ContactStatus.LOSS },
      ],
      filteredValue: filteredStatus ? [filteredStatus] : null,
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Assigned To',
      dataIndex: 'seller_id',
      key: 'seller_id',
      render: (sellerId) => {
        if (!sellerId) return <Tag>Unassigned</Tag>;
        const seller = sellers.find(s => s.id === sellerId);
        return seller ? seller.name : 'Unknown';
      },
      filters: sellers.map(seller => ({
        text: seller.name,
        value: seller.id,
      })),
      filteredValue: filteredSeller ? [filteredSeller] : null,
      onFilter: (value, record) => record.seller_id === value,
    },
    {
      title: 'Created',
      dataIndex: 'CreationDate',
      key: 'CreationDate',
      sorter: (a, b) => {
        if (!a.CreationDate || !b.CreationDate) return 0;
        return a.CreationDate.getTime() - b.CreationDate.getTime();
      },
      render: (date) => date ? moment(date).format('YYYY-MM-DD') : '-',
      // Filter contacts by date range
      filteredValue: dateRange && dateFilter === 'CreationDate' ? ['filtered'] : null,
      onFilter: (_, record) => {
        if (!dateRange || !record.CreationDate) return false;
        const recordDate = moment(record.CreationDate);
        return recordDate.isBetween(dateRange[0], dateRange[1], 'day', '[]');
      },
    },
    {
      title: 'Assigned Date',
      dataIndex: 'AffectingDate',
      key: 'AffectingDate',
      sorter: (a, b) => {
        if (!a.AffectingDate || !b.AffectingDate) return 0;
        return a.AffectingDate.getTime() - b.AffectingDate.getTime();
      },
      render: (date) => date ? moment(date).format('YYYY-MM-DD') : '-',
      // Filter contacts by date range
      filteredValue: dateRange && dateFilter === 'AffectingDate' ? ['filtered'] : null,
      onFilter: (_, record) => {
        if (!dateRange || !record.AffectingDate) return false;
        const recordDate = moment(record.AffectingDate);
        return recordDate.isBetween(dateRange[0], dateRange[1], 'day', '[]');
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Dropdown overlay={
          <Menu>
            <Menu.Item key="1" icon={<EyeOutlined />} onClick={() => onViewContact(record)}>
              View Details
            </Menu.Item>
            <Menu.Item key="2" icon={<EditOutlined />} onClick={() => onEditContact(record)}>
              Edit
            </Menu.Item>
            <Menu.Item key="3" icon={<UserSwitchOutlined />} onClick={() => handleAssignMenu(record)}>
              Assign to Seller
            </Menu.Item>
            <Menu.Item key="4" icon={<FileTextOutlined />} onClick={() => handleAddNote(record)}>
              Add Note
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item key="5" icon={<DeleteOutlined />} danger onClick={() => handleDelete(record)}>
              Delete
            </Menu.Item>
          </Menu>
        } trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  // Handle contact deletion with confirmation
  const handleDelete = (record) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this contact?',
      icon: <ExclamationCircleOutlined />,
      content: 'This action cannot be undone.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        onDeleteContact(record.id);
      },
    });
  };

  // Handle assignment to seller
  const handleAssignMenu = (record) => {
    // Implementation would show a modal/dropdown to select a seller
    // For now, just show a message
    message.info('Assignment feature will open a seller selection modal');
  };

  // Handle adding a note
  const handleAddNote = (record) => {
    // Implementation would show a modal to add a note
    // For now, just show a message
    message.info('Note adding feature will open a note input modal');
  };

  // Row selection configuration
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => {
      setSelectedRowKeys(keys);
    },
  };

  // Handle search text change
  const handleSearch = (value) => {
    setSearchText(value);
  };

  // Handle status filter change
  const handleStatusFilterChange = (value) => {
    setFilteredStatus(value);
  };

  // Handle seller filter change
  const handleSellerFilterChange = (value) => {
    setFilteredSeller(value);
  };

  // Handle date range filter change
  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
  };

  // Handle date filter type change
  const handleDateFilterTypeChange = (value) => {
    setDateFilter(value);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchText('');
    setFilteredStatus(null);
    setFilteredSeller(null);
    setDateRange(null);
    setDateFilter('CreationDate');
  };

  return (
    <div className="contact-list">
      <div className="filter-section" style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        <Search
          placeholder="Search contacts"
          allowClear
          onSearch={handleSearch}
          style={{ width: 200 }}
        />
        
        <Select
          placeholder="Filter by status"
          allowClear
          style={{ width: 150 }}
          onChange={handleStatusFilterChange}
          value={filteredStatus}
        >
          <Option value={ContactStatus.PENDING}>Pending</Option>
          <Option value={ContactStatus.CONTACTED}>Contacted</Option>
          <Option value={ContactStatus.DEAL}>Deal</Option>
          <Option value={ContactStatus.LOSS}>Loss</Option>
        </Select>
        
        <Select
          placeholder="Filter by seller"
          allowClear
          style={{ width: 200 }}
          onChange={handleSellerFilterChange}
          value={filteredSeller}
        >
          <Option value={null}>Unassigned</Option>
          {sellers.map(seller => (
            <Option key={seller.id} value={seller.id}>{seller.name}</Option>
          ))}
        </Select>
        
        <Select
          style={{ width: 150 }}
          value={dateFilter}
          onChange={handleDateFilterTypeChange}
        >
          <Option value="CreationDate">Creation Date</Option>
          <Option value="AffectingDate">Affecting Date</Option>
        </Select>
        
        <RangePicker 
          onChange={handleDateRangeChange}
          value={dateRange}
        />
        
        <Button icon={<FilterOutlined />} onClick={clearFilters}>
          Clear Filters
        </Button>
      </div>
      
      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={contacts.map(contact => ({ ...contact, key: contact.id }))}
        loading={loading}
        scroll={{ x: true }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total) => `Total ${total} contacts`,
        }}
      />
    </div>
  );
};

export default ContactList;
