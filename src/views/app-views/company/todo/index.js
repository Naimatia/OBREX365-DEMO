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
import AIBulkTaskModal from '../../seller/todo/components/AIBulkTaskModal'; // ← Import the modal we created
import TodoService from 'services/TodoService';

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

  // Fetch Data
  const fetchTodos = useCallback(async () => {
    if (!user?.company_id) return;
    setLoading(true);
    try {
      const data = await TodoService.getCompanyTodos(user.company_id);
      setTodos(data || []);
    } catch (err) {
      message.error('Failed to load todos');
    } finally {
      setLoading(false);
    }
  }, [user?.company_id]);

  const fetchSellers = useCallback(async () => {
    if (!user?.company_id) return;
    try {
      const users = await TodoService.getCompanyUsers(user.company_id);
      setSellers(users);
    } catch (err) {
      console.error(err);
    }
  }, [user?.company_id]);

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
              {['CEO', 'HR'].includes(user?.Role) && (
                <Button
                  type="dashed"
                  onClick={() => setIsAIBulkModalVisible(true)}
                >
                  ✨ AI Bulk Tasks
                </Button>
              )}

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
            >
              <Option value="all">All Assignees</Option>
              {sellers.map(s => (
                <Option key={s.id} value={s.id}>
                  {s.name}
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
            <Statistic title="Total Tasks" value={todos.length} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="In Progress" value={todos.filter(t => t.Status === 'InProgress').length} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Completed" value={todos.filter(t => t.Status === 'Done').length} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Overdue"
              value={todos.filter(t => t.DateLimit && new Date(t.DateLimit) < new Date() && t.Status !== 'Done').length}
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
                await TodoService.deleteTodo(id);
                fetchTodos();
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