import React from 'react';
import { Row, Col, Input, Select, Button, Form, Space, Drawer } from 'antd';
import { SearchOutlined, FilterOutlined, ClearOutlined, MenuOutlined } from '@ant-design/icons';
import { LeadStatus, LeadInterestLevel, LeadRedirectionSource } from 'models/LeadModel';
import countries from 'constants/countries';

const { Search } = Input;

const LeadFilters = ({ 
  onSearch, 
  onFilter, 
  onClear, 
  sellers = [], 
  loading,
  filters
}) => {
  const [form] = Form.useForm();
  const [drawerVisible, setDrawerVisible] = React.useState(false);

  const handleFilter = () => {
    const values = form.getFieldsValue();
    onFilter(values);
    setDrawerVisible(false); // Close drawer on mobile
  };

  const handleClear = () => {
    form.resetFields();
    onClear();
    setDrawerVisible(false);
  };

  React.useEffect(() => {
    if (filters) {
      form.setFieldsValue(filters);
    }
  }, [filters, form]);

  // Responsive: Show drawer on small screens
  const isMobile = window.innerWidth <= 768;
  const showDrawer = isMobile;

  const FilterContent = (
    <>
      <Row gutter={[16, 16]} align="bottom">
        <Col xs={24} sm={12} md={6} lg={5}>
          <Form.Item name="search" label="Search">
            <Search
              placeholder="Name, email, phone"
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={onSearch}
              loading={loading}
              disabled={loading}
            />
          </Form.Item>
        </Col>

        <Col xs={24} sm={12} md={4} lg={4}>
          <Form.Item name="status" label="Status">
            <Select placeholder="All statuses" allowClear>
              {Object.values(LeadStatus).map(status => (
                <Select.Option key={status} value={status}>{status}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        <Col xs={24} sm={12} md={4} lg={4}>
          <Form.Item name="InterestLevel" label="Interest">
            <Select placeholder="All levels" allowClear>
              {Object.values(LeadInterestLevel).map(level => (
                <Select.Option key={level} value={level}>{level}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        <Col xs={24} sm={12} md={4} lg={4}>
          <Form.Item name="region" label="Region">
            <Select
              placeholder="All regions"
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

        <Col xs={24} sm={12} md={4} lg={4}>
          <Form.Item name="seller_id" label="Seller">
            <Select
              placeholder="All sellers"
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {sellers.map(seller => (
                <Select.Option key={seller.id} value={seller.id}>
                  {seller.name || `${seller.firstname} ${seller.lastname}`}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        <Col xs={24} sm={12} md={4} lg={3}>
          <Form.Item label=" ">
            <Space>
              <Button
                type="primary"
                icon={<FilterOutlined />}
                onClick={handleFilter}
                loading={loading}
                size="middle"
              >
                Apply
              </Button>
              <Button
                danger
                icon={<ClearOutlined />}
                onClick={handleClear}
                size="middle"
              >
                Clear
              </Button>
            </Space>
          </Form.Item>
        </Col>
      </Row>
    </>
  );

  return (
    <Form form={form} layout="vertical" className="lead-filters-form mb-4">
      {showDrawer ? (
        <>
          <Row gutter={16} align="middle" className="mb-3">
            <Col flex="auto">
              <Search
                placeholder="Search leads..."
                allowClear
                enterButton={<SearchOutlined />}
                onSearch={onSearch}
                loading={loading}
                size="large"
              />
            </Col>
            <Col>
              <Button
                icon={<MenuOutlined />}
                onClick={() => setDrawerVisible(true)}
                size="large"
              />
            </Col>
          </Row>

          <Drawer
            title="Filter Leads"
            placement="right"
            open={drawerVisible}
            onClose={() => setDrawerVisible(false)}
            width="90%"
            footer={
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Button onClick={handleClear} danger>
                  Clear All
                </Button>
                <Button type="primary" onClick={handleFilter} loading={loading}>
                  Apply Filters
                </Button>
              </Space>
            }
          >
            {FilterContent}
          </Drawer>
        </>
      ) : (
        FilterContent
      )}
    </Form>
  );
};

export default LeadFilters;