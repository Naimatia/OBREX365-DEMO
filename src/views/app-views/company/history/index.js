import React from 'react';
import { Card, Typography, Space, Button } from 'antd';
import { useSelector } from 'react-redux';
import { FileProtectOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

/**
 * History placeholder component
 * Will be implemented in a future sprint
 */
const HistoryPage = () => {
  const user = useSelector(state => state.auth.user);
  const userRole = user?.Role || 'User';

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="shadow-lg">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <FileProtectOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          </div>
          <Title level={2} style={{ textAlign: 'center' }}>History</Title>
          <Paragraph>
            This page will be implemented in a future sprint. It will contain all the functionality 
            related to managing history.
          </Paragraph>
          <Paragraph strong>
            Current user: {user?.firstname} {user?.lastname}
          </Paragraph>
          <Paragraph>
            Role: {userRole}
          </Paragraph>
          <Paragraph type="secondary">
            Authorized access: This page is accessible based on your current role permissions.
          </Paragraph>
        </Space>
      </Card>
    </div>
  );
};

export default HistoryPage;