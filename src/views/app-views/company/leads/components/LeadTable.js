import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Tooltip, Space, Badge } from 'antd';
import { 
  EditOutlined, 
  DeleteOutlined, 
  UserAddOutlined,
  PhoneOutlined,
  MailOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import { LeadStatus, LeadInterestLevel } from 'models/LeadModel';
import moment from 'moment';

/**
 * Component for displaying leads in a table
 */
const LeadTable = ({ 
  leads, 
  loading, 
  onEdit, 
  onDelete, 
  onAssignSeller, 
  onViewDetails 
}) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    setData(leads);
  }, [leads]);

  // Status color mapping
  const statusColors = {
    [LeadStatus.PENDING]: 'blue',
    [LeadStatus.GAIN]: 'green',
    [LeadStatus.LOSS]: 'red'
  };

  // Interest level color mapping
  const interestLevelColors = {
    [LeadInterestLevel.LOW]: 'orange',
    [LeadInterestLevel.MEDIUM]: 'blue',
    [LeadInterestLevel.HIGH]: 'green'
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <a onClick={() => onViewDetails(record)}>{text}</a>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name)
    },
    {
      title: 'Region',
      dataIndex: 'region',
      key: 'region',
      render: region => (
        <span>
          <GlobalOutlined style={{ marginRight: 5 }} />
          {region}
        </span>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <Space>
          {record.email && (
            <Tooltip title={record.email}>
              <Button 
                type="text" 
                icon={<MailOutlined />} 
                href={`mailto:${record.email}`}
              />
            </Tooltip>
          )}
          {record.phoneNumber && (
            <Tooltip title={record.phoneNumber}>
              <Button 
                type="text" 
                icon={<PhoneOutlined />} 
                href={`tel:${record.phoneNumber}`}
              />
            </Tooltip>
          )}
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: status => (
        <Tag color={statusColors[status] || 'default'}>
          {status}
        </Tag>
      ),
      filters: Object.values(LeadStatus).map(status => ({ text: status, value: status })),
      onFilter: (value, record) => record.status === value
    },
    {
      title: 'Interest',
      dataIndex: 'InterestLevel',
      key: 'InterestLevel',
      render: level => (
        <Tag color={interestLevelColors[level] || 'default'}>
          {level}
        </Tag>
      ),
      filters: Object.values(LeadInterestLevel).map(level => ({ text: level, value: level })),
      onFilter: (value, record) => record.InterestLevel === value
    },
    {
      title: 'Budget',
      dataIndex: 'Budget',
      key: 'Budget',
      render: budget => budget ? `AED ${budget.toLocaleString()}` : '-',
      sorter: (a, b) => (a.Budget || 0) - (b.Budget || 0)
    },
    {
      title: 'Created',
      dataIndex: 'CreationDate',
      key: 'CreationDate',
      render: date => date ? moment(date.toDate()).format('MMM DD, YYYY') : '-',
      sorter: (a, b) => {
        if (!a.CreationDate) return -1;
        if (!b.CreationDate) return 1;
        return a.CreationDate - b.CreationDate;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit Lead">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => onEdit(record)} 
            />
          </Tooltip>
          <Tooltip title="Assign Seller">
            <Button 
              type="text" 
              icon={<UserAddOutlined />}
              onClick={() => onAssignSeller(record)}
            />
          </Tooltip>
          <Tooltip title="Delete Lead">
            <Button 
              type="text" 
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(record)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="id"
      loading={loading}
      onRow={record => ({
        onClick: () => onViewDetails(record)
      })}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50']
      }}
    />
  );
};

export default LeadTable;
