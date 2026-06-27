// LeadTable.js - With Created Date/Time and Assigned Date/Time

import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Tooltip, Space, Typography, Avatar, message, Select, Modal, Badge } from 'antd';
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
  ExclamationCircleOutlined,
  CrownOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  CalendarOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import { LeadStatus, LeadInterestLevel, LeadStatusLabels, LeadStatusColors } from 'models/LeadModel';
import { db, collection, getDocs, query, where } from 'configs/FirebaseConfig';
import { UserRoles } from 'models/UserModel';
import dayjs from 'dayjs';

const { Text } = Typography;
const { confirm } = Modal;

// Status configuration with colors and labels
const statusConfig = {
  [LeadStatus.NEW]: { color: 'blue', label: 'New', icon: <ClockCircleOutlined /> },
  [LeadStatus.CONTACTED]: { color: 'orange', label: 'Contacted', icon: <PhoneOutlined /> },
  [LeadStatus.INTERESTED]: { color: 'green', label: 'Interested', icon: <CheckCircleOutlined /> },
  [LeadStatus.NOT_INTERESTED]: { color: 'red', label: 'Not Interested', icon: <CloseCircleOutlined /> },
  [LeadStatus.CONVERTED]: { color: 'purple', label: 'Converted', icon: <TeamOutlined /> },
  [LeadStatus.JUNK_LEAD]: { color: 'gray', label: 'Junk', icon: <DeleteOutlined /> },
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

// Admin roles that should be highlighted
const ADMIN_ROLES = [UserRoles.CEO, UserRoles.ADMIN, UserRoles.MANAGER, UserRoles.SUPER_ADMIN];
const HR_ROLES = [UserRoles.HR];

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
  companyId,
  userRole,
  onViewHistory,
}) => {
  const [data, setData] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [changingStatus, setChangingStatus] = useState({});
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [adminUserIds, setAdminUserIds] = useState(new Set());

  // Check if user is HR
  const isHR = HR_ROLES.includes(userRole);
  // Check if user is CEO/Admin
  const isCEO = userRole === UserRoles.CEO || userRole === UserRoles.SUPER_ADMIN;

  // Fetch all users from the company
  useEffect(() => {
    const fetchAllUsers = async () => {
      if (!companyId) {
        setAllUsers(sellers);
        const adminIds = new Set();
        sellers.forEach(s => {
          if (ADMIN_ROLES.includes(s.Role)) {
            adminIds.add(s.id);
          }
        });
        setAdminUserIds(adminIds);
        return;
      }
      
      setUsersLoading(true);
      try {
        const usersQuery = query(
          collection(db, 'users'),
          where('company_id', '==', companyId)
        );
        const usersSnap = await getDocs(usersQuery);
        const usersList = usersSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            name: `${data.firstname || ''} ${data.lastname || ''}`.trim() || data.email || 'Unknown',
            role: data.Role || data.role || 'User'
          };
        });
        setAllUsers(usersList);
        
        const adminIds = new Set();
        usersList.forEach(user => {
          if (ADMIN_ROLES.includes(user.Role) || ADMIN_ROLES.includes(user.role)) {
            adminIds.add(user.id);
          }
        });
        setAdminUserIds(adminIds);
        
        console.log('📊 [LeadTable] Fetched all users:', usersList.length);
      } catch (error) {
        console.error('Error fetching users:', error);
        setAllUsers(sellers);
        const adminIds = new Set();
        sellers.forEach(s => {
          if (ADMIN_ROLES.includes(s.Role)) {
            adminIds.add(s.id);
          }
        });
        setAdminUserIds(adminIds);
      } finally {
        setUsersLoading(false);
      }
    };

    fetchAllUsers();
  }, [companyId, sellers]);

  useEffect(() => {
    const sortedLeads = [...leads].sort((a, b) => {
      const dateA = a.CreationDate?.toDate?.() || new Date(a.CreationDate) || new Date(0);
      const dateB = b.CreationDate?.toDate?.() || new Date(b.CreationDate) || new Date(0);
      return dateB - dateA;
    });

    setData(sortedLeads);
    setSelectedRowKeys([]);
  }, [leads]);

  // HR cannot select rows
  const rowSelection = isHR ? undefined : {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
    columnWidth: 40,
    getCheckboxProps: (record) => ({
      disabled: record.status === LeadStatus.CONVERTED || record.convertedContactId,
    }),
  };

  const handleBulkConvert = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select leads to convert');
      return;
    }
    onBulkConvert?.(selectedRowKeys);
    setSelectedRowKeys([]);
  };

  const handleStatusChange = async (leadId, newStatus, record) => {
    if (isHR) {
      message.warning('HR users cannot change lead status');
      return;
    }

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

  const getUserName = (userId) => {
    if (!userId) return null;
    const user = allUsers.find(u => u.id === userId);
    return user ? user.name : null;
  };

  const checkIsAdmin = (userId) => {
    if (!userId) return false;
    return adminUserIds.has(userId);
  };

  // Format date with time
  const formatDateWithTime = (date) => {
    if (!date) return '—';
    const d = date.toDate?.() || date;
    return dayjs(d).format('MMM DD, YYYY HH:mm');
  };

  // Format date without time (for compact display)
  const formatDateShort = (date) => {
    if (!date) return '—';
    const d = date.toDate?.() || date;
    return dayjs(d).format('MMM DD, YYYY');
  };

  // Format time only
  const formatTime = (date) => {
    if (!date) return '—';
    const d = date.toDate?.() || date;
    return dayjs(d).format('HH:mm');
  };

  // ─── HR COLUMNS ──────────────────────────────────────────────────────────
  const hrColumns = [
    {
      title: 'Lead',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 200,
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar
            size={36}
            style={{
              background: stringToColor(text || 'U'),
              fontSize: 14,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {(text || 'U')[0].toUpperCase()}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <Text style={{ 
              fontWeight: 600, 
              color: '#1d1d1d', 
              display: 'block', 
              fontSize: 13,
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis' 
            }}>
              {text}
            </Text>
            <Space size={4} wrap>
              {record.region && (
                <Tag size="small" style={{ fontSize: 10, margin: 0 }}>
                  <GlobalOutlined style={{ marginRight: 3, fontSize: 10 }} />
                  {record.region}
                </Tag>
              )}
            </Space>
          </div>
        </div>
      ),
      sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
    },
    {
      title: 'Assigned To',
      dataIndex: 'seller_id',
      key: 'seller_id',
      width: 160,
      render: (sellerId, record) => {
        const sellerName = getUserName(sellerId);
        const isAssigned = sellerId && sellerId !== '';
        
        return (
          <div>
            <Space size={4}>
              {isAssigned ? (
                <Avatar size={22} style={{ background: '#722ed1', fontSize: 10 }}>
                  {(sellerName || 'U')[0].toUpperCase()}
                </Avatar>
              ) : (
                <Avatar size={22} style={{ background: '#d9d9d9', fontSize: 10 }}>
                  <UserOutlined />
                </Avatar>
              )}
              <Text style={{ fontSize: 12 }}>
                {isAssigned ? (sellerName || 'Unknown') : 'Unassigned'}
              </Text>
            </Space>
            {isAssigned && record.assignedAt && (
              <div style={{ fontSize: 10, color: '#8c8c8c', marginTop: 2 }}>
                <UserSwitchOutlined style={{ marginRight: 3, fontSize: 10 }} />
                Assigned: {formatDateWithTime(record.assignedAt)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Created By',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: 160,
      render: (createdBy, record) => {
        if (createdBy) {
          const userName = getUserName(createdBy);
          const isAdmin = checkIsAdmin(createdBy);
          
          return (
            <div>
              <Space size={4}>
                {isAdmin ? (
                  <CrownOutlined style={{ fontSize: 14, color: '#faad14' }} />
                ) : (
                  <UserOutlined style={{ fontSize: 14, color: '#1677ff' }} />
                )}
                <Text style={{ 
                  fontSize: 12, 
                  color: isAdmin ? '#faad14' : '#1677ff',
                  fontWeight: isAdmin ? 600 : 400
                }}>
                  {userName || 'Unknown'}
                </Text>
              </Space>
              <div style={{ fontSize: 10, color: '#8c8c8c', marginTop: 2 }}>
                <CalendarOutlined style={{ marginRight: 3, fontSize: 10 }} />
                Created: {formatDateWithTime(record.CreationDate)}
              </div>
            </div>
          );
        }
        return (
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>Unknown</Text>
            <div style={{ fontSize: 10, color: '#8c8c8c', marginTop: 2 }}>
              <CalendarOutlined style={{ marginRight: 3, fontSize: 10 }} />
              Created: {formatDateWithTime(record.CreationDate)}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Tooltip title="View History">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined style={{ fontSize: 14, color: '#1677ff' }} />}
            onClick={(e) => {
              e.stopPropagation();
              onViewHistory?.(record);
            }}
          />
        </Tooltip>
      ),
    },
  ];

  // ─── CEO/ADMIN FULL COLUMNS ──────────────────────────────────────────────
  const fullColumns = [
    {
      title: 'Lead',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 200,
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar
            size={36}
            style={{
              background: stringToColor(text || 'U'),
              fontSize: 14,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {(text || 'U')[0].toUpperCase()}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <a
              onClick={() => onViewDetails(record)}
              style={{ 
                fontWeight: 600, 
                color: '#1d1d1d', 
                display: 'block', 
                fontSize: 13,
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis' 
              }}
            >
              {text}
            </a>
            <Space size={4} wrap>
              {record.region && (
                <Tag size="small" style={{ fontSize: 10, margin: 0 }}>
                  <GlobalOutlined style={{ marginRight: 3, fontSize: 10 }} />
                  {record.region}
                </Tag>
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
      width: 80,
      render: (_, record) => (
        <Space size={2} onClick={e => e.stopPropagation()}>
          {record.email && (
            <Tooltip title={record.email}>
              <Button
                type="text"
                size="small"
                icon={<MailOutlined style={{ color: '#1677ff', fontSize: 14 }} />}
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
                icon={<PhoneOutlined style={{ color: '#52c41a', fontSize: 14 }} />}
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
      width: 170,
      render: (status, record) => {
        const isConverted = record.convertedContactId || status === LeadStatus.CONVERTED;
        const config = statusConfig[status] || { color: 'default', label: status || '—', icon: null };
        
        if (isConverted) {
          return (
            <Tag
              color="purple"
              style={{ 
                borderRadius: 20, 
                fontWeight: 600, 
                fontSize: 12, 
                padding: '4px 12px',
                cursor: 'default',
                border: 'none'
              }}
              onClick={e => e.stopPropagation()}
            >
              {config.icon} {config.label} ✓
            </Tag>
          );
        }

        return (
          <div onClick={e => e.stopPropagation()} style={{ display: 'inline-block', width: '100%' }}>
            <Select
              value={status || LeadStatus.NEW}
              onChange={(value) => handleStatusChange(record.id, value, record)}
              loading={changingStatus[record.id]}
              style={{ width: '100%', minWidth: 130 }}
              size="small"
              dropdownMatchSelectWidth={220}
              disabled={changingStatus[record.id]}
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              className="status-select"
            >
              {statusOptions.map(option => (
                <Select.Option key={option.value} value={option.value}>
                  <Tag 
                    color={option.color} 
                    style={{ 
                      margin: 0, 
                      padding: '2px 10px',
                      borderRadius: 12,
                      fontWeight: 500,
                      fontSize: 12
                    }}
                  >
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
      width: 90,
      render: level => (
        <Tag
          color={interestLevelColors[level] || 'default'}
          style={{ 
            borderRadius: 12, 
            fontWeight: 600, 
            fontSize: 11,
            padding: '2px 10px',
            border: 'none'
          }}
          onClick={e => e.stopPropagation()}
        >
          {level || '—'}
        </Tag>
      ),
    },
    {
      title: 'Assigned To',
      dataIndex: 'seller_id',
      key: 'seller_id',
      width: 170,
      render: (sellerId, record) => {
        const sellerName = getUserName(sellerId);
        const isAssigned = sellerId && sellerId !== '';
        
        return (
          <div>
            <Space size={4} onClick={e => e.stopPropagation()}>
              {isAssigned ? (
                <Avatar size={22} style={{ background: '#722ed1', fontSize: 10 }}>
                  {(sellerName || 'U')[0].toUpperCase()}
                </Avatar>
              ) : (
                <Avatar size={22} style={{ background: '#d9d9d9', fontSize: 10 }}>
                  <UserOutlined />
                </Avatar>
              )}
              <Text style={{ fontSize: 12 }}>
                {isAssigned ? (sellerName || 'Unknown') : 'Unassigned'}
              </Text>
              <Tooltip title={isAssigned ? "Reassign to another seller" : "Assign to seller"}>
                <Button
                  type="text"
                  size="small"
                  icon={<UserAddOutlined style={{ color: isAssigned ? '#722ed1' : '#1677ff', fontSize: 13 }} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssignSeller(record);
                  }}
                />
              </Tooltip>
            </Space>
            {isAssigned && record.assignedAt && (
              <div style={{ fontSize: 10, color: '#8c8c8c', marginTop: 2 }}>
                <UserSwitchOutlined style={{ marginRight: 3, fontSize: 10 }} />
                Assigned: {formatDateWithTime(record.assignedAt)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Created By',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: 170,
      render: (createdBy, record) => {
        if (createdBy) {
          const userName = getUserName(createdBy);
          const isSameAsAssigned = record.seller_id === createdBy;
          const isAdmin = checkIsAdmin(createdBy);
          
          return (
            <div>
              <Tooltip title={isSameAsAssigned ? "Created by assigned seller" : `Created by ${userName}`}>
                <Space size={4}>
                  {isAdmin ? (
                    <CrownOutlined style={{ fontSize: 14, color: '#faad14' }} />
                  ) : (
                    <UserOutlined style={{ fontSize: 14, color: isSameAsAssigned ? '#52c41a' : '#1677ff' }} />
                  )}
                  <Text style={{ 
                    fontSize: 12, 
                    color: isAdmin ? '#faad14' : (isSameAsAssigned ? '#52c41a' : '#1677ff'),
                    fontWeight: isAdmin ? 600 : 400
                  }}>
                    {userName}
                    {isSameAsAssigned && ' ✓'}
                  </Text>
                </Space>
              </Tooltip>
              <div style={{ fontSize: 10, color: '#8c8c8c', marginTop: 2 }}>
                <CalendarOutlined style={{ marginRight: 3, fontSize: 10 }} />
                Created: {formatDateWithTime(record.CreationDate)}
              </div>
            </div>
          );
        }
        return (
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>Unknown</Text>
            <div style={{ fontSize: 10, color: '#8c8c8c', marginTop: 2 }}>
              <CalendarOutlined style={{ marginRight: 3, fontSize: 10 }} />
              Created: {formatDateWithTime(record.CreationDate)}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Looking For',
      dataIndex: 'lookingFor',
      key: 'lookingFor',
      width: 120,
      ellipsis: true,
      render: (text) => text ? (
        <Text style={{ fontSize: 12 }} ellipsis={{ tooltip: text }}>
          {text}
        </Text>
      ) : (
        <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
      ),
      responsive: ['lg'],
    },
    {
      title: 'Budget',
      dataIndex: 'Budget',
      key: 'Budget',
      width: 120,
      render: (budget) => {
        if (!budget) {
          return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
        }
        if (typeof budget === 'number' || !isNaN(Number(budget))) {
          const num = Number(budget);
          return (
            <Space size={4}>
              <DollarOutlined style={{ color: '#52c41a', fontSize: 12 }} />
              <Text strong style={{ color: '#1677ff', fontSize: 12 }}>
                {num >= 1000000 ? `${(num / 1000000).toFixed(1)}M` : `${(num / 1000).toFixed(0)}K`}
              </Text>
            </Space>
          );
        }
        return (
          <Tooltip title={budget}>
            <Text style={{ fontSize: 12, cursor: 'help' }}>
              {budget.length > 15 ? budget.substring(0, 15) + '...' : budget}
            </Text>
          </Tooltip>
        );
      },
      sorter: (a, b) => {
        const valA = typeof a.Budget === 'number' ? a.Budget : 0;
        const valB = typeof b.Budget === 'number' ? b.Budget : 0;
        return valA - valB;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 90,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4} onClick={e => e.stopPropagation()}>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined style={{ fontSize: 14 }} />}
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
              icon={<DeleteOutlined style={{ fontSize: 14 }} />}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(record);
              }}
            />
          </Tooltip>
          <Tooltip title="View History">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined style={{ fontSize: 14, color: '#1677ff' }} />}
              onClick={(e) => {
                e.stopPropagation();
                onViewHistory?.(record);
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Select columns based on user role
  const columns = isHR ? hrColumns : fullColumns;

  return (
    <div>
      {/* Bulk action toolbar - Hide for HR */}
      {!isHR && selectedRowKeys.length > 0 && (
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
          <Badge count={selectedRowKeys.length} style={{ backgroundColor: '#1677ff' }}>
            <Text strong style={{ color: '#1677ff', marginRight: 8 }}>
              Selected
            </Text>
          </Badge>
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
        loading={loading || usersLoading}
        size="middle"
        scroll={{ x: isHR ? 650 : 1500 }}
        onRow={record => ({
          onClick: isHR ? undefined : () => onViewDetails(record),
          style: { cursor: isHR ? 'default' : 'pointer' },
        })}
        rowClassName={(_, index) =>
          index % 2 === 0 ? 'table-row-even' : 'table-row-odd'
        }
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) =>
            `${range[0]}–${range[1]} of ${total} leads`,
          size: 'default',
        }}
        style={{ borderRadius: 10, overflow: 'hidden' }}
        bordered={false}
      />

      <style>{`
        .table-row-even { background: #ffffff; }
        .table-row-odd  { background: #fafafa; }
        .ant-table-tbody > tr:hover > td { background: ${isHR ? '#fafafa' : '#e6f7ff'} !important; }
        
        .status-select .ant-select-selector {
          border-radius: 20px !important;
          border-color: #d9d9d9 !important;
          height: 32px !important;
        }
        
        .status-select .ant-select-selection-item {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .status-select .ant-select-arrow {
          color: #888;
        }
        
        .ant-table-cell {
          padding: 12px 10px !important;
        }
        
        .ant-table-thead > tr > th {
          background: #f5f6fa !important;
          font-weight: 600 !important;
          font-size: 12px !important;
          color: #1a1a2e !important;
          border-bottom: 2px solid #e8e8e8 !important;
        }
        
        .ant-tag {
          border: none;
        }
      `}</style>
    </div>
  );
};

// Deterministic color from string
function stringToColor(str) {
  const palette = ['#1677ff', '#52c41a', '#722ed1', '#fa8c16', '#13c2c2', '#eb2f96', '#faad14', '#2f54eb', '#eb2f96'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

export default LeadTable;