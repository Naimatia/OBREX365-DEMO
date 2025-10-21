
import React from 'react';
import { Card, Timeline, Tag, Badge, Tooltip, Avatar, Empty, Spin, Typography } from 'antd';
import { 
  UserAddOutlined, 
  DollarOutlined,
  FileTextOutlined, 
  PhoneOutlined, 
  HomeOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Text, Title } = Typography;

const getStatusColor = (status) => {
  const statusMap = {
    'Pending': 'warning',
    'Gain': 'success',
    'Loss': 'error',
    'Contacted': 'processing',
    'Deal': 'success',
    'Opened': 'processing',
    'Sold': 'success',
    'Completed': 'success',
    'Cancelled': 'error',
    'Working': 'processing',
    'Vacation': 'warning',
    'Paid': 'success',
    'Missed': 'error'
  };
  
  return statusMap[status] || 'default';
};

const getIcon = (type) => {
  switch (type) {
    case 'lead':
      return <UserAddOutlined />;
    case 'contact':
      return <PhoneOutlined />;
    case 'deal':
      return <DollarOutlined />;
    case 'property':
      return <HomeOutlined />;
    case 'meeting':
      return <CalendarOutlined />;
    case 'invoice':
      return <FileTextOutlined />;
    default:
      return <FileTextOutlined />;
  }
};

const getStatusIcon = (status) => {
  if (['Gain', 'Deal', 'Success', 'Completed', 'Paid', 'Sold'].includes(status)) {
    return <CheckCircleOutlined />;
  } else if (['Pending', 'Opened', 'Contacted', 'Working'].includes(status)) {
    return <ClockCircleOutlined />;
  } else if (['Loss', 'Missed', 'Cancelled'].includes(status)) {
    return <CloseCircleOutlined />;
  } else {
    return <ExclamationCircleOutlined />;
  }
};

const formatActivityTime = (timestamp) => {
  if (!timestamp) return '';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return moment(date).format('MMM DD, YYYY');
};

const ActivityItem = ({ activity }) => {
  const { type, title, status, timestamp, user, description } = activity;
  
  return (
    <Timeline.Item 
      dot={
        <Avatar 
          icon={getIcon(type)} 
          size="small" 
          style={{ 
            backgroundColor: type === 'lead' ? '#1890ff' :
                             type === 'contact' ? '#52c41a' :
                             type === 'deal' ? '#722ed1' :
                             type === 'property' ? '#fa8c16' :
                             type === 'meeting' ? '#13c2c2' :
                             type === 'invoice' ? '#eb2f96' : '#8c8c8c'
          }} 
        />
      }
    >
      <div style={{ marginBottom: 8 }}>
        <Text strong>{title}</Text>
        {status && (
          <Tag 
            color={getStatusColor(status)}
            icon={getStatusIcon(status)}
            style={{ marginLeft: 8, borderRadius: '10px' }}
          >
            {status}
          </Tag>
        )}
      </div>
      
      {description && (
        <div style={{ marginBottom: 4, fontSize: '14px' }}>{description}</div>
      )}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(0, 0, 0, 0.45)' }}>
        <div>{user?.name || 'System'}</div>
        <Tooltip title={timestamp && moment(timestamp.toDate ? timestamp.toDate() : timestamp).format('YYYY-MM-DD HH:mm:ss')}>
          {formatActivityTime(timestamp)}
        </Tooltip>
      </div>
    </Timeline.Item>
  );
};

const ActivityTimeline = ({ 
  activities, 
  loading = false, 
  title = "Recent Activity",
  emptyText = "No recent activities",
  maxHeight = 400
}) => {
  return (
    <Card 
      title={<Title level={5} style={{ margin: 0 }}>{title}</Title>}
      bordered={true}
      bodyStyle={{ 
        padding: '0 24px 24px 24px',
        maxHeight: `${maxHeight}px`,
        overflowY: 'auto'
      }}
      style={{
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
      }}
    >
      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <Spin />
        </div>
      ) : activities && activities.length > 0 ? (
        <Timeline style={{ marginTop: 24 }}>
          {activities.map((activity, index) => (
            <ActivityItem key={activity.id || index} activity={activity} />
          ))}
        </Timeline>
      ) : (
        <Empty 
          description={emptyText}
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
          style={{ margin: '40px 0' }}
        />
      )}
    </Card>
  );
};

export default ActivityTimeline;
