/* @ts-nocheck */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Drawer, Card, Tag, Timeline, Typography, Button, Space, Row, Col,
  Input, Modal, Form, message, Select, InputNumber, Avatar, Tooltip, Badge
} from 'antd';
import {
  UserOutlined, PhoneOutlined, MailOutlined, GlobalOutlined, EditOutlined,
  WhatsAppOutlined, PhoneFilled, HistoryOutlined, MessageOutlined,
  CopyOutlined, CheckOutlined, InfoCircleOutlined, TagOutlined, DollarOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { LeadStatus, LeadInterestLevel } from 'models/LeadModel';
import UserService from 'services/firebase/UserService';
import LeadHistoryService from 'services/firebase/LeadHistoryService';
import moment from 'moment';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

/* ────────────────────── TEMPLATES ────────────────────── */
const WHATSAPP_TEMPLATES = {
  intro: `Hi {{name}},

I'm {{seller}} from {{company}} – your dedicated property advisor.

You recently showed interest in a {{budget}} property in {{region}}.

Are you free for a quick 5-min call to discuss your needs?

Looking forward!
{{seller}}`,

  follow_up: `Hi {{name}},

Just checking in – still looking for a {{budget}}  property in {{region}}?

We have new listings matching your criteria.

Best,
{{seller}}`,

  offer: `Hi {{name}}! Great news!

We found a **perfect match** for you:

 {{budget}} | {{region}}

View details: [Insert Property Link]

{{seller}} | {{company}}`,
};

const EMAIL_TEMPLATES = {
  intro: `Dear {{name}},

Thank you for your interest in properties with us.

I'm {{seller}}, your dedicated real estate advisor at {{company}}.

I noticed you're looking for a property around ** {{budget}}** in **{{region}}**.

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

**Price:**  {{budget}}
**Location:** {{region}}
**Type:** [Villa/Apartment/Penthouse]

[View Full Details]

This unit won’t last long. Reply to this email or call me at {{sellerPhone}} to book a viewing.

Best,
{{seller}}
{{sellerPhone}} | {{sellerEmail}}`,
};

/* ────────────────────── COMPONENT ────────────────────── */
const SellerLeadDetail = ({
  visible,
  lead,
  onEdit,
  onClose,
  onStatusChange,
}) => {
  /* ────── STATE ────── */
  const [sellerInfo, setSellerInfo] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState({});
  const [whatsappVisible, setWhatsappVisible] = useState(false);
  const [emailVisible, setEmailVisible] = useState(false);
  const [callVisible, setCallVisible] = useState(false);
  const [noteVisible, setNoteVisible] = useState(false);
  const [whatsappForm] = Form.useForm();
  const [emailForm] = Form.useForm();
  const [callForm] = Form.useForm();
  const [noteForm] = Form.useForm();

  const currentUser = useSelector((state) => state.auth.user);

  /* ────── LOAD SELLER + COMPANY ────── */
  useEffect(() => {
    if (!visible || !lead) return;
    if (lead.seller_id) UserService.getUserById(lead.seller_id).then(setSellerInfo);
    if (lead.company_id) LeadHistoryService.getCompanyData(lead.company_id).then(setCompanyInfo);
  }, [visible, lead]);

  /* ────── LISTEN TO HISTORY ────── */
  useEffect(() => {
    if (!visible || !lead?.id) return;
    const unsub = LeadHistoryService.listenToHistory(lead.id,lead.seller_id, setHistory);
    return () => typeof unsub === 'function' && unsub();
  }, [visible, lead?.id]);

  /* ────── RESET FORMS ────── */
  useEffect(() => {
    if (visible && lead) {
      setCopied({});
      whatsappForm.resetFields();
      emailForm.resetFields();
      callForm.resetFields();
      noteForm.resetFields();
    }
  }, [lead?.id, visible,currentUser?.id, whatsappForm, emailForm, callForm, noteForm]);

  /* ────── HELPERS ────── */
  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(c => ({ ...c, [key]: true }));
    setTimeout(() => setCopied(c => ({ ...c, [key]: false })), 2000);
    message.success('Copied!');
  };

  const getCreatedByName = async () => {
    if (sellerInfo) return await LeadHistoryService.getSellerName(lead.seller_id);
    return `${currentUser.firstname} ${currentUser.lastname}`;
  };

  const statusColors = { [LeadStatus.PENDING]: 'orange', [LeadStatus.GAIN]: 'green', [LeadStatus.LOSS]: 'red' };
  const interestColors = { [LeadInterestLevel.HIGH]: 'red', [LeadInterestLevel.MEDIUM]: 'orange', [LeadInterestLevel.LOW]: 'blue' };

  /* ────── MARK CONTACTED (only on communication) ────── */
  const markContactedIfNeeded = async () => {
    if (!lead.contacted) {
      await LeadHistoryService.markAsContacted(lead.id);
    }
  };

  /* ────── WHATSAPP ────── */
  const sendWhatsApp = async (values) => {
    const seller = sellerInfo || currentUser;
    const sellerName = `${seller.firstname} ${seller.lastname}`;
    const sellerPhone = (seller.phone || '').replace(/[^\d]/g, '');
    const companyName = companyInfo?.name || '[Your Company]';

    const msg = WHATSAPP_TEMPLATES[values.template]
      .replace(/{{name}}/g, lead.name)
      .replace(/{{seller}}/g, sellerName)
      .replace(/{{budget}}/g, lead.Budget ? `AED ${lead.Budget.toLocaleString()}` : 'your budget')
      .replace(/{{region}}/g, lead.region || 'your area')
      .replace(/{{company}}/g, companyName);

    const url = `https://wa.me/${lead.phoneNumber.replace(/[^\d]/g, '')}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');

    const historyName = await getCreatedByName();
    await LeadHistoryService.addHistory(lead.id, {
      type: 'whatsapp',
      message: msg,
      templateId: values.template,
      sellerId: currentUser.id,               // ← important new field
      createdBy: { id: currentUser.id, name: historyName },
    });

    await markContactedIfNeeded();          // NEW
    setWhatsappVisible(false);
    message.success('WhatsApp opened & logged');
  };

  /* ────── EMAIL ────── */
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
      .replace(/{{region}}/g, lead.region || '')
      .replace(/{{sellerEmail}}/g, sellerEmail)
      .replace(/{{sellerPhone}}/g, sellerPhone)
      .replace(/{{company}}/g, companyName);

    const subject = values.template === 'intro'
      ? 'Your Property Inquiry – Let’s Find Your Dream Home'
      : 'Exclusive Property Match Just for You';

    const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(lead.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const win = window.open(gmail, '_blank');

    const historyName = await getCreatedByName();
    await LeadHistoryService.addHistory(lead.id, {
      type: 'email',
      message: body,
      templateId: values.template,
            sellerId: currentUser.id,               // ← important new field
      createdBy: { id: currentUser.id, name: historyName },
    });

    await markContactedIfNeeded();          // NEW
    setEmailVisible(false);
    win ? message.success('Gmail opened – click Send!') : message.warning('Allow pop-ups');
  };

  /* ────── CALL LOG ────── */
  const logCall = async (values) => {
    const historyName = await getCreatedByName();
    await LeadHistoryService.addHistory(lead.id, {
      type: 'call',
      duration: values.duration,
      outcome: values.outcome,
            sellerId: currentUser.id,               // ← important new field
      createdBy: { id: currentUser.id, name: historyName },
    });

    await markContactedIfNeeded();          // NEW
    callForm.resetFields();
    setCallVisible(false);
    message.success('Call logged');
  };

  /* ────── NOTE (does NOT mark contacted) ────── */
  const addNote = async () => {
    const { note } = await noteForm.validateFields();
    const historyName = await getCreatedByName();
    await LeadHistoryService.addHistory(lead.id, {
      type: 'note',
      message: note,
            sellerId: currentUser.id,               // ← important new field
      createdBy: { id: currentUser.id, name: historyName },
    });
    noteForm.resetFields();
    setNoteVisible(false);
    message.success('Note added');
  };

  /* ────── STATUS CHANGE (does NOT mark contacted) ────── */
  const handleStatusChange = async (newStatus) => {
    await onStatusChange(lead.id, newStatus);
    const historyName = await getCreatedByName();
    await LeadHistoryService.addHistory(lead.id, {
      type: 'status',
      message: `Status changed to ${newStatus}`,
            sellerId: currentUser.id,               // ← important new field
      createdBy: { id: currentUser.id, name: historyName },
    });
  };

  /* ────── TIMELINE ITEMS ────── */
  const timelineItems = useMemo(() => history.map((h, i) => {
    const color = {
      whatsapp: '#25D366',
      email: '#1890ff',
      call: '#722ed1',
      status: '#1890ff',
      note: '#8c8c8c',
    }[h.type] || 'gray';

    const dot = {
      whatsapp: <WhatsAppOutlined style={{ fontSize: 16 }} />,
      email: <MailOutlined style={{ fontSize: 16 }} />,
      call: <PhoneFilled style={{ fontSize: 16 }} />,
      status: <TagOutlined style={{ fontSize: 16 }} />,
      note: <MessageOutlined style={{ fontSize: 16 }} />,
    }[h.type];

    return (
      <Timeline.Item key={i} color={color} dot={dot}>
        <div>
          <Text strong>{h.createdBy?.name || 'Unknown'}</Text>{' '}
          <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
            {moment(h.createdAt).format('MMM DD, HH:mm')}
          </Text>
        </div>
        <div style={{
          marginTop: 8,
          padding: '8px 12px',
          background: '#fafafa',
          borderRadius: 6,
          border: '1px solid #f0f0f0',
          whiteSpace: 'pre-wrap',
        }}>
          {h.type === 'status' && <Tag color="blue">Status to {h.message.split('to ')[1]}</Tag>}
          {h.type === 'note' && <Text>{h.message}</Text>}
          {h.type === 'call' && (
            <Text>
              Call ({h.duration}s) –{' '}
              <Tag color={h.outcome === 'answered' ? 'green' : 'red'}>{h.outcome}</Tag>
            </Text>
          )}
          {h.type === 'whatsapp' && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>WhatsApp Message:</Text><br />
              <Text style={{ fontSize: 14, color: '#25D366', fontWeight: 500, whiteSpace: 'pre-line' }}>
                {h.message}
              </Text>
            </div>
          )}
          {h.type === 'email' && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Email Sent:</Text><br />
              <Text style={{ fontSize: 14, color: '#1890ff', fontWeight: 500, whiteSpace: 'pre-line' }}>
                {h.message}
              </Text>
            </div>
          )}
        </div>
      </Timeline.Item>
    );
  }), [history]);

  if (!lead) return null;

  return (
    <Drawer
      title={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space align="center">
            <Title level={4} style={{ margin: 0 }}>{lead.name}</Title>

            {/* NEW: Contacted badge */}
            {lead.contacted && (
              <Badge status="success" text={<Text type="success" strong>Contacted</Text>} />
            )}

            <Select
              value={lead.Status}
              onChange={handleStatusChange}
              size="small"
              style={{ width: 120 }}
            >
              {Object.values(LeadStatus).map(s => (
                <Option key={s} value={s}>
                  <Tag color={statusColors[s]}>{s}</Tag>
                </Option>
              ))}
            </Select>
          </Space>

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
        {/* ────── CONTACT CARD ────── */}
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
                <Button
                  size="small"
                  icon={copied.email ? <CheckOutlined style={{ color: 'green' }} /> : <CopyOutlined />}
                  onClick={() => copyToClipboard(lead.email, 'email')}
                />
              </Space>
            </Col>
            <Col span={12}>
              <Text type="secondary"><PhoneOutlined /> Phone</Text><br />
              <Space>
                <a href={`tel:${lead.phoneNumber}`}>{lead.phoneNumber}</a>
                <Button
                  size="small"
                  icon={copied.phone ? <CheckOutlined style={{ color: 'green' }} /> : <CopyOutlined />}
                  onClick={() => copyToClipboard(lead.phoneNumber, 'phone')}
                />
                <Button type="primary" size="small" icon={<WhatsAppOutlined />} onClick={() => setWhatsappVisible(true)} />
                <Button icon={<PhoneFilled />} size="small" onClick={() => setCallVisible(true)} />
              </Space>
            </Col>
          </Row>
        </Card>

        {/* ────── BUDGET & INTEREST ────── */}
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

        {/* ────── ASSIGNED SELLER ────── */}
        <Card title={<><UserOutlined /> Assigned Seller</>} style={{ margin: '16px 0' }}>
          {sellerInfo ? (
            <Space>
              <Avatar style={{ backgroundColor: '#1890ff' }}>{sellerInfo.firstname[0]}</Avatar>
              <div>
                <Text strong>{sellerInfo.firstname} {sellerInfo.lastname}</Text><br />
                <Text type="secondary">{sellerInfo.email}</Text>
              </div>
            </Space>
          ) : (
            <Text type="secondary">Not assigned</Text>
          )}
        </Card>

        {/* ────── QUICK ACTIONS ────── */}
        <Space style={{ width: '100%', marginBottom: 16 }} wrap>
          <Button icon={<WhatsAppOutlined />} onClick={() => setWhatsappVisible(true)}>WhatsApp</Button>
          <Button icon={<MailOutlined />} onClick={() => setEmailVisible(true)}>Email</Button>
          <Button icon={<PhoneFilled />} onClick={() => setCallVisible(true)}>Log Call</Button>
          <Button icon={<MessageOutlined />} onClick={() => setNoteVisible(true)}>Add Note</Button>
        </Space>

        {/* ────── HISTORY TIMELINE ────── */}
        <Card title={<><HistoryOutlined /> Activity History</>} style={{ marginTop: 16 }}>
          {history.length > 0 ? (
            <Timeline>{timelineItems}</Timeline>
          ) : (
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '20px 0' }}>
              No activity yet
            </Text>
          )}
        </Card>
      </div>

      {/* ────── MODALS ────── */}
      {/* WhatsApp */}
      <Modal
        title="Send WhatsApp"
        open={whatsappVisible}
        onCancel={() => { setWhatsappVisible(false); whatsappForm.resetFields(); }}
        onOk={() => whatsappForm.submit()}
        destroyOnClose
        okText="Open WhatsApp"
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

      {/* Email */}
      <Modal
        title="Send Email"
        open={emailVisible}
        onCancel={() => { setEmailVisible(false); emailForm.resetFields(); }}
        onOk={() => emailForm.submit()}
        destroyOnClose
        okText="Open Gmail"
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

      {/* Call Log */}
      <Modal
        title="Log Call"
        open={callVisible}
        onCancel={() => { setCallVisible(false); callForm.resetFields(); }}
        onOk={() => callForm.submit()}
        destroyOnClose
      >
        <Form form={callForm} onFinish={logCall} layout="vertical">
          <Form.Item name="duration" label="Duration (seconds)" initialValue={60}>
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

      {/* Add Note */}
      <Modal
        title="Add Note"
        open={noteVisible}
        onCancel={() => { setNoteVisible(false); noteForm.resetFields(); }}
        onOk={addNote}
        destroyOnClose
        okText="Add"
      >
        <Form form={noteForm} layout="vertical">
          <Form.Item name="note" rules={[{ required: true, message: 'Please type a note' }]}>
            <TextArea rows={3} placeholder="Your note…" />
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  );
};

export default SellerLeadDetail;