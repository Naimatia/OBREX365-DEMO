import React, { useEffect, useState } from "react";
import { 
  Card, Button, message, Row, Col, Statistic, Typography, 
  Avatar, Spin, Modal, Divider, Result, Table, Tag, 
  Space, Input, Select, Slider, DatePicker, Switch,
  Badge, Tooltip, Dropdown, Menu, Progress, Empty
} from "antd";
import { 
  EyeOutlined, ReloadOutlined, SearchOutlined,
  FilterOutlined, SortAscendingOutlined, 
  HomeOutlined, DollarOutlined, EnvironmentOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
  ClockCircleOutlined, DownloadOutlined,
  AppstoreOutlined, UnorderedListOutlined
} from "@ant-design/icons";
import axios from "axios";
import { useSelector } from "react-redux";
import dayjs from "dayjs";

import API_BASE_URL from "../../../../constants/ApiConstant";
import companyService from 'services/CompanyService';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const PropertyFinderListingsManagement = () => {
  const [listings, setListings] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Pagination
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1
  });
  
  // Filters
  const [filters, setFilters] = useState({
    state: undefined,
    category: undefined,
    offeringType: undefined,
    locationId: undefined,
    bedrooms: undefined,
    priceRange: [0, 10000000],
    sizeRange: [0, 10000],
    dateRange: null,
    verificationStatus: undefined,
    furnishingType: undefined,
    projectStatus: undefined,
    listingLevel: undefined
  });
  
  // Search
  const [searchText, setSearchText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // grid | table
  
  // Modal states
  const [selectedListing, setSelectedListing] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const user = useSelector((state) => state.auth.user);
  const companyId = user?.company_id;

  // Fetch Company Data
  useEffect(() => {
    const fetchCompanyAndListings = async () => {
      if (!companyId) {
        message.warning("No company associated with your account");
        return;
      }

      setLoading(true);
      try {
        const companyData = await companyService.getCompanyById(companyId);
        setCompany(companyData);
        await fetchListings(companyId);
      } catch (err) {
        console.error(err);
        message.error("Failed to load company or listings");
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyAndListings();
  }, [companyId]);

  // Fetch Listings
  const fetchListings = async (cid, page = 1) => {
    try {
      const params = {
        company_id: cid,
        page: page,
        perPage: pagination.pageSize
      };

      // Apply filters
      if (filters.state) params['filter[state]'] = filters.state;
      if (filters.category) params['filter[category]'] = filters.category;
      if (filters.offeringType) params['filter[offeringType]'] = filters.offeringType;
      if (filters.locationId) params['filter[locationId]'] = filters.locationId;
      if (filters.bedrooms) params['filter[bedrooms]'] = filters.bedrooms;
      if (filters.verificationStatus) params['filter[verificationStatus]'] = filters.verificationStatus;
      if (filters.furnishingType) params['filter[furnishingType]'] = filters.furnishingType;
      if (filters.projectStatus) params['filter[projectStatus]'] = filters.projectStatus;
      if (filters.listingLevel) params['filter[listingLevel]'] = filters.listingLevel;
      
      // Price range
      if (filters.priceRange[0] > 0) params['filter[price][from]'] = filters.priceRange[0];
      if (filters.priceRange[1] < 10000000) params['filter[price][to]'] = filters.priceRange[1];
      
      // Size range
      if (filters.sizeRange[0] > 0) params['filter[size][from]'] = filters.sizeRange[0];
      if (filters.sizeRange[1] < 10000) params['filter[size][to]'] = filters.sizeRange[1];
      
      // Date range
      if (filters.dateRange && filters.dateRange.length === 2) {
        params['filter[createdAt][from]'] = filters.dateRange[0].toISOString();
        params['filter[createdAt][to]'] = filters.dateRange[1].toISOString();
      }

      // Search
      if (searchText) {
        params['filter[reference]'] = searchText;
      }

      const res = await axios.get(`${API_BASE_URL}/api/propertyfinder/listings`, { params });

      if (page === 1) {
        setListings(res.data.results || []);
      } else {
        setListings(prev => [...prev, ...(res.data.results || [])]);
      }

      setPagination({
        current: res.data.pagination?.page || page,
        pageSize: res.data.pagination?.perPage || 20,
        total: res.data.pagination?.total || 0,
        totalPages: res.data.pagination?.totalPages || 1
      });
    } catch (err) {
      message.error(err.response?.data?.error || "Failed to load listings");
      console.error(err);
    }
  };

  const handleSearch = () => {
    fetchListings(companyId, 1);
  };

  const resetFilters = () => {
    setFilters({
      state: undefined,
      category: undefined,
      offeringType: undefined,
      locationId: undefined,
      bedrooms: undefined,
      priceRange: [0, 10000000],
      sizeRange: [0, 10000],
      dateRange: null,
      verificationStatus: undefined,
      furnishingType: undefined,
      projectStatus: undefined,
      listingLevel: undefined
    });
    setSearchText("");
    setTimeout(() => fetchListings(companyId, 1), 100);
  };

  const handleTableChange = (newPagination) => {
    fetchListings(companyId, newPagination.current);
  };

  const loadMore = () => {
    if (pagination.current < pagination.totalPages) {
      setLoadingMore(true);
      fetchListings(companyId, pagination.current + 1).finally(() => setLoadingMore(false));
    }
  };

  const showListingDetails = async (listing) => {
    setSelectedListing(listing);
    setIsModalVisible(true);
    setModalLoading(true);
    try {
      // Fetch full listing details if needed
      const res = await axios.get(
        `${API_BASE_URL}/api/propertyfinder/listings/${listing.id}`,
        { params: { company_id: companyId } }
      );
      setSelectedListing(res.data.listing);
    } catch (err) {
      message.warning("Some details may not be available");
    } finally {
      setModalLoading(false);
    }
  };

  // Render status badge
  const getStatusBadge = (state) => {
    const statusMap = {
      'draft': { color: 'default', text: 'Draft' },
      'live': { color: 'success', text: 'Live' },
      'takendown': { color: 'error', text: 'Taken Down' },
      'archived': { color: 'warning', text: 'Archived' },
      'unpublished': { color: 'warning', text: 'Unpublished' },
      'pending_approval': { color: 'processing', text: 'Pending Approval' },
      'rejected': { color: 'error', text: 'Rejected' },
      'approved': { color: 'success', text: 'Approved' },
      'failed': { color: 'error', text: 'Failed' }
    };
    const status = statusMap[state?.type] || statusMap[state] || { color: 'default', text: state || 'Unknown' };
    return <Badge color={status.color} text={status.text} />;
  };

  // Format price
  const formatPrice = (price) => {
    if (!price) return 'N/A';
    const amount = price.amounts?.[price.type] || price.amounts?.sale || 0;
    const currency = 'AED';
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M ${currency}`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K ${currency}`;
    }
    return `${amount} ${currency}`;
  };

  // Render listing card
  const renderListingCard = (listing) => {
    const imageUrl = listing.media?.images?.[0]?.original?.url || 
                     listing.media?.images?.[0]?.watermarked?.url;

    return (
      <Col xs={24} sm={12} lg={8} xl={6} key={listing.id}>
        <Card
          hoverable
          style={{ height: "100%", borderRadius: "12px", overflow: "hidden" }}
          cover={
            imageUrl ? (
              <img 
                src={imageUrl} 
                alt={listing.title?.en}
                style={{ height: 200, objectFit: "cover" }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div style={{ 
                height: 200, 
                background: '#f0f0f0', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <HomeOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />
              </div>
            )
          }
          actions={[
            <Button 
              key="view" 
              type="link" 
              icon={<EyeOutlined />} 
              onClick={() => showListingDetails(listing)}
            >
              View Details
            </Button>
          ]}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: '16px' }}>
                {listing.title?.en || listing.reference || 'Untitled'}
              </Text>
              <div style={{ marginTop: 4 }}>
                {getStatusBadge(listing.state)}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              <EnvironmentOutlined /> {listing.location?.name || 'Location not specified'}
            </Text>
          </div>

          <div style={{ marginTop: 8 }}>
            <Text strong style={{ color: '#1890ff', fontSize: '18px' }}>
              {formatPrice(listing.price)}
            </Text>
            {listing.price?.type && (
              <Text type="secondary" style={{ fontSize: '12px', marginLeft: 4 }}>
                ({listing.price.type})
              </Text>
            )}
          </div>

          <div style={{ marginTop: 8, display: 'flex', gap: 16 }}>
            {listing.bedrooms && (
              <Text style={{ fontSize: '13px' }}>
                🛏 {listing.bedrooms}
              </Text>
            )}
            {listing.bathrooms && (
              <Text style={{ fontSize: '13px' }}>
                🚿 {listing.bathrooms}
              </Text>
            )}
            {listing.size && (
              <Text style={{ fontSize: '13px' }}>
                📐 {listing.size} sqft
              </Text>
            )}
          </div>

          <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {listing.category && (
              <Tag color="blue">{listing.category}</Tag>
            )}
            {listing.type && (
              <Tag color="cyan">{listing.type}</Tag>
            )}
            {listing.furnishingType && (
              <Tag color="purple">{listing.furnishingType}</Tag>
            )}
          </div>

          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              Ref: {listing.reference}
            </Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              Created: {dayjs(listing.createdAt).format('DD/MM/YYYY')}
            </Text>
          </div>
        </Card>
      </Col>
    );
  };

  // Table columns
  const columns = [
    {
      title: 'Reference',
      dataIndex: 'reference',
      key: 'reference',
      render: (text, record) => (
        <a onClick={() => showListingDetails(record)}>{text}</a>
      )
    },
    {
      title: 'Title',
      dataIndex: ['title', 'en'],
      key: 'title',
      render: (text) => text || 'Untitled'
    },
    {
      title: 'Status',
      dataIndex: 'state',
      key: 'status',
      render: (state) => getStatusBadge(state)
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price) => formatPrice(price)
    },
    {
      title: 'Bedrooms',
      dataIndex: 'bedrooms',
      key: 'bedrooms'
    },
    {
      title: 'Bathrooms',
      dataIndex: 'bathrooms',
      key: 'bathrooms'
    },
    {
      title: 'Size (sqft)',
      dataIndex: 'size',
      key: 'size'
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (text) => <Tag color="cyan">{text}</Tag>
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('DD/MM/YYYY')
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button 
          type="link" 
          icon={<EyeOutlined />} 
          onClick={() => showListingDetails(record)}
        />
      )
    }
  ];

  if (!companyId) {
    return (
      <Result
        status="warning"
        title="No Company Found"
        subTitle="Please create or join a company first."
      />
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
          <Avatar 
            src={company?.logo} 
            size={48} 
            shape="square"
          />
          <Title level={3} style={{ margin: 0 }}>
            {company?.name || "My Company"} - Property Finder Listings
          </Title>
        </div>
        <Space>
          <Button 
            icon={viewMode === 'grid' ? <UnorderedListOutlined /> : <AppstoreOutlined />}
            onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
          >
            {viewMode === 'grid' ? 'Table View' : 'Grid View'}
          </Button>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => fetchListings(companyId, 1)}
            loading={loading}
          >
            Refresh
          </Button>
        </Space>
      </div>

      {/* Search and Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Input.Search
              placeholder="Search by reference..."
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
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
              <Button onClick={resetFilters}>Reset Filters</Button>
              {pagination.total > 0 && (
                <Text type="secondary">
                  Found {pagination.total} listings
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
                value={filters.state}
                onChange={(value) => setFilters({...filters, state: value})}
                allowClear
              >
                <Option value="draft">Draft</Option>
                <Option value="live">Live</Option>
                <Option value="takendown">Taken Down</Option>
                <Option value="archived">Archived</Option>
                <Option value="pending_approval">Pending Approval</Option>
                <Option value="rejected">Rejected</Option>
                <Option value="approved">Approved</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Select
                style={{ width: '100%' }}
                placeholder="Category"
                value={filters.category}
                onChange={(value) => setFilters({...filters, category: value})}
                allowClear
              >
                <Option value="residential">Residential</Option>
                <Option value="commercial">Commercial</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Select
                style={{ width: '100%' }}
                placeholder="Offering Type"
                value={filters.offeringType}
                onChange={(value) => setFilters({...filters, offeringType: value})}
                allowClear
              >
                <Option value="sale">Sale</Option>
                <Option value="rent">Rent</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Select
                style={{ width: '100%' }}
                placeholder="Bedrooms"
                value={filters.bedrooms}
                onChange={(value) => setFilters({...filters, bedrooms: value})}
                allowClear
              >
                <Option value="studio">Studio</Option>
                <Option value="1">1</Option>
                <Option value="2">2</Option>
                <Option value="3">3</Option>
                <Option value="4">4</Option>
                <Option value="5">5+</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Select
                style={{ width: '100%' }}
                placeholder="Furnishing"
                value={filters.furnishingType}
                onChange={(value) => setFilters({...filters, furnishingType: value})}
                allowClear
              >
                <Option value="furnished">Furnished</Option>
                <Option value="semi-furnished">Semi-Furnished</Option>
                <Option value="unfurnished">Unfurnished</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Select
                style={{ width: '100%' }}
                placeholder="Verification Status"
                value={filters.verificationStatus}
                onChange={(value) => setFilters({...filters, verificationStatus: value})}
                allowClear
              >
                <Option value="pending">Pending</Option>
                <Option value="approved">Approved</Option>
                <Option value="rejected">Rejected</Option>
                <Option value="expired">Expired</Option>
              </Select>
            </Col>
            <Col xs={24}>
              <Text strong>Price Range (AED)</Text>
              <Slider
                range
                min={0}
                max={10000000}
                step={100000}
                value={filters.priceRange}
                onChange={(value) => setFilters({...filters, priceRange: value})}
                tipFormatter={(value) => `${value.toLocaleString()}`}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">{filters.priceRange[0].toLocaleString()}</Text>
                <Text type="secondary">{filters.priceRange[1].toLocaleString()}</Text>
              </div>
            </Col>
            <Col xs={24}>
              <Text strong>Size Range (sqft)</Text>
              <Slider
                range
                min={0}
                max={10000}
                step={100}
                value={filters.sizeRange}
                onChange={(value) => setFilters({...filters, sizeRange: value})}
                tipFormatter={(value) => `${value}`}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">{filters.sizeRange[0]}</Text>
                <Text type="secondary">{filters.sizeRange[1]}</Text>
              </div>
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
                onClick={() => fetchListings(companyId, 1)}
                style={{ width: '100%' }}
              >
                Apply Filters
              </Button>
            </Col>
          </Row>
        )}
      </Card>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic 
              title="Total Listings" 
              value={pagination.total || listings.length} 
              prefix={<HomeOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic 
              title="Live" 
              value={listings.filter(l => l.state?.type === 'live' || l.state === 'live').length} 
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic 
              title="Draft" 
              value={listings.filter(l => l.state?.type === 'draft' || l.state === 'draft').length}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic 
              title="For Sale" 
              value={listings.filter(l => l.price?.type === 'sale').length}
              valueStyle={{ color: '#1890ff' }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic 
              title="For Rent" 
              value={listings.filter(l => l.price?.type?.includes('rent') || l.price?.type === 'yearly' || l.price?.type === 'monthly').length}
              valueStyle={{ color: '#eb2f96' }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic 
              title="Verified" 
              value={listings.filter(l => l.verificationStatus === 'approved').length}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Listings Display */}
      {loading ? (
        <Spin size="large" tip="Loading listings..." style={{ display: 'block', padding: '80px 0' }} />
      ) : listings.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "60px 20px" }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No listings found for this company"
          />
        </Card>
      ) : viewMode === 'grid' ? (
        <Row gutter={[16, 16]}>
          {listings.map(renderListingCard)}
        </Row>
      ) : (
        <Card>
          <Table
            dataSource={listings}
            columns={columns}
            rowKey="id"
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} listings`
            }}
            onChange={handleTableChange}
            scroll={{ x: 1200 }}
          />
        </Card>
      )}

      {/* Load More */}
      {viewMode === 'grid' && pagination.current < pagination.totalPages && (
        <div style={{ textAlign: "center", margin: "40px 0" }}>
          <Button 
            type="primary" 
            size="large"
            onClick={loadMore}
            loading={loadingMore}
            style={{ minWidth: 200 }}
          >
            {loadingMore ? "Loading..." : "Load More Listings"}
          </Button>
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">
              Showing {listings.length} of {pagination.total} listings
            </Text>
          </div>
        </div>
      )}

      {/* Listing Details Modal */}
      <Modal
        title="Listing Details"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={1000}
        destroyOnClose
      >
        {modalLoading ? (
          <Spin size="large" style={{ display: "block", padding: "80px 0" }} />
        ) : selectedListing && (
          <div>
            <Row gutter={[24, 24]}>
              <Col span={24}>
                <Card>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <Title level={4}>{selectedListing.title?.en || selectedListing.reference}</Title>
                      <Space>
                        {getStatusBadge(selectedListing.state)}
                        {selectedListing.verificationStatus && (
                          <Tag color={selectedListing.verificationStatus === 'approved' ? 'green' : 'orange'}>
                            {selectedListing.verificationStatus}
                          </Tag>
                        )}
                      </Space>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Title level={3} style={{ color: '#1890ff', margin: 0 }}>
                        {formatPrice(selectedListing.price)}
                      </Title>
                      <Text type="secondary">{selectedListing.price?.type}</Text>
                    </div>
                  </div>
                </Card>
              </Col>

              <Col xs={24} lg={16}>
                <Card title="Property Details">
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Text strong>Reference:</Text> <Text>{selectedListing.reference}</Text>
                    </Col>
                    <Col span={12}>
                      <Text strong>Category:</Text> <Tag color="blue">{selectedListing.category}</Tag>
                    </Col>
                    <Col span={12}>
                      <Text strong>Type:</Text> <Tag color="cyan">{selectedListing.type}</Tag>
                    </Col>
                    <Col span={12}>
                      <Text strong>Furnishing:</Text> <Tag color="purple">{selectedListing.furnishingType}</Tag>
                    </Col>
                    <Col span={12}>
                      <Text strong>Bedrooms:</Text> <Text>{selectedListing.bedrooms || 'N/A'}</Text>
                    </Col>
                    <Col span={12}>
                      <Text strong>Bathrooms:</Text> <Text>{selectedListing.bathrooms || 'N/A'}</Text>
                    </Col>
                    <Col span={12}>
                      <Text strong>Size:</Text> <Text>{selectedListing.size} sqft</Text>
                    </Col>
                    <Col span={12}>
                      <Text strong>Built-up Area:</Text> <Text>{selectedListing.builtUpArea || 'N/A'} sqft</Text>
                    </Col>
                    <Col span={12}>
                      <Text strong>Project Status:</Text> <Tag>{selectedListing.projectStatus}</Tag>
                    </Col>
                    <Col span={12}>
                      <Text strong>UAE Emirate:</Text> <Tag>{selectedListing.uaeEmirate}</Tag>
                    </Col>
                    {selectedListing.unitNumber && (
                      <Col span={12}>
                        <Text strong>Unit Number:</Text> <Text>{selectedListing.unitNumber}</Text>
                      </Col>
                    )}
                    {selectedListing.floorNumber && (
                      <Col span={12}>
                        <Text strong>Floor:</Text> <Text>{selectedListing.floorNumber}</Text>
                      </Col>
                    )}
                  </Row>
                </Card>
              </Col>

              <Col xs={24} lg={8}>
                <Card title="Location">
                  <div>
                    <Text strong>Location:</Text>
                    <Text>{selectedListing.location?.name || 'N/A'}</Text>
                  </div>
                  {selectedListing.location?.path && (
                    <div>
                      <Text strong>Path:</Text>
                      <Text>{selectedListing.location.path.join(' > ')}</Text>
                    </div>
                  )}
                </Card>

                {selectedListing.amenities && selectedListing.amenities.length > 0 && (
                  <Card title="Amenities" style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {selectedListing.amenities.map((amenity, index) => (
                        <Tag key={index} color="geekblue">{amenity}</Tag>
                      ))}
                    </div>
                  </Card>
                )}
              </Col>

              {selectedListing.description && (
                <Col span={24}>
                  <Card title="Description">
                    <Paragraph>
                      {selectedListing.description.en || selectedListing.description.ar || 'No description available'}
                    </Paragraph>
                  </Card>
                </Col>
              )}

              {selectedListing.media?.images && selectedListing.media.images.length > 0 && (
                <Col span={24}>
                  <Card title={`Images (${selectedListing.media.images.length})`}>
                    <Row gutter={[8, 8]}>
                      {selectedListing.media.images.map((img, idx) => (
                        <Col key={idx} xs={12} sm={8} md={6}>
                          <img 
                            src={img.watermarked?.url || img.original?.url} 
                            alt={`Listing image ${idx + 1}`}
                            style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 8 }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </Col>
                      ))}
                    </Row>
                  </Card>
                </Col>
              )}

              <Col span={24}>
                <Card title="Additional Information" size="small">
                  <Row gutter={[16, 8]}>
                    <Col span={12}>
                      <Text strong>Created:</Text> <Text>{dayjs(selectedListing.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
                    </Col>
                    <Col span={12}>
                      <Text strong>Updated:</Text> <Text>{dayjs(selectedListing.updatedAt).format('DD/MM/YYYY HH:mm')}</Text>
                    </Col>
                    {selectedListing.createdBy && (
                      <Col span={12}>
                        <Text strong>Created By:</Text> <Text>{selectedListing.createdBy.name || 'N/A'}</Text>
                      </Col>
                    )}
                    {selectedListing.assignedTo && (
                      <Col span={12}>
                        <Text strong>Assigned To:</Text> <Text>{selectedListing.assignedTo.name || 'N/A'}</Text>
                      </Col>
                    )}
                    {selectedListing.qualityScore && (
                      <Col span={12}>
                        <Text strong>Quality Score:</Text>
                        <Progress 
                          percent={selectedListing.qualityScore.value || 0} 
                          status={selectedListing.qualityScore.color === 'red' ? 'exception' : 'active'}
                          size="small"
                          style={{ width: 100 }}
                        />
                      </Col>
                    )}
                  </Row>
                </Card>
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PropertyFinderListingsManagement;