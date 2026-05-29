import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Typography, Space, Button, message, Modal,
  Row, Col, Divider, Badge, Tooltip, Tag, Spin
} from 'antd';
import { useSelector } from 'react-redux';
import {
  PlusOutlined,
  ExclamationCircleOutlined,
  UploadOutlined,
  SyncOutlined,
  FacebookOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { db, collection, getDocs } from 'configs/FirebaseConfig';
import LeadService from 'services/firebase/LeadService';
import { LeadStatus, LeadInterestLevel } from 'models/LeadModel';
import { serverTimestamp } from 'firebase/firestore';
import * as XLSX from 'xlsx';

// Import components
import LeadTable from './components/LeadTable';
import LeadForm from './components/LeadForm';
import LeadDetailsPro from './components/LeadDetails';
import LeadFilters from './components/LeadFilters';
import AssignSellerForm from './components/AssignSellerForm';
import LeadStats from './components/LeadStats';
import LeadStatsDrawer from './components/LeadStatsDrawer';
import { UserRoles } from 'models/UserModel';
import API_BASE_URL from "../../../../constants/ApiConstant";

const { Title, Text } = Typography;
const { confirm } = Modal;


const salesRoles = [
  UserRoles.SELLER,
  UserRoles.SALES_EXECUTIVE,
  UserRoles.AGENT,
  UserRoles.TEAM_LEADER,
  UserRoles.SALES_MANAGER,
  UserRoles.OFF_PLAN_SALES,
  UserRoles.READY_TO_MOVE_SALES,
];

// ─── Meta → Lead model mapper ───────────────────────────────────────────────
// ─── Enhanced Meta → Lead Model Mapper ─────────────────────────────────────
const mapMetaLeadToModel = (metaLead, companyId) => {
  const raw = metaLead.raw_fields || {};

  // Extract useful fields from raw_fields (Arabic + English support)
  const budget = raw["ما_هي_ميزانيتك_الاستثمارية_لشراء_الفيلا؟"] ||
                 raw.what_is_your_apartment_investment_budget ||
                 raw.budget;

  const lookingFor = raw["ما_الذي_تبحث_عنه؟"] ||
                     raw.what_are_you_looking_for ||
                     raw.looking_for;

  const nationality = raw.nationality || raw.country || '';

  return {
    name:           metaLead.full_name || raw.full_name || 'Unknown',
    email:          metaLead.email || raw.email || '',
    phoneNumber:    metaLead.phone_number || raw.phone_number || raw.work_phone_number || '',
    
    secondaryEmail: raw.secondary_email || '',
    phoneNumber2:   raw.secondary_phone || raw.additional_phone || '',
    
    region:         nationality || 'UAE',
    status:         LeadStatus.PENDING,
    InterestLevel:  LeadInterestLevel.MEDIUM,
    
    Budget:         budget ? String(budget) : null,
    lookingFor:     lookingFor || null,           // ← NEW: Important field
    
    RedirectedFrom: 'Facebook',
    company_id:     companyId,
    
    Notes:          [],
    
    CreationDate:   metaLead.created_time 
                      ? new Date(metaLead.created_time) 
                      : new Date(),
    
    // Meta Tracking Fields (Very Important for deduplication & analytics)
    meta_lead_id:   metaLead.lead_id,
    meta_form_id:   metaLead.form_id,
    meta_form_name: metaLead.form_name,
    meta_ad_name:   metaLead.ad_name || '',
    meta_campaign:  metaLead.campaign_name || '',
    meta_adset:     metaLead.adset_name || '',
    meta_platform:  metaLead.platform || 'facebook',

    // Store everything for future use
    raw_meta_fields: raw,
    
    // Optional: Add source details
    sourceDetails: {
      formName: metaLead.form_name,
      adName: metaLead.ad_name,
      campaign: metaLead.campaign_name,
    },

    // Timestamps
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
};

// ─── Meta Sync Modal ─────────────────────────────────────────────────────────
const MetaSyncModal = ({
  visible,
  onClose,
  syncing,
  syncResult,
  onSync,
}) => (
  <Modal
    title={
      <Space>
        <FacebookOutlined style={{ color: '#1877F2', fontSize: 20 }} />
        <span>Sync Meta Leads</span>
      </Space>
    }
    open={visible}
    onCancel={onClose}
    footer={
      syncResult ? (
        <Button type="primary" onClick={onClose}>Done</Button>
      ) : (
        <Space>
          <Button onClick={onClose} disabled={syncing}>Cancel</Button>
          <Button
            type="primary"
            icon={<SyncOutlined spin={syncing} />}
            loading={syncing}
            onClick={onSync}
            style={{ background: '#1877F2', borderColor: '#1877F2' }}
          >
            Sync Now
          </Button>
        </Space>
      )
    }
    width={480}
  >
    {!syncing && !syncResult && (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <FacebookOutlined style={{ fontSize: 48, color: '#1877F2', marginBottom: 16 }} />
        <Title level={5} style={{ marginBottom: 8 }}>Pull Leads from Facebook Forms</Title>
        <Text type="secondary">
          This will fetch all leads from your active Meta Lead Ad forms
          and save new ones to your CRM. Existing leads (matched by Meta
          Lead ID) will be skipped automatically.
        </Text>
      </div>
    )}

    {syncing && (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Fetching leads from Meta…</Text>
        </div>
      </div>
    )}

    {syncResult && (
      <div style={{ padding: '8px 0' }}>
        {syncResult.error ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <CloseCircleOutlined style={{ fontSize: 40, color: '#ff4d4f', marginBottom: 12 }} />
            <div><Text type="danger">{syncResult.error}</Text></div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <CheckCircleOutlined style={{ fontSize: 40, color: '#52c41a', marginBottom: 12 }} />
            <Title level={4} style={{ margin: 0 }}>{syncResult.saved} new leads imported</Title>
            <Text type="secondary">
              {syncResult.total} fetched · {syncResult.skipped} already existed · {syncResult.failed} failed
            </Text>
          </div>
        )}
      </div>
    )}
  </Modal>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const LeadsPage = () => {
  const initialFilters = {
    search: '',
    status: '',
    InterestLevel: '',
    region: '',
    seller_id: '',
  };

  // State
  const [leads, setLeads]                       = useState([]);
  const [loading, setLoading]                   = useState(false);
  const [formVisible, setFormVisible]           = useState(false);
  const [confirmLoading, setConfirmLoading]     = useState(false);
  const [editingLead, setEditingLead]           = useState(null);
  const [selectedLead, setSelectedLead]         = useState(null);
  const [detailsVisible, setDetailsVisible]     = useState(false);
  const [sellers, setSellers]                   = useState([]);
  const [assignSellerVisible, setAssignSellerVisible] = useState(false);
  const [assigningLead, setAssigningLead]       = useState(null);
  const [filters, setFilters]                   = useState(initialFilters);
  const [statsDrawerVisible, setStatsDrawerVisible] = useState(false);

  // Meta sync state
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [syncing, setSyncing]                   = useState(false);
  const [syncResult, setSyncResult]             = useState(null);
  const [newMetaLeadsCount, setNewMetaLeadsCount] = useState(0);

  const user      = useSelector(state => state.auth.user);
  const companyId = user?.company_id;

  useEffect(() => {
    if (companyId) {
      fetchLeads();
      fetchSellers();
    }
  }, [companyId]);

  // ─── Fetch leads ──────────────────────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      let leadsData;

      if (filters.search) {
        leadsData = await LeadService.searchLeads(companyId, filters.search);
      } else {
        leadsData = await LeadService.getLeadsByCompany(companyId);
      }

      if (filters.status)        leadsData = leadsData.filter(l => l.status        === filters.status);
      if (filters.InterestLevel) leadsData = leadsData.filter(l => l.InterestLevel === filters.InterestLevel);
      if (filters.region)        leadsData = leadsData.filter(l => l.region        === filters.region);
      if (filters.seller_id)     leadsData = leadsData.filter(l => l.seller_id     === filters.seller_id);

      setLeads(leadsData);
    } catch (error) {
      console.error('Error fetching leads:', error);
      message.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, [companyId, filters]);

  // ─── Fetch sellers ────────────────────────────────────────────────────────
  const fetchSellers = async () => {
    try {
      const usersRef      = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);

      const sellersList = usersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.company_id === companyId && salesRoles.includes(u.Role))
        .map(u => ({
          id:   u.id,
          name: `${u.firstname ?? ''} ${u.lastname ?? ''}${u.country ? ` (${u.country})` : ''}`.trim(),
        }));

      setSellers(sellersList);
    } catch (error) {
      console.error('Error fetching sellers:', error);
      message.error('Failed to fetch sellers');
    }
  };

  // ─── Meta Sync ────────────────────────────────────────────────────────────
  const openSyncModal = () => {
    setSyncResult(null);
    setSyncModalVisible(true);
  };

