import React, { useState } from 'react';
import { Button, Dropdown, Menu, Modal, Form, Select, DatePicker, message } from 'antd';
import { 
  DownOutlined, 
  UserSwitchOutlined, 
  TagOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { ContactStatus } from 'models/ContactModel';

const { Option } = Select;
const { confirm } = Modal;

/**
 * BulkActions component for handling operations on multiple selected contacts
 */
const BulkActions = ({ 
  selectedContacts = [], 
  sellers = [], 
  onAssignSellers, 
  onUpdateStatus, 
  onDelete,
  loading = false
}) => {
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [assignForm] = Form.useForm();
  const [statusForm] = Form.useForm();

  // Disable buttons if no contacts are selected
  const disabled = selectedContacts.length === 0;

  // Handle showing the assign to seller modal
  const showAssignModal = () => {
    setAssignModalVisible(true);
    assignForm.resetFields();
  };

  // Handle showing the update status modal
  const showStatusModal = () => {
    setStatusModalVisible(true);
    statusForm.resetFields();
  };

  // Handle assigning sellers to multiple contacts
  const handleAssignSellers = () => {
    assignForm.validateFields()
      .then(values => {
        onAssignSellers(selectedContacts, values.seller_id, values.affectingDate?.toDate());
        setAssignModalVisible(false);
        assignForm.resetFields();
      })
      .catch(info => {
        console.error('Validate Failed:', info);
      });
  };

  // Handle updating status for multiple contacts
  const handleUpdateStatus = () => {
    statusForm.validateFields()
      .then(values => {
        onUpdateStatus(selectedContacts, values.status);
        setStatusModalVisible(false);
        statusForm.resetFields();
      })
      .catch(info => {
        console.error('Validate Failed:', info);
      });
  };

  // Handle bulk deletion with confirmation
  const handleDelete = () => {
    confirm({
      title: `Delete ${selectedContacts.length} contacts?`,
      icon: <ExclamationCircleOutlined />,
      content: 'This action cannot be undone.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'No',
      onOk() {
        onDelete(selectedContacts);
      },
    });
  };

  // Menu items for the dropdown
  const menu = (
    <Menu>
      <Menu.Item 
        key="assign" 
        icon={<UserSwitchOutlined />} 
        disabled={disabled} 
        onClick={showAssignModal}
      >
        Assign to Seller
      </Menu.Item>
      <Menu.Item 
        key="status" 
        icon={<TagOutlined />} 
        disabled={disabled} 
        onClick={showStatusModal}
      >
        Update Status
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item 
        key="delete" 
        danger 
        icon={<DeleteOutlined />} 
        disabled={disabled} 
        onClick={handleDelete}
      >
        Delete
      </Menu.Item>
    </Menu>
  );

  return (
    <>
      <div className="bulk-actions">
        <span style={{ marginRight: 8 }}>
          {selectedContacts.length > 0 ? 
            `${selectedContacts.length} contact${selectedContacts.length > 1 ? 's' : ''} selected` : 
            'Select contacts'
          }
        </span>
        <Dropdown overlay={menu} disabled={disabled}>
          <Button>
            Actions <DownOutlined />
          </Button>
        </Dropdown>
      </div>

      {/* Modal for assigning contacts to a seller */}
      <Modal
        title="Assign to Seller"
        visible={assignModalVisible}
        onOk={handleAssignSellers}
        onCancel={() => setAssignModalVisible(false)}
        okText="Assign"
        confirmLoading={loading}
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item
            name="seller_id"
            label="Select Seller"
            rules={[
              { required: true, message: 'Please select a seller' },
            ]}
          >
            <Select placeholder="Select a seller">
              {sellers.map(seller => (
                <Option key={seller.id} value={seller.id}>{seller.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="affectingDate"
            label="Assignment Date"
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <p>You are about to assign {selectedContacts.length} contact(s) to the selected seller.</p>
        </Form>
      </Modal>

      {/* Modal for updating contact status */}
      <Modal
        title="Update Status"
        visible={statusModalVisible}
        onOk={handleUpdateStatus}
        onCancel={() => setStatusModalVisible(false)}
        okText="Update"
        confirmLoading={loading}
      >
        <Form form={statusForm} layout="vertical">
          <Form.Item
            name="status"
            label="Select Status"
            rules={[
              { required: true, message: 'Please select a status' },
            ]}
          >
            <Select placeholder="Select a status">
              <Option value={ContactStatus.PENDING}>Pending</Option>
              <Option value={ContactStatus.CONTACTED}>Contacted</Option>
              <Option value={ContactStatus.DEAL}>Deal</Option>
              <Option value={ContactStatus.LOSS}>Loss</Option>
            </Select>
          </Form.Item>
          <p>You are about to update the status of {selectedContacts.length} contact(s).</p>
        </Form>
      </Modal>
    </>
  );
};

export default BulkActions;
