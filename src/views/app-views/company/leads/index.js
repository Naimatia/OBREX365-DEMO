// LeadsPage.js - With Property Finder Integration

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Typography, Space, Button, message, Modal,
  Row, Col, Divider, Badge, Tooltip, Tag, Spin, DatePicker
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
  UserAddOutlined,
  FilterOutlined,
  ReloadOutlined,
  UserOutlined,
  ApiOutlined,
} from '@ant-design/icons';

import { db, collection, getDocs, where, query } from 'configs/FirebaseConfig';
import LeadService from 'services/firebase/LeadService';
import { LeadStatus, LeadInterestLevel, LeadStatusLabels, LeadStatusColors } from 'models/LeadModel';
import { serverTimestamp } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

import LeadTable from './components/LeadTable';
import LeadForm from './components/LeadForm';
import LeadDetailsPro from './components/LeadDetails';
import LeadFilters from './components/LeadFilters';
import AssignSellerForm from './components/AssignSellerForm';
import LeadStats from './components/LeadStats';
import LeadStatsDrawer from './components/LeadStatsDrawer';
import { UserRoles } from 'models/UserModel';
import API_BASE_URL from '../../../../constants/ApiConstant';
import { APP_NAME } from 'configs/AppConfig';

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

// CEO and Admin roles that should see all leads
const adminRoles = [
  UserRoles.CEO,
  UserRoles.SUPER_ADMIN,
];

