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
  Tooltip,
  Popconfirm,
  Badge
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  LinkOutlined,
  GlobalOutlined,
  EnvironmentOutlined,
  ScheduleOutlined
} from '@ant-design/icons';
import moment from 'moment';

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
  users,
  currentUser
}) => {
  if (!meeting) return null;

  // Format meeting time
  const meetingTime = moment(meeting.DateTime).format('YYYY-MM-DD HH:mm');
  
  // Calculate end time based on duration
  const endTime = moment(meeting.DateTime)
    .add(meeting.Duration, 'minutes')
    .format('HH:mm');

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'Cancelled':
        return 'error';
      case 'Pending':
      default:
        return 'processing';
    }
  };

  // Get meeting type details
  const getMeetingType = () => {
    if (meeting.Type === 'online') {
      return (
        <Space>
          <GlobalOutlined /> Online Meeting
        </Space>
      );
    } else {
      return (
        <Space>
          <EnvironmentOutlined /> On-Site Meeting
        </Space>
      );
    }
  };

  // Filter the participants from the user list
  const participants = users.filter(user => 
    meeting.Users && meeting.Users.includes(user.id)
  );

  // Check if current user is the creator of the meeting
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
                placement="topRight"
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
              <a 
                href={meeting.MeetLink} 
                target="_blank" 
                rel="noopener noreferrer"
              >
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

        <Divider orientation="left">Participants ({participants.length})</Divider>
        
        <div className="participants-list">
          {participants.map(user => (
            <div key={user.id} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
              <Avatar 
                icon={<UserOutlined />} 
                style={{ marginRight: '10px', backgroundColor: user.id === meeting.creator_id ? '#1890ff' : '#d9d9d9' }} 
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
          
          {participants.length === 0 && (
            <Text type="secondary">No participants added</Text>
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
