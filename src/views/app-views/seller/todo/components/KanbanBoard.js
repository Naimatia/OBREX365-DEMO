import React from 'react';
import { 
  Card, 
  Typography, 
  Tag, 
  Tooltip, 
  Button, 
  Space,
  Popconfirm,
  Badge,
  Empty,
  message,
  Avatar,
  Divider
} from 'antd';
import { 
  EditOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  UserOutlined,
  MessageOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import TodoService from 'services/TodoService';

const { Title, Text, Paragraph } = Typography;

/* ====================== Design System ====================== */
const T = {
  border: '#E5E7EB',
  shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  shadowDrag: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  radius: '12px',
  colors: {
    ToDo: '#f59e0b',
    InProgress: '#3b82f6',
    Done: '#10b981',
    Blocked: '#ef4444',
  }
};

/**
 * Modern Kanban Board - Seller Restricted Version
 */
const KanbanBoard = ({ 
  todos = [], 
  onTodoUpdate, 
  onTodoDelete, 
  onTodoEdit, 
  sellers = [], 
  currentUser,
  isSeller = false   // ← New prop
}) => {

  const columns = [
    { id: 'ToDo',       title: 'To Do',        color: T.colors.ToDo,       icon: '📋' },
    { id: 'InProgress', title: 'In Progress',  color: T.colors.InProgress, icon: '🚀' },
    { id: 'Done',       title: 'Done',         color: T.colors.Done,       icon: '✅' },
    { id: 'Blocked',    title: 'Blocked',      color: T.colors.Blocked,    icon: '⛔' },
  ];

  const groupedTodos = todos.reduce((acc, todo) => {
    const status = todo.Status || 'ToDo';
    if (!acc[status]) acc[status] = [];
    acc[status].push(todo);
    return acc;
  }, {});

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || 
        (destination.droppableId === source.droppableId && destination.index === source.index)) return;

    try {
      await TodoService.updateTodoStatus(draggableId, destination.droppableId);
      message.success('Task moved successfully');
      onTodoUpdate?.(draggableId, { Status: destination.droppableId });
    } catch (error) {
      message.error('Failed to update task status');
    }
  };