const handleMetaSync = async () => {
  setSyncing(true);
  setSyncResult(null);

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/facebook/leads?company_id=${companyId}&limit=200`
    );

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to fetch Meta leads');
    }

    const json = await res.json();
    const metaLeads = json.leads || [];

    if (metaLeads.length === 0) {
      setSyncResult({ total: 0, saved: 0, skipped: 0, failed: 0 });
      return;
    }

    // Fetch existing leads once
    const existingLeads = await LeadService.getLeadsByCompany(companyId);

    // Create lookup sets for fast deduplication
    const existingMetaIds = new Set(
      existingLeads.map(l => l.meta_lead_id).filter(Boolean)
    );

    const existingEmails = new Set(
      existingLeads
        .map(l => l.email?.toLowerCase().trim())
        .filter(Boolean)
    );

    const existingPhones = new Set(
      existingLeads
        .map(l => normalizePhone(l.phoneNumber))
        .filter(Boolean)
    );

    let saved = 0, skipped = 0, failed = 0;

    for (const metaLead of metaLeads) {
      const email = (metaLead.email || metaLead.raw_fields?.email || '').toLowerCase().trim();
      const phone = normalizePhone(metaLead.phone_number || metaLead.raw_fields?.phone_number);

      // === Duplicate Check Logic ===
      if (existingMetaIds.has(metaLead.lead_id)) {
        skipped++;
        continue;
      }

      if (email && existingEmails.has(email)) {
        skipped++;
        console.log(`Skipped duplicate by email: ${email}`);
        continue;
      }

      if (phone && existingPhones.has(phone)) {
        skipped++;
        console.log(`Skipped duplicate by phone: ${phone}`);
        continue;
      }

      // No duplicate found → Save new lead
      try {
        const leadData = mapMetaLeadToModel(metaLead, companyId);
        await LeadService.create(leadData);

        // Add to local sets to prevent duplicates within the same sync batch
        if (email) existingEmails.add(email);
        if (phone) existingPhones.add(phone);
        existingMetaIds.add(metaLead.lead_id);

        saved++;
      } catch (err) {
        console.error('Failed to save Meta lead:', metaLead.lead_id, err);
        failed++;
      }
    }

    const result = { total: metaLeads.length, saved, skipped, failed };
    setSyncResult(result);

    if (saved > 0) {
      message.success(`${saved} new Meta lead${saved > 1 ? 's' : ''} imported successfully!`);
      fetchLeads();
    } else if (skipped > 0) {
      message.info(`All leads already exist (${skipped} skipped).`);
    }
  } catch (err) {
    console.error('Meta sync error:', err);
    setSyncResult({ error: err.message });
    message.error('Sync failed: ' + err.message);
  } finally {
    setSyncing(false);
  }
};

// Helper function to normalize phone numbers
const normalizePhone = (phone) => {
  if (!phone) return null;
  return phone.toString()
    .replace(/[^0-9+]/g, '')           // Remove non-numeric except +
    .replace(/^00/, '+')               // Convert 00 to +
    .trim();
};

  // ─── CRUD handlers ────────────────────────────────────────────────────────
  const handleAddLead = async (values) => {
    setConfirmLoading(true);
    try {
      const leadData = {
        ...values,
        company_id:   companyId,
        CreationDate: values.CreationDate?.toDate() || serverTimestamp(),
        Notes:        [],
        secondaryEmail: values.secondaryEmail || '',
        phoneNumber2:   values.phoneNumber2   || '',
      };
      await LeadService.create(leadData);
      message.success('Lead created successfully');
      setFormVisible(false);
      fetchLeads();
    } catch (error) {
      console.error('Error adding lead:', error);
      message.error('Failed to create lead');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleUpdateLead = async (values) => {
    setConfirmLoading(true);
    try {
      const updateData = {
        ...values,
        CreationDate:   values.CreationDate?.toDate() || editingLead.CreationDate,
        secondaryEmail: values.secondaryEmail || '',
        phoneNumber2:   values.phoneNumber2   || '',
      };
      await LeadService.update(editingLead.id, updateData);
      message.success('Lead updated successfully');
      setFormVisible(false);
      setEditingLead(null);
      fetchLeads();
      if (selectedLead?.id === editingLead.id) setSelectedLead({ ...selectedLead, ...updateData });
    } catch (error) {
      console.error('Error updating lead:', error);
      message.error('Failed to update lead');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleDeleteLead = (lead) => {
    confirm({
      title:      'Are you sure you want to delete this lead?',
      icon:       <ExclamationCircleOutlined />,
      content:    'This action cannot be undone.',
      okText:     'Yes',
      okType:     'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          await LeadService.delete(lead.id);
          message.success('Lead deleted successfully');
          fetchLeads();
          if (selectedLead?.id === lead.id) { setDetailsVisible(false); setSelectedLead(null); }
        } catch (error) {
          console.error('Error deleting lead:', error);
          message.error('Failed to delete lead');
        }
      },
    });
  };

  const handleAssignSeller = async (leadId, sellerId) => {
    try {
      const selectedSeller = sellers.find(s => s.id === sellerId);
      if (!selectedSeller) throw new Error('Seller not found');
      await LeadService.assignTo(leadId, {
        id:        sellerId,
        firstName: selectedSeller.firstname || '',
        lastName:  selectedSeller.lastname  || '',
      });
      message.success(`Lead assigned to ${selectedSeller.name || 'seller'}`);
      fetchLeads();
    } catch (error) {
      message.error('Failed to assign seller');
    }
  };

  const handleShowAssignSeller = (lead) => {
    if (sellers.length === 0) {
      message.warning('No sellers available in your company. Please add sellers first.');
      return;
    }
    setAssigningLead(lead);
    setAssignSellerVisible(true);
  };

  const handleAddNote = async (leadId, note) => {
    try {
      const lead  = await LeadService.getById(leadId);
      const notes = [...(lead.Notes || []), note];
      await LeadService.update(leadId, { Notes: notes });
      message.success('Note added successfully');
      if (selectedLead?.id === leadId) {
        const updated = await LeadService.getById(leadId);
        setSelectedLead(updated);
      }
      fetchLeads();
    } catch (error) {
      console.error('Error adding note:', error);
      message.error('Failed to add note');
    }
  };

  const handleViewDetails = (lead) => { setSelectedLead(lead); setDetailsVisible(true); };
  const handleEditLead    = (lead) => { setEditingLead(lead);   setFormVisible(true);   };
  const handleFilter      = (values) => { setFilters(values); fetchLeads(); };
  const handleClearFilters = ()       => { setFilters(initialFilters); fetchLeads(); };
  const handleSearch      = (value)  => { setFilters({ ...filters, search: value }); fetchLeads(); };
  const handleFormSubmit  = (values) => editingLead ? handleUpdateLead(values) : handleAddLead(values);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setConfirmLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const wb   = XLSX.read(evt.target.result, { type: 'binary' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const validLeads = data
          .map((row, index) => {
            const name  = row['Full Name'] || row['Name'] || row['name'];
            const email = row['Email']     || row['email'];
            const phone = row['Phone']     || row['phoneNumber'] || row['Phone Number'];
            if (!name || !email || !phone) {
              message.warning(`Row ${index + 2}: Missing required fields (Name, Email, Phone)`);
              return null;
            }
            return {
              name:           name.trim(),
              email:          email.trim(),
              phoneNumber:    phone.toString().trim(),
              region:         row['Region']           || row['Country'] || 'UAE',
              status:         row['Status'],
              InterestLevel:  row['Interest Level'],
              Budget:         Number(row['Budget'])   || 0,
              secondaryEmail: row['Secondary Email']  || '',
              RedirectedFrom: row['Lead Source'],
              phoneNumber2:   row['Secondary Phone']  || '',
              CreationDate:   new Date(),
              company_id:     companyId,
              Notes:          [],
            };
          })
          .filter(Boolean);

        if (validLeads.length === 0) { message.error('No valid leads to import'); return; }

        for (const lead of validLeads) await LeadService.create(lead);
        message.success(`${validLeads.length} leads imported successfully`);
        fetchLeads();
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('Import error:', error);
      message.error('Failed to import file');
    } finally {
      setConfirmLoading(false);
      e.target.value = '';
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="leads-page">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card className="leads-header">
            <div className="d-flex justify-content-between align-items-center">
              <Title level={2} style={{ margin: 0 }}>Leads Management</Title>

              <Space wrap>
                {/* ── Meta Sync Button ── */}
                <Tooltip title="Sync leads from Meta (Facebook) Lead Ad forms">
                  <Badge count={newMetaLeadsCount} size="small">
                    <Button
                      icon={<FacebookOutlined />}
                      onClick={openSyncModal}
                      style={{
                        background:   '#1877F2',
                        borderColor:  '#1877F2',
                        color:        '#fff',
                        fontWeight:   600,
                        display:      'flex',
                        alignItems:   'center',
                        gap:          4,
                      }}
                    >
                      Sync Meta Leads
                    </Button>
                  </Badge>
                </Tooltip>

                {/* ── Import CSV ── */}
                <Button
                  type="default"
                  icon={<UploadOutlined />}
                  onClick={() => document.getElementById('csv-upload').click()}
                >
                  Import CSV/Excel
                </Button>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />

                {/* ── Add Lead ── */}
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => { setEditingLead(null); setFormVisible(true); }}
                >
                  Add Lead
                </Button>
              </Space>
            </div>

            <LeadFilters
              onSearch={handleSearch}
              onFilter={handleFilter}
              onClear={handleClearFilters}
              sellers={sellers}
              loading={loading}
              filters={filters}
            />
          </Card>
        </Col>

        <Col span={24}>
          <Card>
            <div className="mb-4">
              <LeadStats
                leads={leads}
                loading={loading}
                onShowDetailStats={() => setStatsDrawerVisible(true)}
              />
            </div>
            <Divider />
            <LeadTable
              leads={leads}
              loading={loading}
              onEdit={handleEditLead}
              onDelete={handleDeleteLead}
              onAssignSeller={handleShowAssignSeller}
              onViewDetails={handleViewDetails}
            />
          </Card>
        </Col>
      </Row>

      {/* Lead form modal */}
      <LeadForm
        visible={formVisible}
        onCancel={() => { setFormVisible(false); setEditingLead(null); }}
        onSubmit={handleFormSubmit}
        confirmLoading={confirmLoading}
        editingLead={editingLead}
        sellers={sellers}
      />

      {/* Lead details drawer */}
      <LeadDetailsPro
        visible={detailsVisible}
        onClose={() => setDetailsVisible(false)}
        lead={selectedLead}
        onEdit={handleEditLead}
        onAddNote={handleAddNote}
      />

      {/* Assign seller modal */}
      <AssignSellerForm
        visible={assignSellerVisible}
        onCancel={() => { setAssignSellerVisible(false); setAssigningLead(null); }}
        onSubmit={handleAssignSeller}
        confirmLoading={confirmLoading}
        lead={assigningLead}
        sellers={sellers}
      />

      {/* Stats drawer */}
      <LeadStatsDrawer
        visible={statsDrawerVisible}
        onClose={() => setStatsDrawerVisible(false)}
        leads={leads}
        sellers={sellers}
        loading={loading}
      />

      {/* ── Meta Sync Modal ── */}
      <MetaSyncModal
        visible={syncModalVisible}
        onClose={() => setSyncModalVisible(false)}
        syncing={syncing}
        syncResult={syncResult}
        onSync={handleMetaSync}
      />
    </div>
  );
};

export default LeadsPage;