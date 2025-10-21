import React from 'react';
import { Card, Typography, Space, Button } from 'antd';
import { useSelector } from 'react-redux';

const { Title, Paragraph } = Typography;

/**
 * Placeholder component for pages that are not yet implemented
 * Displays user information and page details
 */
const PlaceholderPage = ({ pageName = 'Page', description = 'This page will be implemented soon.' }) => {
  const user = useSelector(state => state.auth.user);
  const userRole = user?.Role || 'User';

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="shadow-lg">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Title level={2}>{pageName}</Title>
          <Paragraph>
            {description}
          </Paragraph>
          <Paragraph strong>
            Current user: {user?.firstname} {user?.lastname}
          </Paragraph>
          <Paragraph>
            Role: {userRole}
          </Paragraph>
          <Paragraph type="secondary">
            This is a placeholder for the {pageName.toLowerCase()} functionality.
            The actual implementation will be added in future updates.
          </Paragraph>
        </Space>
      </Card>
    </div>
  );
};

export default PlaceholderPage;
