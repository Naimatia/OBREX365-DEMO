import React, { useState, useEffect } from 'react';
import { 
  Drawer, 
  Typography, 
  Divider, 
  Row, 
  Col, 
  Tag, 
  Button, 
  Space, 
  Card, 
  Descriptions,
  Statistic,
  Image,
  Spin
} from 'antd';
import { 
  HomeOutlined, 
  DollarOutlined, 
  ExpandOutlined, 
  EnvironmentOutlined, 
  CalendarOutlined, 
  CheckCircleOutlined, 
  PhoneOutlined, 
  MailOutlined, 
  TeamOutlined, 
  GlobalOutlined, 
  ShareAltOutlined, 
  BankOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

const PropertyDetail = ({ property, visible, onClose }) => {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setShowContent(true), 300);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [visible]);

  if (!property) return null;

  const {
    title,
    price,
    location,
    details,
    media,
    meta,
    amenities,
    agent,
    agency,
    completion_status,
    type,
    offplan_details
  } = property;

  // Format price
  const formattedPrice = price ? price.toLocaleString() : 'N/A';
  
  // Format date
  const formattedDate = meta?.created_at ? new Date(meta.created_at).toLocaleDateString() : 'N/A';

  // Get location string
  const getLocationString = () => {
    if (!location) return 'N/A';
    const parts = [];
    if (location.city?.name) parts.push(location.city.name);
    if (location.community?.name) parts.push(location.community.name);
    if (location.sub_community?.name) parts.push(location.sub_community.name);
    return parts.join(', ') || 'N/A';
  };

  // Get completion status tag
  const getStatusTag = () => {
    if (!completion_status) return null;
    const statusColors = {
      'completed': 'green',
      'off-plan': 'orange',
      'under-construction': 'blue'
    };
    const color = statusColors[completion_status.toLowerCase()] || 'default';
    return <Tag color={color}>{completion_status}</Tag>;
  };

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={4} style={{ margin: 0, color: '#fff' }}>🏡 Property Details</Title>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px' }}>Complete property information</Text>
          </div>
          <Space>
            {getStatusTag()}
            <Button 
              type="default"
              icon={<ShareAltOutlined />} 
              href={meta?.url} 
              target="_blank"
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff'
              }}
            >
              View Original
            </Button>
          </Space>
        </div>
      }
      placement="right"
      onClose={onClose}
      open={visible}
      width={750}
      destroyOnClose={true}
      headerStyle={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderBottom: 'none',
        color: '#fff',
        padding: '16px 24px'
      }}
      bodyStyle={{
        padding: '24px',
        marginTop: '0'
      }}
      footerStyle={{
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        borderTop: '1px solid #e8e8e8'
      }}
      footer={
        <div style={{ textAlign: 'right' }}>
          <Button 
            size="large"
            onClick={onClose}
            style={{ borderRadius: '6px' }}
          >
            Close
          </Button>
        </div>
      }
    >
      {showContent && (
        <div className="property-detail-content">
          <div className="property-image mb-4">
            <Image
              src={media?.cover_photo || 'https://placehold.co/600x400?text=No+Image+Available'}
              alt={title}
              style={{ 
                width: '100%', 
                borderRadius: '12px', 
                maxHeight: '350px', 
                objectFit: 'cover',
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
              }}
              placeholder={
                <div style={{
                  width: '100%',
                  height: '350px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                  borderRadius: '12px'
                }}>
                  <Spin size="large" />
                </div>
              }
              fallback="https://placehold.co/600x400?text=No+Image+Available"
              onError={() => console.error('Failed to load image for property:', property.id)}
            />
          </div>

          <Title level={2} style={{ 
            marginTop: 0, 
            marginBottom: '12px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold'
          }}>
            {title}
          </Title>

          <Space wrap style={{ marginBottom: '20px' }}>
            <Tag 
              color="blue" 
              icon={<EnvironmentOutlined />}
              style={{ 
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              {getLocationString()}
            </Tag>
            {details?.is_furnished && (
              <Tag 
                color="green" 
                icon={<CheckCircleOutlined />}
                style={{ 
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
              >
                Furnished
              </Tag>
            )}
            {type?.sub && (
              <Tag 
                color="purple" 
                style={{ 
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  textTransform: 'capitalize'
                }}
              >
                {type.sub}
              </Tag>
            )}
          </Space>

          <Row gutter={16} className="property-highlights" style={{ marginBottom: '28px' }}>
            <Col span={12}>
              <Card 
                bordered={false} 
                className="stat-card" 
                style={{ 
                  background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 16px rgba(82, 196, 26, 0.2)',
                  color: '#fff'
                }}
              >
                <Statistic
                  title={<span style={{ color: 'rgba(255,255,255,0.9)' }}>Price</span>}
                  value={`${formattedPrice} AED`}
                  prefix={<DollarOutlined style={{ color: '#fff' }} />}
                  valueStyle={{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card 
                bordered={false} 
                className="stat-card" 
                style={{ 
                  background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 16px rgba(24, 144, 255, 0.2)',
                  color: '#fff'
                }}
              >
                <Statistic
                  title={<span style={{ color: 'rgba(255,255,255,0.9)' }}>Size</span>}
                  value={`${details?.area?.built_up || 'N/A'} sq.ft`}
                  prefix={<ExpandOutlined style={{ color: '#fff' }} />}
                  valueStyle={{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
          </Row>
          
          <Row gutter={16} style={{ marginBottom: '28px' }}>
            <Col span={8}>
              <Card 
                style={{ 
                  textAlign: 'center',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #ffd6cc 0%, #ffb199 100%)',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(255, 177, 153, 0.3)'
                }}
              >
                <Statistic 
                  title={<span style={{ color: '#d4380d', fontWeight: 'bold' }}>Bedrooms</span>} 
                  value={details?.bedrooms || 'N/A'} 
                  prefix={<HomeOutlined style={{ color: '#d4380d' }} />} 
                  valueStyle={{ fontSize: '20px', color: '#d4380d', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card 
                style={{ 
                  textAlign: 'center',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #d6f7ff 0%, #91d5ff 100%)',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(145, 213, 255, 0.3)'
                }}
              >
                <Statistic 
                  title={<span style={{ color: '#0958d9', fontWeight: 'bold' }}>Bathrooms</span>} 
                  value={details?.bathrooms || 'N/A'} 
                  prefix={<HomeOutlined style={{ color: '#0958d9' }} />} 
                  valueStyle={{ fontSize: '20px', color: '#0958d9', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card 
                style={{ 
                  textAlign: 'center',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(217, 247, 190, 0.3)'
                }}
              >
                <Statistic 
                  title={<span style={{ color: '#389e0d', fontWeight: 'bold' }}>Listed Date</span>} 
                  value={formattedDate} 
                  prefix={<CalendarOutlined style={{ color: '#389e0d' }} />} 
                  valueStyle={{ fontSize: '16px', color: '#389e0d', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
          </Row>

          <Divider orientation="left">Property Details</Divider>
          
          <Card bordered={false} style={{ marginBottom: '24px', background: '#fafafa' }}>
            <Descriptions column={{ xs: 1, sm: 2 }} size="small">
              <Descriptions.Item label="Property Type" labelStyle={{ fontWeight: 'bold' }}>
                {type?.sub || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Furnishing" labelStyle={{ fontWeight: 'bold' }}>
                {details?.is_furnished ? 'Furnished' : 'Unfurnished'}
              </Descriptions.Item>
              <Descriptions.Item label="Completion Status" labelStyle={{ fontWeight: 'bold' }}>
                {completion_status || 'N/A'}
              </Descriptions.Item>
              {offplan_details?.original_price && (
                <Descriptions.Item label="Original Price" labelStyle={{ fontWeight: 'bold' }}>
                  {offplan_details.original_price.toLocaleString()} AED
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          <Divider orientation="left">Description</Divider>
          
          <Card className="description-card" bordered={false} style={{ marginBottom: '24px' }}>
            <Paragraph>
              {property.description ? (
                property.description.split(/\n|\\n/).map((paragraph, idx) => (
                  paragraph.trim() ? (
                    <React.Fragment key={idx}>
                      {paragraph}
                      <br /><br />
                    </React.Fragment>
                  ) : null
                ))
              ) : (
                'No description available'
              )}
            </Paragraph>
          </Card>

          {amenities?.length > 0 && (
            <>
              <Divider orientation="left">Amenities</Divider>
              <Card bordered={false} style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                  {amenities.map((amenity, index) => (
                    <Tag 
                      key={index} 
                      color="blue" 
                      icon={<CheckCircleOutlined />}
                      style={{ margin: '0 8px 8px 0', padding: '4px 8px' }}
                    >
                      {amenity}
                    </Tag>
                  ))}
                </div>
              </Card>
            </>
          )}

          {(agent || agency) && (
            <>
              <Divider orientation="left">Contact Information</Divider>
              <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                {agent && (
                  <Col xs={24} sm={12}>
                    <Card 
                      title={<><TeamOutlined /> Agent</>} 
                      size="small" 
                      bordered 
                      style={{ height: '100%' }}
                    >
                      <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>{agent.name}</p>
                      {agent.contact?.phone && (
                        <p style={{ margin: '4px 0' }}>
                          <PhoneOutlined style={{ marginRight: '8px' }} />
                          <a href={`tel:${agent.contact.phone}`}>{agent.contact.phone}</a>
                        </p>
                      )}
                      {agent.contact?.email && (
                        <p style={{ margin: '4px 0' }}>
                          <MailOutlined style={{ marginRight: '8px' }} />
                          <a href={`mailto:${agent.contact.email}`}>{agent.contact.email}</a>
                        </p>
                      )}
                    </Card>
                  </Col>
                )}
                {agency && (
                  <Col xs={24} sm={12}>
                    <Card 
                      title={<><BankOutlined /> Agency</>} 
                      size="small" 
                      bordered 
                      style={{ height: '100%' }}
                    >
                      <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>{agency.name}</p>
                      {agency.licenses?.[0]?.number && (
                        <p style={{ margin: '4px 0' }}>
                          <BankOutlined style={{ marginRight: '8px' }} />
                          License: {agency.licenses[0].number}
                        </p>
                      )}
                    </Card>
                  </Col>
                )}
              </Row>
            </>
          )}

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <Button 
              type="primary" 
              href={meta?.url} 
              target="_blank" 
              icon={<InfoCircleOutlined />}
            >
              View on Original Website
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
};

export default PropertyDetail;