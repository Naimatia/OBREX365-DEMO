import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Tooltip, Space, Typography, Avatar } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  UserAddOutlined,
  PhoneOutlined,
  MailOutlined,
  GlobalOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { LeadStatus, LeadInterestLevel } from 'models/LeadModel';
import dayjs from 'dayjs';

const { Text } = Typography;

const statusColors = {
  [LeadStatus.PENDING]: 'processing',
  [LeadStatus.GAIN]: 'success',
  [LeadStatus.LOSS]: 'error',
  [LeadStatus.NO_RESPONSE]: 'default',
  [LeadStatus.NOT_INTERESTED]: 'warning',
  [LeadStatus.JUNK_LEAD]: 'purple',
};

const statusDotColors = {
  [LeadStatus.PENDING]: '#1677ff',
  [LeadStatus.GAIN]: '#52c41a',
  [LeadStatus.LOSS]: '#ff4d4f',
  [LeadStatus.NO_RESPONSE]: '#8c8c8c',
  [LeadStatus.NOT_INTERESTED]: '#fa8c16',
  [LeadStatus.JUNK_LEAD]: '#722ed1',
};

const interestLevelColors = {
  [LeadInterestLevel.LOW]: 'orange',
  [LeadInterestLevel.MEDIUM]: 'blue',
  [LeadInterestLevel.HIGH]: 'green',
};

const LeadTable = ({
  leads,
  loading,
  onEdit,
  onDelete,
  onAssignSeller,
  onViewDetails,
  onBulkAssign,
}) => {
  const [data, setData] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  useEffect(() => {
    // Sort by newest CreationDate by default
    const sortedLeads = [...leads].sort((a, b) => {
      const dateA = a.CreationDate?.toDate?.() || new Date(a.CreationDate) || new Date(0);
      const dateB = b.CreationDate?.toDate?.() || new Date(b.CreationDate) || new Date(0);
      return dateB - dateA; // Newest first
    });

    setData(sortedLeads);
    setSelectedRowKeys([]);
  }, [leads]);

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
    columnWidth: 40,
  };