// Improved Assignee Name Resolver
  const getAssigneeName = (assigneeId) => {
    if (!assigneeId) return 'Unassigned';

    // Check in sellers list first
    const seller = sellers.find(s => s.id === assigneeId);
    if (seller?.name) return seller.name;

    // Fallback: Check if it's the current user
    if (assigneeId === currentUser?.id || assigneeId === currentUser?.uid) {
      return currentUser?.name || 
             `${currentUser?.firstname || ''} ${currentUser?.lastname || ''}`.trim() || 
             'You';
    }

    return 'Unknown User';
  };

  const isOverdue = (dateLimit) => dateLimit && new Date(dateLimit) < new Date();

  const formatFullDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ====================== Todo Card ======================
  const TodoCard = ({ todo, index }) => {
    const isTaskOverdue = isOverdue(todo.DateLimit);
    const assigneeName = getAssigneeName(todo.AssignedTo || todo.assignee);

    return (
      <Draggable draggableId={String(todo.id)} index={index} key={todo.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={{ ...provided.draggableProps.style, marginBottom: 16 }}
          >
            <Card
              hoverable
              style={{
                borderRadius: T.radius,
                border: snapshot.isDragging 
                  ? `2px solid ${T.colors[todo.Status] || '#1890ff'}` 
                  : '1px solid #e5e7eb',
                boxShadow: snapshot.isDragging ? T.shadowDrag : T.shadow,
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              bodyStyle={{ padding: '18px' }}
              actions={isSeller ? [] : [  // ← Hide buttons for sellers
                <Tooltip title="Edit" key="edit">
                  <Button type="text" icon={<EditOutlined />} onClick={() => onTodoEdit?.(todo)} />
                </Tooltip>,
                <Popconfirm
                  title="Delete Task?"
                  description="This action cannot be undone."
                  onConfirm={() => onTodoDelete?.(todo.id)}
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                  key="delete"
                >
                  <Button type="text" icon={<DeleteOutlined />} danger />
                </Popconfirm>
              ]}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>

                {/* Title */}
                <Text strong style={{ fontSize: '16px', lineHeight: 1.4 }}>
                  {todo.Title || todo.ToDo}
                </Text>

                {/* Description */}
                {todo.Description && (
                  <Paragraph style={{ fontSize: '13.5px', color: '#64748b', marginBottom: 8 }}>
                    {todo.Description}
                  </Paragraph>
                )}

                <Divider style={{ margin: '8px 0' }} />

                {/* Priority */}
                {todo.Priority && (
                  <Tag color={
                    todo.Priority === 'High' ? 'red' :
                    todo.Priority === 'Medium' ? 'orange' : 'green'
                  }>
                    {todo.Priority}
                  </Tag>
                )}

                {/* Assignee */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar size={28} icon={<UserOutlined />} style={{ backgroundColor: '#f1f5f9' }} />
                  <Text style={{ fontSize: '13.5px' }}>{assigneeName}</Text>
                </div>

                {/* Due Date */}
                {todo.DateLimit && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8,
                    padding: '8px 12px',
                    background: isTaskOverdue ? '#fef2f2' : '#f8fafc',
                    borderRadius: 8,
                    border: isTaskOverdue ? '1px solid #fecaca' : '1px solid #e2e8f0'
                  }}>
                    <ClockCircleOutlined style={{ color: isTaskOverdue ? '#ef4444' : '#3b82f6' }} />
                    <div>
                      <Text strong style={{ fontSize: '13px', color: isTaskOverdue ? '#ef4444' : '#1e40af' }}>
                        Due: {formatFullDateTime(todo.DateLimit)}
                      </Text>
                      {isTaskOverdue && <Text type="danger"> • Overdue</Text>}
                    </div>
                  </div>
                )}

                {/* Creation & Last Edit */}
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  <div>Created: {formatFullDateTime(todo.CreationDate)}</div>
                  {todo.LastEdit && (
                    <div>Last Edit: {formatFullDateTime(todo.LastEdit)}</div>
                  )}
                </div>

                {/* Notes */}
                {todo.Notes && todo.Notes.length > 0 && (
                  <>
                    <Divider style={{ margin: '8px 0' }} />
                    <div>
                      <Space align="center" style={{ marginBottom: 8 }}>
                        <MessageOutlined />
                        <Text strong>Notes ({todo.Notes.length})</Text>
                      </Space>
                      {todo.Notes.map((note, idx) => (
                        <div key={idx} style={{
                          background: '#f8fafc',
                          padding: '10px 12px',
                          borderRadius: 8,
                          marginBottom: 6,
                          borderLeft: '3px solid #3b82f6'
                        }}>
                          <Text style={{ fontSize: '13px', display: 'block' }}>
                            {note.note || note.text || 'No content'}
                          </Text>
                          {note.CreationDate && (
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              {formatFullDateTime(note.CreationDate)}
                            </Text>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {isTaskOverdue && (
                  <Tag color="error" icon={<ExclamationCircleOutlined />} style={{ width: '100%', justifyContent: 'center' }}>
                    OVERDUE TASK
                  </Tag>
                )}

              </Space>
            </Card>
          </div>
        )}
      </Draggable>
    );
  };

  // Column Component
  const KanbanColumn = ({ column }) => {
    const columnTodos = groupedTodos[column.id] || [];

    return (
      <Card
        style={{
          width: 340,
          flexShrink: 0,
          borderRadius: T.radius,
          border: `1px solid ${T.border}`,
          boxShadow: T.shadow,
          minHeight: '620px',
        }}
        bodyStyle={{ padding: 0 }}
        title={
          <div style={{ 
            padding: '16px 20px',
            borderBottom: `1px solid ${T.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fafafa'
          }}>
            <Space>
              <span style={{ fontSize: '19px' }}>{column.icon}</span>
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
                padding: '16px',
                minHeight: '520px',
                backgroundColor: snapshot.isDraggingOver ? '#f8fafc' : 'transparent',
              }}
            >
              {columnTodos.length === 0 ? (
                <Empty description={`No ${column.title.toLowerCase()} tasks`} style={{ marginTop: 80 }} />
              ) : (
                columnTodos.map((todo, index) => (
                  <TodoCard key={todo.id} todo={todo} index={index} />
                ))
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
        gap: 24, 
        overflowX: 'auto', 
        padding: '10px 0 24px'
      }}>
        {columns.map(column => (
          <KanbanColumn key={column.id} column={column} />
        ))}
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard;