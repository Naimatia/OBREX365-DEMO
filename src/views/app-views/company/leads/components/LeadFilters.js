// components/LeadFilters.js
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
  Grid,
  Divider,
  Typography,
  Badge,
  Card,
  Tag
} from 'antd';
import { 
  SearchOutlined, 
  FilterOutlined, 
  ClearOutlined, 
  MenuOutlined,
  UserOutlined,
  UserAddOutlined,
  ClockCircleOutlined,
  TagOutlined,
  GlobalOutlined,
  ReloadOutlined,
  PlusOutlined,
  MinusOutlined,
  UserDeleteOutlined // Add this icon
} from '@ant-design/icons';
import { LeadStatus, LeadInterestLevel } from 'models/LeadModel';
import countries from 'constants/countries';

const { Search } = Input;
const { useBreakpoint } = Grid;
const { Text } = Typography;

const LeadFilters = ({ 
  onSearch, 
  onFilter, 
  onClear, 
  sellers = [], 
  loading = false,
  filters = {},
  isAdminView = false,
  dateRange,
  onDateRangeChange
}) => {
  const [form] = Form.useForm();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);
  const screens = useBreakpoint();

  const isMobile = !screens.md;

  // Sync external filters with form
  useEffect(() => {
    if (filters) {
      form.setFieldsValue(filters);
      // Count active filters
      const count = Object.keys(filters).filter(key => 
        filters[key] && filters[key] !== '' && filters[key] !== null && filters[key] !== undefined
      ).length;
      setActiveFilterCount(count);
    }
  }, [filters, form]);

  const handleApplyFilters = () => {
    const values = form.getFieldsValue();
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
    setActiveFilterCount(0);
  };

  const handleSearch = (value) => {
    onSearch(value || '');
  };

  const FilterFormContent = (
    <Form form={form} layout="vertical">
      {/* Search Row - Full Width */}
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Form.Item name="search" label={
            <span style={{ fontWeight: 600, fontSize: 13 }}>
              <SearchOutlined style={{ marginRight: 6, color: '#1677ff' }} />
              Search
            </span>
          }>
            <Search
              placeholder="Search by name, email or phone..."
              allowClear
              onSearch={handleSearch}
              loading={loading}
              disabled={loading}
              size="middle"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
        </Col>
      </Row>

      <Divider style={{ margin: '8px 0 16px' }} />

      {/* Filter Grid */}
      <Row gutter={[16, 16]}>
        {/* Status */}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Form.Item name="status" label={
            <span style={{ fontWeight: 600, fontSize: 13 }}>
              <TagOutlined style={{ marginRight: 6, color: '#faad14' }} />
              Status
            </span>
          }>
            <Select 
              placeholder="All Statuses" 
              allowClear
              size="middle"
              style={{ borderRadius: 8 }}
              suffixIcon={<FilterOutlined style={{ color: '#bbb' }} />}
            >
              {Object.values(LeadStatus).map(status => (
                <Select.Option key={status} value={status}>
                  <Tag color={getStatusColor(status)} style={{ margin: 0, borderRadius: 12, fontSize: 11 }}>
                    {status}
                  </Tag>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        {/* Interest Level */}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Form.Item name="InterestLevel" label={
            <span style={{ fontWeight: 600, fontSize: 13 }}>
              <ClockCircleOutlined style={{ marginRight: 6, color: '#52c41a' }} />
              Interest
            </span>
          }>
            <Select 
              placeholder="All Levels" 
              allowClear
              size="middle"
              style={{ borderRadius: 8 }}
              suffixIcon={<FilterOutlined style={{ color: '#bbb' }} />}
            >
              {Object.values(LeadInterestLevel).map(level => (
                <Select.Option key={level} value={level}>
                  <Tag color={getInterestColor(level)} style={{ margin: 0, borderRadius: 12, fontSize: 11 }}>
                    {level}
                  </Tag>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        {/* Region */}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Form.Item name="region" label={
            <span style={{ fontWeight: 600, fontSize: 13 }}>
              <GlobalOutlined style={{ marginRight: 6, color: '#13c2c2' }} />
              Region
            </span>
          }>
            <Select
              placeholder="All Regions"
              allowClear
              showSearch
              optionFilterProp="children"
              size="middle"
              style={{ borderRadius: 8 }}
              suffixIcon={<FilterOutlined style={{ color: '#bbb' }} />}
            >
              {countries.map(country => (
                <Select.Option key={country.code} value={country.name}>
                  {country.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        {/* Created By - Only for Admin View */}
        {isAdminView && (
          <Col xs={24} sm={12} md={8} lg={4}>
            <Form.Item name="createdBy" label={
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                <UserOutlined style={{ marginRight: 6, color: '#722ed1' }} />
                Created By
              </span>
            }>
              <Select
                placeholder="All Creators"
                allowClear
                showSearch
                optionFilterProp="children"
                size="middle"
                style={{ borderRadius: 8 }}
                suffixIcon={<UserOutlined style={{ color: '#bbb' }} />}
              >
                {sellers.map(seller => (
                  <Select.Option key={seller.id} value={seller.id}>
                    <UserOutlined style={{ marginRight: 4, color: '#722ed1' }} />
                    {seller.name || `${seller.firstName || ''} ${seller.lastName || ''}`.trim()}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        )}

    {/* Assigned To - Updated with Unsigned option */}
<Col xs={24} sm={12} md={8} lg={4}>
  <Form.Item name="assignedTo" label={
    <span style={{ fontWeight: 600, fontSize: 13 }}>
      <UserAddOutlined style={{ marginRight: 6, color: '#1677ff' }} />
      Assigned To
    </span>
  }>
    <Select
      placeholder="All Sellers"
      allowClear
      showSearch
      optionFilterProp="children"
      size="middle"
      style={{ borderRadius: 8 }}
      suffixIcon={<UserAddOutlined style={{ color: '#bbb' }} />}
      dropdownRender={(menu) => (
        <div>
          {/* Custom Unsigned option at the top */}
          <div 
            style={{ 
              padding: '8px 12px', 
              cursor: 'pointer',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            onClick={() => {
              const select = document.querySelector('.ant-select-selection-search-input');
              if (select) {
                // Trigger select change
                const event = new Event('mousedown', { bubbles: true });
                select.dispatchEvent(event);
              }
              // Set value to 'unsigned'
              form.setFieldsValue({ assignedTo: 'unsigned' });
              // Manually trigger onFilter after a small delay
              setTimeout(() => {
                const values = form.getFieldsValue();
                const cleanedValues = {};
                Object.keys(values).forEach(key => {
                  if (values[key] && values[key] !== '') {
                    cleanedValues[key] = values[key];
                  }
                });
                onFilter(cleanedValues);
              }, 100);
            }}
          >
            <UserDeleteOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
            <span style={{ color: '#ff4d4f', fontWeight: 600 }}>Unsigned</span>
            <Tag color="red" style={{ marginLeft: 'auto', fontSize: 10, borderRadius: 10 }}>
              No Seller Assigned
            </Tag>
          </div>
          {menu}
        </div>
      )}
    >
      {/* Regular seller options */}
      {sellers.map(seller => (
        <Select.Option key={seller.id} value={seller.id}>
          <UserAddOutlined style={{ marginRight: 4, color: '#1677ff' }} />
          {seller.name || `${seller.firstName || ''} ${seller.lastName || ''}`.trim()}
        </Select.Option>
      ))}
    </Select>
  </Form.Item>
</Col>

      
      </Row>

<Row>
    {/* Action Buttons */}
        <Col xs={24} sm={24} md={24} lg={4} style={{ display: 'flex', alignItems: 'flex-end' }}>
          <Space style={{ width: '100%' }} size={8}>
            <Button
              type="primary"
              icon={<FilterOutlined />}
              onClick={handleApplyFilters}
              loading={loading}
              style={{ 
                flex: 1,
                borderRadius: 8,
                height: 40,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #1677ff, #4096ff)',
                border: 'none'
              }}
            >
              Apply Filters
              {activeFilterCount > 0 && (
                <Badge 
                  count={activeFilterCount} 
                  style={{ 
                    marginLeft: 6, 
                    backgroundColor: '#fff', 
                    color: '#1677ff',
                    fontSize: 11,
                    fontWeight: 700
                  }} 
                />
              )}
            </Button>
            <Button
              danger
              icon={<ClearOutlined />}
              onClick={handleClearFilters}
              style={{ borderRadius: 8, height: 40 }}
            >
              Clear
            </Button>
          </Space>
        </Col>
</Row>
      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div style={{ marginTop: 16, padding: '8px 12px', background: '#f5f6fa', borderRadius: 8 }}>
          <Space size={4} wrap>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
              Active Filters:
            </Text>
            {Object.entries(form.getFieldsValue()).map(([key, value]) => {
              if (value && value !== '' && key !== 'search') {
                const label = getFilterLabel(key);
                const displayValue = getFilterDisplayValue(key, value, sellers);
                return (
                  <Tag 
                    key={key} 
                    closable 
                    onClose={() => {
                      form.setFieldsValue({ [key]: undefined });
                      handleApplyFilters();
                    }}
                    style={{ 
                      borderRadius: 12, 
                      fontSize: 11,
                      padding: '2px 10px',
                      background: '#fff',
                      border: '1px solid #d9d9d9'
                    }}
                  >
                    {label}: {displayValue}
                  </Tag>
                );
              }
              return null;
            })}
          </Space>
        </div>
      )}


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
                style={{ borderRadius: 10 }}
              />
            </Col>
            <Col>
              <Badge count={activeFilterCount} offset={[-4, 4]}>
                <Button
                  icon={<MenuOutlined />}
                  onClick={() => setDrawerVisible(true)}
                  size="large"
                  style={{ borderRadius: 10 }}
                >
                  Filters
                </Button>
              </Badge>
            </Col>
          </Row>

          <Drawer
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>
                  <FilterOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                  Advanced Filters
                </span>
                {activeFilterCount > 0 && (
                  <Badge 
                    count={activeFilterCount} 
                    style={{ backgroundColor: '#1677ff' }} 
                  />
                )}
              </div>
            }
            placement="right"
            open={drawerVisible}
            onClose={() => setDrawerVisible(false)}
            width="85%"
            footer={
              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                <Button 
                  onClick={handleClearFilters} 
                  danger 
                  style={{ flex: 1, borderRadius: 8, height: 44 }}
                  icon={<ClearOutlined />}
                >
                  Clear All
                </Button>
                <Button 
                  type="primary" 
                  onClick={handleApplyFilters} 
                  loading={loading}
                  style={{ flex: 2, borderRadius: 8, height: 44 }}
                  icon={<FilterOutlined />}
                >
                  Apply Filters
                  {activeFilterCount > 0 && ` (${activeFilterCount})`}
                </Button>
              </div>
            }
            bodyStyle={{ padding: '16px 20px' }}
          >
            {FilterFormContent}
          </Drawer>
        </>
      ) : (
        // Desktop View
        <Card 
          size="small"
          style={{ 
            borderRadius: 12, 
            border: '1px solid #f0f0f0',
            background: '#fafbfc'
          }}
          bodyStyle={{ padding: '16px 20px' }}
        >
          {FilterFormContent}
        </Card>
      )}
    </div>
  );
};

// Helper functions for filter labels and display values
const getStatusColor = (status) => {
  const colors = {
    [LeadStatus.NEW]: 'blue',
    [LeadStatus.CONTACTED]: 'orange',
    [LeadStatus.INTERESTED]: 'green',
    [LeadStatus.NOT_INTERESTED]: 'red',
    [LeadStatus.CONVERTED]: 'purple',
    [LeadStatus.JUNK_LEAD]: 'gray',
  };
  return colors[status] || 'default';
};

const getInterestColor = (level) => {
  const colors = {
    [LeadInterestLevel.LOW]: 'orange',
    [LeadInterestLevel.MEDIUM]: 'blue',
    [LeadInterestLevel.HIGH]: 'green',
  };
  return colors[level] || 'default';
};

const getFilterLabel = (key) => {
  const labels = {
    search: 'Search',
    status: 'Status',
    InterestLevel: 'Interest',
    region: 'Region',
    createdBy: 'Created By',
    assignedTo: 'Assigned To'
  };
  return labels[key] || key;
};

const getFilterDisplayValue = (key, value, sellers) => {
  if (key === 'createdBy') {
    const seller = sellers.find(s => s.id === value);
    return seller ? seller.name : value;
  }
  if (key === 'assignedTo') {
    if (value === 'unsigned') {
      return 'Unsigned';
    }
    const seller = sellers.find(s => s.id === value);
    return seller ? seller.name : value;
  }
  if (key === 'status' || key === 'InterestLevel' || key === 'region') {
    return value;
  }
  return value;
};

export default LeadFilters;