// components/SellerLeadList.js
import React, { useState, useMemo, useEffect } from 'react';
import {
  Table,
  Tag,
  Space,
  Button,
  Tooltip,
  Input,
  Select,
  DatePicker,
  Modal,
  message,
  Badge,
  Card,
  Alert,
  Statistic,
  Row,
  Col,
  Typography,
  Progress,
  Radio,
} from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  FilterOutlined,
  DollarOutlined,
  UserOutlined,
  UserSwitchOutlined,
  ClockCircleOutlined,
  UnlockOutlined,
  LockOutlined,
  EyeInvisibleOutlined,
  TrophyOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { LeadStatus, LeadInterestLevel } from 'models/LeadModel';
import dayjs from 'dayjs';

const { Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { confirm } = Modal;

const SellerLeadList = ({
  leads,
  loading,
  onViewLead,
  onEditLead,
  onDeleteLead,
  onRevealLead,
  sellerId,
  sellers = [],
}) => {
  const [searchText, setSearchText] = useState('');
  const [filteredStatus, setFilteredStatus] = useState(null);
  const [filteredInterest, setFilteredInterest] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [revealingLeadId, setRevealingLeadId] = useState(null);
  const [leadTypeFilter, setLeadTypeFilter] = useState('all'); // 'all', 'myLeads', 'assigned', 'revealed', 'hidden'
  
  // Track local revealed state for leads assigned to seller
  const [revealedLeads, setRevealedLeads] = useState({});

  // Initialize revealed state from leads assigned to seller
  useEffect(() => {
    const initialRevealed = {};
    leads.forEach(lead => {
      // Check if lead has been revealed by this seller
      const hasBeenViewed = lead.lastViewedBy?.sellerId === sellerId;
      initialRevealed[lead.id] = hasBeenViewed || lead.isRevealed || false;
    });
    setRevealedLeads(initialRevealed);
  }, [leads, sellerId]);

  // Check if lead is created by the current seller (their own lead)
  const isMyOwnLead = (lead) => {
    if (!lead || !sellerId) return false;
    // ONLY check createdBy - not seller_id
    return String(lead.createdBy) === String(sellerId);
  };

  // Check if lead is assigned to current seller (but not created by them)
  const isAssignedToMe = (lead) => {
    if (!lead || !sellerId) return false;
    // Lead is assigned to seller if seller_id matches AND it's NOT created by them
    const isSellerAssigned = String(lead.seller_id) === String(sellerId);
    const isCreator = String(lead.createdBy) === String(sellerId);
    return isSellerAssigned && !isCreator;
  };

  // Check if lead is revealed
  const isRevealed = (lead) => {
    if (isMyOwnLead(lead)) return true; // Own leads are always considered revealed
    return revealedLeads[lead.id] === true;
  };

  // Helper to check if lead info should be hidden
  const isHidden = (lead) => {
    // Own leads are always visible
    if (isMyOwnLead(lead)) return false;
    // Revealed leads are visible
    if (revealedLeads[lead.id]) return false;
    // Leads assigned to seller are hidden until revealed
    if (isAssignedToMe(lead)) return true;
    // Default: not hidden
    return false;
  };

  // Calculate stats for assigned leads only (not own leads)
  const stats = useMemo(() => {
    // Get leads assigned to seller (not created by them)
    const assignedLeads = leads.filter(lead => isAssignedToMe(lead));
    const totalAssigned = assignedLeads.length;
    
    // Count revealed among assigned leads
    const revealedCount = assignedLeads.filter(lead => revealedLeads[lead.id] === true).length;
    const hiddenCount = totalAssigned - revealedCount;
    const percentage = totalAssigned > 0 ? (revealedCount / totalAssigned) * 100 : 0;
    
    // Also count own leads separately (leads they created)
    const ownLeadsCount = leads.filter(lead => isMyOwnLead(lead)).length;
    
    return { 
      totalAssigned, 
      revealedCount, 
      hiddenCount, 
      percentage,
      ownLeadsCount,
      totalLeads: leads.length
    };
  }, [leads, revealedLeads]);

  // Filter leads based on all criteria
  const filteredLeads = useMemo(() => {
    let filtered = [...leads];

    // Filter by lead type (My Leads, Assigned, Revealed, Hidden)
    if (leadTypeFilter === 'myLeads') {
      filtered = filtered.filter(lead => isMyOwnLead(lead));
    } else if (leadTypeFilter === 'assigned') {
      filtered = filtered.filter(lead => isAssignedToMe(lead));
    } else if (leadTypeFilter === 'revealed') {
      filtered = filtered.filter(lead => isRevealed(lead));
    } else if (leadTypeFilter === 'hidden') {
      filtered = filtered.filter(lead => isHidden(lead));
    }

    // Search filter
    if (searchText) {
      const term = searchText.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.name?.toLowerCase().includes(term) ||
        lead.email?.toLowerCase().includes(term) ||
        lead.phoneNumber?.includes(term) ||
        lead.region?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (filteredStatus) {
      filtered = filtered.filter(l => l.status === filteredStatus);
    }
    
    // Interest filter
    if (filteredInterest) {
      filtered = filtered.filter(l => l.InterestLevel === filteredInterest);
    }

    // Date range filter
    if (dateRange && dateRange.length === 2) {
      filtered = filtered.filter(lead => {
        if (!lead.CreationDate) return false;
        return dayjs(lead.CreationDate).isBetween(dateRange[0], dateRange[1], 'day', '[]');
      });
    }

    return filtered;
  }, [leads, searchText, filteredStatus, filteredInterest, dateRange, leadTypeFilter]);

  const handleDelete = (record) => {
    if (!isMyOwnLead(record)) {
      message.warning("You can only delete leads that you personally created.");
      return;
    }

    confirm({
      title: 'Delete Lead',
      content: `Are you sure you want to delete "${record.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: () => onDeleteLead(record.id),
    });
  };

  const handleRevealLead = async (lead) => {
    if (revealedLeads[lead.id]) {
      // Already revealed, just view details
      onViewLead(lead);
      return;
    }
    
    setRevealingLeadId(lead.id);
    try {
      if (onRevealLead && typeof onRevealLead === 'function') {
        await onRevealLead(lead.id);
      } else {
        console.warn('onRevealLead is not a function or not provided');
        setRevealedLeads(prev => ({
          ...prev,
          [lead.id]: true
        }));
        message.success(`Lead "${lead.name}" revealed locally!`);
        setTimeout(() => {
          onViewLead(lead);
        }, 500);
        return;
      }
      
      // Update local state
      setRevealedLeads(prev => ({
        ...prev,
        [lead.id]: true
      }));
      
      message.success(`Lead "${lead.name}" revealed! You can now see full details.`);
      
      setTimeout(() => {
        onViewLead(lead);
      }, 500);
      
    } catch (error) {
      console.error('Error revealing lead:', error);
      message.error('Failed to reveal lead. Please try again.');
    } finally {
      setRevealingLeadId(null);
    }
  };

  // Render hidden content (blurred/placeholder)
  const renderHiddenContent = (lead, fieldName, actualContent, placeholder = '•••••') => {
    if (!isHidden(lead)) return actualContent;
    
    return (
      <Tooltip title="Click 'Reveal' to view this information">
        <span style={{ 
          filter: 'blur(4px)', 
          userSelect: 'none',
          cursor: 'pointer',
          display: 'inline-block'
        }}>
          {placeholder}
        </span>
      </Tooltip>
    );
  };

  const clearFilters = () => {
    setSearchText('');
    setFilteredStatus(null);
    setFilteredInterest(null);
    setDateRange(null);
    setLeadTypeFilter('all');
  };

  const columns = [
    {
      title: 'Lead Name',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 220,
      render: (text, record) => {
        const isHiddenLead = isHidden(record);
        const assignedToMe = isAssignedToMe(record);
        const myOwn = isMyOwnLead(record);
        const revealed = isRevealed(record);
        
        return (
          <Space direction="vertical" size={0}>
            <Space>
              {isHiddenLead ? (
                <>
                  <LockOutlined style={{ color: '#faad14' }} />
                  <strong>
                    {renderHiddenContent(record, 'name', text || 'Unknown', '•••••')}
                  </strong>
                </>
              ) : (
                <>
                  <UnlockOutlined style={{ color: '#52c41a' }} />
                  <strong>{text || 'Unknown'}</strong>
                </>
              )}
              
              {myOwn && (
                <Badge 
                  color="green" 
                  text="My Lead" 
                  style={{ fontSize: '12px' }}
                />
              )}
              
              {assignedToMe && revealed && !myOwn && (
                <Tag color="blue" icon={<EyeOutlined />} style={{ fontSize: 11 }}>
                  Revealed
                </Tag>
              )}
              
              {assignedToMe && isHiddenLead && (
                <Tag color="orange" icon={<LockOutlined />} style={{ fontSize: 11 }}>
                  Hidden
                </Tag>
              )}
            </Space>
            
            {!isHiddenLead && record.email && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.email}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Region',
      dataIndex: 'region',
      key: 'region',
      width: 100,
      render: (text, record) => renderHiddenContent(record, 'region', text || '—', '•••'),
    },
    {
      title: 'Interest',
      dataIndex: 'InterestLevel',
      key: 'interest',
      width: 100,
      render: (level, record) => {
        if (isHidden(record)) {
          return <Tag style={{ filter: 'blur(3px)' }}>•••</Tag>;
        }
        
        const color = level === LeadInterestLevel.HIGH ? 'red' 
                    : level === LeadInterestLevel.MEDIUM ? 'orange' 
                    : level === LeadInterestLevel.LOW ? 'blue' 
                    : 'default';
        return <Tag color={color}>{level || 'Not Set'}</Tag>;
      },
    },
    {
      title: 'Budget',
      dataIndex: 'Budget',
      key: 'budget',
      width: 130,
      render: (budget, record) => {
        if (isHidden(record)) {
          return (
            <Space>
              <DollarOutlined />
              <span style={{ filter: 'blur(3px)' }}>•••••</span>
            </Space>
          );
        }
        
        if (!budget) return '—';
        
        const displayBudget = typeof budget === 'string' 
          ? budget 
          : `AED ${Number(budget).toLocaleString()}`;

        return (
          <Space>
            <DollarOutlined style={{ color: '#52c41a' }} />
            <span style={{ fontWeight: 500 }}>{displayBudget}</span>
          </Space>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status, record) => {
        if (isHidden(record)) {
          return <Tag style={{ filter: 'blur(3px)' }}>•••</Tag>;
        }
        
        const statusConfig = {
          [LeadStatus.PENDING]: { color: 'geekblue', text: 'Pending' },
          [LeadStatus.GAIN]: { color: 'green', text: 'Gain' },
          [LeadStatus.LOSS]: { color: 'red', text: 'Loss' },
          [LeadStatus.NO_RESPONSE]: { color: 'default', text: 'No Response' },
          [LeadStatus.NOT_INTERESTED]: { color: 'orange', text: 'Not Interested' },
          [LeadStatus.JUNK_LEAD]: { color: 'purple', text: 'Junk' },
        };
        const config = statusConfig[status] || { color: 'default', text: status || 'Unknown' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: 'Created',
      dataIndex: 'CreationDate',
      key: 'created',
      width: 110,
      render: (date, record) => {
        if (isHidden(record)) {
          return <Text type="secondary" style={{ filter: 'blur(3px)' }}>•••</Text>;
        }
        return date ? dayjs(date).format('DD MMM YYYY') : '—';
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      fixed: 'right',
      render: (_, record) => {
        const isRevealedLead = isRevealed(record);
        const assignedToMe = isAssignedToMe(record);
        
        return (
          <Space size="small">
            {assignedToMe && !isRevealedLead ? (
              <Tooltip title="Click to reveal lead details (this will be tracked)">
                <Button
                  type="primary"
                  size="small"
                  icon={<UnlockOutlined />}
                  onClick={() => handleRevealLead(record)}
                  loading={revealingLeadId === record.id}
                  style={{ background: '#faad14', borderColor: '#faad14' }}
                >
                  Reveal
                </Button>
              </Tooltip>
            ) : (
              <Tooltip title="View Details">
                <Button 
                  icon={<EyeOutlined />} 
                  onClick={() => onViewLead(record)}
                  size="small"
                />
              </Tooltip>
            )}

            {isMyOwnLead(record) && (
              <>
                <Tooltip title="Edit Lead">
                  <Button 
                    icon={<EditOutlined />} 
                    onClick={() => onEditLead(record)}
                    size="small"
                  />
                </Tooltip>

                <Tooltip title="Delete Lead">
                  <Button 
                    danger 
                    icon={<DeleteOutlined />} 
                    onClick={() => handleDelete(record)}
                    size="small"
                  />
                </Tooltip>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  // Get counts for filter badges
  const myLeadsCount = leads.filter(lead => isMyOwnLead(lead)).length;
  const assignedCount = leads.filter(lead => isAssignedToMe(lead)).length;
  const revealedCount = leads.filter(lead => isRevealed(lead) && !isMyOwnLead(lead)).length;
  const hiddenCount = leads.filter(lead => isHidden(lead)).length;

  return (
    <div>
      {/* Progress Stats Card */}
      <Card size="small" style={{ marginBottom: 16, background: '#f0f5ff' }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Total Leads"
              value={stats.totalLeads}
              prefix={<UserOutlined />}
              suffix={
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ({stats.ownLeadsCount} my leads)
                </Text>
              }
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Assigned to Me"
              value={stats.totalAssigned}
              prefix={<UserSwitchOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Revealed"
              value={stats.revealedCount}
              prefix={<UnlockOutlined />}
              valueStyle={{ color: '#52c41a' }}
              suffix={
                stats.totalAssigned > 0 && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    ({Math.round(stats.percentage)}%)
                  </Text>
                )
              }
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Hidden"
              value={stats.hiddenCount}
              prefix={<LockOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
        </Row>
        
        {/* Progress bar for assigned leads only */}
        {stats.totalAssigned > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text type="secondary">Reveal Progress (Assigned Leads)</Text>
              <Text strong>{Math.round(stats.percentage)}%</Text>
            </div>
            <Progress 
              percent={stats.percentage} 
              size="small"
              strokeColor="#52c41a"
              trailColor="#f0f0f0"
            />
          </div>
        )}
      </Card>

      {/* Lead Type Filter Tabs */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8 }}>
          <Text strong>Filter Leads:</Text>
        </div>
        <Radio.Group 
          value={leadTypeFilter} 
          onChange={(e) => setLeadTypeFilter(e.target.value)}
          buttonStyle="solid"
        >
          <Radio.Button value="all">
            <Space>
              <StarOutlined />
              All ({leads.length})
            </Space>
          </Radio.Button>
          <Radio.Button value="myLeads">
            <Space>
              <UserOutlined />
              My Leads ({myLeadsCount})
            </Space>
          </Radio.Button>
          <Radio.Button value="assigned">
            <Space>
              <UserSwitchOutlined />
              Assigned ({assignedCount})
            </Space>
          </Radio.Button>
          <Radio.Button value="revealed">
            <Space>
              <EyeOutlined />
              Revealed ({revealedCount})
            </Space>
          </Radio.Button>
          <Radio.Button value="hidden">
            <Space>
              <LockOutlined />
              Hidden ({hiddenCount})
            </Space>
          </Radio.Button>
        </Radio.Group>
      </Card>

      {/* Info Alert for New Assigned Leads */}
      {stats.hiddenCount > 0 && leadTypeFilter !== 'revealed' && leadTypeFilter !== 'myLeads' && (
        <Alert
          message="New Leads Assigned to You"
          description={
            <span>
              You have <strong>{stats.hiddenCount}</strong> new lead{stats.hiddenCount > 1 ? 's' : ''} assigned to you.
              Click the <strong>"Reveal"</strong> button on any lead to view its details. 
              This action will be tracked and timestamped.
            </span>
          }
          type="info"
          showIcon
          icon={<EyeInvisibleOutlined />}
          style={{ marginBottom: 16 }}
          closable
        />
      )}

      {/* Search and Filters */}
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
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
            placeholder="Status"
            allowClear
            style={{ width: 120 }}
            value={filteredStatus}
            onChange={setFilteredStatus}
          >
            {Object.values(LeadStatus).map(s => (
              <Option key={s} value={s}>{s}</Option>
            ))}
          </Select>

          <Select
            placeholder="Interest"
            allowClear
            style={{ width: 120 }}
            value={filteredInterest}
            onChange={setFilteredInterest}
          >
            {Object.values(LeadInterestLevel).map(l => (
              <Option key={l} value={l}>{l}</Option>
            ))}
          </Select>

          <RangePicker
            placeholder={['Start Date', 'End Date']}
            value={dateRange}
            onChange={setDateRange}
            style={{ width: 240 }}
          />

          <Button onClick={clearFilters} icon={<FilterOutlined />}>
            Clear All
          </Button>
        </Space>

        <span style={{ color: '#8c8c8c', fontSize: '14px' }}>
          Showing <strong>{filteredLeads.length}</strong> of <strong>{leads.length}</strong> leads
        </span>
      </Space>

      <Table
        columns={columns}
        dataSource={filteredLeads}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} leads`,
        }}
        scroll={{ x: 1300 }}
        bordered
        size="middle"
        rowClassName={(record) => {
          if (isHidden(record) && isAssignedToMe(record)) return 'hidden-lead-row';
          if (isMyOwnLead(record)) return 'own-lead-row';
          if (isRevealed(record) && isAssignedToMe(record)) return 'revealed-lead-row';
          return '';
        }}
      />

      <style>{`
        .hidden-lead-row {
          opacity: 0.85;
          background: #fef9e6;
        }
        .hidden-lead-row:hover {
          opacity: 1;
          background: #fff7e6 !important;
        }
        .own-lead-row {
          background: #f6ffed;
        }
        .revealed-lead-row {
          background: #e6f7ff;
        }
      `}</style>
    </div>
  );
};

export default SellerLeadList;