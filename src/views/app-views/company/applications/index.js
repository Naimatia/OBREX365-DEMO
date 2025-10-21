import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Table,
  Button,
  Space,
  Modal,
  message,
  Typography,
  Row,
  Col,
  Statistic,
  Avatar,
  Tooltip,
  Drawer
} from 'antd';
import { 
  PlusOutlined, 
  SolutionOutlined,
  UserAddOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import ApplicationsService from 'services/firebase/ApplicationsService';
import { ApplicationForm, ApplicationTable, ApplicationDetail } from './components';
import './applications.css';

const { Title, Text } = Typography;

const Applications = () => {
  // State management
  const [applications, setApplications] = useState([]);
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    reviewed: 0,
    interviewed: 0,
    hired: 0,
    rejected: 0,
    jobStats: {}
  });
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [editingApplication, setEditingApplication] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);

  // Get user data from Redux store
  const { user } = useSelector((state) => state.auth);

  // Fetch applications and statistics
  const fetchApplications = useCallback(async () => {
    if (!user?.company_id) {
      console.log('No company_id found for user');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch applications and statistics in parallel
      const [applicationsData, statsData] = await Promise.all([
        ApplicationsService.getApplicationsByCompany(user.company_id),
        ApplicationsService.getApplicationStatistics(user.company_id)
      ]);
      
      setApplications(applicationsData);
      setStatistics(statsData);
      
      console.log(`Loaded ${applicationsData.length} applications`);
    } catch (error) {
      console.error('Error fetching applications:', error);
      message.error('Failed to load applications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.company_id]);

  // Initial data fetch
  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Handle create application
  const handleCreateApplication = async (values) => {
    try {
      const applicationData = {
        ...values,
        company_id: user.company_id,
        creator_id: user.id,
        creator_name: `${user.firstname} ${user.lastname}`
      };

      await ApplicationsService.createApplication(applicationData);
      message.success('Application created successfully!');
      setFormVisible(false);
      setEditingApplication(null);
      fetchApplications(); // Refresh data
    } catch (error) {
      console.error('Error creating application:', error);
      message.error('Failed to create application. Please try again.');
    }
  };

  // Handle edit application
  const handleEditApplication = (application) => {
    setEditingApplication(application);
    setFormVisible(true);
  };

  // Handle update application
  const handleUpdateApplication = async (values) => {
    try {
      if (!editingApplication?.id) {
        message.error('No application selected for editing');
        return;
      }

      await ApplicationsService.updateApplication(editingApplication.id, values);
      message.success('Application updated successfully!');
      setFormVisible(false);
      setEditingApplication(null);
      fetchApplications(); // Refresh data
    } catch (error) {
      console.error('Error updating application:', error);
      message.error('Failed to update application. Please try again.');
    }
  };

  // Handle delete application
  const handleDeleteApplication = async (applicationId) => {
    try {
      await ApplicationsService.deleteApplication(applicationId);
      message.success('Application deleted successfully!');
      fetchApplications(); // Refresh data
    } catch (error) {
      console.error('Error deleting application:', error);
      message.error('Failed to delete application. Please try again.');
    }
  };

  // Handle status change
  const handleStatusChange = async (applicationId, newStatus) => {
    try {
      await ApplicationsService.updateApplicationStatus(applicationId, newStatus);
      message.success(`Application status updated to ${newStatus}!`);
      fetchApplications(); // Refresh data
    } catch (error) {
      console.error('Error updating application status:', error);
      message.error('Failed to update application status. Please try again.');
    }
  };

  // Handle view details
  const handleViewDetails = (application) => {
    setSelectedApplication(application);
    setDetailVisible(true);
  };

  // Close detail modal
  const handleCloseDetail = () => {
    setDetailVisible(false);
    setSelectedApplication(null);
  };

  // Animation variants for cards
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="applications-page">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card 
          className="applications-header"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '12px',
            marginBottom: '24px'
          }}
          bodyStyle={{ padding: '32px' }}
        >
          <Row align="middle" justify="space-between">
            <Col>
              <Space direction="vertical" size={4}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.15)',
                      borderRadius: '12px',
                      padding: '12px',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.2)'
                    }}
                  >
                    <SolutionOutlined style={{ fontSize: '32px', color: '#fff' }} />
                  </div>
                  <div>
                    <Title level={2} style={{ color: '#fff', margin: 0 }}>
                      🏢 Job Applications
                    </Title>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px' }}>
                      Manage and track candidate applications for your company
                    </Text>
                  </div>
                </div>
              </Space>
            </Col>
            <Col>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  size="large"
                  onClick={() => setFormVisible(true)}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                >
                  Add Application
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      </motion.div>

      {/* Statistics Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} md={6}>
            <motion.div variants={cardVariants} initial="hidden" animate="visible">
              <Card
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff'
                }}
                bodyStyle={{ padding: '24px' }}
              >
                <Statistic
                  title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Total Applications</span>}
                  value={statistics.total || 0}
                  prefix={<SolutionOutlined style={{ color: '#fff' }} />}
                  valueStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
              </Card>
            </motion.div>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <motion.div variants={cardVariants} initial="hidden" animate="visible">
              <Card
                style={{
                  background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff'
                }}
                bodyStyle={{ padding: '24px' }}
              >
                <Statistic
                  title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Pending Review</span>}
                  value={statistics.pending || 0}
                  prefix={<ClockCircleOutlined style={{ color: '#fff' }} />}
                  valueStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
              </Card>
            </motion.div>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <motion.div variants={cardVariants} initial="hidden" animate="visible">
              <Card
                style={{
                  background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff'
                }}
                bodyStyle={{ padding: '24px' }}
              >
                <Statistic
                  title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Interviewed</span>}
                  value={statistics.interviewed || 0}
                  prefix={<EyeOutlined style={{ color: '#fff' }} />}
                  valueStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
              </Card>
            </motion.div>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <motion.div variants={cardVariants} initial="hidden" animate="visible">
              <Card
                style={{
                  background: 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff'
                }}
                bodyStyle={{ padding: '24px' }}
              >
                <Statistic
                  title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Hired</span>}
                  value={statistics.hired || 0}
                  prefix={<CheckCircleOutlined style={{ color: '#fff' }} />}
                  valueStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
              </Card>
            </motion.div>
          </Col>
        </Row>
      </motion.div>

      {/* Applications Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card
          title={
            <Space>
              <TeamOutlined />
              <span>Applications Management</span>
            </Space>
          }
          style={{
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}
        >
          <ApplicationTable
            applications={applications}
            loading={loading}
            onEdit={handleEditApplication}
            onDelete={handleDeleteApplication}
            onStatusChange={handleStatusChange}
            onViewDetails={handleViewDetails}
          />
        </Card>
      </motion.div>

      {/* Application Form Modal */}
      <Modal
        title={
          <Space>
            <UserAddOutlined />
            <span>{editingApplication ? 'Edit Application' : 'Add New Application'}</span>
          </Space>
        }
        open={formVisible}
        onCancel={() => {
          setFormVisible(false);
          setEditingApplication(null);
        }}
        footer={null}
        width={800}
        destroyOnClose
      >
        <ApplicationForm
          initialValues={editingApplication}
          onSubmit={editingApplication ? handleUpdateApplication : handleCreateApplication}
          onCancel={() => {
            setFormVisible(false);
            setEditingApplication(null);
          }}
          loading={loading}
        />
      </Modal>

      {/* Application Detail Modal */}
      <ApplicationDetail
        application={selectedApplication}
        visible={detailVisible}
        onClose={handleCloseDetail}
        onEdit={handleEditApplication}
        onDelete={handleDeleteApplication}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};

export default Applications;
