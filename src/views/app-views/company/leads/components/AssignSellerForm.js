import React, { useEffect } from 'react';
import { Modal, Form, Select, Typography } from 'antd';

const { Text } = Typography;

/**
 * Component for assigning a seller to a lead
 */
const AssignSellerForm = ({ 
  visible, 
  onCancel, 
  onSubmit, 
  confirmLoading, 
  lead,
  sellers = []
}) => {
  const [form] = Form.useForm();
  
  useEffect(() => {
    if (visible) {
      form.resetFields();
      
      if (lead) {
        form.setFieldsValue({
          seller_id: lead.seller_id || undefined,
        });
      }
    }
  }, [visible, lead, form]);
  
  const handleSubmit = () => {
    form.validateFields().then(values => {
      onSubmit(lead.id, values.seller_id);
    }).catch(error => {
      console.error('Form validation failed:', error);
    });
  };

  return (
    <Modal
      title={`Assign Seller: ${lead?.name || 'Lead'}`}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={confirmLoading}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Select Seller"
          name="seller_id"
          rules={[{ required: true, message: 'Please select a seller' }]}
        >
         <Select
  placeholder="Select a seller to assign this lead"
  showSearch
  optionFilterProp="children"
  allowClear
  size="large"
  style={{ width: '100%' }}
  listHeight={150}
  dropdownStyle={{ overflow: 'auto' }}
>
  {sellers.map(seller => (
    <Select.Option key={seller.id} value={seller.id}>
      <strong>{seller.name}</strong>
    </Select.Option>
  ))}
</Select>

        </Form.Item>
        
        <Text type="secondary">
          The assigned seller will be responsible for this lead and will receive notifications about updates.
        </Text>
      </Form>
    </Modal>
  );
};

export default AssignSellerForm;