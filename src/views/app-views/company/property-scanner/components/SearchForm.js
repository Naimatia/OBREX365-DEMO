import React, { useState } from 'react';
import { Form, Input, Select, Button, Row, Col, Card, Typography, message } from 'antd';
import { SearchOutlined, HomeOutlined, DollarOutlined, CompassOutlined, BuildOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Title } = Typography;

const mainLocations = [
  { label: 'Dubai', value: 'dubai' },
  { label: 'Abu Dhabi', value: 'abu-dhabi' },
  { label: 'Sharjah', value: 'sharjah' },
  { label: 'Ras Al Khaimah', value: 'ras-al-khaimah' },
  // { label: 'Ajman', value: 'ajman' }, etc.
];

const propertyTypes = [
  { label: 'Any', value: '' },
  { label: 'Apartment', value: 'apartment' },
  { label: 'Villa', value: 'villa' },
  { label: 'Townhouse', value: 'townhouse' },
  { label: 'Penthouse', value: 'penthouse' },
];

const priceRanges = [
  { label: 'Any Price', value: '' },
  { label: 'Under 500K AED', value: '0-500000' },
  { label: '500K – 1M AED', value: '500000-1000000' },
  { label: '1M – 2M AED', value: '1000000-2000000' },
  { label: '2M – 5M AED', value: '2000000-5000000' },
  { label: '5M+ AED', value: '5000000-' },
];

const SearchForm = ({ onSearch, loading: parentLoading }) => {
  const [form] = Form.useForm();

  const handleSubmit = (values) => {
    const searchParams = {
      locationSlug: values.main_location || 'dubai',
      propertyType: values.property_type || '',
      bedrooms: values.bedrooms || undefined,
      priceRange: values.price_range || '',
      maxPages: values.maxPages || 3,
    };

    onSearch(searchParams); // ← pass full filters to parent → backend
  };

  return (
    <Card className="shadow-sm mb-4">
      <Title level={4} className="mb-4">Property Scanner – PropertyFinder.ae</Title>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          main_location: 'dubai',
          property_type: '',
          bedrooms: undefined,
          price_range: '',
          maxPages: 1,
        }}
      >
        <Row gutter={[16, 16]}>
  

          <Col xs={24} sm={12} md={6} lg={4}>
            <Form.Item name="maxPages" label="Max Pages to Scan">
              <Select>
                {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                  <Option key={n} value={n}>
                    {n} page{n > 1 ? 's' : ''}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Form.Item style={{ width: '100%', marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SearchOutlined />}
                loading={parentLoading}
                block
                size="large"
              >
                Start Scanning
              </Button>
            </Form.Item>
          </Col>
        </Row>

        <div style={{ marginTop: 12, color: '#888', fontSize: 12 }}>
          Note: Respect PropertyFinder.ae ToS. Use responsibly, low volume only.
        </div>
      </Form>
    </Card>
  );
};

export default SearchForm;