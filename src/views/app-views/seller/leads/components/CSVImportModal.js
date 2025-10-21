import React, { useState } from 'react';
import {
  Modal,
  Upload,
  Button,
  Table,
  Alert,
  Steps,
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Space,
  Divider,
  message,
  Progress,
  Statistic
} from 'antd';
import {
  UploadOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import Papa from 'papaparse';
import LeadsService from 'services/LeadsService';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

/**
 * CSV Import Modal for Seller Leads
 * Allows sellers to import leads via CSV file with validation and preview
 */
const CSVImportModal = ({ visible, onClose, onSuccess }) => {
  const user = useSelector(state => state.auth.user);
  const sellerId = user?.id;
  const companyId = user?.company_id;

  const [currentStep, setCurrentStep] = useState(0);
  const [csvData, setCsvData] = useState([]);
  const [validatedData, setValidatedData] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Required fields for lead creation
  const requiredFields = ['name', 'email', 'phoneNumber'];
  const optionalFields = ['Budget', 'InterestLevel', 'region', 'status', 'Notes'];

  // Reset modal state
  const resetModal = () => {
    setCurrentStep(0);
    setCsvData([]);
    setValidatedData([]);
    setValidationErrors([]);
    setImporting(false);
    setImportProgress(0);
  };

  // Handle modal close
  const handleClose = () => {
    if (!importing) {
      resetModal();
      onClose();
    }
  };

  // CSV file upload handler
  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result;
      if (typeof csv === 'string') {
        Papa.parse(csv, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            console.log('CSV parsed:', results.data);
            setCsvData(results.data);
            validateCsvData(results.data);
          },
          error: (error) => {
            message.error('Error parsing CSV file: ' + error.message);
          }
        });
      } else {
        message.error('Invalid file format. Please upload a valid CSV file.');
      }
    };
    reader.readAsText(file);
    return false; // Prevent automatic upload
  };

  // Validate CSV data against lead structure
  const validateCsvData = (data) => {
    const validated = [];
    const errors = [];

    data.forEach((row, index) => {
      const rowErrors = [];
      const validatedRow = { ...row, rowIndex: index + 1 };

      // Check required fields
      requiredFields.forEach(field => {
        if (!row[field] || row[field].trim() === '') {
          rowErrors.push(`Missing required field: ${field}`);
        }
      });

      // Validate email format
      if (row.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.email.trim())) {
          rowErrors.push('Invalid email format');
        }
      }

      // Validate phone number (basic validation)
      if (row.phoneNumber) {
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
        if (!phoneRegex.test(row.phoneNumber.trim())) {
          rowErrors.push('Invalid phone number format');
        }
      }

      // Validate Budget if provided
      if (row.Budget && row.Budget.trim() !== '') {
        const budget = parseFloat(row.Budget);
        if (isNaN(budget) || budget <= 0) {
          rowErrors.push('Invalid budget amount');
        }
      }

      // Validate InterestLevel if provided
      if (row.InterestLevel) {
        const validLevels = ['Low', 'Medium', 'High'];
        if (!validLevels.includes(row.InterestLevel.trim())) {
          rowErrors.push('Invalid interest level (must be: Low, Medium, or High)');
        }
      }

      // Validate status if provided
      if (row.status) {
        const validStatuses = ['Pending', 'Contacted', 'Qualified', 'Lost'];
        if (!validStatuses.includes(row.status.trim())) {
          rowErrors.push('Invalid status (must be: Pending, Contacted, Qualified, or Lost)');
        }
      }

      validatedRow.errors = rowErrors;
      validatedRow.isValid = rowErrors.length === 0;

      validated.push(validatedRow);
      if (rowErrors.length > 0) {
        errors.push({
          row: index + 1,
          errors: rowErrors
        });
      }
    });

    setValidatedData(validated);
    setValidationErrors(errors);
    setCurrentStep(1);
  };

  // Import validated leads to Firebase
  const handleImportLeads = async () => {
    const validLeads = validatedData.filter(row => row.isValid);
    
    if (validLeads.length === 0) {
      message.error('No valid leads to import');
      return;
    }

    setImporting(true);
    setImportProgress(0);

    try {
      const totalLeads = validLeads.length;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < validLeads.length; i++) {
        const row = validLeads[i];
        
        try {
          // Prepare lead data with defaults
          const leadData = {
            name: row.name?.trim() || '',
            email: row.email?.trim() || '',
            phoneNumber: row.phoneNumber?.trim() || '',
            Budget: row.Budget ? parseFloat(row.Budget) : 0,
            InterestLevel: row.InterestLevel?.trim() || 'Medium',
            region: row.region?.trim() || '',
            status: row.status?.trim() || 'Pending',
            Notes: row.Notes ? [{
              note: row.Notes.trim(),
              CreationDate: new Date()
            }] : [],
            
            // Auto-populated fields
            seller_id: sellerId,
            company_id: companyId,
            RedirectedFrom: 'CSV Import',
            isDeleted: false
          };

          await LeadsService.createLead(leadData);
          successCount++;
        } catch (error) {
          console.error(`Error importing lead ${i + 1}:`, error);
          errorCount++;
        }

        // Update progress
        const progress = Math.round(((i + 1) / totalLeads) * 100);
        setImportProgress(progress);
      }

      setImporting(false);
      
      if (successCount > 0) {
        message.success(`Successfully imported ${successCount} leads${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
        onSuccess?.(successCount);
        handleClose();
      } else {
        message.error('Failed to import any leads');
      }

    } catch (error) {
      console.error('Import error:', error);
      message.error('Error during import process');
      setImporting(false);
    }
  };

  // Table columns for data preview
  const previewColumns = [
    {
      title: 'Row',
      dataIndex: 'rowIndex',
      width: 60,
      render: (text, record) => (
        <Tag color={record.isValid ? 'green' : 'red'}>
          {text}
        </Tag>
      )
    },
    {
      title: 'Name *',
      dataIndex: 'name',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong={!!text}>{text || <Text type="danger">Missing</Text>}</Text>
        </Space>
      )
    },
    {
      title: 'Email *',
      dataIndex: 'email',
      render: (text, record) => (
        <Text strong={!!text}>{text || <Text type="danger">Missing</Text>}</Text>
      )
    },
    {
      title: 'Phone *',
      dataIndex: 'phoneNumber',
      render: (text, record) => (
        <Text strong={!!text}>{text || <Text type="danger">Missing</Text>}</Text>
      )
    },
    {
      title: 'Budget',
      dataIndex: 'Budget',
      render: (text) => text ? `AED ${parseInt(text).toLocaleString()}` : '-'
    },
    {
      title: 'Interest',
      dataIndex: 'InterestLevel',
      render: (text) => text ? (
        <Tag color={text === 'High' ? 'red' : text === 'Medium' ? 'orange' : 'blue'}>
          {text}
        </Tag>
      ) : '-'
    },
    {
      title: 'Region',
      dataIndex: 'region',
      render: (text) => text || '-'
    },
    {
      title: 'Status',
      key: 'errors',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          {record.isValid ? (
            <Tag color="green" icon={<CheckCircleOutlined />}>Valid</Tag>
          ) : (
            <Tag color="red" icon={<ExclamationCircleOutlined />}>
              {record.errors.length} Error{record.errors.length > 1 ? 's' : ''}
            </Tag>
          )}
          {!record.isValid && (
            <Text type="danger" style={{ fontSize: '11px' }}>
              {record.errors[0]}
            </Text>
          )}
        </Space>
      )
    }
  ];

  const validCount = validatedData.filter(row => row.isValid).length;
  const invalidCount = validatedData.length - validCount;

  return (
    <Modal
      title="Import Leads from CSV"
      open={visible}
      onCancel={handleClose}
      width={1000}
      footer={null}
      destroyOnClose
    >
      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        <Step title="Upload CSV" icon={<UploadOutlined />} />
        <Step title="Review & Validate" icon={<FileTextOutlined />} />
        <Step title="Import Complete" icon={<CheckCircleOutlined />} />
      </Steps>

      {/* Step 0: File Upload */}
      {currentStep === 0 && (
        <div>
          <Card>
            <Row gutter={24}>
              <Col span={12}>
                <Title level={4}>Upload CSV File</Title>
                <Upload.Dragger
                  accept=".csv"
                  beforeUpload={handleFileUpload}
                  showUploadList={false}
                  style={{ marginBottom: 16 }}
                >
                  <p className="ant-upload-drag-icon">
                    <UploadOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                  </p>
                  <p className="ant-upload-text">Click or drag CSV file here to upload</p>
                  <p className="ant-upload-hint">Only .csv files are supported</p>
                </Upload.Dragger>
              </Col>
              
              <Col span={12}>
                <Title level={4}>CSV Format Guide</Title>
                <Alert
                  message="Required Columns"
                  description={
                    <div>
                      <Text strong>Required fields (must be present):</Text>
                      <ul>
                        <li><Text code>name</Text> - Lead's full name</li>
                        <li><Text code>email</Text> - Valid email address</li>
                        <li><Text code>phoneNumber</Text> - Phone number</li>
                      </ul>
                      
                      <Text strong>Optional fields:</Text>
                      <ul>
                        <li><Text code>Budget</Text> - Number (e.g., 50000)</li>
                        <li><Text code>InterestLevel</Text> - Low, Medium, or High</li>
                        <li><Text code>region</Text> - Location/Region</li>
                        <li><Text code>status</Text> - Pending, Contacted, Qualified, or Lost</li>
                        <li><Text code>Notes</Text> - Additional notes</li>
                      </ul>
                      
                      <Divider style={{ margin: '12px 0' }} />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Auto-populated: seller_id, company_id, CreationDate, RedirectedFrom
                      </Text>
                    </div>
                  }
                  type="info"
                  showIcon
                />
              </Col>
            </Row>
          </Card>
        </div>
      )}

      {/* Step 1: Data Preview & Validation */}
      {currentStep === 1 && (
        <div>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Total Rows"
                  value={validatedData.length}
                  prefix={<FileTextOutlined />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Valid Leads"
                  value={validCount}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Invalid Rows"
                  value={invalidCount}
                  prefix={<ExclamationCircleOutlined />}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
          </Row>

          {validationErrors.length > 0 && (
            <Alert
              message={`${validationErrors.length} rows have validation errors`}
              description="Please review the errors in the table below. Only valid rows will be imported."
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Table
            columns={previewColumns}
            dataSource={validatedData}
            rowKey="rowIndex"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 800 }}
            size="small"
            rowClassName={(record) => record.isValid ? '' : 'table-row-error'}
          />

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={() => setCurrentStep(0)}>
                Back to Upload
              </Button>
              <Button
                type="primary"
                onClick={handleImportLeads}
                disabled={validCount === 0 || importing}
                loading={importing}
              >
                Import {validCount} Valid Lead{validCount !== 1 ? 's' : ''}
              </Button>
            </Space>
          </div>

          {importing && (
            <div style={{ marginTop: 16 }}>
              <Text>Importing leads...</Text>
              <Progress percent={importProgress} status="active" />
            </div>
          )}
        </div>
      )}

    </Modal>
  );
};

export default CSVImportModal;
