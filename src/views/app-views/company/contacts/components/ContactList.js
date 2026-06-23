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
  Badge,
  message,
  Modal,
  Form,
  Avatar,
  Typography,
  Menu
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
  ExclamationCircleOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  GlobalOutlined,
  TeamOutlined,
  SwapOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  StarOutlined,
  TagOutlined,
  ClockCircleOutlined,
  UserAddOutlined
} from '@ant-design/icons';
import { ContactStatus } from 'models/ContactModel';
import { LeadInterestLevel } from 'models/LeadModel';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text } = Typography;
const { confirm } = Modal;

// Status configuration with colors and labels
const statusConfig = {
  [ContactStatus.PENDING]: { color: 'orange', label: 'Pending', icon: <ClockCircleOutlined /> },
  [ContactStatus.CONTACTED]: { color: 'blue', label: 'Contacted', icon: <PhoneOutlined /> },
  [ContactStatus.DEAL]: { color: 'green', label: 'Deal', icon: <CheckCircleOutlined /> },
  [ContactStatus.LOSS]: { color: 'red', label: 'Loss', icon: <DeleteOutlined /> },
  [ContactStatus.NO_RESPONSE]: { color: 'default', label: 'No Response', icon: <ClockCircleOutlined /> },
  [ContactStatus.NOT_INTERESTED]: { color: 'volcano', label: 'Not Interested', icon: <DeleteOutlined /> },
  [ContactStatus.JUNK_LEAD]: { color: 'purple', label: 'Junk Lead', icon: <DeleteOutlined /> },
  'active': { color: 'green', label: 'Active', icon: <CheckCircleOutlined /> },
  'hot': { color: 'red', label: 'Hot', icon: <StarOutlined /> },
  'cold': { color: 'blue', label: 'Cold', icon: <StarOutlined /> },
};

// Status options for dropdown
const statusOptions = [
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'hot', label: 'Hot', color: 'red' },
  { value: 'cold', label: 'Cold', color: 'blue' },
  { value: ContactStatus.PENDING, label: 'Pending', color: 'orange' },
  { value: ContactStatus.CONTACTED, label: 'Contacted', color: 'blue' },
  { value: ContactStatus.DEAL, label: 'Deal', color: 'green' },
  { value: ContactStatus.LOSS, label: 'Loss', color: 'red' },
  { value: ContactStatus.NO_RESPONSE, label: 'No Response', color: 'default' },
  { value: ContactStatus.NOT_INTERESTED, label: 'Not Interested', color: 'volcano' },
  { value: ContactStatus.JUNK_LEAD, label: 'Junk Lead', color: 'purple' },
];

