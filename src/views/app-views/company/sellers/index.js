// pages/SellersPage.js
// ─── Team Management with Ban/Unban Functionality ──────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Tag, Space, Button, Input, Select, Modal,
  message, Tooltip, Popconfirm, Typography, Row, Col,
  Statistic, Avatar, Badge, Switch, Alert, Divider
} from 'antd';
import {
  UserAddOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  PhoneOutlined, MailOutlined, TeamOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
  ReloadOutlined, UserOutlined, StopOutlined, PlayCircleOutlined,
  KeyOutlined, ExclamationCircleOutlined, SwapOutlined,
  UserSwitchOutlined, PlusCircleOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import UserService from 'services/firebase/UserService';
import ContactsService from 'services/ContactsService';
import DealsService from 'services/DealsService';
import LeadsService from 'services/LeadsService';
import { UserRoles } from 'models/UserModel';
import { LeadStatus } from 'models/LeadModel'; // ← ADD THIS IMPORT
import dayjs from 'dayjs';
import AddUserForm from './AddUserForm';
import EditUserForm from './EditUserForm';
import BulkLeadTransferModal from '../../components/BulkLeadTransfer/BulkLeadTransferModal';
import { auth } from 'configs/FirebaseConfig';

const { Title, Text } = Typography;
const { Option } = Select;

// ─── Color System ─────────────────────────────────────────────────────────────
const C = {
  green:  '#00c48c', red:    '#ff4757', blue:   '#2563eb',
  purple: '#7c3aed', orange: '#f97316', cyan:   '#06b6d4',
  gold:   '#f59e0b', pink:   '#ec4899', lime:   '#84cc16',
  indigo: '#6366f1', teal:   '#14b8a6', rose:   '#f43f5e',
  slate:  '#64748b', dark:   '#0f172a',
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, color = C.blue, sub }) => (
  <Card
    size="small"
    style={{
      borderRadius: 14,
      border: `1px solid ${color}28`,
      background: `linear-gradient(145deg, #fff 55%, ${color}0d 100%)`,
      height: '100%',
    }}
    bodyStyle={{ padding: '14px 16px' }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: `${color}18`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 18, color
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text type="secondary" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600 }}>
          {label}
        </Text>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</span>
        </div>
        {sub && <Text type="secondary" style={{ fontSize: 11 }}>{sub}</Text>}
      </div>
    </div>
  </Card>
);

