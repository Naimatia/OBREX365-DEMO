import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Tooltip, Space, Typography, Avatar, Dropdown, message, Select, Modal } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  UserAddOutlined,
  PhoneOutlined,
  MailOutlined,
  GlobalOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  UserOutlined,
  MoreOutlined,
  SwapOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { LeadStatus, LeadInterestLevel, LeadStatusLabels, LeadStatusColors } from 'models/LeadModel';
import dayjs from 'dayjs';

const { Text } = Typography;
const { confirm } = Modal;

// Status configuration with colors and labels
const statusConfig = {
  [LeadStatus.NEW]: { color: 'blue', label: 'New' },
  [LeadStatus.CONTACTED]: { color: 'orange', label: 'Contacted' },
  [LeadStatus.INTERESTED]: { color: 'green', label: 'Interested' },
  [LeadStatus.NOT_INTERESTED]: { color: 'red', label: 'Not Interested' },
  [LeadStatus.CONVERTED]: { color: 'purple', label: 'Converted' },
  [LeadStatus.JUNK_LEAD]: { color: 'purple', label: 'Junk' },

  
};

// Status options for dropdown
const statusOptions = Object.values(LeadStatus).map(status => ({
  value: status,
  label: LeadStatusLabels[status] || status,
  color: LeadStatusColors[status] || 'blue'
}));

const interestLevelColors = {
  [LeadInterestLevel.LOW]: 'orange',
  [LeadInterestLevel.MEDIUM]: 'blue',
  [LeadInterestLevel.HIGH]: 'green',
};

