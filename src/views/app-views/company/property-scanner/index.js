import React, { useState, useEffect } from 'react';
import { Card, Typography, Row, Col, Alert, Spin, Empty, Button, Affix, Progress, message } from 'antd';
import { useSelector } from 'react-redux';
import { BuildOutlined, SearchOutlined, BarChartOutlined, ArrowUpOutlined, LoadingOutlined } from '@ant-design/icons';
import axios from 'axios';

// Import CSS
import './components/property-scanner.css';

// Import custom components
import SearchForm from './components/SearchForm';
import PropertyCard from './components/PropertyCard';
import PropertyDetail from './components/PropertyDetail';
import SearchStatistics from './components/SearchStatistics';
import AnimatedCard from './components/AnimatedCard';

const { Title, Paragraph, Text } = Typography;

const PropertyScannerPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [searchParams, setSearchParams] = useState(null);
  
  const user = useSelector(state => state.auth.user);

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setLoadingProgress(prev => {
          const newProgress = prev + Math.random() * 5;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 800);
    } else if (loadingProgress > 0) {
      setLoadingProgress(100);
      setTimeout(() => setLoadingProgress(0), 1000);
    }

    return () => clearInterval(interval);
  }, [loading, loadingProgress]);
  
  const handleSearch = async (data) => {
    setLoading(true);
    setError(null);
    setSearchResults(null);
    setSearchParams(data.searchParams);
    setLoadingProgress(10);
    
    try {
      message.loading({ content: 'Scanning for properties...', key: 'propertySearch', duration: 0 });
      // Ensure unique properties by id
      const uniqueResults = data.results.filter(
        (prop, index, self) => index === self.findIndex((p) => p.id === prop.id)
      );
      setSearchResults({ ...data, results: uniqueResults });
      console.log('Search results:', { ...data, results: uniqueResults });
      
      if (uniqueResults.length > 0) {
        message.success({ 
          content: `Found ${uniqueResults.length} properties in ${data.searchParams?.main_location || ''}`, 
          key: 'propertySearch',
          duration: 3 
        });
      } else {
        message.info({ 
          content: 'No properties found matching your criteria', 
          key: 'propertySearch',
          duration: 3 
        });
      }
    } catch (err) {
      console.error('Error processing properties:', err);
      setError(err.message || 'Failed to process property listings. Please try again later.');
      message.error({ 
        content: 'Failed to process property listings. Please try again.', 
        key: 'propertySearch',
        duration: 3 
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyClick = (property) => {
    setSelectedProperty(property);
    setDrawerVisible(true);
  };

  const handleDrawerClose = () => {
    setDrawerVisible(false);
  };

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  React.useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="property-scanner-container">
      <Card 
        className="shadow-lg mb-4" 
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '12px',
            padding: '16px',
            marginRight: '20px'
          }}>
            <BuildOutlined style={{ fontSize: 36, color: '#fff' }} />
          </div>
          <div>
            <Title level={2} style={{ margin: 0, color: '#fff', fontWeight: 'bold' }}>
              🏠 OBREX365-Demo Property Scanner
            </Title>
            <Paragraph style={{ margin: '8px 0 0 0', color: 'rgba(255,255,255,0.9)', fontSize: '16px' }}>
              Find and analyze property listings from multiple sources using OBREX's advanced scanning technology.
              Perfect for agents, investors, and property seekers.
            </Paragraph>
          </div>
        </div>
        
        <Alert 
          message={`Welcome back, ${user?.firstname || 'User'}! 👋`}
          description="Use the search form below to scan for properties across the UAE. Select your preferred criteria and click 'Start Scan' to discover amazing properties."
          type="info" 
          showIcon 
          style={{
            background: 'rgba(255,255,255,0.95)',
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        />
      </Card>
      
      <SearchForm onSearch={handleSearch} loading={loading} />
      
      {loading && (
        <Card className="shadow-sm mb-4 text-center py-4">
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 36 }} spin />} />
            <Title level={4} style={{ marginTop: '16px', marginBottom: '8px' }}>
              Scanning for Properties
            </Title>
            <Paragraph>
              Searching for {searchParams?.property_type || 'properties'} in {searchParams?.sub_location || ''}, {searchParams?.main_location || ''}.
              This may take up to a minute...
            </Paragraph>
            <Progress 
              percent={Math.floor(loadingProgress)} 
              status="active"
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
              style={{ marginTop: '20px' }}
            />
          </div>
        </Card>
      )}
      
      {error && (
        <Alert message="Error" description={error} type="error" showIcon />
      )}
      
      {searchResults && !loading && (
        <>
       {/*    <SearchStatistics meta={searchResults.meta} searchParams={searchParams} />*/}
          
          {searchResults.results?.length > 0 ? (
            <>
              <Card className="shadow-sm mb-4">
                <Title level={4}>
                  <BarChartOutlined style={{ marginRight: '8px' }} />
                  Property Results
                </Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
                  Showing {searchResults.results.length} of {searchResults.meta?.total_count || searchResults.results.length} properties
                </Text>
                
                <Row gutter={[16, 16]}>
                  {searchResults.results.map((property, index) => (
                    <Col xs={24} sm={12} md={8} lg={6} key={`${property.id}-${index}`}>
                      <AnimatedCard index={index}>
                        <PropertyCard property={property} onClick={handlePropertyClick} />
                      </AnimatedCard>
                    </Col>
                  ))}
                </Row>
              </Card>
            </>
          ) : (
            <Empty 
              description="No properties found matching your criteria" 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </>
      )}
      
      <PropertyDetail 
        property={selectedProperty}
        visible={drawerVisible}
        onClose={handleDrawerClose}
      />
      
      <Affix style={{ position: 'fixed', right: 20, bottom: 20, display: showScrollTop ? 'block' : 'none' }}>
        <Button 
          type="primary" 
          shape="circle" 
          icon={<ArrowUpOutlined />} 
          size="large"
          onClick={handleScrollToTop}
        />
      </Affix>
    </div>
  );
};

export default PropertyScannerPage;