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
    const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };
  const [csvImportVisible, setCsvImportVisible] = useState(false);
  const [monthlyStats, setMonthlyStats] = useState({
    total: 0,
    target: 30, // Default target for leads
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
  
  // Fetch leads assigned to current seller
  const fetchLeads = useCallback(async () => {
    if (!companyId || !sellerId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const sellerLeads = await LeadsService.getSellerLeads(companyId, sellerId);
      setLeads(sellerLeads);
      
      // Calculate monthly statistics
      calculateMonthlyStats(sellerLeads);
      
    } catch (err) {
      console.error('Error fetching leads:', err);
      message.error('Failed to load leads. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [companyId, sellerId]);
  
  // Calculate monthly statistics for progress tracking
  const calculateMonthlyStats = (leadList) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Filter leads by current month's creation date
    const monthlyLeads = leadList.filter(lead => {
      if (!lead.CreationDate) return false;
      const leadDate = new Date(lead.CreationDate);
      return leadDate.getMonth() === currentMonth && leadDate.getFullYear() === currentYear;
    });
    
    const stats = {
      total: monthlyLeads.length,
      target: 30, // Monthly target for leads
      pending: monthlyLeads.filter(l => l.status === LeadStatus.PENDING).length,
      gain: monthlyLeads.filter(l => l.status === LeadStatus.GAIN).length,
      loss: monthlyLeads.filter(l => l.status === LeadStatus.LOSS).length,
      highInterest: monthlyLeads.filter(l => l.InterestLevel === LeadInterestLevel.HIGH).length,
      mediumInterest: monthlyLeads.filter(l => l.InterestLevel === LeadInterestLevel.MEDIUM).length,
      lowInterest: monthlyLeads.filter(l => l.InterestLevel === LeadInterestLevel.LOW).length
    };
    
    setMonthlyStats(stats);
  };
  
  // Load leads on component mount
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);
  
// Handle submitting the lead form (create or update)
const handleFormSubmit = async (formData) => {
  try {
    // === CLEAN DATA: Remove undefined values ===
    const cleanedData = { ...formData };

    Object.keys(cleanedData).forEach(key => {
      if (cleanedData[key] === undefined || cleanedData[key] === '') {
        delete cleanedData[key];
      }
    });

    // Special handling for Budget
    if (cleanedData.Budget === undefined || cleanedData.Budget === null) {
      delete cleanedData.Budget;        // Remove completely
      // OR: cleanedData.Budget = null; // Alternative: set to null
    } else if (typeof cleanedData.Budget === 'string') {
      // Convert string budget to number if possible
      const numBudget = Number(cleanedData.Budget.replace(/[^0-9.]/g, ''));
      if (!isNaN(numBudget)) {
        cleanedData.Budget = numBudget;
      }
    }

    if (selectedLead?.id) {
      // === UPDATE EXISTING LEAD ===
      if (selectedLead.seller_id !== sellerId) {
        message.error("You can only edit leads assigned to you.");
        return;
      }

      await LeadsService.updateLead(selectedLead.id, cleanedData);
      message.success('Lead updated successfully');
      
    } else {
      // === CREATE NEW LEAD ===
      const leadData = {
        ...cleanedData,
        company_id: companyId,
        seller_id: sellerId,
        status: LeadStatus.PENDING,
        CreationDate: new Date(),
        Notes: cleanedData.initialNote ? [{
          note: cleanedData.initialNote,
          createdAt: new Date(),
          createdBy: sellerId
        }] : []
      };

      delete leadData.initialNote;

      await LeadsService.createLead(leadData);
      message.success('Lead created successfully and assigned to you');
    }

    fetchLeads();
    setIsFormVisible(false);
    setSelectedLead(null);
    
  } catch (err) {
    console.error('Error saving lead:', err);
    message.error('Failed to save lead. Please try again.');
  }
};
  
  // Handle opening the lead form for creating a new lead
  const handleAddLead = () => {
    setSelectedLead(null);
    setIsFormVisible(true);
  };
  
  // Handle viewing lead details
  const handleViewLead = (lead) => {
    setSelectedLead(lead);
    setIsDetailVisible(true);
  };
  
// Handle editing a lead
const handleEditLead = (lead) => {
  if (lead.seller_id !== sellerId) {
    message.warning("You can only edit leads assigned to you.");
    return;
  }
  setSelectedLead(lead);
  setIsFormVisible(true);
};

// Handle deleting a lead
const handleDeleteLead = async (leadId) => {
  const lead = leads.find(l => l.id === leadId);
  if (!lead || lead.seller_id !== sellerId) {
    message.error("You can only delete your own leads.");
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
  
  const currentUser = useSelector(state => state.auth.user);

const handleUpdateStatus = async (leadId, newStatus) => {
    try {
      const lead = leads.find(l => l.id === leadId);
      if (!lead) throw new Error('Lead not found');

      // Update lead status
      await LeadsService.updateLead(leadId, { status: newStatus });

      // Auto-create deal when status becomes GAIN
      if (newStatus === LeadStatus.GAIN) {
        const dealData = {
          Amount: lead.Budget || 0,
          Description: `Converted from lead: ${lead.name || 'Unnamed lead'}\n` +
            `Source: ${lead.RedirectedFrom || 'Unknown'}\n` +
            `Interest: ${lead.InterestLevel || '-'}\n` +
            `Region: ${lead.region || '-'}\n\n` +
            `Original lead note: ${lead.Notes?.[0]?.note || 'No initial note'}`,

          lead_id: lead.id,
          seller_id: lead.seller_id || currentUser?.id,
          company_id: lead.company_id || currentUser?.company_id,

          Status: DealStatus.GAIN,           // usually start as OPENED, not GAIN
          Source: DealSourceEnum.LEADS,

          contact_name: lead.name,
          contact_email: lead.email,
          contact_phone: lead.phoneNumber,

          property_id: null,
          CreationDate: new Date(),
        };

        await DealsService.createDeal(dealData);

        message.success(
          `Lead converted to Gain! New deal created for ${formatCurrency(lead.Budget || 0)}`
        );
      }

      // Show encouragement modal (your existing logic)
      if ([LeadStatus.GAIN, LeadStatus.LOSS].includes(newStatus)) {
        setEncouragementModal({
          visible: true,
          status: newStatus,
          leadName: lead?.name || 'Lead'
        });
      }

      fetchLeads(); // refresh list
    } catch (err) {
      console.error('Status update failed:', err);
      message.error('Failed to update lead status');
    }
  };
  
  // Handle adding a note to a lead
  const handleAddNote = async (leadId, noteText) => {
    try {
      await LeadsService.addNote(leadId, noteText);
      message.success('Note added successfully');
      
      // Refresh leads and update viewing lead if drawer is open
      await fetchLeads();
      
      if (selectedLead?.id === leadId) {
        const updatedLead = leads.find(l => l.id === leadId);
        if (updatedLead) {
          setSelectedLead(updatedLead);
        }
      }
      
      return true;
    } catch (err) {
      console.error('Error adding note:', err);
      message.error('Failed to add note.');
      return false;
    }
  };
  

  // Handle successful CSV import
  const handleCsvImportSuccess = (importedCount) => {
    message.success(`Successfully imported ${importedCount} leads from CSV`);
    setCsvImportVisible(false);
    fetchLeads(); // Refresh the leads list
  };

  const handleLeadStatusChange = async (leadId, newStatus) => {
  try {
    await LeadsService.updateLead(leadId, { status: newStatus });
    
    // Refresh your leads list
    await fetchLeads();        // or your refresh function
    
    message.success(`Lead status updated to ${newStatus}`);
  } catch (error) {
    console.error(error);
    message.error('Failed to update lead status');
  }
};
  
  return (
    <div style={{ padding: '24px' }}>
{/* Page Header */}
<Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
  <Col>
    <Title level={2} style={{ margin: 0 }}>
      <TeamOutlined style={{ marginRight: '12px', color: '#1890ff' }} />
      My Leads
    </Title>
    <Text type="secondary">Manage your assigned leads</Text>
  </Col>

  <Col>
    <Space size="middle">
      <Button 
        icon={<ReloadOutlined />} 
        onClick={fetchLeads} 
        loading={loading}
      >
        Refresh
      </Button>

      {/* === ADD LEAD BUTTON === */}
      <Button 
        type="primary" 
        icon={<UserAddOutlined />}
        onClick={handleAddLead}
        size="large"
      >
        Add New Lead
      </Button>

      <Button 
        icon={<UploadOutlined />}
        onClick={() => setCsvImportVisible(true)}
      >
        Import CSV
      </Button>
    </Space>
  </Col>
</Row>
      
      {/* Monthly Progress Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="This Month"
              value={monthlyStats.total}
              suffix={` Total`}
              valueStyle={{ color: '#1890ff' }}
              prefix={<CalendarOutlined />}
            />
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#8c8c8c' }}>
              Progress: {monthlyStats.gain + monthlyStats.loss} / {monthlyStats.total}
            </div>
            <Progress 
              percent={monthlyStats.total > 0 ? Math.round(((monthlyStats.gain + monthlyStats.loss) / monthlyStats.total) * 100) : 0}
              size="small"
              status={(monthlyStats.gain + monthlyStats.loss) >= monthlyStats.total ? 'success' : 'active'}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Pending"
              value={monthlyStats.pending}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Converted"
              value={monthlyStats.gain}
              valueStyle={{ color: '#52c41a' }}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="High Interest"
              value={monthlyStats.highInterest}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<StarOutlined />}
            />
            <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
              Medium: {monthlyStats.mediumInterest} | Low: {monthlyStats.lowInterest}
            </div>
          </Card>
        </Col>
      </Row>
      
      {/* Leads List */}
      <Card title="Leads" style={{ marginBottom: '24px' }}
       extra={
    <Tooltip title="Click any lead to view details, send WhatsApp/email, or log a call">
      <InfoCircleOutlined style={{ color: '#1890ff', cursor: 'pointer', fontSize: '20px' }} />
    </Tooltip>
  }>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            Loading leads...
          </div>
        ) : leads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#8c8c8c' }}>
            <UserAddOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>No leads yet</div>
            <div style={{ fontSize: '14px', marginBottom: '16px' }}>Start by adding your first lead</div>
            <Button 
              type="primary" 
              icon={<UserAddOutlined />}
              onClick={handleAddLead}
            >
              Add First Lead
            </Button>
          </div>
        ) : (
          <SellerLeadList
            leads={leads}
            loading={loading}
            onViewLead={handleViewLead}
            onEditLead={handleEditLead}
            onDeleteLead={handleDeleteLead}
            onUpdateStatus={handleUpdateStatus}
            onAddNote={handleAddNote}
            sellerId={sellerId}
          />
        )}
      </Card>

      {/* Add/Edit Lead Modal */}
      <Modal
        title={selectedLead ? 'Edit Lead' : 'Add New Lead'}
        open={isFormVisible}
        onCancel={() => {
          setIsFormVisible(false);
          setSelectedLead(null);
        }}
        footer={null}
        width={800}
      >
        <SellerLeadForm
          lead={selectedLead}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setIsFormVisible(false);
            setSelectedLead(null);
          }}
          loading={loading}
          sellerId={sellerId}      // ← Pass here
    companyId={companyId}    // ← Pass here
        />
      </Modal>

      {/* Lead Detail Drawer */}
      <SellerLeadDetail
        visible={isDetailVisible}
        lead={selectedLead}
        onEdit={handleEditLead}
        onAddNote={handleAddNote}
        onStatusChange={handleLeadStatusChange}   // ← This was missing
        onClose={() => {
          setIsDetailVisible(false);
          setSelectedLead(null);
        }}
      />

      {/* Encouragement Modal */}
      <LeadEncouragementModal
        visible={encouragementModal.visible}
        status={encouragementModal.status}
        leadName={encouragementModal.leadName}
        onClose={() => setEncouragementModal({ visible: false, status: null, leadName: null })}
      />

      {/* CSV Import Modal */}
      <CSVImportModal
        visible={csvImportVisible}
        onClose={() => setCsvImportVisible(false)}
        onSuccess={handleCsvImportSuccess}
      />
    </div>
  );
};

export default SellerLeadsPage;