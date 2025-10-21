import React, { useState } from 'react';
import { 
  Card, 
  Typography, 
  Tag, 
  Avatar, 
  Tooltip, 
  Button, 
  Space,
  Popconfirm,
  Badge,
  Empty,
  message
} from 'antd';
import { 
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  UserOutlined,
  MessageOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import TodoService from 'services/TodoService';

const { Title, Text } = Typography;

/**
 * Kanban Board Component for Todo Management
 */
const KanbanBoard = ({ 
  todos, 
  onTodoUpdate, 
  onTodoDelete, 
  onTodoEdit, 
  sellers = [], 
  currentUser 
}) => {
  // Define Kanban columns
  const columns = [
    { id: 'ToDo', title: 'To Do', color: '#faad14' },
    { id: 'InProgress', title: 'In Progress', color: '#1890ff' },
    { id: 'Done', title: 'Done', color: '#52c41a' },
    { id: 'Blocked', title: 'Blocked', color: '#ff4d4f' }
  ];

  // Group todos by status
  const groupedTodos = todos.reduce((acc, todo) => {
    const status = todo.Status || 'ToDo';
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(todo);
    return acc;
  }, {});

  // Handle drag end
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    // Dropped outside the list
    if (!destination) {
      return;
    }

    // Dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Update todo status
    try {
      await TodoService.updateTodoStatus(draggableId, destination.droppableId);
      message.success('Todo status updated successfully');
      // Call the parent update handler with proper parameters
      onTodoUpdate?.(draggableId, { Status: destination.droppableId });
    } catch (error) {
      console.error('Error updating todo status:', error);
      message.error('Failed to update todo status');
    }
  };

  // Handle delete todo
  const handleDeleteTodo = async (todoId) => {
    try {
      await TodoService.deleteTodo(todoId);
      message.success('Todo deleted successfully');
      onTodoDelete?.(todoId);
    } catch (error) {
      console.error('Error deleting todo:', error);
      message.error('Failed to delete todo');
    }
  };

  // Get assignee name
  const getAssigneeName = (assigneeId) => {
    if (!assigneeId) return 'Unassigned';
    const seller = sellers.find(s => s.id === assigneeId);
    return seller ? seller.name : 'Unknown User';
  };

  // Check if todo is overdue
  const isOverdue = (dateLimit) => {
    if (!dateLimit) return false;
    return new Date(dateLimit) < new Date();
  };

  // Get todo priority color
  const getTodoPriority = (dateLimit) => {
    if (!dateLimit) return null;
    
    const now = new Date();
    const limit = new Date(dateLimit);
    const diffTime = limit.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'error'; // Overdue
    if (diffDays <= 1) return 'warning'; // Due today or tomorrow
    if (diffDays <= 3) return 'processing'; // Due in 2-3 days
    return 'default'; // More than 3 days
  };

  // Render individual todo card
  const renderTodoCard = (todo, index) => (
    <Draggable draggableId={todo.id} index={index} key={todo.id}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            marginBottom: 8
          }}
        >
          <Card
            size="small"
            hoverable
            style={{
              backgroundColor: snapshot.isDragging ? '#f0f0f0' : 'white',
              border: snapshot.isDragging ? '2px solid #1890ff' : '1px solid #d9d9d9',
              borderRadius: 6
            }}
            bodyStyle={{ padding: '12px' }}
            actions={[
              <Tooltip title="Edit Todo" key="edit">
                <Button 
                  type="text" 
                  icon={<EditOutlined />} 
                  size="small"
                  onClick={() => onTodoEdit?.(todo)}
                />
              </Tooltip>,
              <Popconfirm
                title="Delete Todo"
                description="Are you sure you want to delete this todo?"
                onConfirm={() => handleDeleteTodo(todo.id)}
                okText="Yes"
                cancelText="No"
                key="delete"
              >
                <Tooltip title="Delete Todo">
                  <Button 
                    type="text" 
                    icon={<DeleteOutlined />} 
                    size="small"
                    danger
                  />
                </Tooltip>
              </Popconfirm>
            ]}
          >
            <div style={{ marginBottom: 8 }}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Text strong style={{ fontSize: '14px' }}>
                  {todo.ToDo}
                </Text>
                
                {/* Assignee */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <UserOutlined style={{ fontSize: '12px', color: '#8c8c8c' }} />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {getAssigneeName(todo.assignee)}
                  </Text>
                </div>

                {/* Date Limit */}
                {todo.DateLimit && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CalendarOutlined style={{ fontSize: '12px', color: '#8c8c8c' }} />
                    <Badge
                      status={getTodoPriority(todo.DateLimit)}
                      text={
                        <Text 
                          style={{ 
                            fontSize: '12px',
                            color: isOverdue(todo.DateLimit) ? '#ff4d4f' : '#8c8c8c'
                          }}
                        >
                          {new Date(todo.DateLimit).toLocaleDateString()}
                          {isOverdue(todo.DateLimit) && ' (Overdue)'}
                        </Text>
                      }
                    />
                  </div>
                )}

                {/* Notes indicator */}
                {todo.Notes && todo.Notes.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MessageOutlined style={{ fontSize: '12px', color: '#8c8c8c' }} />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {todo.Notes.length} note{todo.Notes.length !== 1 ? 's' : ''}
                    </Text>
                  </div>
                )}

                {/* Priority indicator for overdue items */}
                {isOverdue(todo.DateLimit) && (
                  <Tag color="red" icon={<ExclamationCircleOutlined />}>
                    OVERDUE
                  </Tag>
                )}
              </Space>
            </div>
          </Card>
        </div>
      )}
    </Draggable>
  );

  // Render column
  const renderColumn = (column) => {
    const columnTodos = groupedTodos[column.id] || [];
    
    return (
      <Card
        key={column.id}
        style={{ 
          minHeight: '500px', 
          marginRight: 16, 
          width: '300px',
          flexShrink: 0
        }}
        bodyStyle={{ padding: '16px 12px' }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Space>
              <div 
                style={{ 
                  width: 12, 
                  height: 12, 
                  borderRadius: '50%', 
                  backgroundColor: column.color 
                }} 
              />
              <Title level={5} style={{ margin: 0, color: column.color }}>
                {column.title}
              </Title>
            </Space>
            <Badge count={columnTodos.length} showZero color={column.color} />
          </div>
        }
      >
        <Droppable droppableId={column.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{
                minHeight: '400px',
                backgroundColor: snapshot.isDraggingOver ? '#f6ffed' : 'transparent',
                borderRadius: 4,
                padding: 4
              }}
            >
              {columnTodos.length === 0 ? (
                <Empty 
                  description={`No ${column.title.toLowerCase()} items`}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ margin: '40px 0' }}
                />
              ) : (
                columnTodos.map((todo, index) => renderTodoCard(todo, index))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </Card>
    );
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div style={{ 
        display: 'flex', 
        overflowX: 'auto', 
        padding: '16px 0',
        minHeight: '600px'
      }}>
        {columns.map(column => renderColumn(column))}
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard;
