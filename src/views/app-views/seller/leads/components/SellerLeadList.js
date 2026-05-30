// @ts-nocheck
import React, { useState, useMemo } from 'react';
import {
  Table,
  Tag,
  Space,
  Button,
  Tooltip,
  Input,
  Select,
  DatePicker,
  Modal,
  message,
  Badge,
} from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  FilterOutlined,
  DollarOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { LeadStatus, LeadInterestLevel } from 'models/LeadModel';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { confirm } = Modal;

const SellerLeadList = ({
  leads,
  loading,
  onViewLead,
  onEditLead,
  onDeleteLead,
  sellerId,
}) => {
  const [searchText, setSearchText] = useState('');
  const [filteredStatus, setFilteredStatus] = useState(null);
  const [filteredInterest, setFilteredInterest] = useState(null);
  const [dateRange, setDateRange] = useState(null);

  // Filter leads
  const filteredLeads = useMemo(() => {
    let filtered = [...leads];

    if (searchText) {
      const term = searchText.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.name?.toLowerCase().includes(term) ||
        lead.email?.toLowerCase().includes(term) ||
        lead.phoneNumber?.includes(term) ||
        lead.region?.toLowerCase().includes(term)
      );
    }

    if (filteredStatus) filtered = filtered.filter(l => l.status === filteredStatus);
    if (filteredInterest) filtered = filtered.filter(l => l.InterestLevel === filteredInterest);

    if (dateRange && dateRange.length === 2) {
      filtered = filtered.filter(lead => {
        if (!lead.CreationDate) return false;
        return dayjs(lead.CreationDate).isBetween(dateRange[0], dateRange[1], 'day', '[]');
      });
    }

    return filtered;
  }, [leads, searchText, filteredStatus, filteredInterest, dateRange]);

  // Strict ownership check based on createdBy
  const isMyOwnLead = (lead) => {
    if (!lead || !sellerId) return false;
    const creatorId = lead.createdBy;
    if (!creatorId) return false;
    return String(creatorId) === String(sellerId);
  };

  const handleDelete = (record) => {
    if (!isMyOwnLead(record)) {
      message.warning("You can only edit or delete leads that you personally created.");
      return;
    }

    confirm({
      title: 'Delete Lead',
      content: `Are you sure you want to delete "${record.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: () => onDeleteLead(record.id),
    });
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <strong>{text || 'Unknown'}</strong>
          {isMyOwnLead(record) && (
            <Badge 
              color="green" 
              text="My Lead" 
              style={{ fontSize: '12px' }}
            />
          )}
        </Space>
      ),
    },
    {
      title: 'Region',
      dataIndex: 'region',
      key: 'region',
      render: (text) => text || '—',
    },
    {
      title: 'Source',
      dataIndex: 'RedirectedFrom',
      key: 'source',
      render: (source) => source ? <Tag color="blue">{source}</Tag> : '—',
    },
    {
      title: 'Interest',
      dataIndex: 'InterestLevel',
      key: 'interest',
      render: (level) => {
        const color = level === 'High' ? 'red' : level === 'Medium' ? 'orange' : 'blue';
        return <Tag color={color}>{level || 'Not Set'}</Tag>;
      },
    },
    {
      title: 'Budget',
      dataIndex: 'Budget',
      key: 'budget',
      render: (budget) => {
        if (!budget) return '—';
        
        const displayBudget = typeof budget === 'string' 
          ? budget 
          : `AED ${Number(budget).toLocaleString()}`;

        return (
          <Space>
            <DollarOutlined style={{ color: '#52c41a' }} />
            <span style={{ fontWeight: 500 }}>{displayBudget}</span>
          </Space>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'New' ? 'geekblue' : status === 'Contacted' ? 'cyan' : 'default'}>
          {status || 'Unknown'}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'CreationDate',
      key: 'created',
      render: (date) => date ? dayjs(date).format('DD MMM YYYY') : '—',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="View Details">
            <Button 
              icon={<EyeOutlined />} 
              onClick={() => onViewLead(record)} 
            />
          </Tooltip>

          {isMyOwnLead(record) ? (
            <>
              <Tooltip title="Edit Lead">
                <Button 
                  icon={<EditOutlined />} 
                  onClick={() => onEditLead(record)} 
                />
              </Tooltip>

              <Tooltip title="Delete Lead">
                <Button 
                  danger 
                  icon={<DeleteOutlined />} 
                  onClick={() => handleDelete(record)} 
                />
              </Tooltip>
            </>
          ) : (
            <Tooltip title="Assigned to you">
              <Tag icon={<UserOutlined />} color="default">
                Assigned
              </Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const clearFilters = () => {
    setSearchText('');
    setFilteredStatus(null);
    setFilteredInterest(null);
    setDateRange(null);
  };

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
        <Space wrap>
          <Search
            placeholder="Search by name, email, phone..."
            allowClear
            style={{ width: 320 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />

          <Select
            placeholder="Status"
            allowClear
            style={{ width: 150 }}
            value={filteredStatus}
            onChange={setFilteredStatus}
          >
            {Object.values(LeadStatus).map(s => (
              <Option key={s} value={s}>{s}</Option>
            ))}
          </Select>

          <Select
            placeholder="Interest Level"
            allowClear
            style={{ width: 150 }}
            value={filteredInterest}
            onChange={setFilteredInterest}
          >
            {Object.values(LeadInterestLevel).map(l => (
              <Option key={l} value={l}>{l}</Option>
            ))}
          </Select>

          <RangePicker
            placeholder={['Start Date', 'End Date']}
            value={dateRange}
            onChange={setDateRange}
            style={{ width: 240 }}
          />

          <Button onClick={clearFilters} icon={<FilterOutlined />}>
            Clear Filters
          </Button>
        </Space>

        <span style={{ color: '#8c8c8c', fontSize: '14px' }}>
          Showing <strong>{filteredLeads.length}</strong> of <strong>{leads.length}</strong> leads
        </span>
      </Space>

      <Table
        columns={columns}
        dataSource={filteredLeads}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 12,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} leads`,
        }}
        scroll={{ x: 1200 }}
        bordered
        size="middle"
      />
    </div>
  );
};

export default SellerLeadList;