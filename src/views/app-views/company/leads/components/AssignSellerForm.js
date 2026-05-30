import React, { useEffect } from 'react';
import { Modal, Form, Select, Typography, Avatar, Badge } from 'antd';
import { UserOutlined, TeamOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * Assign seller to one lead or multiple leads (bulk).
 *
 * Props:
 *  visible        – boolean
 *  onCancel       – () => void
 *  onSubmit       – (leadId | leadIds[], sellerId) => void
 *  confirmLoading – boolean
 *  lead           – single lead object (when not bulk)
 *  leadIds        – string[] (when bulk = true)
 *  bulk           – boolean  ← NEW
 *  sellers        – { id, name }[]
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

  useEffect(() => {
    if (visible) {
      form.resetFields();
      if (!bulk && lead) {
        form.setFieldsValue({ seller_id: lead.seller_id || undefined });
      }
    }
  }, [visible, lead, bulk, form]);

  const handleSubmit = () => {
    form.validateFields().then(({ seller_id }) => {
      if (bulk) {
        onSubmit(leadIds, seller_id);
      } else {
        onSubmit(lead.id, seller_id);
      }
    });
  };

  const title = bulk
    ? `Assign Seller to ${leadIds.length} Lead${leadIds.length > 1 ? 's' : ''}`
    : `Assign Seller — ${lead?.name || 'Lead'}`;

  return (
    <Modal
      title={
        <span>
          {bulk ? <TeamOutlined style={{ marginRight: 8, color: '#722ed1' }} /> : <UserOutlined style={{ marginRight: 8, color: '#1677ff' }} />}
          {title}
        </span>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={confirmLoading}
      okText="Assign"
      width={440}
      styles={{ body: { paddingTop: 16 } }}
    >
      {bulk && (
        <div
          style={{
            background: '#f0f5ff',
            border: '1px solid #adc6ff',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: 13,
            color: '#1677ff',
          }}
        >
          <TeamOutlined style={{ marginRight: 6 }} />
          <strong>{leadIds.length}</strong> lead{leadIds.length > 1 ? 's' : ''} will be assigned to the selected seller.
        </div>
      )}

      <Form form={form} layout="vertical">
        <Form.Item
          label="Select Seller"
          name="seller_id"
          rules={[{ required: true, message: 'Please select a seller' }]}
        >
          <Select
            placeholder="Search and select a seller…"
            showSearch
            optionFilterProp="label"
            allowClear
            size="large"
            style={{ width: '100%' }}
            listHeight={200}
            optionLabelProp="label"
          >
            {sellers.map(seller => (
              <Select.Option
                key={seller.id}
                value={seller.id}
                label={seller.name}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar size={24} style={{ background: '#1677ff', fontSize: 11 }}>
                    {(seller.name || 'S')[0].toUpperCase()}
                  </Avatar>
                  <span style={{ fontWeight: 500 }}>{seller.name}</span>
                </div>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Text type="secondary" style={{ fontSize: 12 }}>
          The assigned seller will be responsible for this lead and will receive notifications about updates.
        </Text>
      </Form>
    </Modal>
  );
};

export default AssignSellerForm;