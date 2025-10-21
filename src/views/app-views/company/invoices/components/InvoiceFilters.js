import React, { useState, useEffect } from 'react';
import { Card, Form, Row, Col, Input, Select, DatePicker, Button, Space } from 'antd';
import { SearchOutlined, FilterOutlined, ClearOutlined } from '@ant-design/icons';
import { InvoiceStatus } from 'models/InvoiceModel';
import UserService from 'services/firebase/UserService';

const { Option } = Select;
const { RangePicker } = DatePicker;

/**
 * Component for filtering invoices
 */
const InvoiceFilters = ({ onFilter, companyId, loading }) => {
  const [form] = Form.useForm();
  const [users, setUsers] = useState([]);
  const [years, setYears] = useState([]);
  const [months] = useState([
    { value: 0, label: 'January' },
    { value: 1, label: 'February' },
    { value: 2, label: 'March' },
    { value: 3, label: 'April' },
    { value: 4, label: 'May' },
    { value: 5, label: 'June' },
    { value: 6, label: 'July' },
    { value: 7, label: 'August' },
    { value: 8, label: 'September' },
    { value: 9, label: 'October' },
    { value: 10, label: 'November' },
    { value: 11, label: 'December' }
  ]);

  // Generate years from current year down to 5 years ago
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const yearsList = [];
    for (let i = 0; i < 6; i++) {
      yearsList.push(currentYear - i);
    }
    setYears(yearsList);
  }, []);

  // Fetch users for the company
  useEffect(() => {
    const fetchUsers = async () => {
      if (companyId) {
        try {
          const allUsers = await UserService.getUsersByCompany(companyId);
          setUsers(allUsers);
        } catch (error) {
          console.error('Error fetching users:', error);
          setUsers([]);
        }
      }
    };

    fetchUsers();
  }, [companyId]);

  const handleFilter = (values) => {
    onFilter(values);
  };

  const handleReset = () => {
    form.resetFields();
    onFilter({});
  };

  return (
    <Card 
      title={
        <Space>
          <FilterOutlined /> Filter Invoices
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFilter}
        initialValues={{
          status: 'all',
          year: new Date().getFullYear(),
        }}
      >
        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="search" label="Search">
              <Input
                prefix={<SearchOutlined />}
                placeholder="Search by title or invoice #"
                allowClear
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="status" label="Status">
              <Select placeholder="Select status">
                <Option value="all">All Statuses</Option>
                <Option value={InvoiceStatus.PENDING}>Pending</Option>
                <Option value={InvoiceStatus.PAID}>Paid</Option>
                <Option value={InvoiceStatus.MISSED}>Missed</Option>
                <Option value={InvoiceStatus.CANCELLED}>Cancelled</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="creatorId" label="Creator">
              <Select 
                placeholder="Select creator"
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) => {
                  if (!option || !option.children) return false;
                  return String(option.children).toLowerCase().indexOf(input.toLowerCase()) >= 0;
                }}
              >
                <Option value="all">All Creators</Option>
                {users.map(user => (
                  <Option key={user.id} value={user.id}>
                    {user.firstname || user.firstName} {user.lastname || user.lastName}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="sortBy" label="Sort By">
              <Select placeholder="Sort by">
                <Option value="dateDesc">Date (Newest)</Option>
                <Option value="dateAsc">Date (Oldest)</Option>
                <Option value="amountDesc">Amount (Highest)</Option>
                <Option value="amountAsc">Amount (Lowest)</Option>
                <Option value="dueDateAsc">Due Date (Soonest)</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="year" label="Year">
              <Select placeholder="Select year">
                <Option value="">All Years</Option>
                {years.map(year => (
                  <Option key={year} value={year}>{year}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="month" label="Month">
              <Select placeholder="Select month">
                <Option value="">All Months</Option>
                {months.map(month => (
                  <Option key={month.value} value={month.value}>
                    {month.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={12}>
            <Form.Item name="dateRange" label="Date Range">
              <RangePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        
        <Row justify="end">
          <Space>
            <Button onClick={handleReset} icon={<ClearOutlined />}>
              Reset
            </Button>
            <Button type="primary" htmlType="submit" icon={<FilterOutlined />} loading={loading}>
              Apply Filters
            </Button>
          </Space>
        </Row>
      </Form>
    </Card>
  );
};

export default InvoiceFilters;
