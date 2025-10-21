import React from 'react';
import { Card, Typography, Image } from 'antd';

const { Text } = Typography;

const PropertyCard = ({ property, onClick }) => {
  // Construct location string from location object
  const getLocationString = (location) => {
    if (!location) return 'Location not specified';
    const parts = [];
    if (location.city?.name) parts.push(location.city.name);
    if (location.community?.name) parts.push(location.community.name);
    if (location.sub_community?.name) parts.push(location.sub_community.name);
    return parts.join(', ') || 'Location not specified';
  };

  return (
    <Card
      hoverable
      onClick={() => onClick(property)}
      cover={
     <Image
  src={property.media?.cover_photo || 'https://placehold.co/400x250?text=No+Image+Available'}
  alt={property.title}
  style={{ height: '200px', objectFit: 'cover' }}
  fallback="https://placehold.co/400x250?text=No+Image+Available"
/>
      }
    >
      <Card.Meta
        title={property.title || 'Property Title'}
        description={
          <>
            <Text strong>Price: </Text>
            <Text>{property.price ? `${property.price} AED` : 'Price not available'}</Text>
            <br />
            <Text strong>Location: </Text>
            <Text>{getLocationString(property.location)}</Text>
            <br />
            <Text strong>Bedrooms: </Text>
            <Text>{property.rooms || 'N/A'}</Text>
            <br />
            <Text strong>Type: </Text>
            <Text>{property.category?.name || 'N/A'}</Text>
          </>
        }
      />
    </Card>
  );
};

export default PropertyCard;