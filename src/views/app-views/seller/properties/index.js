// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout,
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Typography,
  Space,
  Progress,
  message,
  Spin
} from 'antd';
import {
  PlusOutlined,
  DollarOutlined,
  HomeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  UserOutlined,
  StarOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import PropertiesService from 'services/PropertiesService';
import SellerPropertyList from './components/SellerPropertyList';
import SellerPropertyForm from './components/SellerPropertyForm';
import SellerPropertyDetail from './components/SellerPropertyDetail';

const { Title, Text } = Typography;

/**
 * Seller Properties page - View and manage properties for the company
 */
const SellerPropertiesPage = () => {
  const user = useSelector(state => state.auth.user);
  const userId = user?.id;
  const companyId = user?.company_id;

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [monthlyStats, setMonthlyStats] = useState({
    total: 0,
    pending: 0,
    sold: 0,
    totalValue: 0,
    myProperties: 0,
    avgPrice: 0
  });

  // Fetch properties
  const fetchProperties = useCallback(async () => {
    if (!companyId) {
      console.log('Missing company data:', { companyId });
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching properties for company:', companyId);
      setLoading(true);
      const propertiesData = await PropertiesService.getCompanyProperties(companyId);
      console.log('Fetched properties:', propertiesData);
      setProperties(propertiesData);
      
      // Calculate monthly statistics
      calculateMonthlyStats(propertiesData);
    } catch (error) {
      console.error('Error fetching properties:', error);
      message.error('Failed to fetch properties');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // Calculate monthly statistics
  const calculateMonthlyStats = (propertiesData) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyProperties = propertiesData.filter(property => {
      const propertyDate = new Date(property.CreationDate);
      return propertyDate.getMonth() === currentMonth && propertyDate.getFullYear() === currentYear;
    });
    
    const totalValue = monthlyProperties.reduce((sum, property) => sum + (property.SellPrice || 0), 0);
    const myProperties = monthlyProperties.filter(property => property.creator_id === userId);
    
    const stats = {
      total: monthlyProperties.length,
      pending: monthlyProperties.filter(p => p.Status === 'Pending').length,
      sold: monthlyProperties.filter(p => p.Status === 'Sold').length,
      totalValue: totalValue,
      myProperties: myProperties.length,
      avgPrice: monthlyProperties.length > 0 ? totalValue / monthlyProperties.length : 0
    };
    
    setMonthlyStats(stats);
  };

  // Load properties on component mount
  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // Handle form submit (create/edit)
  const handleFormSubmit = async (propertyData) => {
    setFormLoading(true);
    try {
      if (selectedProperty) {
        // Edit existing property
        await PropertiesService.updateProperty(selectedProperty.id, propertyData);
        message.success('Property updated successfully');
      } else {
        // Create new property
        await PropertiesService.createProperty(propertyData);
        message.success('Property created successfully');
      }
      
      setFormVisible(false);
      setSelectedProperty(null);
      fetchProperties(); // Refresh the list
    } catch (error) {
      console.error('Error saving property:', error);
      message.error('Failed to save property');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle property deletion
  const handleDelete = async (propertyId) => {
    try {
      await PropertiesService.deleteProperty(propertyId);
      message.success('Property deleted successfully');
      fetchProperties(); // Refresh the list
      setDetailVisible(false);
    } catch (error) {
      console.error('Error deleting property:', error);
      message.error('Failed to delete property');
    }
  };

  // Handle adding note
  const handleAddNote = async (propertyId, noteText) => {
    try {
      await PropertiesService.addNote(propertyId, noteText);
      fetchProperties(); // Refresh to get updated property with new note
      
      // Update the selected property if detail view is open
      if (selectedProperty && selectedProperty.id === propertyId) {
        const updatedProperty = properties.find(p => p.id === propertyId);
        if (updatedProperty) {
          setSelectedProperty(updatedProperty);
        }
      }
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  };

  // Handle view property
  const handleView = (property) => {
    setSelectedProperty(property);
    setDetailVisible(true);
  };

  // Handle edit property
  const handleEdit = (property) => {
    setSelectedProperty(property);
    setFormVisible(true);
  };

  // Handle create new property
  const handleCreate = () => {
    setSelectedProperty(null);
    setFormVisible(true);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Calculate progress percentage
  const progressPercentage = monthlyStats.total > 0 
    ? Math.round((monthlyStats.sold / monthlyStats.total) * 100)
    : 0;

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p style={{ marginTop: '16px' }}>Loading user data...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <HomeOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <Title level={2} style={{ margin: 0 }}>Company Properties</Title>
            </Space>
            <Text type="secondary">Manage properties for your company</Text>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<ReloadOutlined />}
                onClick={fetchProperties}
                loading={loading}
              >
                Refresh
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleCreate}
              >
                Add Property
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Monthly Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Properties"
              value={monthlyStats.total}
              prefix={<HomeOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Value"
              value={formatCurrency(monthlyStats.totalValue)}
              prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Available"
              value={monthlyStats.pending}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Your Properties"
              value={monthlyStats.myProperties}
              prefix={<UserOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Progress Bar */}
      <Row style={{ marginBottom: '24px' }}>
        <Col xs={24}>
          <Card>
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Sales Progress</Text>
              <Text style={{ float: 'right' }}>
                {monthlyStats.sold} / {monthlyStats.total} properties sold
              </Text>
            </div>
            <Progress
              percent={progressPercentage}
              strokeColor={{
                '0%': '#52c41a',
                '100%': '#389e0d',
              }}
              trailColor="#f0f0f0"
              size={10}
            />
            <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">Average Price: {formatCurrency(monthlyStats.avgPrice)}</Text>
              <Text type="secondary">Sales Rate: {progressPercentage}%</Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Properties List */}
      <SellerPropertyList
        properties={properties}
        loading={loading}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={fetchProperties}
        currentUserId={userId}
      />

      {/* Property Form Modal */}
      <SellerPropertyForm
        visible={formVisible}
        onCancel={() => {
          setFormVisible(false);
          setSelectedProperty(null);
        }}
        onSubmit={handleFormSubmit}
        property={selectedProperty}
        loading={formLoading}
        userId={userId}
        companyId={companyId}
      />

      {/* Property Detail Drawer */}
      <SellerPropertyDetail
        visible={detailVisible}
        onClose={() => {
          setDetailVisible(false);
          setSelectedProperty(null);
        }}
        property={selectedProperty}
        onEdit={(property) => {
          setDetailVisible(false);
          setSelectedProperty(property);
          setFormVisible(true);
        }}
        onDelete={handleDelete}
        onAddNote={handleAddNote}
        canEdit={selectedProperty?.creator_id === userId}
      />
    </div>
  );
};

export default SellerPropertiesPage;