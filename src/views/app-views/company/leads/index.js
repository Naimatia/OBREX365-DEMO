import React, { useState, useEffect } from 'react';
import { Card, Typography, Space, Button, message, Modal, Row, Col, Divider } from 'antd';
import { useSelector } from 'react-redux';
import { PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import LeadService from 'services/firebase/LeadService';
import UserService from 'services/firebase/UserService';
import { serverTimestamp } from 'firebase/firestore';
import { LeadStatus, LeadInterestLevel } from 'models/LeadModel';

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

  // Fetch sellers (users with Seller role) from Firestore
  const fetchSellers = async () => {
    try {
      console.log('Fetching sellers for company:', companyId);
      
      // Get users with Seller role from the same company using the correct method
      const users = await UserService.getUsersByCompanyId(companyId);
      console.log('All users fetched:', users.length);
      
      // Filter to get only sellers (support both Role formats)
      const sellersList = users.filter(user => 
        user.Role === 'Seller' || user.role === 'Seller'
      );
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
        Notes: []
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
        CreationDate: values.CreationDate?.toDate() || editingLead.CreationDate
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
      const sellerName = assignedSeller ? 
        `${assignedSeller.firstname || assignedSeller.firstName} ${assignedSeller.lastname || assignedSeller.lastName}` : 
        'Selected seller';
      
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

  // Show assign seller modal
  const handleShowAssignSeller = (lead) => {
    console.log('Assigning seller to lead:', lead);
    console.log('Available sellers:', sellers.length);
    
    if (sellers.length === 0) {
      message.warning('No sellers available in your company. Please add sellers first.');
      return;
    }
    
    setAssigningLead(lead);
    setAssignSellerVisible(true);
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