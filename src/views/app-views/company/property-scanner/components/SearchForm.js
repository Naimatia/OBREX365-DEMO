import React from 'react';
import { Form, Select, Button, Row, Col, Card, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';

const { Option } = Select;
const { Title } = Typography;

// Real PropertyFinder location IDs
const mainLocations = [
   // Emirates
  { label: 'Dubai (All)', value: '1' },
  { label: 'Abu Dhabi', value: '3' },
  { label: 'Sharjah', value: '4' },
  { label: 'Ras Al Khaimah', value: '5' },
  { label: 'Ajman', value: '6' },
  { label: 'Umm Al Quwain', value: '7' },
  { label: 'Fujairah', value: '8' },

  // Dubai areas – REAL l= IDs from PropertyFinder
  { label: 'Downtown Dubai', value: '41' },
  { label: 'Dubai Marina', value: '14' },
  { label: 'Dubai Land', value: '115' },
  { label: 'Dubai Creek Harbour', value: '1130' },
  { label: 'Mohammed Bin Rashid City (MBR City)', value: '1129' },
  { label: 'Dubai Hills Estate', value: '1131' },
  { label: 'Business Bay', value: '15' },
  { label: 'Palm Jumeirah', value: '13' },
  { label: 'Jumeirah Village Circle (JVC)', value: '90' },
  { label: 'Jumeirah Beach Residence (JBR)', value: '16' },
  { label: 'Jumeirah Lake Towers (JLT)', value: '17' },
  { label: 'Jumeirah Islands', value: '92' },
  { label: 'Jumeirah Park', value: '91' },
  { label: 'International City', value: '18' },
  { label: 'Al Furjan', value: '93' },
  { label: 'Al Jaddaf', value: '94' },
  { label: 'Dubai South', value: '95' },
  { label: 'Jebel Ali', value: '19' },
  { label: 'Arabian Ranches', value: '20' },
  { label: 'Al Barari', value: '96' },
  { label: 'Damac Hills', value: '97' },
  { label: 'Tilal Al Ghaf', value: '1132' },
  { label: 'Emirates Living', value: '98' },

];

const transactionTypes = [
  { label: 'Apartment',     value: '1'  },
  { label: 'Villa',         value: '35'  },
  { label: 'Townhouse',     value: '22'  },
  { label: 'Penthouse',     value: '20'  },
  { label: 'Duplex',        value: '24' },   // Seen in some links as subtype, but can appear as category
  { label: 'Hotel Apartment', value: '45' }, // Common in UAE listings
  { label: 'Whole Building',  value: '10' },
  { label: 'Land',          value: '5'  },   // Plots / land
  { label: 'Office',        value: '4'  },
  { label: 'Retail / Shop', value: '21' },   // Shops / stores
  { label: 'Warehouse',     value: '13' },
];

const propertyTypes = [
    { label: 'Any', value: '' },
  { label: 'Rent', value: '1' },
  { label: 'Sale', value: '2' },
  { label: 'New projects', value: '3' },
  { label: 'Commercial', value: '4' },
];

const bedroomsOptions = [
  { label: 'Any', value: '' },
  { label: 'Studio', value: '0' },
  { label: '1 Bedroom', value: '1' },
  { label: '2 Bedrooms', value: '2' },
  { label: '3 Bedrooms', value: '3' },
  { label: '4 Bedrooms', value: '4' },
  { label: '5+ Bedrooms', value: '5+' },
];

const SearchForm = ({ onSearch, loading }) => {
  const [form] = Form.useForm();

  const handleFinish = (values) => {
    onSearch(values);
  };

  return (
    <Card className="shadow-sm mb-4">
      <Title level={4} className="mb-4">
        <SearchOutlined /> Property Scanner – UAE
      </Title>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{
          location: '1',
          transactionType: '1', // rent by default
          property_type: '',
          bedrooms: '',
          maxPages: 3,
        }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="location" label="Location">
              <Select showSearch placeholder="Select location" optionFilterProp="label">
                {mainLocations.map((loc) => (
                  <Option key={loc.value} value={loc.value} label={loc.label}>
                    {loc.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Form.Item name="transactionType" label="Type">
              <Select placeholder="Any Type" allowClear>
                {transactionTypes.map((t) => (
                  <Option key={t.value} value={t.value}>
                    {t.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Form.Item name="property_type" label="Property Type">
              <Select placeholder="Any Type" allowClear>
                {propertyTypes.map((t) => (
                  <Option key={t.value} value={t.value}>
                    {t.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Form.Item name="bedrooms" label="Bedrooms">
              <Select placeholder="Any" allowClear>
                {bedroomsOptions.map((b) => (
                  <Option key={b.value} value={b.value}>
                    {b.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Form.Item name="maxPages" label="Max Pages to Scan">
              <Select>
                {[1, 2, 3, 4, 5, 6, 8, 10, 15].map((n) => (
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
                loading={loading}
                block
                size="large"
              >
                Start Scanning
              </Button>
            </Form.Item>
          </Col>
        </Row>

        <div style={{ marginTop: 12, color: '#888', fontSize: 12 }}>
          Note: More pages = longer wait + higher risk of blocking. Use responsibly.
        </div>
      </Form>
    </Card>
  );
};

SearchForm.propTypes = {
  onSearch: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
};

export default SearchForm;