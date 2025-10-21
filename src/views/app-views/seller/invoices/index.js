// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout,
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Typography,
  Space,
  Progress,
  message,
  Spin,
  notification
} from 'antd';
import {
  PlusOutlined,
  DollarOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  CreditCardOutlined,
  TrophyOutlined,
  RocketOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import InvoicesService from 'services/InvoicesService';
import SellerInvoiceList from './components/SellerInvoiceList';
import SellerInvoiceForm from './components/SellerInvoiceForm';
import SellerInvoiceDetail from './components/SellerInvoiceDetail';
import { motion } from 'framer-motion';
import moment from 'moment';

const { Title, Text } = Typography;

/**
 * Seller Invoices page - View and manage invoices for the seller
 */
const SellerInvoicesPage = () => {
  const user = useSelector(state => state.auth.user);
  const userId = user?.id;
  const companyId = user?.company_id;

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [monthlyStats, setMonthlyStats] = useState({
    total: 0,
    pending: 0,
    paid: 0,
    missed: 0,
    cancelled: 0,
    totalValue: 0,
    paidValue: 0,
    overdueCount: 0,
    avgValue: 0
  });

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    if (!userId) {
      console.log('Missing user data:', { userId });
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching invoices for user:', userId);
      setLoading(true);
      const invoicesData = await InvoicesService.getSellerInvoices(userId);
      console.log('Fetched invoices:', invoicesData);
      setInvoices(invoicesData);
      
      // Calculate monthly statistics
      calculateMonthlyStats(invoicesData);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      message.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Calculate monthly statistics
  const calculateMonthlyStats = (invoicesData) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyInvoices = invoicesData.filter(invoice => {
      const invoiceDate = new Date(invoice.CreationDate);
      return invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear;
    });
    
    const totalValue = monthlyInvoices.reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
    const paidInvoices = monthlyInvoices.filter(i => i.Status === 'Paid');
    const paidValue = paidInvoices.reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
    
    const overdueCount = monthlyInvoices.filter(invoice => {
      if (!invoice.DateLimit || invoice.Status !== 'Pending') return false;
      return moment().isAfter(moment(invoice.DateLimit));
    }).length;
    
    const stats = {
      total: monthlyInvoices.length,
      pending: monthlyInvoices.filter(i => i.Status === 'Pending').length,
      paid: monthlyInvoices.filter(i => i.Status === 'Paid').length,
      missed: monthlyInvoices.filter(i => i.Status === 'Missed').length,
      cancelled: monthlyInvoices.filter(i => i.Status === 'Cancelled').length,
      totalValue: totalValue,
      paidValue: paidValue,
      overdueCount: overdueCount,
      avgValue: monthlyInvoices.length > 0 ? totalValue / monthlyInvoices.length : 0
    };
    
    setMonthlyStats(stats);
  };

  // Load invoices on component mount
  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Handle form submit (create/edit)
  const handleFormSubmit = async (invoiceData) => {
    setFormLoading(true);
    try {
      if (selectedInvoice) {
        // Edit existing invoice
        await InvoicesService.updateInvoice(selectedInvoice.id, invoiceData);
        message.success('Invoice updated successfully');
        
        // Show achievement notification for large invoices
        if (invoiceData.amount >= 10000) {
          notification.success({
            message: 'High Value Invoice! 🎉',
            description: `Great work! You've updated an invoice worth ${formatCurrency(invoiceData.amount)}`,
            icon: <TrophyOutlined style={{ color: '#faad14' }} />,
            duration: 4
          });
        }
      } else {
        // Create new invoice
        await InvoicesService.createInvoice(invoiceData);
        message.success('Invoice created successfully');
        
        // Show encouragement notification
        notification.success({
          message: 'Invoice Created! 🚀',
          description: `Invoice for ${formatCurrency(invoiceData.amount)} has been created successfully`,
          icon: <RocketOutlined style={{ color: '#52c41a' }} />,
          duration: 4
        });
      }
      
      setFormVisible(false);
      setSelectedInvoice(null);
      fetchInvoices(); // Refresh the list
    } catch (error) {
      console.error('Error saving invoice:', error);
      message.error('Failed to save invoice');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle invoice deletion
  const handleDelete = async (invoiceId) => {
    try {
      await InvoicesService.deleteInvoice(invoiceId);
      message.success('Invoice deleted successfully');
      fetchInvoices(); // Refresh the list
      setDetailVisible(false);
    } catch (error) {
      console.error('Error deleting invoice:', error);
      message.error('Failed to delete invoice');
    }
  };

  // Handle status change
  const handleStatusChange = async (invoiceId, newStatus) => {
    try {
      await InvoicesService.updateInvoiceStatus(invoiceId, newStatus);
      message.success(`Invoice status updated to ${newStatus}`);
      
      // Show celebration for paid invoices
      if (newStatus === 'Paid') {
        notification.success({
          message: 'Payment Received! 💰',
          description: 'Congratulations! Another invoice has been paid.',
          icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
          duration: 4
        });
      }
      
      fetchInvoices(); // Refresh the list
      
      // Update the selected invoice if detail view is open
      if (selectedInvoice && selectedInvoice.id === invoiceId) {
        const updatedInvoice = invoices.find(i => i.id === invoiceId);
        if (updatedInvoice) {
          setSelectedInvoice({ ...updatedInvoice, Status: newStatus });
        }
      }
    } catch (error) {
      console.error('Error updating invoice status:', error);
      message.error('Failed to update invoice status');
    }
  };

  // Handle adding note
  const handleAddNote = async (invoiceId, noteText) => {
    try {
      await InvoicesService.addNote(invoiceId, noteText);
      fetchInvoices(); // Refresh to get updated invoice with new note
      
      // Update the selected invoice if detail view is open
      if (selectedInvoice && selectedInvoice.id === invoiceId) {
        const updatedInvoice = invoices.find(i => i.id === invoiceId);
        if (updatedInvoice) {
          setSelectedInvoice(updatedInvoice);
        }
      }
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  };

  // Handle view invoice
  const handleView = (invoice) => {
    setSelectedInvoice(invoice);
    setDetailVisible(true);
  };

  // Handle edit invoice
  const handleEdit = (invoice) => {
    setSelectedInvoice(invoice);
    setFormVisible(true);
  };

  // Handle create new invoice
  const handleCreate = () => {
    setSelectedInvoice(null);
    setFormVisible(true);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Calculate progress percentage for paid invoices
  const paidPercentage = monthlyStats.totalValue > 0 
    ? Math.round((monthlyStats.paidValue / monthlyStats.totalValue) * 100)
    : 0;

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p style={{ marginTop: '16px' }}>Loading user data...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ marginBottom: '24px' }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <FileTextOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <Title level={2} style={{ margin: 0 }}>My Invoices</Title>
            </Space>
            <Text type="secondary">Manage your invoices and track payments</Text>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<ReloadOutlined />}
                onClick={fetchInvoices}
                loading={loading}
              >
                Refresh
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleCreate}
                size="large"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                }}
              >
                Create Invoice
              </Button>
            </Space>
          </Col>
        </Row>
      </motion.div>

      {/* Monthly Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderRadius: '12px', overflow: 'hidden' }}>
              <Statistic
                title="Total Invoices"
                value={monthlyStats.total}
                prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderRadius: '12px', overflow: 'hidden' }}>
              <Statistic
                title="Total Value"
                value={formatCurrency(monthlyStats.totalValue)}
                prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderRadius: '12px', overflow: 'hidden' }}>
              <Statistic
                title="Pending"
                value={monthlyStats.pending}
                prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderRadius: '12px', overflow: 'hidden' }}>
              <Statistic
                title="Overdue"
                value={monthlyStats.overdueCount}
                prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
        </Row>
      </motion.div>

      {/* Progress Bar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Row style={{ marginBottom: '24px' }}>
          <Col xs={24}>
            <Card style={{ borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ marginBottom: '16px' }}>
                <Text strong>Payment Collection Progress</Text>
                <Text style={{ float: 'right' }}>
                  {formatCurrency(monthlyStats.paidValue)} / {formatCurrency(monthlyStats.totalValue)} collected
                </Text>
              </div>
              <Progress
                percent={paidPercentage}
                strokeColor={{
                  '0%': '#52c41a',
                  '100%': '#389e0d',
                }}
                trailColor="#f0f0f0"
                size={10}
                style={{ marginBottom: '8px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">Average Invoice: {formatCurrency(monthlyStats.avgValue)}</Text>
                <Text type="secondary">Collection Rate: {paidPercentage}%</Text>
              </div>
            </Card>
          </Col>
        </Row>
      </motion.div>

      {/* Invoices List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <SellerInvoiceList
          invoices={invoices}
          loading={loading}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRefresh={fetchInvoices}
          onStatusChange={handleStatusChange}
          currentUserId={userId}
        />
      </motion.div>

      {/* Invoice Form Modal */}
      <SellerInvoiceForm
        visible={formVisible}
        onCancel={() => {
          setFormVisible(false);
          setSelectedInvoice(null);
        }}
        onSubmit={handleFormSubmit}
        invoice={selectedInvoice}
        loading={formLoading}
        userId={userId}
        companyId={companyId}
      />

      {/* Invoice Detail Drawer */}
      <SellerInvoiceDetail
        visible={detailVisible}
        onClose={() => {
          setDetailVisible(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        onEdit={(invoice) => {
          setDetailVisible(false);
          setSelectedInvoice(invoice);
          setFormVisible(true);
        }}
        onDelete={handleDelete}
        onAddNote={handleAddNote}
        canEdit={selectedInvoice?.creator_id === userId}
      />
    </div>
  );
};

export default SellerInvoicesPage;