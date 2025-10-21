import React, { useState } from 'react';
import { Form, Select, Button, Row, Col, Card, Typography, Spin, message } from 'antd';
import { SearchOutlined, HomeOutlined, CompassOutlined, BankOutlined, BuildOutlined, DollarOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;
const { Title } = Typography;

const SearchForm = ({ onSearch, loading }) => {
  const [form] = Form.useForm();
  const [fetchingSublocations, setFetchingSublocations] = useState(false);
  const [sublocations, setSublocations] = useState([]);
  const API_KEY = '880ad61b47msh81af58585b3a6e2p17a770jsnab8d05748843';

  const mainLocations = {
    Ajman: '5',
    'Umm Al Quwain': '2',
    'Al Ain': '8',
    'Abu Dhabi': '3',
    Fujairah: '7',
    'Ras Al Khaimah': '3',
    Dubai: '1',
    Sharjah: '4',
  };

  const options = {
    Rent: '2',
    Buy: '1',
    'Commercial rent': '4',
    'Commercial buy': '3',
    'New Projects': '5',
  };

  const propertyTypes = {
    Apartment: 'apartments',
    Villa: 'villas',
    Townhouse: 'townhouses',
    Penthouse: 'penthouses',
    Compound: 'compounds',
    Duplex: 'duplexes',
    'Full Floor': 'full-floors',
    'Half Floor': 'half-floors',
    'Whole Building': 'whole-buildings',
    Land: 'lands',
    'Bulk Sale Unit': 'bulk-sale-units',
    Bungalow: 'bungalows',
    'Hotel & Hotel Apartment': 'hotels-and-hotel-apartments',
  };

  const bedroomOptions = [1, 2, 3, 4, 5, 6];

  // Define price range options (in AED)
  const priceOptions = [
    0, 50000, 100000, 150000, 200000, 250000, 300000, 400000, 500000,
    750000, 1000000, 1500000, 2000000, 3000000, 5000000, 10000000
  ];

  const handleMainLocationChange = async (value) => {
    form.setFieldsValue({ sub_location: undefined });
    setSublocations([]);
    if (!value || !API_KEY) {
      if (!API_KEY) message.error('API key not configured.');
      return;
    }

    setFetchingSublocations(true);
    try {
      console.log(`Fetching sublocations for ${value}...`);
      const response = await axios.get(
        `https://bayut-api1.p.rapidapi.com/locations_search?query=${encodeURIComponent(value)}`,
        {
          headers: {
            'x-rapidapi-key': API_KEY,
            'x-rapidapi-host': 'bayut-api1.p.rapidapi.com',
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const locationsData = response.data?.results || [];
      console.log("Raw locations:", locationsData);

      const mainLoc = locationsData.find(
        (loc) => loc.name.toLowerCase() === value.toLowerCase() && loc.level === 'city'
      );

      const relatedSublocations = locationsData
        .filter(
          (loc) =>
            loc.name !== value &&
            (loc.level === 'community' || loc.level === 'sub_community' || loc.level === 'cluster') &&
            loc.full.city.id === (mainLoc ? mainLoc.id : mainLocations[value])
        )
        .map((loc) => ({
          id: loc.id,
          name: loc.name,
          level: loc.level,
        }))
        .filter((loc, index, self) => 
          index === self.findIndex((l) => l.id === loc.id)
        )
        .sort((a, b) => a.name.localeCompare(b.name));

      if (relatedSublocations.length > 0) {
        setSublocations(relatedSublocations);
        console.log(`Found ${relatedSublocations.length} sublocations for ${value}`);
        message.success(`Found ${relatedSublocations.length} sublocations for ${value}`);
      } else {
        message.warning(`No sublocations found for ${value}.`);
      }
    } catch (error) {
      console.error('Failed to fetch sublocations:', error);
      message.error(
        error.response?.status === 429
          ? 'API rate limit exceeded.'
          : error.response?.status === 401
          ? 'Invalid API key.'
          : `Failed to load sublocations: ${error.message}`
      );
    } finally {
      setFetchingSublocations(false);
    }
  };

  const handleSubmit = async (values) => {
    if (!API_KEY) {
      message.error('API key not configured.');
      return;
    }

    const searchParams = {
      purpose: values.option.toLowerCase().includes('buy') ? 'for-sale' : 'for-rent',
      locations_ids: values.sub_location ? [parseInt(values.sub_location)] : [],
      category: [values.property_type.toLowerCase()],
      rooms: values.number_of_bedrooms ? [values.number_of_bedrooms] : [],
      price_min: values.price_min || undefined,
      price_max: values.price_max || undefined,
      page: 0,
      langs: 'ar',
      index: 'popular',
      is_completed: false,
      main_location: values.main_location,
      sub_location: sublocations.find(loc => loc.id === parseInt(values.sub_location))?.name || '',
      property_type: values.property_type,
    };

    try {
      const response = await axios.post(
        'https://bayut-api1.p.rapidapi.com/properties_search',
        searchParams,
        {
          headers: {
            'x-rapidapi-key': API_KEY,
            'x-rapidapi-host': 'bayut-api1.p.rapidapi.com',
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const results = response.data?.results || [];
      onSearch({ results, meta: response.data?.meta || {}, searchParams });
      message.success(`Found ${results.length} properties.`);
    } catch (error) {
      console.error('Failed to fetch properties:', error);
      message.error(
        error.response?.status === 429
          ? 'API rate limit exceeded.'
          : error.response?.status === 401
          ? 'Invalid API key.'
          : `Failed to fetch properties: ${error.message}`
      );
      onSearch({ results: [], meta: {}, searchParams });
    }
  };

  return (
    <Card className="shadow-sm mb-4">
      <Title level={4} className="mb-4">Property Search Settings</Title>
      <Form
        form={form}
        name="propertySearch"
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          main_location: undefined,
          option: 'Buy',
          property_type: 'Apartment',
          number_of_bedrooms: 2,
          sub_location: undefined,
          price_min: undefined,
          price_max: undefined,
        }}
      >
        <Row gutter={16}>
          <Col xs={24} sm={12} md={6} lg={4}>
            <Form.Item
              name="main_location"
              label="Main Location"
              rules={[{ required: true, message: 'Please select a location!' }]}
            >
              <Select
                placeholder="Select location first"
                onChange={handleMainLocationChange}
                suffixIcon={<CompassOutlined />}
                showSearch
                filterOption={(input, option) =>
                  option?.children?.toString().toLowerCase().includes(input.toLowerCase())
                }
              >
                {Object.entries(mainLocations).map(([location, id]) => (
                  <Option key={id} value={location}>
                    {location}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={6} lg={4}>
            <Form.Item
              name="option"
              label="Status"
              rules={[{ required: true, message: 'Please select an option!' }]}
            >
              <Select placeholder="Select an option" suffixIcon={<BankOutlined />}>
                {Object.entries(options).map(([option, id]) => (
                  <Option key={id} value={option}>
                    {option}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={6} lg={4}>
            <Form.Item
              name="property_type"
              label="Property Type"
              rules={[{ required: true, message: 'Please select a property type!' }]}
            >
              <Select placeholder="Select a property type" suffixIcon={<HomeOutlined />}>
                {Object.entries(propertyTypes).map(([type, id]) => (
                  <Option key={id} value={type}>
                    {type}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={6} lg={4}>
            <Form.Item
              name="number_of_bedrooms"
              label="Bedrooms"
              rules={[{ required: true, message: 'Please select number of bedrooms!' }]}
            >
              <Select placeholder="Select bedrooms" suffixIcon={<BuildOutlined />}>
                {bedroomOptions.map((option) => (
                  <Option key={option} value={option}>
                    {option}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={6} lg={4}>
            <Form.Item
              name="sub_location"
              label="Sub Location"
              rules={[{ required: true, message: 'Please select a sub location!' }]}
            >
              <Select
                placeholder={fetchingSublocations ? 'Loading...' : 'Select a sub location'}
                loading={fetchingSublocations}
                disabled={fetchingSublocations || sublocations.length === 0}
                notFoundContent={fetchingSublocations ? <Spin size="small" /> : 'No sublocations found'}
                suffixIcon={<CompassOutlined />}
                showSearch
                filterOption={(input, option) =>
                  option?.children?.toString().toLowerCase().includes(input.toLowerCase())
                }
              >
                {sublocations.map((location) => (
                  <Option key={`${location.id}-${location.name}`} value={location.id}>
                    {location.name} ({location.level})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={6} lg={4}>
            <Form.Item
              name="price_min"
              label="Min Price (AED)"
              rules={[
                { required: false },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || !getFieldValue('price_max') || value <= getFieldValue('price_max')) {
                      return Promise.resolve();
                    }
                    return Promise.reject('Min price must be less than or equal to max price');
                  },
                }),
              ]}
            >
              <Select placeholder="Select min price" suffixIcon={<DollarOutlined />}>
                {priceOptions.map((price) => (
                  <Option key={price} value={price}>
                    {price.toLocaleString('en-AE', { style: 'currency', currency: 'AED' })}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={6} lg={4}>
            <Form.Item
              name="price_max"
              label="Max Price (AED)"
              rules={[
                { required: false },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || !getFieldValue('price_min') || value >= getFieldValue('price_min')) {
                      return Promise.resolve();
                    }
                    return Promise.reject('Max price must be greater than or equal to min price');
                  },
                }),
              ]}
            >
              <Select placeholder="Select max price" suffixIcon={<DollarOutlined />}>
                {priceOptions.map((price) => (
                  <Option key={price} value={price}>
                    {price.toLocaleString('en-AE', { style: 'currency', currency: 'AED' })}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={6} lg={4} className="d-flex align-items-end">
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SearchOutlined />}
                loading={loading}
                block
              >
                Start Scan
              </Button>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Card>
  );
};

export default SearchForm;