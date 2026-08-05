// pages/ToDoPage.js

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Button, Modal, Statistic, Typography, Space,
  Input, Select, Tabs, Badge, message, Avatar
} from 'antd';
import {
  PlusOutlined, SearchOutlined, FilterOutlined,
  UserOutlined, TeamOutlined, RobotOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';

import KanbanBoard from '../../seller/todo/components/KanbanBoard';
import TodoForm from '../../seller/todo/components/TodoForm';
import AIBulkTaskModal from '../../seller/todo/components/AIBulkTaskModal';
import TodoService from 'services/TodoService';
import UserService from 'services/firebase/UserService';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

const ToDoPage = () => {
  const [todos, setTodos] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [activeTab, setActiveTab] = useState('kanban');

  // AI Bulk Modal States
  const [isAIBulkModalVisible, setIsAIBulkModalVisible] = useState(false);

  const user = useSelector(state => state.auth.user);
  const companyId = user?.company_id || user?.companyId || '';

  // Check if user is the joker account
  const isJoker = user?.isJoker === true || (user?.isOwner === true && user?.Role === 'CEO');

  // Fetch Data
  const fetchTodos = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await TodoService.getCompanyTodos(companyId);
      setTodos(data || []);
    } catch (err) {
      message.error('Failed to load todos');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  /**
   * Fetch only users that belong to the current company
   * Excludes the joker account (isJoker: true)
   */
  const fetchSellers = useCallback(async () => {
    if (!companyId) return;
    try {
      // Use UserService to get team members (automatically excludes joker)
      const users = await UserService.getTeamMembers(companyId);
      
      // Format users for display
      const formattedUsers = users.map(u => ({
        id: u.id,
        name: u.displayName || `${u.firstname || ''} ${u.lastname || ''}`.trim() || u.email || 'Unnamed User',
        email: u.email || '',
        firstname: u.firstname || '',
        lastname: u.lastname || '',
        Role: u.Role,
        ...u
      }));
      
      // Sort by name
      formattedUsers.sort((a, b) => a.name.localeCompare(b.name));
      
      console.log(`Found ${formattedUsers.length} team members for company ${companyId}`);
      setSellers(formattedUsers);
    } catch (err) {
      console.error('Error fetching team members:', err);
      message.error('Failed to load team members');
    }
  }, [companyId]);

  useEffect(() => {
    fetchTodos();
    fetchSellers();
  }, [fetchTodos, fetchSellers]);

  // Filtered Todos
  const filteredTodos = todos.filter(todo => {
    const title = todo.ToDo || todo.Title || todo.title || '';
    const desc = todo.Description || '';

    const matchesSearch = title.toLowerCase().includes(searchText.toLowerCase()) ||
                         desc.toLowerCase().includes(searchText.toLowerCase());

    const assignee = todo.assignee || todo.AssignedTo;
    const matchesAssignee = filterAssignee === 'all' || assignee === filterAssignee;

    return matchesSearch && matchesAssignee;
  });

  const handleFormSuccess = () => {
    fetchTodos();
    setIsModalVisible(false);
    setEditingTodo(null);
  };

  // Check if user can manage tasks (Joker, CEO, or HR)
  const canManageTasks = isJoker || ['CEO', 'HR'].includes(user?.Role);

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              <TeamOutlined style={{ marginRight: 12, color: '#1890ff' }} />
              Team Task Management
            </Title>
            <Text type="secondary">Manage and track tasks across your entire team</Text>
          </Col>
          <Col>
            <Space>
              {canManageTasks && (
                <Button
                  type="dashed"
                  onClick={() => setIsAIBulkModalVisible(true)}
                  icon={<RobotOutlined />}
                >
                  AI Bulk Tasks
                </Button>
              )}

              {canManageTasks && (
                <Button
                  type="primary"
                  size="large"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingTodo(null);
                    setIsModalVisible(true);
                  }}
                >
                  Assign New Task
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 20 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} md={8}>
            <Input
              placeholder="Search tasks..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={8}>
            <Select
              style={{ width: '100%' }}
              value={filterAssignee}
              onChange={setFilterAssignee}
              placeholder="Filter by assignee"
              showSearch
              optionFilterProp="children"
            >
              <Option value="all">All Assignees</Option>
              {sellers.map(s => (
                <Option key={s.id} value={s.id}>
                  <Space>
                    <Avatar size="small" style={{ backgroundColor: '#1890ff' }}>
                      {s.name?.charAt(0)?.toUpperCase() || 'U'}
                    </Avatar>
                    {s.name}
                    {s.Role && <Text type="secondary" style={{ fontSize: '11px' }}>({s.Role})</Text>}
                  </Space>
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: 'right' }}>
            <Button icon={<FilterOutlined />}>More Filters</Button>
          </Col>
        </Row>
      </Card>

      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Total Tasks" 
              value={todos.length} 
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="In Progress" 
              value={todos.filter(t => t.Status === 'InProgress' || t.Status === 'In Progress').length} 
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Completed" 
              value={todos.filter(t => t.Status === 'Done' || t.Status === 'Completed').length} 
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Overdue"
              value={todos.filter(t => {
                const dueDate = t.DateLimit || t.DueDate;
                return dueDate && new Date(dueDate) < new Date() && 
                       t.Status !== 'Done' && t.Status !== 'Completed';
              }).length}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tabs: Kanban / List */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="Kanban Board" key="kanban">
            <KanbanBoard
              todos={filteredTodos}
              onTodoUpdate={(id, updates) => {
                setTodos(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
              }}
              onTodoEdit={(todo) => {
                setEditingTodo(todo);
                setIsModalVisible(true);
              }}
              onTodoDelete={async (id) => {
                if (window.confirm('Are you sure you want to delete this task?')) {
                  await TodoService.deleteTodo(id);
                  fetchTodos();
                }
              }}
              sellers={sellers}
              currentUser={user}
            />
          </TabPane>
          <TabPane tab="List View" key="list">
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Text type="secondary">List View Coming Soon...</Text>
            </div>
          </TabPane>
        </Tabs>
      </Card>

      {/* Manual Todo Form Modal */}
      <Modal
        title={editingTodo ? "Edit Task" : "Assign New Task"}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingTodo(null);
        }}
        footer={null}
        width={780}
        destroyOnClose
      >
        <TodoForm
          todo={editingTodo}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setIsModalVisible(false);
            setEditingTodo(null);
          }}
          sellers={sellers}
          currentUser={user}
          userRole={user?.Role}
        />
      </Modal>

      {/* AI Bulk Task Generator Modal */}
      <AIBulkTaskModal
        open={isAIBulkModalVisible}
        onCancel={() => {
          setIsAIBulkModalVisible(false);
        }}
        sellers={sellers}
        currentUser={user}
        fetchTodos={fetchTodos}
      />
    </div>
  );
};

export default ToDoPage;