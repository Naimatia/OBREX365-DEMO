// components/AIBulkTaskModal.js

import React, { useState } from 'react';
import {
    Modal, Select, Input, Button, Card, Row, Col, Typography, Tag, message,
    DatePicker, Popconfirm, Space, Avatar
} from 'antd';
import { DeleteOutlined, SaveOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import TodoService from 'services/TodoService';
import DeepSeekService from 'services/DeepSeekService';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const AIBulkTaskModal = ({
    open,
    onCancel,
    sellers,
    currentUser,
    fetchTodos
}) => {
    const [selectedUserForAI, setSelectedUserForAI] = useState(null);
    const [aiPrompt, setAiPrompt] = useState('');
    const [editingTasks, setEditingTasks] = useState([]);
    const [aiGenerating, setAiGenerating] = useState(false);

    // Check if current user is joker for additional permissions
    const isJoker = currentUser?.isJoker === true || (currentUser?.isOwner === true && currentUser?.Role === 'CEO');

    const handleGenerate = async () => {
        if (!aiPrompt.trim()) return message.warning("Please describe the work");
        if (!selectedUserForAI) return message.warning("Please select a user");

        setAiGenerating(true);
        try {
            const result = await DeepSeekService.generateTasksForUser(
                selectedUserForAI,
                aiPrompt
            );

            const tasksWithDefaults = result.tasks.map(task => ({
                ...task,
                suggestedDueDate: task.suggestedDueDate ? dayjs(task.suggestedDueDate) : null,
                status: task.status || 'ToDo',
            }));

            setEditingTasks(tasksWithDefaults);
            message.success(`✅ ${result.tasks.length} tasks generated!`);
        } catch (err) {
            console.error(err);
            message.error("AI generation failed. Please try again.");
        } finally {
            setAiGenerating(false);
        }
    };

    const updateTask = (index, field, value) => {
        const newTasks = [...editingTasks];
        newTasks[index][field] = value;
        setEditingTasks(newTasks);
    };

    const deleteTask = (index) => {
        setEditingTasks(prev => prev.filter((_, i) => i !== index));
    };

    const createAllTasks = async () => {
        if (editingTasks.length === 0) return;

        try {
            for (const task of editingTasks) {
                const todoData = {
                    ToDo: task.title,
                    Description: task.description || '',
                    Priority: task.priority || 'Medium',
                    DateLimit: task.suggestedDueDate ? task.suggestedDueDate.toDate() : null,
                    assignee: selectedUserForAI.id,
                    Status: task.status || 'ToDo',
                    company_id: currentUser?.company_id || currentUser?.companyId,
                    user_id: currentUser?.uid || currentUser?.id,
                };

                await TodoService.createTodo(todoData);
            }

            message.success(`${editingTasks.length} tasks created successfully!`);
            fetchTodos?.();
            onCancel();
        } catch (error) {
            console.error(error);
            message.error('Failed to create tasks');
        }
    };

    return (
        <Modal
            title={
                <Space>
                    <RobotOutlined style={{ color: '#1890ff' }} />
                    AI Bulk Task Generator
                    
                </Space>
            }
            open={open}
            width={1000}
            onCancel={onCancel}
            footer={null}
            destroyOnClose
        >
            {!selectedUserForAI ? (
                <div>
                    <Title level={5}>Select Team Member</Title>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                        {sellers.length === 0 ? 'No team members found in your company' : `Select a user from your company (${sellers.length} available)`}
                    </Text>
                    <Select
                        style={{ width: '100%', marginBottom: 20 }}
                        placeholder="Choose who to assign tasks to"
                        onChange={(value) => {
                            const user = sellers.find(s => s.id === value);
                            setSelectedUserForAI(user);
                        }}
                        showSearch
                        optionFilterProp="children"
                        disabled={sellers.length === 0}
                    >
                        {sellers.map(s => (
                            <Option key={s.id} value={s.id}>
                                <Space>
                                    <Avatar size="small" icon={<UserOutlined />} />
                                    {s.name}
                                    {s.Role && <Text type="secondary" style={{ fontSize: '11px' }}>({s.Role})</Text>}
                                </Space>
                            </Option>
                        ))}
                    </Select>
                    {sellers.length === 0 && (
                        <Text type="danger">No team members available. Please add team members first.</Text>
                    )}
                </div>
            ) : (
                <div>
                    <Text strong>
                        Creating tasks for: <Tag color="blue">{selectedUserForAI.name}</Tag>
                        {selectedUserForAI.Role && <Tag color="geekblue">{selectedUserForAI.Role}</Tag>}
                    </Text>

                    <TextArea
                        rows={4}
                        placeholder="Describe the goals or responsibilities for this person... (e.g., increase sales, follow up with clients...)"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        style={{ margin: '15px 0' }}
                    />

                    <Button
                        type="primary"
                        block
                        loading={aiGenerating}
                        onClick={handleGenerate}
                        size="large"
                        icon={<RobotOutlined />}
                    >
                        ✨ Generate Tasks with AI
                    </Button>

                    {editingTasks.length > 0 && (
                        <div style={{ marginTop: 24 }}>
                            <Title level={5}>Review & Edit Tasks ({editingTasks.length})</Title>

                            {editingTasks.map((task, index) => (
                                <Card key={index} style={{ marginBottom: 16 }} hoverable>
                                    <Row gutter={16}>
                                        {/* Task Title */}
                                        <Col xs={24} md={12}>
                                            <Text strong>Task Title</Text>
                                            <Input
                                                value={task.title}
                                                onChange={(e) => updateTask(index, 'title', e.target.value)}
                                                placeholder="Enter task title"
                                                style={{ marginTop: 6 }}
                                            />
                                        </Col>

                                        {/* Due Date */}
                                        <Col xs={24} md={12}>
                                            <Text strong>Due Date</Text>
                                            <DatePicker
                                                style={{ width: '100%', marginTop: 6 }}
                                                value={task.suggestedDueDate}
                                                onChange={(date) => updateTask(index, 'suggestedDueDate', date)}
                                                showTime
                                                placeholder="Select due date"
                                            />
                                        </Col>

                                        {/* Status */}
                                        <Col xs={24} md={12} style={{ marginTop: 12 }}>
                                            <Text strong>Status</Text>
                                            <Select
                                                value={task.status}
                                                onChange={(val) => updateTask(index, 'status', val)}
                                                style={{ width: '100%', marginTop: 6 }}
                                            >
                                                <Option value="ToDo">To Do</Option>
                                                <Option value="InProgress">In Progress</Option>
                                                <Option value="Done">Done</Option>
                                                <Option value="Blocked">Blocked</Option>
                                            </Select>
                                        </Col>
                                    </Row>

                                    {/* Description */}
                                    <div style={{ marginTop: 16 }}>
                                        <Text strong>Description</Text>
                                        <TextArea
                                            rows={3}
                                            value={task.description}
                                            onChange={(e) => updateTask(index, 'description', e.target.value)}
                                            placeholder="Detailed task description"
                                            style={{ marginTop: 6 }}
                                        />
                                    </div>

                                    {/* Delete Button */}
                                    <div style={{ textAlign: 'right', marginTop: 12 }}>
                                        <Popconfirm
                                            title="Delete this task?"
                                            onConfirm={() => deleteTask(index)}
                                        >
                                            <Button danger icon={<DeleteOutlined />} size="small">
                                                Delete Task
                                            </Button>
                                        </Popconfirm>
                                    </div>
                                </Card>
                            ))}

                            <Button
                                type="primary"
                                size="large"
                                block
                                icon={<SaveOutlined />}
                                onClick={createAllTasks}
                            >
                                ✅ Create All {editingTasks.length} Tasks
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
};

export default AIBulkTaskModal;