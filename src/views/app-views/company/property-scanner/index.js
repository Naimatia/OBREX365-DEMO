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

// ─── RapidAPI config ──────────────────────────────────────────────────────────
const RAPIDAPI_KEY = '880ad61b47msh81af58585b3a6e2p17a770jsnab8d05748843';
const RAPIDAPI_HOST = 'propertyfinder-uae-data.p.rapidapi.com';
const RAPIDAPI_HEADERS = {
  'Content-Type': 'application/json',
  'x-rapidapi-host': RAPIDAPI_HOST,
  'x-rapidapi-key': RAPIDAPI_KEY,
};

// ─── Adapt listing ────────────────────────────────────────────────────────────
const adaptListing = (p) => {
  const priceValue = p.price?.value ? Number(p.price.value) : 0;
  const currency = p.price?.currency || 'AED';
  const priceText = priceValue
    ? `${priceValue.toLocaleString()} ${currency}`
    : 'Price on request';

  const locationFull =
    p.address?.full_name ||
    (p.location_tree?.map((l) => l.name).join(', ') ?? 'Location not specified');

  const city = p.location_tree?.[0]?.name || '';

  const images = Array.isArray(p.images) ? p.images : [];

  return {
    id: p.property_id || `pf-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    title: p.title || 'No title',
    price: priceText,
    priceNumeric: priceValue,
    location: {
      full_name: locationFull,
      path_name: p.location_tree?.map((l) => l.name).join(', ') || '',
      city,
    },
    rooms: p.bedrooms || '–',
    bathrooms: p.bathrooms || '–',
    size: p.size?.value ? `${p.size.value} ${p.size.unit || 'sqft'}` : '–',
    media: {
      cover_photo: images[0] || 'https://placehold.co/400x260?text=No+Image',
      gallery: images,
    },
    description: p.description || '',
    amenities: p.amenity_names || p.amenities || [],
    completion_status: p.completion_status || '–',
    furnished: p.furnishing || '–',
    is_verified: p.is_verified || false,
    rera: p.rera || null,
    reference: p.reference_number || '–',
    listed_date: p.listed_date || null,
    share_url: p.property_url || '#',
    agent: p.agent_details || null,
    type: {
      sub: p.property_type || 'Property',
    },
    raw: p,
  };
};

// ─── Component ────────────────────────────────────────────────────────────────
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

  // Scroll-to-top
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Real-time keyword filter
  useEffect(() => {
    if (!allScrapedResults.length) return;
    const term = keyword.toLowerCase().trim();
    const filtered = term
      ? allScrapedResults.filter((p) =>
          [p.title, p.description, p.location?.full_name, p.location?.city, p.reference]
            .some((s) => s?.toLowerCase().includes(term))
        )
      : [...allScrapedResults];
    setDisplayedResults(filtered);
  }, [allScrapedResults, keyword]);

  // ── Main search handler (using correct /search-buy and /search-rent endpoints) ──
  const handleSearch = async (values) => {
    setLoading(true);
    setError(null);
    setAllScrapedResults([]);
    setDisplayedResults([]);
    setKeyword('');

    try {
      message.loading({ content: 'Scanning properties...', key: 'scan', duration: 0 });

      const isRent = values.listingType === 'rent';
      const endpoint = `https://${RAPIDAPI_HOST}/${isRent ? 'search-rent' : 'search-buy'}`;
      const maxPages = values.maxPages || 3;

      const baseParams = {
        sort: 'newest',
        location_id: values.location,
        page: 1, // will be overridden in loop
      };

      // Shared filters
      if (values.property_type) baseParams.property_type = values.property_type;
      if (values.bedrooms?.length) baseParams.bedrooms = values.bedrooms.join(',');
      if (values.bathrooms?.length) baseParams.bathrooms = values.bathrooms.join(',');
      if (values.minPrice) baseParams.price_min = values.minPrice;
      if (values.maxPrice) baseParams.price_max = values.maxPrice;
      if (values.minArea) baseParams.area_min = values.minArea;
      if (values.maxArea) baseParams.area_max = values.maxArea;
      if (values.furnishing) baseParams.furnishing = values.furnishing;
      if (values.amenities?.length) baseParams.amenities = values.amenities.join(',');

      // Rent-specific
      if (isRent && values.rent_frequency) baseParams.rent_frequency = values.rent_frequency;

      // Buy-specific
      if (!isRent && values.completion_status) baseParams.completion_status = values.completion_status;

      let allListings = [];

      for (let page = 1; page <= maxPages; page++) {
        const res = await axios.get(endpoint, {
          params: { ...baseParams, page },
          headers: RAPIDAPI_HEADERS,
          timeout: 30000,
        });

        // Most responses from this API put listings under .data
        const pageListings = res.data?.data || res.data?.listings || [];
        if (!pageListings.length) break;

        allListings = allListings.concat(pageListings);
      }

      const adapted = allListings.map(adaptListing);
      setAllScrapedResults(adapted);

      if (adapted.length > 0) {
        message.success(`Found ${adapted.length} properties`, 5);
      } else {
        message.info('No properties found for this search', 4);
      }
    } catch (err) {
      console.error('Search error:', err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to fetch properties';
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

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <Card
        className="shadow-lg mb-5"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: '16px',
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

      {error && <Alert message="Error" description={error} type="error" showIcon className="mb-4" />}

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
                <Col xs={24} sm={12} md={8} lg={6} key={`${property.id}-${index}`}>
                  <AnimatedCard index={index}>
                    <PropertyCard
                      property={property}
                      onClick={() => handlePropertyClick(property)}
                    />
                  </AnimatedCard>
                </Col>
              ))}
            </Row>
          ) : (
            <Empty description="No properties match your current filters" style={{ margin: '60px 0' }} />
          )}
        </Card>
      )}

      <PropertyDetail
        property={selectedProperty}
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      />

      <Affix
        style={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          display: showScrollTop ? 'block' : 'none',
        }}
      >
        <Button
          type="primary"
          shape="circle"
          icon={<ArrowUpOutlined />}
          size="large"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        />
      </Affix>
    </div>
  );
};

export default PropertyScannerPage;