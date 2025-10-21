import React from 'react';
import { 
  Drawer, 
  Card, 
  Row, 
  Col, 
  Typography, 
  Tag, 
  Space, 
  Button, 
  Avatar, 
  Descriptions, 
  Divider,
  Timeline,
  message
} from 'antd';
import { 
  UserOutlined, 
  MailOutlined, 
  PhoneOutlined, 
  CalendarOutlined, 
  LinkOutlined, 
  EditOutlined, 
  DeleteOutlined,
  BankOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  FileSearchOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;

// Status color and icon mapping
const statusConfig = {
  'Pending': { color: '#faad14', icon: <ClockCircleOutlined /> },
  'Reviewed': { color: '#1890ff', icon: <EyeOutlined /> },
  'Interviewed': { color: '#722ed1', icon: <UserOutlined /> },
  'Hired': { color: '#52c41a', icon: <CheckCircleOutlined /> },
  'Rejected': { color: '#f5222d', icon: <CloseCircleOutlined /> }
};

const ApplicationDetail = ({ 
  application, 
  visible, 
  onClose, 
  onEdit, 
  onDelete, 
  onStatusChange 
}) => {
  if (!application) return null;

  // Handle CV link click
  const handleViewCV = () => {
    if (application.CVUrl) {
      window.open(application.CVUrl, '_blank');
    } else {
      message.info('No CV URL provided for this application');
    }
  };

  // Handle email click
  const handleSendEmail = () => {
    if (application.email) {
      const subject = encodeURIComponent(`Regarding your ${application.Job} application`);
      const body = encodeURIComponent(`Dear ${application.firstname},\n\nThank you for your interest in the ${application.Job} position at our company.\n\nBest regards,\nHR Team`);
      window.location.href = `mailto:${application.email}?subject=${subject}&body=${body}`;
    } else {
      message.info('No email address provided for this applicant');
    }
  };

  // Generate timeline data
  const getTimelineData = () => {
    const timeline = [];
    
    // Application submitted
    timeline.push({
      color: '#1890ff',
      dot: <CalendarOutlined style={{ fontSize: '16px' }} />,
      children: (
        <div>
          <Text strong>Application Submitted</Text>
          <div style={{ color: '#666', fontSize: '12px' }}>
            {moment(application.ApplicantDate).format('MMM DD, YYYY [at] HH:mm')}
          </div>
        </div>
      )
    });

    // Status updates based on current status
    if (application.Status === 'Reviewed' || 
        application.Status === 'Interviewed' || 
        application.Status === 'Hired') {
      timeline.push({
        color: '#52c41a',
        dot: <EyeOutlined style={{ fontSize: '16px' }} />,
        children: (
          <div>
            <Text strong>Application Reviewed</Text>
            <div style={{ color: '#666', fontSize: '12px' }}>
              Application has been reviewed by HR team
            </div>
          </div>
        )
      });
    }

    if (application.Status === 'Interviewed' || application.Status === 'Hired') {
      timeline.push({
        color: '#722ed1',
        dot: <UserOutlined style={{ fontSize: '16px' }} />,
        children: (
          <div>
            <Text strong>Interview Scheduled</Text>
            <div style={{ color: '#666', fontSize: '12px' }}>
              Candidate invited for interview
            </div>
          </div>
        )
      });
    }

    if (application.Status === 'Hired') {
      timeline.push({
        color: '#52c41a',
        dot: <CheckCircleOutlined style={{ fontSize: '16px' }} />,
        children: (
          <div>
            <Text strong>Hired!</Text>
            <div style={{ color: '#666', fontSize: '12px' }}>
              Congratulations! Welcome to the team
            </div>
          </div>
        )
      });
    }

    if (application.Status === 'Rejected') {
      timeline.push({
        color: '#f5222d',
        dot: <CloseCircleOutlined style={{ fontSize: '16px' }} />,
        children: (
          <div>
            <Text strong>Application Declined</Text>
            <div style={{ color: '#666', fontSize: '12px' }}>
              Unfortunately, we cannot proceed with this application
            </div>
          </div>
        )
      });
    }

    // Last update
    timeline.push({
      color: '#d9d9d9',
      dot: <ClockCircleOutlined style={{ fontSize: '16px' }} />,
      children: (
        <div>
          <Text>Last Updated</Text>
          <div style={{ color: '#666', fontSize: '12px' }}>
            {moment(application.LastUpdate).fromNow()}
          </div>
        </div>
      )
    });

    return timeline;
  };

  const statusInfo = statusConfig[application.Status] || statusConfig.Pending;

  return (
    <Drawer
      title={
        <Space>
          <FileSearchOutlined />
          <span>Application Details</span>
        </Space>
      }
      width={720}
      onClose={onClose}
      open={visible}
      bodyStyle={{ padding: '24px' }}
    >
      {/* Header Card with Applicant Info */}
      <Card
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: '12px',
          marginBottom: '24px'
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <Row align="middle" gutter={16}>
          <Col>
            <Avatar 
              size={64}
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: '#fff',
                fontSize: '24px'
              }}
              icon={<UserOutlined />}
            >
              {application.firstname?.[0]}{application.lastname?.[0]}
            </Avatar>
          </Col>
          <Col flex={1}>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>
              {application.firstname} {application.lastname}
            </Title>
            <Space style={{ marginTop: '8px' }}>
              <Tag 
                color={statusInfo.color}
                icon={statusInfo.icon}
                style={{ 
                  borderRadius: '6px',
                  fontSize: '14px',
                  padding: '4px 12px'
                }}
              >
                {application.Status}
              </Tag>
              <Tag 
                color="blue"
                style={{ 
                  borderRadius: '6px',
                  fontSize: '14px',
                  padding: '4px 12px',
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#fff'
                }}
              >
                {application.Job}
              </Tag>
            </Space>
          </Col>
          <Col>
            <Space direction="vertical">
              <Button 
                type="primary"
                icon={<EditOutlined />}
                onClick={() => onEdit(application)}
                style={{ 
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)'
                }}
              >
                Edit
              </Button>
              <Button 
                danger
                icon={<DeleteOutlined />}
                onClick={() => onDelete(application.id)}
                style={{ 
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)'
                }}
              >
                Delete
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Contact Information */}
      <Card 
        title={
          <Space>
            <MailOutlined />
            <span>Contact Information</span>
          </Space>
        }
        style={{ marginBottom: '24px' }}
      >
        <Descriptions column={1}>
          <Descriptions.Item 
            label={<Space><MailOutlined /> Email</Space>}
          >
            {application.email ? (
              <Button 
                type="link" 
                onClick={handleSendEmail}
                style={{ padding: 0 }}
              >
                {application.email}
              </Button>
            ) : (
              <Text type="secondary">Not provided</Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item 
            label={<Space><PhoneOutlined /> Phone</Space>}
          >
            {application.phoneNumber || <Text type="secondary">Not provided</Text>}
          </Descriptions.Item>
          <Descriptions.Item 
            label={<Space><CalendarOutlined /> Application Date</Space>}
          >
            {moment(application.ApplicantDate).format('MMMM DD, YYYY')}
          </Descriptions.Item>
          <Descriptions.Item 
            label={<Space><LinkOutlined /> CV/Resume</Space>}
          >
            {application.CVUrl ? (
              <Button 
                type="link" 
                icon={<LinkOutlined />}
                onClick={handleViewCV}
                style={{ padding: 0 }}
              >
                View CV
              </Button>
            ) : (
              <Text type="secondary">Not provided</Text>
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Additional Information */}
      {(application.notes || application.experience) && (
        <Card 
          title={
            <Space>
              <FileSearchOutlined />
              <span>Additional Information</span>
            </Space>
          }
          style={{ marginBottom: '24px' }}
        >
          {application.experience && (
            <>
              <Title level={5}>Experience Summary</Title>
              <Paragraph style={{ marginBottom: '16px' }}>
                {application.experience}
              </Paragraph>
            </>
          )}
          
          {application.notes && (
            <>
              <Title level={5}>Notes</Title>
              <Paragraph>
                {application.notes}
              </Paragraph>
            </>
          )}
        </Card>
      )}

      {/* Application Timeline */}
      <Card 
        title={
          <Space>
            <ClockCircleOutlined />
            <span>Application Timeline</span>
          </Space>
        }
      >
        <Timeline items={getTimelineData()} />
      </Card>

      {/* Quick Actions */}
      <div style={{ marginTop: '24px' }}>
        <Card 
          title="Quick Actions" 
          size="small"
        >
          <Space wrap>
            <Button 
              type="primary" 
              onClick={() => onStatusChange(application.id, 'Reviewed')}
              disabled={application.Status === 'Reviewed'}
            >
              Mark as Reviewed
            </Button>
            <Button 
              onClick={() => onStatusChange(application.id, 'Interviewed')}
              disabled={application.Status === 'Interviewed'}
            >
              Schedule Interview
            </Button>
            <Button 
              type="primary" 
              style={{ backgroundColor: '#52c41a' }}
              onClick={() => onStatusChange(application.id, 'Hired')}
              disabled={application.Status === 'Hired'}
            >
              Hire Candidate
            </Button>
            <Button 
              danger
              onClick={() => onStatusChange(application.id, 'Rejected')}
              disabled={application.Status === 'Rejected'}
            >
              Reject Application
            </Button>
          </Space>
        </Card>
      </div>
    </Drawer>
  );
};

export default ApplicationDetail;
