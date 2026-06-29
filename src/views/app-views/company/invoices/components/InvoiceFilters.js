import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Row, Col, Input, Select, DatePicker, Button, Space } from 'antd';
import { SearchOutlined, FilterOutlined, ClearOutlined, TagOutlined } from '@ant-design/icons';
import { InvoiceStatus } from 'models/InvoiceModel';
import UserService from 'services/firebase/UserService';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

const DEPARTMENTS = {
  OFFICE_SUPPLY: 'office_supply',
  MARKETING_EXPENSE: 'marketing_expense',
  OFFICE_OPERATIONS: 'office_operations',
  GENERAL: 'general'
};

const InvoiceFilters = ({ onFilter, companyId, loading }) => {
  const [form] = Form.useForm();
  const [users, setUsers] = useState([]);
  const isFirstRender = useRef(true);

  const months = [
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
  ];

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Generate years
  const years = [];
  for (let i = 0; i < 6; i++) {
    years.push(currentYear - i);
  }

  // Fetch users
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

  // Set default filters on mount - THIS MONTH
  useEffect(() => {
    if (isFirstRender.current) {
      const defaultValues = {
        status: 'all',
        year: currentYear,
        month: currentMonth,
        department: 'all',
        creatorId: 'all',
        amountRange: 'all',
        search: undefined,
        sortBy: undefined,
      };
      
      form.setFieldsValue(defaultValues);
      isFirstRender.current = false;
      
      // Apply default filters - THIS MONTH
      onFilter(defaultValues);
    }
  }, [form, onFilter, currentYear, currentMonth]);

  const handleFilter = (values) => {
    // Ensure we have the current month/year if not specified
    const filterValues = {
      ...values,
      year: values.year || currentYear,
      month: values.month !== undefined && values.month !== '' ? values.month : currentMonth,
    };
    onFilter(filterValues);
  };

  const handleReset = () => {
    const resetValues = {
      status: 'all',
      year: currentYear,
      month: currentMonth,
      department: 'all',
      creatorId: 'all',
      amountRange: 'all',
      search: undefined,
      sortBy: undefined,
    };
    form.setFieldsValue(resetValues);
    onFilter(resetValues);
  };

  return (
    <Card style={{ marginBottom: 16 }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFilter}
      >
        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="search" label="Search">
              <Input
                prefix={<SearchOutlined />}
                placeholder="Search invoices..."
                allowClear
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="status" label="Status">
              <Select placeholder="All Statuses">
                <Option value="all">All Statuses</Option>
                <Option value={InvoiceStatus.PENDING}>Pending</Option>
                <Option value={InvoiceStatus.PAID}>Paid</Option>
                <Option value={InvoiceStatus.MISSED}>Missed</Option>
                <Option value={InvoiceStatus.CANCELLED}>Cancelled</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="department" label="Department">
              <Select placeholder="All Departments" suffixIcon={<TagOutlined />}>
                <Option value="all">All Departments</Option>
                <Option value={DEPARTMENTS.OFFICE_SUPPLY}>🏢 Office Supply</Option>
                <Option value={DEPARTMENTS.MARKETING_EXPENSE}>📊 Marketing Expense</Option>
                <Option value={DEPARTMENTS.OFFICE_OPERATIONS}>⚙️ Office Operations</Option>
                <Option value={DEPARTMENTS.GENERAL}>📋 General</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="creatorId" label="Creator">
              <Select placeholder="All Creators" showSearch>
                <Option value="all">All Creators</Option>
                {users.map(user => (
                  <Option key={user.id} value={user.id}>
                    {user.firstname || user.firstName} {user.lastname || user.lastName}
                  </Option>
                ))}
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
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="amountRange" label="Amount Range">
              <Select placeholder="All Amounts">
                <Option value="all">All Amounts</Option>
                <Option value="lessThan1000">Less than AED 1,000</Option>
                <Option value="between1000And5000">AED 1,000 - AED 5,000</Option>
                <Option value="between5000And10000">AED 5,000 - AED 10,000</Option>
                <Option value="greaterThan10000">Greater than AED 10,000</Option>
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
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row justify="end">
          <Space>
            <Button onClick={handleReset} icon={<ClearOutlined />}>
              Reset to Current Month
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