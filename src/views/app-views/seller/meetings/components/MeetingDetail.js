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
  ScheduleOutlined
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
  users = [],
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

  const getMeetingType = () => {
    if (meeting.Type === 'online') {
      return <Space><GlobalOutlined /> Online Meeting</Space>;
    }
    return <Space><EnvironmentOutlined /> On-Site Meeting</Space>;
  };

  // Internal Participants (real users from company)
  const internalParticipants = users.filter(user => 
    meeting.Users && meeting.Users.includes(user.id)
  );

  // External Participants (free text names/emails)
  const externalParticipants = meeting.ExternalParticipants || [];

  const isCreator = meeting.creator_id === currentUser?.uid;

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>Meeting Details</div>
          <Badge status={getStatusColor(meeting.Status)} text={meeting.Status} />
        </div>
      }
      width={520}
      open={visible}
      onClose={onClose}
      footer={
        <div style={{ textAlign: 'right' }}>
          {isCreator && (
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
        <Title level={4}>{meeting.Title}</Title>
        
        <Descriptions bordered column={1} size="small" className="mb-4">
          <Descriptions.Item label={<><ScheduleOutlined /> Date & Time</>}>
            <CalendarOutlined /> {meetingTime} to {endTime}
            <div><ClockCircleOutlined /> {meeting.Duration} minutes</div>
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
              {meeting.Description}
            </Descriptions.Item>
          )}
        </Descriptions>

        {/* ==================== INTERNAL PARTICIPANTS ==================== */}
        <Divider orientation="left">
          Internal Participants ({internalParticipants.length})
        </Divider>
        
        <div className="participants-list" style={{ marginBottom: 24 }}>
          {internalParticipants.map(user => (
            <div key={user.id} style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
              <Avatar 
                icon={<UserOutlined />} 
                style={{ 
                  marginRight: '12px', 
                  backgroundColor: user.id === meeting.creator_id ? '#1890ff' : '#d9d9d9' 
                }} 
              />
              <div>
                <Text strong>{user.name}</Text>
                {user.id === meeting.creator_id && (
                  <Tag color="blue" style={{ marginLeft: '8px' }}>Organizer</Tag>
                )}
                {user.Role && <div><Text type="secondary">{user.Role}</Text></div>}
              </div>
            </div>
          ))}

          {internalParticipants.length === 0 && (
            <Text type="secondary">No internal participants</Text>
          )}
        </div>

        {/* ==================== EXTERNAL PARTICIPANTS ==================== */}
        <Divider orientation="left">
          External Participants ({externalParticipants.length})
        </Divider>
        
        <div className="participants-list">
          {externalParticipants.map((name, index) => (
            <div key={index} style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
              <Avatar 
                icon={<UserOutlined />} 
                style={{ marginRight: '12px', backgroundColor: '#fa8c16' }} 
              />
              <div>
                <Text strong>{name}</Text>
                {name.includes('@') && <div><Text type="secondary">{name}</Text></div>}
                <Tag color="orange" style={{ marginLeft: 8 }}>External</Tag>
              </div>
            </div>
          ))}

          {externalParticipants.length === 0 && (
            <Text type="secondary">No external participants</Text>
          )}
        </div>

        <Divider />
        
        <div className="meeting-meta text-right">
          <Text type="secondary">
            Created by: {users.find(u => u.id === meeting.creator_id)?.name || 'Unknown'}
          </Text>
        </div>
      </div>
    </Drawer>
  );
};

export default MeetingDetail;