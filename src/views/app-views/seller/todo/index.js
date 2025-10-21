import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Typography, 
  Space, 
  Button, 
  Row, 
  Col, 
  Modal,
  message,
  Statistic,
  Badge,
  Spin,
  Empty
} from 'antd';
import { 
  PlusOutlined,
  ReloadOutlined,
  ProjectOutlined,
  CalendarOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import TodoService from 'services/TodoService';
import KanbanBoard from './components/KanbanBoard';
import TodoForm from './components/TodoForm';

const { Title, Text } = Typography;

/**
 * Seller Todo Management Page with Kanban Board
 * Role-based access: CEO/HR can see all company todos, Sellers see only assigned todos
 */
const SellerToDoPage = () => {
  // State management
  const [todos, setTodos] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    todo: 0,
    inProgress: 0,
    done: 0,
    blocked: 0,
    overdue: 0
  });
  
  // Get current user data
  const user = useSelector(state => state.auth.user);
  const companyId = user?.company_id;
  const userId = user?.id;
  const userRole = user?.Role || user?.role || '';
  
  // Check if user is CEO/HR (can see all todos) or Seller (can see only assigned todos)
  const isCeoOrHr = ['CEO', 'HR', 'SuperAdmin'].includes(userRole);

  // Fetch todos based on user role
  const fetchTodos = useCallback(async () => {
    if (!companyId || !userId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      let todoList = [];
      
      if (isCeoOrHr) {
        // CEO/HR can see all company todos
        todoList = await TodoService.getCompanyTodos(companyId);
      } else {
        // Sellers can only see todos assigned to them
        todoList = await TodoService.getSellerTodos(userId);
      }
      
      setTodos(todoList);
      calculateStats(todoList);
      
    } catch (err) {
      console.error('Error fetching todos:', err);
      message.error('Failed to load todos. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [companyId, userId, isCeoOrHr]);

  // Fetch sellers for assignee selection (CEO/HR only)
  const fetchSellers = useCallback(async () => {
    if (!isCeoOrHr || !companyId) return;
    
    try {
      const sellerList = await TodoService.getCompanySellers(companyId);
      setSellers(sellerList);
    } catch (err) {
      console.error('Error fetching sellers:', err);
    }
  }, [isCeoOrHr, companyId]);

  // Calculate statistics
  const calculateStats = (todoList) => {
    const stats = {
      total: todoList.length,
      todo: todoList.filter(t => t.Status === 'ToDo').length,
      inProgress: todoList.filter(t => t.Status === 'InProgress').length,
      done: todoList.filter(t => t.Status === 'Done').length,
      blocked: todoList.filter(t => t.Status === 'Blocked').length,
      overdue: todoList.filter(t => t.DateLimit && new Date(t.DateLimit) < new Date() && t.Status !== 'Done').length
    };
    
    setStats(stats);
  };

  // Load data on component mount
  useEffect(() => {
    fetchTodos();
    fetchSellers();
  }, [fetchTodos, fetchSellers]);

  // Handle form submission (create or update)
  const handleFormSubmit = () => {
    setIsFormVisible(false);
    setSelectedTodo(null);
    fetchTodos();
  };

  // Handle todo edit
  const handleEditTodo = (todo) => {
    setSelectedTodo(todo);
    setIsFormVisible(true);
  };

  // Handle todo delete
  const handleDeleteTodo = (todoId) => {
    fetchTodos();
  };

  // Handle creating new todo
  const handleCreateTodo = () => {
    setSelectedTodo(null);
    setIsFormVisible(true);
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Page Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            <ProjectOutlined style={{ marginRight: '12px', color: '#1890ff' }} />
            {isCeoOrHr ? 'Company Todo Management' : 'My Todo List'}
          </Title>
          <Text type="secondary">
            {isCeoOrHr 
              ? 'Manage and assign todos for your team' 
              : 'Track your assigned tasks and progress'
            }
          </Text>
        </Col>
        <Col>
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleCreateTodo}
            >
              Create Todo
            </Button>
            <Button 
              icon={<ReloadOutlined />}
              onClick={fetchTodos}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        </Col>
      </Row>
      
      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title="Total Todos"
              value={stats.total}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ProjectOutlined />}
            />
          </Card>
        </Col>
        
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title="To Do"
              value={stats.todo}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title="In Progress"
              value={stats.inProgress}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title="Completed"
              value={stats.done}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title="Blocked"
              value={stats.blocked}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Badge count={stats.overdue} offset={[10, 10]}>
              <Statistic
                title="Overdue"
                value={stats.overdue}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<CalendarOutlined />}
              />
            </Badge>
          </Card>
        </Col>
      </Row>

      {/* Kanban Board */}
      <Card title="Todo Board" style={{ marginBottom: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '16px' }}>Loading todos...</div>
          </div>
        ) : todos.length === 0 ? (
          <Empty
            description={
              <div>
                <div style={{ fontSize: '16px', marginBottom: '8px' }}>No todos yet</div>
                <div style={{ fontSize: '14px', marginBottom: '16px' }}>
                  {isCeoOrHr 
                    ? 'Create your first todo to get started' 
                    : 'No todos have been assigned to you yet'
                  }
                </div>
                {isCeoOrHr && (
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={handleCreateTodo}
                  >
                    Create First Todo
                  </Button>
                )}
              </div>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: '50px' }}
          />
        ) : (
          <KanbanBoard
            todos={todos}
            onTodoUpdate={fetchTodos}
            onTodoDelete={handleDeleteTodo}
            onTodoEdit={handleEditTodo}
            sellers={sellers}
            currentUser={user}
          />
        )}
      </Card>

      {/* Todo Form Modal */}
      <Modal
        title={selectedTodo ? 'Edit Todo' : 'Create New Todo'}
        open={isFormVisible}
        onCancel={() => {
          setIsFormVisible(false);
          setSelectedTodo(null);
        }}
        footer={null}
        width={800}
        destroyOnClose
      >
        <TodoForm
          todo={selectedTodo}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setIsFormVisible(false);
            setSelectedTodo(null);
          }}
          sellers={sellers}
          currentUser={user}
          userRole={userRole}
        />
      </Modal>
    </div>
  );
};

export default SellerToDoPage;