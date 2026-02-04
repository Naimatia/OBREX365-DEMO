import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Row,
  Col,
  Alert,
  Spin,
  Empty,
  Button,
  Affix,
  Progress,
  message,
  Input,
} from 'antd';
import { useSelector } from 'react-redux';
import {
  BuildOutlined,
  SearchOutlined,
  BarChartOutlined,
  ArrowUpOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import PropertyCard from './components/PropertyCard';
import PropertyDetail from './components/PropertyDetail';
import AnimatedCard from './components/AnimatedCard';
import SearchForm from './components/SearchForm';

const { Title, Paragraph } = Typography;
const { Search } = Input;

const PropertyScannerPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [allScrapedResults, setAllScrapedResults] = useState([]);
  const [displayedResults, setDisplayedResults] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [keyword, setKeyword] = useState('');

  const user = useSelector((state) => state.auth.user);

  // Progress animation
  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setLoadingProgress((prev) => Math.min(prev + Math.random() * 8, 92));
      }, 600);
    } else if (loadingProgress > 0) {
      setLoadingProgress(100);
      setTimeout(() => setLoadingProgress(0), 700);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Apply keyword filter in real-time
  useEffect(() => {
    if (!allScrapedResults.length) return;

    let filtered = [...allScrapedResults];

    if (keyword.trim()) {
      const term = keyword.toLowerCase().trim();
      filtered = filtered.filter((p) =>
        [
          p.title,
          p.description,
          p.location?.full_name,
          p.location?.city,
          p.reference,
        ].some((str) => str?.toLowerCase()?.includes(term))
      );
    }

    setDisplayedResults(filtered);
  }, [allScrapedResults, keyword]);

  const handleSearch = async (values) => {
    setLoading(true);
    setError(null);
    setAllScrapedResults([]);
    setDisplayedResults([]);
    setKeyword('');

    try {
      message.loading({ content: 'Scanning properties...', key: 'scan', duration: 0 });

      const params = {
        location: values.location,
        maxPages: values.maxPages || 3,
      };

      if (values.transactionType) params.transactionType = values.transactionType;
      if (values.property_type) params.category = values.property_type;

      // Handle bedrooms
      if (values.bedrooms) {
        if (values.bedrooms === 'studio') {
          params.bedrooms = 'studio';
        } else if (values.bedrooms === '5+') {
          params.bedrooms = '5,6,7,8,9,10'; // backend should split it
        } else {
          params.bedrooms = values.bedrooms;
        }
      }

      const res = await axios.get('https://property-scraper-duw1.onrender.com/api/scrape', { // ← CHANGE TO YOUR REAL BACKEND URL
        params,
        timeout: 240000,
      });

      const { listings } = res.data;

      const adapted = listings.map((item) => {
        const p = item.property || item;

        const priceValue = p.price?.value
          ? Number(p.price.value)
          : parseFloat(String(p.price || '0').replace(/[^0-9.]/g, '')) || 0;

        const priceText = p.price?.value
          ? `${priceValue.toLocaleString()} ${p.price.currency || 'AED'}`
          : 'Price on request';

        return {
          id: p.id || `pf-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          title: p.title || 'No title',
          price: priceText,
          priceNumeric: priceValue,
          location: {
            full_name: p.location?.full_name || 'Location not specified',
            path_name: p.location?.path_name || '',
            city: p.location?.path_name?.split(',')[0]?.trim() || '',
          },
          rooms: p.bedrooms || '–',
          bathrooms: p.bathrooms || '–',
          media: {
            cover_photo:
              p.images?.[0]?.medium ||
              p.images?.[0]?.small ||
              'https://placehold.co/400x260?text=No+Image',
            gallery: p.images?.map((img) => img.medium || img.small) || [],
          },
          description: p.description || '',
          amenities: p.amenity_names || p.amenities || [],
          completion_status: p.completion_status || '–',
          furnished: p.furnished || '–',
          rera: p.rera || null,
          reference: p.reference || '–',
          listed_date: p.listed_date || null,
          share_url: p.share_url || '#',
          type: {
            sub: p.property_type || 'Property',
          },
          raw: p,
        };
      });

      setAllScrapedResults(adapted);

      if (adapted.length > 0) {
        message.success(`Found ${adapted.length} properties`, 5);
      } else {
        message.info('No properties found in this search', 4);
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.message || 'Failed to scrape properties';
      setError(msg);
      message.error(msg, 6);
    } finally {
      setLoading(false);
      message.destroy('scan');
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="property-scanner-container" style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <Card
        className="shadow-lg mb-5"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: '16px',
          color: 'white',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 16, padding: 20 }}>
            <BuildOutlined style={{ fontSize: 48, color: 'white' }} />
          </div>
          <div>
            <Title level={2} style={{ color: 'white', margin: 0 }}>
              ORBREX365 Property Scanner
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: 17, marginTop: 8 }}>
              Find real estate opportunities across the UAE
            </Paragraph>
          </div>
        </div>
      </Card>

      <SearchForm onSearch={handleSearch} loading={loading} />

      {loading && (
        <Card className="text-center py-5 shadow-sm">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
          <Title level={4} className="mt-4">
            Scanning Property Finder...
          </Title>
          <Progress
            percent={Math.floor(loadingProgress)}
            status="active"
            strokeColor={{ from: '#108ee9', to: '#87d068' }}
            showInfo={false}
          />
        </Card>
      )}

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          className="mb-4"
        />
      )}

      {allScrapedResults.length > 0 && (
        <Card className="shadow-sm">
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <Title level={4} style={{ margin: 0 }}>
              <BarChartOutlined style={{ marginRight: 10 }} />
              Found {displayedResults.length} properties
            </Title>

            <div style={{ maxWidth: 360, flex: 1 }}>
              <Search
                placeholder="Search in results (title, location, ref...)"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                allowClear
              />
            </div>
          </div>

          {displayedResults.length > 0 ? (
            <Row gutter={[16, 24]}>
              {displayedResults.map((property, index) => (
                <Col xs={24} sm={12} md={8} lg={6} key={property.id + '-' + index}>
                  <AnimatedCard index={index}>
                    <PropertyCard property={property} onClick={() => handlePropertyClick(property)} />
                  </AnimatedCard>
                </Col>
              ))}
            </Row>
          ) : (
            <Empty
              description="No properties match your current filters"
              style={{ margin: '60px 0' }}
            />
          )}
        </Card>
      )}

      <PropertyDetail
        property={selectedProperty}
        visible={drawerVisible}
        onClose={handleDrawerClose}
      />

      <Affix style={{ position: 'fixed', right: 24, bottom: 24, display: showScrollTop ? 'block' : 'none' }}>
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