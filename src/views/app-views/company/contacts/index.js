import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Typography, 
  Space, 
  Button, 
  Row, 
  Col, 
  Tabs,
  Modal,
  message,
  Spin,
  Alert,
  Drawer
} from 'antd';
import { 
  UserAddOutlined, 
  UsergroupAddOutlined, 
  ReloadOutlined,
  TeamOutlined,
  PhoneOutlined,
  FileSearchOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import ContactsService from 'services/ContactsService';
import ContactList from './components/ContactList';
import ContactForm from './components/ContactForm';
import ContactDetail from './components/ContactDetail';
import BulkActions from './components/BulkActions';
import { ContactStatus } from 'models/ContactModel';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

/**
 * ContactsPage component for CEO and HR to manage contacts
 */
const ContactsPage = () => {
  // State management
  const [contacts, setContacts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [currentContact, setCurrentContact] = useState(null);
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [viewingContact, setViewingContact] = useState(null);
  const [error, setError] = useState(null);
  
  // Get current user from Redux store
  const { user } = useSelector((state) => state.auth);
  const companyId = user?.company_id;
  
  // Fetch contacts and sellers on component mount
  useEffect(() => {
    if (companyId) {
      fetchContacts();
      fetchSellers();
    } else {
      setError('Unable to determine company ID. Please log in again.');
      setLoading(false);
    }
  }, [companyId]);
  
  // Fetch all contacts for the current company
  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const contactsData = await ContactsService.getCompanyContacts(companyId);
      setContacts(contactsData);
      setError(null);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError('Failed to load contacts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [companyId]);
  
  // Fetch all sellers for the current company
  const fetchSellers = useCallback(async () => {
    try {
      const sellersData = await ContactsService.getCompanySellers(companyId);
      setSellers(sellersData);
    } catch (err) {
      console.error('Error fetching sellers:', err);
      message.error('Failed to load sellers list');
    }
  }, [companyId]);
  
  // Handle opening the contact form for creating a new contact
  const handleAddContact = () => {
    setCurrentContact(null); // Set to null for new contact
    setFormModalVisible(true);
  };
  
  // Handle opening the contact form for editing an existing contact
  const handleEditContact = (contact) => {
    setCurrentContact(contact);
    setFormModalVisible(true);
  };
  
  // Handle submitting the contact form (create or update)
  const handleSubmitContact = async (formData) => {
    try {
      if (currentContact?.id) {
        // Update existing contact
        await ContactsService.updateContact(currentContact.id, formData);
        message.success('Contact updated successfully');
      } else {
        // Create new contact
        const contactData = {
          ...formData,
          company_id: companyId,
          // Add initial note if provided
          Notes: formData.initialNote ? [
            {
              note: formData.initialNote,
              CreationDate: new Date()
            }
          ] : []
        };
        
        // Remove initialNote from the data to match Firestore schema
        delete contactData.initialNote;
        
        await ContactsService.createContact(contactData);
        message.success('Contact created successfully');
      }
      
      // Refresh contacts list and close modal
      fetchContacts();
      setFormModalVisible(false);
      
    } catch (err) {
      console.error('Error saving contact:', err);
      message.error('Failed to save contact. Please try again.');
    }
  };
  
  // Handle deleting a contact
  const handleDeleteContact = async (contactId) => {
    try {
      await ContactsService.deleteContact(contactId);
      message.success('Contact deleted successfully');
      fetchContacts();
    } catch (err) {
      console.error('Error deleting contact:', err);
      message.error('Failed to delete contact. Please try again.');
    }
  };
  
  // Handle bulk deletion of contacts
  const handleBulkDeleteContacts = async (contactIds) => {
    try {
      const deletePromises = contactIds.map(id => ContactsService.deleteContact(id));
      await Promise.all(deletePromises);
      
      message.success(`${contactIds.length} contacts deleted successfully`);
      setSelectedContactIds([]);
      fetchContacts();
    } catch (err) {
      console.error('Error bulk deleting contacts:', err);
      message.error('Failed to delete contacts. Please try again.');
    }
  };
  
  // Handle bulk assignment of contacts to a seller
  const handleBulkAssignSellers = async (contactIds, sellerId, affectingDate) => {
    try {
      await ContactsService.bulkUpdateContacts(contactIds, {
        seller_id: sellerId,
        AffectingDate: affectingDate || new Date()
      });
      
      message.success(`${contactIds.length} contacts assigned to seller`);
      setSelectedContactIds([]);
      fetchContacts();
    } catch (err) {
      console.error('Error assigning contacts to seller:', err);
      message.error('Failed to assign contacts. Please try again.');
    }
  };
  
  // Handle bulk update of contact status
  const handleBulkUpdateStatus = async (contactIds, status) => {
    try {
      await ContactsService.bulkUpdateContacts(contactIds, { status });
      
      message.success(`${contactIds.length} contacts updated to ${status}`);
      setSelectedContactIds([]);
      fetchContacts();
    } catch (err) {
      console.error('Error updating contacts status:', err);
      message.error('Failed to update contacts status. Please try again.');
    }
  };
  
  // Handle viewing a contact's details
  const handleViewContact = (contact) => {
    setViewingContact(contact);
    setDetailDrawerVisible(true);
  };
  
  // Handle adding a note to a contact
  const handleAddNote = async (contactId, noteText) => {
    try {
      await ContactsService.addNote(contactId, noteText);
      message.success('Note added successfully');
      
      // Refresh contacts and update viewing contact if drawer is open
      await fetchContacts();
      
      if (viewingContact?.id === contactId) {
        // Find the updated contact to refresh the detail view
        const updatedContact = contacts.find(c => c.id === contactId);
        if (updatedContact) {
          setViewingContact(updatedContact);
        }
      }
      
      return true;
    } catch (err) {
      console.error('Error adding note:', err);
      message.error('Failed to add note. Please try again.');
      return false;
    }
  };
  
  // Render error message if there's an error
  if (error) {
    return (
      <Alert
        message="Error"
        description={error}
        type="error"
        showIcon
        action={
          <Button type="primary" onClick={fetchContacts}>
            Try Again
          </Button>
        }
      />
    );
  }

  return (
    <div className="contacts-page">
      <Card>
        <div className="contacts-header" style={{ marginBottom: '24px' }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Space align="center">
                <TeamOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                <Title level={4} style={{ margin: 0 }}>Contacts Management</Title>
              </Space>
            </Col>
            <Col>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchContacts}
                  loading={loading}
                >
                  Refresh
                </Button>
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  onClick={handleAddContact}
                >
                  Add Contact
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* Display bulk actions when contacts are selected */}
        {selectedContactIds.length > 0 && (
          <div className="bulk-actions-container" style={{ marginBottom: '16px' }}>
            <BulkActions
              selectedContacts={selectedContactIds}
              sellers={sellers}
              onAssignSellers={handleBulkAssignSellers}
              onUpdateStatus={handleBulkUpdateStatus}
              onDelete={handleBulkDeleteContacts}
              loading={loading}
            />
          </div>
        )}

        <div className="contacts-content">
        <Tabs
  defaultActiveKey="all"
  items={[
    {
      key: 'all',
      label: (
        <span>
          <UsergroupAddOutlined /> All Contacts
        </span>
      ),
      children: (
        <Spin spinning={loading}>
          <ContactList
            contacts={contacts}
            loading={loading}
            sellers={sellers}
            onViewContact={handleViewContact}
            onEditContact={handleEditContact}
            onDeleteContact={handleDeleteContact}
            onSelectChange={setSelectedContactIds}
            onAssignSeller={handleBulkAssignSellers}
            onUpdateStatus={handleBulkUpdateStatus}
            onAddNote={handleAddNote}
          />
        </Spin>
      ),
    },
    {
      key: 'unassigned',
      label: (
        <span>
          <PhoneOutlined /> Unassigned
        </span>
      ),
      children: (
        <Spin spinning={loading}>
          <ContactList
            contacts={contacts.filter(c => !c.seller_id)}
            loading={loading}
            sellers={sellers}
            onViewContact={handleViewContact}
            onEditContact={handleEditContact}
            onDeleteContact={handleDeleteContact}
            onSelectChange={setSelectedContactIds}
            onAssignSeller={handleBulkAssignSellers}
            onUpdateStatus={handleBulkUpdateStatus}
            onAddNote={handleAddNote}
          />
        </Spin>
      ),
    },
    {
      key: 'byStatus',
      label: (
        <span>
          <FileSearchOutlined /> By Status
        </span>
      ),
      children: (
        <Tabs
          items={[
            {
              key: 'pending',
              label: 'Pending',
              children: (
                <ContactList
                  contacts={contacts.filter(c => c.status === ContactStatus.PENDING)}
                  loading={loading}
                  sellers={sellers}
                  onViewContact={handleViewContact}
                  onEditContact={handleEditContact}
                  onDeleteContact={handleDeleteContact}
                  onSelectChange={setSelectedContactIds}
                  onAssignSeller={handleBulkAssignSellers}
                  onUpdateStatus={handleBulkUpdateStatus}
                  onAddNote={handleAddNote}
                />
              ),
            },
            {
              key: 'contacted',
              label: 'Contacted',
              children: (
                <ContactList
                  contacts={contacts.filter(c => c.status === ContactStatus.CONTACTED)}
                  loading={loading}
                  sellers={sellers}
                  onViewContact={handleViewContact}
                  onEditContact={handleEditContact}
                  onDeleteContact={handleDeleteContact}
                  onSelectChange={setSelectedContactIds}
                  onAssignSeller={handleBulkAssignSellers}
                  onUpdateStatus={handleBulkUpdateStatus}
                  onAddNote={handleAddNote}
                />
              ),
            },
            {
              key: 'deal',
              label: 'Deal',
              children: (
                <ContactList
                  contacts={contacts.filter(c => c.status === ContactStatus.DEAL)}
                  loading={loading}
                  sellers={sellers}
                  onViewContact={handleViewContact}
                  onEditContact={handleEditContact}
                  onDeleteContact={handleDeleteContact}
                  onSelectChange={setSelectedContactIds}
                  onAssignSeller={handleBulkAssignSellers}
                  onUpdateStatus={handleBulkUpdateStatus}
                  onAddNote={handleAddNote}
                />
              ),
            },
            {
              key: 'loss',
              label: 'Loss',
              children: (
                <ContactList
                  contacts={contacts.filter(c => c.status === ContactStatus.LOSS)}
                  loading={loading}
                  sellers={sellers}
                  onViewContact={handleViewContact}
                  onEditContact={handleEditContact}
                  onDeleteContact={handleDeleteContact}
                  onSelectChange={setSelectedContactIds}
                  onAssignSeller={handleBulkAssignSellers}
                  onUpdateStatus={handleBulkUpdateStatus}
                  onAddNote={handleAddNote}
                />
              ),
            },
          ]}
        />
      ),
    },
  ]}
/>
        </div>
      </Card>

      {/* Modal for adding/editing contacts */}
   <Modal
  title={currentContact ? 'Edit Contact' : 'Add New Contact'}
  open={formModalVisible} // Changed from `visible`
  onCancel={() => setFormModalVisible(false)}
  footer={null}
  width={800}
  destroyOnClose
>
  <ContactForm
    contact={currentContact}
    sellers={sellers}
    onSubmit={handleSubmitContact}
    onCancel={() => setFormModalVisible(false)}
    loading={loading}
  />
</Modal>

      {/* Drawer for contact details */}
      <Drawer
        title="Contact Details"
        placement="right"
        width={600}
        onClose={() => setDetailDrawerVisible(false)}
        visible={detailDrawerVisible}
        destroyOnClose
      >
        {viewingContact && (
          <ContactDetail
            contact={viewingContact}
            sellers={sellers}
            onEdit={handleEditContact}
            onAddNote={handleAddNote}
            onClose={() => setDetailDrawerVisible(false)}
          />
        )}
      </Drawer>
    </div>
  );
};

export default ContactsPage;