const interestLevelColors = {
  [LeadInterestLevel.LOW]: 'orange',
  [LeadInterestLevel.MEDIUM]: 'blue',
  [LeadInterestLevel.HIGH]: 'green',
};

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
  const [data, setData] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [filteredStatus, setFilteredStatus] = useState(null);
  const [filteredSeller, setFilteredSeller] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [dateFilter, setDateFilter] = useState('CreationDate');
  const [changingStatus, setChangingStatus] = useState({});

  // Modals State
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isBulkAssign, setIsBulkAssign] = useState(false);

  const [assignForm] = Form.useForm();
  const [noteForm] = Form.useForm();

  const { user } = useSelector((state) => state.auth);

  // Reset selected rows when contacts change
  useEffect(() => {
    const sortedContacts = [...contacts].sort((a, b) => {
      const dateA = a.CreationDate?.toDate?.() || new Date(a.CreationDate) || new Date(0);
      const dateB = b.CreationDate?.toDate?.() || new Date(b.CreationDate) || new Date(0);
      return dateB - dateA;
    });
    setData(sortedContacts);
    setSelectedRowKeys([]);
  }, [contacts]);

  useEffect(() => {
    onSelectChange(selectedRowKeys);
  }, [selectedRowKeys, onSelectChange]);

  // Helper to get seller name
  const getSellerName = (record) => {
    if (record.assignedTo?.id) {
      const seller = sellers.find(s => s.id === record.assignedTo.id);
      return seller ? seller.name : record.assignedTo.name || 'Unknown';
    }
    if (record.seller_id) {
      const seller = sellers.find(s => s.id === record.seller_id);
      return seller ? seller.name : 'Unknown';
    }
    return 'Unassigned';
  };

  const isContactAssigned = (record) => {
    return !!(record.assignedTo?.id || record.seller_id);
  };

  const getSellerId = (record) => {
    if (record.assignedTo?.id) return record.assignedTo.id;
    return record.seller_id || null;
  };

  const formatDate = (date) => {
    if (!date) return '—';
    const d = date.toDate?.() || new Date(date);
    return dayjs(d).format('DD MMM YYYY');
  };

  // Assign Modal - FIXED: Handle both single and bulk
  const showAssignModal = (record) => {
    setSelectedRecord(record);
    setIsBulkAssign(false);
    setAssignModalVisible(true);
    assignForm.resetFields();
  };

  const showBulkAssignModal = () => {
    setIsBulkAssign(true);
    setSelectedRecord(null);
    setAssignModalVisible(true);
    assignForm.resetFields();
  };

  const handleAssign = () => {
    assignForm.validateFields().then(values => {
      if (isBulkAssign && selectedRowKeys.length > 0) {
        // Bulk assign - pass array of IDs
        onAssignSeller(selectedRowKeys, values.seller_id, values.affectingDate?.toDate());
      } else if (selectedRecord) {
        // Single assign - pass array with one ID
        onAssignSeller([selectedRecord.id], values.seller_id, values.affectingDate?.toDate());
      }
      setAssignModalVisible(false);
      assignForm.resetFields();
      setSelectedRowKeys([]);
    });
  };

  // Note Modal
  const showNoteModal = (record) => {
    setSelectedRecord(record);
    setNoteModalVisible(true);
    noteForm.resetFields();
  };

  const handleAddNote = () => {
    noteForm.validateFields().then(async (values) => {
      if (selectedRecord) {
        try {
          await onAddNote(selectedRecord.id, values.note);
          setNoteModalVisible(false);
          noteForm.resetFields();
          message.success('Note added successfully');
        } catch (error) {
          message.error('Failed to add note');
        }
      }
    });
  };

  // Delete handler
  const handleDelete = (record) => {
    confirm({
      title: 'Delete Contact',
      icon: <ExclamationCircleOutlined />,
      content: `Delete "${record.name}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      onOk() {
        onDeleteContact(record.id);
      },
    });
  };

  // Handle status change
  const handleStatusChange = async (contactId, newStatus, record) => {
    setChangingStatus(prev => ({ ...prev, [contactId]: true }));
    try {
      await onUpdateStatus(contactId, newStatus);
      message.success(`Status updated to ${statusConfig[newStatus]?.label || newStatus}`);
    } catch (error) {
      message.error('Failed to update status: ' + error.message);
    } finally {
      setChangingStatus(prev => ({ ...prev, [contactId]: false }));
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchText('');
    setFilteredStatus(null);
    setFilteredSeller(null);
    setDateRange(null);
    setDateFilter('CreationDate');
  };

  // Filter contacts
  const filteredContacts = useMemo(() => {
    let filtered = [...data];

    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(contact =>
        contact.name?.toLowerCase().includes(searchLower) ||
        contact.email?.toLowerCase().includes(searchLower) ||
        contact.phoneNumber?.includes(searchText) ||
        contact.region?.toLowerCase().includes(searchLower)
      );
    }

    if (filteredStatus) {
      filtered = filtered.filter(contact => contact.status === filteredStatus);
    }

    if (filteredSeller) {
      filtered = filtered.filter(contact => {
        const contactSellerId = getSellerId(contact);
        return contactSellerId === filteredSeller;
      });
    }

    if (dateRange && dateRange.length === 2) {
      filtered = filtered.filter(contact => {
        const dateField = dateFilter === 'CreationDate' ? contact.CreationDate : contact.AffectingDate;
        if (!dateField) return false;
        const dateObj = dateField.toDate?.() || new Date(dateField);
        return dayjs(dateObj).isBetween(dateRange[0], dateRange[1], 'day', '[]');
      });
    }

    return filtered;
  }, [data, searchText, filteredStatus, filteredSeller, dateRange, dateFilter]);

  // Count contacts by status
  const statusCounts = useMemo(() => {
    const counts = {};
    Object.values(ContactStatus).forEach(status => {
      counts[status] = contacts.filter(c => c.status === status).length;
    });
    counts['active'] = contacts.filter(c => c.status === 'active').length;
    counts['hot'] = contacts.filter(c => c.status === 'hot').length;
    counts['cold'] = contacts.filter(c => c.status === 'cold').length;
    return counts;
  }, [contacts]);

  const columns = [
    {
      title: 'Contact',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      fixed: 'left',
      sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
      render: (text, record) => {
        const isFromLead = record.leadId || record.convertedFromLeadId;
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar
              size={32}
              style={{
                background: stringToColor(text || 'U'),
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {(text || 'U')[0].toUpperCase()}
            </Avatar>
            <div style={{ minWidth: 0 }}>
              <a
                onClick={() => onViewContact(record)}
                style={{ fontWeight: 600, color: '#1d1d1d', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {text || 'Unknown'}
              </a>
              <Space size={4} wrap>
                {record.region && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    <GlobalOutlined style={{ marginRight: 3 }} />
                    {record.region}
                  </Text>
                )}
                {isFromLead && (
                  <Tag color="purple" style={{ fontSize: 10, margin: 0, padding: '0 6px' }}>
                    <SwapOutlined /> Lead
                  </Tag>
                )}
                {record.source && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {record.source}
                  </Text>
                )}
              </Space>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Contact Info',
      key: 'contact',
      width: 90,
      render: (_, record) => (
        <Space size={2} onClick={e => e.stopPropagation()}>
          {record.email && (
            <Tooltip title={record.email}>
              <Button
                type="text"
                size="small"
                icon={<MailOutlined style={{ color: '#1677ff' }} />}
                href={`mailto:${record.email}`}
                onClick={e => e.stopPropagation()}
              />
            </Tooltip>
          )}
          {record.phoneNumber && (
            <Tooltip title={record.phoneNumber}>
              <Button
                type="text"
                size="small"
                icon={<PhoneOutlined style={{ color: '#52c41a' }} />}
                href={`tel:${record.phoneNumber}`}
                onClick={e => e.stopPropagation()}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 180,
      render: (status, record) => {
        const config = statusConfig[status] || { color: 'default', label: status || '—', icon: null };
        const isFromLead = record.leadId || record.convertedFromLeadId;
        
        if (isFromLead) {
          return (
            <Tooltip title="This contact was converted from a lead">
              <Tag
                color={config.color}
                style={{ borderRadius: 20, fontWeight: 500, fontSize: 11, cursor: 'default' }}
                onClick={e => e.stopPropagation()}
              >
                {config.icon} {config.label} ✓
              </Tag>
            </Tooltip>
          );
        }

        return (
          <div onClick={e => e.stopPropagation()} style={{ display: 'inline-block' }}>
            <Select
              value={status || ContactStatus.PENDING}
              onChange={(value) => handleStatusChange(record.id, value, record)}
              loading={changingStatus[record.id]}
              style={{ width: 130 }}
              size="small"
              dropdownMatchSelectWidth={200}
              disabled={changingStatus[record.id]}
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
            >
              {statusOptions.map(option => (
                <Select.Option key={option.value} value={option.value}>
                  <Tag color={option.color} style={{ margin: 0 }}>
                    {option.label}
                  </Tag>
                </Select.Option>
              ))}
            </Select>
          </div>
        );
      },
    },
    {
      title: 'Seller',
      dataIndex: 'seller_id',
      key: 'seller_id',
      width: 150,
      render: (_, record) => {
        const sellerName = getSellerName(record);
        const isAssigned = isContactAssigned(record);
        
        return (
          <Space size={4} onClick={e => e.stopPropagation()}>
            <Text style={{ fontSize: 12 }}>
              {isAssigned ? sellerName : 'Unassigned'}
            </Text>
            <Tooltip title={isAssigned ? "Reassign to another seller" : "Assign to seller"}>
              <Button
                type="text"
                size="small"
                icon={<UserAddOutlined style={{ color: isAssigned ? '#722ed1' : '#1677ff' }} />}
                onClick={(e) => {
                  e.stopPropagation();
                  showAssignModal(record);
                }}
              />
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: 'Looking For',
      dataIndex: 'lookingFor',
      key: 'lookingFor',
      ellipsis: true,
      render: (text) => text ? <Text>{text}</Text> : <Text type="secondary">—</Text>,
      responsive: ['lg'],
    },
    {
      title: 'Budget',
      dataIndex: 'Budget',
      key: 'Budget',
      width: 160,
      render: (budget) => {
        if (!budget) {
          return <Text type="secondary">—</Text>;
        }
        if (typeof budget === 'number' || !isNaN(Number(budget))) {
          const num = Number(budget);
          return (
            <Text strong style={{ color: '#1677ff' }}>
              <DollarOutlined /> AED {num.toLocaleString()}
            </Text>
          );
        }
        return (
          <Tooltip title={budget}>
            <Text strong style={{ color: '#1677ff', cursor: 'help' }}>
              {budget.length > 25 ? budget.substring(0, 25) + '...' : budget}
            </Text>
          </Tooltip>
        );
      },
      sorter: (a, b) => {
        const valA = typeof a.Budget === 'number' ? a.Budget : 0;
        const valB = typeof b.Budget === 'number' ? b.Budget : 0;
        return valA - valB;
      },
      responsive: ['md'],
    },
    {
      title: 'Created',
      dataIndex: 'CreationDate',
      key: 'CreationDate',
      width: 110,
      render: date =>
        date ? (
          <Text style={{ fontSize: 12 }}>
            {formatDate(date)}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
      sorter: (a, b) => {
        const dateA = a.CreationDate?.toDate?.() || new Date(a.CreationDate) || new Date(0);
        const dateB = b.CreationDate?.toDate?.() || new Date(b.CreationDate) || new Date(0);
        return dateA - dateB;
      },
      responsive: ['lg'],
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Space size={2} onClick={e => e.stopPropagation()}>
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onViewContact(record);
              }}
              style={{ color: '#1890ff' }}
            />
          </Tooltip>
          <Dropdown
            overlay={
              <Menu>
                <Menu.Item key="1" icon={<EditOutlined />} onClick={() => onEditContact(record)}>
                  Edit
                </Menu.Item>
                <Menu.Item key="2" icon={<FileTextOutlined />} onClick={() => showNoteModal(record)}>
                  Add Note
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item key="3" icon={<DeleteOutlined />} danger onClick={() => handleDelete(record)}>
                  Delete
                </Menu.Item>
              </Menu>
            }
            trigger={['click']}
          >
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
    columnWidth: 40,
    getCheckboxProps: (record) => ({
      disabled: record.status === ContactStatus.LOSS || record.status === ContactStatus.JUNK_LEAD,
    }),
  };

  return (
    <div>
      {/* Filter Section */}
      <div style={{ 
        marginBottom: 16, 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 8, 
        alignItems: 'center',
        padding: '12px 16px',
        background: '#fafafa',
        borderRadius: 8,
        border: '1px solid #f0f0f0'
      }}>
        <Search
          placeholder="Search contacts..."
          allowClear
          onSearch={(value) => setSearchText(value)}
          onChange={(e) => setSearchText(e.target.value)}
          value={searchText}
          style={{ width: 220 }}
          size="middle"
          prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
        />
        
        <Select
          placeholder="Status"
          allowClear
          style={{ width: 130 }}
          value={filteredStatus}
          onChange={setFilteredStatus}
          size="middle"
        >
          {statusOptions.map(opt => (
            <Option key={opt.value} value={opt.value}>
              <Tag color={opt.color} style={{ margin: 0 }}>{opt.label}</Tag>
            </Option>
          ))}
        </Select>

        <Select
          placeholder="Seller"
          allowClear
          style={{ width: 150 }}
          value={filteredSeller}
          onChange={setFilteredSeller}
          size="middle"
          showSearch
          optionFilterProp="children"
        >
          <Option value={null}>Unassigned</Option>
          {sellers.map(seller => (
            <Option key={seller.id} value={seller.id}>
              <Space>
                <Avatar size={16} style={{ backgroundColor: '#1890ff', fontSize: 10 }}>
                  {(seller.name || 'S')[0].toUpperCase()}
                </Avatar>
                {seller.name}
              </Space>
            </Option>
          ))}
        </Select>
        
        <Select
          style={{ width: 140 }}
          value={dateFilter}
          onChange={setDateFilter}
          size="middle"
        >
          <Option value="CreationDate">Creation Date</Option>
          <Option value="AffectingDate">Assignment Date</Option>
        </Select>
        
        <RangePicker 
          onChange={setDateRange}
          value={dateRange}
          style={{ width: 220 }}
          size="middle"
          format="DD MMM YYYY"
        />
        
        <Button onClick={clearFilters} size="middle" icon={<FilterOutlined />}>
          Clear
        </Button>
        
        <div style={{ marginLeft: 'auto' }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            <strong>{filteredContacts.length}</strong> of {contacts.length}
          </Text>
        </div>
      </div>

      {/* Status Count Badges */}
      <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Badge count={contacts.length} showZero color="blue" size="small">
          <Tag style={{ padding: '0 12px', cursor: 'pointer' }} onClick={() => setFilteredStatus(null)}>
            Total
          </Tag>
        </Badge>
        {statusOptions.map(opt => {
          const count = statusCounts[opt.value] || 0;
          if (count === 0) return null;
          return (
            <Badge key={opt.value} count={count} size="small">
              <Tag 
                color={opt.color}
                style={{ 
                  padding: '0 12px', 
                  cursor: 'pointer',
                  opacity: filteredStatus === opt.value ? 1 : 0.7
                }}
                onClick={() => setFilteredStatus(filteredStatus === opt.value ? null : opt.value)}
              >
                {opt.label}
              </Tag>
            </Badge>
          );
        })}
      </div>

      {/* Bulk action toolbar */}
      {selectedRowKeys.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 16px',
            marginBottom: 12,
            background: '#f0f5ff',
            borderRadius: 10,
            border: '1px solid #adc6ff',
            flexWrap: 'wrap',
          }}
          onClick={e => e.stopPropagation()}
        >
          <Text strong style={{ color: '#1677ff' }}>
            {selectedRowKeys.length} contact{selectedRowKeys.length > 1 ? 's' : ''} selected
          </Text>
          <Button
            type="primary"
            size="small"
            icon={<TeamOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              showBulkAssignModal();
            }}
            style={{ borderRadius: 6 }}
          >
            Assign to Seller
          </Button>
          <Button
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedRowKeys([]);
            }}
            style={{ borderRadius: 6 }}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={filteredContacts}
        rowKey="id"
        loading={loading}
        size="middle"
        scroll={{ x: 800 }}
        onRow={record => ({
          onClick: () => onViewContact(record),
          style: { cursor: 'pointer' },
        })}
        rowClassName={(_, index) =>
          index % 2 === 0 ? 'table-row-even' : 'table-row-odd'
        }
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total, range) =>
            `${range[0]}–${range[1]} of ${total} contacts`,
          size: 'small',
        }}
        style={{ borderRadius: 10, overflow: 'hidden' }}
      />

      {/* Assign to Seller Modal - FIXED */}
      <Modal
        title={isBulkAssign ? `Assign ${selectedRowKeys.length} Contacts to Seller` : "Assign Contact to Seller"}
        open={assignModalVisible}
        onOk={handleAssign}
        onCancel={() => {
          setAssignModalVisible(false);
          assignForm.resetFields();
          setIsBulkAssign(false);
        }}
        okText="Assign"
        cancelText="Cancel"
        width={500}
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item
            name="seller_id"
            label="Select Seller"
            rules={[{ required: true, message: 'Please select a seller' }]}
          >
            <Select 
              placeholder="Search and select a seller"
              showSearch
              optionFilterProp="children"
            >
              {sellers.map(s => (
                <Option key={s.id} value={s.id}>
                  <Space>
                    <Avatar size={20} style={{ backgroundColor: '#1890ff' }}>
                      {(s.name || 'S')[0].toUpperCase()}
                    </Avatar>
                    {s.name}
                    {s.phoneNumber && (
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        <PhoneOutlined style={{ marginLeft: 4 }} /> {s.phoneNumber}
                      </Text>
                    )}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item 
            name="affectingDate" 
            label="Assignment Date"
            tooltip="Date when this assignment becomes effective"
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Note Modal */}
      <Modal
        title={`Add Note - ${selectedRecord?.name || 'Contact'}`}
        open={noteModalVisible}
        onOk={handleAddNote}
        onCancel={() => setNoteModalVisible(false)}
        okText="Add Note"
        cancelText="Cancel"
        width={500}
      >
        <Form form={noteForm} layout="vertical">
          <Form.Item
            name="note"
            rules={[{ required: true, message: 'Please enter a note' }]}
          >
            <Input.TextArea 
              rows={4} 
              placeholder="Write your note here..." 
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .table-row-even { background: #fff; }
        .table-row-odd  { background: #fafafa; }
        .ant-table-tbody > tr:hover > td { background: #f0f5ff !important; }
      `}</style>
    </div>
  );
};

// Helper function to generate color from string
function stringToColor(str) {
  const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default ContactList;