import React, { useState, useEffect } from 'react';
import { Card, Typography, Space, Spin, Alert, Result, Button, message } from 'antd';
import { useSelector } from 'react-redux';
import { BuildOutlined, ExclamationCircleOutlined, EditOutlined } from '@ant-design/icons';
import CompanyForm from './CompanyForm';
import CompanyView from './CompanyView';
import companyService from 'services/CompanyService';
import { UserRoles } from 'models/UserModel';
import { USER_DATA } from 'constants/AuthConstant';

const { Title } = Typography;

/**
 * My Company page
 * - For CEOs without a company: shows company creation form
 * - For CEOs with a company: shows company details
 * - For other roles: shows company details if they belong to a company
 */
const MyCompanyPage = () => {
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  
  const user = useSelector(state => state.auth.user);
  const userRole = user?.Role || '';
  
  // Load company data if user has company_id
  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        if (user.company_id) {
          const companyData = await companyService.getCompanyById(user.company_id);
          setCompany(companyData);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching company data:', err);
        setError('Failed to load company data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchCompanyData();
  }, [user]);
  
  // Handle successful company creation
  const handleCompanyCreated = async () => {
    try {
      setLoading(true);
      message.success('Company created successfully!');
      
      // Get latest user data from Redux store
      const updatedUser = { ...user }; // Clone current user data
      
      // If localStorage has updated company_id, use it
      try {
        const localStorageData = JSON.parse(localStorage.getItem(USER_DATA));
        if (localStorageData && localStorageData.company_id) {
          updatedUser.company_id = localStorageData.company_id;
        }
      } catch (e) {
        console.warn('Error reading from localStorage:', e);
      }
      
      if (updatedUser.company_id) {
        // Fetch the company data directly
        const companyData = await companyService.getCompanyById(updatedUser.company_id);
        setCompany(companyData);
        setLoading(false);
      } else {
        // If we still don't have company_id, reload the page
        console.log('No company ID found in user data, reloading page');
        window.location.reload();
      }
    } catch (err) {
      console.error('Error after company creation:', err);
      setError('Company was created but failed to load details. Please refresh the page.');
      setLoading(false);
    }
  };
  
  // Handle successful company update
  const handleCompanyUpdated = async () => {
    try {
      setLoading(true);
      // Fetch the updated company data
      if (user?.company_id) {
        const companyData = await companyService.getCompanyById(user.company_id);
        setCompany(companyData);
        setEditMode(false); // Exit edit mode after successful update
        message.success('Company details updated successfully!');
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching updated company data:', err);
      setError('Company was updated but failed to load new details. Please refresh the page.');
      setLoading(false);
    }
  };
  
  // Toggle edit mode
  const toggleEditMode = () => {
    setEditMode(!editMode);
  };
  
  // If loading
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Spin size="large" />
        <p className="mt-3">Loading company information...</p>
      </div>
    );
  }
  
  // If error
  if (error) {
    return (
      <Alert
        message="Error"
        description={error}
        type="error"
        showIcon
      />
    );
  }
  
  // If not CEO or HR and has no company
  if (userRole !== UserRoles.CEO && userRole !== UserRoles.HR && !company) {
    return (
      <Result
        status="warning"
        title="No Company Information"
        icon={<ExclamationCircleOutlined />}
        subTitle="You are not associated with any company in the system."
      />
    );
  }
  
  // For CEO without company - show company creation form
  if (userRole === UserRoles.CEO && !company) {
    return (
      <div className="container mx-auto px-4 py-4">
        <div className="text-center mb-4">
          <Space direction="vertical">
            <BuildOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            <Title level={3}>Welcome to OBREX365</Title>
            <p>
              Let's set up your company profile. This information will be visible to all members 
              of your organization and is required to fully utilize OBREX365.
            </p>
          </Space>
        </div>
        
        <CompanyForm onSuccess={handleCompanyCreated} />
      </div>
    );
  }
  
  // For CEO with company - show company details with edit option
  // or the edit form if in edit mode
  if (userRole === UserRoles.CEO && company) {
    return (
      <div className="container mx-auto px-4 py-4">
        <div className="mb-4 d-flex align-items-center justify-content-between">
          <Title level={3}>My Company</Title>
          {!editMode && (
            <Button 
              type="primary" 
              icon={<EditOutlined />} 
              onClick={toggleEditMode}
            >
              Edit Company Details
            </Button>
          )}
          {editMode && (
            <Button 
              onClick={toggleEditMode}
            >
              Cancel
            </Button>
          )}
        </div>
        
        {editMode ? (
          <Card>
            <CompanyForm 
              onSuccess={handleCompanyUpdated} 
              initialValues={company} 
              isEditing={true} 
            />
          </Card>
        ) : (
          <CompanyView company={company} />
        )}
      </div>
    );
  }
  
  // For non-CEO users with company - show company details only
  if (company) {
    return (
      <div className="container mx-auto px-4 py-4">
        <div className="mb-4">
          <Title level={3}>My Company</Title>
        </div>
        <CompanyView company={company} />
      </div>
    );
  }
  
  // This should not be reached but as a fallback
  return (
    <Result
      status="warning"
      title="No Company Information Available"
      subTitle="Something went wrong. Please refresh the page or contact support."
    />
  );
};

export default MyCompanyPage;