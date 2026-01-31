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

import './components/property-scanner.css';

import SearchForm from './components/SearchForm';
import PropertyCard from './components/PropertyCard';
import PropertyDetail from './components/PropertyDetail';
import AnimatedCard from './components/AnimatedCard';

const { Title, Paragraph, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const PropertyScannerPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [allScrapedResults, setAllScrapedResults] = useState([]); // all fetched properties
  const [displayedResults, setDisplayedResults] = useState([]); // filtered ones
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [searchParams, setSearchParams] = useState(null);

  // Filter states
  const [keywordFilter, setKeywordFilter] = useState('');
  const [minPriceFilter, setMinPriceFilter] = useState(null);
  const [maxPriceFilter, setMaxPriceFilter] = useState(null);
  const [bedroomsFilter, setBedroomsFilter] = useState(null);

  const user = useSelector((state) => state.auth.user);

  const mainLocations = [
  { label: 'Dubai', value: 'dubai' },
  { label: 'Abu Dhabi', value: 'abu-dhabi' },
  { label: 'Sharjah', value: 'sharjah' },
  { label: 'Ras Al Khaimah', value: 'ras-al-khaimah' },
   { label: 'Ajman', value: 'ajman' },
   { label: 'Umm Al Quwain', value: 'umm-al-quwain' },
   { label: 'Fujairah', value: 'fujairah' },
];

const propertyTypes = [
  { label: 'Any Type', value: '' },
  { label: 'Apartment', value: 'apartment' },
  { label: 'Villa', value: 'villa' },
  { label: 'Townhouse', value: 'townhouse' },
  { label: 'Penthouse', value: 'penthouse' },
   { label: 'Duplex', value: 'duplex' },
      { label: 'Retail', value: 'retail' },
      { label: 'Shop', value: 'shop' },
   { label: 'Studio', value: 'studio' },
     { label: 'Labor Camp', value: 'labor camp' },
          { label: 'Farm', value: 'farm' },
   { label: 'Office Space', value: 'office space' },
];
const [propertyTypeFilter, setPropertyTypeFilter] = useState(null);
const [locationFilter, setLocationFilter] = useState(null);   // ← added for emirate/city

  // Progress animation
  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setLoadingProgress((prev) => {
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

  // Scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Apply filters whenever the source data or filter values change
useEffect(() => {
  if (!allScrapedResults.length) return;

  let filtered = [...allScrapedResults];

  // Keyword
  if (keywordFilter.trim()) {
    const term = keywordFilter.toLowerCase().trim();
    filtered = filtered.filter(
      (p) =>
        p.title?.toLowerCase().includes(term) ||
        p.location?.full_name?.toLowerCase().includes(term) ||
        p.location?.city?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
    );
  }

  // Location filter
  if (locationFilter) {
    filtered = filtered.filter((p) =>
      p.location?.city?.toLowerCase() === locationFilter ||
      p.location?.path_name?.toLowerCase().includes(locationFilter)
    );
  }

  // Property Type filter
  if (propertyTypeFilter) {
    filtered = filtered.filter(
      (p) => p.type?.sub?.toLowerCase() === propertyTypeFilter
    );
  }

  // Price min / max  (your existing code is ok, but improved parsing)
  if (minPriceFilter !== null) {
    filtered = filtered.filter((p) => {
      const priceNum = p.priceNumeric || parseFloat(p.price?.replace(/[^0-9.]/g, '')) || 0;
      return priceNum >= minPriceFilter;
    });
  }

  if (maxPriceFilter !== null) {
    filtered = filtered.filter((p) => {
      const priceNum = p.priceNumeric || parseFloat(p.price?.replace(/[^0-9.]/g, '')) || 999999999;
      return priceNum <= maxPriceFilter;
    });
  }

  // Bedrooms (your existing logic)
  if (bedroomsFilter !== null) {
    filtered = filtered.filter((p) => {
      const beds = Number(p.rooms) || 0;
      if (bedroomsFilter === '5+') return beds >= 5;
      return beds === Number(bedroomsFilter);
    });
  }

  setDisplayedResults(filtered);
}, [
  allScrapedResults,
  keywordFilter,
  locationFilter,
  propertyTypeFilter,
  minPriceFilter,
  maxPriceFilter,
  bedroomsFilter,
]);

  const handleSearch = async (formData) => {
    setLoading(true);
    setError(null);
    setAllScrapedResults([]); // reset
    setDisplayedResults([]);
    setSearchParams(formData);

    try {
      message.loading({ content: 'Scanning PropertyFinder.ae...', key: 'scrapeKey', duration: 0 });

      const res = await axios.get('https://propertyscraper.netlify.app/api/scrape', {
        params: {
          maxPages: formData.maxPages || 3,
        },
        timeout: 120000,
      });

      const { listings } = res.data;

      // Map data
const adaptedResults = listings.map((item) => {
  // Handle both nested (item.property) and flat structures

  const p = item.property || item;

      return {
        // Basic card fields
        id: p.id || p.listing_id || `pf-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: p.title || 'No title available',
        price: p.price?.value
          ? `${p.price.value.toLocaleString()} ${p.price.currency || 'AED'}`
          : 'Price on request',
        location: {
          full_name: p.location?.full_name || 'Location not specified',
          path_name: p.location?.path_name || '',
          city: p.location?.path_name?.split(',')[0]?.trim() || '',
        },
        rooms: p.bedrooms || 'N/A',
        bathrooms: p.bathrooms || 'N/A',
        media: {
          cover_photo: p.images?.[0]?.medium || p.images?.[0]?.small || 'https://placehold.co/400x250?text=No+Image',
          gallery: p.images?.map(img => img.medium || img.small) || [], // all images if needed
        },

        // Extra fields for PropertyDetail (all useful ones)
        description: p.description || 'No description available.',
        amenities: p.amenity_names || p.amenities || [],
        completion_status: p.completion_status || 'N/A',
        furnished: p.furnished || 'NO',
        rera: p.rera || null,
        reference: p.reference || 'N/A',
        listed_date: p.listed_date || null,
        share_url: p.share_url || p.details_path || '#',
        is_verified: p.is_verified || false,
        is_premium: p.is_premium || false,
        is_featured: p.is_featured || false,

        // Agent & Broker / Agency
        agent: p.agent
          ? {
              name: p.agent.name || 'N/A',
              email: p.agent.email || null,
              phone: p.agent.phone || null, // sometimes in contact_options
              image: p.agent.image || null,
              languages: p.agent.languages || [],
              is_super_agent: p.agent.is_super_agent || false,
            }
          : null,

        agency: p.broker || p.client
          ? {
              name: (p.broker || p.client).name || 'N/A',
              logo: (p.broker || p.client).logo || null,
              phone: (p.broker || p.client).phone || null,
              email: (p.broker || p.client).email || null,
              address: (p.broker || p.client).address || null,
            }
          : null,

        // For future use / statistics
        meta: {
          url: p.share_url || p.details_path,
          created_at: p.listed_date,
          images_count: p.images_count || p.images?.length || 0,
          listing_level: p.listing_level || 'standard',
        },

        // Type info
        type: {
          sub: p.property_type || 'Apartment',
          category_id: p.category_id || null,
        },

        // Raw original object (optional - for debugging or advanced use)
        raw: p,
      };
});

      // Add progressively
      setAllScrapedResults(adaptedResults);

      if (adaptedResults.length > 0) {
        message.success({
          content: `Found ${adaptedResults.length} properties`,
          key: 'scrapeKey',
          duration: 5,
        });
      } else {
        message.info({ content: 'No properties found', key: 'scrapeKey' });
      }
    } catch (err) {
      console.error('Scrape error:', err);
      const msg = err.response?.data?.message || err.message || 'Scraping failed';
      setError(msg);
      message.error({ content: msg, key: 'scrapeKey' });
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetFilters = () => {
    setKeywordFilter('');
    setMinPriceFilter(null);
    setMaxPriceFilter(null);
    setBedroomsFilter(null);
  };

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
          <div
            style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '12px',
              padding: '16px',
              marginRight: '20px',
            }}
          >
            <BuildOutlined style={{ fontSize: 36, color: '#fff' }} />
          </div>
          <div>
            <Title level={2} style={{ margin: 0, color: '#fff', fontWeight: 'bold' }}>
              🏠 OBREX365-Demo Property Scanner
            </Title>
            <Paragraph style={{ margin: '8px 0 0 0', color: 'rgba(255,255,255,0.9)', fontSize: '16px' }}>
              Find and analyze property listings from PropertyFinder.ae
            </Paragraph>
          </div>
        </div>

        <Alert
          message={`Welcome back, ${user?.firstname || 'User'}! 👋`}
          description="Scan properties across the UAE and filter results in real time."
          type="info"
          showIcon
          style={{
            background: 'rgba(255,255,255,0.95)',
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        />
      </Card>

      {/* Main search form (for new scraping) */}
      <SearchForm onSearch={handleSearch} loading={loading} />

      {/* Loading */}
      {loading && (
        <Card className="shadow-sm mb-4 text-center py-4">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 36 }} spin />} />
          <Title level={4} style={{ marginTop: '16px', marginBottom: '8px' }}>
            Scanning...
          </Title>
          <Paragraph>
            {searchParams?.property_type || 'Properties'} in {searchParams?.locationSlug || 'UAE'}
          </Paragraph>
          <Progress
            percent={Math.floor(loadingProgress)}
            status="active"
            strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
            style={{ marginTop: '20px' }}
          />
        </Card>
      )}

      {error && <Alert message="Error" description={error} type="error" showIcon />}

      {/* Results + Filters */}
      {allScrapedResults.length > 0 && (
        <Card className="shadow-sm mb-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={4}>
              <BarChartOutlined style={{ marginRight: '8px' }} />
              Property Results ({displayedResults.length} shown)
            </Title>

            <Button icon={<FilterOutlined />} onClick={resetFilters}>
              Reset Filters
            </Button>
          </div>

{/* Quick Filters */}
<Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
  {/* 1. Keyword search */}
  <Col xs={24} sm={12} md={6} lg={6}>
    <Search
      placeholder="Search title, location, description..."
      value={keywordFilter}
      onChange={(e) => setKeywordFilter(e.target.value)}
      allowClear
    />
  </Col>

  {/* 2. Location (Emirate) */}
  <Col xs={24} sm={12} md={6} lg={6}>
    <Select
      placeholder="Emirate / City"
      value={locationFilter}
      onChange={setLocationFilter}
      allowClear
      showSearch
      optionFilterProp="label"
      filterOption={(input, option) =>
        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
      }
      style={{ width: '100%' }}
    >
      {mainLocations.map((loc) => (
        <Option key={loc.value} value={loc.value} label={loc.label}>
          {loc.label}
        </Option>
      ))}
    </Select>
  </Col>

  {/* 3. Property Type */}
  <Col xs={24} sm={12} md={6} lg={6}>
    <Select
      placeholder="Property Type"
      value={propertyTypeFilter}
      onChange={setPropertyTypeFilter}
      allowClear
      showSearch
      optionFilterProp="label"
      filterOption={(input, option) =>
        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
      }
      style={{ width: '100%' }}
    >
      {propertyTypes.map((type) => (
        <Option key={type.value} value={type.value} label={type.label}>
          {type.label}
        </Option>
      ))}
    </Select>
  </Col>

  {/* 4. Min Price */}
  <Col xs={24} sm={12} md={6} lg={6}>
    <Input
      placeholder="Min Price (AED)"
      type="number"
      value={minPriceFilter || ''}
      onChange={(e) => setMinPriceFilter(e.target.value ? Number(e.target.value) : null)}
      addonAfter="AED"
    />
  </Col>

  {/* 5. Max Price */}
  <Col xs={24} sm={12} md={6} lg={6}>
    <Input
      placeholder="Max Price (AED)"
      type="number"
      value={maxPriceFilter || ''}
      onChange={(e) => setMaxPriceFilter(e.target.value ? Number(e.target.value) : null)}
      addonAfter="AED"
    />
  </Col>

  {/* 6. Bedrooms */}
  <Col xs={24} sm={12} md={6} lg={6}>
    <Select
      placeholder="Bedrooms"
      value={bedroomsFilter}
      onChange={setBedroomsFilter}
      allowClear
      style={{ width: '100%' }}
    >
      <Option value={1}>1 Bedroom</Option>
      <Option value={2}>2 Bedrooms</Option>
      <Option value={3}>3 Bedrooms</Option>
      <Option value={4}>4 Bedrooms</Option>
      <Option value="5+">5+ Bedrooms</Option>
    </Select>
  </Col>
</Row>

          {/* Results */}
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
            <Empty description="No properties match the current filters" />
          )}
        </Card>
      )}

      {/* Drawer */}
      <PropertyDetail property={selectedProperty} visible={drawerVisible} onClose={handleDrawerClose} />

      {/* Scroll to top */}
      <Affix style={{ position: 'fixed', right: 20, bottom: 20, display: showScrollTop ? 'block' : 'none' }}>
        <Button type="primary" shape="circle" icon={<ArrowUpOutlined />} size="large" onClick={handleScrollToTop} />
      </Affix>
    </div>
  );
};

export default PropertyScannerPage;