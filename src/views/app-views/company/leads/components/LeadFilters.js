import React from 'react';
import { Row, Col, Input, Select, Button, Form, Space } from 'antd';
import { SearchOutlined, FilterOutlined, ClearOutlined } from '@ant-design/icons';
import { LeadStatus, LeadInterestLevel, LeadRedirectionSource } from 'models/LeadModel';
import countries from 'constants/countries';

const { Search } = Input;

/**
 * Component for filtering leads
 */
const LeadFilters = ({ 
  onSearch, 
  onFilter, 
  onClear, 
  sellers = [], 
  loading,
  filters
}) => {
  const [form] = Form.useForm();
  
  const handleFilter = () => {
    const values = form.getFieldsValue();
    onFilter(values);
  };
  
  const handleClear = () => {
    form.resetFields();
    onClear();
  };
  
  // Pre-fill form with current filters
  React.useEffect(() => {
    if (filters) {
      form.setFieldsValue(filters);
    }
  }, [filters, form]);

  return (
    <Form
      form={form}
      layout="vertical"
      className="lead-filters-form mb-4"
    >
      <Row gutter={[16, 16]} align="bottom">
        <Col xs={24} sm={12} md={6} lg={5}>
          <Form.Item name="search" label="Search">
            <Search
              placeholder="Search by name, email or phone"
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={value => onSearch(value)}
              loading={loading}
            />
          </Form.Item>
        </Col>
        
        <Col xs={24} sm={12} md={4} lg={4}>
          <Form.Item name="status" label="Status">
            <Select
              placeholder="Filter by status"
              allowClear
              style={{ width: '100%' }}
            >
              {Object.values(LeadStatus).map(status => (
                <Select.Option key={status} value={status}>
                  {status}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        
        <Col xs={24} sm={12} md={4} lg={4}>
          <Form.Item name="InterestLevel" label="Interest Level">
            <Select
              placeholder="Filter by interest"
              allowClear
              style={{ width: '100%' }}
            >
              {Object.values(LeadInterestLevel).map(level => (
                <Select.Option key={level} value={level}>
                  {level}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        
        <Col xs={24} sm={12} md={4} lg={4}>
          <Form.Item name="region" label="Region">
            <Select
              placeholder="Filter by region"
              allowClear
              showSearch
              optionFilterProp="children"
              style={{ width: '100%' }}
            >
              {countries.map(country => (
                <Select.Option key={country.code} value={country.name}>
                  {country.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        
        <Col xs={24} sm={12} md={4} lg={4}>
          <Form.Item name="seller_id" label="Assigned To">
            <Select
              placeholder="Filter by seller"
              allowClear
              showSearch
              optionFilterProp="children"
              style={{ width: '100%' }}
            >
              {sellers.map(seller => (
                <Select.Option key={seller.id} value={seller.id}>
                  {seller.firstname} {seller.lastname}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        
        <Col xs={24} sm={12} md={4} lg={3} className="lead-filter-buttons">
          <Form.Item label=" " className="filter-actions-item">
            <div className="d-flex">
              <Button 
                type="primary" 
                icon={<FilterOutlined />}
                onClick={handleFilter}
                loading={loading}
                style={{ marginRight: 8 }}
              >
                Filter
              </Button>
              <Button 
                danger
                icon={<ClearOutlined />}
                onClick={handleClear}
              >
                Clear
              </Button>
            </div>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
};

export default LeadFilters;
