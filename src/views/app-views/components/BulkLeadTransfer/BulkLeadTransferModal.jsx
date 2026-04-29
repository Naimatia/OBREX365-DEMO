// components/BulkLeadTransferModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  Modal, Select, Button, Space, Typography, Alert, message, Radio, Spin, Table, Checkbox 
} from 'antd';
import { SwapOutlined, WarningOutlined, EyeOutlined } from '@ant-design/icons';
import LeadsService from 'services/LeadsService';
import LeadHistoryService from 'services/firebase/LeadHistoryService';
import { UserRoles } from 'models/UserModel';

const { Text } = Typography;
const { Option } = Select;

const BulkLeadTransferModal = ({
  visible,
  onCancel,
  fromSeller,
  sellers,
  companyId,
  onSuccess
}) => {
  const [toSellerId, setToSellerId] = useState(null);
  const [transferMode, setTransferMode] = useState('quick'); // 'quick' or 'advanced'
  const [transferType, setTransferType] = useState('all');   // 'all' | 'uncontacted' | 'contacted'
  const [loading, setLoading] = useState(false);
  const [countLoading, setCountLoading] = useState(false);
  const [leadCount, setLeadCount] = useState(0);
  const [leadsList, setLeadsList] = useState([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);

  const salesRoles = [
    UserRoles.SELLER, UserRoles.SALES_EXECUTIVE, UserRoles.AGENT,
    UserRoles.TEAM_LEADER, UserRoles.SALES_MANAGER,
    UserRoles.OFF_PLAN_SALES, UserRoles.READY_TO_MOVE_SALES
  ];

  const availableSellers = sellers
    ?.filter(s => s.id !== fromSeller?.id && salesRoles.includes(s.Role || s.role)) || [];

  // Fetch leads when advanced mode is selected
  useEffect(() => {
    if (!visible || !fromSeller?.id || transferMode !== 'advanced') return;

    const fetchLeads = async () => {
      setCountLoading(true);
      try {
        const leads = await LeadsService.getSellerLeadsByDateRange(companyId, fromSeller.id);
        
        const leadsWithContactStatus = await Promise.all(
          leads.map(async (lead) => {
            const hasContacted = await LeadHistoryService.hasSellerContactedLead(lead.id, fromSeller.id);
            return { ...lead, hasContacted };
          })
        );

        setLeadsList(leadsWithContactStatus);
        setSelectedLeadIds([]); // reset selection
      } catch (err) {
        console.error(err);
        message.error("Failed to load leads");
      } finally {
        setCountLoading(false);
      }
    };

    fetchLeads();
  }, [visible, fromSeller, companyId, transferMode]);

  // Count for Quick Mode
  useEffect(() => {
    if (transferMode !== 'quick' || !visible || !fromSeller?.id) return;

    const fetchCount = async () => {
      setCountLoading(true);
      try {
        const leads = await LeadsService.getSellerLeadsByDateRange(companyId, fromSeller.id);
        let count = leads.length;

        if (transferType !== 'all') {
          const checks = await Promise.all(
            leads.map(lead => LeadHistoryService.hasSellerContactedLead(lead.id, fromSeller.id))
          );
          count = transferType === 'uncontacted' 
            ? checks.filter(c => !c).length 
            : checks.filter(c => c).length;
        }
        setLeadCount(count);
      } catch (err) {
        setLeadCount(0);
      } finally {
        setCountLoading(false);
      }
    };

    fetchCount();
  }, [visible, fromSeller, companyId, transferType, transferMode]);

  const handleTransfer = async () => {
    if (!toSellerId) {
      message.warning('Please select a target seller');
      return;
    }

    setLoading(true);
    try {
      const targetSeller = sellers.find(s => s.id === toSellerId);
      let leadIdsToTransfer = [];

      if (transferMode === 'quick') {
        // Quick mode uses the service logic
        const transferredCount = await LeadsService.bulkTransferLeads({
          fromSellerId: fromSeller.id,
          toSellerId,
          companyId,
          transferType,
        });
        message.success(`Successfully transferred ${transferredCount} leads`);
      } else {
        // Advanced mode - transfer only selected leads
        if (selectedLeadIds.length === 0) {
          message.warning('Please select at least one lead');
          setLoading(false);
          return;
        }
        leadIdsToTransfer = selectedLeadIds;
        await LeadsService.bulkTransferSpecificLeads(leadIdsToTransfer, toSellerId);
        message.success(`Successfully transferred ${selectedLeadIds.length} selected leads`);
      }

      onSuccess?.();
      onCancel();
    } catch (error) {
      console.error(error);
      message.error('Failed to transfer leads');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Lead Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Phone',
      dataIndex: 'phoneNumber',
      key: 'phone',
    },
    {
      title: 'Status',
      dataIndex: 'hasContacted',
      key: 'status',
      render: (hasContacted) => (
        <span style={{ color: hasContacted ? '#52c41a' : '#faad14' }}>
          {hasContacted ? 'Contacted' : 'Not Contacted'}
        </span>
      )
    }
  ];

  return (
    <Modal
      title={<Space><SwapOutlined style={{ color: '#fa8c16' }} /> Bulk Lead Transfer</Space>}
      open={visible}
      onCancel={onCancel}
      width={transferMode === 'advanced' ? 900 : 620}
      centered
      footer={[
        <Button key="cancel" onClick={onCancel}>Cancel</Button>,
        <Button
          key="transfer"
          type="primary"
          icon={<SwapOutlined />}
          loading={loading}
          onClick={handleTransfer}
          disabled={!toSellerId || (transferMode === 'quick' && leadCount === 0) || (transferMode === 'advanced' && selectedLeadIds.length === 0)}
        >
          Transfer {transferMode === 'advanced' ? selectedLeadIds.length : leadCount} Leads
        </Button>
      ]}
    >
      <Alert message={`From: ${fromSeller?.firstname} ${fromSeller?.lastname}`} type="info" showIcon style={{ marginBottom: 20 }} />

      {/* Mode Selection */}
      <div style={{ marginBottom: 20 }}>
        <Text strong>Transfer Mode:</Text>
        <Radio.Group value={transferMode} onChange={e => setTransferMode(e.target.value)} style={{ marginTop: 8 }}>
          <Radio value="quick">Quick Transfer</Radio>
          <Radio value="advanced">Advanced (Select Specific Leads)</Radio>
        </Radio.Group>
      </div>

      {/* Quick Mode */}
      {transferMode === 'quick' && (
        <>
          <div style={{ marginBottom: 20 }}>
            <Text strong>What to transfer?</Text>
            <Radio.Group value={transferType} onChange={e => setTransferType(e.target.value)} style={{ marginTop: 8 }}>
              <Space direction="vertical">
                <Radio value="all">All Leads</Radio>
                <Radio value="uncontacted">Only Never Contacted</Radio>
                <Radio value="contacted">Only Contacted Leads</Radio>
              </Space>
            </Radio.Group>
          </div>

          <div style={{ padding: 16, background: '#f8f9fa', borderRadius: 8, textAlign: 'center' }}>
            {countLoading ? <Spin /> : <Text strong>Leads to transfer: <span style={{color:'#1890ff', fontSize:18}}>{leadCount}</span></Text>}
          </div>
        </>
      )}

      {/* Advanced Mode */}
      {transferMode === 'advanced' && (
        <>
          <div style={{ marginBottom: 16 }}>
            <Text strong>Select specific leads to transfer:</Text>
          </div>
          
          {countLoading ? (
            <Spin tip="Loading leads..." />
          ) : (
            <Table
              rowSelection={{
                selectedRowKeys: selectedLeadIds,
                onChange: setSelectedLeadIds,
              }}
              columns={columns}
              dataSource={leadsList}
              rowKey="id"
              pagination={false}
              scroll={{ y: 400 }}
              size="small"
            />
          )}
        </>
      )}

      {/* Target Seller - Always shown */}
      <div style={{ marginTop: 24, marginBottom: 16 }}>
        <Text strong>Transfer to:</Text>
        <Select
          placeholder="Select target sales member"
          style={{ width: '100%', marginTop: 8 }}
          value={toSellerId}
          onChange={setToSellerId}
          size="large"
          showSearch
        >
          {availableSellers.map(seller => (
            <Option key={seller.id} value={seller.id}>
              {seller.firstname} {seller.lastname} — {seller.Role}
            </Option>
          ))}
        </Select>
      </div>
    </Modal>
  );
};

export default BulkLeadTransferModal;