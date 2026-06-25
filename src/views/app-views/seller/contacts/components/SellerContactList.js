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
  Dropdown,
  Modal,
  message,
  Avatar,
  Typography,
  Badge,
  Empty,
  Row,
  Col,
  Card
} from 'antd';
import { 
  EyeOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SearchOutlined, 
  FilterOutlined,
  MoreOutlined,
  ExclamationCircleOutlined,
  WhatsAppOutlined,
  MailOutlined,
  PhoneOutlined,
  UserOutlined,
  DollarOutlined,
  GlobalOutlined,
  StarOutlined,
  CheckCircleOutlined,
  LinkOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  TagOutlined
} from '@ant-design/icons';
import { ContactStatus } from 'models/ContactModel';
import { LeadInterestLevel } from 'models/LeadModel';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { confirm } = Modal;
const { Text } = Typography;

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
  const [filteredSource, setFilteredSource] = useState(null);

  // Status config - ADD NEW STATUSES
const getStatusConfig = (status) => ({
  [ContactStatus.PROPOSAL]: { color: 'purple', label: 'Proposal' },
  [ContactStatus.DEAL]: { color: 'gold', label: 'Deal' },
  [ContactStatus.CONVERTED]: { color: 'green', label: 'Converted' },
  [ContactStatus.LOSS]: { color: 'red', label: 'Loss' },
  [ContactStatus.ACTIVE]: { color: 'green', label: 'Active' },
  [ContactStatus.HOT]: { color: 'red', label: 'Hot' },
  [ContactStatus.COLD]: { color: 'blue', label: 'Cold' },
}[status] || { color: 'default', label: status || 'Unknown' });


  // Get interest level color
  const getInterestColor = (level) => {
    switch (level) {
      case LeadInterestLevel.HIGH: return 'red';
      case LeadInterestLevel.MEDIUM: return 'orange';
      case LeadInterestLevel.LOW: return 'blue';
      default: return 'default';
    }
  };

  // Get source icon
  const getSourceInfo = (source) => {
    const sources = {
      'Facebook': { icon: '📘', color: '#1877F2' },
      'Instagram': { icon: '📷', color: '#E4405F' },
      'Website': { icon: '🌐', color: '#52c41a' },
      'LinkedIn': { icon: '💼', color: '#0A66C2' },
      'TikTok': { icon: '🎵', color: '#ff0050' },
      'Direct': { icon: '✋', color: '#8c8c8c' },
      'Referral': { icon: '🤝', color: '#722ed1' },
      'Import': { icon: '📥', color: '#13c2c2' },
      'Freelance': { icon: '💪', color: '#fa8c16' }
    };
    return sources[source] || { icon: '📌', color: '#8c8c8c' };
  };

  // Filter contacts
  const filteredContacts = useMemo(() => {
    let filtered = [...contacts];

    if (searchText) {
      const term = searchText.toLowerCase();
      filtered = filtered.filter(c =>
        c.name?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.phoneNumber?.includes(term) ||
        c.lookingFor?.toLowerCase().includes(term)
      );
    }

    if (filteredStatus) {
      filtered = filtered.filter(c => c.status === filteredStatus);
    }

    if (filteredSource) {
      filtered = filtered.filter(c => c.source === filteredSource);
    }

    return filtered;
  }, [contacts, searchText, filteredStatus, filteredSource]);

  // Status options - ADD NEW STATUSES
  const statusOptions = [
  { value: ContactStatus.PROPOSAL, label: 'Proposal', color: 'purple' },
  { value: ContactStatus.LOSS, label: 'Lost', color: 'red' },

  { value: ContactStatus.ACTIVE, label: 'Active', color: 'green' },
  { value: ContactStatus.HOT, label: 'Hot', color: 'red' },
  { value: ContactStatus.COLD, label: 'Cold', color: 'blue' },
  { value: ContactStatus.DEAL, label: 'Deal', color: 'green' },
];

  const sourceOptions = [
    'Facebook', 'Instagram', 'Website', 'LinkedIn', 
    'TikTok', 'Direct', 'Referral', 'Import'
  ];

  // Handlers
  const handleDelete = (contact) => {
    confirm({
      title: 'Delete Contact',
      icon: <ExclamationCircleOutlined />,
      content: `Delete "${contact.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk() { onDeleteContact(contact.id); },
    });
  };

  // Handle status update with auto-deal creation confirmation
  const handleStatusUpdate = (contact, newStatus) => {
    // Check if status is Proposal or Deal
    const isProposal = newStatus === 'proposal' || newStatus === 'Proposal' || newStatus === ContactStatus.PROPOSAL;
    const isDeal = newStatus === 'deal' || newStatus === 'Deal' || newStatus === ContactStatus.DEAL;
    
    // Show confirmation for Proposal status
    if (isProposal || isDeal) {
      Modal.confirm({
        title: 'Create Deal',
        icon: <TrophyOutlined style={{ color: '#52c41a' }} />,
        content: (
          <div>
            <p>This will create a new deal from this contact.</p>
            <p><strong>Contact:</strong> {contact.name}</p>
            <p><strong>Budget:</strong> {contact.Budget ? `AED ${Number(contact.Budget).toLocaleString()}` : 'Not set'}</p>
            <p style={{ color: '#52c41a', marginTop: 8 }}>
              ✓ A deal will be created with "Opened" status
            </p>
          </div>
        ),
        okText: 'Create Deal & Update',
        cancelText: 'Cancel',
        onOk: () => {
          onUpdateStatus(contact.id, newStatus);
        }
      });
      return;
    }

    // Regular status update
    onUpdateStatus(contact.id, newStatus);
  };

  const handleSendWhatsApp = (contact) => {
    const phone = contact.phoneNumber || contact.phone;
    if (phone) {
      const clean = phone.replace(/[\s\-\(\)]/g, '');
      window.open(`https://wa.me/${clean}?text=${encodeURIComponent(`Hi ${contact.name}, following up on your inquiry.`)}`, '_blank');
    } else {
      message.warning('No phone number');
    }
  };

  const handleSendEmail = (contact) => {
    if (contact.email) {
      window.open(`mailto:${contact.email}?subject=${encodeURIComponent(`Follow up - ${contact.name}`)}`, '_blank');
    } else {
      message.warning('No email address');
    }
  };

  // Status badge counts
  const statusCounts = useMemo(() => {
    const counts = {};
    statusOptions.forEach(opt => {
      counts[opt.value] = contacts.filter(c => c.status === opt.value).length;
    });
    counts.total = contacts.length;
    return counts;
  }, [contacts]);

  // Columns
  const columns = [
    {
      title: 'Contact',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      fixed: 'left',
      render: (text, record) => {
        const isFromLead = record.leadId || record.convertedFromLeadId;
        const source = getSourceInfo(record.source);
        const hasDeal = record.dealId;
        
        return (
          <Space>
            <Avatar size={40} style={{ backgroundColor: stringToColor(text || 'U'), fontSize: 14, fontWeight: 600 }}>
              {(text || 'U')[0]?.toUpperCase()}
            </Avatar>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{text || 'Unknown'}</div>
              <Space size={4} wrap>
                {record.region && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    <GlobalOutlined style={{ marginRight: 2 }} />
                    {record.region}
                  </Text>
                )}
                {isFromLead && (
                  <Tag color="purple" style={{ fontSize: 10, margin: 0, padding: '0 6px' }}>
                    <LinkOutlined /> Lead
                  </Tag>
                )}
                {hasDeal && (
                  <Tag color="gold" style={{ fontSize: 10, margin: 0, padding: '0 6px' }}>
                    <TrophyOutlined /> Deal
                  </Tag>
                )}
                {record.source && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {source.icon} {record.source}
                  </Text>
                )}
              </Space>
            </div>
          </Space>
        );
      },
      sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
    },
    {
      title: 'Contact Info',
      key: 'info',
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          {record.email && (
            <Space size={4}>
              <MailOutlined style={{ fontSize: 12, color: '#1677ff' }} />
              <Text style={{ fontSize: 12 }}>{record.email}</Text>
              <Button 
                type="text" 
                size="small" 
                icon={<MailOutlined />} 
                onClick={() => handleSendEmail(record)}
                style={{ color: '#1677ff', padding: '0 4px' }}
              />
            </Space>
          )}
          {(record.phoneNumber || record.phone) && (
            <Space size={4}>
              <PhoneOutlined style={{ fontSize: 12, color: '#52c41a' }} />
              <Text style={{ fontSize: 12 }}>{record.phoneNumber || record.phone}</Text>
              <Button 
                type="text" 
                size="small" 
                icon={<WhatsAppOutlined />} 
                onClick={() => handleSendWhatsApp(record)}
                style={{ color: '#25D366', padding: '0 4px' }}
              />
            </Space>
          )}
        </Space>
      ),
    },
    {
      title: 'Looking For',
      dataIndex: 'lookingFor',
      key: 'lookingFor',
      width: 150,
      ellipsis: true,
      render: (text) => text ? (
        <Tag color="blue" style={{ maxWidth: '100%', margin: 0 }}>
          <TagOutlined style={{ marginRight: 4 }} />
          {text}
        </Tag>
      ) : (
        <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
      ),
    },
    {
      title: 'Budget',
      dataIndex: 'Budget',
      key: 'budget',
      width: 120,
      render: (budget) => {
        if (!budget) return <Text type="secondary">—</Text>;
        const num = Number(budget);
        return !isNaN(num) ? (
          <Tag color="green" style={{ margin: 0 }}>
            <DollarOutlined style={{ marginRight: 4 }} />
            AED {num.toLocaleString()}
          </Tag>
        ) : (
          <Tag color="green" style={{ margin: 0 }}>
            <DollarOutlined style={{ marginRight: 4 }} />
            {budget}
          </Tag>
        );
      },
    },
    {
      title: 'Interest',
      dataIndex: 'InterestLevel',
      key: 'interest',
      width: 100,
      render: (level) => {
        if (!level) return <Text type="secondary">—</Text>;
        return (
          <Tag color={getInterestColor(level)} style={{ margin: 0 }}>
            <StarOutlined style={{ marginRight: 4 }} />
            {level}
          </Tag>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status, record) => {
        const config = getStatusConfig(status);
        const isConverted = record.leadId || record.convertedFromLeadId;
        const hasDeal = record.dealId;
        const isProposal = status === 'proposal' || status === 'Proposal';
        
        return (
          <Dropdown
            menu={{
              items: statusOptions.map(opt => ({
                key: opt.value,
                label: <Tag color={opt.color} style={{ margin: 0 }}>{opt.label}</Tag>,
                onClick: () => handleStatusUpdate(record, opt.value)
              }))
            }}
            trigger={['click']}
          >
            <Tag 
              color={config.color} 
              style={{ 
                cursor: 'pointer', 
                borderRadius: 16, 
                padding: '2px 14px',
                fontSize: 12
              }}
            >
              {config.label}
              {(isProposal || hasDeal) && <TrophyOutlined style={{ marginLeft: 4, fontSize: 10, color: '#52c41a' }} />}
              {isConverted && <CheckCircleOutlined style={{ marginLeft: 4, fontSize: 10, color: '#52c41a' }} />}
            </Tag>
          </Dropdown>
        );
      },
    },
    {
      title: 'Created',
      dataIndex: 'CreationDate',
      key: 'created',
      width: 110,
      render: (date) => {
        if (!date) return <Text type="secondary">—</Text>;
        const d = date.toDate?.() || new Date(date);
        return (
          <Tooltip title={dayjs(d).format('DD MMM YYYY HH:mm:ss')}>
            <Text style={{ fontSize: 12 }}>
              <ClockCircleOutlined style={{ marginRight: 4, color: '#8c8c8c' }} />
              {dayjs(d).format('DD MMM YYYY')}
            </Text>
          </Tooltip>
        );
      },
      sorter: (a, b) => {
        const da = a.CreationDate?.toDate?.() || new Date(a.CreationDate) || new Date(0);
        const db = b.CreationDate?.toDate?.() || new Date(b.CreationDate) || new Date(0);
        return da - db;
      },
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button 
              type="text" 
              size="small" 
              icon={<EyeOutlined />} 
              onClick={() => onViewContact(record)}
              style={{ color: '#1890ff' }}
            />
          </Tooltip>
          <Dropdown
            menu={{
              items: [
                { 
                  key: 'edit', 
                  icon: <EditOutlined />, 
                  label: 'Edit', 
                  onClick: () => onEditContact(record) 
                },
                { type: 'divider' },
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
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  // Clear filters
  const clearFilters = () => {
    setSearchText('');
    setFilteredStatus(null);
    setFilteredSource(null);
  };

  return (
    <div style={{ padding: '12px' }}>
      {/* Filter Bar */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 8, 
        marginBottom: 16,
        padding: '12px 16px',
        background: '#fafafa',
        borderRadius: 8,
        border: '1px solid #f0f0f0',
        alignItems: 'center'
      }}>
        <Search
          placeholder="Search contacts..."
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 200 }}
          size="middle"
          prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
        />
        
        <Select
          placeholder="Status"
          allowClear
          value={filteredStatus}
          onChange={setFilteredStatus}
          style={{ width: 130 }}
          size="middle"
        >
          {statusOptions.map(opt => (
            <Option key={opt.value} value={opt.value}>
              <Tag color={opt.color} style={{ margin: 0 }}>{opt.label}</Tag>
            </Option>
          ))}
        </Select>

        <Select
          placeholder="Source"
          allowClear
          value={filteredSource}
          onChange={setFilteredSource}
          style={{ width: 130 }}
          size="middle"
        >
          {sourceOptions.map(source => {
            const info = getSourceInfo(source);
            return <Option key={source} value={source}>{info.icon} {source}</Option>;
          })}
        </Select>

        <Button size="middle" onClick={clearFilters} icon={<FilterOutlined />}>
          Clear
        </Button>

        <div style={{ marginLeft: 'auto' }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            <strong>{filteredContacts.length}</strong> of {contacts.length}
          </Text>
        </div>
      </div>

      {/* Status Badges - Quick Filter */}
      <div style={{ 
        display: 'flex', 
        gap: 8, 
        flexWrap: 'wrap', 
        marginBottom: 16,
        padding: '8px 12px',
        background: '#f5f5f5',
        borderRadius: 8,
        alignItems: 'center'
      }}>
        <Text type="secondary" style={{ fontSize: 12 }}>Quick Filter:</Text>
        <Badge count={statusCounts.total} showZero color="blue" size="small">
          <Tag 
            style={{ cursor: 'pointer', padding: '0 12px' }}
            onClick={() => setFilteredStatus(null)}
          >
            All
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
                  cursor: 'pointer', 
                  padding: '0 12px',
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

      {/* Table */}
      <Table
        columns={columns}
        dataSource={filteredContacts}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total) => `${total} contacts`,
          size: 'small',
        }}
        scroll={{ x: 1100 }}
        size="middle"
        bordered={false}
        rowClassName={(record) => {
          if (record.leadId || record.convertedFromLeadId) return 'converted-row';
          if (record.status === 'hot') return 'hot-row';
          if (record.status === 'active') return 'active-row';
          if (record.dealId) return 'deal-row';
          if (record.status === 'proposal' || record.status === 'Proposal') return 'proposal-row';
          return '';
        }}
        className="contact-table"
      />

      <style>{`
        .converted-row { background: #f9f0ff; }
        .converted-row:hover { background: #efdbff !important; }
        .hot-row { background: #fff1f0; }
        .hot-row:hover { background: #ffccc7 !important; }
        .active-row { background: #f6ffed; }
        .active-row:hover { background: #d9f7be !important; }
        .deal-row { background: #fffbe6; }
        .deal-row:hover { background: #fff1b8 !important; }
        .proposal-row { background: #f9f0ff; }
        .proposal-row:hover { background: #efdbff !important; }
        .contact-table .ant-table-row { transition: background 0.2s; }
        .contact-table .ant-table-cell { padding: 12px 8px !important; }
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

export default SellerContactList;