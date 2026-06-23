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
  Spin,
  Tag 
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
import DealService from 'services/firebase/DealService';
import { DealStatus, DealStatusLabels, DealStatusColors } from 'models/DealModel';
import SellerDealList from './components/SellerDealList';
import SellerDealForm from './components/SellerDealForm';
import SellerDealDetail from './components/SellerDealDetail';
import DealEncouragementModal from './components/DealEncouragementModal';
import SellerDealKanban from './components/SellerDealKanban';
import sellerActivityService, { ActivityTypes, EntityTypes } from 'services/firebase/SellerActivityService';

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
    proposal: 0,
    won: 0,
    lost: 0,
    totalValue: 0,
    avgDealValue: 0
  });
  
const [encouragementModal, setEncouragementModal] = useState({
  visible: false,
  status: null,
  amount: 0,
  contactName: ''
});

  // Fetch deals assigned to current seller
  const fetchDeals = useCallback(async () => {
    if (!sellerId || !companyId) {
      console.log('Missing user data:', { sellerId, companyId });
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching deals for seller:', sellerId);
      setLoading(true);
      // Get deals by seller
      const dealsData = await DealService.getDealsBySeller(sellerId);
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

  // Calculate monthly statistics with new statuses
  const calculateMonthlyStats = (dealsData) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyDeals = dealsData.filter(deal => {
      const dealDate = deal.CreationDate?.toDate?.() || new Date(deal.CreationDate);
      return dealDate.getMonth() === currentMonth && dealDate.getFullYear() === currentYear;
    });
    
    const totalValue = monthlyDeals.reduce((sum, deal) => sum + (deal.Amount || 0), 0);
    
    const stats = {
      total: monthlyDeals.length,
      opened: monthlyDeals.filter(d => d.Status === DealStatus.OPENED || d.Status === 'Opened').length,
      proposal: monthlyDeals.filter(d => d.Status === DealStatus.PROPOSAL || d.Status === 'Proposal').length,
      won: monthlyDeals.filter(d => d.Status === DealStatus.WON || d.Status === 'Won').length,
      lost: monthlyDeals.filter(d => d.Status === DealStatus.LOST || d.Status === 'Lost').length,
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
        const oldDeal = deals.find(d => d.id === selectedDeal.id);
        await DealService.update(selectedDeal.id, dealData);
        
        // Log update activity
        if (sellerId && companyId) {
          await sellerActivityService.logActivity({
            sellerId: sellerId,
            companyId: companyId,
            activityType: ActivityTypes.DEAL_UPDATED,
            entityType: EntityTypes.DEAL,
            entityId: selectedDeal.id,
            entityName: dealData.Description || selectedDeal.Description || 'Untitled Deal',
            details: {
              name: dealData.Description || selectedDeal.Description,
              amount: dealData.Amount || selectedDeal.Amount,
              contactName: dealData.contact_name || selectedDeal.contact_name,
              updatedFields: Object.keys(dealData).join(', '),
            },
            metadata: {
              oldStatus: oldDeal?.Status,
              newStatus: dealData.Status || oldDeal?.Status,
              oldAmount: oldDeal?.Amount,
              newAmount: dealData.Amount || oldDeal?.Amount,
              updatedAt: new Date().toISOString(),
            }
          });
        }
        
        message.success('Deal updated successfully');
      } else {
        // Create new deal
        const newDeal = {
          ...dealData,
          seller_id: sellerId,
          company_id: companyId,
          Status: DealStatus.OPENED,
          CreationDate: new Date()
        };
        
        const createdDeal = await DealService.create(newDeal);
        
        // Log creation activity
        if (sellerId && companyId && createdDeal) {
          await sellerActivityService.logActivity({
            sellerId: sellerId,
            companyId: companyId,
            activityType: ActivityTypes.DEAL_CREATED,
            entityType: EntityTypes.DEAL,
            entityId: createdDeal.id,
            entityName: createdDeal.Description || 'Untitled Deal',
            details: {
              name: createdDeal.Description,
              amount: createdDeal.Amount,
              contactName: createdDeal.contact_name,
              source: createdDeal.Source || 'Manual',
            },
            metadata: {
              status: createdDeal.Status,
              amount: createdDeal.Amount,
              source: createdDeal.Source || 'Manual',
              createdAt: new Date().toISOString(),
            }
          });
        }
        
        message.success('Deal created successfully');
      }
      
      setFormVisible(false);
      setSelectedDeal(null);
      fetchDeals(); // Refresh the list
    } catch (error) {
      console.error('Error saving deal:', error);
      message.error('Failed to save deal: ' + error.message);
    } finally {
      setFormLoading(false);
    }
  };

  // Handle deal deletion
  const handleDelete = async (dealId) => {
    try {
      await DealService.delete(dealId);
      message.success('Deal deleted successfully');
      fetchDeals(); // Refresh the list
      setDetailVisible(false);
    } catch (error) {
      console.error('Error deleting deal:', error);
      message.error('Failed to delete deal');
    }
  };

  // FIXED: Handle status update with activity logging
  const handleStatusUpdate = async (dealId, newStatus) => {
    try {
      const deal = deals.find(d => d.id === dealId);
      if (!deal) {
        message.error('Deal not found');
        return;
      }

      const oldStatus = deal.Status;
      
      // Update the deal status
      await DealService.updateStatus(dealId, newStatus);
      
      // Log status change activity
      if (sellerId && companyId) {
        await sellerActivityService.logActivity({
          sellerId: sellerId,
          companyId: companyId,
          activityType: ActivityTypes.DEAL_STATUS_CHANGED,
          entityType: EntityTypes.DEAL,
          entityId: dealId,
          entityName: deal.Description || 'Untitled Deal',
          details: {
            name: deal.Description,
            amount: deal.Amount,
            contactName: deal.contact_name,
            previousStatus: oldStatus,
            newStatus: newStatus,
          },
          metadata: {
            oldStatus: oldStatus,
            newStatus: newStatus,
            amount: deal.Amount,
            changedAt: new Date().toISOString(),
          }
        });
        
        // If WON, log specific won activity
        if (newStatus === DealStatus.WON || newStatus === 'Won') {
          await sellerActivityService.logActivity({
            sellerId: sellerId,
            companyId: companyId,
            activityType: ActivityTypes.DEAL_WON,
            entityType: EntityTypes.DEAL,
            entityId: dealId,
            entityName: deal.Description || 'Untitled Deal',
            details: {
              name: deal.Description,
              amount: deal.Amount,
              contactName: deal.contact_name,
            },
            metadata: {
              amount: deal.Amount,
              wonAt: new Date().toISOString(),
              previousStatus: oldStatus,
            }
          });
        }
        
        // If LOST, log specific lost activity
        if (newStatus === DealStatus.LOST || newStatus === 'Lost') {
          await sellerActivityService.logActivity({
            sellerId: sellerId,
            companyId: companyId,
            activityType: ActivityTypes.DEAL_LOST,
            entityType: EntityTypes.DEAL,
            entityId: dealId,
            entityName: deal.Description || 'Untitled Deal',
            details: {
              name: deal.Description,
              amount: deal.Amount,
              contactName: deal.contact_name,
              reason: 'Status changed to Lost',
            },
            metadata: {
              amount: deal.Amount,
              lostAt: new Date().toISOString(),
              previousStatus: oldStatus,
            }
          });
        }
      }
      
      // Show encouragement modal for status changes
      if (newStatus === DealStatus.WON || newStatus === DealStatus.LOST || 
          newStatus === DealStatus.PROPOSAL || newStatus === DealStatus.OPENED) {
        setEncouragementModal({
          visible: true,
          status: newStatus,
          amount: deal?.Amount || 0,
          contactName: deal?.contact_name || ''
        });
      }
      
      fetchDeals(); // Refresh the list
      message.success(`Deal status updated to ${DealStatusLabels[newStatus] || newStatus}`);
    } catch (error) {
      console.error('Error updating deal status:', error);
      message.error('Failed to update deal status: ' + error.message);
    }
  };

  // Handle adding note
const handleAddNote = async (dealId, noteText) => {
    try {
      const deal = deals.find(d => d.id === dealId);
      
      await DealService.addNote(dealId, noteText);
      
      // Log note activity
      if (sellerId && companyId && deal) {
        await sellerActivityService.logActivity({
          sellerId: sellerId,
          companyId: companyId,
          activityType: ActivityTypes.DEAL_NOTE_ADDED,
          entityType: EntityTypes.DEAL,
          entityId: dealId,
          entityName: deal.Description || 'Untitled Deal',
          details: {
            name: deal.Description,
            note: noteText.substring(0, 100) + (noteText.length > 100 ? '...' : ''),
            noteLength: noteText.length,
          },
          metadata: {
            noteAddedAt: new Date().toISOString(),
          }
        });
      }
      
      fetchDeals(); // Refresh to get updated deal with new note
      
      // Update the selected deal if detail view is open
      if (selectedDeal && selectedDeal.id === dealId) {
        const updatedDeal = await DealService.getById(dealId);
        if (updatedDeal) {
          setSelectedDeal(updatedDeal);
        }
      }
      
      message.success('Note added successfully');
    } catch (error) {
      console.error('Error adding note:', error);
      message.error('Failed to add note');
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
  const completedDeals = monthlyStats.won + monthlyStats.lost;
  const progressPercentage = monthlyStats.total > 0 
    ? Math.round((completedDeals / monthlyStats.total) * 100)
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
              <Tag color="blue">{deals.length} Total</Tag>
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


      {/* Deals List 
      <SellerDealList
        deals={deals}
        loading={loading}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatusUpdate={handleStatusUpdate}
        onRefresh={fetchDeals}
      />
*/}
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
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAddNote={handleAddNote}
        onStatusUpdate={handleStatusUpdate}
      />

      {/* Encouragement Modal */}
<DealEncouragementModal
  visible={encouragementModal.visible}
  onClose={() => setEncouragementModal({ visible: false, status: null, amount: 0, contactName: '' })}
  status={encouragementModal.status}
  amount={encouragementModal.amount}
  contactName={encouragementModal.contactName}
/>

{/* Deals Kanban Board */}
<SellerDealKanban
  deals={deals}
  loading={loading}
  onView={handleView}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onStatusUpdate={handleStatusUpdate}
  onRefresh={fetchDeals}
/>
    </div>
  );
};

export default SellerDealsPage;