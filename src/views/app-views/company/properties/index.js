import React, { useState, useEffect } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  Button, 
  Typography, 
  Space, 
  Spin, 
  Empty, 
  Modal, 
  Input,
  Select,
  Divider,
  Alert,
  Statistic,
  Tooltip,
  message
} from 'antd';
import { 
  PlusOutlined, 
  HomeOutlined, 
  ExclamationCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  DollarOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';

// Import components
import PropertyCard from './components/PropertyCard';
import PropertyDetail from './components/PropertyDetail';
import PropertyForm from './components/PropertyForm';
import PropertyService from './services/PropertyService';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

/**
 * Properties management page component
 */
const PropertiesPage = () => {
  // Get current user from Redux store
  const user = useSelector(state => state.auth.user);
  const userRole = user?.Role || 'User';
  
  // State variables
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formVisible, setFormVisible] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortBy, setSortBy] = useState('CreationDate');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentProperty, setCurrentProperty] = useState(null);

  // Check if user has permission to add/edit/delete (CEO or HR)
  const hasManagePermission = userRole === 'CEO' || userRole === 'HR';

  // Load properties on component mount
  useEffect(() => {
    fetchProperties();
  }, []);

  // Filter and sort properties based on current filters
  const filteredAndSortedProperties = React.useMemo(() => {
    return properties
      .filter(property => {
        // Apply search text filter
        const searchLower = searchText.toLowerCase();
        const matchesSearch = searchText === '' || 
          property.title.toLowerCase().includes(searchLower) || 
          property.description.toLowerCase().includes(searchLower) ||
          property.Location.toLowerCase().includes(searchLower) ||
          property.address.toLowerCase().includes(searchLower);

        // Apply type filter
        const matchesType = filterType === 'All' || property.Type === filterType;

        // Apply status filter
        const matchesStatus = filterStatus === 'All' || property.Status === filterStatus;

        return matchesSearch && matchesType && matchesStatus;
      })
      .sort((a, b) => {
        // Sort by selected field
        let comparison = 0;
        switch (sortBy) {
          case 'title':
            comparison = a.title.localeCompare(b.title);
            break;
          case 'SellPrice':
            comparison = Number(a.SellPrice || 0) - Number(b.SellPrice || 0);
            break;
          case 'OriginalPrice':
            comparison = Number(a.OriginalPrice || 0) - Number(b.OriginalPrice || 0);
            break;
          case 'CreationDate':
          default:
            comparison = new Date(a.CreationDate || new Date()).getTime() - new Date(b.CreationDate || new Date()).getTime();
            break;
        }
        // Apply sort direction
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [properties, searchText, filterType, filterStatus, sortBy, sortDirection]);

  // Get statistics
  const getStats = () => {
    const totalCount = properties.length;
    const availableCount = properties.filter(p => p.Status === 'Available').length;
    const soldCount = properties.filter(p => p.Status === 'Sold').length;
    const pendingCount = properties.filter(p => p.Status === 'Pending').length;
    
    // Calculate average price
    let totalSellPrice = 0;
    properties.forEach(p => {
      totalSellPrice += Number(p.SellPrice) || 0;
    });
    const avgPrice = totalCount > 0 ? totalSellPrice / totalCount : 0;

    return { totalCount, availableCount, soldCount, pendingCount, avgPrice };
  };

  const stats = getStats();

  // Fetch properties from Firebase
  const fetchProperties = async () => {
    if (!user?.company_id) {
      setError('User does not have a company ID');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const fetchedProperties = await PropertyService.fetchProperties(user.company_id);
      setProperties(fetchedProperties);
      setError(null);
    } catch (err) {
      console.error('Error fetching properties:', err);
      setError('Failed to load properties. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Handle property form submission
  const handleFormSubmit = async (propertyData) => {
    setFormLoading(true);
    try {
      if (currentProperty) {
        // Update existing property
        await PropertyService.updateProperty(currentProperty.id, propertyData);
        message.success('Property updated successfully');
      } else {
        // Create new property
        await PropertyService.createProperty(propertyData);
        message.success('Property added successfully');
      }
      
      // Reset form and fetch updated properties
      setFormVisible(false);
      setCurrentProperty(null);
      fetchProperties();
    } catch (err) {
      console.error('Error saving property:', err);
      message.error('Failed to save property. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle property deletion
  const handleDeleteProperty = (propertyId) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this property?',
      icon: <ExclamationCircleOutlined />,
      content: 'This action cannot be undone.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await PropertyService.deleteProperty(propertyId);
          
          // Close detail drawer if the deleted property was selected
          if (selectedProperty?.id === propertyId) {
            setDetailVisible(false);
            setSelectedProperty(null);
          }
          
          message.success('Property deleted successfully');
          fetchProperties();
        } catch (err) {
          console.error('Error deleting property:', err);
          message.error('Failed to delete property. Please try again.');
        }
      }
    });
  };

  // Handle property card click
  const handlePropertyClick = (property) => {
    setSelectedProperty(property);
    setDetailVisible(true);
  };

  // Handle edit button click
  const handleEditProperty = (property) => {
    setCurrentProperty(property);
    setDetailVisible(false);
    setFormVisible(true);
  };

  // Handle add property button click
  const handleAddProperty = () => {
    setCurrentProperty(null);
    setFormVisible(true);
  };

  // Get available property types for filter
  const propertyTypes = Array.from(new Set(properties.map(p => p.Type || ''))).filter(Boolean);
  
  // Format currency for statistics
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className='properties-page'>
      {/* Page Header */}
      <Card className='header-card' style={{ marginBottom: '24px' }}>
        <Row align='middle' justify='space-between'>
          <Col>
            <Space align='center' size='large'>
              <HomeOutlined style={{ fontSize: '36px', color: '#1890ff' }} />
              <Title level={2} style={{ margin: 0 }}>Company Properties</Title>
            </Space>
            <Paragraph type='secondary' style={{ marginTop: '8px' }}>
              Manage all properties for {user?.company_name || 'your company'}
            </Paragraph>
          </Col>
          
          {hasManagePermission && (
            <Col>
              <Button 
                type='primary' 
                icon={<PlusOutlined />} 
                size='large'
                onClick={handleAddProperty}
              >
                Add Property
              </Button>
            </Col>
          )}
        </Row>
      </Card>

      {/* Stats Row */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title='Total Properties' 
              value={stats.totalCount} 
              prefix={<HomeOutlined />} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title='Available' 
              value={stats.availableCount} 
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title='Sold/Rented' 
              value={stats.soldCount} 
              valueStyle={{ color: '#cf1322' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title='Average Price' 
              value={formatCurrency(stats.avgPrice)} 
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters Row */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={16} align='middle'>
          <Col xs={24} md={8}>
            <Search
              placeholder='Search properties...'
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: '100%' }}
              allowClear
            />
          </Col>
          
          <Col xs={12} md={4}>
            <Select
              placeholder='Filter by type'
              style={{ width: '100%' }}
              value={filterType}
              onChange={setFilterType}
              allowClear
            >
              <Option value='All'>All Types</Option>
              {propertyTypes.map(type => (
                <Option key={type} value={type}>{type}</Option>
              ))}
            </Select>
          </Col>
          
          <Col xs={12} md={4}>
            <Select
              placeholder='Filter by status'
              style={{ width: '100%' }}
              value={filterStatus}
              onChange={setFilterStatus}
              allowClear
            >
              <Option value='All'>All Statuses</Option>
              <Option value='Available'>Available</Option>
              <Option value='Pending'>Pending</Option>
              <Option value='Sold'>Sold</Option>
              <Option value='Rented'>Rented</Option>
            </Select>
          </Col>
          
          <Col xs={12} md={4}>
            <Select
              placeholder='Sort by'
              style={{ width: '100%' }}
              value={sortBy}
              onChange={setSortBy}
            >
              <Option value='CreationDate'>Date Added</Option>
              <Option value='title'>Title</Option>
              <Option value='SellPrice'>Sell Price</Option>
            </Select>
          </Col>
          
          <Col xs={12} md={4}>
            <Tooltip title={sortDirection === 'asc' ? 'Sort Ascending' : 'Sort Descending'}>
              <Button 
                icon={sortDirection === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />} 
                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                style={{ width: '100%' }}
              >
                {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
              </Button>
            </Tooltip>
          </Col>
        </Row>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert 
          message='Error' 
          description={error} 
          type='error' 
          showIcon 
          closable 
          style={{ marginBottom: '24px' }} 
        />
      )}

      {/* Properties Grid */}
      <Spin spinning={loading}>
        {properties.length === 0 && !loading ? (
          <Card>
            <Empty 
              description='No properties found' 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              {hasManagePermission && (
                <Button 
                  type='primary' 
                  icon={<PlusOutlined />}
                  onClick={handleAddProperty}
                >
                  Add Property
                </Button>
              )}
            </Empty>
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {filteredAndSortedProperties.map(property => (
              <Col xs={24} sm={12} lg={8} xl={6} key={property.id}>
                <PropertyCard 
                  property={property} 
                  onClick={handlePropertyClick}
                  onEdit={handleEditProperty}
                  onDelete={handleDeleteProperty}
                  currentUser={user}
                />
              </Col>
            ))}
            
            {filteredAndSortedProperties.length === 0 && properties.length > 0 && (
              <Col span={24}>
                <Empty description='No properties match your filters' />
              </Col>
            )}
          </Row>
        )}
      </Spin>

      {/* Property Form Modal */}
      <Modal
        title={currentProperty ? 'Edit Property' : 'Add New Property'}
        open={formVisible}
        onCancel={() => setFormVisible(false)}
        footer={null}
        width={800}
        destroyOnClose
      >
        <PropertyForm
          initialValues={currentProperty}
          onSave={handleFormSubmit}
          onCancel={() => setFormVisible(false)}
          loading={formLoading}
          currentUser={user}
        />
      </Modal>

      {/* Property Detail Drawer */}
      {selectedProperty && (
        <PropertyDetail
          property={selectedProperty}
          visible={detailVisible}
          onClose={() => setDetailVisible(false)}
          onEdit={handleEditProperty}
          onDelete={handleDeleteProperty}
          currentUser={user}
        />
      )}
    </div>
  );
};

export default PropertiesPage;