const LeadTable = ({
  leads,
  loading,
  onEdit,
  onDelete,
  onAssignSeller,
  onViewDetails,
  onBulkAssign,
  onBulkConvert,
  onStatusChange,
  sellers = [],
  onReassignSeller,
}) => {
  const [data, setData] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [changingStatus, setChangingStatus] = useState({});

  useEffect(() => {
    // Sort by newest CreationDate by default
    const sortedLeads = [...leads].sort((a, b) => {
      const dateA = a.CreationDate?.toDate?.() || new Date(a.CreationDate) || new Date(0);
      const dateB = b.CreationDate?.toDate?.() || new Date(b.CreationDate) || new Date(0);
      return dateB - dateA; // Newest first
    });

    setData(sortedLeads);
    setSelectedRowKeys([]);
  }, [leads]);

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
    columnWidth: 40,
    getCheckboxProps: (record) => ({
      disabled: record.status === LeadStatus.CONVERTED || record.convertedContactId,
    }),
  };

  // Handle bulk convert
  const handleBulkConvert = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select leads to convert');
      return;
    }
    onBulkConvert?.(selectedRowKeys);
    setSelectedRowKeys([]);
  };

  // Handle status change with auto-conversion
  const handleStatusChange = async (leadId, newStatus, record) => {
    // If changing to CONVERTED, confirm with user
    if (newStatus === LeadStatus.CONVERTED && !record.convertedContactId) {
      confirm({
        title: 'Convert Lead to Contact',
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <p>This will convert the lead to a contact and create a new contact record.</p>
            <p><strong>Lead:</strong> {record.name}</p>
            <p><strong>Email:</strong> {record.email}</p>
            <p><strong>Phone:</strong> {record.phoneNumber}</p>
          </div>
        ),
        okText: 'Convert',
        cancelText: 'Cancel',
        onOk: async () => {
          setChangingStatus(prev => ({ ...prev, [leadId]: true }));
          try {
            await onStatusChange?.(leadId, newStatus);
            message.success('Lead converted to contact successfully!');
          } catch (error) {
            message.error('Failed to convert lead: ' + error.message);
          } finally {
            setChangingStatus(prev => ({ ...prev, [leadId]: false }));
          }
        },
        onCancel: () => {
          setChangingStatus(prev => ({ ...prev, [leadId]: false }));
        }
      });
      return;
    }

    // Regular status change
    setChangingStatus(prev => ({ ...prev, [leadId]: true }));
    try {
      await onStatusChange?.(leadId, newStatus);
      message.success(`Status updated to ${LeadStatusLabels[newStatus] || newStatus}`);
    } catch (error) {
      message.error('Failed to update status: ' + error.message);
    } finally {
      setChangingStatus(prev => ({ ...prev, [leadId]: false }));
    }
  };

  // Handle reassign seller - opens the AssignSellerForm
  const handleReassignSeller = (record) => {
    onAssignSeller(record);
  };

  // Get current seller name
  const getSellerName = (sellerId) => {
    if (!sellerId) return 'Unassigned';
    const seller = sellers.find(s => s.id === sellerId);
    return seller ? seller.name : 'Unknown';
  };

  const columns = [
    {
      title: 'Lead',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (text, record) => (
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
              onClick={() => onViewDetails(record)}
              style={{ fontWeight: 600, color: '#1d1d1d', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {text}
            </a>
            <Space size={4} wrap>
              {record.region && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  <GlobalOutlined style={{ marginRight: 3 }} />
                  {record.region}
                </Text>
              )}
            </Space>
          </div>
        </div>
      ),
      sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
    },
    {
      title: 'Contact',
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
        const isConverted = record.convertedContactId || status === LeadStatus.CONVERTED;
        
        // If converted, show as read-only tag with auto-convert indicator
        if (isConverted) {
          const config = statusConfig[status] || { color: 'default', label: status || '—' };
          return (
            <Tooltip title="This lead has been converted to a contact">
              <Tag
                color={config.color}
                style={{ borderRadius: 20, fontWeight: 500, fontSize: 11, cursor: 'default' }}
                onClick={e => e.stopPropagation()}
              >
                {config.label} ✓
              </Tag>
            </Tooltip>
          );
        }

        // Status dropdown for non-converted leads
        return (
          <div onClick={e => e.stopPropagation()} style={{ display: 'inline-block' }}>
            <Select
              value={status || LeadStatus.NEW}
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
      title: 'Interest',
      dataIndex: 'InterestLevel',
      key: 'InterestLevel',
      width: 100,
      render: level => (
        <Tag
          color={interestLevelColors[level] || 'default'}
          style={{ borderRadius: 20, fontWeight: 500, fontSize: 11 }}
          onClick={e => e.stopPropagation()}
        >
          {level || '—'}
        </Tag>
      ),
    },
    {
      title: 'Seller',
      dataIndex: 'seller_id',
      key: 'seller_id',
      width: 150,
      render: (sellerId, record) => {
        const sellerName = getSellerName(sellerId);
        const isAssigned = sellerId && sellerId !== '';
        
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
                  onAssignSeller(record);
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
              AED {num.toLocaleString()}
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
            {dayjs(date.toDate?.() || date).format('MMM DD, YYYY')}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
      sorter: (a, b) => {
        if (!a.CreationDate) return -1;
        if (!b.CreationDate) return 1;
        return (a.CreationDate.toDate?.() || new Date(a.CreationDate)) -
          (b.CreationDate.toDate?.() || new Date(b.CreationDate));
      },
      responsive: ['lg'],
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Space size={2} onClick={e => e.stopPropagation()}>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(record);
              }}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(record);
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
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
            {selectedRowKeys.length} lead{selectedRowKeys.length > 1 ? 's' : ''} selected
          </Text>
          <Button
            type="primary"
            size="small"
            icon={<TeamOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onBulkAssign?.(selectedRowKeys);
            }}
            style={{ borderRadius: 6 }}
          >
            Assign to Seller
          </Button>
          <Button
            size="small"
            icon={<UserOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleBulkConvert();
            }}
            style={{ borderRadius: 6 }}
            disabled={selectedRowKeys.some(key => {
              const lead = leads.find(l => l.id === key);
              return lead?.convertedContactId || lead?.status === LeadStatus.CONVERTED;
            })}
          >
            Convert to Contacts
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

      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        size="middle"
        scroll={{ x: 800 }}
        onRow={record => ({
          onClick: () => onViewDetails(record),
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
            `${range[0]}–${range[1]} of ${total} leads`,
          size: 'small',
        }}
        style={{ borderRadius: 10, overflow: 'hidden' }}
      />

      <style>{`
        .table-row-even { background: #fff; }
        .table-row-odd  { background: #fafafa; }
        .ant-table-tbody > tr:hover > td { background: #f0f5ff !important; }
      `}</style>
    </div>
  );
};

// Deterministic color from string
function stringToColor(str) {
  const palette = ['#1677ff', '#52c41a', '#722ed1', '#fa8c16', '#13c2c2', '#eb2f96', '#faad14'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

export default LeadTable;