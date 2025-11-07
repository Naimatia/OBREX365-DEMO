import React, { useState, useEffect } from 'react';
import { Card, Typography, Space, Button, message, Modal, Row, Col, Divider } from 'antd';
import { useSelector } from 'react-redux';
import { PlusOutlined, ExclamationCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { db, collection, getDocs } from 'configs/FirebaseConfig'; // Added Firestore import
import LeadService from 'services/firebase/LeadService';
import { LeadStatus, LeadInterestLevel } from 'models/LeadModel';
import { serverTimestamp } from 'firebase/firestore';
import moment from 'moment';
import * as XLSX from 'xlsx';

// Import components
import LeadTable from './components/LeadTable';
import LeadForm from './components/LeadForm';
import LeadDetails from './components/LeadDetails';
import LeadFilters from './components/LeadFilters';
import AssignSellerForm from './components/AssignSellerForm';
import LeadStats from './components/LeadStats';
import LeadStatsDrawer from './components/LeadStatsDrawer';

const { Title } = Typography;
const { confirm } = Modal;

// Define sales-related roles (consistent with LeadForm)
const SALES_ROLES = [
  'Agent',
  'Sales',
  'Executive Sales',
  'Off Plan Sales',
  'Ready to Move Sales',
  'Sales Manager'
];

/**
 * Leads management page
 * Allows managing leads with full CRUD operations, filtering, and seller assignment
 */
const LeadsPage = () => {
  // Filter interface definition
  const initialFilters = {
    search: '',
    status: '',
    InterestLevel: '',
    region: '',
    seller_id: ''
  };

  // State management
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

  // Get current user from Redux
  const user = useSelector(state => state.auth.user);
  const companyId = user?.company_id;

  // Fetch leads and sellers when component mounts
  useEffect(() => {
    if (companyId) {
      fetchLeads();
      fetchSellers();
    }
  }, [companyId]);

  // Fetch leads from Firestore
  const fetchLeads = async () => {
    setLoading(true);
    try {
      let leadsData;
      
      // Apply filters if they exist
      if (filters.search) {
        leadsData = await LeadService.searchLeads(companyId, filters.search);
      } else {
        leadsData = await LeadService.getLeadsByCompany(companyId);
      }
      
      // Apply additional filters
      if (filters.status) {
        leadsData = leadsData.filter(lead => lead.status === filters.status);
      }
      
      if (filters.InterestLevel) {
        leadsData = leadsData.filter(lead => lead.InterestLevel === filters.InterestLevel);
      }
      
      if (filters.region) {
        leadsData = leadsData.filter(lead => lead.region === filters.region);
      }
      
      if (filters.seller_id) {
        leadsData = leadsData.filter(lead => lead.seller_id === filters.seller_id);
      }
      
      setLeads(leadsData);
    } catch (error) {
      console.error('Error fetching leads:', error);
      message.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  // Fetch sellers (employees with sales-related roles) from Firestore
  const fetchSellers = async () => {
    try {
      console.log('Fetching sellers for company:', companyId);
      
      // Query employees collection
      const employeesRef = collection(db, 'employees');
      const employeesSnapshot = await getDocs(employeesRef);
      
      // Filter employees by SALES_ROLES and company_id
      const sellersList = employeesSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(employee => 
          employee.company_id === companyId && 
          SALES_ROLES.includes(employee.Role)
        )
        .map(employee => ({
          id: employee.id,
          name: employee.name
        }));
      
      console.log('Sellers filtered:', sellersList.length, sellersList);
      setSellers(sellersList);
    } catch (error) {
      console.error('Error fetching sellers:', error);
      message.error('Failed to fetch sellers');
    }
  };

  // Add a new lead
  const handleAddLead = async (values) => {
    setConfirmLoading(true);
    try {
      // Prepare lead data
      const leadData = {
        ...values,
        company_id: companyId,
        CreationDate: values.CreationDate?.toDate() || serverTimestamp(),
        Notes: [],
        secondaryEmail: values.secondaryEmail || '',
        phoneNumber2: values.phoneNumber2 || ''
      };
      
      // Create lead
      await LeadService.create(leadData);
      message.success('Lead created successfully');
      setFormVisible(false);
      fetchLeads(); // Refresh leads
    } catch (error) {
      console.error('Error adding lead:', error);
      message.error('Failed to create lead');
    } finally {
      setConfirmLoading(false);
    }
  };

  // Update an existing lead
  const handleUpdateLead = async (values) => {
    setConfirmLoading(true);
    try {
      // Prepare updated data
      const updateData = {
        ...values,
        CreationDate: values.CreationDate?.toDate() || editingLead.CreationDate,
        secondaryEmail: values.secondaryEmail || '',
        phoneNumber2: values.phoneNumber2 || ''
      };
      
      // Update lead
      await LeadService.update(editingLead.id, updateData);
      message.success('Lead updated successfully');
      setFormVisible(false);
      setEditingLead(null);
      fetchLeads(); // Refresh leads
      
      // Update selected lead if it's the one being edited
      if (selectedLead && selectedLead.id === editingLead.id) {
        setSelectedLead({
          ...selectedLead,
          ...updateData
        });
      }
    } catch (error) {
      console.error('Error updating lead:', error);
      message.error('Failed to update lead');
    } finally {
      setConfirmLoading(false);
    }
  };

  // Delete a lead
  const handleDeleteLead = (lead) => {
    confirm({
      title: 'Are you sure you want to delete this lead?',
      icon: <ExclamationCircleOutlined />,
      content: 'This action cannot be undone.',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          await LeadService.delete(lead.id);
          message.success('Lead deleted successfully');
          fetchLeads(); // Refresh leads
          
          // Close details drawer if the deleted lead was selected
          if (selectedLead && selectedLead.id === lead.id) {
            setDetailsVisible(false);
            setSelectedLead(null);
          }
        } catch (error) {
          console.error('Error deleting lead:', error);
          message.error('Failed to delete lead');
        }
      }
    });
  };

  // Assign seller to a lead
  const handleAssignSeller = async (leadId, sellerId) => {
    setConfirmLoading(true);
    try {
      console.log('Assigning seller:', sellerId, 'to lead:', leadId);
      
      // Find seller name for success message
      const assignedSeller = sellers.find(seller => seller.id === sellerId);
      const sellerName = assignedSeller ? assignedSeller.name : 'Selected seller';
      
      await LeadService.update(leadId, { seller_id: sellerId });
      
      message.success(`Lead successfully assigned to ${sellerName}`);
      setAssignSellerVisible(false);
      setAssigningLead(null);
      fetchLeads(); // Refresh leads
      
      // Update selected lead if it's the one being assigned
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead({
          ...selectedLead,
          seller_id: sellerId
        });
      }
    } catch (error) {
      console.error('Error assigning seller:', error);
      message.error('Failed to assign seller. Please try again.');
    } finally {
      setConfirmLoading(false);
    }
  };

  // Show assign seller modal
  const handleShowAssignSeller = (lead) => {
    console.log('Assigning seller to lead:', lead);
    console.log('Available sellers:', sellers.length, sellers);
    
    if (sellers.length === 0) {
      message.warning('No sellers available in your company. Please add sellers first.');
      return;
    }
    
    setAssigningLead(lead);
    setAssignSellerVisible(true);
  };

  // Add a note to a lead
  const handleAddNote = async (leadId, note) => {
    try {
      // Get current lead
      const lead = await LeadService.getById(leadId);
      
      // Prepare notes array
      const notes = lead.Notes || [];
      notes.push(note);
      
      // Update lead with new note
      await LeadService.update(leadId, { Notes: notes });
      message.success('Note added successfully');
      
      // Update selected lead if it's the one being updated
      if (selectedLead && selectedLead.id === leadId) {
        const updatedLead = await LeadService.getById(leadId);
        setSelectedLead(updatedLead);
      }
      
      fetchLeads(); // Refresh leads
    } catch (error) {
      console.error('Error adding note:', error);
      message.error('Failed to add note');
    }
  };

  // View lead details
  const handleViewDetails = (lead) => {
    setSelectedLead(lead);
    setDetailsVisible(true);
  };

  // Edit lead
  const handleEditLead = (lead) => {
    setEditingLead(lead);
    setFormVisible(true);
  };

  // Filter leads
  const handleFilter = (values) => {
    setFilters(values);
    fetchLeads();
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilters(initialFilters);
    fetchLeads();
  };

  const handleFileUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  setConfirmLoading(true);
  try {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

      // Validate & map data
      const validLeads = data
        .map((row, index) => {
          const name = row['Full Name'] || row['Name'] || row['name'];
          const email = row['Email'] || row['email'];
          const phone = row['Phone'] || row['phoneNumber'] || row['Phone Number'];

          if (!name || !email || !phone) {
            message.warning(`Row ${index + 2}: Missing required fields (Name, Email, Phone)`);
            return null;
          }

          return {
            name: name.trim(),
            email: email.trim(),
            phoneNumber: phone.toString().trim(),
            region: row['Region'] || row['Country'] || 'UAE',
            status: row['Status'],
            InterestLevel: row['Interest Level'] ,
            Budget: Number(row['Budget']) || 0,
            secondaryEmail: row['Secondary Email'] || '',
            RedirectedFrom: row['Lead Source'],
            phoneNumber2: row['Secondary Phone'] || '',
            CreationDate: new Date(),
            company_id: companyId,
            Notes: [],
          };
        })
        .filter(Boolean);

      if (validLeads.length === 0) {
        message.error('No valid leads to import');
        return;
      }

      // Batch create
      for (const lead of validLeads) {
        await LeadService.create(lead);
      }

      message.success(`${validLeads.length} leads imported successfully`);
      fetchLeads();
    };

    reader.readAsBinaryString(file);
  } catch (error) {
    console.error('Import error:', error);
    message.error('Failed to import file');
  } finally {
    setConfirmLoading(false);
    e.target.value = ''; // Reset input
  }
};

  // Search leads
  const handleSearch = (value) => {
    setFilters({
      ...filters,
      search: value
    });
    fetchLeads();
  };

  // Submit lead form
  const handleFormSubmit = (values) => {
    if (editingLead) {
      handleUpdateLead(values);
    } else {
      handleAddLead(values);
    }
  };

  return (
    <div className="leads-page">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card className="leads-header">
       <div className="d-flex justify-content-between align-items-center">
  <Title level={2}>Leads Management</Title>
  <Space>
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
      accept=".csv, .xlsx, .xls"
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
            {/* Lead Stats Summary */}
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
        onCancel={() => {
          setFormVisible(false);
          setEditingLead(null);
        }}
        onSubmit={handleFormSubmit}
        confirmLoading={confirmLoading}
        editingLead={editingLead}
        sellers={sellers}
      />

      {/* Lead details drawer */}
      <LeadDetails 
        visible={detailsVisible}
        onClose={() => setDetailsVisible(false)}
        lead={selectedLead}
        onEdit={handleEditLead}
        onAddNote={handleAddNote}
      />
      
      {/* Assign seller modal */}
      <AssignSellerForm
        visible={assignSellerVisible}
        onCancel={() => {
          setAssignSellerVisible(false);
          setAssigningLead(null);
        }}
        onSubmit={handleAssignSeller}
        confirmLoading={confirmLoading}
        lead={assigningLead}
        sellers={sellers}
      />
      
      {/* Lead statistics drawer */}
      <LeadStatsDrawer
        visible={statsDrawerVisible}
        onClose={() => setStatsDrawerVisible(false)}
        leads={leads}
        sellers={sellers}
        loading={loading}
      />
    </div>
  );
};

export default LeadsPage;