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
  Tag,
  Skeleton,
  Empty
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
import ContactService from 'services/firebase/ContactService';
import { ContactStatus } from 'models/ContactModel';
import SellerContactList from './components/SellerContactList';
import SellerContactForm from './components/SellerContactForm';
import SellerContactDetail from './components/SellerContactDetail';
import EncouragementModal from './components/EncouragementModal';
import ContactsCSVImportModal from './components/ContactsCSVImportModal';
import sellerActivityService, { ActivityTypes, EntityTypes } from 'services/firebase/SellerActivityService';

const { Title, Text } = Typography;

const SellerContactsPage = () => {
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
    target: 50,
    pending: 0,
    contacted: 0,
    deal: 0,
    loss: 0,
    converted: 0
  });
  
  const user = useSelector(state => state.auth.user);
  const companyId = user?.company_id;
  const sellerId = user?.id;

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    if (!companyId || !sellerId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const allContacts = await ContactService.getContactsByCompany(companyId);
      
      const sellerContacts = allContacts.filter(contact => {
        return contact.seller_id === sellerId || 
               contact.assignedTo?.id === sellerId ||
               contact.createdBy === sellerId;
      });
      
      setContacts(sellerContacts);
      calculateMonthlyStats(sellerContacts);
      
      // Update selected contact if it exists
      if (selectedContact?.id) {
        const updated = sellerContacts.find(c => c.id === selectedContact.id);
        if (updated) {
          setSelectedContact(updated);
        }
      }
      
    } catch (err) {
      console.error('Error fetching contacts:', err);
      message.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [companyId, sellerId, selectedContact?.id]);

  const calculateMonthlyStats = (contactList) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthlyContacts = contactList.filter(contact => {
      const date = contact.CreationDate || contact.createdAt;
      if (!date) return false;
      const contactDate = date?.toDate ? date.toDate() : new Date(date);
      return contactDate.getMonth() === currentMonth && contactDate.getFullYear() === currentYear;
    });
    
    setMonthlyStats({
      total: monthlyContacts.length,
      target: 50,
      pending: monthlyContacts.filter(c => c.status === ContactStatus.PENDING || c.status === 'pending').length,
      contacted: monthlyContacts.filter(c => c.status === ContactStatus.CONTACTED || c.status === 'contacted').length,
      deal: monthlyContacts.filter(c => c.status === ContactStatus.DEAL || c.status === 'deal').length,
      loss: monthlyContacts.filter(c => c.status === ContactStatus.LOSS || c.status === 'loss').length,
      converted: monthlyContacts.filter(c => c.leadId || c.convertedFromLeadId || c.status === 'converted').length
    });
  };

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

    const handleUpdateContact = async (contactId, updateData) => {
    try {
      await ContactService.update(contactId, updateData);
      await fetchContacts();
      message.success('Contact updated');
      return true;
    } catch (err) {
      message.error('Failed to update contact');
      return false;
    }
  };

const handleFormSubmit = async (formData) => {
  try {
    if (selectedContact?.id) {
      // UPDATE existing contact
      const oldContact = contacts.find(c => c.id === selectedContact.id);
      
      await ContactService.update(selectedContact.id, formData);
      
      // Log update activity
      if (sellerId && companyId && oldContact) {
        await sellerActivityService.logActivity({
          sellerId: sellerId,
          companyId: companyId,
          activityType: ActivityTypes.CONTACT_UPDATED,
          entityType: EntityTypes.CONTACT,
          entityId: selectedContact.id,
          entityName: oldContact.name || 'Unknown Contact',
          details: {
            name: oldContact.name,
            email: oldContact.email,
            phone: oldContact.phoneNumber,
            updatedFields: Object.keys(formData).join(', '),
          },
          metadata: {
            updatedAt: new Date().toISOString(),
            fields: Object.keys(formData),
          }
        });
      }
      
      message.success('Contact updated successfully');
    } else {
      // CREATE new contact
      const contactData = {
        ...formData,
        company_id: companyId,
        seller_id: sellerId,
        createdBy: sellerId,
        status: ContactStatus.PENDING,
        CreationDate: new Date(),
        Notes: formData.initialNote ? [{
          note: formData.initialNote,
          CreationDate: new Date()
        }] : []
      };
      delete contactData.initialNote;
      
      const newContact = await ContactService.create(contactData);
      
      // Log create activity
      if (sellerId && companyId && newContact) {
        await sellerActivityService.logActivity({
          sellerId: sellerId,
          companyId: companyId,
          activityType: ActivityTypes.CONTACT_CREATED,
          entityType: EntityTypes.CONTACT,
          entityId: newContact.id,
          entityName: contactData.name || 'Unknown Contact',
          details: {
            name: contactData.name,
            email: contactData.email,
            phone: contactData.phoneNumber,
            source: contactData.source,
          },
          metadata: {
            status: ContactStatus.PENDING,
            source: contactData.source,
            createdAt: new Date().toISOString(),
          }
        });
      }
      
      message.success('Contact created successfully');
    }
    
    await fetchContacts();
    setIsFormVisible(false);
    setSelectedContact(null);
  } catch (err) {
    console.error('Error saving contact:', err);
    message.error('Failed to save contact: ' + err.message);
  }
};

