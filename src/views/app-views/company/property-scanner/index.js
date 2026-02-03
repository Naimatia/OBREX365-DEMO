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
  Select,
} from 'antd';
import { useSelector } from 'react-redux';
import {
  BuildOutlined,
  SearchOutlined,
  BarChartOutlined,
  ArrowUpOutlined,
  LoadingOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import axios from 'axios';

import SearchForm from './components/SearchForm';
import PropertyCard from './components/PropertyCard';
import PropertyDetail from './components/PropertyDetail';
import AnimatedCard from './components/AnimatedCard';

const { Title, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

const PropertyScannerPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [allScrapedResults, setAllScrapedResults] = useState([]);
  const [displayedResults, setDisplayedResults] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Holds the filters from the last scan (applied automatically)
  const [formFilters, setFormFilters] = useState({
    property_type: null,
    bedrooms: null,
    price_range: null,
    keyword: '',
  });

  const user = useSelector((state) => state.auth.user);

  // Progress animation
  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setLoadingProgress((prev) => Math.min(prev + Math.random() * 6, 90));
      }, 700);
    } else if (loadingProgress > 0) {
      setLoadingProgress(100);
      setTimeout(() => setLoadingProgress(0), 800);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Scroll to top
  useEffect(() => {
    const handle = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handle);
    return () => window.removeEventListener('scroll', handle);
  }, []);

  // Filter logic — runs after scrape + when user changes any filter
  useEffect(() => {
    if (allScrapedResults.length === 0) {
      setDisplayedResults([]);
      return;
    }

    let res = [...allScrapedResults];

    // Keyword (refinement)
    if (formFilters.keyword.trim()) {
      const term = formFilters.keyword.toLowerCase().trim();
      res = res.filter((p) =>
        [p.title, p.description, p.location?.full_name, p.location?.city]
          .some((str) => str?.toLowerCase().includes(term))
      );
    }


    // Property Type (from form)
    if (formFilters.property_type) {
      res = res.filter(
        (p) => p.type?.sub?.toLowerCase() === formFilters.property_type.toLowerCase()
      );
    }

    // Price range (from form)
    if (formFilters.price_range) {
      const [minStr, maxStr] = formFilters.price_range.split('-');
      const min = minStr ? Number(minStr) : null;
      const max = maxStr && maxStr !== '' ? Number(maxStr) : null;

      res = res.filter((p) => {
        const val = p.priceNumeric || parseFloat((p.price || '0').replace(/[^0-9.]/g, '')) || 0;
        if (min !== null && val < min) return false;
        if (max !== null && val > max) return false;
        return true;
      });
    }

    // Bedrooms (from form)
    if (formFilters.bedrooms) {
      res = res.filter((p) => {
        const beds = Number(p.rooms) || 0;
        if (formFilters.bedrooms === 'studio') return beds <= 1 && beds !== '';
        if (formFilters.bedrooms === '5+') return beds >= 5;
        return beds === Number(formFilters.bedrooms);
      });
    }

    setDisplayedResults(res);
  }, [allScrapedResults, formFilters]);

  const handleSearch = async (values) => {
    setLoading(true);
    setError(null);
    setAllScrapedResults([]);
    setDisplayedResults([]);

    // Remember filters so we apply them right after receiving data
    setFormFilters({
      property_type: values.property_type || null,
      bedrooms: values.bedrooms || null,
      price_range: values.price_range || null,
      keyword: '',
    });

    try {
      message.loading({ content: 'Scanning Property...', key: 'scan', duration: 0 });

      const res = await axios.get('https://property-scraper-duw1.onrender.com/api/scrape', {
        params: {
          location: values.location,           // "41", "14", "1", etc.
          maxPages: values.maxPages || 3,
        },
        timeout: 180000,
      });

      const { listings } = res.data;

      const adaptedResults = listings.map((item) => {
        const p = item.property || item;
        const priceNum = p.price?.value
          ? Number(p.price.value)
          : parseFloat((p.price || '0').replace(/[^0-9.]/g, '')) || 0;

        return {
          id: p.id || p.listing_id || `pf-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          title: p.title || 'No title available',
          price: p.price?.value
            ? `${p.price.value.toLocaleString()} ${p.price.currency || 'AED'}`
            : 'Price on request',
          priceNumeric: priceNum,
          location: {
            full_name: p.location?.full_name || 'Location not specified',
            path_name: p.location?.path_name || '',
            city: p.location?.path_name?.split(',')[0]?.trim() || '',
          },
          rooms: p.bedrooms || 'N/A',
          bathrooms: p.bathrooms || 'N/A',
          media: {
            cover_photo: p.images?.[0]?.medium || p.images?.[0]?.small || 'https://placehold.co/400x250?text=No+Image',
            gallery: p.images?.map((img) => img.medium || img.small) || [],
          },
          description: p.description || 'No description available.',
          amenities: p.amenity_names || p.amenities || [],
          completion_status: p.completion_status || 'N/A',
          furnished: p.furnished || 'NO',
          rera: p.rera || null,
          reference: p.reference || 'N/A',
          listed_date: p.listed_date || null,
          share_url: p.share_url || p.details_path || '#',
          is_verified: p.is_verified || false,
          type: {
            sub: p.property_type || 'Apartment',
          },
          raw: p,
        };
      });

      setAllScrapedResults(adaptedResults);

      if (adaptedResults.length > 0) {
        message.success({
          content: `Found ${adaptedResults.length} properties — filters applied`,
          key: 'scan',
          duration: 5,
        });
      } else {
        message.info({ content: 'No properties found', key: 'scan' });
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.message || 'Scraping failed';
      setError(msg);
      message.error({ content: msg, key: 'scan' });
    } finally {
      setLoading(false);
      message.destroy('scan');
    }
  };

  const handlePropertyClick = (property) => {
    setSelectedProperty(property);
    setDrawerVisible(true);
  };

  const handleDrawerClose = () => setDrawerVisible(false);

  const handleScrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });



  return (
    <div className="property-scanner-container">
      {/* Header */}
      <Card
        className="shadow-lg mb-4"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '16px', marginRight: '20px' }}>
            <BuildOutlined style={{ fontSize: 36, color: '#fff' }} />
          </div>
          <div>
            <Title level={2} style={{ margin: 0, color: '#fff', fontWeight: 'bold' }}>
              🏠 ORBREX365 Property Scanner
            </Title>
            <Paragraph style={{ margin: '8px 0 0 0', color: 'rgba(255,255,255,0.9)', fontSize: '16px' }}>
              Find and filter property listings
            </Paragraph>
          </div>
        </div>

        <Alert
          message={`Welcome back, ${user?.firstname || 'User'}! 👋`}
          description="Select filters and scan — results are filtered instantly."
          type="info"
          showIcon
          style={{ background: 'rgba(255,255,255,0.95)', border: 'none', borderRadius: '8px' }}
        />
      </Card>

      <SearchForm onSearch={handleSearch} loading={loading} />

      {loading && (
        <Card className="shadow-sm mb-4 text-center py-4">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 36 }} spin />} />
          <Title level={4} style={{ marginTop: '16px', marginBottom: '8px' }}>
            Scanning...
          </Title>
          <Progress
            percent={Math.floor(loadingProgress)}
            status="active"
            strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
          />
        </Card>
      )}

      {error && <Alert message="Error" description={error} type="error" showIcon />}

      {allScrapedResults.length > 0 && (
        <Card className="shadow-sm mb-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
           <Title level={4}>
  <BarChartOutlined style={{ marginRight: 8 }} />
  Results: {displayedResults.length}
</Title>

          
          </div>

          {/* Refinement controls */}
          <Row gutter={[12, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Search
                placeholder="Quick search in results..."
                value={formFilters.keyword}
                onChange={(e) => setFormFilters((prev) => ({ ...prev, keyword: e.target.value }))}
                allowClear
              />
            </Col>
          </Row>

          {displayedResults.length > 0 ? (
            <Row gutter={[16, 16]}>
              {displayedResults.map((property, index) => (
                <Col xs={24} sm={12} md={8} lg={6} key={`${property.id}-${index}`}>
                  <AnimatedCard index={index}>
                    <PropertyCard property={property} onClick={handlePropertyClick} />
                  </AnimatedCard>
                </Col>
              ))}
            </Row>
          ) : (
            <Empty description="No properties match the current filters — try adjusting them" />
          )}
        </Card>
      )}

      <PropertyDetail property={selectedProperty} visible={drawerVisible} onClose={handleDrawerClose} />

      <Affix style={{ position: 'fixed', right: 20, bottom: 20, display: showScrollTop ? 'block' : 'none' }}>
        <Button type="primary" shape="circle" icon={<ArrowUpOutlined />} size="large" onClick={handleScrollToTop} />
      </Affix>
    </div>
  );
};

export default PropertyScannerPage;