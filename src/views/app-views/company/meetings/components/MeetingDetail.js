// MeetingDetail.js - Updated to show participants from employees table

import React from 'react';
import {
  Drawer,
  Descriptions,
  Button,
  Tag,
  Space,
  Typography,
  Avatar,
  Divider,
  Popconfirm,
  Badge
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  LinkOutlined,
  GlobalOutlined,
  EnvironmentOutlined,
  ScheduleOutlined,
  TeamOutlined,
  MailOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

/**
 * Component for displaying detailed meeting information
 */
const MeetingDetail = ({
  meeting,
  visible,
  onClose,
  onEdit,
  onDelete,
  users = [], // Company users (fallback)
  employees = [], // Employees from employees table
  currentUser
}) => {
  if (!meeting || !visible) return null;

  // Format meeting time
  const meetingTime = dayjs(meeting.DateTime).format('YYYY-MM-DD HH:mm');
  const endTime = dayjs(meeting.DateTime)
    .add(meeting.Duration, 'minutes')
    .format('HH:mm');

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'success';
      case 'Cancelled': return 'error';
      default: return 'processing';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed': return <Tag color="green">Completed</Tag>;
      case 'Cancelled': return <Tag color="red">Cancelled</Tag>;
      default: return <Tag color="blue">Pending</Tag>;
    }
  };

  const getMeetingType = () => {
    if (meeting.Type === 'online') {
      return <Space><GlobalOutlined /> Online Meeting</Space>;
    }
    return <Space><EnvironmentOutlined /> On-Site Meeting</Space>;
  };

  // Get participants from employees table (primary) and users (fallback)
  const getParticipants = () => {
    const participants = [];
    const meetingUserIds = meeting.Users || [];

    meetingUserIds.forEach(userId => {
      // First try to find in employees table
      const employee = employees.find(emp => emp.id === userId);
      if (employee) {
        participants.push({
          id: userId,
          name: employee.name || 'Employee',
          email: employee.email || '',
          role: employee.Role || 'Employee',
          source: 'employees',
          isOrganizer: userId === meeting.creator_id
        });
        return;
      }

      // Fallback to company users
      const user = users.find(u => u.id === userId);
      if (user) {
        participants.push({
          id: userId,
          name: user.name || user.displayName || 'User',
          email: user.email || '',
          role: user.Role || 'User',
          source: 'users',
          isOrganizer: userId === meeting.creator_id
        });
      }
    });

    return participants;
  };

  // Get external participants
  const getExternalParticipants = () => {
    return meeting.ExternalParticipants || [];
  };

  // Get organizer
  const getOrganizer = () => {
    const allParticipants = getParticipants();
    return allParticipants.find(p => p.isOrganizer);
  };

  const participants = getParticipants();
  const externalParticipants = getExternalParticipants();
  const organizer = getOrganizer();

  // Check if current user can edit/delete
  const isCreator = meeting.creator_id === currentUser?.uid;
  const canEdit = isCreator || currentUser?.Role?.toLowerCase() === 'ceo' || currentUser?.Role?.toLowerCase() === 'hr';

  // Get participant display with role badge
  const getParticipantDisplay = (participant) => {
    const roleColor = participant.role === 'CEO' ? 'gold' : 
                      participant.role === 'Manager' ? 'cyan' : 
                      participant.role === 'Agent' ? 'blue' : 'default';
    
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '8px 12px',
        background: participant.isOrganizer ? '#e6f7ff' : 'transparent',
        borderRadius: '6px',
        marginBottom: '4px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            icon={<UserOutlined />} 
            style={{ 
              marginRight: '12px', 
              backgroundColor: participant.isOrganizer ? '#1890ff' : '#d9d9d9' 
            }} 
          />
          <div>
            <Text strong>{participant.name}</Text>
            {participant.role && (
              <Tag color={roleColor} style={{ marginLeft: '8px' }}>
                {participant.role}
              </Tag>
            )}
            {participant.isOrganizer && (
              <Tag color="blue" style={{ marginLeft: '4px' }}>Organizer</Tag>
            )}
            {participant.source === 'employees' && (
              <Tag color="green" style={{ marginLeft: '4px' }}>Employee</Tag>
            )}
            <div>
              {participant.email && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  <MailOutlined style={{ marginRight: 4 }} />
                  {participant.email}
                </Text>
              )}
            </div>
          </div>
        </div>
        {participant.isOrganizer && (
          <Badge status="processing" text="Organizer" />
        )}
      </div>
    );
  };

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>{meeting.Title}</Title>
          </div>
          <div>
            {getStatusBadge(meeting.Status)}
          </div>
        </div>
      }
      width={560}
      open={visible}
      onClose={onClose}
      footer={
        <div style={{ textAlign: 'right' }}>
          {canEdit && (
            <>
              <Popconfirm
                title="Are you sure you want to delete this meeting?"
                onConfirm={() => onDelete(meeting.id)}
                okText="Yes"
                cancelText="No"
              >
                <Button danger icon={<DeleteOutlined />} style={{ marginRight: 8 }}>
                  Delete
                </Button>
              </Popconfirm>
              <Button 
                type="primary" 
                onClick={() => onEdit(meeting)} 
                icon={<EditOutlined />}
                style={{ marginRight: 8 }}
              >
                Edit
              </Button>
            </>
          )}
          <Button onClick={onClose}>Close</Button>
        </div>
      }
    >
      <div className="meeting-details">
        {/* Meeting Info */}
        <Descriptions bordered column={1} size="small" className="mb-4">
          <Descriptions.Item label={<><ScheduleOutlined /> Date & Time</>}>
            <CalendarOutlined /> {meetingTime} to {endTime}
            <div style={{ marginTop: 4 }}>
              <ClockCircleOutlined /> {meeting.Duration} minutes
            </div>
          </Descriptions.Item>
          
          <Descriptions.Item label="Meeting Type">
            {getMeetingType()}
          </Descriptions.Item>
          
          {meeting.Type === 'online' && meeting.MeetLink && (
            <Descriptions.Item label="Meeting Link">
              <a href={meeting.MeetLink} target="_blank" rel="noopener noreferrer">
                <LinkOutlined /> Join Meeting
              </a>
            </Descriptions.Item>
          )}
          
          {meeting.Description && (
            <Descriptions.Item label="Description">
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {meeting.Description}
              </div>
            </Descriptions.Item>
          )}
        </Descriptions>

        {/* Participants Section */}
        <Divider orientation="left">
          <Space>
            <TeamOutlined />
            Participants ({participants.length + externalParticipants.length})
          </Space>
        </Divider>

        {/* Internal Participants - From Employees Table */}
        {participants.length > 0 ? (
          <div className="participants-list" style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Internal Participants ({participants.length})
              </Text>
            </div>
            {participants.map(participant => (
              <div key={participant.id}>
                {getParticipantDisplay(participant)}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginBottom: 16, padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
            <Text type="secondary">No internal participants</Text>
          </div>
        )}

        {/* External Participants */}
        {externalParticipants.length > 0 && (
          <div className="participants-list" style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                External Participants ({externalParticipants.length})
              </Text>
            </div>
            {externalParticipants.map((name, index) => (
              <div key={`external-${index}`} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                padding: '8px 12px',
                background: '#fff7e6',
                borderRadius: '6px',
                marginBottom: '4px'
              }}>
                <Avatar 
                  icon={<UserOutlined />} 
                  style={{ marginRight: '12px', backgroundColor: '#fa8c16' }} 
                />
                <div>
                  <Text strong>{name}</Text>
                  {name.includes('@') && (
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        <MailOutlined style={{ marginRight: 4 }} />
                        {name}
                      </Text>
                    </div>
                  )}
                  <Tag color="orange" style={{ marginLeft: 8 }}>External</Tag>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Organizer Info */}
        {organizer && (
          <div style={{ 
            marginTop: 16, 
            padding: '12px 16px', 
            background: '#f0f5ff', 
            borderRadius: '8px',
            border: '1px solid #d6e4ff'
          }}>
            <Text type="secondary" style={{ fontSize: '13px' }}>
              <CalendarOutlined style={{ marginRight: 4 }} />
              Organized by: <strong>{organizer.name}</strong>
              {organizer.email && ` (${organizer.email})`}
            </Text>
          </div>
        )}

        {/* Meeting Metadata */}
        <Divider />
        <div className="meeting-meta">
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Created: {meeting.createdAt ? dayjs(meeting.createdAt.toDate()).format('MMM DD, YYYY HH:mm') : 'N/A'}
          </Text>
        </div>
      </div>
    </Drawer>
  );
};

export default MeetingDetail;