// Handle updating status with auto-deal creation - FIXED with activity logging
const handleUpdateStatus = async (contactId, status) => {
  try {
    setLoading(true);
    
    // Get the contact before update
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) {
      message.error('Contact not found');
      setLoading(false);
      return;
    }
    
    const oldStatus = contact.status;
    
    // Use the method that auto-creates deals
    const result = await ContactService.updateStatusWithDeal(contactId, status);
    
    await fetchContacts();
    
    // Log status change activity (already logged in updateStatusWithDeal, but we can add additional context)
    if (sellerId && companyId) {
      await sellerActivityService.logActivity({
        sellerId: sellerId,
        companyId: companyId,
        activityType: ActivityTypes.CONTACT_STATUS_CHANGED,
        entityType: EntityTypes.CONTACT,
        entityId: contactId,
        entityName: contact.name || 'Unknown Contact',
        details: {
          name: contact.name,
          previousStatus: oldStatus,
          newStatus: status,
          dealCreated: !!result?.dealId,
          dealId: result?.dealId || null,
        },
        metadata: {
          oldStatus: oldStatus,
          newStatus: status,
          dealId: result?.dealId || null,
          amount: result?.deal?.Amount || 0,
          statusChangedAt: new Date().toISOString(),
        }
      });
    }
    
    // Check if a deal was created
    if (result?.dealId) {
      const isProposal = status === 'proposal' || status === 'Proposal' || status === ContactStatus.PROPOSAL;
      const isDeal = status === 'deal' || status === 'Deal' || status === ContactStatus.DEAL;
      
      if (isProposal || isDeal) {
        message.success(`Status updated to ${status} and deal created!`);
        
        // Log deal creation specifically
        if (sellerId && companyId && result.deal) {
          await sellerActivityService.logActivity({
            sellerId: sellerId,
            companyId: companyId,
            activityType: ActivityTypes.CONTACT_CONVERTED_TO_DEAL,
            entityType: EntityTypes.DEAL,
            entityId: result.dealId,
            entityName: result.deal.Description || 'New Deal',
            details: {
              contactName: contact.name,
              contactId: contactId,
              dealId: result.dealId,
              amount: result.deal.Amount,
              dealName: result.deal.Description,
            },
            metadata: {
              contactId: contactId,
              contactName: contact.name,
              amount: result.deal.Amount,
              convertedAt: new Date().toISOString(),
            }
          });
        }
        
        // You can add logic here to open the deal or show a notification
        if (result.deal) {
          console.log('Deal created:', result.deal);
          // Optionally navigate to deal detail
          // navigate(`/deals/${result.dealId}`);
        }
      } else {
        message.success(`Status updated to ${status}`);
      }
    } else {
      message.success(`Status updated to ${status}`);
    }
    
    // Show encouragement modal for certain statuses
    if (status === ContactStatus.DEAL || status === ContactStatus.PROPOSAL || 
        status === ContactStatus.LOSS || status === ContactStatus.WON) {
      setEncouragementModal({
        visible: true,
        status: status,
        contactName: contact.name
      });
    }
    
  } catch (err) {
    console.error('Error updating status:', err);
    message.error('Failed to update status: ' + err.message);
  } finally {
    setLoading(false);
  }
};

