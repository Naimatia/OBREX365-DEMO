// Simple script to create placeholder components for all defined routes
const fs = require('fs');
const path = require('path');

// Base directory for app views
const baseDir = path.join(__dirname, 'src', 'views', 'app-views');

// List of company routes that need placeholders
const companyRoutes = [
  { path: 'company/my-company', name: 'My Company' },
  { path: 'company/property-scanner', name: 'Property Scanner' },
  { path: 'company/todo', name: 'To Do' },
  { path: 'company/sellers', name: 'Sellers' },
  { path: 'company/contacts', name: 'Contacts' },
  { path: 'company/leads', name: 'Leads' },
  { path: 'company/deals', name: 'Deals' },
  { path: 'company/properties', name: 'Properties' },
  { path: 'company/history', name: 'History' },
  { path: 'company/invoices', name: 'Invoices' }
];

// List of seller routes that need placeholders
const sellerRoutes = [
  { path: 'seller/dashboard', name: 'Seller Dashboard' },
  { path: 'seller/property-scanner', name: 'Seller Property Scanner' },
  { path: 'seller/todo', name: 'Seller To Do' },
  { path: 'seller/contacts', name: 'Seller Contacts' },
  { path: 'seller/leads', name: 'Seller Leads' },
  { path: 'seller/deals', name: 'Seller Deals' },
  { path: 'seller/properties', name: 'Seller Properties' },
  { path: 'seller/invoices', name: 'Seller Invoices' }
];

// Combine all routes
const allRoutes = [...companyRoutes, ...sellerRoutes];

// Placeholder component template
const createPlaceholderContent = (pageName) => `import React from 'react';
import { Card, Typography, Space, Button } from 'antd';
import { useSelector } from 'react-redux';
import { FileProtectOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

/**
 * ${pageName} placeholder component
 * Will be implemented in a future sprint
 */
const ${pageName.replace(/\s/g, '')}Page = () => {
  const user = useSelector(state => state.auth.user);
  const userRole = user?.Role || 'User';

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="shadow-lg">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <FileProtectOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          </div>
          <Title level={2} style={{ textAlign: 'center' }}>${pageName}</Title>
          <Paragraph>
            This page will be implemented in a future sprint. It will contain all the functionality 
            related to managing ${pageName.toLowerCase()}.
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

export default ${pageName.replace(/\s/g, '')}Page;`;

// Create placeholder components for each route
allRoutes.forEach(route => {
  const dirPath = path.join(baseDir, route.path);
  const filePath = path.join(dirPath, 'index.js');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
  
  // Write placeholder component to file
  fs.writeFileSync(filePath, createPlaceholderContent(route.name));
  console.log(`Created placeholder for: ${route.name}`);
});

console.log('All placeholders created successfully!');
