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

import LeadTable        from './components/LeadTable';
import LeadForm         from './components/LeadForm';
import LeadDetailsPro   from './components/LeadDetails';
import LeadFilters      from './components/LeadFilters';
import AssignSellerForm from './components/AssignSellerForm';
import LeadStats        from './components/LeadStats';
import LeadStatsDrawer  from './components/LeadStatsDrawer';
import { UserRoles }    from 'models/UserModel';
import API_BASE_URL     from '../../../../constants/ApiConstant';

const { Title, Text } = Typography;
const { confirm }     = Modal;

const salesRoles = [
  UserRoles.SELLER,
  UserRoles.SALES_EXECUTIVE,
  UserRoles.AGENT,
  UserRoles.TEAM_LEADER,
  UserRoles.SALES_MANAGER,
  UserRoles.OFF_PLAN_SALES,
  UserRoles.READY_TO_MOVE_SALES,
];

// ─── Meta → Lead mapper ───────────────────────────────────────────────────────
const mapMetaLeadToModel = (metaLead, companyId) => {
  const raw = metaLead.raw_fields || {};
  
  const budget =
    raw['ما_هي_ميزانيتك_الاستثمارية_لشراء_الفيلا؟'] ||
    raw.what_is_your_apartment_investment_budget ||
    raw.budget;

  const lookingFor =
    raw['ما_الذي_تبحث_عنه؟'] || raw.what_are_you_looking_for || raw.looking_for;

  const nationality = raw.nationality || raw.country || '';

  // Determine source based on platform
  let redirectedFrom = 'Facebook';
  if (metaLead.platform === 'ig' || metaLead.meta_platform === 'ig') {
    redirectedFrom = 'Instagram';
  }

  return {
    name:            metaLead.full_name || raw.full_name || 'Unknown',
    email:           metaLead.email || raw.email || '',
    phoneNumber:     metaLead.phone_number || raw.phone_number || raw.work_phone_number || '',
    secondaryEmail:  raw.secondary_email || '',
    phoneNumber2:    raw.secondary_phone || raw.additional_phone || '',
    region:          nationality || 'UAE',
    status:          LeadStatus.PENDING,
    InterestLevel:   LeadInterestLevel.MEDIUM,
    Budget:          budget ? String(budget) : null,
    lookingFor:      lookingFor || null,
    
    // ✅ Dynamic source based on platform
    RedirectedFrom:  redirectedFrom,
    
    company_id:      companyId,
    Notes:           [],
    CreationDate:    metaLead.created_time ? new Date(metaLead.created_time) : new Date(),
    
    meta_lead_id:    metaLead.lead_id,
    meta_form_id:    metaLead.form_id,
    meta_form_name:  metaLead.form_name,
    meta_ad_name:    metaLead.ad_name || '',
    meta_campaign:   metaLead.campaign_name || '',
    meta_adset:      metaLead.adset_name || '',
    
    // Keep original platform for reference
    meta_platform:   metaLead.platform || metaLead.meta_platform || 'facebook',
    
    raw_meta_fields: raw,
    sourceDetails: {
      formName: metaLead.form_name,
      adName:   metaLead.ad_name,
      campaign: metaLead.campaign_name,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
};

// ─── Meta Sync Modal ──────────────────────────────────────────────────────────
const MetaSyncModal = ({ visible, onClose, syncing, syncResult, onSync }) => (
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
          This will fetch all leads from your active Meta Lead Ad forms and save new ones to your
          CRM. Existing leads (matched by Meta Lead ID) will be skipped automatically.
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
  const initialFilters = { search: '', status: '', InterestLevel: '', region: '', seller_id: '' };

  const [leads, setLeads]                           = useState([]);
  const [loading, setLoading]                       = useState(false);
  const [formVisible, setFormVisible]               = useState(false);
  const [confirmLoading, setConfirmLoading]         = useState(false);
  const [editingLead, setEditingLead]               = useState(null);
  const [selectedLead, setSelectedLead]             = useState(null);
  const [detailsVisible, setDetailsVisible]         = useState(false);
  const [sellers, setSellers]                       = useState([]);
  const [assignSellerVisible, setAssignSellerVisible] = useState(false);
  const [assigningLead, setAssigningLead]           = useState(null);
  const [filters, setFilters]                       = useState(initialFilters);
  const [statsDrawerVisible, setStatsDrawerVisible] = useState(false);

  // Bulk assign state
  const [bulkAssignVisible, setBulkAssignVisible]   = useState(false);
  const [bulkLeadIds, setBulkLeadIds]               = useState([]);

  // Meta sync state
  const [syncModalVisible, setSyncModalVisible]     = useState(false);
  const [syncing, setSyncing]                       = useState(false);
  const [syncResult, setSyncResult]                 = useState(null);

  const user      = useSelector(state => state.auth.user);
  const companyId = user?.company_id;

  useEffect(() => {
    if (companyId) { fetchLeads(); fetchSellers(); }
  }, [companyId]);

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      let leadsData = filters.search
        ? await LeadService.searchLeads(companyId, filters.search)
        : await LeadService.getLeadsByCompany(companyId);

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

  const fetchSellers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.company_id === companyId && salesRoles.includes(u.Role))
        .map(u => ({
          id:   u.id,
          name: `${u.firstname ?? ''} ${u.lastname ?? ''}${u.country ? ` (${u.country})` : ''}`.trim(),
        }));
      setSellers(list);
    } catch (error) {
      message.error('Failed to fetch sellers');
    }
  };

  // ─── Meta Sync ────────────────────────────────────────────────────────────
  const normalizePhone = (phone) => {
    if (!phone) return null;
    return phone.toString().replace(/[^0-9+]/g, '').replace(/^00/, '+').trim();
  };

  const openSyncModal = () => { setSyncResult(null); setSyncModalVisible(true); };

  const handleMetaSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/facebook/leads?company_id=${companyId}&limit=200`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch Meta leads');
      }
      const { leads: metaLeads = [] } = await res.json();
      if (metaLeads.length === 0) { setSyncResult({ total: 0, saved: 0, skipped: 0, failed: 0 }); return; }

      const existing     = await LeadService.getLeadsByCompany(companyId);
      const metaIds      = new Set(existing.map(l => l.meta_lead_id).filter(Boolean));
      const emails       = new Set(existing.map(l => l.email?.toLowerCase().trim()).filter(Boolean));
      const phones       = new Set(existing.map(l => normalizePhone(l.phoneNumber)).filter(Boolean));

      let saved = 0, skipped = 0, failed = 0;

      for (const ml of metaLeads) {
        const email = (ml.email || ml.raw_fields?.email || '').toLowerCase().trim();
        const phone = normalizePhone(ml.phone_number || ml.raw_fields?.phone_number);

        if (metaIds.has(ml.lead_id) || (email && emails.has(email)) || (phone && phones.has(phone))) {
          skipped++; continue;
        }
        try {
          await LeadService.create(mapMetaLeadToModel(ml, companyId));
          if (email) emails.add(email);
          if (phone) phones.add(phone);
          metaIds.add(ml.lead_id);
          saved++;
        } catch { failed++; }
      }

      setSyncResult({ total: metaLeads.length, saved, skipped, failed });
      if (saved > 0) { message.success(`${saved} new Meta lead${saved > 1 ? 's' : ''} imported!`); fetchLeads(); }
      else if (skipped > 0) message.info(`All leads already exist (${skipped} skipped).`);
    } catch (err) {
      setSyncResult({ error: err.message });
      message.error('Sync failed: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  // ─── CRUD ─────────────────────────────────────────────────────────────────
  const handleAddLead = async (values) => {
    setConfirmLoading(true);
    try {
      await LeadService.create({
        ...values,
        company_id:     companyId,
        CreationDate:   values.CreationDate?.toDate() || serverTimestamp(),
        Notes:          [],
        secondaryEmail: values.secondaryEmail || '',
        phoneNumber2:   values.phoneNumber2   || '',
      });
      message.success('Lead created successfully');
      setFormVisible(false);
      fetchLeads();
    } catch { message.error('Failed to create lead'); }
    finally { setConfirmLoading(false); }
  };

  const handleUpdateLead = async (values) => {
    setConfirmLoading(true);
    try {
      const data = {
        ...values,
        CreationDate:   values.CreationDate?.toDate() || editingLead.CreationDate,
        secondaryEmail: values.secondaryEmail || '',
        phoneNumber2:   values.phoneNumber2   || '',
      };
      await LeadService.update(editingLead.id, data);
      message.success('Lead updated');
      setFormVisible(false);
      setEditingLead(null);
      fetchLeads();
      if (selectedLead?.id === editingLead.id) setSelectedLead({ ...selectedLead, ...data });
    } catch { message.error('Failed to update lead'); }
    finally { setConfirmLoading(false); }
  };

  const handleDeleteLead = (lead) =>
    confirm({
      title:      'Delete this lead?',
      icon:       <ExclamationCircleOutlined />,
      content:    'This action cannot be undone.',
      okText:     'Delete',
      okType:     'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await LeadService.delete(lead.id);
          message.success('Lead deleted');
          fetchLeads();
          if (selectedLead?.id === lead.id) { setDetailsVisible(false); setSelectedLead(null); }
        } catch { message.error('Failed to delete lead'); }
      },
    });

  // Single assign
  const handleAssignSeller = async (leadId, sellerId) => {
    try {
      const seller = sellers.find(s => s.id === sellerId);
      if (!seller) throw new Error('Seller not found');
      await LeadService.assignTo(leadId, { id: sellerId, firstName: '', lastName: '' });
      message.success(`Lead assigned to ${seller.name}`);
      fetchLeads();
    } catch { message.error('Failed to assign seller'); }
  };

  // Bulk assign
  const handleBulkAssignSeller = async (leadIds, sellerId) => {
    setConfirmLoading(true);
    try {
      const seller = sellers.find(s => s.id === sellerId);
      await Promise.all(leadIds.map(id => LeadService.assignTo(id, { id: sellerId, firstName: '', lastName: '' })));
      message.success(`${leadIds.length} leads assigned to ${seller?.name || 'seller'}`);
      setBulkAssignVisible(false);
      setBulkLeadIds([]);
      fetchLeads();
    } catch { message.error('Failed to bulk assign'); }
    finally { setConfirmLoading(false); }
  };

  const handleShowAssignSeller = (lead) => {
    if (!sellers.length) { message.warning('No sellers available.'); return; }
    setAssigningLead(lead);
    setAssignSellerVisible(true);
  };

  const handleBulkAssignOpen = (ids) => {
    if (!sellers.length) { message.warning('No sellers available.'); return; }
    setBulkLeadIds(ids);
    setBulkAssignVisible(true);
  };

  const handleAddNote = async (leadId, note) => {
    try {
      const lead  = await LeadService.getById(leadId);
      const notes = [...(lead.Notes || []), note];
      await LeadService.update(leadId, { Notes: notes });
      message.success('Note added');
      if (selectedLead?.id === leadId) setSelectedLead(await LeadService.getById(leadId));
      fetchLeads();
    } catch { message.error('Failed to add note'); }
  };

  const handleViewDetails  = (lead)   => { setSelectedLead(lead); setDetailsVisible(true); };
  const handleEditLead     = (lead)   => { setEditingLead(lead);   setFormVisible(true);   };
  const handleFilter       = (values) => { setFilters(values);     fetchLeads(); };
  const handleClearFilters = ()       => { setFilters(initialFilters); fetchLeads(); };
  const handleSearch       = (value)  => { setFilters({ ...filters, search: value }); fetchLeads(); };
  const handleFormSubmit   = (values) => editingLead ? handleUpdateLead(values) : handleAddLead(values);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setConfirmLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const wb   = XLSX.read(evt.target.result, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        const valid = data
          .map((row, i) => {
            const name  = row['Full Name'] || row['Name'] || row['name'];
            const email = row['Email']     || row['email'];
            const phone = row['Phone']     || row['phoneNumber'] || row['Phone Number'];
            if (!name || !email || !phone) { message.warning(`Row ${i + 2}: Missing required fields`); return null; }
            return {
              name: name.trim(), email: email.trim(), phoneNumber: phone.toString().trim(),
              region: row['Region'] || 'UAE', status: row['Status'],
              InterestLevel: row['Interest Level'], Budget: Number(row['Budget']) || 0,
              secondaryEmail: row['Secondary Email'] || '', RedirectedFrom: row['Lead Source'],
              phoneNumber2: row['Secondary Phone'] || '', CreationDate: new Date(),
              company_id: companyId, Notes: [],
            };
          })
          .filter(Boolean);
        if (!valid.length) { message.error('No valid leads to import'); return; }
        for (const lead of valid) await LeadService.create(lead);
        message.success(`${valid.length} leads imported`);
        fetchLeads();
      };
      reader.readAsBinaryString(file);
    } catch { message.error('Failed to import file'); }
    finally { setConfirmLoading(false); e.target.value = ''; }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="leads-page" style={{ padding: '0 0 24px' }}>
     <Row gutter={[24, 24]}>
  {/* ==================== HEADER ==================== */}
  <Col span={24}>
    <Card
      bordered={false}
      style={{ 
        borderRadius: 16, 
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        background: 'linear-gradient(145deg, #ffffff 0%, #fafafa 100%)'
      }}
      bodyStyle={{ padding: '20px 24px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 600 }}>
            Leads Management
          </Title>
          <Text type="secondary">Manage and track all your real estate leads</Text>
        </div>

        <Space wrap size={10}>
          {/* Meta Sync Button */}
          <Tooltip title="Sync leads from Facebook Meta Forms">
            <Button
              icon={<FacebookOutlined />}
              onClick={openSyncModal}
              style={{ 
                background: '#1877F2', 
                borderColor: '#1877F2', 
                color: '#fff', 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              Sync Meta Leads
            </Button>
          </Tooltip>

          {/* Import Button */}
          <Button
            icon={<UploadOutlined />}
            onClick={() => document.getElementById('csv-upload').click()}
          >
            Import CSV / Excel
          </Button>

          <input
            id="csv-upload"
            type="file"
            accept=".csv,.xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />

          {/* Add New Lead */}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => { 
              setEditingLead(null); 
              setFormVisible(true); 
            }}
            style={{ height: 40, padding: '0 20px' }}
          >
            Add New Lead
          </Button>
        </Space>
      </div>

      <Divider style={{ margin: '18px 0 12px 0' }} />

      {/* Filters */}
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

  {/* ==================== QUICK STATS ==================== */}
  <Col span={24}>
    <LeadStats
      leads={leads}
      loading={loading}
      onShowDetailStats={() => setStatsDrawerVisible(true)}
    />
  </Col>

  {/* ==================== MAIN TABLE ==================== */}
  <Col span={24}>
    <Card
      bordered={false}
      style={{ 
        borderRadius: 16, 
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)' 
      }}
      bodyStyle={{ padding: 0 }}
    >
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0' }}>
        <Title level={5} style={{ margin: 0 }}>
          All Leads 
          <Text type="secondary" style={{ marginLeft: 8, fontSize: 14 }}>
            ({leads.length} total)
          </Text>
        </Title>
      </div>

      <LeadTable
        leads={leads}
        loading={loading}
        onEdit={handleEditLead}
        onDelete={handleDeleteLead}
        onAssignSeller={handleShowAssignSeller}
        onViewDetails={handleViewDetails}
        onBulkAssign={handleBulkAssignOpen}
      />
    </Card>
  </Col>
</Row>

      {/* Modals & Drawers */}
      <LeadForm
        visible={formVisible}
        onCancel={() => { setFormVisible(false); setEditingLead(null); }}
        onSubmit={handleFormSubmit}
        confirmLoading={confirmLoading}
        editingLead={editingLead}
        sellers={sellers}
      />

      <LeadDetailsPro
        visible={detailsVisible}
        onClose={() => setDetailsVisible(false)}
        lead={selectedLead}
        onEdit={handleEditLead}
        onAddNote={handleAddNote}
      />

      {/* Single assign */}
      <AssignSellerForm
        visible={assignSellerVisible}
        onCancel={() => { setAssignSellerVisible(false); setAssigningLead(null); }}
        onSubmit={handleAssignSeller}
        confirmLoading={confirmLoading}
        lead={assigningLead}
        sellers={sellers}
      />

      {/* Bulk assign */}
      <AssignSellerForm
        visible={bulkAssignVisible}
        onCancel={() => { setBulkAssignVisible(false); setBulkLeadIds([]); }}
        onSubmit={handleBulkAssignSeller}
        confirmLoading={confirmLoading}
        leadIds={bulkLeadIds}
        bulk
        sellers={sellers}
      />

      <LeadStatsDrawer
        visible={statsDrawerVisible}
        onClose={() => setStatsDrawerVisible(false)}
        leads={leads}
        sellers={sellers}
        loading={loading}
      />

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