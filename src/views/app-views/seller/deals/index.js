// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout,
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Typography,
  Space,
  Progress,
  message,
  Spin
} from 'antd';
import {
  PlusOutlined,
  DollarOutlined,
  TrophyOutlined,
  CloseCircleOutlined,
  FileProtectOutlined,
  ReloadOutlined,
  StarOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import DealsService from 'services/DealsService';
import { DealStatus, DealSource } from 'models/DealModel';
import SellerDealList from './components/SellerDealList';
import SellerDealForm from './components/SellerDealForm';
import SellerDealDetail from './components/SellerDealDetail';
import DealEncouragementModal from './components/DealEncouragementModal';

const { Title, Text } = Typography;

/**
 * Seller Deals page - View and manage deals assigned to the current seller
 */
const SellerDealsPage = () => {
  const user = useSelector(state => state.auth.user);
  const sellerId = user?.id;
  const companyId = user?.company_id;

  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [monthlyStats, setMonthlyStats] = useState({
    total: 0,
    opened: 0,
    gain: 0,
    loss: 0,
    totalValue: 0,
    avgDealValue: 0
  });
  
  // Encouragement modal state
  const [encouragementModal, setEncouragementModal] = useState({
    visible: false,
    status: null,
    amount: 0
  });

  // Fetch deals
  const fetchDeals = useCallback(async () => {
    if (!sellerId || !companyId) {
      console.log('Missing user data:', { sellerId, companyId });
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching deals for seller:', sellerId);
      setLoading(true);
      const dealsData = await DealsService.getSellerDeals(sellerId);
      console.log('Fetched deals:', dealsData);
      setDeals(dealsData);
      
      // Calculate monthly statistics
      calculateMonthlyStats(dealsData);
    } catch (error) {
      console.error('Error fetching deals:', error);
      message.error('Failed to fetch deals');
    } finally {
      setLoading(false);
    }
  }, [sellerId, companyId]);

  // Calculate monthly statistics
  const calculateMonthlyStats = (dealsData) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyDeals = dealsData.filter(deal => {
      const dealDate = new Date(deal.CreationDate);
      return dealDate.getMonth() === currentMonth && dealDate.getFullYear() === currentYear;
    });
    
    const totalValue = monthlyDeals.reduce((sum, deal) => sum + (deal.Amount || 0), 0);
    
    const stats = {
      total: monthlyDeals.length,
      opened: monthlyDeals.filter(d => d.Status === DealStatus.OPENED).length,
      gain: monthlyDeals.filter(d => d.Status === DealStatus.GAIN).length,
      loss: monthlyDeals.filter(d => d.Status === DealStatus.LOSS).length,
      totalValue: totalValue,
      avgDealValue: monthlyDeals.length > 0 ? totalValue / monthlyDeals.length : 0
    };
    
    setMonthlyStats(stats);
  };

  // Load deals on component mount
  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  // Handle form submit (create/edit)
  const handleFormSubmit = async (dealData) => {
    setFormLoading(true);
    try {
      if (selectedDeal) {
        // Edit existing deal
        await DealsService.updateDeal(selectedDeal.id, dealData);
        message.success('Deal updated successfully');
      } else {
        // Create new deal
        await DealsService.createDeal(dealData);
        message.success('Deal created successfully');
      }
      
      setFormVisible(false);
      setSelectedDeal(null);
      fetchDeals(); // Refresh the list
    } catch (error) {
      console.error('Error saving deal:', error);
      message.error('Failed to save deal');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle deal deletion
  const handleDelete = async (dealId) => {
    try {
      await DealsService.deleteDeal(dealId);
      message.success('Deal deleted successfully');
      fetchDeals(); // Refresh the list
      setDetailVisible(false);
    } catch (error) {
      console.error('Error deleting deal:', error);
      message.error('Failed to delete deal');
    }
  };

  // Handle status update
  const handleStatusUpdate = async (dealId, newStatus) => {
    try {
      const deal = deals.find(d => d.id === dealId);
      await DealsService.updateDeal(dealId, { Status: newStatus });
      
      // Show encouragement modal for status changes
      if (newStatus === DealStatus.GAIN || newStatus === DealStatus.LOSS) {
        setEncouragementModal({
          visible: true,
          status: newStatus,
          amount: deal?.Amount || 0
        });
      }
      
      fetchDeals(); // Refresh the list
    } catch (error) {
      console.error('Error updating deal status:', error);
      throw error;
    }
  };

  // Handle adding note
  const handleAddNote = async (dealId, noteText) => {
    try {
      await DealsService.addNote(dealId, noteText);
      fetchDeals(); // Refresh to get updated deal with new note
      
      // Update the selected deal if detail view is open
      if (selectedDeal && selectedDeal.id === dealId) {
        const updatedDeal = deals.find(d => d.id === dealId);
        if (updatedDeal) {
          setSelectedDeal(updatedDeal);
        }
      }
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  };

  // Handle view deal
  const handleView = (deal) => {
    setSelectedDeal(deal);
    setDetailVisible(true);
  };

  // Handle edit deal
  const handleEdit = (deal) => {
    setSelectedDeal(deal);
    setFormVisible(true);
  };

  // Handle create new deal
  const handleCreate = () => {
    setSelectedDeal(null);
    setFormVisible(true);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Calculate progress percentage
  const progressPercentage = monthlyStats.total > 0 
    ? Math.round(((monthlyStats.gain + monthlyStats.loss) / monthlyStats.total) * 100)
    : 0;

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p style={{ marginTop: '16px' }}>Loading user data...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <FileProtectOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <Title level={2} style={{ margin: 0 }}>My Deals</Title>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<ReloadOutlined />}
                onClick={fetchDeals}
                loading={loading}
              >
                Refresh
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleCreate}
              >
                Create Deal
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Monthly Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Deals"
              value={monthlyStats.total}
              prefix={<FileProtectOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Value"
              value={formatCurrency(monthlyStats.totalValue)}
              prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Deals Won"
              value={monthlyStats.gain}
              prefix={<TrophyOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Deals Lost"
              value={monthlyStats.loss}
              prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Progress Bar */}
      <Row style={{ marginBottom: '24px' }}>
        <Col xs={24}>
          <Card>
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Monthly Progress</Text>
              <Text style={{ float: 'right' }}>
                {monthlyStats.gain + monthlyStats.loss} / {monthlyStats.total} deals processed
              </Text>
            </div>
            <Progress
              percent={progressPercentage}
              strokeColor={{
                '0%': '#87d068',
                '100%': '#52c41a',
              }}
              trailColor="#f0f0f0"
              size={10}
            />
            <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">Average Deal: {formatCurrency(monthlyStats.avgDealValue)}</Text>
              <Text type="secondary">Completion Rate: {progressPercentage}%</Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Deals List */}
      <SellerDealList
        deals={deals}
        loading={loading}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatusUpdate={handleStatusUpdate}
        onRefresh={fetchDeals}
      />

      {/* Deal Form Modal */}
      <SellerDealForm
        visible={formVisible}
        onCancel={() => {
          setFormVisible(false);
          setSelectedDeal(null);
        }}
        onSubmit={handleFormSubmit}
        deal={selectedDeal}
        loading={formLoading}
        sellerId={sellerId}
        companyId={companyId}
      />

      {/* Deal Detail Drawer */}
      <SellerDealDetail
        visible={detailVisible}
        onClose={() => {
          setDetailVisible(false);
          setSelectedDeal(null);
        }}
        deal={selectedDeal}
        onEdit={(deal) => {
          setDetailVisible(false);
          setSelectedDeal(deal);
          setFormVisible(true);
        }}
        onDelete={handleDelete}
        onAddNote={handleAddNote}
      />

      {/* Encouragement Modal */}
      <DealEncouragementModal
        visible={encouragementModal.visible}
        onClose={() => setEncouragementModal({ visible: false, status: null, amount: 0 })}
        status={encouragementModal.status}
        amount={encouragementModal.amount}
      />
    </div>
  );
};

export default SellerDealsPage;