import React, { useEffect, useState } from "react";
import { 
  Card, Button, message, Row, Col, Statistic, Typography, 
  Avatar, Spin, Table, Tag, Space, Input, Select, DatePicker, 
  Badge, Tooltip, Dropdown, Menu, Empty, Descriptions, Drawer,
  Divider, Alert
} from "antd";
import { 
  EyeOutlined, ReloadOutlined, SearchOutlined,
  FilterOutlined, DownloadOutlined, ExportOutlined,
  PhoneOutlined, MailOutlined, WhatsAppOutlined,
  UserOutlined, CalendarOutlined,
  AppstoreOutlined, UnorderedListOutlined,
  LinkOutlined
} from "@ant-design/icons";
import axios from "axios";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import relativeTime from 'dayjs/plugin/relativeTime';

import API_BASE_URL from "../../../../constants/ApiConstant";

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const PropertyFinderLeadsManagement = () => {
  const [leads, setLeads] = useState([]);
  const [companyName, setCompanyName] = useState("My Company");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Pagination
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1
  });
  
  // Filters
  const [filters, setFilters] = useState({
    status: undefined,
    channel: undefined,
    entityType: undefined,
    projectId: undefined,
    dateRange: null,
    senderName: undefined,
    senderPhone: undefined,
    senderEmail: undefined,
    tag: undefined,
    listingReference: undefined
  });
  
  // Search
  const [searchText, setSearchText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("table");
  
  // Drawer states
  const [selectedLead, setSelectedLead] = useState(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const user = useSelector((state) => state.auth.user);
  const companyId = user?.company_id;

  // Fetch Leads
  useEffect(() => {
    if (!companyId) {
      message.warning("No company associated with your account");
      return;
    }

    // Get company name from user or localStorage
    const name = user?.company_name || localStorage.getItem('companyName') || "My Company";
    setCompanyName(name);
    
    fetchLeads(companyId);
  }, [companyId]);

const fetchLeads = async (cid, page = 1) => {
  setLoading(true);
  setApiError(null);
  try {
    const params = {
      company_id: cid,
      page: page,
      perPage: pagination.pageSize
    };

    // Apply filters
    if (filters.status) params.status = filters.status;
    if (filters.channel) params.channel = filters.channel;
    if (filters.entityType) params.entityType = filters.entityType;
    if (filters.projectId) params.projectId = filters.projectId;
    if (filters.senderName) params.senderName = filters.senderName;
    if (filters.senderPhone) params.senderPhone = filters.senderPhone;
    if (filters.senderEmail) params.senderEmail = filters.senderEmail;
    if (filters.tag) params.tag = filters.tag;
    if (filters.listingReference) params.listingReference = filters.listingReference;
    
    if (filters.dateRange && filters.dateRange.length === 2) {
      params.createdAtFrom = filters.dateRange[0].toISOString();
      params.createdAtTo = filters.dateRange[1].toISOString();
    }

    if (searchText) {
      params.search = searchText;
    }

    const response = await axios.get(`${API_BASE_URL}/api/propertyfinder/leads`, { params });
    
    console.log("API Response:", response.data);
    
    // 🔥 FIX: Check for 'leads' field first, then 'data' as fallback
    let leadsData = [];
    if (response.data && response.data.leads) {
      // The API returns data in 'leads' field
      leadsData = response.data.leads || [];
    } else if (response.data && response.data.data) {
      // Fallback for 'data' field
      leadsData = response.data.data || [];
    }
    
    console.log("Leads data:", leadsData);
    setLeads(leadsData);
    
    // Use pagination from response
    setPagination({
      current: response.data.pagination?.page || response.data.page || page,
      pageSize: response.data.pagination?.perPage || response.data.perPage || 20,
      total: response.data.pagination?.total || response.data.total || leadsData.length,
      totalPages: response.data.pagination?.totalPages || response.data.totalPages || 1
    });
    
  } catch (err) {
    console.error("Failed to fetch leads:", err);
    console.error("Error response:", err.response?.data);
    const errorMsg = err.response?.data?.error || err.message || "Failed to load leads";
    setApiError(errorMsg);
    message.error(errorMsg);
    setLeads([]);
    setPagination({
      current: 1,
      pageSize: 20,
      total: 0,
      totalPages: 1
    });
  } finally {
    setLoading(false);
  }
};

  const handleSearch = () => {
    fetchLeads(companyId, 1);
  };

  const resetFilters = () => {
    setFilters({
      status: undefined,
      channel: undefined,
      entityType: undefined,
      projectId: undefined,
      dateRange: null,
      senderName: undefined,
      senderPhone: undefined,
      senderEmail: undefined,
      tag: undefined,
      listingReference: undefined
    });
    setSearchText("");
    setTimeout(() => fetchLeads(companyId, 1), 100);
  };

  const handleTableChange = (newPagination) => {
    fetchLeads(companyId, newPagination.current);
  };

  const loadMore = () => {
    if (pagination.current < pagination.totalPages) {
      setLoadingMore(true);
      fetchLeads(companyId, pagination.current + 1).finally(() => setLoadingMore(false));
    }
  };

const showLeadDetails = async (lead) => {
  setSelectedLead(lead);
  setIsDrawerVisible(true);
  setDrawerLoading(true);
  try {
    // Use lead.lead_id from the leads array
    const leadId = lead.lead_id || lead.id;
    const res = await axios.get(
      `${API_BASE_URL}/api/propertyfinder/leads/${leadId}`,
      { params: { company_id: companyId } }
    );
    if (res.data && res.data.lead) {
      setSelectedLead(res.data.lead);
    }
  } catch (err) {
    console.warn("Could not fetch full lead details:", err);
  } finally {
    setDrawerLoading(false);
  }
};

  // Export Leads
  const exportLeads = async (format = 'json') => {
    setExporting(true);
    try {
      const params = {
        company_id: companyId,
        format: format
      };

      if (filters.status) params.status = filters.status;
      if (filters.channel) params.channel = filters.channel;
      if (filters.entityType) params.entityType = filters.entityType;
      if (filters.projectId) params.projectId = filters.projectId;
      if (filters.dateRange && filters.dateRange.length === 2) {
        params.createdAtFrom = filters.dateRange[0].toISOString();
        params.createdAtTo = filters.dateRange[1].toISOString();
      }

      const response = await axios.get(`${API_BASE_URL}/api/propertyfinder/leads/export`, { 
        params,
        responseType: format === 'csv' ? 'blob' : 'json'
      });

      if (format === 'csv') {
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leads_export_${dayjs().format('YYYY-MM-DD')}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const dataStr = JSON.stringify(response.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leads_export_${dayjs().format('YYYY-MM-DD')}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
      message.success('Leads exported successfully');
    } catch (err) {
      console.error("Export failed:", err);
      message.error('Failed to export leads');
    } finally {
      setExporting(false);
    }
  };

  // Render status badge
  const getStatusBadge = (status) => {
    const statusMap = {
      'sent': { color: 'processing', text: 'Sent' },
      'delivered': { color: 'success', text: 'Delivered' },
      'read': { color: 'blue', text: 'Read' },
      'replied': { color: 'green', text: 'Replied' },
      'unknown': { color: 'default', text: 'Unknown' }
    };
    const s = statusMap[status] || { color: 'default', text: status || 'Unknown' };
    return <Badge color={s.color} text={s.text} />;
  };

  // Render channel icon
  const getChannelIcon = (channel) => {
    const icons = {
      'whatsapp': <WhatsAppOutlined style={{ color: '#25D366' }} />,
      'email': <MailOutlined style={{ color: '#1890ff' }} />,
      'call': <PhoneOutlined style={{ color: '#52c41a' }} />
    };
    return icons[channel] || <UserOutlined />;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return dayjs(date).format('DD/MM/YYYY HH:mm');
  };

  const getRelativeTime = (date) => {
    if (!date) return 'N/A';
    return dayjs(date).fromNow();
  };

  // Table columns
  const columns = [
    {
      title: 'Lead ID',
      dataIndex: 'lead_id',
      key: 'lead_id',
      width: 120,
      render: (text) => <Text copyable style={{ fontSize: '12px' }}>{text}</Text>
    },
    {
      title: 'Sender',
      dataIndex: 'full_name',
      key: 'sender',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text || 'Unknown'}</Text>
          {record.phone_number && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <PhoneOutlined /> {record.phone_number}
            </Text>
          )}
          {record.email && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <MailOutlined /> {record.email}
            </Text>
          )}
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusBadge(status)
    },
    {
      title: 'Channel',
      dataIndex: 'channel',
      key: 'channel',
      render: (channel) => (
        <Space>
          {getChannelIcon(channel)}
          <Text>{channel || 'Unknown'}</Text>
        </Space>
      )
    },
    {
      title: 'Entity Type',
      dataIndex: 'entityType',
      key: 'entityType',
      render: (type) => <Tag color="cyan">{type || 'Unknown'}</Tag>
    },
    {
      title: 'Looking For',
      dataIndex: 'looking_for',
      key: 'looking_for',
      render: (text) => text || 'N/A',
      ellipsis: true
    },
    {
      title: 'Created',
      dataIndex: 'created_time',
      key: 'created_time',
      render: (date) => (
        <Tooltip title={formatDate(date)}>
          <Text>{getRelativeTime(date)}</Text>
        </Tooltip>
      ),
      sorter: true
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Button 
          type="link" 
          icon={<EyeOutlined />} 
          onClick={() => showLeadDetails(record)}
        />
      )
    }
  ];

  // Render lead card
  const renderLeadCard = (lead) => (
    <Card
      hoverable
      style={{ 
        height: '100%', 
        borderRadius: '12px',
        borderLeft: `4px solid ${lead.status === 'replied' ? '#52c41a' : lead.status === 'read' ? '#1890ff' : '#d9d9d9'}`
      }}
      onClick={() => showLeadDetails(lead)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Space direction="vertical" size={0}>
          <Text strong>{lead.full_name || 'Unknown'}</Text>
          {lead.phone_number && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <PhoneOutlined /> {lead.phone_number}
            </Text>
          )}
          {lead.email && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <MailOutlined /> {lead.email}
            </Text>
          )}
        </Space>
        {getStatusBadge(lead.status)}
      </div>

      <Divider style={{ margin: '8px 0' }} />

      <Row gutter={[8, 8]}>
        <Col span={12}>
          <Text type="secondary" style={{ fontSize: '12px' }}>Channel</Text>
          <div>
            {getChannelIcon(lead.channel)}
            <Text style={{ marginLeft: 4 }}>{lead.channel || 'Unknown'}</Text>
          </div>
        </Col>
        <Col span={12}>
          <Text type="secondary" style={{ fontSize: '12px' }}>Entity</Text>
          <div>
            <Tag color="cyan" style={{ margin: 0 }}>{lead.entityType || 'Unknown'}</Tag>
          </div>
        </Col>
      </Row>

      {lead.looking_for && (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>Looking For</Text>
          <div>
            <Text style={{ fontSize: '13px' }}>{lead.looking_for}</Text>
          </div>
        </div>
      )}

      {lead.tags && lead.tags.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>Tags</Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {lead.tags.map((tag, idx) => (
              <Tag key={idx} color="geekblue" style={{ fontSize: '11px' }}>{tag}</Tag>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        <Text type="secondary" style={{ fontSize: '11px' }}>
          <CalendarOutlined /> {formatDate(lead.created_time)}
        </Text>
      </div>
    </Card>
  );

  if (!companyId) {
    return (
      <div style={{ padding: "24px" }}>
        <Alert
          message="No Company Found"
          description="Please create or join a company first to view leads."
          type="warning"
          showIcon
        />
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", background: "#f5f5f5", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "24px",
        flexWrap: "wrap",
        gap: "12px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar size={48} shape="square">
            {companyName?.[0] || 'C'}
          </Avatar>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              {companyName} - Leads
            </Title>
            <Text type="secondary">
              {pagination.total} total leads
            </Text>
          </div>
        </div>
        <Space wrap>
          <Button 
            icon={viewMode === 'table' ? <AppstoreOutlined /> : <UnorderedListOutlined />}
            onClick={() => setViewMode(viewMode === 'table' ? 'card' : 'table')}
          >
            {viewMode === 'table' ? 'Card View' : 'Table View'}
          </Button>
       
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => fetchLeads(companyId, 1)}
            loading={loading}
          >
            Refresh
          </Button>
        </Space>
      </div>

      {/* Error Alert */}
      {apiError && (
        <Alert
          message="Error Loading Leads"
          description={apiError}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
          onClose={() => setApiError(null)}
        />
      )}

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic 
              title="Total Leads" 
              value={pagination.total || leads.length} 
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic 
              title="Replied" 
              value={leads.filter(l => l.status === 'replied').length}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic 
              title="Read" 
              value={leads.filter(l => l.status === 'read').length}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic 
              title="WhatsApp" 
              value={leads.filter(l => l.channel === 'whatsapp').length}
              valueStyle={{ color: '#25D366' }}
              prefix={<WhatsAppOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Search and Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Input.Search
              placeholder="Search by name, phone, email, or reference..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={handleSearch}
              enterButton={<SearchOutlined />}
            />
          </Col>
          <Col xs={24} md={12}>
            <Space wrap>
              <Button 
                icon={<FilterOutlined />} 
                onClick={() => setShowFilters(!showFilters)}
                type={showFilters ? 'primary' : 'default'}
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
              <Button onClick={resetFilters}>Reset Filters</Button>
              {pagination.total > 0 && (
                <Text type="secondary">
                  Found {pagination.total} leads
                </Text>
              )}
            </Space>
          </Col>
        </Row>

        {showFilters && (
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12} md={8}>
              <Select
                style={{ width: '100%' }}
                placeholder="Status"
                value={filters.status}
                onChange={(value) => setFilters({...filters, status: value})}
                allowClear
              >
                <Option value="sent">Sent</Option>
                <Option value="delivered">Delivered</Option>
                <Option value="read">Read</Option>
                <Option value="replied">Replied</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Select
                style={{ width: '100%' }}
                placeholder="Channel"
                value={filters.channel}
                onChange={(value) => setFilters({...filters, channel: value})}
                allowClear
              >
                <Option value="whatsapp">WhatsApp</Option>
                <Option value="email">Email</Option>
                <Option value="call">Call</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Select
                style={{ width: '100%' }}
                placeholder="Entity Type"
                value={filters.entityType}
                onChange={(value) => setFilters({...filters, entityType: value})}
                allowClear
              >
                <Option value="listing">Listing</Option>
                <Option value="project">Project</Option>
                <Option value="developer">Developer</Option>
                <Option value="agent">Agent</Option>
                <Option value="company">Company</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Input
                placeholder="Sender Name"
                value={filters.senderName}
                onChange={(e) => setFilters({...filters, senderName: e.target.value})}
                allowClear
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Input
                placeholder="Sender Phone"
                value={filters.senderPhone}
                onChange={(e) => setFilters({...filters, senderPhone: e.target.value})}
                allowClear
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Input
                placeholder="Sender Email"
                value={filters.senderEmail}
                onChange={(e) => setFilters({...filters, senderEmail: e.target.value})}
                allowClear
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Input
                placeholder="Listing Reference"
                value={filters.listingReference}
                onChange={(e) => setFilters({...filters, listingReference: e.target.value})}
                allowClear
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Input
                placeholder="Tag"
                value={filters.tag}
                onChange={(e) => setFilters({...filters, tag: e.target.value})}
                allowClear
              />
            </Col>
            <Col xs={24}>
              <Text strong>Created Date</Text>
              <RangePicker
                style={{ width: '100%' }}
                value={filters.dateRange}
                onChange={(dates) => setFilters({...filters, dateRange: dates})}
              />
            </Col>
            <Col xs={24}>
              <Button 
                type="primary" 
                onClick={() => fetchLeads(companyId, 1)}
                style={{ width: '100%' }}
              >
                Apply Filters
              </Button>
            </Col>
          </Row>
        )}
      </Card>

      {/* Leads Display */}
      {loading ? (
        <Spin size="large" tip="Loading leads..." style={{ display: 'block', padding: '80px 0' }} />
      ) : leads.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "60px 20px" }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={apiError || "No leads found for this company"}
          >
            <Button type="primary" onClick={resetFilters}>Reset Filters</Button>
          </Empty>
        </Card>
      ) : viewMode === 'table' ? (
        <Card>
          <Table
            dataSource={leads}
            columns={columns}
            rowKey="lead_id"
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} leads`
            }}
            onChange={handleTableChange}
            scroll={{ x: 1200 }}
          />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {leads.map(lead => (
            <Col xs={24} sm={12} lg={8} xl={6} key={lead.lead_id}>
              {renderLeadCard(lead)}
            </Col>
          ))}
        </Row>
      )}

      {/* Load More */}
      {viewMode === 'card' && pagination.current < pagination.totalPages && (
        <div style={{ textAlign: "center", margin: "40px 0" }}>
          <Button 
            type="primary" 
            size="large"
            onClick={loadMore}
            loading={loadingMore}
            style={{ minWidth: 200 }}
          >
            {loadingMore ? "Loading..." : "Load More Leads"}
          </Button>
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">
              Showing {leads.length} of {pagination.total} leads
            </Text>
          </div>
        </div>
      )}

      {/* Lead Details Drawer */}
      <Drawer
        title="Lead Details"
        placement="right"
        width={700}
        open={isDrawerVisible}
        onClose={() => setIsDrawerVisible(false)}
        destroyOnClose
      >
        {drawerLoading ? (
          <Spin size="large" style={{ display: "block", padding: "80px 0" }} />
        ) : selectedLead && (
          <div>
            <Card title="Sender Information" size="small">
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Name">
                  <Text strong>{selectedLead.full_name || 'Unknown'}</Text>
                </Descriptions.Item>
                {selectedLead.phone_number && (
                  <Descriptions.Item label="Phone">
                    <a href={`tel:${selectedLead.phone_number}`}>
                      <PhoneOutlined /> {selectedLead.phone_number}
                    </a>
                  </Descriptions.Item>
                )}
                {selectedLead.whatsapp_number && (
                  <Descriptions.Item label="WhatsApp">
                    <a href={`https://wa.me/${selectedLead.whatsapp_number.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">
                      <WhatsAppOutlined /> {selectedLead.whatsapp_number}
                    </a>
                  </Descriptions.Item>
                )}
                {selectedLead.email && (
                  <Descriptions.Item label="Email">
                    <a href={`mailto:${selectedLead.email}`}>
                      <MailOutlined /> {selectedLead.email}
                    </a>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            <Card title="Lead Information" size="small" style={{ marginTop: 16 }}>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Lead ID">
                  <Text copyable>{selectedLead.lead_id}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  {getStatusBadge(selectedLead.status)}
                </Descriptions.Item>
                <Descriptions.Item label="Channel">
                  <Space>
                    {getChannelIcon(selectedLead.channel)}
                    {selectedLead.channel || 'Unknown'}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Entity Type">
                  <Tag color="cyan">{selectedLead.entityType || 'Unknown'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Looking For" span={2}>
                  {selectedLead.looking_for || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Created">
                  {formatDate(selectedLead.created_time)}
                </Descriptions.Item>
                <Descriptions.Item label="Age">
                  {getRelativeTime(selectedLead.created_time)}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {selectedLead.tags && selectedLead.tags.length > 0 && (
              <Card title="Tags" size="small" style={{ marginTop: 16 }}>
                <Space wrap>
                  {selectedLead.tags.map((tag, idx) => (
                    <Tag key={idx} color="geekblue">{tag}</Tag>
                  ))}
                </Space>
              </Card>
            )}

            {selectedLead.listing && (
              <Card title="Listing Details" size="small" style={{ marginTop: 16 }}>
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="Reference">
                    {selectedLead.listing.reference}
                  </Descriptions.Item>
                  {selectedLead.listing.title && (
                    <Descriptions.Item label="Title">
                      {selectedLead.listing.title}
                    </Descriptions.Item>
                  )}
                  {selectedLead.listing.price && (
                    <Descriptions.Item label="Price">
                      {selectedLead.listing.price.amounts?.sale || 'N/A'}
                    </Descriptions.Item>
                  )}
                  {selectedLead.listing.location && (
                    <Descriptions.Item label="Location">
                      {selectedLead.listing.location.name || 'N/A'}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            )}

            {selectedLead.project && (
              <Card title="Project Details" size="small" style={{ marginTop: 16 }}>
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="Title">
                    {selectedLead.project.title?.en || selectedLead.project.title?.ar || 'N/A'}
                  </Descriptions.Item>
                  {selectedLead.project.developer && (
                    <Descriptions.Item label="Developer">
                      {selectedLead.project.developer.name || 'N/A'}
                    </Descriptions.Item>
                  )}
                  {selectedLead.project.location && (
                    <Descriptions.Item label="Location">
                      {selectedLead.project.location.name || 'N/A'}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            )}

            {selectedLead.responseLink && (
              <Card size="small" style={{ marginTop: 16 }}>
                <Button 
                  type="primary" 
                  icon={<LinkOutlined />} 
                  href={selectedLead.responseLink} 
                  target="_blank"
                  block
                >
                  View in Property Finder
                </Button>
              </Card>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default PropertyFinderLeadsManagement;