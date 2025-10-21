import React from 'react';
import { 
  Card, 
  Typography, 
  Row, 
  Col, 
  Descriptions, 
  Tag, 
  Divider, 
  Avatar, 
  Space 
} from 'antd';
import { 
  GlobalOutlined, 
  MailOutlined, 
  PhoneOutlined, 
  EnvironmentOutlined,
  FacebookOutlined,
  LinkedinOutlined,
  InstagramOutlined,
  VideoCameraOutlined
} from '@ant-design/icons';
import moment from 'moment';
import { APP_NAME } from 'configs/AppConfig';

const { Title, Text, Link } = Typography;

const CompanyView = ({ company }) => {
  if (!company) return null;
  
  // Convert Firestore timestamp to readable date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    // Handle both Firestore timestamp and date strings
    if (timestamp.toDate) {
      return moment(timestamp.toDate()).format('MMMM D, YYYY');
    }
    
    return moment(timestamp).format('MMMM D, YYYY');
  };
  
  // Status color mapping
  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'active': return 'green';
      case 'inactive': return 'red';
      case 'under construction': return 'orange';
      default: return 'blue';
    }
  };

  return (
    <Card className="shadow-sm">
      <Row gutter={[24, 24]}>
        {/* Company Logo and Basic Info */}
        <Col xs={24} md={8} className="text-center">
          {company.logo ? (
            <Avatar 
              src={company.logo} 
              size={200} 
              shape="square"
              className="mb-4"
            />
          ) : (
            <Avatar 
              size={200} 
              shape="square" 
              className="mb-4"
              style={{ backgroundColor: '#1890ff' }}
            >
              {company.name?.charAt(0)?.toUpperCase() || APP_NAME.charAt(0)}
            </Avatar>
          )}
          
          <div>
            <Title level={3}>{company.name}</Title>
            <Tag color={getStatusColor(company.status)}>
              {company.status || 'Unknown Status'}
            </Tag>
          </div>
          
          <div className="mt-4">
            <Text type="secondary">Member since {formatDate(company.createdAt)}</Text>
          </div>
        </Col>
        
        <Col xs={24} md={16}>
          <Descriptions title="Company Information" bordered column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Field/Industry">
              {company.field || 'Not specified'}
            </Descriptions.Item>
            
            <Descriptions.Item label="Location">
              <Space>
                <EnvironmentOutlined />
                <span>{company.location || 'Not specified'}</span>
              </Space>
            </Descriptions.Item>
            
            <Descriptions.Item label="Region/Country">
              {company.region || 'Not specified'}
            </Descriptions.Item>
            
            <Descriptions.Item label="Phone">
              <Space>
                <PhoneOutlined />
                <span>{company.phoneNumber || 'Not specified'}</span>
              </Space>
            </Descriptions.Item>
            
            <Descriptions.Item label="Email" span={2}>
              <Space>
                <MailOutlined />
                <span>{company.emailAddress || 'Not specified'}</span>
              </Space>
            </Descriptions.Item>
            
            {company.websiteUrl && (
              <Descriptions.Item label="Website" span={2}>
                <Link href={company.websiteUrl} target="_blank" rel="noopener noreferrer">
                  <GlobalOutlined /> {company.websiteUrl}
                </Link>
              </Descriptions.Item>
            )}
          </Descriptions>
          
          {/* Company Description */}
          <div className="mt-4">
            <Title level={5}>About</Title>
            <Text>{company.description || 'No description provided.'}</Text>
          </div>
        </Col>
      </Row>
      
      {/* Social Media Section */}
      {company.socialMediaLinks && Object.values(company.socialMediaLinks).some(link => link) && (
        <>
          <Divider orientation="left">Social Media</Divider>
          <Row gutter={16}>
            {company.socialMediaLinks.facebook && (
              <Col>
                <Link href={company.socialMediaLinks.facebook} target="_blank" rel="noopener noreferrer">
                  <FacebookOutlined style={{ fontSize: 24 }} />
                </Link>
              </Col>
            )}
            
            {company.socialMediaLinks.linkedin && (
              <Col>
                <Link href={company.socialMediaLinks.linkedin} target="_blank" rel="noopener noreferrer">
                  <LinkedinOutlined style={{ fontSize: 24 }} />
                </Link>
              </Col>
            )}
            
           {company.socialMediaLinks.tiktok && (
  <Col>
    <Link href={company.socialMediaLinks.tiktok} target="_blank" rel="noopener noreferrer">
      <VideoCameraOutlined style={{ fontSize: 24 }} />
    </Link>
  </Col>
)}

            {company.socialMediaLinks.instagram && (
              <Col>
                <Link href={company.socialMediaLinks.instagram} target="_blank" rel="noopener noreferrer">
                  <InstagramOutlined style={{ fontSize: 24 }} />
                </Link>
              </Col>
            )}
          </Row>
        </>
      )}
    </Card>
  );
};

export default CompanyView;