// ─── Meta Lead mapper ───────────────────────────────────────────────────────
const mapMetaLeadToModel = (metaLead, companyId) => {
  const raw = metaLead.raw_fields || {};
  
  const budget =
    raw['ما_هي_ميزانيتك_الاستثمارية_لشراء_الفيلا؟'] ||
    raw.what_is_your_apartment_investment_budget ||
    raw.budget;

  const lookingFor =
    raw['ما_الذي_تبحث_عنه؟'] || raw.what_are_you_looking_for || raw.looking_for;

  const nationality = raw.nationality || raw.country || '';

  let redirectedFrom = 'Facebook';
  if (metaLead.platform === 'ig' || metaLead.meta_platform === 'ig') {
    redirectedFrom = 'Instagram';
  }

  return {
    name: metaLead.full_name || raw.full_name || 'Unknown',
    email: metaLead.email || raw.email || '',
    phoneNumber: metaLead.phone_number || raw.phone_number || raw.work_phone_number || '',
    secondaryEmail: raw.secondary_email || '',
    phoneNumber2: raw.secondary_phone || raw.additional_phone || '',
    region: nationality || 'UAE',
    status: LeadStatus.NEW,
    InterestLevel: LeadInterestLevel.MEDIUM,
    Budget: budget ? String(budget) : null,
    lookingFor: lookingFor || null,
    RedirectedFrom: redirectedFrom,
    company_id: companyId,
    Notes: [],
    CreationDate: metaLead.created_time ? new Date(metaLead.created_time) : new Date(),
    meta_lead_id: metaLead.lead_id,
    meta_form_id: metaLead.form_id,
    meta_form_name: metaLead.form_name,
    meta_ad_name: metaLead.ad_name || '',
    meta_campaign: metaLead.campaign_name || '',
    meta_adset: metaLead.adset_name || '',
    meta_platform: metaLead.platform || metaLead.meta_platform || 'facebook',
    raw_meta_fields: raw,
    sourceDetails: {
      formName: metaLead.form_name,
      adName: metaLead.ad_name,
      campaign: metaLead.campaign_name,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    assignedAt: null,
    assignedBy: null,
    convertedContactId: null,
    convertedAt: null,
    source: 'facebook_meta',
  };
};

// ─── Property Finder Lead mapper (UPDATED) ──────────────────────────────
const mapPropertyFinderLeadToModel = (pfLead, companyId, userId) => {
  const sender = pfLead.sender || {};
  const contacts = sender.contacts || [];
  
  // Extract phone and email from contacts
  let phone = '';
  let email = '';
  let whatsappUsername = '';
  
  contacts.forEach(contact => {
    if (contact.type === 'phone') phone = contact.value || '';
    if (contact.type === 'email') email = contact.value || '';
    if (contact.type === 'whatsappUsername') whatsappUsername = contact.value || '';
  });

  // Determine status based on PF status
  let status = LeadStatus.NEW;
  if (pfLead.status) {
    switch (pfLead.status.toLowerCase()) {
      case 'replied':
        status = LeadStatus.CONTACTED;
        break;
      case 'read':
        status = LeadStatus.INTERESTED;
        break;
      case 'delivered':
        status = LeadStatus.NEW;
        break;
      default:
        status = LeadStatus.NEW;
    }
  }

  // Safely extract listing and project data
  const listing = pfLead.listing || {};
  const project = pfLead.project || {};
  const publicProfile = pfLead.publicProfile || {};

  // Build lookingFor - USE THE VALUE FROM THE API
  let lookingFor = pfLead.looking_for || null; // 👈 First try the API value
  
  // If not provided by API, build it manually
  if (!lookingFor) {
    if (listing.reference) {
      lookingFor = listing.reference;
    } else if (project.title?.en) {
      lookingFor = project.title.en;
    } else if (project.title?.ar) {
      lookingFor = project.title.ar;
    } else if (listing.id) {
      lookingFor = `Listing: ${listing.id}`;
    } else if (pfLead.entityType) {
      lookingFor = pfLead.entityType;
    }
  }

  // Build sourceDetails with only defined values
  const sourceDetails = {
    channel: pfLead.channel || 'whatsapp',
    entityType: pfLead.entityType || 'listing',
  };

  if (listing.id) sourceDetails.listingId = listing.id;
  if (listing.reference) sourceDetails.listingReference = listing.reference;
  if (project.id) sourceDetails.projectId = project.id;
  if (publicProfile.id) sourceDetails.publicProfileId = publicProfile.id;
  if (pfLead.tags && pfLead.tags.length > 0) sourceDetails.tags = pfLead.tags;

  return {
    name: sender.name || 'Unknown',
    email: email || pfLead.email || '',
    phoneNumber: phone || pfLead.phone_number || '',
    secondaryEmail: '',
    phoneNumber2: '',
    region: 'UAE',
    status: status,
    InterestLevel: LeadInterestLevel.MEDIUM,
    Budget: null,
    lookingFor: lookingFor, // 👈 Will be "Ahmed-Binghatti-Nova" or "Ahmed-Torino-"
    RedirectedFrom: 'Property Finder',
    company_id: companyId,
    Notes: [],
    CreationDate: pfLead.created_time ? new Date(pfLead.created_time) : new Date(),
    propertyFinderLeadId: pfLead.lead_id || pfLead.id || null,
    propertyFinderData: {
      channel: pfLead.channel || null,
      status: pfLead.status || null,
      entityType: pfLead.entityType || null,
      listing: listing.id ? listing : null,
      project: project.id ? project : null,
      publicProfile: publicProfile.id ? publicProfile : null,
      responseLink: pfLead.responseLink || null,
      tags: pfLead.tags || [],
      sender: {
        name: sender.name || null,
        contacts: contacts.length > 0 ? contacts : null,
        phone: phone || null,
        email: email || null,
        whatsappUsername: whatsappUsername || null
      }
    },
    sourceDetails: sourceDetails,
    source: 'property_finder',
    createdBy: userId || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    assignedAt: null,
    assignedBy: null,
    convertedContactId: null,
    convertedAt: null,
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

// ─── Property Finder Sync Modal ─────────────────────────────────────────────
const PropertyFinderSyncModal = ({ visible, onClose, syncing, syncResult, onSync }) => (
  <Modal
    title={
      <Space>
        <ApiOutlined style={{ color: '#0066CC', fontSize: 20 }} />
        <span>Sync Property Finder Leads</span>
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
            style={{ background: '#0066CC', borderColor: '#0066CC' }}
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
        <ApiOutlined style={{ fontSize: 48, color: '#0066CC', marginBottom: 16 }} />
        <Title level={5} style={{ marginBottom: 8 }}>Pull Leads from Property Finder</Title>
        <Text type="secondary">
          This will fetch all leads from your Property Finder account and save new ones to your CRM.
          Existing leads (matched by email, phone, or Property Finder ID) will be skipped automatically.
        </Text>
      </div>
    )}
    {syncing && (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Fetching leads from Property Finder…</Text>
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
    createdBy: '', // Filter by who created the lead
    assignedTo: '', // Filter by who the lead is assigned to
    dateRange: null,
  };

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [sellers, setSellers] = useState([]);
  const [assignSellerVisible, setAssignSellerVisible] = useState(false);
  const [assigningLead, setAssigningLead] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [statsDrawerVisible, setStatsDrawerVisible] = useState(false);

  const [bulkAssignVisible, setBulkAssignVisible] = useState(false);
  const [bulkLeadIds, setBulkLeadIds] = useState([]);

  // Meta Sync States
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // Property Finder Sync States
  const [pfSyncModalVisible, setPfSyncModalVisible] = useState(false);
  const [pfSyncing, setPfSyncing] = useState(false);
  const [pfSyncResult, setPfSyncResult] = useState(null);

  const user = useSelector(state => state.auth.user);
  const companyId = user?.company_id;
  const userRole = user?.Role;

  // Check if user should see all leads (CEO/Admin)
  const isAdminView = adminRoles.includes(userRole);

  // Set default date range to current month
  useEffect(() => {
    if (companyId) {
      const startOfMonth = dayjs().startOf('month');
      const endOfMonth = dayjs().endOf('month');
      setFilters(prev => ({
        ...prev,
        dateRange: [startOfMonth, endOfMonth]
      }));
      
      fetchLeads();
      fetchSellers();
    }
  }, [companyId]);

  const fetchLeads = useCallback(async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      console.log('🔍 [LeadsPage] Fetching leads for company:', companyId);
      console.log('🔍 [LeadsPage] User role:', userRole);
      console.log('🔍 [LeadsPage] Is Admin View:', isAdminView);
      
      // Get ALL leads from company directly using Firestore
      const allLeadsQuery = query(
        collection(db, 'leads'),
        where('company_id', '==', companyId)
      );
      
      const allLeadsSnap = await getDocs(allLeadsQuery);
      let allLeads = allLeadsSnap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        _createdAt: doc.data().createdAt?.toDate?.() || null,
        _creationDate: doc.data().CreationDate?.toDate?.() || null
      }));
      
      console.log('📊 [LeadsPage] Total leads in company:', allLeads.length);
      
      // Log sample to debug
      if (allLeads.length > 0) {
        console.log('📝 [LeadsPage] Sample lead data:', {
          id: allLeads[0].id,
          name: allLeads[0].name,
          createdBy: allLeads[0].createdBy,
          seller_id: allLeads[0].seller_id,
          status: allLeads[0].status
        });
      }
      
      let leadsData = [];
      const currentUserId = user?.id;
      const isHR = userRole === UserRoles.HR;
      
      if (isAdminView || isHR) {
        // Admin OR HR: Show ALL leads but with different permissions
        console.log('🔍 [LeadsPage] Admin/HR view - showing all leads');
        
        // Filter by date range
        if (filters.dateRange && filters.dateRange.length === 2) {
          const [start, end] = filters.dateRange;
          allLeads = allLeads.filter(lead => {
            const date = lead._createdAt || lead._creationDate;
            return date && dayjs(date).isBetween(start, end, 'day', '[]');
          });
          console.log('📊 [LeadsPage] After date filter:', allLeads.length);
        }
        
        // Filter by creator (createdBy)
        if (filters.createdBy && filters.createdBy !== '') {
          allLeads = allLeads.filter(lead => {
            const match = lead.createdBy === filters.createdBy;
            return match;
          });
          console.log('📊 [LeadsPage] After createdBy filter:', allLeads.length);
        }
        
        // Filter by assigned seller (seller_id)
        if (filters.assignedTo && filters.assignedTo !== '') {
          if (filters.assignedTo === 'unsigned') {
            allLeads = allLeads.filter(lead => {
              const match = !lead.seller_id || lead.seller_id === '' || lead.seller_id === null || lead.seller_id === undefined;
              return match;
            });
            console.log('📊 [LeadsPage] After unsigned filter:', allLeads.length);
          } else {
            allLeads = allLeads.filter(lead => {
              const match = lead.seller_id === filters.assignedTo;
              return match;
            });
            console.log('📊 [LeadsPage] After assignedTo filter:', allLeads.length);
          }
        }
        
        leadsData = allLeads;
      } else {
        // Seller View: Get leads they created OR assigned to them
        console.log('🔍 [LeadsPage] Seller view - filtering for seller:', currentUserId);
        
        const assignedToSeller = allLeads.filter(lead => {
          const match = lead.seller_id === currentUserId;
          return match;
        });
        
        const createdBySeller = allLeads.filter(lead => {
          const match = lead.createdBy === currentUserId;
          return match;
        });
        
        console.log('📊 [LeadsPage] Assigned to seller count:', assignedToSeller.length);
        console.log('📊 [LeadsPage] Created by seller count:', createdBySeller.length);
        
        const combined = [...createdBySeller, ...assignedToSeller];
        leadsData = Array.from(new Map(combined.map(lead => [lead.id, lead])).values());
        
        console.log('📊 [LeadsPage] Total unique leads for seller:', leadsData.length);
        
        if (filters.assignedTo && filters.assignedTo !== '') {
          if (filters.assignedTo === 'unsigned') {
            leadsData = leadsData.filter(lead => {
              const isUnsigned = !lead.seller_id || lead.seller_id === '' || lead.seller_id === null || lead.seller_id === undefined;
              return isUnsigned && lead.createdBy === currentUserId;
            });
          } else {
            leadsData = leadsData.filter(lead => lead.seller_id === filters.assignedTo);
          }
        }
      }

      // Apply additional client-side filters
      if (filters.search) {
        leadsData = leadsData.filter(l => 
          l.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
          l.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
          l.phoneNumber?.includes(filters.search)
        );
      }

      if (filters.status && filters.status !== '') {
        leadsData = leadsData.filter(l => l.status === filters.status);
      }
      
      if (filters.InterestLevel && filters.InterestLevel !== '') {
        leadsData = leadsData.filter(l => l.InterestLevel === filters.InterestLevel);
      }
      
      if (filters.region && filters.region !== '') {
        leadsData = leadsData.filter(l => l.region === filters.region);
      }

      // Sort by createdAt (newest first)
      leadsData.sort((a, b) => {
        const dateA = a._createdAt || a._creationDate || new Date(0);
        const dateB = b._createdAt || b._creationDate || new Date(0);
        return dateB - dateA;
      });

      console.log('📊 [LeadsPage] Final leads count:', leadsData.length);
      setLeads(leadsData);
    } catch (error) {
      console.error('❌ [LeadsPage] Error fetching leads:', error);
      message.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, [companyId, isAdminView, user?.id, userRole, filters]);

  useEffect(() => {
    if (companyId) {
      fetchLeads();
    }
  }, [fetchLeads, companyId]);

  const handleFilter = (values) => {
    const cleanedFilters = {};
    Object.keys(values).forEach(key => {
      if (values[key] && values[key] !== '' && values[key] !== undefined && values[key] !== null) {
        cleanedFilters[key] = values[key];
      }
    });
    setFilters(prevFilters => ({ ...prevFilters, ...cleanedFilters }));
  };

  const handleClearFilters = () => {
    const startOfMonth = dayjs().startOf('month');
    const endOfMonth = dayjs().endOf('month');
    setFilters({ 
      ...initialFilters,
      dateRange: [startOfMonth, endOfMonth] 
    });
  };

  const handleSearch = (value) => {
    setFilters(prevFilters => ({ ...prevFilters, search: value || '' }));
  };

  const handleDateRangeChange = (dates) => {
    setFilters(prevFilters => ({ ...prevFilters, dateRange: dates }));
  };

  useEffect(() => {
    if (companyId) {
      fetchSellers();
    }
  }, [companyId]);

  const fetchSellers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.company_id === companyId && salesRoles.includes(u.Role))
        .map(u => ({
          id: u.id,
          name: `${u.firstname ?? ''} ${u.lastname ?? ''}${u.country ? ` (${u.country})` : ''}`.trim(),
          phoneNumber: u.phoneNumber || u.phone || '',
          email: u.email || '',
          firstName: u.firstname || '',
          lastName: u.lastname || '',
        }));
      setSellers(list);
    } catch (error) {
      console.error('Error fetching sellers:', error);
      message.error('Failed to fetch sellers');
    }
  };

  // ─── Helper Functions ────────────────────────────────────────────────────
  const normalizePhone = (phone) => {
    if (!phone) return null;
    return phone.toString().replace(/[^0-9+]/g, '').replace(/^00/, '+').trim();
  };

  // Optimized function to fetch only lead identifiers
  const getExistingLeadIdentifiers = async (companyId) => {
    try {
      const q = query(
        collection(db, 'leads'),
        where('company_id', '==', companyId)
      );
      
      const snapshot = await getDocs(q);
      
      const metaIds = new Set();
      const pfIds = new Set();
      const emails = new Set();
      const phones = new Set();
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.meta_lead_id) metaIds.add(data.meta_lead_id);
        if (data.propertyFinderLeadId) pfIds.add(data.propertyFinderLeadId);
        if (data.email) {
          const email = data.email.toLowerCase().trim();
          if (email) emails.add(email);
        }
        if (data.phoneNumber) {
          const phone = normalizePhone(data.phoneNumber);
          if (phone) phones.add(phone);
        }
      });
      
      return { metaIds, pfIds, emails, phones };
    } catch (error) {
      console.error('Error fetching lead identifiers:', error);
      throw error;
    }
  };

  // ─── Meta Sync ────────────────────────────────────────────────────────────
  const openSyncModal = () => { setSyncResult(null); setSyncModalVisible(true); };

  const handleMetaSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    
    try {
      // Step 1: Fetch Meta leads from your backend
      const res = await fetch(`${API_BASE_URL}/api/facebook/leads?company_id=${companyId}&limit=200`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch Meta leads');
      }
      const { leads: metaLeads = [] } = await res.json();
      
      if (metaLeads.length === 0) {
        setSyncResult({ total: 0, saved: 0, skipped: 0, failed: 0 });
        return;
      }

      // Step 2: Fetch ONLY identifiers from existing leads (optimized)
      const existingIdentifiers = await getExistingLeadIdentifiers(companyId);
      
      const metaIds = existingIdentifiers.metaIds;
      const emails = existingIdentifiers.emails;
      const phones = existingIdentifiers.phones;

      let saved = 0, skipped = 0, failed = 0;
      const currentUserId = user?.uid || user?.id;

      // Step 3: Process each lead
      for (const ml of metaLeads) {
        const email = (ml.email || ml.raw_fields?.email || '').toLowerCase().trim();
        const phone = normalizePhone(ml.phone_number || ml.raw_fields?.phone_number);

        // Check duplicates efficiently
        if (metaIds.has(ml.lead_id) || (email && emails.has(email)) || (phone && phones.has(phone))) {
          skipped++; 
          continue;
        }
        
        try {
          const metaLeadData = mapMetaLeadToModel(ml, companyId);
          metaLeadData.createdBy = currentUserId || 'unknown_user';
          metaLeadData.source = 'facebook_meta';
          
          await LeadService.create(metaLeadData);
          
          // Update sets for future checks in this batch
          if (email) emails.add(email);
          if (phone) phones.add(phone);
          metaIds.add(ml.lead_id);
          saved++;
        } catch (error) {
          console.error('Error saving meta lead:', error);
          failed++; 
        }
      }

      // Step 4: Update UI
      setSyncResult({ total: metaLeads.length, saved, skipped, failed });
      if (saved > 0) { 
        message.success(`${saved} new Meta lead${saved > 1 ? 's' : ''} imported!`); 
        fetchLeads(); 
      } else if (skipped > 0) {
        message.info(`All leads already exist (${skipped} skipped).`);
      }
      
    } catch (err) {
      setSyncResult({ error: err.message });
      message.error('Sync failed: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  // ─── Property Finder Sync ────────────────────────────────────────────────
  const openPfSyncModal = () => { setPfSyncResult(null); setPfSyncModalVisible(true); };

  const handlePropertyFinderSync = async () => {
    setPfSyncing(true);
    setPfSyncResult(null);
    
    try {
      // Step 1: Fetch Property Finder leads from your backend
      const res = await fetch(`${API_BASE_URL}/api/propertyfinder/leads?company_id=${companyId}&limit=100`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch Property Finder leads');
      }
      const { leads: pfLeads = [] } = await res.json();
      
      if (pfLeads.length === 0) {
        setPfSyncResult({ total: 0, saved: 0, skipped: 0, failed: 0 });
        return;
      }

      // Step 2: Fetch ONLY identifiers from existing leads (optimized)
      const existingIdentifiers = await getExistingLeadIdentifiers(companyId);
      
      const pfIds = existingIdentifiers.pfIds;
      const emails = existingIdentifiers.emails;
      const phones = existingIdentifiers.phones;

      let saved = 0, skipped = 0, failed = 0;
      const currentUserId = user?.uid || user?.id;

      // Step 3: Process each lead
      for (const pfLead of pfLeads) {
        const email = (pfLead.email || '').toLowerCase().trim();
        const phone = normalizePhone(pfLead.phone_number || pfLead.phoneNumber);
        const pfId = pfLead.lead_id || pfLead.id;

        // Check duplicates efficiently
        if (pfIds.has(pfId) || (email && emails.has(email)) || (phone && phones.has(phone))) {
          skipped++; 
          continue;
        }
        
        try {
          const pfLeadData = mapPropertyFinderLeadToModel(pfLead, companyId, currentUserId);
          await LeadService.create(pfLeadData);
          
          // Update sets for future checks in this batch
          if (email) emails.add(email);
          if (phone) phones.add(phone);
          if (pfId) pfIds.add(pfId);
          saved++;
        } catch (error) {
          console.error('Error saving Property Finder lead:', error);
          failed++; 
        }
      }

      // Step 4: Update UI
      setPfSyncResult({ total: pfLeads.length, saved, skipped, failed });
      if (saved > 0) { 
        message.success(`${saved} new Property Finder lead${saved > 1 ? 's' : ''} imported!`); 
        fetchLeads(); 
      } else if (skipped > 0) {
        message.info(`All leads already exist (${skipped} skipped).`);
      }
      
    } catch (err) {
      setPfSyncResult({ error: err.message });
      message.error('Property Finder sync failed: ' + err.message);
    } finally {
      setPfSyncing(false);
    }
  };

  // ─── CRUD ─────────────────────────────────────────────────────────────────
  const handleAddLead = async (values) => {
    setConfirmLoading(true);
    try {
      const leadData = {
        ...values,
        company_id: companyId,
        CreationDate: values.CreationDate?.toDate() || serverTimestamp(),
        Notes: values.Notes || [],
        secondaryEmail: values.secondaryEmail || '',
        phoneNumber2: values.phoneNumber2 || '',
        assignedAt: null,
        assignedBy: null,
        status: values.status || LeadStatus.NEW,
        convertedContactId: null,
        convertedAt: null,
        createdBy: user?.uid, // Track who created the lead
      };

      if (values.autoConvert || values.status === LeadStatus.CONVERTED) {
        await LeadService.create(leadData, true);
        message.success('Lead created successfully with contact');
      } else {
        await LeadService.create(leadData, false);
        message.success('Lead created successfully');
      }
      
      setFormVisible(false);
      fetchLeads();
    } catch (error) {
      console.error('Error creating lead:', error);
      message.error('Failed to create lead: ' + error.message);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleUpdateLead = async (values) => {
    setConfirmLoading(true);
    try {
      const data = {
        ...values,
        CreationDate: values.CreationDate?.toDate() || editingLead.CreationDate,
        secondaryEmail: values.secondaryEmail || '',
        phoneNumber2: values.phoneNumber2 || '',
        Notes: values.Notes || [],
        updatedAt: serverTimestamp(),
      };

      // If status is CONVERTED and no contact exists, create one
      if (values.status === LeadStatus.CONVERTED && !editingLead.convertedContactId) {
        await LeadService.convertToContact(editingLead.id);
        message.success('Lead converted to contact');
      }

      await LeadService.update(editingLead.id, data);
      message.success('Lead updated successfully');
      setFormVisible(false);
      setEditingLead(null);
      fetchLeads();
      
      if (selectedLead?.id === editingLead.id) {
        const updatedLead = await LeadService.getById(editingLead.id);
        setSelectedLead(updatedLead);
      }
    } catch (error) {
      console.error('Error updating lead:', error);
      message.error('Failed to update lead: ' + error.message);
    } finally {
      setConfirmLoading(false);
    }
  };

  // ─── Convert Lead to Contact ──────────────────────────────────────────────
  const handleConvertToContact = async (leadId) => {
    try {
      const lead = leads.find(l => l.id === leadId);
      if (!lead) {
        message.error('Lead not found');
        return;
      }

      // Check if already converted
      if (lead.convertedContactId || lead.status === LeadStatus.CONVERTED) {
        message.warning('Lead already converted to contact');
        return;
      }

      confirm({
        title: 'Convert Lead to Contact',
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <p>This will convert the lead to a contact and create a new contact record with all lead information.</p>
            <p><strong>Lead:</strong> {lead.name}</p>
            <p><strong>Email:</strong> {lead.email}</p>
            <p><strong>Phone:</strong> {lead.phoneNumber}</p>
          </div>
        ),
        okText: 'Convert',
        cancelText: 'Cancel',
        onOk: async () => {
          try {
            setConfirmLoading(true);
            await LeadService.convertToContact(leadId);
            message.success('Lead successfully converted to contact!');
            fetchLeads();
            
            if (selectedLead?.id === leadId) {
              const updatedLead = await LeadService.getById(leadId);
              setSelectedLead(updatedLead);
            }
          } catch (error) {
            message.error('Failed to convert lead: ' + error.message);
          } finally {
            setConfirmLoading(false);
          }
        }
      });
    } catch (error) {
      console.error('Error converting lead:', error);
      message.error('Failed to convert lead');
    }
  };

  // ─── Bulk Convert Leads ───────────────────────────────────────────────────
  const handleBulkConvertToContacts = async (leadIds) => {
    try {
      const leadsToConvert = leads.filter(l => 
        leadIds.includes(l.id) && 
        !l.convertedContactId && 
        l.status !== LeadStatus.CONVERTED
      );

      if (leadsToConvert.length === 0) {
        message.warning('No leads to convert');
        return;
      }

      confirm({
        title: `Convert ${leadsToConvert.length} Lead(s) to Contacts`,
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <p>This will convert the selected leads to contacts.</p>
            <p><strong>Leads to convert:</strong> {leadsToConvert.map(l => l.name).join(', ')}</p>
          </div>
        ),
        okText: 'Convert All',
        cancelText: 'Cancel',
        onOk: async () => {
          try {
            setConfirmLoading(true);
            const results = await LeadService.bulkConvertToContacts(leadIds);
            
            if (results.converted.length > 0) {
              message.success(`${results.converted.length} leads converted to contacts`);
            }
            if (results.skipped.length > 0) {
              message.info(`${results.skipped.length} leads already converted`);
            }
            if (results.failed.length > 0) {
              message.error(`${results.failed.length} leads failed to convert`);
            }
            
            fetchLeads();
          } catch (error) {
            message.error('Failed to convert leads: ' + error.message);
          } finally {
            setConfirmLoading(false);
          }
        }
      });
    } catch (error) {
      console.error('Error bulk converting leads:', error);
      message.error('Failed to convert leads');
    }
  };

  // ─── Delete Lead ──────────────────────────────────────────────────────────
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

  // ─── WhatsApp Helpers ──────────────────────────────────────────────────────
  const sendWhatsAppMessage = (phoneNumber, messageText) => {
    if (!phoneNumber) {
      message.warning('Seller does not have a phone number configured');
      return false;
    }

    let cleanNumber = phoneNumber.toString().replace(/\D/g, '');
    
    if (cleanNumber.startsWith('0')) {
      cleanNumber = cleanNumber.substring(1);
    }
    
    if (!cleanNumber.startsWith('971') && !cleanNumber.startsWith('966')) {
      cleanNumber = '971' + cleanNumber;
    }
    
    const encodedMessage = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    return true;
  };

  const createWhatsAppMessage = (sellerName, leadData, companyName) => {
    const currentDate = new Date().toLocaleString();
    
    return `🔔 *New Lead Assigned to You!*\n\n` +
      `Hi ${sellerName},\n\n` +
      `You have been assigned a new lead from ${companyName || APP_NAME}.\n\n` +
      `*Lead Details:*\n` +
      `👤 Name: ${leadData.name || 'N/A'}\n` +
      `📍 Region: ${leadData.region || 'Not specified'}\n` +
      `📊 Status: ${leadData.status || 'New'}\n` +
      `*Next Steps:*\n` +
      `1. Contact the lead within 24 hours\n` +
      `2. Update lead status in CRM\n` +
      `3. Schedule property viewing if interested\n\n` +
      `📅 Assigned on: ${currentDate}\n\n` +
      `Please login to the CRM for more details.\n\n` +
      `Best regards,\n${companyName || APP_NAME} Team`;
  };

  const createBulkWhatsAppMessage = (sellerName, leadsCount, leadNames, companyName) => {
    const currentDate = new Date().toLocaleString();
    const leadsList = leadNames.slice(0, 5).map((name, idx) => `${idx + 1}. ${name}`).join('\n');
    const moreLeads = leadNames.length > 5 ? `\n... and ${leadNames.length - 5} more leads` : '';
    
    return `🔔 *${leadsCount} New Leads Assigned to You!*\n\n` +
      `Hi ${sellerName},\n\n` +
      `You have been assigned ${leadsCount} new lead${leadsCount > 1 ? 's' : ''} from ${companyName || APP_NAME}.\n\n` +
      `*Lead${leadsCount > 1 ? 's' : ''} Assigned:*\n${leadsList}${moreLeads}\n\n` +
      `*Next Steps:*\n` +
      `1. Review all leads in the CRM\n` +
      `2. Prioritize follow-ups based on interest level\n` +
      `3. Contact each lead within 24 hours\n` +
      `4. Update status for each lead after contact\n\n` +
      `📅 Assigned on: ${currentDate}\n\n` +
      `Please login to the CRM to view complete lead details.\n\n` +
      `Best regards,\n${companyName || APP_NAME} Team`;
  };

  // ─── Assignment Handlers ──────────────────────────────────────────────────
  const handleAssignSeller = async (leadId, sellerId, whatsappEnabled = true) => {
    setConfirmLoading(true);
    try {
      const seller = sellers.find(s => s.id === sellerId);
      if (!seller) throw new Error('Seller not found');
      
      const lead = leads.find(l => l.id === leadId);
      if (!lead) throw new Error('Lead not found');
      
      const assignmentData = { 
        id: sellerId, 
        firstName: seller.firstName || seller.name.split(' ')[0] || '', 
        lastName: seller.lastName || seller.name.split(' ').slice(1).join(' ') || '',
        assignedAt: new Date().toISOString(),
        assignedBy: {
          id: user?.uid,
          name: `${user?.firstname || ''} ${user?.lastname || ''}`.trim()
        }
      };
      
      await LeadService.assignTo(leadId, assignmentData);
      
      if (whatsappEnabled && seller.phoneNumber && seller.phoneNumber.trim() !== '') {
        const message = createWhatsAppMessage(seller.name, lead, user?.companyName);
        sendWhatsAppMessage(seller.phoneNumber, message);
        message.success(`Lead assigned to ${seller.name} and WhatsApp opened`);
      } else if (whatsappEnabled && (!seller.phoneNumber || seller.phoneNumber.trim() === '')) {
        message.warning(`Lead assigned to ${seller.name} but no phone number available for WhatsApp`);
      } else {
        message.success(`Lead assigned to ${seller.name} successfully`);
      }
      
      fetchLeads();
      if (selectedLead?.id === leadId) {
        const updatedLead = await LeadService.getById(leadId);
        setSelectedLead(updatedLead);
      }
    } catch (error) {
      console.error('Assignment error:', error);
      message.error('Failed to assign seller: ' + error.message);
    } finally {
      setConfirmLoading(false);
      setAssignSellerVisible(false);
      setAssigningLead(null);
    }
  };

  const handleBulkAssignSeller = async (leadIds, sellerId, whatsappEnabled = true) => {
    setConfirmLoading(true);
    try {
      const seller = sellers.find(s => s.id === sellerId);
      if (!seller) throw new Error('Seller not found');
      
      const leadsToAssign = leads.filter(l => leadIds.includes(l.id));
      if (leadsToAssign.length === 0) throw new Error('No leads found to assign');
      
      const assignmentData = {
        id: sellerId,
        firstName: seller.firstName || seller.name.split(' ')[0] || '',
        lastName: seller.lastName || seller.name.split(' ').slice(1).join(' ') || '',
        assignedAt: new Date().toISOString(),
        assignedBy: {
          id: user?.uid,
          name: `${user?.firstname || ''} ${user?.lastname || ''}`.trim()
        }
      };
      
      await Promise.all(leadIds.map(id => LeadService.assignTo(id, assignmentData)));
      
      if (whatsappEnabled && seller.phoneNumber && seller.phoneNumber.trim() !== '') {
        const leadNames = leadsToAssign.map(l => l.name);
        const message = createBulkWhatsAppMessage(seller.name, leadIds.length, leadNames, user?.companyName);
        sendWhatsAppMessage(seller.phoneNumber, message);
        message.success(`${leadIds.length} leads assigned to ${seller.name} and WhatsApp opened`);
      } else if (whatsappEnabled && (!seller.phoneNumber || seller.phoneNumber.trim() === '')) {
        message.warning(`${leadIds.length} leads assigned to ${seller.name} but no phone number available for WhatsApp`);
      } else {
        message.success(`${leadIds.length} leads assigned to ${seller.name} successfully`);
      }
      
      setBulkAssignVisible(false);
      setBulkLeadIds([]);
      fetchLeads();
    } catch (error) {
      console.error('Bulk assignment error:', error);
      message.error('Failed to bulk assign leads: ' + error.message);
    } finally {
      setConfirmLoading(false);
    }
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

  // ─── View Handlers ────────────────────────────────────────────────────────
  const handleViewDetails = (lead) => {
    setSelectedLead(lead);
    setDetailsVisible(true);
  };

  // Handler for HR to view history
  const handleViewHistory = (lead) => {
    setSelectedLead(lead);
    setDetailsVisible(true);
  };

  const handleEditLead = (lead) => {
    setEditingLead(lead);
    setFormVisible(true);
  };

  const handleFormSubmit = (values) => editingLead ? handleUpdateLead(values) : handleAddLead(values);

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
              name: name.trim(), 
              email: email.trim(), 
              phoneNumber: phone.toString().trim(),
              region: row['Region'] || 'UAE', 
              status: row['Status'] || LeadStatus.NEW,
              InterestLevel: row['Interest Level'] || LeadInterestLevel.MEDIUM, 
              Budget: Number(row['Budget']) || 0,
              secondaryEmail: row['Secondary Email'] || '', 
              RedirectedFrom: row['Lead Source'] || 'Import',
              phoneNumber2: row['Secondary Phone'] || '', 
              CreationDate: new Date(),
              company_id: companyId, 
              Notes: [],
              assignedAt: null, 
              assignedBy: null,
              convertedContactId: null,
              convertedAt: null,
            };
          })
          .filter(Boolean);
        if (!valid.length) { message.error('No valid leads to import'); return; }
        for (const lead of valid) await LeadService.create(lead, false);
        message.success(`${valid.length} leads imported`);
        fetchLeads();
      };
      reader.readAsBinaryString(file);
    } catch { message.error('Failed to import file'); }
    finally { setConfirmLoading(false); e.target.value = ''; }
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await LeadService.updateStatus(leadId, newStatus);
      await fetchLeads();
      if (selectedLead?.id === leadId) {
        const updatedLead = await LeadService.getById(leadId);
        setSelectedLead(updatedLead);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      throw error;
    }
  };

  const handleReassignSeller = async (leadId, sellerId) => {
    try {
      let seller = null;
      if (sellerId) {
        seller = sellers.find(s => s.id === sellerId);
        if (!seller) {
          throw new Error('Seller not found');
        }
      }

      if (!sellerId || sellerId === '') {
        await LeadService.update(leadId, { 
          seller_id: null,
          assignedTo: null,
          assignedAt: null,
          updatedAt: serverTimestamp()
        });
        message.success('Lead unassigned successfully');
      } else {
        const assignmentData = { 
          id: sellerId, 
          firstName: seller.firstName || seller.name.split(' ')[0] || '', 
          lastName: seller.lastName || seller.name.split(' ').slice(1).join(' ') || '',
          assignedAt: new Date().toISOString(),
          assignedBy: {
            id: user?.uid,
            name: `${user?.firstname || ''} ${user?.lastname || ''}`.trim()
          }
        };
        
        await LeadService.assignTo(leadId, assignmentData);
        message.success(`Lead reassigned to ${seller.name}`);
      }
      
      await fetchLeads();
      
      if (selectedLead?.id === leadId) {
        const updatedLead = await LeadService.getById(leadId);
        setSelectedLead(updatedLead);
      }
    } catch (error) {
      console.error('Error reassigning seller:', error);
      throw error;
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="leads-page" style={{ padding: '0 0 24px' }}>
      <Row gutter={[24, 24]}>
        {/* HEADER */}
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
                  {isAdminView ? '📊 All Leads' : userRole === UserRoles.HR ? '📊 All Leads (HR View)' : 'My Leads'}
                </Title>
                <Text type="secondary">
                  {isAdminView 
                    ? `Manage all leads across the company (${leads.length} total)`
                    : userRole === UserRoles.HR
                    ? `View all leads (Read-only HR view - ${leads.length} total)`
                    : 'Manage and track your assigned leads'}
                </Text>
              </div>

              <Space wrap size={10}>
                <DatePicker.RangePicker
                  value={filters.dateRange}
                  onChange={handleDateRangeChange}
                  format="DD/MM/YYYY"
                  style={{ width: 240 }}
                  allowClear={false}
                />

                <Tooltip title="Sync leads from Facebook Meta Forms">
                  <Button
                    icon={<FacebookOutlined />}
                    onClick={openSyncModal}
                    style={{ 
                      background: '#1877F2', 
                      borderColor: '#1877F2', 
                      color: '#fff', 
                      fontWeight: 600,
                    }}
                  >
                    Sync Meta Leads
                  </Button>
                </Tooltip>

                <Tooltip title="Sync leads from Property Finder">
                  <Button
                    icon={<ApiOutlined />}
                    onClick={openPfSyncModal}
                    style={{ 
                      background: '#0066CC', 
                      borderColor: '#0066CC', 
                      color: '#fff', 
                      fontWeight: 600,
                    }}
                  >
                    Sync PF Leads
                  </Button>
                </Tooltip>

                <Button
                  icon={<UploadOutlined />}
                  onClick={() => document.getElementById('csv-upload').click()}
                >
                  Import
                </Button>

                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />

                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => { 
                    setEditingLead(null); 
                    setFormVisible(true); 
                  }}
                  style={{ height: 40, padding: '0 20px' }}
                >
                  Add Lead
                </Button>

                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchLeads}
                  loading={loading}
                >
                  Refresh
                </Button>
              </Space>
            </div>

            <Divider style={{ margin: '18px 0 12px 0' }} />

            <LeadFilters
              onSearch={handleSearch}
              onFilter={handleFilter}
              onClear={handleClearFilters}
              sellers={sellers}
              loading={loading}
              filters={filters}
              isAdminView={isAdminView}
              dateRange={filters.dateRange}
              onDateRangeChange={handleDateRangeChange}
            />
          </Card>
        </Col>

        {/* QUICK STATS */}
        <Col span={24}>
          <LeadStats
            leads={leads}
            loading={loading}
            onShowDetailStats={() => setStatsDrawerVisible(true)}
          />
        </Col>

        {/* MAIN TABLE */}
        <Col span={24}>
          <Card
            bordered={false}
            style={{ 
              borderRadius: 16, 
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)' 
            }}
            bodyStyle={{ padding: 0 }}
          >
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Title level={5} style={{ margin: 0 }}>
                {isAdminView ? (
                  filters.createdBy && filters.createdBy !== '' ? (
                    <>
                      Leads Created By: <Text type="primary">
                        {sellers.find(s => s.id === filters.createdBy)?.name || 'Selected Seller'}
                      </Text>
                    </>
                  ) : filters.assignedTo && filters.assignedTo !== '' ? (
                    <>
                      Leads Assigned To: <Text type="primary">
                        {sellers.find(s => s.id === filters.assignedTo)?.name || 'Selected Seller'}
                      </Text>
                    </>
                  ) : (
                    'All Leads'
                  )
                ) : userRole === UserRoles.HR ? (
                  'All Leads (HR View)'
                ) : (
                  'My Leads'
                )}
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 14 }}>
                  ({leads.length} leads)
                </Text>
                {filters.dateRange && (
                  <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                    · {filters.dateRange[0].format('DD MMM')} - {filters.dateRange[1].format('DD MMM YYYY')}
                  </Text>
                )}
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
              onConvertToContact={handleConvertToContact}
              onBulkConvert={handleBulkConvertToContacts}
              onStatusChange={handleStatusChange}
              sellers={sellers}
              onReassignSeller={handleReassignSeller}
              isAdminView={isAdminView}
              companyId={companyId}
              userRole={userRole}
              onViewHistory={handleViewHistory}
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
        onConvertToContact={handleConvertToContact}
        isHR={userRole === UserRoles.HR}
        userRole={userRole}
      />

      <AssignSellerForm
        visible={assignSellerVisible}
        onCancel={() => { setAssignSellerVisible(false); setAssigningLead(null); }}
        onSubmit={handleAssignSeller}
        confirmLoading={confirmLoading}
        lead={assigningLead}
        sellers={sellers}
      />

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

      <PropertyFinderSyncModal
        visible={pfSyncModalVisible}
        onClose={() => setPfSyncModalVisible(false)}
        syncing={pfSyncing}
        syncResult={pfSyncResult}
        onSync={handlePropertyFinderSync}
      />
    </div>
  );
};

export default LeadsPage;