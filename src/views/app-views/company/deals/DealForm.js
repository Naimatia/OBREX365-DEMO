// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { 
  Modal, Form, Input, Select, DatePicker, InputNumber, Button, 
  Row, Col, Spin, Alert
} from 'antd';
import { db, collection, query, where, getDocs, doc } from 'configs/FirebaseConfig';
import { 
  DollarOutlined, UserOutlined, TagOutlined, 
  HomeOutlined, FormOutlined, UserSwitchOutlined
} from '@ant-design/icons';
import { DealStatus, DealSource } from 'models/DealModel';
import contactService from 'services/firebase/ContactService';
import userService from 'services/firebase/UserService';
import propertyService from 'services/firebase/PropertyService';
import leadService from 'services/firebase/LeadService';
import moment from 'moment';

const { Option } = Select;
const { TextArea } = Input;

const DealForm = ({ visible, onCancel, onSubmit, isEditing, initialValues, companyId }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [leads, setLeads] = useState([]);
  const [selectedSource, setSelectedSource] = useState(isEditing && initialValues ? initialValues.Source : DealSource.LEADS);
  const [error, setError] = useState('');

  // Reset form when modal becomes visible or hidden
  useEffect(() => {
    if (visible) {
      form.resetFields();
      
      // If we're editing, set the form values
      if (isEditing && initialValues) {
        // Need to format dates for the form
        const formattedValues = {
          ...initialValues,
          CreationDate: initialValues.CreationDate ? moment(initialValues.CreationDate.toDate()) : null,
          LastUpdateDate: initialValues.LastUpdateDate ? moment(initialValues.LastUpdateDate.toDate()) : null,
          ClosedDate: initialValues.ClosedDate ? moment(initialValues.ClosedDate.toDate()) : null,
          StatusUpdateDate: initialValues.StatusUpdateDate ? moment(initialValues.StatusUpdateDate.toDate()) : null,
        };
        
        form.setFieldsValue(formattedValues);
      }

      // Fetch related data
      fetchData();
    } else {
      // Clear any error message when closing the form
      setError('');
    }
  }, [visible, initialValues, isEditing, form]);

  const fetchData = async () => {
    // More thorough logging for debugging
    console.log('DealForm - fetchData called with companyId:', companyId);
    
    if (!companyId) {
      console.log('No companyId available for filtering - waiting 1 second and retrying');
      // Add a delay and retry once if companyId is not available initially
      // This helps with timing issues where Redux state might not be fully loaded
      setTimeout(() => {
        if (visible) fetchData();
      }, 1000);
      return;
    }

    console.log('Fetching data with companyId:', companyId);
    setLoading(true);
    try {
      // The company_id is stored as a Firestore reference path like "/companies/k9SquTLadNkzlBOHfPkb"
      // We need to create a proper reference object
      const companyRef = doc(db, 'companies', companyId);
      console.log('Using company reference path:', companyRef.path);
      
      // Get all documents without filtering first
      const leadsSnap = await getDocs(collection(db, 'leads'));
      const contactsSnap = await getDocs(collection(db, 'contacts'));
      const propertiesSnap = await getDocs(collection(db, 'properties'));
      const usersSnap = await getDocs(collection(db, 'users'));
      
      console.log('Total leads in DB:', leadsSnap.docs.length);
      console.log('Total contacts in DB:', contactsSnap.docs.length);
      console.log('Total properties in DB:', propertiesSnap.docs.length);
      console.log('Total users in DB:', usersSnap.docs.length);
      
      // Manual filtering to handle both string IDs and reference types
      const companyPath = `companies/${companyId}`;
      const companyRefPath = `/companies/${companyId}`;
      
      console.log('Looking for company paths:', [companyId, companyPath, companyRefPath]);
      
      // Process and filter results manually
      const leadsData = leadsSnap.docs
        .map(docSnap => {
          // Use the document data as-is to preserve all fields including company_id
          const data = docSnap.data();
          return { id: docSnap.id, ...data };
        })
        .filter(lead => {
          // Handle possible formats of company_id
          const leadCompanyId = lead.company_id;
          if (!leadCompanyId) return false;
          
          // If it's a Firebase reference object
          if (typeof leadCompanyId === 'object' && leadCompanyId.path) {
            console.log('Found lead with reference path:', leadCompanyId.path);
            return leadCompanyId.path.includes(companyId);
          }
          
          // If it's a string path
          if (typeof leadCompanyId === 'string') {
            return leadCompanyId === companyId || 
                  leadCompanyId === companyPath || 
                  leadCompanyId === companyRefPath;
          }
          
          return false;
        });

      const contactsData = contactsSnap.docs
        .map(docSnap => {
          const data = docSnap.data();
          return { id: docSnap.id, ...data };
        })
        .filter(contact => {
          const contactCompanyId = contact.company_id;
          if (!contactCompanyId) return false;
          
          if (typeof contactCompanyId === 'object' && contactCompanyId.path) {
            return contactCompanyId.path.includes(companyId);
          }
          
          if (typeof contactCompanyId === 'string') {
            return contactCompanyId === companyId || 
                  contactCompanyId === companyPath || 
                  contactCompanyId === companyRefPath;
          }
          
          return false;
        });

      const propertiesData = propertiesSnap.docs
        .map(docSnap => {
          const data = docSnap.data();
          return { id: docSnap.id, ...data };
        })
        .filter(property => {
          const propertyCompanyId = property.company_id;
          if (!propertyCompanyId) return false;
          
          if (typeof propertyCompanyId === 'object' && propertyCompanyId.path) {
            return propertyCompanyId.path.includes(companyId);
          }
          
          if (typeof propertyCompanyId === 'string') {
            return propertyCompanyId === companyId || 
                  propertyCompanyId === companyPath || 
                  propertyCompanyId === companyRefPath;
          }
          
          return false;
        });

      const sellersData = usersSnap.docs
        .map(docSnap => {
          const data = docSnap.data();
          return { id: docSnap.id, ...data };
        })
        .filter(user => {
          const userCompanyId = user.company_id;
          if (!userCompanyId) return false;
          
          if (typeof userCompanyId === 'object' && userCompanyId.path) {
            return userCompanyId.path.includes(companyId);
          }
          
          if (typeof userCompanyId === 'string') {
            return userCompanyId === companyId || 
                  userCompanyId === companyPath || 
                  userCompanyId === companyRefPath;
          }
          
          return false;
        });

      console.log('Filtered contacts:', contactsData.length, 'first item:', contactsData[0] || 'none');
      console.log('Filtered sellers:', sellersData.length, 'first item:', sellersData[0] || 'none');
      console.log('Filtered properties:', propertiesData.length, 'first item:', propertiesData[0] || 'none');
      console.log('Filtered leads:', leadsData.length, 'first item:', leadsData[0] || 'none');

      // If we found items, display them; otherwise, show detailed debug info
      if (leadsData.length === 0) {
        // Sample the first lead to see its company_id format
        if (leadsSnap.docs.length > 0) {
          const sampleLead = leadsSnap.docs[0].data();
          console.log('Sample lead company_id:', sampleLead.company_id);
          if (typeof sampleLead.company_id === 'object') {
            console.log('Reference path:', sampleLead.company_id.path);
            console.log('Reference ID:', sampleLead.company_id.id);
          }
        }
      }

      setContacts(contactsData);
      setSellers(sellersData);
      setProperties(propertiesData);
      setLeads(leadsData);
    } catch (error) {
      console.error('Error fetching form data:', error);
      setError('Failed to load form data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle source change
  const handleSourceChange = (value) => {
    setSelectedSource(value);
    
    // Reset dependent fields when source changes
    if (value === DealSource.LEADS) {
      form.setFieldsValue({ contact_id: undefined });
    } else if (value === DealSource.CONTACTS) {
      form.setFieldsValue({ lead_id: undefined });
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      console.log('Form values before processing:', values);
      
      // Clean up contact_id and lead_id based on source
      const cleanedValues = { ...values };
      
      // Handle lead_id and contact_id based on source
      if (values.Source === DealSource.LEADS) {
        // For Leads source: ensure lead_id is set, set contact_id to null
        if (!cleanedValues.lead_id) {
          throw new Error('Please select a lead when source is Leads');
        }
        cleanedValues.contact_id = null; // Explicitly set to null instead of undefined
      } else if (values.Source === DealSource.CONTACTS) {
        // For Contacts source: ensure contact_id is set, set lead_id to null
        if (!cleanedValues.contact_id) {
          throw new Error('Please select a contact when source is Contacts');
        }
        cleanedValues.lead_id = null; // Explicitly set to null instead of undefined
      } else {
        // For other sources (e.g. Freelance): set both to null
        cleanedValues.lead_id = null;
        cleanedValues.contact_id = null;
      }
      
      // Filter out any remaining undefined values
      Object.keys(cleanedValues).forEach(key => {
        if (cleanedValues[key] === undefined) {
          delete cleanedValues[key]; // Remove undefined values
        }
      });
      
      // Format the data for Firestore
      const formData = {
        ...cleanedValues,
        company_id: companyId,
        LastUpdateDate: new Date(),
        // Only include these if they have values to avoid null exceptions
        ...(values.CreationDate && { CreationDate: values.CreationDate.toDate() }),
        ...(values.ClosedDate && { ClosedDate: values.ClosedDate.toDate() }),
        ...(values.StatusUpdateDate && { StatusUpdateDate: values.StatusUpdateDate.toDate() }),
      };
      
      // If status is changed to won/lost, set closed date
      if ((values.Status === DealStatus.GAIN || values.Status === DealStatus.LOSS) && !values.ClosedDate) {
        formData.ClosedDate = new Date();
      }
      
      console.log('Processed form data ready for submission:', formData);
      onSubmit(formData);
    } catch (error) {
      console.error('Form validation error:', error);
    }
  };

  return (
    <Modal
      title={isEditing ? "Edit Deal" : "Create New Deal"}
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="back" onClick={onCancel}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit} loading={loading}>
          {isEditing ? "Update" : "Create"}
        </Button>,
      ]}
      width={800}
    >
      <Spin spinning={loading}>
        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            Status: DealStatus.OPENED,
            Source: DealSource.LEADS,
            Amount: 0,
          }}
          className="deal-form"
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="Description"
                label="Description"
                rules={[{ required: true, message: 'Please enter a description' }]}
              >
                <Input prefix={<FormOutlined />} placeholder="Enter deal description" />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="Amount"
                label="Amount"
                rules={[{ required: true, message: 'Please enter deal amount' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  addonBefore="AED"
                  min={0}
                  placeholder="Enter amount"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="Source"
                label="Source"
                rules={[{ required: true, message: 'Please select a source' }]}
              >
                <Select 
                  placeholder="Select source"
                  onChange={handleSourceChange}
                >
                  {Object.values(DealSource).map(source => (
                    <Option key={source} value={source}>
                      {source}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="Status"
                label="Status"
                rules={[{ required: true, message: 'Please select a status' }]}
              >
                <Select placeholder="Select status">
                  {Object.values(DealStatus).map(status => (
                    <Option key={status} value={status}>
                      {status}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Leads selection - only show when source is Leads */}
          {selectedSource === DealSource.LEADS && (
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="lead_id"
                  label="Lead"
                  rules={[{ required: true, message: 'Please select a lead' }]}
                >
                  <Select
                    placeholder="Select lead"
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      option && option.children ? option.children.toString().toLowerCase().indexOf(input.toLowerCase()) >= 0 : false
                    }
                  >
                    {leads.map(lead => (
                      <Option key={lead.id} value={lead.id}>
                        {lead.firstName} {lead.lastName} - {lead.email}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          )}

          {/* Contact selection - required when source is Contacts */}
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="contact_id"
                label="Contact"
                rules={[{ 
                  required: selectedSource === DealSource.CONTACTS, 
                  message: 'Please select a contact' 
                }]}
              >
                <Select 
                  placeholder="Select contact"
                  allowClear={selectedSource !== DealSource.CONTACTS}
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    option && option.children ? option.children.toString().toLowerCase().indexOf(input.toLowerCase()) >= 0 : false
                  }
                  disabled={selectedSource === DealSource.LEADS}
                >
                  {contacts.map(contact => (
                    <Option key={contact.id} value={contact.id}>
                      {contact.FirstName} {contact.LastName} - {contact.email || ''}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="property_id"
                label="Property (Optional)"
              >
                <Select 
                  placeholder="Select property"
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    option && option.children ? option.children.toString().toLowerCase().indexOf(input.toLowerCase()) >= 0 : false
                  }
                >
                  {properties.map(property => (
                    <Option key={property.id} value={property.id}>
                      {property.street}, {property.city}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="seller_id"
                label="Seller (Optional)"
              >
                <Select 
                  placeholder="Select seller"
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    option && option.children ? option.children.toString().toLowerCase().indexOf(input.toLowerCase()) >= 0 : false
                  }
                >
                  {sellers.map(seller => (
                    <Option key={seller.id} value={seller.id}>
                      {seller.firstname} {seller.lastname} - {seller.email || ''}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="Notes"
                label="Notes"
              >
                <TextArea 
                  rows={4} 
                  placeholder="Enter additional notes for this deal"
                />
              </Form.Item>
            </Col>
          </Row>
          
          {isEditing && (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="CreationDate"
                    label="Creation Date"
                  >
                    <DatePicker style={{ width: '100%' }} disabled />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="ClosedDate"
                    label="Closed Date"
                  >
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}
        </Form>
      </Spin>
    </Modal>
  );
};

export default DealForm;
