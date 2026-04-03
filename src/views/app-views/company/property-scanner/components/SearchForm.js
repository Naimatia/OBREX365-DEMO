import React, { useState } from 'react';
import { Form, Select, Button, Row, Col, Card, Typography, InputNumber, Divider } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';

const { Option } = Select;
const { Title } = Typography;

// ─── Locations (PropertyFinder IDs) ──────────────────────────────────────────
const LOCATIONS = [
  { label: 'Dubai (All)',                          value: '1'    },
  { label: 'Abu Dhabi',                            value: '3'    },
  { label: 'Sharjah',                              value: '4'    },
  { label: 'Ras Al Khaimah',                       value: '5'    },
  { label: 'Ajman',                                value: '6'    },
  { label: 'Umm Al Quwain',                        value: '7'    },
  { label: 'Fujairah',                             value: '8'    },
  { label: 'Downtown Dubai',                       value: '41'   },
  { label: 'Dubai Marina',                         value: '50'   },
  { label: 'Dubai Land',                           value: '115'  },
  { label: 'Dubai Creek Harbour',                  value: '1130' },
  { label: 'Mohammed Bin Rashid City (MBR City)',  value: '1129' },
  { label: 'Dubai Hills Estate',                   value: '1131' },
  { label: 'Business Bay',                         value: '15'   },
  { label: 'Palm Jumeirah',                        value: '13'   },
  { label: 'Jumeirah Village Circle (JVC)',         value: '90'   },
  { label: 'Jumeirah Beach Residence (JBR)',        value: '16'   },
  { label: 'Jumeirah Lake Towers (JLT)',            value: '17'   },
  { label: 'Jumeirah Islands',                     value: '92'   },
  { label: 'Jumeirah Park',                        value: '91'   },
  { label: 'International City',                   value: '18'   },
  { label: 'Al Furjan',                            value: '93'   },
  { label: 'Al Jaddaf',                            value: '94'   },
  { label: 'Dubai South',                          value: '95'   },
  { label: 'Jebel Ali',                            value: '19'   },
  { label: 'Arabian Ranches',                      value: '20'   },
  { label: 'Al Barari',                            value: '96'   },
  { label: 'Damac Hills',                          value: '97'   },
  { label: 'Tilal Al Ghaf',                        value: '1132' },
  { label: 'Emirates Living',                      value: '98'   },
];

// ─── Property types accepted by the API ──────────────────────────────────────
const PROPERTY_TYPES = [
  { label: 'Any',             value: ''               },
  { label: 'Apartment',       value: 'apartment'      },
  { label: 'Villa',           value: 'villa'          },
  { label: 'Townhouse',       value: 'townhouse'      },
  { label: 'Penthouse',       value: 'penthouse'      },
  { label: 'Duplex',          value: 'duplex'         },
  { label: 'Hotel Apartment', value: 'hotel-apartment'},
  { label: 'Whole Building',  value: 'whole-building' },
  { label: 'Land / Plot',     value: 'land'           },
  { label: 'Office',          value: 'office'         },
  { label: 'Retail / Shop',   value: 'retail'         },
  { label: 'Warehouse',       value: 'warehouse'      },
];

const BEDROOMS = [
  { label: 'Studio', value: '0' },
  { label: '1 BR',   value: '1' },
  { label: '2 BR',   value: '2' },
  { label: '3 BR',   value: '3' },
  { label: '4 BR',   value: '4' },
  { label: '5+ BR',  value: '5' },
];

const BATHROOMS = [
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '4', value: '4' },
  { label: '5+',value: '5' },
];

const AMENITIES = [
  { label: 'Balcony',          value: 'balcony'          },
  { label: 'Shared Pool',      value: 'shared_pool'      },
  { label: 'Private Pool',     value: 'private_pool'     },
  { label: 'Gym',              value: 'gym'              },
  { label: 'Parking',          value: 'covered_parking'  },
  { label: 'Kids Play Area',   value: 'kids_play_area'   },
  { label: 'Concierge',        value: 'concierge'        },
  { label: 'Security',         value: '24_hours_security'},
  { label: 'View of Water',    value: 'view_of_water'    },
  { label: 'View of Landmark', value: 'view_of_landmark' },
];

// Buy price options (AED)
const BUY_PRICES = [
  300_000, 400_000, 500_000, 750_000,
  1_000_000, 1_500_000, 2_000_000, 3_000_000,
  5_000_000, 7_500_000, 10_000_000, 15_000_000,
  20_000_000, 30_000_000, 50_000_000,
].map((v) => ({ label: v.toLocaleString(), value: String(v) }));

// Rent price options (AED / year)
const RENT_PRICES = [
  10_000, 20_000, 30_000, 40_000, 50_000,
  60_000, 75_000, 100_000, 150_000, 200_000, 300_000, 500_000,
].map((v) => ({ label: v.toLocaleString(), value: String(v) }));

