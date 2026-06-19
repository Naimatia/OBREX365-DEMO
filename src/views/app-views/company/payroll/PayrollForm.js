import React, { useEffect, useState } from 'react';
import { 
  Modal, Form, Input, Select, InputNumber, Divider, Button, 
  message, Space, Tag, Alert, Row, Col, Card, Switch, Typography 
} from 'antd';
import { 
  UserOutlined, DollarOutlined, SaveOutlined, 
  EditOutlined, CheckOutlined, CloseOutlined 
} from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

const PayrollForm = ({ 
  visible, 
  onCancel, 
  onSubmit, 
  isEditing, 
  initialValues,
  employees = [],
  dateRange = null
}) => {
  const [form] = Form.useForm();
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updateEmployeeSalary, setUpdateEmployeeSalary] = useState(false);

  const monthlySalary = Form.useWatch('monthly_salary', form);
  const daysInMonth = Form.useWatch('days_in_month', form);
  const workingDays = Form.useWatch('working_days', form);
  const absentDays = Form.useWatch('absent_days', form);
  const overtimeHours = Form.useWatch('overtime_hours', form);
  const otherDeduction = Form.useWatch('other_deduction', form);

  const EmployeeRoles = {
    HR: 'H.R',
    SALES_OFFICER: 'Sales Officer',
    ASSISTANT: 'Assistant',
    DRIVER: 'Driver',
    RECEPTIONIST: 'Receptionist',
    SUPERVISOR: 'Supervisor',
    SECRETARY: 'Secretary',
    TEAM_LEADER: 'Team Leader',
    SALES: 'Sales',
    SELLER: 'Seller',
    OFF_PLAN_SALES: 'Off-Plan Sales',
    READY_TO_MOVE_SALES: 'Ready to Move Sales',
    MARKETING_OFFICER: 'Marketing Officer',
  };

  // Calculate payroll values
  const calculatePayroll = () => {
    const salary = Number(monthlySalary || 0);
    const days = Number(daysInMonth || 30);
    const working = Number(workingDays || 0);
    const absent = Number(absentDays || 0);
    const overtime = Number(overtimeHours || 0);
    const other = Number(otherDeduction || 0);

    if (salary <= 0 || days <= 0) {
      return { basicPay: 0, absenceDeduction: 0, overtimePay: 0, grossPay: 0, netPay: 0 };
    }

    const dailyRate = salary / days;
    // Basic Pay = Monthly Salary (when working days = days in month)
    // If working days is less than days in month, calculate proportionally
    const basicPay = dailyRate * working;
    // Absence Deduction = (Monthly Salary / Working Days In Month) × Absent Days
    const absenceDeduction = dailyRate * absent;
    // Overtime Pay = Overtime Hours × Hourly Rate × 1.5
    const hourlyRate = dailyRate / 8; // Assuming 8 hours per day
    const overtimePay = overtime * hourlyRate * 1.5;
    // Gross Pay = Basic Pay + Overtime
    const grossPay = basicPay + overtimePay;
    // Net Pay = Gross Pay - Absence Deduction - Other Deduction
    const netPay = grossPay - absenceDeduction - other;

    return {
      basicPay: Math.round(basicPay * 100) / 100,
      absenceDeduction: Math.round(absenceDeduction * 100) / 100,
      overtimePay: Math.round(overtimePay * 100) / 100,
      grossPay: Math.round(grossPay * 100) / 100,
      netPay: Math.round(netPay * 100) / 100,
      dailyRate: Math.round(dailyRate * 100) / 100,
      hourlyRate: Math.round(hourlyRate * 100) / 100,
    };
  };

  const calculatedValues = calculatePayroll();

  // Handle employee selection
  const handleEmployeeSelect = (employeeId) => {
    const employee = employees.find(e => String(e.id) === String(employeeId));
    if (employee) {
      setSelectedEmployee(employee);
      const salary = Number(employee.monthly_salary || employee.salary || 0);
      form.setFieldsValue({
        employee_name: `${employee.firstname || ''} ${employee.lastname || ''}`.trim() || 'Unknown',
        position: employee.Role || employee.department || '',
        monthly_salary: salary,
        employee_id: employee.id,
      });
    }
  };

  // Initialize form
  useEffect(() => {
    if (visible) {
      if (isEditing && initialValues) {
        form.setFieldsValue({
          ...initialValues,
          monthly_salary: Number(initialValues.monthly_salary || 0),
          days_in_month: Number(initialValues.days_in_month || 30),
          hours_per_day: Number(initialValues.hours_per_day || 8),
          working_days: Number(initialValues.working_days || 0),
          overtime_hours: Number(initialValues.overtime_hours || 0),
          absent_days: Number(initialValues.absent_days || initialValues.absent_per_day || 0),
          other_deduction: Number(initialValues.other_deduction || 0),
          employee_id: initialValues.employee_id || '',
          employee_name: initialValues.employee_name || '',
          position: initialValues.position || '',
        });
        if (initialValues.employee_id) {
          const emp = employees.find(e => String(e.id) === String(initialValues.employee_id));
          if (emp) setSelectedEmployee(emp);
        }
      } else {
        form.resetFields();
        form.setFieldsValue({
          employee_id: '',
          employee_name: '',
          position: undefined,
          monthly_salary: 0,
          days_in_month: 30,
          hours_per_day: 8,
          working_days: 0,
          overtime_hours: 0,
          absent_days: 0,
          other_deduction: 0,
          daily_rate: 0,
          hourly_rate: 0,
        });
        setSelectedEmployee(null);
      }
      setUpdateEmployeeSalary(false);
    }
  }, [visible, isEditing, initialValues, form, employees]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      if (!values.monthly_salary || values.monthly_salary <= 0) {
        message.error("Monthly Salary is required and must be greater than 0");
        setLoading(false);
        return;
      }

      const { 
        basicPay, 
        absenceDeduction, 
        overtimePay, 
        grossPay, 
        netPay,
        dailyRate,
        hourlyRate 
      } = calculatedValues;

      const submitData = {
        ...values,
        basic_pay: basicPay,
        overtime_pay: overtimePay,
        absence_deduction: absenceDeduction,
        total_deduction: Math.round((absenceDeduction + Number(values.other_deduction || 0)) * 100) / 100,
        gross_pay: grossPay,
        net_pay: netPay,
        daily_rate: dailyRate,
        hourly_rate: hourlyRate,
        period_start: values.period_start || (dateRange ? dateRange[0].format('YYYY-MM-DD') : null),
        period_end: values.period_end || (dateRange ? dateRange[1].format('YYYY-MM-DD') : null),
        update_employee_salary: updateEmployeeSalary,
      };

      await onSubmit(submitData);
      setLoading(false);
    } catch (error) {
      console.error(error);
      message.error('Please fill all required fields correctly');
      setLoading(false);
    }
  };

  // Helper to get employee display name
  const getEmployeeDisplay = (emp) => {
    if (!emp) return '';
    return `${emp.firstname || ''} ${emp.lastname || ''}`.trim() || emp.id;
  };

  // Calculation Summary Component
  const CalculationSummary = () => {
    const { basicPay, absenceDeduction, overtimePay, grossPay, netPay } = calculatedValues;
    
    return (
      <Card size="small" style={{ background: '#f6f8fa', marginTop: 16 }}>
        <Row gutter={[8, 8]}>
          <Col xs={12} sm={8} md={6}>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>Basic Pay</Text>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#52c41a' }}>
                AED {basicPay.toLocaleString()}
              </div>
            </div>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>Overtime Pay</Text>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1890ff' }}>
                AED {overtimePay.toLocaleString()}
              </div>
            </div>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>Absence Deduction</Text>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#ff4d4f' }}>
                AED {absenceDeduction.toLocaleString()}
              </div>
            </div>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>Gross Pay</Text>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#52c41a' }}>
                AED {grossPay.toLocaleString()}
              </div>
            </div>
          </Col>
          <Col xs={24} sm={24} md={24} style={{ marginTop: 8 }}>
            <div style={{ textAlign: 'center', background: '#e6f7ff', padding: '8px', borderRadius: 4 }}>
              <Text strong style={{ fontSize: 14, color: '#1890ff' }}>
                Net Pay: AED {netPay.toLocaleString()}
              </Text>
            </div>
          </Col>
        </Row>
      </Card>
    );
  };

  return (
    <Modal
      title={
        <Space>
          <DollarOutlined style={{ color: '#1890ff' }} />
          <span>{isEditing ? 'Edit Payroll' : 'Add Payroll'}</span>
          {isEditing && initialValues?.employee_name && (
            <Tag color="blue">{initialValues.employee_name}</Tag>
          )}
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width="90%"
      style={{ maxWidth: 900 }}
      footer={[
        <Button key="cancel" onClick={onCancel}>Cancel</Button>,
        <Button 
          key="submit" 
          type="primary" 
          onClick={handleSubmit}
          loading={loading}
          icon={<SaveOutlined />}
        >
          {isEditing ? 'Update Payroll' : 'Add Payroll'}
        </Button>,
      ]}
    >
      <Alert
        message="Auto-Calculation"
        description={
          <div>
            <p style={{ margin: 0 }}>
              <strong>Basic Pay</strong> = Monthly Salary × (Working Days / Days in Month)
            </p>
            <p style={{ margin: 0 }}>
              <strong>Absence Deduction</strong> = (Monthly Salary / Days in Month) × Absent Days
            </p>
            <p style={{ margin: 0 }}>
              <strong>Gross Pay</strong> = Basic Pay + Overtime
            </p>
            <p style={{ margin: 0 }}>
              <strong>Net Pay</strong> = Gross Pay - Absence Deduction - Other Deduction
            </p>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        <Divider orientation="left">Employee Information</Divider>

        <Row gutter={[16, 0]}>
          <Col xs={24} md={12}>
            <Form.Item 
              name="employee_id" 
              label="Select Employee"
              rules={[{ required: true, message: 'Please select an employee' }]}
            >
              <Select
                placeholder="Search and select employee"
                showSearch
                optionFilterProp="children"
                onChange={handleEmployeeSelect}
                disabled={isEditing}
                allowClear
                filterOption={(input, option) => {
                  const children = option?.children?.toString?.() || '';
                  return children.toLowerCase().includes(input.toLowerCase());
                }}
              >
                {employees.map(emp => {
                  const displayName = getEmployeeDisplay(emp);
                  const role = emp.Role || emp.department || '';
                  return (
                    <Option key={emp.id} value={emp.id}>
                      <Space>
                        <UserOutlined />
                        <span>{displayName}</span>
                        {role && <span style={{ color: '#8c8c8c', fontSize: 12 }}>({role})</span>}
                        {emp.monthly_salary && (
                          <span style={{ color: '#52c41a', fontSize: 12 }}>
                            AED {emp.monthly_salary.toLocaleString()}
                          </span>
                        )}
                      </Space>
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item 
              name="employee_name" 
              label="Employee Name" 
              rules={[{ required: true, message: 'Employee Name is required' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="Enter employee name" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16, 0]}>
          <Col xs={24} md={12}>
            <Form.Item name="position" label="Position" rules={[{ required: true, message: 'Position is required' }]}>
              <Select placeholder="Select position" showSearch>
                {Object.entries(EmployeeRoles).map(([key, value]) => (
                  <Option key={key} value={value}>{value}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item 
              name="monthly_salary" 
              label="Monthly Salary (AED)" 
              rules={[{ required: true, message: 'Monthly Salary is required' }]}
            >
              <InputNumber 
                style={{ width: '100%' }} 
                min={0} 
                step={100}
                formatter={value => `AED ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                parser={value => value.replace(/AED\s?|(,*)/g, '')}
              />
            </Form.Item>
          </Col>
        </Row>

        {selectedEmployee && !isEditing && (
          <Row gutter={[16, 0]} style={{ marginBottom: 16 }}>
            <Col xs={24}>
              <div style={{ 
                background: '#f0f5ff', 
                padding: '8px 16px', 
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8
              }}>
                <Space>
                  <UserOutlined style={{ color: '#1890ff' }} />
                  <Text>
                    Update salary for <strong>{getEmployeeDisplay(selectedEmployee)}</strong>
                  </Text>
                </Space>
                <Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Current: AED {Number(selectedEmployee.monthly_salary || selectedEmployee.salary || 0).toLocaleString()}
                  </Text>
                  <Switch
                    checked={updateEmployeeSalary}
                    onChange={setUpdateEmployeeSalary}
                    checkedChildren={<CheckOutlined />}
                    unCheckedChildren={<CloseOutlined />}
                  />
                  <Text style={{ fontSize: 12 }}>
                    {updateEmployeeSalary ? 'Update will be saved' : 'Update will not be saved'}
                  </Text>
                </Space>
              </div>
            </Col>
          </Row>
        )}

        <Divider orientation="left">Work Details</Divider>

        <Row gutter={[16, 0]}>
          <Col xs={24} sm={12} md={8}>
            <Form.Item name="days_in_month" label="Days in Month" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={1} max={31} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item name="hours_per_day" label="Hours per Day" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={1} max={24} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item name="working_days" label="Working Days" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0} max={31} />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Attendance & Deductions</Divider>

        <Row gutter={[16, 0]}>
          <Col xs={24} sm={12} md={8}>
            <Form.Item name="absent_days" label="Absent Days">
              <InputNumber style={{ width: '100%' }} min={0} max={31} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item name="overtime_hours" label="Overtime Hours">
              <InputNumber style={{ width: '100%' }} min={0} step={0.5} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item name="other_deduction" label="Other Deduction (AED)">
              <InputNumber 
                style={{ width: '100%' }} 
                min={0} 
                step={50}
                formatter={value => `AED ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                parser={value => value.replace(/AED\s?|(,*)/g, '')}
              />
            </Form.Item>
          </Col>
        </Row>

        <CalculationSummary />

        {/* Hidden period fields */}
        <Form.Item name="period_start" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="period_end" hidden>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PayrollForm;