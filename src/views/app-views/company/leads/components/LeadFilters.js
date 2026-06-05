import React, { useState, useEffect } from 'react';
import { 
  Row, 
  Col, 
  Input, 
  Select, 
  Button, 
  Form, 
  Space, 
  Drawer,
  Grid
} from 'antd';
import { 
  SearchOutlined, 
  FilterOutlined, 
  ClearOutlined, 
  MenuOutlined 
} from '@ant-design/icons';
import { LeadStatus, LeadInterestLevel } from 'models/LeadModel';
import countries from 'constants/countries';

const { Search } = Input;
const { useBreakpoint } = Grid;

const LeadFilters = ({ 
  onSearch, 
  onFilter, 
  onClear, 
  sellers = [], 
  loading = false,
  filters = {}
}) => {
  const [form] = Form.useForm();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const screens = useBreakpoint();

  const isMobile = !screens.md; // Use Ant Design breakpoints for reliability

  // Sync external filters with form
  useEffect(() => {
    if (filters) {
      form.setFieldsValue(filters);
    }
  }, [filters, form]);

// Update the handleApplyFilters function in LeadFilters.js:

const handleApplyFilters = () => {
  const values = form.getFieldsValue();
  // Remove undefined or empty string values
  const cleanedValues = {};
  Object.keys(values).forEach(key => {
    if (values[key] && values[key] !== '') {
      cleanedValues[key] = values[key];
    }
  });
  onFilter(cleanedValues);
  setDrawerVisible(false);
};

const handleClearFilters = () => {
  form.resetFields();
  onClear();
  setDrawerVisible(false);
};

// Update the handleSearch function:
const handleSearch = (value) => {
  onSearch(value || '');
};

  const FilterFormContent = (
    <Form form={form} layout="vertical">
      <Row gutter={[16, 16]}>
        {/* Search */}
        <Col xs={24} md={8} lg={6}>
          <Form.Item name="search" label="Search">
            <Search
              placeholder="Name, email or phone"
              allowClear
              onSearch={handleSearch}
              loading={loading}
              disabled={loading}
            />
          </Form.Item>
        </Col>

        {/* Status */}
        <Col xs={24} md={8} lg={4}>
          <Form.Item name="status" label="Status">
            <Select placeholder="All Statuses" allowClear>
              {Object.values(LeadStatus).map(status => (
                <Select.Option key={status} value={status}>{status}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        {/* Interest Level */}
        <Col xs={24} md={8} lg={4}>
          <Form.Item name="InterestLevel" label="Interest">
            <Select placeholder="All Levels" allowClear>
              {Object.values(LeadInterestLevel).map(level => (
                <Select.Option key={level} value={level}>{level}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        {/* Region */}
        <Col xs={24} md={8} lg={4}>
          <Form.Item name="region" label="Region">
            <Select
              placeholder="All Regions"
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {countries.map(country => (
                <Select.Option key={country.code} value={country.name}>
                  {country.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        {/* Assigned Seller */}
        <Col xs={24} md={8} lg={4}>
          <Form.Item name="seller_id" label="Seller">
            <Select
              placeholder="All Sellers"
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {sellers.map(seller => (
                <Select.Option key={seller.id} value={seller.id}>
                  {seller.name || `${seller.firstname || ''} ${seller.lastname || ''}`.trim()}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        {/* Action Buttons */}
        <Col xs={24} md={24} lg={4} style={{ display: 'flex', alignItems: 'flex-end' }}>
          <Space>
            <Button
              type="primary"
              icon={<FilterOutlined />}
              onClick={handleApplyFilters}
              loading={loading}
            >
              Apply
            </Button>
            <Button
              danger
              icon={<ClearOutlined />}
              onClick={handleClearFilters}
            >
              Clear
            </Button>
          </Space>
        </Col>
      </Row>
    </Form>
  );

  return (
    <div className="lead-filters">
      {isMobile ? (
        // Mobile View
        <>
          <Row gutter={12} align="middle" style={{ marginBottom: 16 }}>
            <Col flex="auto">
              <Search
                placeholder="Search leads..."
                allowClear
                onSearch={handleSearch}
                loading={loading}
                size="large"
              />
            </Col>
            <Col>
              <Button
                icon={<MenuOutlined />}
                onClick={() => setDrawerVisible(true)}
                size="large"
              >
                Filters
              </Button>
            </Col>
          </Row>

          <Drawer
            title="Advanced Filters"
            placement="right"
            open={drawerVisible}
            onClose={() => setDrawerVisible(false)}
            width="85%"
            footer={
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Button onClick={handleClearFilters} danger>
                  Clear All
                </Button>
                <Button type="primary" onClick={handleApplyFilters} loading={loading}>
                  Apply Filters
                </Button>
              </Space>
            }
          >
            {FilterFormContent}
          </Drawer>
        </>
      ) : (
        // Desktop View
        FilterFormContent
      )}
    </div>
  );
};

export default LeadFilters;