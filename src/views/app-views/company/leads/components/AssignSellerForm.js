import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, Typography, Avatar, Space, Checkbox, Alert, Row, Col, Divider } from 'antd';
import { UserOutlined, TeamOutlined, WhatsAppOutlined, BellOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

/**
 * Assign seller to one lead or multiple leads (bulk).
 *
 * Props:
 *  visible        – boolean
 *  onCancel       – () => void
 *  onSubmit       – (leadId | leadIds[], sellerId, whatsappEnabled?) => void
 *  confirmLoading – boolean
 *  lead           – single lead object (when not bulk)
 *  leadIds        – string[] (when bulk = true)
 *  bulk           – boolean
 *  sellers        – { id, name, phoneNumber, email?, role? }[]
 */
const AssignSellerForm = ({
  visible,
  onCancel,
  onSubmit,
  confirmLoading,
  lead,
  leadIds = [],
  bulk = false,
  sellers = [],
}) => {
  const [form] = Form.useForm();
  const [whatsappEnabled, setWhatsappEnabled] = useState(false); // Default to false
  const [selectedSeller, setSelectedSeller] = useState(null);

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setWhatsappEnabled(false); // Reset to false when modal opens
      setSelectedSeller(null);
      if (!bulk && lead) {
        form.setFieldsValue({ seller_id: lead.seller_id || undefined });
        // If there's an existing seller, set it as selected
        if (lead.seller_id) {
          const existingSeller = sellers.find(s => s.id === lead.seller_id);
          setSelectedSeller(existingSeller || null);
        }
      }
    }
  }, [visible, lead, bulk, form, sellers]);

  const handleSellerChange = (sellerId) => {
    const seller = sellers.find(s => s.id === sellerId);
    setSelectedSeller(seller);
    // Reset WhatsApp toggle when seller changes
    setWhatsappEnabled(false);
  };

  const handleSubmit = () => {
    form.validateFields().then(({ seller_id }) => {
      if (bulk) {
        onSubmit(leadIds, seller_id, whatsappEnabled);
      } else {
        onSubmit(lead.id, seller_id, whatsappEnabled);
      }
    });
  };

  const title = bulk
    ? `Assign Seller to ${leadIds.length} Lead${leadIds.length > 1 ? 's' : ''}`
    : `Assign Seller — ${lead?.name || 'Lead'}`;

  // Check if selected seller has phone number
  const hasPhoneNumber = selectedSeller?.phoneNumber && selectedSeller.phoneNumber.trim() !== '';

  // Seller card component for better visual representation
  const SellerOption = ({ seller }) => (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      width: '100%',
      padding: '4px 0'
    }}>
      <Space size={12}>
        <Avatar 
          size={40} 
          style={{ 
            background: `linear-gradient(135deg, ${selectedSeller?.id === seller.id ? '#667eea' : '#764ba2'}, ${selectedSeller?.id === seller.id ? '#764ba2' : '#667eea'})`,
            boxShadow: selectedSeller?.id === seller.id ? '0 2px 8px rgba(102, 126, 234, 0.3)' : 'none'
          }}
        >
          {(seller.name || 'S')[0].toUpperCase()}
        </Avatar>
        <div>
          <div style={{ fontWeight: 500, fontSize: 14 }}>{seller.name}</div>
          <Space size={8} style={{ marginTop: 2 }}>
            {seller.role && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {seller.role}
              </Text>
            )}
            {seller.phoneNumber && (
              <>
                <Divider type="vertical" style={{ margin: 0 }} />
                <Space size={4}>
                  <PhoneOutlined style={{ fontSize: 10, color: '#52c41a' }} />
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {seller.phoneNumber}
                  </Text>
                </Space>
              </>
            )}
          </Space>
        </div>
      </Space>
    </div>
  );

  return (
    <Modal
      title={
        <Space size={12} style={{ fontSize: 16 }}>
          {bulk ? 
            <TeamOutlined style={{ fontSize: 20, color: '#722ed1' }} /> : 
            <UserOutlined style={{ fontSize: 20, color: '#1677ff' }} />
          }
          <span style={{ fontWeight: 600 }}>{title}</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={confirmLoading}
      okText="Assign Lead"
      cancelText="Cancel"
      width={560}
      centered
      getContainer={false}
      styles={{ 
        body: { paddingTop: 20, paddingBottom: 8 },
        header: { paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }
      }}
    >
      <Form 
        form={form} 
        layout="vertical"
        requiredMark={false}
      >
        {/* Bulk Assignment Info */}
        {bulk && (
          <Alert
            message={
              <Space>
                <TeamOutlined style={{ fontSize: 16 }} />
                <span style={{ fontWeight: 500 }}>
                  Bulk Assignment: {leadIds.length} lead{leadIds.length > 1 ? 's' : ''}
                </span>
              </Space>
            }
            description={`You are about to assign ${leadIds.length} lead${leadIds.length > 1 ? 's' : ''} to a seller. This action can be changed later.`}
            type="info"
            showIcon={false}
            style={{ marginBottom: 24, borderRadius: 10, background: '#e6f7ff', borderColor: '#91d5ff' }}
          />
        )}

        {/* Seller Selection - FIXED DROPDOWN ISSUE */}
        <Form.Item
          label={
            <span style={{ fontWeight: 500, fontSize: 14 }}>
              Select Seller
            </span>
          }
          name="seller_id"
          rules={[{ required: true, message: 'Please select a seller to assign' }]}
        >
          <Select
            placeholder={
              <Space>
                <UserOutlined />
                <span>Search for a seller...</span>
              </Space>
            }
            showSearch
            optionFilterProp="label"
            allowClear
            size="large"
            style={{ width: '100%' }}
            listHeight={280}
            optionLabelProp="label"
            onChange={handleSellerChange}
            suffixIcon={<TeamOutlined style={{ color: '#8c8c8c' }} />}
            dropdownMatchSelectWidth={false}
            dropdownStyle={{ 
              minWidth: 520,
              maxWidth: 560,
              zIndex: 1070
            }}
            getPopupContainer={(triggerNode) => triggerNode.parentNode}
          >
            {sellers.map(seller => (
              <Select.Option
                key={seller.id}
                value={seller.id}
                label={seller.name}
              >
                <SellerOption seller={seller} />
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Selected Seller Details */}
        {selectedSeller && (
          <div style={{ 
            marginBottom: 24, 
            padding: 16, 
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            borderRadius: 12,
            border: '1px solid #e8e8e8'
          }}>
            <Row gutter={[12, 12]}>
              <Col span={24}>
                <Space size={12} align="start">
                  <Avatar 
                    size={48} 
                    style={{ 
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                  >
                    {(selectedSeller.name || 'S')[0].toUpperCase()}
                  </Avatar>
                  <div>
                    <Title level={5} style={{ margin: 0, marginBottom: 4 }}>
                      {selectedSeller.name}
                    </Title>
                    <Space size={12} wrap>
                      {selectedSeller.role && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <UserOutlined /> {selectedSeller.role}
                        </Text>
                      )}
                      {selectedSeller.phoneNumber && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <PhoneOutlined /> {selectedSeller.phoneNumber}
                        </Text>
                      )}
                      {selectedSeller.email && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <MailOutlined /> {selectedSeller.email}
                        </Text>
                      )}
                    </Space>
                  </div>
                </Space>
              </Col>
            </Row>
          </div>
        )}

        {/* WhatsApp Notification Toggle - Only show when seller is selected */}
        {selectedSeller && (
          <>
            <Divider style={{ margin: '16px 0' }} />
            <Form.Item label="Notification Settings">
              <div style={{ 
                background: '#fafafa', 
                padding: '16px', 
                borderRadius: 12,
                border: '1px solid #f0f0f0'
              }}>
                <Checkbox
                  checked={whatsappEnabled}
                  onChange={(e) => setWhatsappEnabled(e.target.checked)}
                  disabled={!hasPhoneNumber}
                >
                  <Space size={8}>
                    <WhatsAppOutlined style={{ color: '#25D366', fontSize: 18 }} />
                    <span style={{ fontWeight: 500 }}>Send WhatsApp notification</span>
                  </Space>
                </Checkbox>
                
                {!hasPhoneNumber && selectedSeller && (
                  <div style={{ marginTop: 12, padding: 8, background: '#fff7e6', borderRadius: 8 }}>
                    <Text type="warning" style={{ fontSize: 12 }}>
                      ⚠️ This seller doesn't have a phone number configured. Please add a phone number to enable WhatsApp notifications.
                    </Text>
                  </div>
                )}
                
                {whatsappEnabled && hasPhoneNumber && (
                  <div style={{ marginTop: 12, padding: 8, background: '#f6ffed', borderRadius: 8 }}>
                    <Space size={8}>
                      <BellOutlined style={{ color: '#52c41a' }} />
                      <Text style={{ fontSize: 12, color: '#52c41a' }}>
                        The seller will receive a WhatsApp message with lead assignment details immediately.
                      </Text>
                    </Space>
                  </div>
                )}
                
                {!whatsappEnabled && hasPhoneNumber && (
                  <div style={{ marginTop: 12, padding: 8, background: '#f5f5f5', borderRadius: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      No WhatsApp notification will be sent. The seller will see the assignment when they log into the CRM.
                    </Text>
                  </div>
                )}
              </div>
            </Form.Item>
          </>
        )}

        {/* Info Text */}
        <div style={{ marginTop: 16, padding: '8px 0' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {bulk 
              ? `The selected seller will be responsible for all ${leadIds.length} leads and will receive notifications based on your settings.`
              : "The assigned seller will be responsible for this lead and will receive notifications based on your settings."
            }
          </Text>
        </div>
      </Form>
    </Modal>
  );
};

export default AssignSellerForm;