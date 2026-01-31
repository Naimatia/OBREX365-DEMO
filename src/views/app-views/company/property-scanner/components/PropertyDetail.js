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
  Statistic,
  Image,
  Spin,
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
  BankOutlined,
  InfoCircleOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

const PropertyDetail = ({ property, visible, onClose }) => {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => setShowContent(true), 250);
      return () => clearTimeout(t);
    }
    setShowContent(false);
  }, [visible]);

  if (!property) return null;

  /* =========================================================
     Normalized property (already adapted in handleSearch)
     ========================================================= */
  const {
    title,
    price,
    location,
    rooms,
    bathrooms,
    media,
    description,
    amenities = [],
    furnished,
    reference,
    listed_date,
    share_url,
    agent,
    agency,
    meta,
    type,
  } = property;

  const coverImage =
    media?.cover_photo || 'https://placehold.co/600x400?text=No+Image';

  const listedDateFormatted = listed_date
    ? new Date(listed_date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'N/A';

  return (
    <Drawer
      open={visible}
      onClose={onClose}
      width={760}
      destroyOnClose
      headerStyle={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderBottom: 'none',
      }}
      title={
        <div>
          <Title level={4} style={{ margin: 0, color: '#fff' }}>
            🏡 Property Details
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.85)' }}>
            Ref: {reference || 'N/A'}
          </Text>
        </div>
      }
      extra={
        <Button
          icon={<ShareAltOutlined />}
          href={share_url}
          target="_blank"
          style={{
            background: 'rgba(255,255,255,0.2)',
            color: '#fff',
            borderColor: 'rgba(255,255,255,0.3)',
          }}
        >
          View Original
        </Button>
      }
      footer={
        <div style={{ textAlign: 'right' }}>
          <Button size="large" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      {showContent && (
        <>
          {/* Image */}
          <Image
            src={coverImage}
            alt={title}
            style={{
              width: '100%',
              maxHeight: 420,
              objectFit: 'cover',
              borderRadius: 12,
              marginBottom: 24,
            }}
            placeholder={
              <div
                style={{
                  height: 400,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Spin size="large" />
              </div>
            }
          />

          {/* Title */}
          <Title level={2}>{title}</Title>

          {/* Tags */}
          <Space wrap size="middle" style={{ marginBottom: 24 }}>
            {location?.full_name && (
              <Tag icon={<EnvironmentOutlined />} color="blue">
                {location.full_name}
              </Tag>
            )}
            {furnished && (
              <Tag icon={<CheckCircleOutlined />} color="green">
                {furnished}
              </Tag>
            )}
            {type?.sub && <Tag color="purple">{type.sub}</Tag>}
          </Space>

          {/* Stats */}
          <Row gutter={16} style={{ marginBottom: 32 }}>
            <Col xs={8}>
              <Card bordered={false} style={{ background: '#f6ffed' }}>
                <Statistic
                  title="Price"
                  value={price || 'N/A'}
                  prefix={<DollarOutlined />}
                />
              </Card>
            </Col>
            <Col xs={8}>
              <Card bordered={false} style={{ background: '#e6f7ff' }}>
                <Statistic
                  title="Bedrooms"
                  value={rooms || 'N/A'}
                  prefix={<HomeOutlined />}
                />
              </Card>
            </Col>
            <Col xs={8}>
              <Card bordered={false} style={{ background: '#fff7e6' }}>
                <Statistic
                  title="Bathrooms"
                  value={bathrooms || 'N/A'}
                  prefix={<HomeOutlined />}
                />
              </Card>
            </Col>
          </Row>

          {/* Listed Date */}
          <Card bordered={false} style={{ marginBottom: 24 }}>
            <Statistic
              title="Listed Date"
              value={listedDateFormatted}
              prefix={<CalendarOutlined />}
            />
          </Card>

          {/* Description */}
          <Divider orientation="left">Description</Divider>
          <Paragraph>{description || 'No description available.'}</Paragraph>

          {/* Amenities */}
          {amenities.length > 0 && (
            <>
              <Divider orientation="left">Amenities</Divider>
              <Space wrap>
                {amenities.map((a, i) => (
                  <Tag key={i} icon={<CheckCircleOutlined />} color="blue">
                    {a}
                  </Tag>
                ))}
              </Space>
            </>
          )}

          {/* Contact */}
          {(agent || agency) && (
            <>
              <Divider orientation="left">Contact</Divider>
              <Row gutter={16}>
                {agent && (
                  <Col span={12}>
                    <Card title={<><TeamOutlined /> Agent</>}>
                      <strong>{agent.name}</strong>
                      {agent.phone && (
                        <p>
                          <PhoneOutlined />{' '}
                          <a href={`tel:${agent.phone}`}>{agent.phone}</a>
                        </p>
                      )}
                      {agent.email && (
                        <p>
                          <MailOutlined />{' '}
                          <a href={`mailto:${agent.email}`}>{agent.email}</a>
                        </p>
                      )}
                    </Card>
                  </Col>
                )}
                {agency && (
                  <Col span={12}>
                    <Card title={<><BankOutlined /> Agency</>}>
                      <strong>{agency.name}</strong>
                      {agency.phone && (
                        <p>
                          <PhoneOutlined />{' '}
                          <a href={`tel:${agency.phone}`}>{agency.phone}</a>
                        </p>
                      )}
                    </Card>
                  </Col>
                )}
              </Row>
            </>
          )}

          {/* CTA */}
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Button
              type="primary"
              size="large"
              href={share_url}
              target="_blank"
              icon={<InfoCircleOutlined />}
            >
              View on PropertyFinder.ae
            </Button>
          </div>
        </>
      )}
    </Drawer>
  );
};

export default PropertyDetail;
