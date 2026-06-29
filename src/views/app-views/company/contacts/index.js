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
  PhoneFilled,
  LockOutlined
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

// HR Role
const HR_ROLE = UserRoles.HR;

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
  const userRole = user?.Role || user?.role;

  // Check if user is HR
  const isHR = userRole === HR_ROLE;

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

  // Note Handlers - Disabled for HR
  const handleAddNote = async (contactId, noteText) => {
    if (isHR) {
      message.warning('HR users cannot add notes');
      return false;
    }
    // ... rest of function
  };

  const handleUpdateNote = async (contactId, noteId, newText) => {
    if (isHR) {
      message.warning('HR users cannot update notes');
      return false;
    }
    // ... rest of function
  };

  const handleDeleteNote = async (contactId, noteId) => {
    if (isHR) {
      message.warning('HR users cannot delete notes');
      return false;
    }
    // ... rest of function
  };

  // Contact CRUD - Disabled for HR
  const handleAddContact = () => {
    if (isHR) {
      message.warning('HR users cannot add contacts');
      return;
    }
    setCurrentContact(null);
    setFormModalVisible(true);
  };

  const handleEditContact = (contact) => {
    if (isHR) {
      message.warning('HR users cannot edit contacts');
      return;
    }
    setCurrentContact(contact);
    setFormModalVisible(true);
  };

  const handleSubmitContact = async (formData) => {
    if (isHR) return;
    // ... rest of function
  };

  const handleDeleteContact = async (contactId) => {
    if (isHR) {
      message.warning('HR users cannot delete contacts');
      return;
    }
    // ... rest of function
  };

  // Bulk operations - Disabled for HR
  const handleBulkDeleteContacts = async (contactIds) => {
    if (isHR) {
      message.warning('HR users cannot perform bulk operations');
      return;
    }
    // ... rest of function
  };

  const handleBulkAssignSellers = async (contactIds, sellerId, affectingDate) => {
    if (isHR) {
      message.warning('HR users cannot assign contacts');
      return;
    }
    // ... rest of function
  };

  const handleBulkUpdateStatus = async (contactIds, status) => {
    if (isHR) {
      message.warning('HR users cannot update status');
      return;
    }
    // ... rest of function
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
                {isHR && (
                  <Tag color="orange" icon={<LockOutlined />}>Read-Only (HR)</Tag>
                )}
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
                {!isHR && (
                  <Button
                    type="primary"
                    icon={<UserAddOutlined />}
                    onClick={handleAddContact}
                  >
                    Add Contact
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
          {isHR && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: '#fffbe6', borderRadius: 6, border: '1px solid #ffe58f' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <LockOutlined /> HR View - You can view all contacts but cannot add, edit, delete, or modify any data.
              </Text>
            </div>
          )}
        </div>

        {!isHR && selectedContactIds.length > 0 && (
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
                      isHR={isHR}
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
                      isHR={isHR}
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
                          isHR={isHR}
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

      {/* Modals - Hidden for HR */}
      {!isHR && (
        <>
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
        </>
      )}

      <Drawer
        title={
          <Space>
            <TeamOutlined />
            Contact Details
            {isHR && <Tag color="orange" icon={<LockOutlined />}>Read-Only</Tag>}
          </Space>
        }
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
            isHR={isHR}
          />
        )}
      </Drawer>
    </div>
  );
};

export default ContactsPage;