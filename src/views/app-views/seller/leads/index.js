import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Typography, 
  Space, 
  Button, 
  Row, 
  Col, 
  Modal,
  message,
  Statistic,
  Progress,
  Tooltip
} from 'antd';
import { 
  UserAddOutlined, 
  ReloadOutlined,
  TeamOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  StarOutlined,
  UploadOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import LeadsService from 'services/LeadsService';
import { LeadStatus, LeadInterestLevel } from 'models/LeadModel';
import SellerLeadList from './components/SellerLeadList';
import SellerLeadForm from './components/SellerLeadForm';
import SellerLeadDetail from './components/SellerLeadDetail';
import LeadEncouragementModal from './components/LeadEncouragementModal';
import CSVImportModal from './components/CSVImportModal';
import DealsService from 'services/DealsService';
import { DealSourceEnum, DealStatus } from 'models/DealModel';
import { db, collection, query, where, getDocs } from 'configs/FirebaseConfig';

const { Title, Text } = Typography;

/**
 * Seller Leads page - View and manage leads assigned to the current seller
 */
const SellerLeadsPage = () => {
  // State management
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [encouragementModal, setEncouragementModal] = useState({
    visible: false,
    status: null,
    leadName: null
  });

  const [csvImportVisible, setCsvImportVisible] = useState(false);
  const [monthlyStats, setMonthlyStats] = useState({
    total: 0,
    target: 30,
    pending: 0,
    gain: 0,
    loss: 0,
    highInterest: 0,
    mediumInterest: 0,
    lowInterest: 0
  });
  
  // Get current user data
  const user = useSelector(state => state.auth.user);
  const companyId = user?.company_id;
  const sellerId = user?.id;

  // Fetch leads assigned to current seller OR created by current seller
  const fetchLeads = useCallback(async () => {
    if (!companyId || !sellerId) {
      console.log('Missing companyId or sellerId:', { companyId, sellerId });
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      console.log('Fetching leads for seller:', sellerId, 'company:', companyId);
      
      // Get ALL leads from company first to debug
      const allLeadsQuery = query(
        collection(db, 'leads'),
        where('company_id', '==', companyId)
      );
      
      const allLeadsSnap = await getDocs(allLeadsQuery);
      const allLeads = allLeadsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      console.log('Total leads in company:', allLeads.length);
      console.log('Sample lead structure:', allLeads[0]);
      
      // Check what fields are available in leads
      const leadsWithSellerId = allLeads.filter(lead => lead.seller_id);
      const leadsWithCreatedBy = allLeads.filter(lead => lead.createdBy);
      
      console.log('Leads with seller_id field:', leadsWithSellerId.length);
      console.log('Leads with createdBy field:', leadsWithCreatedBy.length);
      
      // Find leads assigned to this seller (by seller_id)
      const assignedToSeller = allLeads.filter(lead => {
        const isAssigned = lead.seller_id === sellerId;
        if (isAssigned) {
          console.log('Found lead assigned to seller:', lead.id, lead.name, 'seller_id:', lead.seller_id);
        }
        return isAssigned;
      });
      
      // Find leads created by this seller
      const createdBySeller = allLeads.filter(lead => {
        const isCreated = lead.createdBy === sellerId;
        if (isCreated) {
          console.log('Found lead created by seller:', lead.id, lead.name, 'createdBy:', lead.createdBy);
        }
        return isCreated;
      });
      
      console.log('Assigned to seller count:', assignedToSeller.length);
      console.log('Created by seller count:', createdBySeller.length);
      
      // Combine both sets
      const combined = [...createdBySeller, ...assignedToSeller];
      const uniqueLeads = Array.from(new Map(combined.map(lead => [lead.id, lead])).values());
      
      console.log('Total unique leads for seller:', uniqueLeads.length);
      
      setLeads(uniqueLeads);
      calculateMonthlyStats(uniqueLeads);
      
      // Show warning if no assigned leads found
      if (assignedToSeller.length === 0 && allLeads.length > 0) {
        console.warn('No leads assigned to this seller. Check if leads have seller_id field set correctly.');
      }
      
    } catch (err) {
      console.error('Error fetching leads:', err);
      message.error('Failed to load leads. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [companyId, sellerId]);

  // Calculate monthly statistics
  const calculateMonthlyStats = (leadList) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const monthlyLeads = leadList.filter(lead => {
      if (!lead.CreationDate) return false;
      const leadDate = lead.CreationDate?.toDate ? lead.CreationDate.toDate() : new Date(lead.CreationDate);
      return leadDate.getMonth() === currentMonth && leadDate.getFullYear() === currentYear;
    });
    
    const stats = {
      total: monthlyLeads.length,
      target: 30,
      pending: monthlyLeads.filter(l => l.status === LeadStatus.PENDING).length,
      gain: monthlyLeads.filter(l => l.status === LeadStatus.GAIN).length,
      loss: monthlyLeads.filter(l => l.status === LeadStatus.LOSS).length,
      highInterest: monthlyLeads.filter(l => l.InterestLevel === LeadInterestLevel.HIGH).length,
      mediumInterest: monthlyLeads.filter(l => l.InterestLevel === LeadInterestLevel.MEDIUM).length,
      lowInterest: monthlyLeads.filter(l => l.InterestLevel === LeadInterestLevel.LOW).length
    };
    
    setMonthlyStats(stats);
  };

  // Load leads on mount
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // === REVEAL LEAD HANDLER ===
  const handleRevealLead = async (leadId) => {
    try {
      await LeadsService.markLeadAsViewed(leadId, sellerId);
      // Refresh leads to update the revealed status
      await fetchLeads();
    } catch (err) {
      console.error('Failed to reveal lead:', err);
      message.error('Failed to reveal lead');
      throw err;
    }
  };

  // Handle form submit (Create / Update)
  const handleFormSubmit = async (formData) => {
    try {
      const cleanedData = { ...formData };

      // Clean undefined/empty values
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key] === undefined || cleanedData[key] === '') {
          delete cleanedData[key];
        }
      });

      // Handle Budget conversion
      if (cleanedData.Budget) {
        const numBudget = Number(String(cleanedData.Budget).replace(/[^0-9.]/g, ''));
        if (!isNaN(numBudget)) cleanedData.Budget = numBudget;
      }

      if (selectedLead?.id) {
        // Update - only allow if seller owns this lead
        const leadToUpdate = leads.find(l => l.id === selectedLead.id);
        if (leadToUpdate && leadToUpdate.createdBy !== sellerId) {
          message.error("You can only edit leads you created.");
          return;
        }
        await LeadsService.updateLead(selectedLead.id, cleanedData);
        message.success('Lead updated successfully');
      } else {
        // Create new lead
        const leadData = {
          ...cleanedData,
          company_id: companyId,
          seller_id: sellerId, // Assign to self
          createdBy: sellerId, // Mark as created by this seller
          status: LeadStatus.PENDING,
          CreationDate: new Date(),
        };

        await LeadsService.createLead(leadData);
        message.success('Lead created successfully');
      }

      fetchLeads();
      setIsFormVisible(false);
      setSelectedLead(null);
    } catch (err) {
      console.error('Error saving lead:', err);
      message.error('Failed to save lead');
    }
  };

  const handleAddLead = () => {
    setSelectedLead(null);
    setIsFormVisible(true);
  };

  const handleViewLead = (lead) => {
    setSelectedLead(lead);
    setIsDetailVisible(true);
  };

  const handleEditLead = (lead) => {
    // Only allow editing if seller created this lead
    if (lead.createdBy !== sellerId) {
      message.warning("You can only edit leads that you created.");
      return;
    }
    setSelectedLead(lead);
    setIsFormVisible(true);
  };

  const handleDeleteLead = async (leadId) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.createdBy !== sellerId) {
      message.error("You can only delete leads that you created.");
      return;
    }

    Modal.confirm({
      title: 'Delete Lead',
      content: `Are you sure you want to delete "${lead.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await LeadsService.deleteLead(leadId);
          message.success('Lead deleted successfully');
          fetchLeads();
        } catch (err) {
          message.error('Failed to delete lead');
        }
      }
    });
  };

  // Handle status change (used in Detail view)
  const handleLeadStatusChange = async (leadId, newStatus) => {
    try {
      await LeadsService.updateLead(leadId, { status: newStatus });

      if (newStatus === LeadStatus.GAIN) {
        const lead = leads.find(l => l.id === leadId);
        if (lead) {
          const dealData = {
            Amount: lead.Budget || 0,
            Description: `Converted from lead: ${lead.name}\nInterest: ${lead.InterestLevel}`,
            lead_id: lead.id,
            seller_id: sellerId,
            company_id: companyId,
            Status: DealStatus.OPEN,
            Source: DealSourceEnum.LEADS,
            contact_name: lead.name,
            contact_email: lead.email,
            contact_phone: lead.phoneNumber,
            CreationDate: new Date(),
          };

          await DealsService.createDeal(dealData);
          message.success(`Lead converted to Gain! Deal created.`);
        }
      }

      if ([LeadStatus.GAIN, LeadStatus.LOSS].includes(newStatus)) {
        const lead = leads.find(l => l.id === leadId);
        setEncouragementModal({
          visible: true,
          status: newStatus,
          leadName: lead?.name || 'Lead'
        });
      }

      fetchLeads();
    } catch (err) {
      console.error('Status update failed:', err);
      message.error('Failed to update status');
    }
  };

  const handleAddNote = async (leadId, noteText) => {
    try {
      await LeadsService.addNote(leadId, noteText);
      message.success('Note added successfully');
      fetchLeads();
      return true;
    } catch (err) {
      message.error('Failed to add note');
      return false;
    }
  };

  const handleCsvImportSuccess = (importedCount) => {
    message.success(`Successfully imported ${importedCount} leads`);
    setCsvImportVisible(false);
    fetchLeads();
  };

  // Calculate totals for display
  const totalMyLeads = leads.filter(lead => lead.createdBy === sellerId).length;
  const totalAssignedToMe = leads.filter(lead => lead.seller_id === sellerId && lead.createdBy !== sellerId).length;

  return (
    <div style={{ padding: '24px' }}>
      {/* Page Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            <TeamOutlined style={{ marginRight: '12px', color: '#1890ff' }} />
            My Leads
          </Title>
          <Text type="secondary">
            Leads you created ({totalMyLeads}) + Leads assigned to you ({totalAssignedToMe})
          </Text>
        </Col>

        <Col>
          <Space size="middle">
            <Button icon={<ReloadOutlined />} onClick={fetchLeads} loading={loading}>
              Refresh
            </Button>

            <Button type="primary" icon={<UserAddOutlined />} onClick={handleAddLead} size="large">
              Add New Lead
            </Button>

            <Button icon={<UploadOutlined />} onClick={() => setCsvImportVisible(true)}>
              Import CSV
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Monthly Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="This Month" value={monthlyStats.total} prefix={<CalendarOutlined />} />
            <Progress 
              percent={monthlyStats.total > 0 ? Math.round(((monthlyStats.gain + monthlyStats.loss) / monthlyStats.total) * 100) : 0}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Pending" value={monthlyStats.pending} valueStyle={{ color: '#faad14' }} prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Converted" value={monthlyStats.gain} valueStyle={{ color: '#52c41a' }} prefix={<TrophyOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="High Interest" value={monthlyStats.highInterest} valueStyle={{ color: '#ff4d4f' }} prefix={<StarOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* Leads List */}
      <Card 
        title="Leads" 
        extra={
          <Tooltip title="Click any lead to view details">
            <InfoCircleOutlined style={{ color: '#1890ff', cursor: 'pointer' }} />
          </Tooltip>
        }
      >
        {loading && leads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>Loading leads...</div>
        ) : leads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#8c8c8c' }}>
            <UserAddOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
            <div>No leads available</div>
            <Button type="primary" icon={<UserAddOutlined />} onClick={handleAddLead} style={{ marginTop: 16 }}>
              Add Your First Lead
            </Button>
          </div>
        ) : (
          <SellerLeadList
            leads={leads}
            loading={loading}
            onViewLead={handleViewLead}
            onEditLead={handleEditLead}
            onDeleteLead={handleDeleteLead}
            onRevealLead={handleRevealLead}       
            sellerId={sellerId}
          />
        )}
      </Card>

      {/* Modals & Drawers */}
      <Modal
        title={selectedLead ? 'Edit Lead' : 'Add New Lead'}
        open={isFormVisible}
        onCancel={() => { setIsFormVisible(false); setSelectedLead(null); }}
        footer={null}
        width={800}
      >
        <SellerLeadForm
          lead={selectedLead}
          onSubmit={handleFormSubmit}
          onCancel={() => { setIsFormVisible(false); setSelectedLead(null); }}
          sellerId={sellerId}
          companyId={companyId}
        />
      </Modal>

      <SellerLeadDetail
        visible={isDetailVisible}
        lead={selectedLead}
        onEdit={handleEditLead}
        onAddNote={handleAddNote}
        onStatusChange={handleLeadStatusChange}
        onClose={() => { setIsDetailVisible(false); setSelectedLead(null); }}
      />

      <LeadEncouragementModal
        visible={encouragementModal.visible}
        status={encouragementModal.status}
        leadName={encouragementModal.leadName}
        onClose={() => setEncouragementModal({ visible: false, status: null, leadName: null })}
      />

      <CSVImportModal
        visible={csvImportVisible}
        onClose={() => setCsvImportVisible(false)}
        onSuccess={handleCsvImportSuccess}
      />
    </div>
  );
};

export default SellerLeadsPage;