// ─── Change Password Modal ────────────────────────────────────────────────────
const ChangePasswordModal = ({ visible, user, onCancel, onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No user logged in');
      }

      const idToken = await currentUser.getIdToken();
      
      const response = await fetch('https://delete-user-demo.vercel.app/api/changeUserPassword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userId: user.id,
          newPassword: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      message.success(`Password changed successfully for ${user.firstname} ${user.lastname}`);
      setNewPassword('');
      setConfirmPassword('');
      onSuccess();
    } catch (err) {
      setError(err.message);
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ 
            width: 36, height: 36, borderRadius: '50%', 
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 16
          }}>
            <KeyOutlined />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Change Password</div>
            <div style={{ fontSize: 12, color: '#888' }}>
              {user?.firstname} {user?.lastname} · {user?.email}
            </div>
          </div>
        </div>
      }
      open={visible}
      onCancel={() => {
        setNewPassword('');
        setConfirmPassword('');
        setError('');
        onCancel();
      }}
      footer={[
        <Button key="cancel" onClick={() => {
          setNewPassword('');
          setConfirmPassword('');
          setError('');
          onCancel();
        }}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          icon={<KeyOutlined />}
          loading={loading}
          onClick={handleSubmit}
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none' }}
        >
          Change Password
        </Button>,
      ]}
      width={460}
    >
      <div style={{ marginBottom: 16 }}>
        <Alert
          message="Password will be changed immediately"
          description="The user will be able to log in with the new password."
          type="info"
          showIcon
          style={{ borderRadius: 8 }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 6, fontWeight: 600, fontSize: 13 }}>
          <KeyOutlined style={{ marginRight: 6, color: '#7c3aed' }} />
          New Password
        </div>
        <Input.Password
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Enter new password (min 6 characters)"
          size="large"
          style={{ borderRadius: 8 }}
          prefix={<KeyOutlined style={{ color: '#bbb' }} />}
        />
        <div style={{ marginTop: 4, fontSize: 11, color: '#888' }}>
          Minimum 6 characters
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 6, fontWeight: 600, fontSize: 13 }}>
          <CheckCircleOutlined style={{ marginRight: 6, color: '#7c3aed' }} />
          Confirm Password
        </div>
        <Input.Password
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          size="large"
          style={{ borderRadius: 8 }}
          prefix={<CheckCircleOutlined style={{ color: '#bbb' }} />}
        />
      </div>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          style={{ borderRadius: 8, marginBottom: 8 }}
        />
      )}
    </Modal>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const SellersPage = () => {
  const reduxUser = useSelector(s => s.auth.user);
  const companyId = reduxUser?.company_id || '';
  const userRole = reduxUser?.Role || '';

  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState(undefined);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordUser, setPasswordUser] = useState(null);

  // ── Transfer state ───────────────────────────────────────────────────────────
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [transferFromSeller, setTransferFromSeller] = useState(null);

  const salesRoles = [
    UserRoles.SELLER, UserRoles.SALES_EXECUTIVE, UserRoles.AGENT,
    UserRoles.TEAM_LEADER, UserRoles.SALES_MANAGER,
    UserRoles.OFF_PLAN_SALES, UserRoles.READY_TO_MOVE_SALES
  ];
  const canManageUsers = [UserRoles.CEO, UserRoles.HR].includes(userRole);

  // ── Fetch Users with Lead Stats ────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const list = await UserService.getUsersByCompanyId(companyId);
      // Filter out current user from list
      const filtered = list.filter(u => u.id !== reduxUser?.id && u.id);
      
      // Fetch lead stats for each user
      const usersWithStats = await Promise.all(filtered.map(async (user) => {
        try {
          // Get leads assigned to this seller
          const assignedLeads = await LeadsService.getSellerLeads(companyId, user.id);
          
          // Get leads created by this seller
          const createdLeads = await LeadsService.getCompanyLeads(companyId).then(leads => 
            leads.filter(lead => lead.createdBy === user.id || lead.creator_id === user.id)
          );
          
          // Count contacted leads from assigned leads
          const contactedLeads = assignedLeads.filter(lead => 
            lead.status === LeadStatus.CONTACTED || 
            lead.status === LeadStatus.INTERESTED || 
            lead.contacted === true
          ).length;
          
          return {
            ...user,
            assignedLeadsCount: assignedLeads.length,
            createdLeadsCount: createdLeads.length,
            totalLeads: assignedLeads.length,
            contactedLeads: contactedLeads,
          };
        } catch (err) {
          console.warn(`Failed to load leads for user ${user.id}:`, err);
          return {
            ...user,
            assignedLeadsCount: 0,
            createdLeadsCount: 0,
            totalLeads: 0,
            contactedLeads: 0,
          };
        }
      }));
      
      setUsers(usersWithStats);
      setFilteredUsers(usersWithStats);
    } catch (err) {
      console.error('Error fetching users:', err);
      message.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, [companyId, reduxUser?.id]);

  useEffect(() => {
    if (companyId) {
      fetchUsers();
    }
  }, [companyId, fetchUsers]);

  useEffect(() => {
    let r = [...users];
    if (searchText) {
      const q = searchText.toLowerCase();
      r = r.filter(u =>
        u.firstname?.toLowerCase().includes(q) ||
        u.lastname?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    }
    if (roleFilter) r = r.filter(u => u.Role === roleFilter);
    setFilteredUsers(r);
  }, [searchText, roleFilter, users]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAddUser = async (values) => {
    try {
      setLoading(true);
      await UserService.createSellerDirectly({
        ...values,
        company_id: companyId,
        Role: values.Role || UserRoles.SELLER,
        isBanned: false,
        forcePasswordReset: true,
      });
      message.success(`${values.firstname} ${values.lastname} added successfully.`);
      setIsAddModalVisible(false);
      await fetchUsers();
    } catch (err) {
      message.error(`Failed to add user: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (values) => {
    try {
      setLoading(true);
      await UserService.updateUserProfile(currentUser.id, {
        firstname: values.firstname,
        lastname: values.lastname,
        phoneNumber: values.phoneNumber,
        phoneNumber2: values.phoneNumber2,
        phoneNumber3: values.phoneNumber3,
        country: values.country,
        Role: values.role,
      });
      message.success('User updated successfully.');
      setIsEditModalVisible(false);
      await fetchUsers();
    } catch (err) {
      message.error(`Failed to update user: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ─── Ban/Unban User ──────────────────────────────────────────────────────
  const handleToggleBan = async (user) => {
    const isBanned = !user.isBanned;
    
    Modal.confirm({
      title: `${isBanned ? 'Ban' : 'Unban'} User`,
      icon: <ExclamationCircleOutlined style={{ color: isBanned ? '#ff4d4f' : '#52c41a' }} />,
      content: (
        <div>
          <p>
            {isBanned ? (
              <span>This will <b style={{ color: '#ff4d4f' }}>BAN</b> the user account.</span>
            ) : (
              <span>This will <b style={{ color: '#52c41a' }}>UNBAN</b> the user account.</span>
            )}
          </p>
          <p><b>User:</b> {user.firstname} {user.lastname}</p>
          <p><b>Email:</b> {user.email}</p>
          <p style={{ color: isBanned ? '#ff4d4f' : '#52c41a', fontSize: 12 }}>
            {isBanned 
              ? '⚠️ Banned users cannot log in or access the system.' 
              : '✅ Unbanned users can log in normally.'}
          </p>
        </div>
      ),
      okText: isBanned ? 'Yes, Ban User' : 'Yes, Unban User',
      okType: isBanned ? 'danger' : 'primary',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setLoading(true);
          await UserService.toggleUserBan(user.id, isBanned);
          message.success(`${user.firstname} ${user.lastname} ${isBanned ? 'banned' : 'unbanned'} successfully.`);
          await fetchUsers();
        } catch (err) {
          message.error(`Failed to ${isBanned ? 'ban' : 'unban'} user: ${err.message}`);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // ──────────────────────────────────────────────────────────────────────────
  const handleDeleteUser = async (id) => {
    try {
      setLoading(true);
      await UserService.deleteUser(id);
      message.success('User deleted successfully.');
      await fetchUsers();
    } catch (err) {
      message.error(`Failed to delete user: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (user) => {
    setPasswordUser(user);
    setPasswordModalVisible(true);
  };

  // ── Role colors ──────────────────────────────────────────────────────────
  const roleColor = {
    [UserRoles.CEO]: 'gold',
    [UserRoles.HR]: 'geekblue',
    [UserRoles.SELLER]: 'green',
    [UserRoles.SALES_EXECUTIVE]: 'blue',
    [UserRoles.AGENT]: 'purple',
    [UserRoles.TEAM_LEADER]: 'orange',
    [UserRoles.SALES_MANAGER]: 'magenta',
    [UserRoles.OFF_PLAN_SALES]: '#2db7f5',
    [UserRoles.READY_TO_MOVE_SALES]: '#87d068'
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const fmtK = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n || 0);

  // ── Table Columns ─────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Name',
      key: 'name',
      sorter: (a, b) => `${a.firstname}${a.lastname}`.localeCompare(`${b.firstname}${b.lastname}`),
      render: (_, r) => (
        <Space>
          <Avatar style={{ backgroundColor: r.isBanned ? C.red : C.blue, fontSize: 13 }}>
            {(r.firstname?.[0] || '?').toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{r.firstname} {r.lastname}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>{r.email}</Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Role',
      dataIndex: 'Role',
      key: 'role',
      render: role => <Tag color={roleColor[role] || 'default'}>{role}</Tag>
    },
    {
      title: 'Phone',
      key: 'phone',
      render: (_, r) => [r.phoneNumber, r.phoneNumber2, r.phoneNumber3]
        .filter(Boolean).map((p, i) => <div key={i} style={{ fontSize: 12 }}>{p}</div>) || '—'
    },
    {
      title: 'Leads',
      key: 'leads',
      width: 220,
      sorter: (a, b) => (a.totalLeads || 0) - (b.totalLeads || 0),
      render: (_, r) => {
        if (!salesRoles.includes(r.Role)) return <Text type="secondary">—</Text>;
        return (
          <div>
            <Space size={6}>
              <Tooltip title={`${r.assignedLeadsCount || 0} leads assigned to this seller`}>
                <Tag color="blue" style={{ fontWeight: 600, fontSize: 12 }}>
                  <UserSwitchOutlined style={{ marginRight: 4 }} />
                  {fmtK(r.assignedLeadsCount || 0)}
                </Tag>
              </Tooltip>
              <Tooltip title={`${r.createdLeadsCount || 0} leads created by this seller`}>
                <Tag color="purple" style={{ fontWeight: 600, fontSize: 12 }}>
                  <PlusCircleOutlined style={{ marginRight: 4 }} />
                  {fmtK(r.createdLeadsCount || 0)}
                </Tag>
              </Tooltip>
              <Tooltip title={`${r.contactedLeads || 0} leads contacted`}>
                <Tag color="green" style={{ fontWeight: 600, fontSize: 12 }}>
                  <CheckCircleOutlined style={{ marginRight: 4 }} />
                  {r.contactedLeads || 0}
                </Tag>
              </Tooltip>
            </Space>
            <Divider style={{ margin: '4px 0' }} />
            <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#8c8c8c' }}>
              <span>Total: <b>{fmtK(r.totalLeads || 0)}</b></span>
              <span>|</span>
              <span>
                Contact Rate: <b>
                  {r.totalLeads > 0 ? Math.round((r.contactedLeads / r.totalLeads) * 100) : 0}%
                </b>
              </span>
            </div>
          </div>
        );
      }
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, r) =>
        r.isBanned ? <Tag color="red" icon={<StopOutlined />}>Banned</Tag>
        : r.forcePasswordReset ? <Tag color="orange" icon={<ClockCircleOutlined />}>Reset Required</Tag>
        : <Tag color="green" icon={<CheckCircleOutlined />}>Active</Tag>
    },
    {
      title: 'Joined',
      dataIndex: 'CreationDate',
      key: 'created',
      render: d => d ? dayjs(d.toDate ? d.toDate() : d).format('YYYY-MM-DD') : '—',
      sorter: (a, b) => {
        const da = a.CreationDate?.toDate ? a.CreationDate.toDate() : new Date(a.CreationDate || 0);
        const db = b.CreationDate?.toDate ? b.CreationDate.toDate() : new Date(b.CreationDate || 0);
        return da - db;
      }
    }
  ];

  // ── Actions Column (only for users with permission) ──────────────────────
  if (canManageUsers) {
    columns.push({
      title: 'Actions',
      key: 'actions',
      width: 280,
      render: (_, r) => (
        <Space size={4} wrap>
          {/* ── Transfer Leads ── */}
          {salesRoles.includes(r.Role) && (
            <Tooltip title="Transfer Leads">
              <Button 
                icon={<SwapOutlined />} 
                size="small"
                style={{ color: C.orange, borderColor: C.orange }}
                onClick={() => { setTransferFromSeller(r); setTransferModalVisible(true); }} 
              />
            </Tooltip>
          )}

          {/* ── Ban/Unban Toggle ── */}
          <Tooltip title={r.isBanned ? "Unban User" : "Ban User"}>
            <Button
              icon={r.isBanned ? <PlayCircleOutlined /> : <StopOutlined />}
              size="small"
              danger={!r.isBanned}
              style={{
                color: r.isBanned ? C.green : C.red,
                borderColor: r.isBanned ? C.green : C.red,
              }}
              onClick={() => handleToggleBan(r)}
            >
              {r.isBanned ? 'Unban' : 'Ban'}
            </Button>
          </Tooltip>

          {/* ── Change Password ── */}
          <Tooltip title="Change Password">
            <Button
              icon={<KeyOutlined />}
              size="small"
              style={{ color: C.purple, borderColor: C.purple }}
              onClick={() => handlePasswordChange(r)}
            />
          </Tooltip>

          {/* ── Edit ── */}
          <Tooltip title="Edit">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => { setCurrentUser(r); setIsEditModalVisible(true); }}
            />
          </Tooltip>

          {/* ── Delete ── */}
          <Popconfirm
            title="Delete this user?"
            description="This action cannot be undone."
            onConfirm={() => handleDeleteUser(r.id)}
            okText="Yes"
            cancelText="No"
            okType="danger"
          >
            <Button danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      )
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 16 }}>
      <Card style={{ borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Title level={3} style={{ margin: 0 }}>
            <TeamOutlined style={{ marginRight: 10, color: C.blue }} />
            Team Management
          </Title>
          {canManageUsers && (
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchUsers} loading={loading} size="small">
                Refresh
              </Button>
              <Button type="primary" icon={<UserAddOutlined />} onClick={() => setIsAddModalVisible(true)}>
                Add Member
              </Button>
            </Space>
          )}
        </div>

        {/* ── Summary Stats ── */}
        <Row gutter={[10, 10]} style={{ marginBottom: 16 }}>
          {[
            { label: 'Total Members', value: users.length, color: C.blue, icon: <TeamOutlined /> },
            { 
              label: 'Active', 
              value: users.filter(u => !u.isBanned).length, 
              color: C.green, 
              icon: <CheckCircleOutlined /> 
            },
            { 
              label: 'Banned', 
              value: users.filter(u => u.isBanned).length, 
              color: C.red, 
              icon: <StopOutlined /> 
            },
            { 
              label: 'Pending Reset', 
              value: users.filter(u => u.forcePasswordReset && !u.isBanned).length, 
              color: C.orange, 
              icon: <ClockCircleOutlined /> 
            },
            { 
              label: 'Total Leads', 
              value: users.reduce((sum, u) => sum + (u.totalLeads || 0), 0), 
              color: C.purple, 
              icon: <UserSwitchOutlined /> 
            },
          ].map((s, i) => (
            <Col xs={12} sm={4} key={i}>
              <div style={{ 
                padding: '10px 14px', 
                background: `${s.color}10`, 
                borderRadius: 10, 
                border: `1px solid ${s.color}22`, 
                textAlign: 'center' 
              }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {s.icon} {s.label}
                </Text>
              </div>
            </Col>
          ))}
        </Row>

        {/* ── Filters ── */}
        <Row gutter={12} style={{ marginBottom: 14 }}>
          <Col xs={24} sm={14}>
            <Input
              placeholder="Search name or email…"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              allowClear
              style={{ width: '100%', borderRadius: 8 }}
            />
          </Col>
          <Col xs={24} sm={10}>
            <Select
              placeholder="Filter by role"
              style={{ width: '100%', borderRadius: 8 }}
              value={roleFilter}
              onChange={setRoleFilter}
              allowClear
            >
              <Option value={UserRoles.CEO}>CEO</Option>
              <Option value={UserRoles.HR}>HR</Option>
              <Option value={UserRoles.SELLER}>Sales Representative</Option>
              <Option value={UserRoles.SALES_EXECUTIVE}>Sales Executive</Option>
              <Option value={UserRoles.AGENT}>Agent</Option>
              <Option value={UserRoles.TEAM_LEADER}>Team Leader</Option>
              <Option value={UserRoles.SALES_MANAGER}>Sales Manager</Option>
              <Option value={UserRoles.OFF_PLAN_SALES}>Off-plan Sales</Option>
              <Option value={UserRoles.READY_TO_MOVE_SALES}>Ready to Move Sales</Option>
            </Select>
          </Col>
        </Row>

        {/* ── Banned Users Alert ── */}
        {users.filter(u => u.isBanned).length > 0 && (
          <Alert
            message={
              <span>
                <StopOutlined style={{ color: C.red, marginRight: 8 }} />
                <b>{users.filter(u => u.isBanned).length} user(s) are currently banned.</b>
                {' '}Banned users cannot access the system.
              </span>
            }
            type="warning"
            showIcon={false}
            style={{ marginBottom: 12, borderRadius: 8 }}
          />
        )}

        {/* ── Table ── */}
        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={loading}
          pagination={{ defaultPageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'] }}
          scroll={{ x: 1100 }}
          size="middle"
          rowClassName={(record) => record.isBanned ? 'banned-row' : ''}
        />
      </Card>

      {/* ── Modals ── */}
      <Modal
        title="Add Team Member"
        open={isAddModalVisible}
        onCancel={() => setIsAddModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <AddUserForm onFinish={handleAddUser} onCancel={() => setIsAddModalVisible(false)} />
      </Modal>

      <Modal
        title="Edit Team Member"
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        {currentUser && (
          <EditUserForm
            initialValues={currentUser}
            onFinish={handleUpdateUser}
            onCancel={() => setIsEditModalVisible(false)}
          />
        )}
      </Modal>

      <ChangePasswordModal
        visible={passwordModalVisible}
        user={passwordUser}
        onCancel={() => {
          setPasswordModalVisible(false);
          setPasswordUser(null);
        }}
        onSuccess={() => {
          setPasswordModalVisible(false);
          setPasswordUser(null);
          message.success('Password changed successfully');
        }}
      />

      {/* ── Bulk Lead Transfer Modal ── */}
      <BulkLeadTransferModal
        visible={transferModalVisible}
        onCancel={() => { setTransferModalVisible(false); setTransferFromSeller(null); }}
        fromSeller={transferFromSeller}
        sellers={users}
        companyId={companyId}
        onSuccess={() => { 
          message.success('Leads transferred successfully. Refreshing…'); 
          fetchUsers(); 
        }}
      />

      {/* ── CSS for banned rows ── */}
      <style>{`
        .banned-row {
          opacity: 0.7;
          background: #fff1f0 !important;
        }
        .banned-row:hover {
          opacity: 0.9;
        }
        .ant-table-tbody > tr.banned-row:hover > td {
          background: #ffe7e5 !important;
        }
      `}</style>
    </div>
  );
};

export default SellersPage;