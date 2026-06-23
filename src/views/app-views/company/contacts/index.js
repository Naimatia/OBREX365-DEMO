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
  Drawer,
  Tag
} from 'antd';
import {
  UserAddOutlined,
  UsergroupAddOutlined,
  ReloadOutlined,
  TeamOutlined,
  PhoneOutlined,
  FileSearchOutlined,
  UserOutlined,
  MailOutlined,
  PhoneFilled
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import ContactsService from 'services/ContactsService';
import ContactList from './components/ContactList';
import ContactForm from './components/ContactForm';
import ContactDetail from './components/ContactDetail';
import BulkActions from './components/BulkActions';
import { ContactStatus } from 'models/ContactModel';
import { db, collection, getDocs, query, where } from 'configs/FirebaseConfig';
import { UserRoles } from 'models/UserModel';

const { Title, Text } = Typography;

// Sales roles for filtering sellers
const salesRoles = [
  UserRoles.SELLER,
  UserRoles.SALES_EXECUTIVE,
  UserRoles.AGENT,
  UserRoles.TEAM_LEADER,
  UserRoles.SALES_MANAGER,
  UserRoles.OFF_PLAN_SALES,
  UserRoles.READY_TO_MOVE_SALES,
];

const ContactsPage = () => {
  const [contacts, setContacts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [currentContact, setCurrentContact] = useState(null);
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [viewingContact, setViewingContact] = useState(null);
  const [error, setError] = useState(null);

  const { user } = useSelector((state) => state.auth);
  const companyId = user?.company_id;

  // Fetch all contacts with seller information
  const fetchContacts = useCallback(async () => {
    if (!companyId) return [];

    try {
      setLoading(true);
      
      const contactsData = await ContactsService.getCompanyContacts(companyId);
      
      // Fetch all users to get seller names
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersMap = {};
      usersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.company_id === companyId) {
          usersMap[doc.id] = {
            id: doc.id,
            ...data,
            fullName: `${data.firstname || ''} ${data.lastname || ''}`.trim()
          };
        }
      });

      // Enrich contacts with seller information
      const enrichedContacts = contactsData.map(contact => {
        const sellerInfo = contact.seller_id ? usersMap[contact.seller_id] : null;
        return {
          ...contact,
          sellerName: sellerInfo ? sellerInfo.fullName : null,
          sellerEmail: sellerInfo ? sellerInfo.email : null,
          sellerPhone: sellerInfo ? sellerInfo.phoneNumber || sellerInfo.phone : null,
          sellerData: sellerInfo || null
        };
      });

      setContacts(enrichedContacts);
      setError(null);
      return enrichedContacts;
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError('Failed to load contacts. Please try again.');
      return [];
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // Fetch sellers
  const fetchSellers = useCallback(async () => {
    if (!companyId) return;
    
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const sellersList = [];
      
      usersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.company_id === companyId && salesRoles.includes(data.Role)) {
          sellersList.push({
            id: doc.id,
            name: `${data.firstname || ''} ${data.lastname || ''}`.trim(),
            email: data.email || '',
            phoneNumber: data.phoneNumber || data.phone || '',
            role: data.Role || 'Seller'
          });
        }
      });
      
      setSellers(sellersList);
    } catch (err) {
      console.error('Error fetching sellers:', err);
      message.error('Failed to load sellers');
    }
  }, [companyId]);

  useEffect(() => {
    fetchContacts();
    fetchSellers();
  }, [fetchContacts, fetchSellers]);

  // Refresh data
  const refreshData = useCallback(async (contactId = null) => {
    const freshContacts = await fetchContacts();

    if (contactId && detailDrawerVisible) {
      const updated = freshContacts.find(c => c.id === contactId);
      if (updated) {
        setViewingContact(updated);
      }
    }
  }, [fetchContacts, detailDrawerVisible]);

  // Note Handlers - FIXED with proper refresh
  const handleAddNote = async (contactId, noteText) => {
    try {
      await ContactsService.addNote(contactId, noteText);
      message.success('Note added successfully');
      await refreshData(contactId);
      return true;
    } catch (err) {
      console.error('Error adding note:', err);
      message.error('Failed to add note');
      return false;
    }
  };

  const handleUpdateNote = async (contactId, noteId, newText) => {
    try {
      await ContactsService.updateNote(contactId, noteId, newText);
      message.success('Note updated successfully');
      await refreshData(contactId);
      return true;
    } catch (err) {
      console.error('Error updating note:', err);
      message.error('Failed to update note');
      return false;
    }
  };

  const handleDeleteNote = async (contactId, noteId) => {
    try {
      await ContactsService.deleteNote(contactId, noteId);
      message.success('Note deleted successfully');
      await refreshData(contactId);
      return true;
    } catch (err) {
      console.error('Error deleting note:', err);
      message.error('Failed to delete note');
      return false;
    }
  };

  // Contact CRUD
  const handleAddContact = () => {
    setCurrentContact(null);
    setFormModalVisible(true);
  };

  const handleEditContact = (contact) => {
    setCurrentContact(contact);
    setFormModalVisible(true);
  };

  const handleSubmitContact = async (formData) => {
    try {
      if (currentContact?.id) {
        await ContactsService.updateContact(currentContact.id, formData);
        message.success('Contact updated successfully');
      } else {
        const contactData = {
          ...formData,
          company_id: companyId,
          Notes: formData.initialNote ? [
            {
              id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              note: formData.initialNote,
              CreationDate: new Date()
            }
          ] : []
        };

        delete contactData.initialNote;
        await ContactsService.createContact(contactData);
        message.success('Contact created successfully');
      }

      await fetchContacts();
      setFormModalVisible(false);
      setCurrentContact(null);
    } catch (err) {
      console.error('Error saving contact:', err);
      message.error('Failed to save contact. Please try again.');
    }
  };

  const handleDeleteContact = async (contactId) => {
    try {
      await ContactsService.deleteContact(contactId);
      message.success('Contact deleted successfully');
      await fetchContacts();
    } catch (err) {
      console.error('Error deleting contact:', err);
      message.error('Failed to delete contact. Please try again.');
    }
  };

  // Bulk operations
  const handleBulkDeleteContacts = async (contactIds) => {
    try {
      const deletePromises = contactIds.map(id => ContactsService.deleteContact(id));
      await Promise.all(deletePromises);

      message.success(`${contactIds.length} contacts deleted successfully`);
      setSelectedContactIds([]);
      await fetchContacts();
    } catch (err) {
      console.error('Error bulk deleting contacts:', err);
      message.error('Failed to delete contacts. Please try again.');
    }
  };

  const handleBulkAssignSellers = async (contactIds, sellerId, affectingDate) => {
    try {
      await ContactsService.bulkUpdateContacts(contactIds, {
        seller_id: sellerId,
        AffectingDate: affectingDate || new Date()
      });

      message.success(`${contactIds.length} contacts assigned to seller`);
      setSelectedContactIds([]);
      await fetchContacts();
    } catch (err) {
      console.error('Error assigning contacts to seller:', err);
      message.error('Failed to assign contacts. Please try again.');
    }
  };

  const handleBulkUpdateStatus = async (contactIds, status) => {
    try {
      await ContactsService.bulkUpdateContacts(contactIds, { status });

      message.success(`${contactIds.length} contacts updated to ${status}`);
      setSelectedContactIds([]);
      await fetchContacts();
    } catch (err) {
      console.error('Error updating contacts status:', err);
      message.error('Failed to update contacts status. Please try again.');
    }
  };

  const handleViewContact = (contact) => {
    setViewingContact(contact);
    setDetailDrawerVisible(true);
  };

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
    <div className="contacts-page" style={{ padding: '24px' }}>
      <Card>
        <div className="contacts-header" style={{ marginBottom: '24px' }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Space align="center">
                <TeamOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                <Title level={4} style={{ margin: 0 }}>Contacts Management</Title>
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  {contacts.length} Total
                </Tag>
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
                label: <span><UsergroupAddOutlined /> All Contacts</span>,
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
                label: <span><PhoneOutlined /> Unassigned</span>,
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
                label: <span><FileSearchOutlined /> By Status</span>,
                children: (
                  <Tabs
                    items={Object.values(ContactStatus).map(status => ({
                      key: status,
                      label: status,
                      children: (
                        <ContactList
                          contacts={contacts.filter(c => c.status === status)}
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
                    }))}
                  />
                ),
              },
            ]}
          />
        </div>
      </Card>

      <Modal
        title={currentContact ? 'Edit Contact' : 'Add New Contact'}
        open={formModalVisible}
        onCancel={() => { setFormModalVisible(false); setCurrentContact(null); }}
        footer={null}
        width={800}
        destroyOnClose
      >
        <ContactForm
          contact={currentContact}
          sellers={sellers}
          onSubmit={handleSubmitContact}
          onCancel={() => { setFormModalVisible(false); setCurrentContact(null); }}
          loading={loading}
        />
      </Modal>

      <Drawer
        title="Contact Details"
        placement="right"
        width={600}
        onClose={() => { setDetailDrawerVisible(false); setViewingContact(null); }}
        open={detailDrawerVisible}
        destroyOnClose
      >
        {viewingContact && (
          <ContactDetail
            contact={viewingContact}
            sellers={sellers}
            onEdit={handleEditContact}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            onClose={() => { setDetailDrawerVisible(false); setViewingContact(null); }}
          />
        )}
      </Drawer>
    </div>
  );
};

export default ContactsPage;