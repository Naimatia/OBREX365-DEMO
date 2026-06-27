// LeadDetailsPro.js - Fixed version with proper user name fetching

import React, { useState, useEffect } from 'react';
import {
  Drawer, Button, Typography, Tag, Space, Divider, Form, Input, Avatar, Card, Tooltip, message, Row, Col, Timeline, Modal,
  Select, InputNumber
} from 'antd';
import {
  EditOutlined, PhoneOutlined, MailOutlined, GlobalOutlined,
  CalendarOutlined, UserOutlined, DollarOutlined, TagOutlined,
  MessageOutlined, CopyOutlined, CheckOutlined, InfoCircleOutlined,
  WhatsAppOutlined, PhoneFilled, HistoryOutlined,
  EyeOutlined, LockOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { LeadStatus, LeadInterestLevel } from 'models/LeadModel';
import { UserRoles } from 'models/UserModel';
import UserService from 'services/firebase/UserService';
import LeadHistoryService from 'services/firebase/LeadHistoryService';
import { db, collection, getDocs, query, where, doc, getDoc } from 'configs/FirebaseConfig';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// Professional Templates
const WHATSAPP_TEMPLATES = {
  intro: `Hi {{name}},

I'm {{seller}} from {{company}} – your dedicated property advisor.

You recently showed interest in a {{budget}} AED property in Dubai.

Are you free for a quick 5-min call to discuss your needs?

Looking forward!
{{seller}}`,

  follow_up: `Hi {{name}},

Just checking in – still looking for a {{budget}} AED property in Dubai?

We have new listings matching your criteria.

Best,
{{seller}}`,

  offer: `Hi {{name}}! Great news!

We found a **perfect match** for you:

AED {{budget}} | Dubai

View details: [Insert Property Link]

{{seller}} | {{company}}`
};

const EMAIL_TEMPLATES = {
  intro: `Dear {{name}},

Thank you for your interest in properties with us.

I'm {{seller}}, your dedicated real estate advisor at {{company}}.

I noticed you're looking for a property around **AED {{budget}}** in **Dubai**.

I'd love to understand your needs better. Could we schedule a quick call?

You can reach me directly at:
Phone: {{sellerPhone}}
Email: {{sellerEmail}}

Looking forward to helping you find your dream home.

Best regards,
{{seller}}
Real Estate Advisor
{{company}}
{{sellerPhone}} | {{sellerEmail}}`,

  offer: `Hi {{name}},

We have an **exclusive property match** for you:

**Price:** AED {{budget}}
**Location:** Dubai
**Type:** [Villa/Apartment/Penthouse]

[View Full Details]

This unit won't last long. Reply to this email or call me at {{sellerPhone}} to book a viewing.

Best,
{{seller}}
{{sellerPhone}} | {{sellerEmail}}`
};

const LeadDetailsPro = ({ 
  visible, 
  onClose, 
  lead, 
  onEdit, 
  onStatusChange,
  isHR = false,
  userRole
}) => {
  const [sellerInfo, setSellerInfo] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [history, setHistory] = useState([]);
  const [createdByUser, setCreatedByUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [noteForm] = Form.useForm();
  const [whatsappForm] = Form.useForm();
  const [emailForm] = Form.useForm();
  const [callForm] = Form.useForm();

  const [copied, setCopied] = useState({});
  const [whatsappVisible, setWhatsappVisible] = useState(false);
  const [emailVisible, setEmailVisible] = useState(false);
  const [callVisible, setCallVisible] = useState(false);

  const currentUser = useSelector(state => state.auth.user);

  // Fetch all users from the company (for HR view)
  useEffect(() => {
    const fetchAllUsers = async () => {
      if (!lead?.company_id) return;
      
      try {
        const usersQuery = query(
          collection(db, 'users'),
          where('company_id', '==', lead.company_id)
        );
        const usersSnap = await getDocs(usersQuery);
        const usersList = usersSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            name: `${data.firstname || ''} ${data.lastname || ''}`.trim() || data.email || 'Unknown',
            role: data.Role || data.role || 'User'
          };
        });
        setAllUsers(usersList);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    if (visible && lead) {
      fetchAllUsers();
    }
  }, [visible, lead]);

  // Load seller + company
  useEffect(() => {
    if (visible && lead) {
      // Load assigned seller
      if (lead.seller_id) {
        UserService.getUserById(lead.seller_id).then(setSellerInfo);
      }

      // Load company from lead.company_id
      if (lead.company_id) {
        LeadHistoryService.getCompanyData(lead.company_id).then(setCompanyInfo);
      }

      // Load created by user
      if (lead.createdBy) {
        fetchCreatedByUser(lead.createdBy);
      }
    }
  }, [visible, lead]);

  // Fetch created by user
  const fetchCreatedByUser = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setCreatedByUser({
          id: userId,
          ...data,
          name: `${data.firstname || ''} ${data.lastname || ''}`.trim() || data.email || 'Unknown'
        });
      } else {
        setCreatedByUser(null);
      }
    } catch (error) {
      console.error('Error fetching created by user:', error);
      setCreatedByUser(null);
    }
  };

  // Load history
  useEffect(() => {
    if (visible && lead?.id) {
      const unsubscribe = LeadHistoryService.listenToHistory(lead.id, lead.seller_id, setHistory);
      return () => unsubscribe();
    }
  }, [visible, lead?.id]);

  // Copy to clipboard
  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied({ ...copied, [key]: true });
    setTimeout(() => setCopied({ ...copied, [key]: false }), 2000);
    message.success('Copied!');
  };

  // Add note
  const handleAddNote = () => {
    noteForm.validateFields().then(async ({ note }) => {
      await LeadHistoryService.addHistory(lead.id, {
        type: 'note',
        message: note,
        sellerId: currentUser.id,
        createdBy: { id: currentUser.id, name: `${currentUser.firstname} ${currentUser.lastname}` }
      });
      noteForm.resetFields();
      message.success('Note added');
    });
  };

  // Send WhatsApp
  const sendWhatsApp = async (values) => {
    const seller = sellerInfo || currentUser;
    const sellerName = `${seller.firstname} ${seller.lastname}`;
    const sellerPhone = (seller.phone || '').replace(/[^\d]/g, '') || '1234567890';
    const companyName = companyInfo?.name || '[Your Company]';

    const message = WHATSAPP_TEMPLATES[values.template]
      .replace(/{{name}}/g, lead.name)
      .replace(/{{seller}}/g, sellerName)
      .replace(/{{budget}}/g, lead.Budget ? `AED ${lead.Budget.toLocaleString()}` : 'your budget')
      .replace(/Dubai/g, lead.region || 'your area')
      .replace(/{{company}}/g, companyName);

    const url = `https://wa.me/${lead.phoneNumber.replace(/[^\d]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    const historyName = sellerInfo
      ? await LeadHistoryService.getSellerName(lead.seller_id)
      : `${currentUser.firstname} ${currentUser.lastname}`;

    await LeadHistoryService.addHistory(lead.id, {
      type: 'whatsapp',
      message,
      templateId: values.template,
      sellerId: currentUser.id,
      createdBy: { id: currentUser.id, name: historyName }
    });

    setWhatsappVisible(false);
    message.success('WhatsApp opened & logged');
  };

  // Send Email
  const sendEmail = async (values) => {
    const seller = sellerInfo || currentUser;
    const sellerName = `${seller.firstname} ${seller.lastname}`;
    const sellerEmail = seller.email || '';
    const sellerPhone = seller.phoneNumber || '';
    const companyName = companyInfo?.name || '';

    const body = EMAIL_TEMPLATES[values.template]
      .replace(/{{name}}/g, lead.name)
      .replace(/{{seller}}/g, sellerName)
      .replace(/{{budget}}/g, lead.Budget ? `AED ${lead.Budget.toLocaleString()}` : '')
      .replace(/Dubai/g, lead.region || '')
      .replace(/{{sellerEmail}}/g, sellerEmail)
      .replace(/{{sellerPhone}}/g, sellerPhone)
      .replace(/{{company}}/g, companyName);

    const subject = values.template === 'intro'
      ? 'Your Property Inquiry – Lets Find Your Dream Home'
      : 'Exclusive Property Match Just for You';

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(lead.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const newWindow = window.open(gmailUrl, '_blank');

    const historyName = sellerInfo
      ? await LeadHistoryService.getSellerName(lead.seller_id)
      : `${currentUser.firstname} ${currentUser.lastname}`;

    await LeadHistoryService.addHistory(lead.id, {
      type: 'email',
      message: body,
      templateId: values.template,
      sellerId: currentUser.id,
      createdBy: { id: currentUser.id, name: historyName }
    });

    setEmailVisible(false);
    if (newWindow) {
      message.success('Gmail opened – click Send to deliver!');
    } else {
      message.warning('Please allow pop-ups for Gmail');
    }
  };

  // Log Call
  const logCall = async (values) => {
    const historyName = sellerInfo
      ? await LeadHistoryService.getSellerName(lead.seller_id)
      : `${currentUser.firstname} ${currentUser.lastname}`;

    await LeadHistoryService.addHistory(lead.id, {
      type: 'call',
      duration: values.duration,
      outcome: values.outcome,
      sellerId: currentUser.id,
      createdBy: { id: currentUser.id, name: historyName }
    });
    callForm.resetFields();
    setCallVisible(false);
    message.success('Call logged');
  };

  // Status Change
  const handleStatusChange = async (newStatus) => {
    await onStatusChange(lead.id, newStatus);
    const historyName = sellerInfo
      ? await LeadHistoryService.getSellerName(lead.seller_id)
      : `${currentUser.firstname} ${currentUser.lastname}`;

    await LeadHistoryService.addHistory(lead.id, {
      type: 'status',
      message: `Status changed to ${newStatus}`,
      sellerId: currentUser.id,
      createdBy: { id: currentUser.id, name: historyName }
    });
  };

  // Helper function to get user name from allUsers list
  const getUserNameFromList = (userId) => {
    if (!userId) return 'Unknown';
    const user = allUsers.find(u => u.id === userId);
    return user ? user.name : userId;
  };

  if (!lead) return null;

  // ─── HR VIEW ──────────────────────────────────────────────────────────────
  if (isHR || userRole === UserRoles.HR) {
    // Get the created by name
    const createdByName = createdByUser?.name || getUserNameFromList(lead.createdBy) || lead.createdBy || 'Unknown';
    const assignedName = sellerInfo ? `${sellerInfo.firstname} ${sellerInfo.lastname}` : 'Unassigned';

    return (
      <Drawer
        title={
          <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
            <Title level={4} style={{ margin: 0 }}>
              <LockOutlined style={{ color: '#faad14', marginRight: 8 }} />
              {lead.name} - History
            </Title>
            <Tag color="orange">Read-Only</Tag>
          </Space>
        }
        width={720}
        placement="right"
        onClose={onClose}
        open={visible}
      >
        <div style={{ padding: '0 8px' }}>
          {/* Basic Lead Info - Read-only */}
          <Card 
            title={
              <Space>
                <InfoCircleOutlined />
                Lead Information
                <Tag color="blue">Read-Only</Tag>
              </Space>
            } 
            style={{ marginBottom: 16 }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Text type="secondary">Name</Text><br />
                <Text strong>{lead.name}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">Region</Text><br />
                <Text strong>{lead.region || '—'}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">Assigned To</Text><br />
                <Text strong>{assignedName}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">Created By</Text><br />
                <Text strong>{createdByName}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">Created Date</Text><br />
                <Text strong>
                  {dayjs(lead.CreationDate?.toDate?.() || lead.CreationDate).format('MMM DD, YYYY HH:mm')}
                </Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">Lead Source</Text><br />
                <Tag color={lead?.RedirectedFrom === 'Instagram' ? 'magenta' : 'blue'}>
                  {lead?.RedirectedFrom || 'Facebook'}
                </Tag>
              </Col>
            </Row>
          </Card>

          {/* History Timeline */}
          <Card 
            title={
              <Space>
                <HistoryOutlined />
                Activity History
                <Tag color="green">{history.length} events</Tag>
              </Space>
            }
            style={{ marginTop: 16 }}
          >
            {history.length > 0 ? (
              <Timeline>
                {history.map((h, i) => (
                  <Timeline.Item
                    key={i}
                    color={
                      h.type === 'whatsapp' ? '#25D366' :
                      h.type === 'email' ? '#1890ff' :
                      h.type === 'call' ? '#722ed1' :
                      h.type === 'status' ? '#1890ff' :
                      h.type === 'note' ? '#8c8c8c' : 'gray'
                    }
                    dot={
                      h.type === 'whatsapp' ? <WhatsAppOutlined style={{ fontSize: 16 }} /> :
                      h.type === 'email' ? <MailOutlined style={{ fontSize: 16 }} /> :
                      h.type === 'call' ? <PhoneFilled style={{ fontSize: 16 }} /> :
                      h.type === 'status' ? <TagOutlined style={{ fontSize: 16 }} /> :
                      h.type === 'note' ? <MessageOutlined style={{ fontSize: 16 }} /> : null
                    }
                  >
                    <div>
                      <Text strong>{h.createdBy?.name || 'Unknown'}</Text>
                      <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                        {dayjs(h.createdAt).format('MMM DD, HH:mm')}
                      </Text>
                    </div>

                    <div style={{ 
                      marginTop: 8, 
                      padding: '8px 12px', 
                      background: '#fafafa', 
                      borderRadius: 6, 
                      border: '1px solid #f0f0f0', 
                      whiteSpace: 'pre-wrap' 
                    }}>
                      {h.type === 'status' && (
                        <Tag color="blue">Status → {h.message.split('to ')[1]}</Tag>
                      )}
                      {h.type === 'note' && <Text>{h.message}</Text>}
                      {h.type === 'call' && (
                        <Text>
                          <PhoneFilled /> Call ({h.duration}Min) – <Tag color={h.outcome === 'answered' ? 'green' : 'red'}>{h.outcome}</Tag>
                        </Text>
                      )}
                      {h.type === 'whatsapp' && (
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>WhatsApp Message:</Text><br />
                          <Text style={{ fontSize: 14, color: '#25D366', fontWeight: 500, whiteSpace: 'pre-line' }}>{h.message}</Text>
                        </div>
                      )}
                      {h.type === 'email' && (
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>Email Sent:</Text><br />
                          <Text style={{ fontSize: 14, color: '#1890ff', fontWeight: 500, whiteSpace: 'pre-line' }}>{h.message}</Text>
                        </div>
                      )}
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            ) : (
              <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '40px 0' }}>
                No activity history available
              </Text>
            )}
          </Card>

          {/* HR Restriction Notice */}
          <div style={{ 
            marginTop: 16, 
            padding: '12px 16px', 
            background: '#fffbe6', 
            borderRadius: 8,
            border: '1px solid #ffe58f'
          }}>
            <Space>
              <LockOutlined style={{ color: '#faad14' }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                HR View - You can only view lead information and history. Contact details and other sensitive information are restricted.
              </Text>
            </Space>
          </div>
        </div>
      </Drawer>
    );
  }

  // ─── FULL VIEW (Non-HR) ──────────────────────────────────────────────────
  const statusColors = { 
    [LeadStatus.NEW]: 'blue', 
    [LeadStatus.CONTACTED]: 'orange', 
    [LeadStatus.INTERESTED]: 'green', 
    [LeadStatus.NOT_INTERESTED]: 'red', 
    [LeadStatus.CONVERTED]: 'purple', 
    [LeadStatus.JUNK_LEAD]: 'gray' 
  };
  
  const interestColors = { 
    [LeadInterestLevel.LOW]: 'orange', 
    [LeadInterestLevel.MEDIUM]: 'blue', 
    [LeadInterestLevel.HIGH]: 'green' 
  };

  return (
    <Drawer
      title={
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Title level={4} style={{ margin: 0 }}>
            {lead.name}
          </Title>
          <Button type="primary" icon={<EditOutlined />} onClick={() => onEdit(lead)}>
            Edit
          </Button>
        </Space>
      }
      width={720}
      placement="right"
      onClose={onClose}
      open={visible}
    >
      <div style={{ padding: '0 8px' }}>
        {/* Contact Card */}
        <Card title={<><InfoCircleOutlined /> Contact</>} style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Text type="secondary"><GlobalOutlined /> Region</Text><br />
              <Text strong>{lead.region || '—'}</Text>
            </Col>
            <Col span={12}>
              <Text type="secondary"><MailOutlined /> Email</Text><br />
              <Space>
                <a href={`mailto:${lead.email}`}>{lead.email}</a>
                <Button size="small" icon={copied.email ? <CheckOutlined style={{ color: 'green' }} /> : <CopyOutlined />}
                  onClick={() => copyToClipboard(lead.email, 'email')} />
              </Space>
            </Col>
            <Col span={12}>
              <Text type="secondary"><PhoneOutlined /> Phone</Text><br />
              <Space>
                <a href={`tel:${lead.phoneNumber}`}>{lead.phoneNumber}</a>
                <Button size="small" icon={copied.phone ? <CheckOutlined style={{ color: 'green' }} /> : <CopyOutlined />}
                  onClick={() => copyToClipboard(lead.phoneNumber, 'phone')} />
                <Button type="primary" size="small" icon={<WhatsAppOutlined />} onClick={() => setWhatsappVisible(true)} />
                <Button icon={<PhoneFilled />} size="small" onClick={() => setCallVisible(true)} />
              </Space>
            </Col>
            <Col span={12}>
              <Text type="secondary">Status</Text><br />
              <Tag color={statusColors[lead.status] || 'blue'}>{lead.status || 'New'}</Tag>
            </Col>
            <Col span={12}>
              <Text type="secondary">Created Date</Text><br />
              <Text strong>{dayjs(lead.CreationDate?.toDate?.() || lead.CreationDate).format('MMM DD, YYYY HH:mm')}</Text>
            </Col>
            <Col span={12}>
              <Text type="secondary">Assigned Date</Text><br />
              <Text strong>{lead.assignedAt ? dayjs(lead.assignedAt?.toDate?.() || lead.assignedAt).format('MMM DD, YYYY HH:mm') : 'Not assigned'}</Text>
            </Col>
          </Row>
        </Card>

        {/* Lead Info */}
        <Row gutter={16}>
          <Col span={12}>
            <Card title="Budget">
              <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                {lead.Budget ? `AED ${lead.Budget.toLocaleString()}` : '—'}
              </Text>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Interest">
              <Tag color={interestColors[lead.InterestLevel]}>{lead.InterestLevel}</Tag>
            </Card>
          </Col>
        </Row>

        {/* Meta Lead Source */}
        <Card 
          title={
            <Space>
              <EyeOutlined style={{ color: '#1877F2' }} />
              Meta Lead Source
              <Tag 
                color={lead?.RedirectedFrom === 'Instagram' ? 'magenta' : 'blue'}
              >
                {lead?.RedirectedFrom || 'Facebook'}
              </Tag>
            </Space>
          } 
          style={{ marginBottom: 16, marginTop: 16 }}
        >
          <Row gutter={[16, 12]}>
            <Col span={12}>
              <Text type="secondary">Form Name</Text><br />
              <Text strong>{lead.meta_form_name || '—'}</Text>
            </Col>
            <Col span={12}>
              <Text type="secondary">Ad Name</Text><br />
              <Text strong>{lead.meta_ad_name || '—'}</Text>
            </Col>
            <Col span={12}>
              <Text type="secondary">Campaign</Text><br />
              <Text strong>{lead.meta_campaign || '—'}</Text>
            </Col>
            <Col span={12}>
              <Text type="secondary">Ad Set</Text><br />
              <Text strong>{lead.meta_adset || '—'}</Text>
            </Col>
            <Col span={12}>
              <Text type="secondary">Platform</Text><br />
              <Tag color="blue">{lead.meta_platform || 'fb'}</Tag>
            </Col>
            <Col span={24}>
              <Text type="secondary">Meta Lead ID</Text><br />
              <Text copyable strong style={{ fontFamily: 'monospace' }}>
                {lead.meta_lead_id || '—'}
              </Text>
            </Col>
          </Row>
        </Card>

        {/* Assigned Seller */}
        <Card title={<><UserOutlined /> Assigned Seller</>} style={{ margin: '16px 0' }}>
          {sellerInfo ? (
            <Space>
              <Avatar style={{ backgroundColor: '#1890ff' }}>{sellerInfo.firstname?.[0] || 'U'}</Avatar>
              <div>
                <Text strong>{sellerInfo.firstname} {sellerInfo.lastname}</Text><br />
                <Text type="secondary">{sellerInfo.email}</Text>
              </div>
            </Space>
          ) : (
            <Text type="secondary">Not assigned</Text>
          )}
        </Card>

        {/* Quick Actions */}
        <Space style={{ width: '100%', marginBottom: 16 }} wrap>
          <Button icon={<WhatsAppOutlined />} onClick={() => setWhatsappVisible(true)}>WhatsApp</Button>
          <Button icon={<MailOutlined />} onClick={() => setEmailVisible(true)}>Email</Button>
          <Button icon={<PhoneFilled />} onClick={() => setCallVisible(true)}>Log Call</Button>
        </Space>

        {/* History Timeline */}
        <Card title={<><HistoryOutlined /> Activity History</>} style={{ marginTop: 16 }}>
          {history.length > 0 ? (
            <Timeline>
              {history.map((h, i) => (
                <Timeline.Item
                  key={i}
                  color={
                    h.type === 'whatsapp' ? '#25D366' :
                    h.type === 'email' ? '#1890ff' :
                    h.type === 'call' ? '#722ed1' :
                    h.type === 'status' ? '#1890ff' :
                    h.type === 'note' ? '#8c8c8c' : 'gray'
                  }
                  dot={
                    h.type === 'whatsapp' ? <WhatsAppOutlined style={{ fontSize: 16 }} /> :
                    h.type === 'email' ? <MailOutlined style={{ fontSize: 16 }} /> :
                    h.type === 'call' ? <PhoneFilled style={{ fontSize: 16 }} /> :
                    h.type === 'status' ? <TagOutlined style={{ fontSize: 16 }} /> :
                    h.type === 'note' ? <MessageOutlined style={{ fontSize: 16 }} /> : null
                  }
                >
                  <div>
                    <Text strong>{h.createdBy?.name || 'Unknown'}</Text>
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                      {dayjs(h.createdAt).format('MMM DD, HH:mm')}
                    </Text>
                  </div>

                  <div style={{ marginTop: 8, padding: '8px 12px', background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0', whiteSpace: 'pre-wrap' }}>
                    {h.type === 'status' && (
                      <Tag color="blue">Status → {h.message.split('to ')[1]}</Tag>
                    )}
                    {h.type === 'note' && <Text>{h.message}</Text>}
                    {h.type === 'call' && (
                      <Text>
                        <PhoneFilled /> Call ({h.duration}Min) – <Tag color={h.outcome === 'answered' ? 'green' : 'red'}>{h.outcome}</Tag>
                      </Text>
                    )}
                    {h.type === 'whatsapp' && (
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>WhatsApp Message:</Text><br />
                        <Text style={{ fontSize: 14, color: '#25D366', fontWeight: 500, whiteSpace: 'pre-line' }}>{h.message}</Text>
                      </div>
                    )}
                    {h.type === 'email' && (
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>Email Sent:</Text><br />
                        <Text style={{ fontSize: 14, color: '#1890ff', fontWeight: 500, whiteSpace: 'pre-line' }}>{h.message}</Text>
                      </div>
                    )}
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          ) : (
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '20px 0' }}>
              No activity yet
            </Text>
          )}
        </Card>

        {/* Add Note */}
        <Card title="Add Note" style={{ marginTop: 16 }}>
          <Form form={noteForm} layout="vertical">
            <Form.Item name="note" rules={[{ required: true }]}>
              <TextArea rows={3} placeholder="Type your note..." />
            </Form.Item>
            <Button type="primary" onClick={handleAddNote}>Add Note</Button>
          </Form>
        </Card>
      </div>

      {/* WhatsApp Modal */}
      <Modal
        title="Send WhatsApp"
        open={whatsappVisible}
        onCancel={() => { setWhatsappVisible(false); whatsappForm.resetFields(); }}
        onOk={() => whatsappForm.submit()}
        destroyOnClose
      >
        <Form form={whatsappForm} onFinish={sendWhatsApp} layout="vertical">
          <Form.Item name="template" label="Template" initialValue="intro">
            <Select>
              <Option value="intro">Introduction</Option>
              <Option value="follow_up">Follow Up</Option>
              <Option value="offer">Property Offer</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Email Modal */}
      <Modal
        title="Send Email"
        open={emailVisible}
        onCancel={() => { setEmailVisible(false); emailForm.resetFields(); }}
        onOk={() => emailForm.submit()}
        destroyOnClose
      >
        <Form form={emailForm} onFinish={sendEmail} layout="vertical">
          <Form.Item name="template" label="Template" initialValue="intro">
            <Select>
              <Option value="intro">Introduction</Option>
              <Option value="offer">Property Match</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Call Modal */}
      <Modal
        title="Log Call"
        open={callVisible}
        onCancel={() => { setCallVisible(false); callForm.resetFields(); }}
        onOk={() => callForm.submit()}
        destroyOnClose
      >
        <Form form={callForm} onFinish={logCall} layout="vertical">
          <Form.Item name="duration" label="Duration (minutes)" initialValue={2}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="outcome" label="Outcome" initialValue="answered">
            <Select>
              <Option value="answered">Answered</Option>
              <Option value="no-answer">No Answer</Option>
              <Option value="voicemail">Voicemail</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  );
};

export default LeadDetailsPro;