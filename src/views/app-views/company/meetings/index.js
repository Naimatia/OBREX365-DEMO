// MeetingsPage.js - Updated with notification handling

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Typography, 
  Modal, 
  message, 
  Button, 
  Spin, 
  Alert, 
  Row, 
  Col,
  notification
} from 'antd';
import { useSelector } from 'react-redux';
import { 
  CalendarOutlined, 
  PlusOutlined, 
  TeamOutlined,
  MailOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';

// Import components
import MeetingCalendar from './components/MeetingCalendar';
import MeetingForm from './components/MeetingForm';
import MeetingDetail from './components/MeetingDetail';

// Import services
import MeetingService from './services/MeetingService';

// Import Firebase
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from 'configs/FirebaseConfig';

const { Title, Text } = Typography;
const { confirm } = Modal;

/**
 * MeetingsPage component for managing company meetings
 */
const MeetingsPage = () => {
  // State for authentication and user data
  const [user, setUser] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // State for meetings data
  const [meetings, setMeetings] = useState([]);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // UI state
  const [formVisible, setFormVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState(null);
  
  // Get current user from Redux store as backup
  const reduxUser = useSelector(state => state.auth.user);

  // Check authentication and set user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
        
        if (reduxUser) {
          let compId = null;
          const possibleFields = ['company_id', 'companyId', 'company', 'companyID', 'organizationId', 'organization_id'];
          for (const field of possibleFields) {
            if (reduxUser && reduxUser[field]) {
              compId = reduxUser[field];
              break;
            }
          }
          
          if (compId) {
            setCompanyId(compId);
          } else {
            console.error('No company ID found in user data');
            setError('Unable to load company data. Please try again later.');
          }
        }
      } else {
        setUser(null);
        setCompanyId(null);
      }
      setAuthLoading(false);
    });
    
    return () => unsubscribe();
  }, [reduxUser]);
  
  // Fetch meetings data when company ID is available
  useEffect(() => {
    if (companyId) {
      fetchMeetingsData();
    }
  }, [companyId]);
  
  // Fetch meetings and users data
  const fetchMeetingsData = useCallback(async () => {
    if (!companyId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [meetingsData, usersData] = await Promise.all([
        MeetingService.fetchMeetings(companyId),
        MeetingService.fetchCompanyUsers(companyId)
      ]);
      
      setMeetings(meetingsData);
      setCompanyUsers(usersData);
      console.log('Fetched meetings:', meetingsData);
      console.log('Fetched users:', usersData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load meetings data. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [companyId]);
  
  // Handle add meeting button click
  const handleAddMeeting = () => {
    setEditMode(false);
    setSelectedMeeting(null);
    setFormVisible(true);
  };
  
  // Handle edit meeting
  const handleEditMeeting = (meeting) => {
    setSelectedMeeting(meeting);
    setEditMode(true);
    setDetailVisible(false);
    setFormVisible(true);
  };
  
  // Handle meeting selection from calendar
  const handleSelectMeeting = (meeting) => {
    setSelectedMeeting(meeting);
    setDetailVisible(true);
  };
  
  // Handle save meeting (create or update)
  const handleSaveMeeting = async (meetingData) => {
    setFormLoading(true);
    
    try {
      let result;
      
      if (editMode && selectedMeeting) {
        // Update existing meeting
        result = await MeetingService.updateMeeting(
          selectedMeeting.id, 
          meetingData, 
          companyUsers
        );
        
        const sentCount = result.notificationResults?.filter(r => r.success).length || 0;
        const totalCount = result.notificationResults?.length || 0;
        
        notification.success({
          message: 'Meeting Updated',
          description: `Meeting updated successfully. ${sentCount}/${totalCount} participants notified via email.`,
          icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
          duration: 4
        });
        
      } else {
        // Create new meeting
        result = await MeetingService.createMeeting(meetingData, companyUsers);
        
        const sentCount = result.notificationResults?.results?.filter(r => r.success).length || 0;
        const totalCount = result.notificationResults?.results?.length || 0;
        
        notification.success({
          message: 'Meeting Created',
          description: `Meeting created successfully! ${sentCount}/${totalCount} participants notified via email.`,
          icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
          duration: 4
        });
      }
      
      // Refresh data and close form
      await fetchMeetingsData();
      setFormVisible(false);
      
    } catch (err) {
      console.error('Error saving meeting:', err);
      
      notification.error({
        message: 'Error',
        description: err.message || 'Failed to save meeting. Please try again.',
        duration: 5
      });
    } finally {
      setFormLoading(false);
    }
  };
  
  // Handle delete meeting
  const handleDeleteMeeting = async (meetingId) => {
    try {
      await MeetingService.deleteMeeting(meetingId);
      
      notification.success({
        message: 'Meeting Deleted',
        description: 'Meeting deleted successfully.',
        duration: 3
      });
      
      await fetchMeetingsData();
      setDetailVisible(false);
    } catch (err) {
      console.error('Error deleting meeting:', err);
      notification.error({
        message: 'Error',
        description: 'Failed to delete meeting. Please try again.',
        duration: 5
      });
    }
  };

  // Handle resend notifications
  const handleResendNotifications = async (meeting) => {
    try {
      const result = await MeetingService.resendMeetingNotifications(
        meeting.id, 
        companyUsers
      );
      
      const sentCount = result.notificationResults?.results?.filter(r => r.success).length || 0;
      const totalCount = result.notificationResults?.results?.length || 0;
      
      notification.success({
        message: 'Notifications Resent',
        description: `Successfully resent ${sentCount}/${totalCount} notifications to participants.`,
        icon: <MailOutlined style={{ color: '#1890ff' }} />,
        duration: 4
      });
      
      await fetchMeetingsData();
      
    } catch (err) {
      console.error('Error resending notifications:', err);
      notification.error({
        message: 'Error',
        description: err.message || 'Failed to resend notifications.',
        duration: 5
      });
    }
  };
  
  // Determine if user has permission to add/edit meetings (CEO or HR)
  const hasEditPermission = () => {
    if (!user || !reduxUser) return false;
    const role = reduxUser.Role || '';
    return role.toLowerCase() === 'ceo' || role.toLowerCase() === 'hr';
  };
  
  // Render loading state while checking authentication
  if (authLoading) {
    return (
      <div style={{ padding: '100px 0', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: '20px' }}>
          <Text>Checking authentication...</Text>
        </div>
      </div>
    );
  }
  
  // Render authentication error
  if (!user || !companyId) {
    return (
      <div style={{ padding: '16px' }}>
        <Alert
          message="Authentication Error"
          description="You must be logged in to view meetings. Please log in and try again."
          type="error"
          showIcon
        />
      </div>
    );
  }
  
  return (
    <div className="meetings-page-container" style={{ padding: '16px' }}>
      {/* Page Header */}
      <Card className="mb-4">
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              <CalendarOutlined style={{ marginRight: '12px' }} /> 
              Company Meetings
            </Title>
            <Text>Manage your company meetings and appointments</Text>
            {meetings.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: '13px' }}>
                  <MailOutlined style={{ marginRight: 4 }} />
                  Email notifications are automatically sent when meetings are created or updated
                </Text>
              </div>
            )}
          </Col>
          
          {hasEditPermission() && (
            <Col>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleAddMeeting}
              >
                Add Meeting
              </Button>
            </Col>
          )}
        </Row>
      </Card>
      
      {/* Display error if any */}
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          className="mb-4"
        />
      )}
      
      {/* Display meetings calendar or loading state */}
      <div className="meetings-content">
        {loading ? (
          <div style={{ padding: '50px 0', textAlign: 'center' }}>
            <Spin size="large" />
            <div style={{ marginTop: '20px' }}>
              <Text>Loading meetings data...</Text>
            </div>
          </div>
        ) : (
          <MeetingCalendar
            meetings={meetings}
            companyUsers={companyUsers}
            onSelectMeeting={handleSelectMeeting}
            onAddMeeting={hasEditPermission() ? handleAddMeeting : undefined}
          />
        )}
      </div>
      
      {/* Meeting form modal */}
      <Modal
        title={editMode ? "Edit Meeting" : "Add New Meeting"}
        open={formVisible}
        onCancel={() => setFormVisible(false)}
        footer={null}
        width={800}
        destroyOnClose
        maskClosable={false}
      >
        <MeetingForm
          currentUser={{
            uid: user.uid,
            company_id: companyId
          }}
          companyUsers={companyUsers}
          initialValues={selectedMeeting}
          onSave={handleSaveMeeting}
          onCancel={() => setFormVisible(false)}
          loading={formLoading}
          isEdit={editMode}
        />
      </Modal>
      
      {/* Meeting detail drawer */}
      <MeetingDetail
        meeting={selectedMeeting}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        onEdit={hasEditPermission() ? handleEditMeeting : undefined}
        onDelete={hasEditPermission() ? handleDeleteMeeting : undefined}
        onResendNotifications={hasEditPermission() ? handleResendNotifications : undefined}
        users={companyUsers}
        currentUser={{
          uid: user.uid,
          company_id: companyId
        }}
      />
    </div>
  );
};

export default MeetingsPage;