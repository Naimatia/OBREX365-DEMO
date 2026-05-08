// pages/SellerMeetingsPage.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Typography, Modal, message, Button, Spin, Alert, Row, Col
} from 'antd';
import { CalendarOutlined, PlusOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from 'configs/FirebaseConfig';

import MeetingService from './services/MeetingService';
import MeetingCalendar from './components/MeetingCalendar';
import MeetingForm from './components/MeetingForm';
import MeetingDetail from './components/MeetingDetail';

const { Title, Text } = Typography;

const SellerMeetingsPage = () => {
  const [user, setUser] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [meetings, setMeetings] = useState([]);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formVisible, setFormVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const reduxUser = useSelector(state => state.auth.user);

  // Authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        setUser(authUser);

        if (reduxUser) {
          const compId = reduxUser.company_id || reduxUser.companyId || reduxUser.companyID;
          if (compId) setCompanyId(compId);
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [reduxUser]);

  // Fetch data
  const fetchMeetingsData = useCallback(async () => {
    if (!companyId || !user) return;

    setLoading(true);
    setError(null);

    try {
      const [meetingsData, usersData] = await Promise.all([
        MeetingService.fetchMeetings(companyId),
        MeetingService.fetchCompanyUsers(companyId)
      ]);

      setMeetings(meetingsData);
      setCompanyUsers(usersData);
    } catch (err) {
      console.error(err);
      setError('Failed to load your meetings.');
    } finally {
      setLoading(false);
    }
  }, [companyId, user]);


  useEffect(() => {
    if (companyId && user) {
      fetchMeetingsData();
    }
  }, [companyId, user, fetchMeetingsData]);

  // Filter meetings for this seller
  const myMeetings = useMemo(() => {
    if (!user?.uid) return [];
    return meetings.filter(meeting => 
      meeting.creator_id === user.uid || 
      meeting.assignedTo === user.uid ||
      meeting.Users?.includes(user.uid)
    );
  }, [meetings, user]);

  

  const canEditMeeting = (meeting) => {
    if (!meeting || !user) return false;
    return meeting.creator_id === user.uid; // Only own created meetings
  };

  

  // Handlers
  const handleAddMeeting = () => {
    setEditMode(false);
    setSelectedMeeting(null);
    setFormVisible(true);
  };

  const handleSelectMeeting = (meeting) => {
    setSelectedMeeting(meeting);
    setDetailVisible(true);
  };

  const handleEditMeeting = (meeting) => {
    if (!canEditMeeting(meeting)) {
      message.warning("You can only edit meetings that you created.");
      return;
    }
    setSelectedMeeting(meeting);
    setEditMode(true);
    setDetailVisible(false);
    setFormVisible(true);
  };

  const handleSaveMeeting = async (meetingData) => {
    setFormLoading(true);
    try {
      if (editMode && selectedMeeting) {
        await MeetingService.updateMeeting(selectedMeeting.id, meetingData);
        message.success('Meeting updated successfully');
      } else {
        await MeetingService.createMeeting({
          ...meetingData,
          creator_id: user.uid,
          company_id: companyId
        });
        message.success('Meeting created successfully');
      }

      await fetchMeetingsData();
      setFormVisible(false);
    } catch (err) {
      message.error('Failed to save meeting');
    } finally {
      setFormLoading(false);
    }
  };

  

  const handleDeleteMeeting = async (meetingId) => {
    const meeting = meetings.find(m => m.id === meetingId);
    if (!canEditMeeting(meeting)) {
      message.error("You cannot delete meetings assigned by CEO.");
      return;
    }

    try {
      await MeetingService.deleteMeeting(meetingId);
      message.success('Meeting deleted successfully');
      await fetchMeetingsData();
      setDetailVisible(false);
    } catch (err) {
      message.error('Failed to delete meeting');
    }
  };

  if (authLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  if (!user || !companyId) {
    return <Alert message="Please log in to view your meetings" type="error" />;
  }

  return (
    <div style={{ padding: '16px' }}>
      <Card className="mb-4">
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              <CalendarOutlined style={{ marginRight: 12 }} />
              My Meetings
            </Title>
            <Text type="secondary">Your schedule and assigned meetings</Text>
          </Col>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddMeeting}>
              New Meeting
            </Button>
          </Col>
        </Row>
      </Card>

      {error && <Alert message={error} type="error" showIcon className="mb-4" />}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <Spin size="large" />
        </div>
      ) : (
        <MeetingCalendar
          meetings={myMeetings}
          onSelectMeeting={handleSelectMeeting}
          onAddMeeting={handleAddMeeting}
        />
      )}

      {/* Create/Edit Form */}
      <Modal
        title={editMode ? "Edit Meeting" : "Create New Meeting"}
        open={formVisible}
        onCancel={() => setFormVisible(false)}
        footer={null}
        width={800}
        destroyOnClose
      >
        <MeetingForm
          currentUser={{ uid: user.uid, company_id: companyId }}
          companyUsers={companyUsers}
          initialValues={selectedMeeting}
          onSave={handleSaveMeeting}
          onCancel={() => setFormVisible(false)}
          loading={formLoading}
          isEdit={editMode}
          isCEOorHR={false}           // Important: Seller cannot assign meetings
        />
      </Modal>

      {/* Detail Drawer */}
      <MeetingDetail
        meeting={selectedMeeting}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        onEdit={canEditMeeting(selectedMeeting) ? handleEditMeeting : undefined}
        onDelete={canEditMeeting(selectedMeeting) ? handleDeleteMeeting : undefined}
        users={companyUsers}
        currentUser={{ uid: user.uid, company_id: companyId }}
      />
    </div>
  );
};

export default SellerMeetingsPage;