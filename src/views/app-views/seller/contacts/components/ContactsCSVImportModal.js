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
import ContactsService from 'services/ContactsService';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

/**
 * CSV Import Modal for Seller Contacts
 * Allows sellers to import contacts via CSV file with validation and preview
 */
const ContactsCSVImportModal = ({ visible, onClose, onSuccess }) => {
  const user = useSelector(state => state.auth.user);
  const sellerId = user?.id;
  const companyId = user?.company_id;

  const [currentStep, setCurrentStep] = useState(0);
  const [csvData, setCsvData] = useState([]);
  const [validatedData, setValidatedData] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Required fields for contact creation
  const requiredFields = ['name', 'email', 'phoneNumber'];
  
  // Optional fields that can be included
  const optionalFields = ['country', 'description', 'Notes'];

  // Reset modal state when closing
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

  // Validate CSV data against contact structure
  const validateCsvData = (data) => {
    const validated = [];
    const errors = [];

    data.forEach((row, index) => {
      const validatedRow = { ...row, rowIndex: index + 1 };
      const rowErrors = [];

      // Check required fields
      requiredFields.forEach(field => {
        if (!row[field] || row[field].trim() === '') {
          rowErrors.push(`Missing required field: ${field}`);
        }
      });

      // Validate email format
      if (row.email && row.email.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.email.trim())) {
          rowErrors.push('Invalid email format');
        }
      }

      // Validate phone number format (should start with + and have digits)
      if (row.phoneNumber && row.phoneNumber.trim() !== '') {
        const phoneRegex = /^\+\d{10,15}$/;
        if (!phoneRegex.test(row.phoneNumber.trim())) {
          rowErrors.push('Invalid phone number format (should be +XXX format with 10-15 digits)');
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

  // Import validated contacts to Firebase
  const handleImportContacts = async () => {
    const validContacts = validatedData.filter(row => row.isValid);
    
    if (validContacts.length === 0) {
      message.error('No valid contacts to import');
      return;
    }

    setImporting(true);
    setImportProgress(0);

    try {
      const totalContacts = validContacts.length;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < validContacts.length; i++) {
        const row = validContacts[i];
        
        try {
          // Prepare contact data with defaults
          const contactData = {
            name: row.name?.trim() || '',
            email: row.email?.trim() || '',
            phoneNumber: row.phoneNumber?.trim() || '',
            country: row.country?.trim() || '',
            description: row.description?.trim() || '',
            Notes: row.Notes ? [{
              note: row.Notes.trim(),
              CreationDate: new Date()
            }] : [],
            
            // Auto-populated fields
            seller_id: sellerId,
            company_id: companyId,
            status: 'Pending',
            AffectingDate: new Date() // Current date as AffectingDate
          };

          await ContactsService.createContact(contactData);
          successCount++;
        } catch (error) {
          console.error(`Error importing contact ${i + 1}:`, error);
          errorCount++;
        }

        // Update progress
        const progress = Math.round(((i + 1) / totalContacts) * 100);
        setImportProgress(progress);
      }

      setImporting(false);
      
      if (successCount > 0) {
        message.success(`Successfully imported ${successCount} contacts${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
        onSuccess?.(successCount);
        handleClose();
      } else {
        message.error('Failed to import any contacts');
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
      title: 'Name',
      dataIndex: 'name',
      render: (text, record) => (
        <span style={{ color: !text?.trim() ? '#ff4d4f' : 'inherit' }}>
          {text || '<Missing>'}
        </span>
      )
    },
    {
      title: 'Email',
      dataIndex: 'email',
      render: (text, record) => (
        <span style={{ color: !text?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text?.trim() || '') ? '#ff4d4f' : 'inherit' }}>
          {text || '<Missing>'}
        </span>
      )
    },
    {
      title: 'Phone',
      dataIndex: 'phoneNumber',
      render: (text, record) => (
        <span style={{ color: !text?.trim() ? '#ff4d4f' : 'inherit' }}>
          {text || '<Missing>'}
        </span>
      )
    },
    {
      title: 'Country',
      dataIndex: 'country',
      render: (text) => text || '-'
    },
    {
      title: 'Description',
      dataIndex: 'description',
      render: (text) => text || '-'
    },
    {
      title: 'Notes',
      dataIndex: 'Notes',
      render: (text) => text || '-'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (text, record) => (
        <Tag color={record.isValid ? 'green' : 'red'}>
          {record.isValid ? 'Valid' : 'Invalid'}
        </Tag>
      )
    }
  ];

  // Steps for the import process
  const steps = [
    {
      title: 'Upload CSV',
      icon: <UploadOutlined />
    },
    {
      title: 'Preview & Validate',
      icon: <FileTextOutlined />
    },
    {
      title: 'Import',
      icon: <CheckCircleOutlined />
    }
  ];

  return (
    <Modal
      title="Import Contacts from CSV"
      open={visible}
      onCancel={handleClose}
      width={1000}
      footer={null}
      maskClosable={!importing}
      closable={!importing}
    >
      <Steps current={currentStep} items={steps} style={{ marginBottom: 24 }} />

      {/* Step 1: File Upload */}
      {currentStep === 0 && (
        <div>
          <Alert
            message="CSV Format Requirements"
            description={
              <div>
                <Paragraph>
                  <strong>Required columns:</strong> name, email, phoneNumber
                </Paragraph>
                <Paragraph>
                  <strong>Optional columns:</strong> country, description, Notes
                </Paragraph>
                <Paragraph>
                  <strong>Example:</strong>
                </Paragraph>
                <code style={{ 
                  display: 'block', 
                  background: '#f5f5f5', 
                  padding: '8px', 
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>
                  name,email,phoneNumber,country,description,Notes<br/>
                  John Smith,john@example.com,+971501234567,UAE,Real estate investor,Very interested in Dubai properties
                </code>
              </div>
            }
            type="info"
            style={{ marginBottom: 16 }}
          />

          <Upload.Dragger
            name="csvFile"
            multiple={false}
            accept=".csv"
            beforeUpload={handleFileUpload}
            showUploadList={false}
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            </p>
            <p className="ant-upload-text">Click or drag CSV file to this area to upload</p>
            <p className="ant-upload-hint">
              Support for .csv files only. Ensure your file has the required columns.
            </p>
          </Upload.Dragger>

          {csvData.length > 0 && (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Text type="secondary">
                File uploaded successfully! {csvData.length} rows detected.
              </Text>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Preview and Validation */}
      {currentStep === 1 && (
        <div>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Statistic
                title="Total Rows"
                value={validatedData.length}
                prefix={<FileTextOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Valid Contacts"
                value={validatedData.filter(row => row.isValid).length}
                valueStyle={{ color: '#3f8600' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Invalid Contacts"
                value={validatedData.filter(row => !row.isValid).length}
                valueStyle={{ color: '#cf1322' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Success Rate"
                value={validatedData.length > 0 ? Math.round((validatedData.filter(row => row.isValid).length / validatedData.length) * 100) : 0}
                suffix="%"
                valueStyle={{ color: validatedData.filter(row => row.isValid).length === validatedData.length ? '#3f8600' : '#faad14' }}
              />
            </Col>
          </Row>

          {validationErrors.length > 0 && (
            <Alert
              message="Validation Errors Found"
              description={
                <div>
                  <Text>The following rows have errors and will not be imported:</Text>
                  <ul style={{ marginTop: 8, marginBottom: 0 }}>
                    {validationErrors.slice(0, 5).map((error, index) => (
                      <li key={index}>
                        <strong>Row {error.row}:</strong> {error.errors.join(', ')}
                      </li>
                    ))}
                    {validationErrors.length > 5 && (
                      <li><em>... and {validationErrors.length - 5} more errors</em></li>
                    )}
                  </ul>
                </div>
              }
              type="warning"
              style={{ marginBottom: 16 }}
            />
          )}

          <Table
            columns={previewColumns}
            dataSource={validatedData}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 800 }}
            size="small"
            rowClassName={(record) => record.isValid ? '' : 'table-row-error'}
            rowKey="rowIndex"
          />

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Space>
              <Button onClick={() => setCurrentStep(0)}>
                Back
              </Button>
              <Button 
                type="primary" 
                onClick={handleImportContacts}
                disabled={validatedData.filter(row => row.isValid).length === 0}
              >
                Import {validatedData.filter(row => row.isValid).length} Valid Contacts
              </Button>
            </Space>
          </div>

          {importing && (
            <div style={{ marginTop: 16 }}>
              <Text>Importing contacts...</Text>
              <Progress percent={importProgress} status="active" />
            </div>
          )}
        </div>
      )}

    </Modal>
  );
};

export default ContactsCSVImportModal;
