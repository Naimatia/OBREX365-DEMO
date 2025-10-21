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
  Drawer
} from 'antd';
import { 
  UserAddOutlined, 
  ReloadOutlined,
  TeamOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  TrophyOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import ContactsService from 'services/ContactsService';
import { ContactStatus } from 'models/ContactModel';
import SellerContactList from './components/SellerContactList';
import SellerContactForm from './components/SellerContactForm';
import SellerContactDetail from './components/SellerContactDetail';
import EncouragementModal from './components/EncouragementModal';
import ContactsCSVImportModal from './components/ContactsCSVImportModal';

const { Title, Text } = Typography;

/**
 * Seller Contacts page - View and manage contacts assigned to the current seller
 */
const SellerContactsPage = () => {
  // State management
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [encouragementModal, setEncouragementModal] = useState({
    visible: false,
    status: null,
    contactName: null
  });
  const [csvImportVisible, setCsvImportVisible] = useState(false);
  const [monthlyStats, setMonthlyStats] = useState({
    total: 0,
    target: 50, // Default target - could be configurable
    pending: 0,
    contacted: 0,
    deal: 0,
    loss: 0
  });
  
  // Get current user data
  const user = useSelector(state => state.auth.user);
  const companyId = user?.company_id;
  const sellerId = user?.id;
  
  // Fetch contacts assigned to current seller
  const fetchContacts = useCallback(async () => {
    if (!companyId || !sellerId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const allContacts = await ContactsService.getCompanyContacts(companyId);
      
      // Filter contacts for current seller only
      const sellerContacts = allContacts.filter(contact => contact.seller_id === sellerId);
      
      setContacts(sellerContacts);
      
      // Calculate monthly statistics
      calculateMonthlyStats(sellerContacts);
      
    } catch (err) {
      console.error('Error fetching contacts:', err);
      message.error('Failed to load contacts. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [companyId, sellerId]);
  
  // Calculate monthly statistics for progress tracking
  const calculateMonthlyStats = (contactList) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Filter contacts by current month's affecting date
    const monthlyContacts = contactList.filter(contact => {
      if (!contact.AffectingDate) return false;
      const contactDate = new Date(contact.AffectingDate);
      return contactDate.getMonth() === currentMonth && contactDate.getFullYear() === currentYear;
    });
    
    const stats = {
      total: monthlyContacts.length,
      target: 50, // Could be made configurable per seller
      pending: monthlyContacts.filter(c => c.status === ContactStatus.PENDING).length,
      contacted: monthlyContacts.filter(c => c.status === ContactStatus.CONTACTED).length,
      deal: monthlyContacts.filter(c => c.status === ContactStatus.DEAL).length,
      loss: monthlyContacts.filter(c => c.status === ContactStatus.LOSS).length
    };
    
    setMonthlyStats(stats);
  };
  
  // Load contacts on component mount
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);
  
  // Handle submitting the contact form (create or update)
  const handleFormSubmit = async (formData) => {
    try {
      if (selectedContact?.id) {
        // Update existing contact
        await ContactsService.updateContact(selectedContact.id, formData);
        message.success('Contact updated successfully');
      } else {
        // Create new contact
        const contactData = {
          ...formData,
          company_id: companyId,
          seller_id: sellerId, // Automatically assign to current seller
          status: ContactStatus.PENDING, // New contacts start as pending
          // Add initial note if provided
          Notes: formData.initialNote ? [
            {
              note: formData.initialNote,
              CreationDate: new Date()
            }
          ] : []
        };
        
        // Remove initialNote from the data
        delete contactData.initialNote;
        
        await ContactsService.createContact(contactData);
        message.success('Contact created successfully');
      }
      
      fetchContacts();
      setIsFormVisible(false);
      
    } catch (err) {
      console.error('Error saving contact:', err);
      message.error('Failed to save contact. Please try again.');
    }
  };
  
  // Handle opening the contact form for creating a new contact
  const handleAddContact = () => {
    setSelectedContact(null);
    setIsFormVisible(true);
  };
  
  // Handle viewing contact details
  const handleViewContact = (contact) => {
    setSelectedContact(contact);
    setIsDetailVisible(true);
  };
  
  // Handle editing a contact
  const handleEditContact = (contact) => {
    setSelectedContact(contact);
    setIsFormVisible(true);
  };
  
  // Handle updating contact status
  const handleUpdateStatus = async (contactId, status) => {
    try {
      // Find the contact to get the name
      const contact = contacts.find(c => c.id === contactId);
      
      await ContactsService.updateContact(contactId, { status });
      message.success('Contact status updated successfully');
      
      // Show encouragement modal for meaningful status changes
      if ([ContactStatus.CONTACTED, ContactStatus.DEAL, ContactStatus.LOSS].includes(status)) {
        setEncouragementModal({
          visible: true,
          status: status,
          contactName: contact?.name || 'Unknown Contact'
        });
      }
      
      fetchContacts();
    } catch (err) {
      console.error('Error updating contact status:', err);
      message.error('Failed to update contact status.');
    }
  };
  
  // Handle adding a note to a contact
  const handleAddNote = async (contactId, noteText) => {
    try {
      await ContactsService.addNote(contactId, noteText);
      message.success('Note added successfully');
      
      // Refresh contacts and update viewing contact if drawer is open
      await fetchContacts();
      
      if (selectedContact?.id === contactId) {
        const updatedContact = contacts.find(c => c.id === contactId);
        if (updatedContact) {
          setSelectedContact(updatedContact);
        }
      }
      
      return true;
    } catch (err) {
      console.error('Error adding note:', err);
      message.error('Failed to add note.');
      return false;
    }
  };
  
  // Handle deleting a contact
  const handleDeleteContact = async (contactId) => {
    try {
      await ContactsService.deleteContact(contactId);
      message.success('Contact deleted successfully');
      fetchContacts();
      
      // Close detail drawer if viewing the deleted contact
      if (selectedContact?.id === contactId) {
        setIsDetailVisible(false);
        setSelectedContact(null);
      }
    } catch (err) {
      console.error('Error deleting contact:', err);
      message.error('Failed to delete contact.');
    }
  };

  // Handle successful CSV import
  const handleCsvImportSuccess = (importedCount) => {
    message.success(`Successfully imported ${importedCount} contacts from CSV`);
    setCsvImportVisible(false);
    fetchContacts(); // Refresh the contacts list
  };
  
  return (
    <div style={{ padding: '24px' }}>
      {/* Page Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            <TeamOutlined style={{ marginRight: '12px', color: '#1890ff' }} />
            My Contacts
          </Title>
          <Text type="secondary">
            Manage your assigned contacts and track progress
          </Text>
        </Col>
        <Col>
          <Space>
            <Button 
              type="primary" 
              icon={<UserAddOutlined />}
              onClick={handleAddContact}
            >
              Add Contact
            </Button>
            <Button 
              icon={<UploadOutlined />}
              onClick={() => setCsvImportVisible(true)}
            >
              Import CSV
            </Button>
            <Button 
              icon={<ReloadOutlined />}
              onClick={fetchContacts}
              loading={loading}
            >
              Refresh
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
              Progress: {monthlyStats.contacted + monthlyStats.deal + monthlyStats.loss} / {monthlyStats.total}
            </div>
            <Progress 
              percent={monthlyStats.total > 0 ? Math.round(((monthlyStats.contacted + monthlyStats.deal + monthlyStats.loss) / monthlyStats.total) * 100) : 0}
              size="small"
              status={(monthlyStats.contacted + monthlyStats.deal + monthlyStats.loss) >= monthlyStats.total ? 'success' : 'active'}
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
              title="Contacted"
              value={monthlyStats.contacted}
              valueStyle={{ color: '#1890ff' }}
              prefix={<PhoneOutlined />}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Deals"
              value={monthlyStats.deal}
              valueStyle={{ color: '#52c41a' }}
              prefix={<TrophyOutlined />}
            />
            <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
              Lost: {monthlyStats.loss}
            </div>
          </Card>
        </Col>
      </Row>
      
      {/* Contacts List */}
      <Card title="Contacts" style={{ marginBottom: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            Loading contacts...
          </div>
        ) : contacts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#8c8c8c' }}>
            <UserAddOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>No contacts assigned yet</div>
            <div style={{ fontSize: '14px', marginBottom: '16px' }}>Start by adding your first contact</div>
            <Button 
              type="primary" 
              icon={<UserAddOutlined />}
              onClick={handleAddContact}
            >
              Add First Contact
            </Button>
          </div>
        ) : (
          <SellerContactList
            contacts={contacts}
            loading={loading}
            onViewContact={handleViewContact}
            onEditContact={handleEditContact}
            onDeleteContact={handleDeleteContact}
            onUpdateStatus={handleUpdateStatus}
            onAddNote={handleAddNote}
          />
        )}
      </Card>

      {/* Add/Edit Contact Modal */}
      <Modal
        title={selectedContact ? 'Edit Contact' : 'Add New Contact'}
        open={isFormVisible}
        onCancel={() => {
          setIsFormVisible(false);
          setSelectedContact(null);
        }}
        footer={null}
        width={800}
      >
        <SellerContactForm
          contact={selectedContact}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setIsFormVisible(false);
            setSelectedContact(null);
          }}
          loading={loading}
        />
      </Modal>

      {/* Contact Detail Drawer */}
      <SellerContactDetail
        visible={isDetailVisible}
        contact={selectedContact}
        onEdit={handleEditContact}
        onAddNote={handleAddNote}
        onClose={() => {
          setIsDetailVisible(false);
          setSelectedContact(null);
        }}
      />

      {/* Encouragement Modal */}
      <EncouragementModal
        visible={encouragementModal.visible}
        status={encouragementModal.status}
        contactName={encouragementModal.contactName}
        onClose={() => setEncouragementModal({ visible: false, status: null, contactName: null })}
      />

      {/* CSV Import Modal */}
      <ContactsCSVImportModal
        visible={csvImportVisible}
        onClose={() => setCsvImportVisible(false)}
        onSuccess={handleCsvImportSuccess}
      />
    </div>
  );
};

export default SellerContactsPage;