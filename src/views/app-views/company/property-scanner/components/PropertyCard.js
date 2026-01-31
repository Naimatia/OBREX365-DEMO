import React from 'react';
import { Card, Typography, Image } from 'antd';

const { Text } = Typography;

const PropertyCard = ({ property, onClick }) => {
  const getLocationString = (location) => {
    if (!location) return 'Location not specified';
    return location.full_name || 'Location not specified';
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
            <Text>{property.price || 'Price not available'}</Text>
            <br />
            <Text strong>Location: </Text>
            <Text>{getLocationString(property.location)}</Text>
            <br />
            <Text strong>Bedrooms: </Text>
            <Text>{property.rooms || 'N/A'}</Text>
            <br />
            <Text strong>Type: </Text>
            <Text>{property.type?.sub || 'N/A'}</Text>
          </>
        }
      />
    </Card>
  );
};

export default PropertyCard;