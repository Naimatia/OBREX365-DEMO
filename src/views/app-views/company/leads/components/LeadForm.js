import React, { useEffect } from 'react';
import { Form, Input, Select, Button, InputNumber, Row, Col, DatePicker, Modal } from 'antd';
import { LeadStatus, LeadInterestLevel, LeadRedirectionSource } from 'models/LeadModel';
import countries from 'constants/countries';
import moment from 'moment';

/**
 * Component for adding or editing lead
 */
const LeadForm = ({ 
  visible, 
  onCancel, 
  onSubmit, 
  editingLead = null, 
  confirmLoading,
  sellers = []
}) => {
  const [form] = Form.useForm();
  
  useEffect(() => {
    if (visible) {
      form.resetFields();
      
      if (editingLead) {
        // Convert Firestore timestamp to moment for DatePicker
        const creationDate = editingLead.CreationDate ? 
          moment(editingLead.CreationDate.toDate?.() || editingLead.CreationDate) : 
          moment(); // Default to current date/time if no date
        
        form.setFieldsValue({
          ...editingLead,
          CreationDate: creationDate
        });
      } else {
        // For new leads, set current date/time by default
        form.setFieldsValue({
          CreationDate: moment()
        });
      }
    }
  }, [visible, editingLead, form]);
  
  const handleSubmit = () => {
    form.validateFields().then(values => {
      onSubmit(values);
    });
  };

  const title = editingLead ? 'Edit Lead' : 'Add New Lead';

  return (
    <Modal
      title={title}
      visible={visible}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          loading={confirmLoading} 
          onClick={handleSubmit}
        >
          {editingLead ? 'Update' : 'Create'}
        </Button>
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        name="leadForm"
        initialValues={{
          status: LeadStatus.PENDING,
          InterestLevel: LeadInterestLevel.MEDIUM,
          RedirectedFrom: LeadRedirectionSource.WEBSITE
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="name"
              label="Full Name"
              rules={[{ required: true, message: 'Please enter the lead name' }]}
            >
              <Input placeholder="Enter full name" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="region"
              label="Region"
              rules={[{ required: true, message: 'Please select a region' }]}
            >
              <Select
                placeholder="Select region"
                showSearch
                optionFilterProp="children"
              >
                {countries.map(country => (
                  <Select.Option key={country.code} value={country.name}>
                    {country.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { type: 'email', message: 'Please enter a valid email' },
                { required: true, message: 'Please enter email' }
              ]}
            >
              <Input placeholder="Enter email address" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="phoneNumber"
              label="Phone Number"
              rules={[{ required: true, message: 'Please enter phone number' }]}
            >
              <Input placeholder="Enter phone number" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="status"
              label="Status"
              rules={[{ required: true, message: 'Please select status' }]}
            >
              <Select placeholder="Select status">
                {Object.values(LeadStatus).map(status => (
                  <Select.Option key={status} value={status}>
                    {status}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="InterestLevel"
              label="Interest Level"
              rules={[{ required: true, message: 'Please select interest level' }]}
            >
              <Select placeholder="Select interest level">
                {Object.values(LeadInterestLevel).map(level => (
                  <Select.Option key={level} value={level}>
                    {level}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="Budget"
              label="Budget (AED)"
              rules={[{ required: false }]}
            >
              <InputNumber
                              style={{ width: '100%' }}
                              addonBefore="AED"
                              placeholder="0.00"
                              min={0}
                              precision={2}
                            />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="RedirectedFrom"
              label="Lead Source"
              rules={[{ required: true, message: 'Please select lead source' }]}
            >
              <Select placeholder="Select lead source">
                {Object.values(LeadRedirectionSource).map(source => (
                  <Select.Option key={source} value={source}>
                    {source}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            {/* Hidden field for creation date, automatically set to current date */}
            <Form.Item
              name="CreationDate"
              hidden
            >
              <DatePicker />
            </Form.Item>
            <Form.Item
              name="seller_id"
              label="Assigned To"
            >
              <Select
                placeholder="Select seller"
                allowClear
                showSearch
                optionFilterProp="children"
              >
                {sellers.map(seller => (
                  <Select.Option key={seller.id} value={seller.id}>
                    {seller.firstname} {seller.lastname}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="seller_id"
              label="Assigned Seller"
            >
              <Select
                placeholder="Select seller"
                allowClear
                showSearch
                optionFilterProp="children"
              >
                {sellers.map(seller => (
                  <Select.Option key={seller.id} value={seller.id}>
                    {seller.firstname} {seller.lastname}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default LeadForm;
