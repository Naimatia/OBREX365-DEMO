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
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import TodoService from 'services/TodoService';
import KanbanBoard from './components/KanbanBoard';
import TodoForm from './components/TodoForm';

const { Title, Text } = Typography;

const SellerToDoPage = () => {
  const [todos, setTodos] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState(null);

  const [stats, setStats] = useState({
    total: 0, todo: 0, inProgress: 0, done: 0, blocked: 0, overdue: 0
  });
  
  const user = useSelector(state => state.auth.user);
  const companyId = user?.company_id;
  const userId = user?.id;
  const userRole = user?.Role || user?.role || '';
  
  const isCeoOrHr = ['CEO', 'HR', 'SuperAdmin'].includes(userRole);

  // Fetch Todos
  const fetchTodos = useCallback(async () => {
    if (!companyId || !userId) return;
    
    setLoading(true);
    try {
      let todoList = [];
      
      if (isCeoOrHr) {
        todoList = await TodoService.getCompanyTodos(companyId);
      } else {
        todoList = await TodoService.getSellerTodos(userId);
      }
      
      setTodos(todoList);
      calculateStats(todoList);
    } catch (err) {
      console.error('Error fetching todos:', err);
      message.error('Failed to load todos');
    } finally {
      setLoading(false);
    }
  }, [companyId, userId, isCeoOrHr]);

  // Fetch Sellers (only for CEO/HR)
  const fetchSellers = useCallback(async () => {
    if (!isCeoOrHr || !companyId) return;
    try {
      const sellerList = await TodoService.getCompanySellers(companyId);
      setSellers(sellerList);
    } catch (err) {
      console.error('Error fetching sellers:', err);
    }
  }, [isCeoOrHr, companyId]);

  const calculateStats = (todoList) => {
    const statsData = {
      total: todoList.length,
      todo: todoList.filter(t => t.Status === 'ToDo').length,
      inProgress: todoList.filter(t => t.Status === 'InProgress').length,
      done: todoList.filter(t => t.Status === 'Done').length,
      blocked: todoList.filter(t => t.Status === 'Blocked').length,
      overdue: todoList.filter(t => 
        t.DateLimit && new Date(t.DateLimit) < new Date() && t.Status !== 'Done'
      ).length
    };
    setStats(statsData);
  };

  useEffect(() => {
    fetchTodos();
    fetchSellers();
  }, [fetchTodos, fetchSellers]);

  const handleFormSuccess = () => {
    fetchTodos();
    setIsFormVisible(false);
    setSelectedTodo(null);
  };

  const handleEditTodo = (todo) => {
    if (!isCeoOrHr) {
      message.warning("You don't have permission to edit tasks");
      return;
    }
    setSelectedTodo(todo);
    setIsFormVisible(true);
  };

  const handleCreateTodo = () => {
    if (!isCeoOrHr) {
      message.warning("Only managers can create tasks");
      return;
    }
    setSelectedTodo(null);
    setIsFormVisible(true);
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            <ProjectOutlined style={{ marginRight: '12px', color: '#1890ff' }} />
            {isCeoOrHr ? 'Company Todo Management' : 'My Tasks'}
          </Title>
          <Text type="secondary">
            {isCeoOrHr 
              ? 'Manage and assign todos for your team' 
              : 'You can only move your assigned tasks between columns'
            }
          </Text>
        </Col>
        
        <Col>
          <Space>
            {isCeoOrHr && (
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleCreateTodo}
              >
                Create Todo
              </Button>
            )}
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
        <Col xs={12} sm={8} md={4}><Card><Statistic title="Total" value={stats.total} prefix={<ProjectOutlined />} /></Card></Col>
        <Col xs={12} sm={8} md={4}><Card><Statistic title="To Do" value={stats.todo} valueStyle={{ color: '#faad14' }} /></Card></Col>
        <Col xs={12} sm={8} md={4}><Card><Statistic title="In Progress" value={stats.inProgress} valueStyle={{ color: '#1890ff' }} /></Card></Col>
        <Col xs={12} sm={8} md={4}><Card><Statistic title="Done" value={stats.done} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col xs={12} sm={8} md={4}><Card><Statistic title="Blocked" value={stats.blocked} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Badge count={stats.overdue} offset={[10, 10]}>
              <Statistic title="Overdue" value={stats.overdue} valueStyle={{ color: '#ff4d4f' }} />
            </Badge>
          </Card>
        </Col>
      </Row>

      {/* Kanban Board */}
      <Card title="Todo Board">
        {loading ? (
          <Spin size="large" style={{ display: 'block', padding: '80px 0' }} tip="Loading todos..." />
        ) : todos.length === 0 ? (
          <Empty description={isCeoOrHr ? "No todos yet" : "No tasks assigned to you yet"} />
        ) : (
          <KanbanBoard
            todos={todos}
            onTodoUpdate={(id, newData) => {
              // Optimistic update for drag & drop
              setTodos(prev => prev.map(t => t.id === id ? { ...t, ...newData } : t));
            }}
            onTodoDelete={(id) => {
              if (!isCeoOrHr) {
                message.warning("You don't have permission to delete tasks");
                return;
              }
              setTodos(prev => prev.filter(t => t.id !== id));
            }}
            onTodoEdit={handleEditTodo}
            sellers={sellers}
            currentUser={user}
            isSeller={!isCeoOrHr}   // ← Important: Pass this to KanbanBoard
          />
        )}
      </Card>

      {/* Form Modal - Only for CEO/HR */}
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
          onSuccess={handleFormSuccess}
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