// FIXED: Handle adding a note with proper refresh and activity logging
const handleAddNote = async (contactId, noteText) => {
  try {
    // Get the contact before adding note
    const contact = contacts.find(c => c.id === contactId);
    
    // Add the note
    await ContactService.addNote(contactId, noteText);
    
    // Refresh the entire contacts list
    await fetchContacts();
    
    // Log note activity
    if (sellerId && companyId && contact) {
      await sellerActivityService.logActivity({
        sellerId: sellerId,
        companyId: companyId,
        activityType: ActivityTypes.CONTACT_NOTE_ADDED,
        entityType: EntityTypes.CONTACT,
        entityId: contactId,
        entityName: contact.name || 'Unknown Contact',
        details: {
          name: contact.name,
          note: noteText.substring(0, 100) + (noteText.length > 100 ? '...' : ''),
          noteLength: noteText.length,
          contactStatus: contact.status,
        },
        metadata: {
          noteAddedAt: new Date().toISOString(),
          contactStatus: contact.status,
        }
      });
    }
    
    // Update selected contact if detail view is open
    if (selectedContact && selectedContact.id === contactId) {
      const updatedContact = await ContactService.getById(contactId);
      if (updatedContact) {
        setSelectedContact(updatedContact);
      }
    }
    
    message.success('Note added successfully');
    return true;
  } catch (err) {
    console.error('Error adding note:', err);
    message.error('Failed to add note: ' + err.message);
    return false;
  }
};

  // FIXED: Handle updating a note with proper refresh
  const handleUpdateNote = async (contactId, noteId, newText) => {
    try {
      await ContactService.updateNote(contactId, noteId, newText);
      
      // Refresh the entire contacts list
      await fetchContacts();
      
      message.success('Note updated successfully');
      return true;
    } catch (err) {
      console.error('Error updating note:', err);
      message.error('Failed to update note');
      return false;
    }
  };

  // FIXED: Handle deleting a note with proper refresh
  const handleDeleteNote = async (contactId, noteId) => {
    try {
      await ContactService.deleteNote(contactId, noteId);
      
      // Refresh the entire contacts list
      await fetchContacts();
      
      message.success('Note deleted successfully');
      return true;
    } catch (err) {
      console.error('Error deleting note:', err);
      message.error('Failed to delete note');
      return false;
    }
  };

  const handleDeleteContact = async (contactId) => {
    try {
      await ContactService.delete(contactId);
      message.success('Contact deleted');
      await fetchContacts();
      if (selectedContact?.id === contactId) {
        setIsDetailVisible(false);
        setSelectedContact(null);
      }
    } catch (err) {
      message.error('Failed to delete contact');
    }
  };

  const handleCsvImportSuccess = (count) => {
    message.success(`Imported ${count} contacts`);
    setCsvImportVisible(false);
    fetchContacts();
  };

  const handleAddContact = () => {
    setSelectedContact(null);
    setIsFormVisible(true);
  };

  const handleViewContact = (contact) => {
    setSelectedContact(contact);
    setIsDetailVisible(true);
  };

  const handleEditContact = (contact) => {
    setSelectedContact(contact);
    setIsFormVisible(true);
  };

  // Get status counts for badges
  const getStatusCount = (status) => {
    return contacts.filter(c => c.status === status).length;
  };

  const statusCounts = {
    total: contacts.length,
    pending: getStatusCount(ContactStatus.PENDING) + getStatusCount('pending'),
    contacted: getStatusCount(ContactStatus.CONTACTED) + getStatusCount('contacted'),
    deal: getStatusCount(ContactStatus.DEAL) + getStatusCount('deal'),
    loss: getStatusCount(ContactStatus.LOSS) + getStatusCount('loss'),
    active: getStatusCount('active'),
    hot: getStatusCount('hot'),
    cold: getStatusCount('cold')
  };

  return (
    <div style={{ padding: '16px 24px' }}>
      {/* Header */}
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} md={12}>
          <Space>
            <TeamOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <Title level={3} style={{ margin: 0 }}>My Contacts</Title>
            <Tag color="blue">{contacts.length}</Tag>
          </Space>
        </Col>
        <Col xs={24} md={12}>
          <Space wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button icon={<ReloadOutlined />} onClick={fetchContacts} loading={loading}>
              Refresh
            </Button>
            <Button icon={<UploadOutlined />} onClick={() => setCsvImportVisible(true)}>
              Import
            </Button>
            <Button type="primary" icon={<UserAddOutlined />} onClick={handleAddContact}>
              Add Contact
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Stats Cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic title="Total" value={statusCounts.total} valueStyle={{ fontSize: 20 }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ textAlign: 'center', background: '#f6ffed' }}>
            <Statistic title="Deals" value={statusCounts.deal} valueStyle={{ fontSize: 20, color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ textAlign: 'center', background: '#fff7e6' }}>
            <Statistic title="Pending" value={statusCounts.pending} valueStyle={{ fontSize: 20, color: '#faad14' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ textAlign: 'center', background: '#e6f7ff' }}>
            <Statistic title="Contacted" value={statusCounts.contacted} valueStyle={{ fontSize: 20, color: '#1890ff' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ textAlign: 'center', background: '#f9f0ff' }}>
            <Statistic title="Converted" value={monthlyStats.converted} valueStyle={{ fontSize: 20, color: '#722ed1' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ textAlign: 'center', background: '#fff1f0' }}>
            <Statistic title="Lost" value={statusCounts.loss} valueStyle={{ fontSize: 20, color: '#ff4d4f' }} />
          </Card>
        </Col>
      </Row>

      {/* Monthly Progress */}
      <Card size="small" style={{ marginBottom: 20 }}>
        <Row align="middle" gutter={[16, 16]}>
          <Col xs={24} md={6}>
            <Space>
              <CalendarOutlined style={{ color: '#1890ff' }} />
              <Text strong>This Month</Text>
              <Tag color="blue">{monthlyStats.total}</Tag>
            </Space>
          </Col>
          <Col xs={24} md={18}>
            <Progress 
              percent={monthlyStats.total > 0 ? Math.round(((monthlyStats.contacted + monthlyStats.deal) / monthlyStats.total) * 100) : 0}
              size="small"
              status="active"
              format={() => `${monthlyStats.contacted + monthlyStats.deal}/${monthlyStats.total}`}
            />
          </Col>
        </Row>
      </Card>

      {/* Contact List */}
      <Card bodyStyle={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 24 }}>
            <Skeleton active paragraph={{ rows: 5 }} />
          </div>
        ) : contacts.length === 0 ? (
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No contacts yet"
            style={{ padding: '40px 0' }}
          >
            <Button type="primary" icon={<UserAddOutlined />} onClick={handleAddContact}>
              Add Your First Contact
            </Button>
          </Empty>
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

      {/* Modals */}
      <Modal
        title={selectedContact ? 'Edit Contact' : 'Add Contact'}
        open={isFormVisible}
        onCancel={() => { setIsFormVisible(false); setSelectedContact(null); }}
        footer={null}
        width={600}
        destroyOnClose
      >
        <SellerContactForm
          contact={selectedContact}
          onSubmit={handleFormSubmit}
          onCancel={() => { setIsFormVisible(false); setSelectedContact(null); }}
          loading={loading}
        />
      </Modal>

      {/* FIXED: Pass the correct handlers */}
      <SellerContactDetail
        visible={isDetailVisible}
        contact={selectedContact}
        loading={loading}
        onEdit={handleEditContact}
        onAddNote={handleAddNote}
        onUpdateNote={handleUpdateNote}
        onDeleteNote={handleDeleteNote}
        onUpdateStatus={handleUpdateStatus}
        onUpdateContact={handleUpdateContact}
        onClose={() => { 
          setIsDetailVisible(false); 
          setSelectedContact(null); 
        }}
      />

      <EncouragementModal
        visible={encouragementModal.visible}
        status={encouragementModal.status}
        contactName={encouragementModal.contactName}
        onClose={() => setEncouragementModal({ visible: false, status: null, contactName: null })}
      />

      <ContactsCSVImportModal
        visible={csvImportVisible}
        onClose={() => setCsvImportVisible(false)}
        onSuccess={handleCsvImportSuccess}
      />
    </div>
  );
};

export default SellerContactsPage;