// ─── SearchForm ───────────────────────────────────────────────────────────────
const SearchForm = ({ onSearch, loading }) => {
  const [form]        = Form.useForm();
  const [listingType, setListingType] = useState('buy');   // 'buy' | 'rent'

  const priceOptions = listingType === 'rent' ? RENT_PRICES : BUY_PRICES;

  const handleListingTypeChange = (val) => {
    setListingType(val);
    // Reset price fields when switching mode to avoid impossible ranges
    form.setFieldsValue({ minPrice: undefined, maxPrice: undefined });
  };

  const handleFinish = (values) => {
    onSearch({ ...values, listingType });
  };

  return (
    <Card className="shadow-sm mb-4">
      <Title level={4} className="mb-4">
        <SearchOutlined /> Property Scanner – UAE
      </Title>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{
          location:      '50',   // Dubai Marina
          property_type: 'apartment',
          bedrooms:      [],
          bathrooms:     [],
          amenities:     [],
          maxPages:      3,
        }}
      >
        {/* ── Row 1 – Core filters ── */}
        <Row gutter={[16, 0]}>
          {/* Listing type */}
          <Col xs={24} sm={12} md={4}>
            <Form.Item label="Listing Type">
              <Select value={listingType} onChange={handleListingTypeChange}>
                <Option value="buy">Buy</Option>
                <Option value="rent">Rent</Option>
              </Select>
            </Form.Item>
          </Col>

          {/* Location */}
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="location" label="Location">
              <Select showSearch placeholder="Select location" optionFilterProp="label">
                {LOCATIONS.map((loc) => (
                  <Option key={loc.value} value={loc.value} label={loc.label}>
                    {loc.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          {/* Property type */}
          <Col xs={24} sm={12} md={5}>
            <Form.Item name="property_type" label="Property Type">
              <Select placeholder="Any type" allowClear>
                {PROPERTY_TYPES.map((t) => (
                  <Option key={t.value} value={t.value}>{t.label}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          {/* Bedrooms (multi) */}
          <Col xs={24} sm={12} md={5}>
            <Form.Item name="bedrooms" label="Bedrooms">
              <Select mode="multiple" placeholder="Any" maxTagCount="responsive" allowClear>
                {BEDROOMS.map((b) => (
                  <Option key={b.value} value={b.value}>{b.label}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          {/* Bathrooms (multi) */}
          <Col xs={24} sm={12} md={4}>
            <Form.Item name="bathrooms" label="Bathrooms">
              <Select mode="multiple" placeholder="Any" maxTagCount="responsive" allowClear>
                {BATHROOMS.map((b) => (
                  <Option key={b.value} value={b.value}>{b.label}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* ── Row 2 – Price & Area ── */}
        <Row gutter={[16, 0]}>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="minPrice"
              label={`Min Price (AED${listingType === 'rent' ? '/yr' : ''})`}
            >
              <Select placeholder="No minimum" allowClear>
                <Option value="">No minimum</Option>
                {priceOptions.map((p) => (
                  <Option key={p.value} value={p.value}>{p.label}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="maxPrice"
              label={`Max Price (AED${listingType === 'rent' ? '/yr' : ''})`}
            >
              <Select placeholder="No maximum" allowClear>
                <Option value="">No maximum</Option>
                {priceOptions.map((p) => (
                  <Option key={p.value} value={p.value}>{p.label}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={4}>
            <Form.Item name="minArea" label="Min Area (sqft)">
              <InputNumber
                style={{ width: '100%' }}
                placeholder="e.g. 500"
                min={0}
                step={50}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={4}>
            <Form.Item name="maxArea" label="Max Area (sqft)">
              <InputNumber
                style={{ width: '100%' }}
                placeholder="e.g. 3000"
                min={0}
                step={50}
              />
            </Form.Item>
          </Col>

          {/* Furnishing */}
          <Col xs={24} sm={12} md={4}>
            <Form.Item name="furnishing" label="Furnishing">
              <Select placeholder="Any" allowClear>
                <Option value="furnished">Furnished</Option>
                <Option value="unfurnished">Unfurnished</Option>
                <Option value="partly_furnished">Partly Furnished</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* ── Row 3 – Mode-specific + Amenities + Pages ── */}
        <Row gutter={[16, 0]}>
          {/* Rent: frequency */}
          {listingType === 'rent' && (
            <Col xs={24} sm={12} md={5}>
              <Form.Item name="rent_frequency" label="Rent Frequency">
                <Select placeholder="Any" allowClear>
                  <Option value="yearly">Yearly</Option>
                  <Option value="monthly">Monthly</Option>
                  <Option value="weekly">Weekly</Option>
                  <Option value="daily">Daily</Option>
                </Select>
              </Form.Item>
            </Col>
          )}

          {/* Buy: completion status */}
          {listingType === 'buy' && (
            <Col xs={24} sm={12} md={5}>
              <Form.Item name="completion_status" label="Completion">
                <Select placeholder="Any" allowClear>
                  <Option value="ready">Ready</Option>
                  <Option value="off_plan">Off-Plan</Option>
                </Select>
              </Form.Item>
            </Col>
          )}

          {/* Amenities */}
          <Col xs={24} sm={24} md={13}>
            <Form.Item name="amenities" label="Amenities">
              <Select
                mode="multiple"
                placeholder="Select amenities"
                maxTagCount="responsive"
                allowClear
              >
                {AMENITIES.map((a) => (
                  <Option key={a.value} value={a.value}>{a.label}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          {/* Pages */}
          <Col xs={24} sm={12} md={3}>
            <Form.Item name="maxPages" label="Pages">
              <Select>
                {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                  <Option key={n} value={n}>{n}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          {/* Submit */}
          <Col xs={24} sm={12} md={3} style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Form.Item style={{ width: '100%', marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SearchOutlined />}
                loading={loading}
                block
                size="large"
              >
                Scan
              </Button>
            </Form.Item>
          </Col>
        </Row>

        <div style={{ marginTop: 4, color: '#888', fontSize: 12 }}>
          Tip: more pages = longer wait. Bedrooms &amp; bathrooms support multi-select.
        </div>
      </Form>
    </Card>
  );
};

SearchForm.propTypes = {
  onSearch: PropTypes.func.isRequired,
  loading:  PropTypes.bool.isRequired,
};

export default SearchForm;