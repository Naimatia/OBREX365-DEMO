import React from 'react';
import { Card, Row, Col, Statistic, Typography, Tag, Divider, Space, Tooltip } from 'antd';
import { 
  HomeOutlined, 
  DollarOutlined, 
  EnvironmentOutlined, 
  FileSearchOutlined, 
  TagOutlined,
  FilterOutlined,
  ShopOutlined,
  BankOutlined,
  BuildOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const SearchStatistics = ({ meta, searchParams }) => {
  if (!meta) return null;

  const { 
    location_tree = [], 
    min_max_price = {}, 
    new_properties_count = 0, 
    page = 1, 
    page_count = 0, 
    per_page = 0, 
    total_count = 0 
  } = meta;

  // Format prices with commas
  const formattedMinPrice = min_max_price.min ? min_max_price.min.toLocaleString() : 'N/A';
  const formattedMaxPrice = min_max_price.max ? min_max_price.max.toLocaleString() : 'N/A';

  // Generate breadcrumb from location tree
  const locationPath = location_tree.map(location => location.name).join(' > ');
  
  // Helper function to convert property type ID to readable name
  const getPropertyTypeName = (typeId) => {
    const propertyTypeMap = {
      '1': 'Apartment',
      '2': 'Villa',
      '3': 'Townhouse',
      '4': 'Penthouse',
      '5': 'Compound',
      '6': 'Duplex',
      '7': 'Full Floor',
      '8': 'Whole Building',
      '9': 'Bulk Unit',
      '10': 'Bungalow',
      '11': 'Hotel Apartment',
      '12': 'Office',
      '13': 'Shop',
      '14': 'Warehouse'
    };
    return typeId ? propertyTypeMap[typeId] || `Type ${typeId}` : 'Any';
  };

  // Helper function to convert option ID to readable name
  const getOptionName = (optionId) => {
    const optionMap = {
      '1': 'Buy',
      '2': 'Rent',
      '3': 'Commercial Buy',
      '4': 'Commercial Rent',
      '5': 'Short Term'
    };
    return optionId ? optionMap[optionId] || `Option ${optionId}` : 'Any';
  };

  // Get formatted search parameters for display
  const propertyType = getPropertyTypeName(searchParams?.property_type);
  const bedrooms = searchParams?.number_of_bedrooms || 'Any';
  const option = getOptionName(searchParams?.option);
  const mainLocation = searchParams?.main_location_id 
    ? location_tree.find(loc => loc.level === 0)?.name || 'Any' 
    : 'Any';
  const sublocation = searchParams?.sub_location_id 
    ? location_tree.find(loc => loc.level === 1)?.name || 'Any' 
    : 'Any';

  return (
    <Card className="shadow-sm mb-4">
      <Title level={4} style={{ marginBottom: '16px' }}>Search Results Summary</Title>
      
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={24} sm={24} md={12}>
          <Card size="small" title="Search Filters" bordered={false} style={{ background: '#f9f9f9' }}>
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Tooltip title="Main Location">
                  <div style={{ marginBottom: '8px' }}>
                    <Text type="secondary"><EnvironmentOutlined /> Main Location:</Text>
                    <div><Text strong>{mainLocation}</Text></div>
                  </div>
                </Tooltip>
              </Col>
              <Col span={12}>
                <Tooltip title="Sublocation">
                  <div style={{ marginBottom: '8px' }}>
                    <Text type="secondary"><EnvironmentOutlined /> Sublocation:</Text>
                    <div><Text strong>{sublocation}</Text></div>
                  </div>
                </Tooltip>
              </Col>
              <Col span={12}>
                <Tooltip title="Property Type">
                  <div style={{ marginBottom: '8px' }}>
                    <Text type="secondary"><BuildOutlined /> Property Type:</Text>
                    <div><Text strong>{propertyType}</Text></div>
                  </div>
                </Tooltip>
              </Col>
              <Col span={12}>
                <Tooltip title="Bedrooms">
                  <div style={{ marginBottom: '8px' }}>
                    <Text type="secondary"><HomeOutlined /> Bedrooms:</Text>
                    <div><Text strong>{bedrooms}</Text></div>
                  </div>
                </Tooltip>
              </Col>
              <Col span={12}>
                <Tooltip title="Property Status">
                  <div style={{ marginBottom: '0px' }}>
                    <Text type="secondary"><ShopOutlined /> Status:</Text>
                    <div><Text strong>{option}</Text></div>
                  </div>
                </Tooltip>
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} sm={24} md={12}>
          <Card size="small" title="Location Details" bordered={false} style={{ background: '#f9f9f9' }}>
            <div style={{ marginBottom: '8px' }}>
              <Text type="secondary"><EnvironmentOutlined /> Full Location Path:</Text>
              <div><Text strong>{locationPath || 'All Areas'}</Text></div>
            </div>
            
            {location_tree.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <Space size={[0, 8]} wrap>
                  {location_tree.map((location, index) => (
                    <Tag 
                      key={index} 
                      color={location.level === 0 ? 'blue' : 'green'} 
                    >
                      {location.type}: {location.name}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}
          </Card>
        </Col>
      </Row>
      
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={12} sm={12} md={6} lg={6}>
          <Card bordered={false} size="small" style={{ background: '#e6f7ff' }}>
            <Statistic 
              title="Total Properties" 
              value={total_count} 
              prefix={<HomeOutlined />} 
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6} lg={6}>
          <Card bordered={false} size="small" style={{ background: '#f6ffed' }}>
            <Statistic 
              title="New Properties" 
              value={new_properties_count} 
              prefix={<TagOutlined />} 
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6} lg={6}>
          <Card bordered={false} size="small" style={{ background: '#fff7e6' }}>
            <Statistic 
              title="Min Price" 
              value={`AED ${formattedMinPrice}`} 
              prefix={<DollarOutlined />} 
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6} lg={6}>
          <Card bordered={false} size="small" style={{ background: '#fff1f0' }}>
            <Statistic 
              title="Max Price" 
              value={`AED ${formattedMaxPrice}`} 
              prefix={<DollarOutlined />} 
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>
      <Divider style={{ margin: '12px 0' }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text>
          <FileSearchOutlined /> Page {page} of {page_count || 1}
        </Text>
        <Text>
          Showing {Math.min(per_page, total_count)} of {total_count} properties
        </Text>
      </div>
    </Card>
  );
};

export default SearchStatistics;
