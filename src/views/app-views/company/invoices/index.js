import React, { useState, useEffect, useMemo } from 'react';
import {
  Typography, Space, Button, Row, Col, Modal, Spin,
  message, Empty, Alert
} from 'antd';
import { useSelector } from 'react-redux';
import {
  FileProtectOutlined, PlusOutlined, ReloadOutlined,
  WarningOutlined, DollarOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import InvoiceService from 'services/firebase/InvoiceService';
import UserService from 'services/firebase/UserService';
import { UserRoles } from 'models/UserModel';
import { InvoiceStatus } from 'models/InvoiceModel';

// Import components
import InvoiceStats from './components/InvoiceStats';
import InvoiceChart from './components/InvoiceChart';
import InvoiceFilters from './components/InvoiceFilters';
import InvoiceTable from './components/InvoiceTable';
import InvoiceForm from './components/InvoiceForm';
import InvoiceStatsDrawer from './components/InvoiceStatsDrawer';
import InvoiceDetail from './components/InvoiceDetail';
import { serverTimestamp } from 'configs/FirebaseConfig';  // Adjust path as needed

const { Title } = Typography;

/**
 * Invoices management page for CEO and HR
 * Provides invoice analytics, filtering, and management
 */
const InvoicesPage = () => {
  // State
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({});
  const [chartYear, setChartYear] = useState(new Date().getFullYear());
  const [isStatsDrawerVisible, setIsStatsDrawerVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
const [initialFiltersApplied, setInitialFiltersApplied] = useState(false);

  // Get user from Redux store
  const user = useSelector(state => state.auth.user);
  const userRole = user?.Role || user?.role;
  const companyId = user?.company_id || user?.companyId;

  // Check if user has permission to access this page
  const hasAccess = [
    UserRoles.CEO,
    UserRoles.ADMIN,
    UserRoles.HR
  ].includes(userRole);

  // Fetch invoices
  const fetchInvoices = async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      const data = await InvoiceService.getInvoicesByCompany(companyId);
      setInvoices(data);
      applyFilters(data, filters);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      message.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    if (!companyId) return;

    try {
      const data = await UserService.getUsersByCompany(companyId);
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

useEffect(() => {
  if (hasAccess && companyId) {
    // Set initial filters to current month if not already set
    if (!initialFiltersApplied) {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      setFilters({
        status: 'all',
        year: currentYear,
        month: currentMonth,
        department: 'all',
        creatorId: 'all',
        amountRange: 'all',
        filterType: 'paymentDate', // Default to payment date
      });
      setInitialFiltersApplied(true);
    }
    
    fetchInvoices();
    fetchUsers();
  }
}, [companyId, hasAccess, initialFiltersApplied]);


const applyFilters = (invoiceList, filterValues) => {
  if (!invoiceList) return;

  let result = [...invoiceList];

  // If no filter values or empty, return all invoices
  if (!filterValues || Object.keys(filterValues).length === 0) {
    setFilteredInvoices(result);
    return;
  }

  // Apply search filter
  if (filterValues.search) {
    const searchTerm = filterValues.search.toLowerCase();
    result = result.filter(invoice =>
      invoice.Title?.toLowerCase()?.includes(searchTerm) ||
      invoice.invoiceNumber?.toLowerCase()?.includes(searchTerm) ||
      invoice.description?.toLowerCase()?.includes(searchTerm)
    );
  }

  // Apply status filter
  if (filterValues.status && filterValues.status !== 'all') {
    result = result.filter(invoice => invoice.Status === filterValues.status);
  }

  // Apply creator filter
  if (filterValues.creatorId && filterValues.creatorId !== 'all') {
    result = result.filter(invoice => invoice.creator_id === filterValues.creatorId);
  }

  // Apply department filter
  if (filterValues.department && filterValues.department !== 'all') {
    result = result.filter(invoice => invoice.department === filterValues.department);
  }

  // Determine which date to filter by
  const usePaymentDate = filterValues.filterType === 'paymentDate';
  
  // Apply year filter
  if (filterValues.year) {
    const year = parseInt(filterValues.year);
    result = result.filter(invoice => {
      const dateField = usePaymentDate ? invoice.paymentDate : invoice.CreationDate;
      if (!dateField) return false;
      const date = dateField.toDate ? dateField.toDate() : new Date(dateField);
      return date.getFullYear() === year;
    });
    setChartYear(year);
  }

  // Apply month filter
  if (filterValues.month !== undefined && filterValues.month !== '' && filterValues.month !== null) {
    const month = parseInt(filterValues.month);
    result = result.filter(invoice => {
      const dateField = usePaymentDate ? invoice.paymentDate : invoice.CreationDate;
      if (!dateField) return false;
      const date = dateField.toDate ? dateField.toDate() : new Date(dateField);
      return date.getMonth() === month;
    });
  }

  // Apply date range filter (NEW)
  if (filterValues.dateRange && filterValues.dateRange.length === 2) {
    const [startDate, endDate] = filterValues.dateRange;
    result = result.filter(invoice => {
      const dateField = usePaymentDate ? invoice.paymentDate : invoice.CreationDate;
      if (!dateField) return false;
      const date = dateField.toDate ? dateField.toDate() : new Date(dateField);
      
      // Check if date is within range
      const start = startDate.startOf('day').toDate();
      const end = endDate.endOf('day').toDate();
      return date >= start && date <= end;
    });
  }

  // Apply amount range filter
  if (filterValues.amountRange && filterValues.amountRange !== 'all') {
    result = result.filter(invoice => {
      const amount = Number(invoice.amount || 0);
      switch (filterValues.amountRange) {
        case 'lessThan1000':
          return amount < 1000;
        case 'between1000And5000':
          return amount >= 1000 && amount <= 5000;
        case 'between5000And10000':
          return amount >= 5000 && amount <= 10000;
        case 'greaterThan10000':
          return amount > 10000;
        default:
          return true;
      }
    });
  }

  // Apply sorting
  if (filterValues.sortBy) {
    switch (filterValues.sortBy) {
      case 'dateDesc':
        result.sort((a, b) => {
          const dateA = a.CreationDate?.toDate?.() || new Date(a.CreationDate) || new Date(0);
          const dateB = b.CreationDate?.toDate?.() || new Date(b.CreationDate) || new Date(0);
          return dateB - dateA;
        });
        break;
      case 'dateAsc':
        result.sort((a, b) => {
          const dateA = a.CreationDate?.toDate?.() || new Date(a.CreationDate) || new Date(0);
          const dateB = b.CreationDate?.toDate?.() || new Date(b.CreationDate) || new Date(0);
          return dateA - dateB;
        });
        break;
      case 'amountDesc':
        result.sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
        break;
      case 'amountAsc':
        result.sort((a, b) => Number(a.amount || 0) - Number(b.amount || 0));
        break;
      default:
        result.sort((a, b) => {
          const dateA = a.CreationDate?.toDate?.() || new Date(a.CreationDate) || new Date(0);
          const dateB = b.CreationDate?.toDate?.() || new Date(b.CreationDate) || new Date(0);
          return dateB - dateA;
        });
    }
  }

  setFilteredInvoices(result);
};

  // Handle filter change
  const handleFilterChange = (values) => {
    setFilters(values);
    applyFilters(invoices, values);
  };

// Update the handleCreateInvoice function
const handleCreateInvoice = async (values) => {
  if (!companyId || !user?.id) {
    message.error('Missing user or company information');
    return;
  }

  try {
    setSubmitting(true);
    console.log('Creating invoice with values:', values); // Debug log

    const invoiceData = {
      ...values,
      company_id: companyId,
      creator_id: user.id,
      Status: InvoiceStatus.PENDING,
    };

    // Use createInvoice() → generates invoiceNumber
    const createdInvoice = await InvoiceService.createInvoice(invoiceData, []);

    console.log('Invoice created:', createdInvoice); // Debug log

    message.success(`Invoice ${createdInvoice.invoiceNumber} created successfully`);
    setIsModalVisible(false);
    setEditingInvoice(null);
    await fetchInvoices();
  } catch (error) {
    console.error('Error creating invoice:', error);
    message.error('Failed to create invoice: ' + error.message);
  } finally {
    setSubmitting(false);
  }
};

// Update the handleUpdateInvoice function
const handleUpdateInvoice = async (values) => {
  if (!editingInvoice?.id) {
    message.error('No invoice selected for editing');
    return;
  }

  setSubmitting(true);
  try {
    console.log('Updating invoice with values:', values); // Debug log
    
    const updateData = {
      ...values,
      // Don't override these fields
      company_id: editingInvoice.company_id,
      creator_id: editingInvoice.creator_id,
      invoiceNumber: editingInvoice.invoiceNumber,
    };

    // Use the dedicated updateInvoice method
    const updatedInvoice = await InvoiceService.updateInvoice(editingInvoice.id, updateData);
    
    console.log('Invoice updated:', updatedInvoice); // Debug log
    
    message.success('Invoice updated successfully');
    setIsModalVisible(false);
    setEditingInvoice(null);
    await fetchInvoices();
  } catch (error) {
    console.error('Error updating invoice:', error);
    message.error('Failed to update invoice: ' + error.message);
  } finally {
    setSubmitting(false);
  }
};


  // Handle viewing invoice details
  const handleViewDetails = (invoice) => {
    setSelectedInvoice(invoice);
    setIsDetailModalVisible(true);
  };

  // Handle closing invoice detail modal
  const handleCloseDetail = () => {
    setIsDetailModalVisible(false);
    setSelectedInvoice(null);
  };

  // Handle marking invoice as paid from detail modal
  const handleMarkAsPaidFromDetail = async (invoice) => {
    try {
      await InvoiceService.update(invoice.id, {
        Status: InvoiceStatus.PAID,
        LastUpdate: new Date()
      });
      message.success('Invoice marked as paid successfully');
      fetchInvoices();
      handleCloseDetail();
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      message.error('Failed to mark invoice as paid');
    }
  };

  // Handle opening payment URL
  const handleOpenPaymentUrl = (url) => {
    if (!url) {
      message.error('No payment URL provided');
      return;
    }
    window.open(url, '_blank');
  };

  // Handle editing invoice
  const handleEditInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setEditingInvoice(invoice);
    setIsModalVisible(true);
  };

  // Handle deleting invoice
const handleDeleteInvoice = (invoice) => {
  Modal.confirm({
    title: 'Delete Invoice',
    content: `Are you sure you want to delete invoice ${invoice.invoiceNumber || 'N/A'} ? This action cannot be undone.`,
    icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
    okText: 'Delete',
    okType: 'danger',
    cancelText: 'Cancel',
    onOk: async () => {
      try {
        await InvoiceService.delete(invoice.id);
        message.success('Invoice deleted successfully');
        fetchInvoices();
      } catch (error) {
        console.error('Error deleting invoice:', error);
        message.error('Failed to delete invoice');
      }
    }
  });
};

  // Invoice analytics data
  const overduePendingInvoices = useMemo(() => {
    if (!filteredInvoices.length) return 0;

    return filteredInvoices.filter(invoice => {
      if (invoice.Status !== InvoiceStatus.PENDING) return false;
      if (!invoice.DateLimit) return false;

      const dueDate = invoice.DateLimit.toDate ? invoice.DateLimit.toDate() : new Date(invoice.DateLimit);
      const today = new Date();
      return dueDate < today;
    }).length;
  }, [filteredInvoices]);

  const dueSoonInvoices = useMemo(() => {
    if (!filteredInvoices.length) return 0;

    return filteredInvoices.filter(invoice => {
      if (invoice.Status !== InvoiceStatus.PENDING) return false;
      if (!invoice.DateLimit) return false;

      const dueDate = invoice.DateLimit.toDate ? invoice.DateLimit.toDate() : new Date(invoice.DateLimit);
      const today = new Date();
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays >= 0 && diffDays <= 10;
    }).length;
  }, [filteredInvoices]);

  // If user doesn't have access
  if (!hasAccess) {
    return (
      <div className="container mx-auto py-4">
        <Alert
          message="Access Restricted"
          description="You do not have permission to view this page. Only CEO and HR team members can access the invoices management section."
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      {/* Enhanced Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: 32,
        color: '#fff',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
      }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size={12}>
              <Space size={16}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(10px)'
                }}>
                  <FileProtectOutlined style={{ fontSize: 24, color: '#fff' }} />
                </div>
                <div>
                  <Typography.Title level={2} style={{ margin: 0, color: '#fff', fontWeight: '700' }}>
                    Invoices Management
                  </Typography.Title>
                  <Typography.Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px' }}>
                    Track payments, manage billing, and monitor invoice performance
                  </Typography.Text>
                </div>
              </Space>
              {/* Quick Stats */}
              <Space size={24} style={{ marginTop: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>
                    {filteredInvoices.length}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>
                    Total Invoices
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>
                    {filteredInvoices.filter(inv => inv.Status === InvoiceStatus.PENDING).length}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>
                    Pending
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>
                    {filteredInvoices.filter(inv => inv.Status === InvoiceStatus.PAID).length}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>
                    Paid
                  </div>
                </div>
                {overduePendingInvoices > 0 && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff7875' }}>
                      {overduePendingInvoices}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>
                      Overdue
                    </div>
                  </div>
                )}
              </Space>
            </Space>
          </Col>
          <Col>
            <Space size={12}>
              <Button
                size="large"
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fff',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '8px'
                }}
                icon={<DollarOutlined />}
                onClick={() => setIsStatsDrawerVisible(true)}
              >
                Analytics
              </Button>
              <Button
                size="large"
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fff',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '8px'
                }}
                icon={<ReloadOutlined />}
                onClick={fetchInvoices}
                loading={loading}
              >
                Refresh
              </Button>
              <Button
                size="large"
                style={{
                  background: '#fff',
                  border: 'none',
                  color: '#667eea',
                  fontWeight: '600',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
                icon={<PlusOutlined />}
                onClick={() => setIsModalVisible(true)}
              >
                Create Invoice
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <div className="my-4">
        {/* Alerts */}
        {overduePendingInvoices > 0 && (
          <Alert
            message={
              <Space>
                <WarningOutlined />
                <span>Overdue Invoices</span>
              </Space>
            }
            description={`You have ${overduePendingInvoices} overdue invoice${overduePendingInvoices > 1 ? 's' : ''} that need attention.`}
            type="error"
            showIcon={false}
            style={{ marginBottom: 16 }}
          />
        )}

        {dueSoonInvoices > 0 && (
          <Alert
            message={
              <Space>
                <DollarOutlined />
                <span>Upcoming Payments</span>
              </Space>
            }
            description={`You have ${dueSoonInvoices} invoice${dueSoonInvoices > 1 ? 's' : ''} due within the next 10 days.`}
            type="warning"
            showIcon={false}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Statistics */}
        <InvoiceStats
          invoices={filteredInvoices}
          loading={loading}
        />

        {/* Chart removed from main page as requested - now only in sidebar stats */}

        {/* Filters */}
        <div className="my-4">
          <InvoiceFilters
            onFilter={handleFilterChange}
            companyId={companyId}
            loading={loading}
          />
        </div>

        {/* Invoices Table */}
        {filteredInvoices.length > 0 ? (
          <InvoiceTable
            invoices={filteredInvoices}
            loading={loading}
            fetchInvoices={fetchInvoices}
            users={users}
            onViewDetails={handleViewDetails}
            onEdit={handleEditInvoice}
            onDelete={handleDeleteInvoice}
          />
        ) : (
          <div className="my-4 text-center">
            {loading ? (
              <Spin size="large" />
            ) : (
              <Empty
                description="No invoices found"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </div>
        )}
      </div>

{/* Create/Edit Invoice Modal */}
<Modal
  title={editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}
  open={isModalVisible}
  onCancel={() => {
    setIsModalVisible(false);
    setEditingInvoice(null);
    // Force reset form when modal closes
    setTimeout(() => {
      document.querySelectorAll('form')[0]?.__proto__?.resetFields?.();
    }, 0);
  }}
  afterClose={() => {
    // Fully reset form after modal is closed
    setEditingInvoice(null);
  }}
  footer={null}
  width={800}
  maskClosable={false}
  destroyOnClose // This is KEY: destroys form instance on close
>
  <InvoiceForm 
    key={editingInvoice?.id || 'new'} // Force re-render on new/edit
    initialValues={editingInvoice}
    onSubmit={editingInvoice ? handleUpdateInvoice : handleCreateInvoice}
    onCancel={() => {
      setIsModalVisible(false);
      setEditingInvoice(null);
    }}
    loading={submitting}
  />
</Modal>

      {/* Invoice Stats Drawer */}
      <InvoiceStatsDrawer
        visible={isStatsDrawerVisible}
        onClose={() => setIsStatsDrawerVisible(false)}
        invoices={invoices}
      />

      {/* Invoice Detail Modal */}
      <InvoiceDetail
        visible={isDetailModalVisible}
        onClose={handleCloseDetail}
        invoice={selectedInvoice}
        onMarkAsPaid={handleMarkAsPaidFromDetail}
        onOpenPaymentUrl={handleOpenPaymentUrl}
      />
    </div>
  );
};

export default InvoicesPage;