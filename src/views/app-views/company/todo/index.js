import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Button, Modal, Statistic, Typography, Space, message } from 'antd';
import { PlusOutlined, CheckSquareOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import KanbanBoard from '../../seller/todo/components/KanbanBoard';
import TodoForm from '../../seller/todo/components/TodoForm';
import TodoService from 'services/TodoService';
import { TodoStatus, TodoPriority } from 'models/TodoModel';
import './index.css';

const { Title } = Typography;

/**
 * CEO/HR Todo Management Page
 * Reuses seller todo functionality with appropriate permissions
 */
const ToDoPage = () => {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [sellers, setSellers] = useState([]);
  const user = useSelector(state => state.auth.user);

  // Calculate statistics
  const todoStats = {
    total: todos.length,
    pending: todos.filter(todo => todo.Status === 'ToDo').length,
    inProgress: todos.filter(todo => todo.Status === 'InProgress').length,
    done: todos.filter(todo => todo.Status === 'Done').length,
    overdue: todos.filter(todo => {
      if (todo.Status === 'Done') return false;
      const dueDate = new Date(todo.DateLimit);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dueDate < today;
    }).length
  };

  // Fetch todos for company-wide access (CEO/HR can see all todos)
  const fetchTodos = useCallback(async () => {
    if (!user?.company_id) return;
    
    setLoading(true);
    try {
      // CEO and HR can see all company todos
      const companyTodos = await TodoService.getCompanyTodos(user.company_id);
      setTodos(companyTodos || []);
    } catch (error) {
      console.error('Error fetching todos:', error);
      message.error('Failed to load todos');
    } finally {
      setLoading(false);
    }
  }, [user?.company_id]);

  // Fetch company users for assignment
  const fetchSellers = useCallback(async () => {
    if (!user?.company_id) return;
    try {
      const companyUsers = await TodoService.getCompanyUsers(user.company_id);
      setSellers(companyUsers || []);
    } catch (error) {
      console.error('Error fetching sellers:', error);
    }
  }, [user?.company_id]);

  useEffect(() => {
    fetchTodos();
    fetchSellers();
  }, [fetchTodos, fetchSellers]);

  // Handle creating new todo
  const handleCreateTodo = async (todoData) => {
    try {
      await TodoService.createTodo(todoData);
      message.success('Todo created successfully');
      setIsModalVisible(false);
      // Refresh todos list
      fetchTodos();
    } catch (error) {
      console.error('Error creating todo:', error);
      message.error('Failed to create todo');
    }
  };

  // Handle updating todo with real-time UI update
  const handleUpdateTodo = async (todoId, updates) => {
    try {
      // Optimistically update UI first
      setTodos(prevTodos => 
        prevTodos.map(todo => 
          todo.id === todoId 
            ? { ...todo, ...updates, LastEdit: new Date() }
            : todo
        )
      );
      
      // Then update Firebase
      await TodoService.updateTodo(todoId, updates);
      message.success('Todo updated successfully');
    } catch (error) {
      console.error('Error updating todo:', error);
      message.error('Failed to update todo');
      // Revert optimistic update on error
      fetchTodos();
    }
  };

  // Handle editing todo
  const handleEditTodo = (todo) => {
    setEditingTodo(todo);
    setIsModalVisible(true);
  };

  // Handle deleting todo
  const handleDeleteTodo = async (todoId) => {
    try {
      await TodoService.deleteTodo(todoId);
      message.success('Todo deleted successfully');
      fetchTodos();
    } catch (error) {
      console.error('Error deleting todo:', error);
      message.error('Failed to delete todo');
    }
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalVisible(false);
    setEditingTodo(null);
  };

  // Handle updating todo from form
  const handleUpdateTodoFromForm = async (todoData) => {
    try {
      const updateData = {
        ToDo: todoData.title || todoData.ToDo || editingTodo.ToDo,
        assignee: todoData.assignee || editingTodo.assignee,
        DateLimit: todoData.dueDate || editingTodo.DateLimit
      };
      
      await TodoService.updateTodo(editingTodo.id, updateData);
      message.success('Todo updated successfully');
      setIsModalVisible(false);
      setEditingTodo(null);
      // Refresh todos list
      fetchTodos();
    } catch (error) {
      console.error('Error updating todo:', error);
      message.error('Failed to update todo');
    }
  };

  return (
    <div className="todo-page">
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '32px',
        borderRadius: '16px',
        marginBottom: '24px',
        color: 'white'
      }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space direction="vertical" size={0}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '12px',
                  borderRadius: '50%',
                  backdropFilter: 'blur(10px)'
                }}>
                  <CheckSquareOutlined style={{ fontSize: '24px', color: 'white' }} />
                </div>
                <Title level={2} style={{ color: 'white', margin: 0 }}>
                  Todo Management
                </Title>
              </div>
              <Typography.Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '16px' }}>
                Manage tasks and projects across your organization
              </Typography.Text>
            </Space>
          </Col>
          <Col>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => setIsModalVisible(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                backdropFilter: 'blur(10px)',
                fontWeight: 'bold'
              }}
            >
              Add Todo
            </Button>
          </Col>
        </Row>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Tasks"
              value={todoStats.total}
              prefix={<CheckSquareOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="In Progress"
              value={todoStats.inProgress}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Completed"
              value={todoStats.done}
              prefix={<CheckSquareOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Overdue"
              value={todoStats.overdue}
              prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: todoStats.overdue > 0 ? '#ff4d4f' : undefined }}
            />
          </Card>
        </Col>
      </Row>

      {/* Kanban Board */}
      <Card style={{ minHeight: '500px' }}>
        <KanbanBoard
          todos={todos}
          onTodoUpdate={handleUpdateTodo}
          onTodoEdit={handleEditTodo}
          onTodoDelete={handleDeleteTodo}
          sellers={sellers}
          currentUser={user}
        />
      </Card>

      {/* Todo Form Modal */}
      <Modal
        title={editingTodo ? 'Edit Todo' : 'Create New Todo'}
        open={isModalVisible}
        onCancel={handleModalClose}
        footer={null}
        width={600}
        destroyOnClose
      >
        <TodoForm
          todo={editingTodo}
          onSubmit={editingTodo ? handleUpdateTodoFromForm : handleCreateTodo}
          onCancel={handleModalClose}
          sellers={sellers}
          currentUser={user}
          userRole={user?.Role}
        />
      </Modal>
    </div>
  );
};

export default ToDoPage;