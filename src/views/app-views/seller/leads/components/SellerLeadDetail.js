/* @ts-nocheck */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Drawer, Card, Tag, Timeline, Typography, Button, Space, Row, Col,
  Input, Modal, Form, message, Select, InputNumber, Avatar, Tooltip, Badge
} from 'antd';
import {
  UserOutlined, PhoneOutlined, MailOutlined, GlobalOutlined, EditOutlined,
  WhatsAppOutlined, PhoneFilled, HistoryOutlined, MessageOutlined,
  CopyOutlined, CheckOutlined, InfoCircleOutlined, TagOutlined,
  EyeOutlined, FacebookOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { LeadStatus, LeadInterestLevel } from 'models/LeadModel';
import UserService from 'services/firebase/UserService';
import LeadHistoryService from 'services/firebase/LeadHistoryService';
import dayjs from 'dayjs';
import DealsService from 'services/DealsService';
import { DealSourceEnum, DealStatus } from 'models/DealModel';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

/* ────────────────────── TEMPLATES ────────────────────── */
const WHATSAPP_TEMPLATES = {
  intro: `Hi {{name}},

I'm {{seller}} from {{company}} – your dedicated property advisor.

You recently showed interest in a {{budget}} property in Dubai.

Are you free for a quick 5-min call to discuss your needs?

Looking forward!
{{seller}}`,

  follow_up: `Hi {{name}},

Just checking in – still looking for a {{budget}} property in Dubai?

We have new listings matching your criteria.

Best,
{{seller}}`,

  offer: `Hi {{name}}! Great news!

We found a **perfect match** for you:

{{budget}} | Dubai

View details: [Insert Property Link]

{{seller}} | {{company}}`,
};

const EMAIL_TEMPLATES = {
  intro: `Dear {{name}},

Thank you for your interest in properties with us.

I'm {{seller}}, your dedicated real estate advisor at {{company}}.

I noticed you're looking for a property around **{{budget}}** in **Dubai**.

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

**Price:** {{budget}}
**Location:** Dubai
**Type:** [Villa/Apartment/Penthouse]

[View Full Details]

This unit won't last long. Reply to this email or call me at {{sellerPhone}} to book a viewing.

Best,
{{seller}}
{{sellerPhone}} | {{sellerEmail}}`,
};

/* ────────────────────── HELPERS ────────────────────── */
const statusColors = {
  [LeadStatus.PENDING]:        'orange',
  [LeadStatus.GAIN]:           'green',
  [LeadStatus.LOSS]:           'red',
  [LeadStatus.NO_RESPONSE]:    'default',
  [LeadStatus.NOT_INTERESTED]: 'volcano',
  [LeadStatus.JUNK_LEAD]:      'purple',
};

const interestColors = {
  [LeadInterestLevel.HIGH]:   'red',
  [LeadInterestLevel.MEDIUM]: 'orange',
  [LeadInterestLevel.LOW]:    'blue',
};

/* ────────────────────── COMPONENT ────────────────────── */
const SellerLeadDetail = ({ visible, lead, onEdit, onClose, onStatusChange }) => {

  /* ── state ── */
  const [sellerInfo,   setSellerInfo]   = useState(null);
  const [companyInfo,  setCompanyInfo]  = useState(null);
  const [history,      setHistory]      = useState([]);
  const [copied,       setCopied]       = useState({});
  const [whatsappVisible, setWhatsappVisible] = useState(false);
  const [emailVisible,    setEmailVisible]    = useState(false);
  const [callVisible,     setCallVisible]     = useState(false);
  const [noteVisible,     setNoteVisible]     = useState(false);

  const [whatsappForm] = Form.useForm();
  const [emailForm]    = Form.useForm();
  const [callForm]     = Form.useForm();
  const [noteForm]     = Form.useForm();

  const currentUser = useSelector(state => state.auth.user);

  /* ── load seller + company ── */
  useEffect(() => {
    if (!visible || !lead) return;
    if (lead.seller_id)  UserService.getUserById(lead.seller_id).then(setSellerInfo);
    if (lead.company_id) LeadHistoryService.getCompanyData(lead.company_id).then(setCompanyInfo);
  }, [visible, lead]);

  /* ── listen to history ── */
  useEffect(() => {
    if (!visible || !lead?.id) return;
    const unsub = LeadHistoryService.listenToHistory(lead.id, lead.seller_id, setHistory);
    return () => typeof unsub === 'function' && unsub();
  }, [visible, lead?.id]);

  /* ── reset forms on lead change ── */
  useEffect(() => {
    if (visible && lead) {
      setCopied({});
      [whatsappForm, emailForm, callForm, noteForm].forEach(f => f.resetFields());
    }
  }, [lead?.id, visible]);

  /* ── helpers ── */
  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(c => ({ ...c, [key]: true }));
    setTimeout(() => setCopied(c => ({ ...c, [key]: false })), 2000);
    message.success('Copied!');
  };

  const getCreatedByName = async () => {
    if (sellerInfo) return LeadHistoryService.getSellerName(lead.seller_id);
    return `${currentUser.firstname} ${currentUser.lastname}`;
  };

  const markContactedIfNeeded = async () => {
    if (!lead.contacted) await LeadHistoryService.markAsContacted(lead.id);
  };

  /* ── whatsapp ── */
  const sendWhatsApp = async (values) => {
    const seller      = sellerInfo || currentUser;
    const sellerName  = `${seller.firstname} ${seller.lastname}`;
    const companyName = companyInfo?.name || '[Your Company]';

    const msg = WHATSAPP_TEMPLATES[values.template]
      .replace(/{{name}}/g,    lead.name)
      .replace(/{{seller}}/g,  sellerName)
      .replace(/{{budget}}/g,  lead.Budget ? `AED ${Number(lead.Budget).toLocaleString()}` : 'your budget')
      .replace(/Dubai/g,       lead.region || 'your area')
      .replace(/{{company}}/g, companyName);

    window.open(`https://wa.me/${lead.phoneNumber.replace(/[^\d]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');

    const name = await getCreatedByName();
    await LeadHistoryService.addHistory(lead.id, {
      type: 'whatsapp', message: msg, templateId: values.template,
      sellerId: currentUser.id,
      createdBy: { id: currentUser.id, name },
    });
    await markContactedIfNeeded();
    setWhatsappVisible(false);
    message.success('WhatsApp opened & logged');
  };

  /* ── email ── */
  const sendEmail = async (values) => {
    const seller      = sellerInfo || currentUser;
    const sellerName  = `${seller.firstname} ${seller.lastname}`;
    const companyName = companyInfo?.name || '';

    const body = EMAIL_TEMPLATES[values.template]
      .replace(/{{name}}/g,        lead.name)
      .replace(/{{seller}}/g,      sellerName)
      .replace(/{{budget}}/g,      lead.Budget ? `AED ${Number(lead.Budget).toLocaleString()}` : '')
      .replace(/Dubai/g,           lead.region || '')
      .replace(/{{sellerEmail}}/g, seller.email || '')
      .replace(/{{sellerPhone}}/g, seller.phoneNumber || '')
      .replace(/{{company}}/g,     companyName);

    const subject = values.template === 'intro'
      ? 'Your Property Inquiry – Let\'s Find Your Dream Home'
      : 'Exclusive Property Match Just for You';

    const win = window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(lead.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      '_blank'
    );

    const name = await getCreatedByName();
    await LeadHistoryService.addHistory(lead.id, {
      type: 'email', message: body, templateId: values.template,
      sellerId: currentUser.id,
      createdBy: { id: currentUser.id, name },
    });
    await markContactedIfNeeded();
    setEmailVisible(false);
    win ? message.success('Gmail opened – click Send!') : message.warning('Allow pop-ups for Gmail');
  };

  /* ── call log ── */
  const logCall = async (values) => {
    const name = await getCreatedByName();
    await LeadHistoryService.addHistory(lead.id, {
      type: 'call', duration: values.duration, outcome: values.outcome,
      sellerId: currentUser.id,
      createdBy: { id: currentUser.id, name },
    });
    await markContactedIfNeeded();
    callForm.resetFields();
    setCallVisible(false);
    message.success('Call logged');
  };

  /* ── add note ── */
  const addNote = async () => {
    const { note } = await noteForm.validateFields();
    const name = await getCreatedByName();
    await LeadHistoryService.addHistory(lead.id, {
      type: 'note', message: note,
      sellerId: currentUser.id,
      createdBy: { id: currentUser.id, name },
    });
    noteForm.resetFields();
    setNoteVisible(false);
    message.success('Note added');
  };

  /* ── status change + auto-deal ── */
  const handleStatusChange = async (newStatus) => {
    if (!lead || newStatus === lead.status) return;
    try {
      if (typeof onStatusChange === 'function') {
        await onStatusChange(lead.id, newStatus);
      } else {
        message.warning('Status update handler not connected');
        return;
      }

      if (newStatus === LeadStatus.GAIN && lead.Budget) {
        await DealsService.createDeal({
          Amount:        lead.Budget || 0,
          Description:   `Converted from lead: ${lead.name}`,
          lead_id:       lead.id,
          seller_id:     lead.seller_id || currentUser?.id,
          company_id:    lead.company_id || currentUser?.company_id,
          Status:        DealStatus.GAIN,
          Source:        DealSourceEnum.LEADS,
          contact_name:  lead.name,
          contact_email: lead.email,
          contact_phone: lead.phoneNumber,
          CreationDate:  new Date(),
        });
        message.success('Lead converted to Gain! Deal created.');
      } else {
        message.success(`Status updated to ${newStatus}`);
      }

      const name = await getCreatedByName();
      await LeadHistoryService.addHistory(lead.id, {
        type: 'status', message: `Status changed to ${newStatus}`,
        sellerId: currentUser.id,
        createdBy: { id: currentUser.id, name },
      });
    } catch (err) {
      console.error(err);
      message.error('Failed to update status');
    }
  };

  /* ── timeline ── */
  const timelineItems = useMemo(() => history.map((h, i) => {
    const colorMap = { whatsapp: '#25D366', email: '#1890ff', call: '#722ed1', status: '#1890ff', note: '#8c8c8c' };
    const dotMap   = {
      whatsapp: <WhatsAppOutlined style={{ fontSize: 16 }} />,
      email:    <MailOutlined     style={{ fontSize: 16 }} />,
      call:     <PhoneFilled      style={{ fontSize: 16 }} />,
      status:   <TagOutlined      style={{ fontSize: 16 }} />,
      note:     <MessageOutlined  style={{ fontSize: 16 }} />,
    };

    return (
      <Timeline.Item key={i} color={colorMap[h.type] || 'gray'} dot={dotMap[h.type]}>
        <div>
          <Text strong>{h.createdBy?.name || 'Unknown'}</Text>
          <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
            {dayjs(h.createdAt).format('MMM DD, HH:mm')}
          </Text>
        </div>
        <div style={{ marginTop: 8, padding: '8px 12px', background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0', whiteSpace: 'pre-wrap' }}>
          {h.type === 'status'   && <Tag color="blue">Status → {h.message.split('to ')[1]}</Tag>}
          {h.type === 'note'     && <Text>{h.message}</Text>}
          {h.type === 'call'     && (
            <Text>
              <PhoneFilled /> Call ({h.duration}Min) –{' '}
              <Tag color={h.outcome === 'answered' ? 'green' : 'red'}>{h.outcome}</Tag>
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
    );
  }), [history]);

  if (!lead) return null;

  /* ────────────────────── RENDER ────────────────────── */
  return (
    <Drawer
      title={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space align="center" wrap>
            <Title level={4} style={{ margin: 0 }}>{lead.name}</Title>

            {lead.contacted && <Badge status="success" text="Contacted" />}

            <Select
              value={lead.status}
              onChange={handleStatusChange}
              size="small"
              style={{ width: 148 }}
              disabled={lead.status === LeadStatus.GAIN}
            >
              {Object.values(LeadStatus).map(s => (
                <Option key={s} value={s}>
                  <Tag color={statusColors[s]} style={{ margin: 0 }}>{s}</Tag>
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

        {/* ── CONTACT CARD ── */}
        <Card
          title={<Space><InfoCircleOutlined /> Contact</Space>}
          style={{ marginBottom: 16 }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Text type="secondary"><GlobalOutlined /> Region</Text><br />
              <Text strong>{lead.region || '—'}</Text>
            </Col>

            <Col xs={24} sm={12}>
              <Text type="secondary"><MailOutlined /> Email</Text><br />
              <Space wrap>
                <a href={`mailto:${lead.email}`} style={{ wordBreak: 'break-all' }}>{lead.email || '—'}</a>
                {lead.email && (
                  <Button
                    size="small"
                    icon={copied.email ? <CheckOutlined style={{ color: 'green' }} /> : <CopyOutlined />}
                    onClick={() => copyToClipboard(lead.email, 'email')}
                  />
                )}
              </Space>
            </Col>

            <Col xs={24} sm={12}>
              <Text type="secondary"><PhoneOutlined /> Phone</Text><br />
              <Space wrap>
                <a href={`tel:${lead.phoneNumber}`}>{lead.phoneNumber || '—'}</a>
                {lead.phoneNumber && (
                  <Button
                    size="small"
                    icon={copied.phone ? <CheckOutlined style={{ color: 'green' }} /> : <CopyOutlined />}
                    onClick={() => copyToClipboard(lead.phoneNumber, 'phone')}
                  />
                )}
                <Button type="primary" size="small" icon={<WhatsAppOutlined />} onClick={() => setWhatsappVisible(true)} />
                <Button size="small" icon={<PhoneFilled />} onClick={() => setCallVisible(true)} />
              </Space>
            </Col>

            {lead.phoneNumber2 && (
              <Col xs={24} sm={12}>
                <Text type="secondary"><PhoneOutlined /> Phone 2</Text><br />
                <Space>
                  <a href={`tel:${lead.phoneNumber2}`}>{lead.phoneNumber2}</a>
                  <Button
                    size="small"
                    icon={copied.phone2 ? <CheckOutlined style={{ color: 'green' }} /> : <CopyOutlined />}
                    onClick={() => copyToClipboard(lead.phoneNumber2, 'phone2')}
                  />
                </Space>
              </Col>
            )}

            {lead.secondaryEmail && (
              <Col xs={24} sm={12}>
                <Text type="secondary"><MailOutlined /> Email 2</Text><br />
                <Space>
                  <a href={`mailto:${lead.secondaryEmail}`}>{lead.secondaryEmail}</a>
                  <Button
                    size="small"
                    icon={copied.email2 ? <CheckOutlined style={{ color: 'green' }} /> : <CopyOutlined />}
                    onClick={() => copyToClipboard(lead.secondaryEmail, 'email2')}
                  />
                </Space>
              </Col>
            )}
          </Row>
        </Card>

        {/* ── BUDGET & INTEREST ── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12}>
            <Card title="Budget" size="small">
              <Text strong style={{ fontSize: 18, color: '#1677ff' }}>
                {lead.Budget ? `AED ${Number(lead.Budget).toLocaleString()}` : '—'}
              </Text>
            </Card>
          </Col>
          <Col xs={12}>
            <Card title="Interest" size="small">
              <Tag color={interestColors[lead.InterestLevel] || 'default'}>
                {lead.InterestLevel || '—'}
              </Tag>
            </Card>
          </Col>
        </Row>

        {/* ── META LEAD SOURCE ── */}
        {(lead.meta_lead_id || lead.meta_form_name || lead.meta_campaign) && (
          <Card
            title={
              <Space>
                <EyeOutlined style={{ color: '#1877F2' }} />
                Meta Lead Source
                <Tag color="purple">Facebook</Tag>
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <Row gutter={[16, 12]}>
              <Col xs={24} sm={12}>
                <Text type="secondary">Form Name</Text><br />
                <Text strong>{lead.meta_form_name || '—'}</Text>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary">Ad Name</Text><br />
                <Text strong>{lead.meta_ad_name || '—'}</Text>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary">Campaign</Text><br />
                <Text strong>{lead.meta_campaign || '—'}</Text>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary">Ad Set</Text><br />
                <Text strong>{lead.meta_adset || '—'}</Text>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary">Platform</Text><br />
                <Tag color="blue">{lead.meta_platform || 'fb'}</Tag>
              </Col>
              <Col xs={24}>
                <Text type="secondary">Meta Lead ID</Text><br />
                <Text copyable strong style={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {lead.meta_lead_id || '—'}
                </Text>
              </Col>
            </Row>
          </Card>
        )}

        {/* ── LOOKING FOR ── */}
        {lead.lookingFor && (
          <Card title="Looking For" size="small" style={{ marginBottom: 16 }}>
            <Text>{lead.lookingFor}</Text>
          </Card>
        )}

        {/* ── ASSIGNED SELLER ── */}
        <Card
          title={<Space><UserOutlined /> Assigned Seller</Space>}
          style={{ marginBottom: 16 }}
        >
          {sellerInfo ? (
            <Space>
              <Avatar style={{ backgroundColor: '#1677ff' }}>
                {sellerInfo.firstname?.[0]?.toUpperCase()}
              </Avatar>
              <div>
                <Text strong>{sellerInfo.firstname} {sellerInfo.lastname}</Text><br />
                <Text type="secondary">{sellerInfo.email}</Text>
              </div>
            </Space>
          ) : (
            <Text type="secondary">Not assigned</Text>
          )}
        </Card>

        {/* ── QUICK ACTIONS ── */}
        <Space style={{ width: '100%', marginBottom: 16 }} wrap>
          <Button icon={<WhatsAppOutlined />} onClick={() => setWhatsappVisible(true)}>WhatsApp</Button>
          <Button icon={<MailOutlined />}     onClick={() => setEmailVisible(true)}>Email</Button>
          <Button icon={<PhoneFilled />}      onClick={() => setCallVisible(true)}>Log Call</Button>
          <Button icon={<MessageOutlined />}  onClick={() => setNoteVisible(true)}>Add Note</Button>
        </Space>

        {/* ── ACTIVITY HISTORY ── */}
        <Card
          title={<Space><HistoryOutlined /> Activity History</Space>}
          style={{ marginBottom: 16 }}
        >
          {history.length > 0 ? (
            <Timeline>{timelineItems}</Timeline>
          ) : (
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '20px 0' }}>
              No activity yet
            </Text>
          )}
        </Card>

        {/* ── INLINE NOTE FORM (always visible, like LeadDetailsPro) ── */}
        <Card title="Quick Note" size="small">
          <Form form={noteForm} layout="vertical">
            <Form.Item name="note" rules={[{ required: true, message: 'Please type a note' }]} style={{ marginBottom: 8 }}>
              <TextArea rows={3} placeholder="Type your note…" />
            </Form.Item>
            <Button type="primary" onClick={addNote}>Add Note</Button>
          </Form>
        </Card>
      </div>

      {/* ── WHATSAPP MODAL ── */}
      <Modal
        title="Send WhatsApp"
        open={whatsappVisible}
        onCancel={() => { setWhatsappVisible(false); whatsappForm.resetFields(); }}
        onOk={() => whatsappForm.submit()}
        okText="Open WhatsApp"
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

      {/* ── EMAIL MODAL ── */}
      <Modal
        title="Send Email"
        open={emailVisible}
        onCancel={() => { setEmailVisible(false); emailForm.resetFields(); }}
        onOk={() => emailForm.submit()}
        okText="Open Gmail"
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

      {/* ── CALL MODAL ── */}
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

      {/* ── NOTE MODAL (from quick-action button) ── */}
      <Modal
        title="Add Note"
        open={noteVisible}
        onCancel={() => { setNoteVisible(false); noteForm.resetFields(); }}
        onOk={addNote}
        okText="Add"
        destroyOnClose
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