const columns = [
  {
    title: 'Lead',
    dataIndex: 'name',
    key: 'name',
    ellipsis: true,
    render: (text, record) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar
          size={32}
          style={{
            background: stringToColor(text || 'U'),
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {(text || 'U')[0].toUpperCase()}
        </Avatar>
        <div style={{ minWidth: 0 }}>
          <a
            onClick={() => onViewDetails(record)}
            style={{ fontWeight: 600, color: '#1d1d1d', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {text}
          </a>
          {record.region && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              <GlobalOutlined style={{ marginRight: 3 }} />
              {record.region}
            </Text>
          )}
        </div>
      </div>
    ),
    sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
  },
  {
    title: 'Contact',
    key: 'contact',
    width: 90,
    render: (_, record) => (
      <Space size={2}>
        {record.email && (
          <Tooltip title={record.email}>
            <Button
              type="text"
              size="small"
              icon={<MailOutlined style={{ color: '#1677ff' }} />}
              href={`mailto:${record.email}`}
              onClick={e => e.stopPropagation()}
            />
          </Tooltip>
        )}
        {record.phoneNumber && (
          <Tooltip title={record.phoneNumber}>
            <Button
              type="text"
              size="small"
              icon={<PhoneOutlined style={{ color: '#52c41a' }} />}
              href={`tel:${record.phoneNumber}`}
              onClick={e => e.stopPropagation()}
            />
          </Tooltip>
        )}
      </Space>
    ),
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    width: 130,
    render: status => (
      <Tag
        color={statusColors[status] || 'default'}
        style={{ borderRadius: 20, fontWeight: 500, fontSize: 11 }}
      >
        {status || '—'}
      </Tag>
    ),
    // Remove filters from here - they're handled at parent level
  },
  {
    title: 'Interest',
    dataIndex: 'InterestLevel',
    key: 'InterestLevel',
    width: 100,
    render: level => (
      <Tag
        color={interestLevelColors[level] || 'default'}
        style={{ borderRadius: 20, fontWeight: 500, fontSize: 11 }}
      >
        {level || '—'}
      </Tag>
    ),
    // Remove filters from here - they're handled at parent level
  },
  {
    title: 'Looking For',
    dataIndex: 'lookingFor',
    key: 'lookingFor',
    ellipsis: true,
    render: (text) => text ? <Text>{text}</Text> : <Text type="secondary">—</Text>,
    responsive: ['lg'],
  },
  {
    title: 'Budget',
    dataIndex: 'Budget',
    key: 'Budget',
    width: 160,
    render: (budget, record) => {
      if (!budget) {
        return <Text type="secondary">—</Text>;
      }
      if (typeof budget === 'number' || !isNaN(Number(budget))) {
        const num = Number(budget);
        return (
          <Text strong style={{ color: '#1677ff' }}>
            AED {num.toLocaleString()}
          </Text>
        );
      }
      return (
        <Tooltip title={budget}>
          <Text strong style={{ color: '#1677ff', cursor: 'help' }}>
            {budget.length > 25 ? budget.substring(0, 25) + '...' : budget}
          </Text>
        </Tooltip>
      );
    },
    sorter: (a, b) => {
      const valA = typeof a.Budget === 'number' ? a.Budget : 0;
      const valB = typeof b.Budget === 'number' ? b.Budget : 0;
      return valA - valB;
    },
    responsive: ['md'],
  },
  {
    title: 'Created',
    dataIndex: 'CreationDate',
    key: 'CreationDate',
    width: 110,
    render: date =>
      date ? (
        <Text style={{ fontSize: 12 }}>
          {dayjs(date.toDate?.() || date).format('MMM DD, YYYY')}
        </Text>
      ) : (
        <Text type="secondary">—</Text>
      ),
    sorter: (a, b) => {
      if (!a.CreationDate) return -1;
      if (!b.CreationDate) return 1;
      return (a.CreationDate.toDate?.() || new Date(a.CreationDate)) -
        (b.CreationDate.toDate?.() || new Date(b.CreationDate));
    },
    responsive: ['lg'],
  },
  {
    title: '',
    key: 'actions',
    width: 110,
    render: (_, record) => (
      <Space size={2}>
        <Tooltip title="Edit">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={e => { e.stopPropagation(); onEdit(record); }}
          />
        </Tooltip>
        <Tooltip title="Assign Seller">
          <Button
            type="text"
            size="small"
            icon={<UserAddOutlined style={{ color: '#722ed1' }} />}
            onClick={e => { e.stopPropagation(); onAssignSeller(record); }}
          />
        </Tooltip>
        <Tooltip title="Delete">
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={e => { e.stopPropagation(); onDelete(record); }}
          />
        </Tooltip>
      </Space>
    ),
  },
];

  return (
    <div>
      {/* Bulk action toolbar */}
      {selectedRowKeys.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 16px',
            marginBottom: 12,
            background: '#f0f5ff',
            borderRadius: 10,
            border: '1px solid #adc6ff',
            flexWrap: 'wrap',
          }}
        >
          <Text strong style={{ color: '#1677ff' }}>
            {selectedRowKeys.length} lead{selectedRowKeys.length > 1 ? 's' : ''} selected
          </Text>
          <Button
            type="primary"
            size="small"
            icon={<TeamOutlined />}
            onClick={() => onBulkAssign?.(selectedRowKeys)}
            style={{ borderRadius: 6 }}
          >
            Assign to Seller
          </Button>
          <Button
            size="small"
            onClick={() => setSelectedRowKeys([])}
            style={{ borderRadius: 6 }}
          >
            Clear
          </Button>
        </div>
      )}

      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        size="middle"
        scroll={{ x: 600 }}
        onRow={record => ({
          onClick: () => onViewDetails(record),
          style: { cursor: 'pointer' },
        })}
        rowClassName={(_, index) =>
          index % 2 === 0 ? 'table-row-even' : 'table-row-odd'
        }
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total, range) =>
            `${range[0]}–${range[1]} of ${total} leads`,
          size: 'small',
        }}
        style={{ borderRadius: 10, overflow: 'hidden' }}
      />

      <style>{`
        .table-row-even { background: #fff; }
        .table-row-odd  { background: #fafafa; }
        .ant-table-tbody > tr:hover > td { background: #f0f5ff !important; }
      `}</style>
    </div>
  );
};

// Deterministic color from string
function stringToColor(str) {
  const palette = ['#1677ff', '#52c41a', '#722ed1', '#fa8c16', '#13c2c2', '#eb2f96', '#faad14'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

export default LeadTable;