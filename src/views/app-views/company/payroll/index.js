// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Card, Typography, Table, Input, Button, Row, Col, Space, 
  Statistic, Tooltip, Spin, Divider, message, Popconfirm,
  Avatar, Tag, Select, DatePicker, Alert, Badge, Progress
} from 'antd';
import { 
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, 
  UserOutlined, SortAscendingOutlined, SortDescendingOutlined,
  ReloadOutlined, CalculatorOutlined, CheckCircleOutlined,
  CloseCircleOutlined, WarningOutlined, ClockCircleOutlined,
  SyncOutlined, CalendarOutlined, TeamOutlined
} from '@ant-design/icons';
import { db, collection, getDocs, doc, addDoc, deleteDoc, updateDoc, serverTimestamp, query, where, orderBy, limit } from 'configs/FirebaseConfig';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import PayrollForm from './PayrollForm';
import './employees.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// ─── Constants ──────────────────────────────────────────────────────────────
const ATTENDANCE_STATUSES = {
  'present': { label: 'Present', color: '#52c41a', icon: <CheckCircleOutlined /> },
  'absent': { label: 'Absent', color: '#ff4d4f', icon: <CloseCircleOutlined /> },
  'late': { label: 'Late', color: '#faad14', icon: <WarningOutlined /> },
  'sick_pto': { label: 'Sick/PTO', color: '#1890ff', icon: <ClockCircleOutlined /> },
  'unpaid_leave': { label: 'Unpaid Leave', color: '#fa8c16', icon: <CloseCircleOutlined /> },
  'holiday_nonwork': { label: 'Holiday', color: '#722ed1', icon: <CalendarOutlined /> },
};

// Saturday is the only weekend day (Sunday=0, Monday=1, ... Saturday=6)
const WEEKEND_DAYS = [6];

// ─── Helpers ──────────────────────────────────────────────────────────────
const toDate = t => t?.toDate ? t.toDate() : (t ? new Date(t) : null);
const timeToMins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

const isWeekend = (dateStr) => {
  const dayOfWeek = dayjs(dateStr).day();
  return WEEKEND_DAYS.includes(dayOfWeek);
};

// ─── Calculate Payroll from Attendance ──────────────────────────────────
const calculatePayrollFromAttendance = (attendanceRecords, employee, monthStart, monthEnd) => {
  // Default salary if not set
  const monthlySalary = employee.monthly_salary || employee.salary || 5000;
  
  // Get working days in month (excluding Saturdays)
  let totalWorkingDays = 0;
  const start = dayjs(monthStart);
  const end = dayjs(monthEnd);
  let current = start.clone();
  while (current.isBefore(end.add(1, 'day'), 'day')) {
    if (!isWeekend(current.format('YYYY-MM-DD'))) {
      totalWorkingDays++;
    }
    current = current.add(1, 'day');
  }
  
  // Initialize status counts
  const statusCounts = {
    present: 0,
    absent: 0,
    late: 0,
    sick_pto: 0,
    unpaid_leave: 0,
    holiday_nonwork: 0,
  };
  
  let totalLateMinutes = 0;
  let totalAbsentDays = 0;
  let totalWeekendDays = 0;
  
  // Get all days in the month
  const daysInMonthArray = [];
  current = start.clone();
  while (current.isBefore(end.add(1, 'day'), 'day')) {
    daysInMonthArray.push(current.format('YYYY-MM-DD'));
    current = current.add(1, 'day');
  }
  
  // Process each day
  daysInMonthArray.forEach(dateStr => {
    const isWeekendDay = isWeekend(dateStr);
    const dayRecords = attendanceRecords.filter(r => r.date === dateStr);
    
    // Count weekend days (Saturday only)
    if (isWeekendDay) {
      totalWeekendDays++;
      statusCounts.holiday_nonwork = (statusCounts.holiday_nonwork || 0) + 1;
      return;
    }
    
    if (dayRecords.length === 0) {
      statusCounts.absent = (statusCounts.absent || 0) + 1;
      totalAbsentDays += 1;
      return;
    }
    
    // Get the last status
    const latestRecord = dayRecords[dayRecords.length - 1];
    let status = latestRecord.status || 'absent';
    
    // Treat 'late' as 'present' (no deduction for late)
    if (status === 'late') {
      status = 'present';
    }
    
    if (statusCounts.hasOwnProperty(status)) {
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }
    
    if (latestRecord.delayMins) {
      totalLateMinutes += latestRecord.delayMins;
    }
    
    if (status === 'absent' || status === 'unpaid_leave') {
      totalAbsentDays += 1;
    }
  });
  
  // Calculate working days (only present, late counted as present)
  const workingDays = statusCounts.present;
  const absentDays = totalAbsentDays;
  const lateDays = statusCounts.late || 0;
  
  // ===== CORRECT CALCULATIONS =====
  // Basic Pay = Monthly Salary (when working days = total working days)
  // If working days is less, it's prorated
  const basicPay = monthlySalary * (workingDays / totalWorkingDays);
  
  // Absence Deduction = (Monthly Salary / Working Days In Month) × Absent Days
  const absenceDeduction = totalWorkingDays > 0 
    ? (monthlySalary / totalWorkingDays) * absentDays 
    : 0;
  
  // Gross Pay = Basic Pay + Overtime + Bonus (no overtime/bonus for now)
  const grossPay = basicPay;
  
  // Net Pay = Gross Pay - Absence Deduction - Other Deduction
  const otherDeduction = 0;
  const totalDeduction = absenceDeduction + otherDeduction;
  const netPay = grossPay - totalDeduction;
  
  // Attendance rate
  const attendanceRate = totalWorkingDays > 0 
    ? Math.round((workingDays / totalWorkingDays) * 100) 
    : 0;
  
  return {
    employee_id: employee.id,
    employee_name: `${employee.firstname || ''} ${employee.lastname || ''}`.trim() || 'Unknown',
    position: employee.Role || employee.department || '',
    monthly_salary: monthlySalary,
    total_working_days: totalWorkingDays,
    working_days: workingDays,
    absent_days: absentDays,
    late_days: lateDays,
    late_minutes: Math.round(totalLateMinutes),
    attendance_rate: attendanceRate,
    basic_pay: Math.round(basicPay * 100) / 100,
    absence_deduction: Math.round(absenceDeduction * 100) / 100,
    other_deduction: otherDeduction,
    total_deduction: Math.round(totalDeduction * 100) / 100,
    gross_pay: Math.round(grossPay * 100) / 100,
    net_pay: Math.round(netPay * 100) / 100,
    overtime_pay: 0,
    sick_pay: 0,
    late_deduction: 0,
    attendance_summary: statusCounts,
    calculated_from_attendance: true,
    period_start: dayjs(monthStart).format('YYYY-MM-DD'),
    period_end: dayjs(monthEnd).format('YYYY-MM-DD'),
  };
};

// ─── Main Component ──────────────────────────────────────────────────────
const PayrollPage = () => {
  const user = useSelector(state => state.auth.user);
  const companyId = user?.company_id || '';
  
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [payrollFormVisible, setPayrollFormVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [sortField, setSortField] = useState('employee_name');
  const [sortOrder, setSortOrder] = useState('descend');
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(1, 'month').startOf('month'),
    dayjs().subtract(1, 'month').endOf('month')
  ]);
  const [saving, setSaving] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  // Refs to prevent infinite loops
  const fetchCounter = useRef(0);
  const lastFetchTime = useRef(0);
  
  const [stats, setStats] = useState({
    total: 0,
    total_gross_pay: 0,
    total_net_pay: 0,
    total_employees: 0,
    avg_attendance: 0,
  });

  // ── Optimized: Fetch Employees ──────────────────────────────────────────
  const fetchEmployees = useCallback(async () => {
    if (!companyId) return;
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('company_id', '==', companyId));
      const snapshot = await getDocs(q);
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(users);
      return users;
    } catch (error) {
      console.error('Error fetching employees:', error);
      return [];
    }
  }, [companyId]);

  // ── Optimized: Fetch Mappings ──────────────────────────────────────────
  const fetchMappings = useCallback(async () => {
    if (!companyId) return;
    try {
      const snap = await getDocs(
        query(collection(db, 'attendance_device_mapping'), where('company_id', '==', companyId))
      );
      const mappingsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMappings(mappingsData);
      return mappingsData;
    } catch (error) {
      console.error('Error fetching mappings:', error);
      return [];
    }
  }, [companyId]);

  // ─── Optimized: Fetch Attendance Data with Date Filter ────────────────
  const fetchAttendanceData = useCallback(async (startDate, endDate, empList, mapList) => {
    if (!companyId || !startDate || !endDate) {
      setAttendanceRecords([]);
      return [];
    }
    
    setLoading(true);
    try {
      const start = dayjs(startDate).startOf('day').toDate();
      const end = dayjs(endDate).endOf('day').toDate();
      
      // OPTIMIZED: Query with date range directly in Firestore
      const attendanceRef = collection(db, 'attendance');
      const q = query(
        attendanceRef,
        where('company_id', '==', companyId),
        where('timestamp', '>=', start),
        where('timestamp', '<=', end)
      );
      const snapshot = await getDocs(q);
      
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // OPTIMIZED: Fetch notes only if needed
      const notesRef = collection(db, 'attendance_notes');
      const notesQuery = query(
        notesRef,
        where('company_id', '==', companyId)
      );
      const notesSnapshot = await getDocs(notesQuery);
      const notesMap = {};
      notesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const key = `${data.employeeId}_${data.date}`;
        notesMap[key] = data;
      });
      
      // Create device to employee map
      const deviceToEmployeeMap = {};
      (mapList || mappings).forEach(m => {
        deviceToEmployeeMap[String(m.deviceUserId)] = String(m.crmUserId);
      });
      
      // Group records by employee
      const groupedByEmployee = {};
      const allRecords = [];
      
      // Get all days in range
      const allDays = [];
      let cursor = dayjs(startDate);
      while (cursor.isBefore(dayjs(endDate).add(1, 'day'), 'day')) {
        allDays.push(cursor.format('YYYY-MM-DD'));
        cursor = cursor.add(1, 'day');
      }
      
      // Group records
      records.forEach(record => {
        const deviceUserId = String(record.userId);
        const employeeId = deviceToEmployeeMap[deviceUserId];
        if (!employeeId) return;
        
        const ts = toDate(record.timestamp);
        const dateStr = dayjs(ts).format('YYYY-MM-DD');
        
        if (!groupedByEmployee[employeeId]) {
          groupedByEmployee[employeeId] = {};
        }
        if (!groupedByEmployee[employeeId][dateStr]) {
          groupedByEmployee[employeeId][dateStr] = [];
        }
        groupedByEmployee[employeeId][dateStr].push(record);
      });
      
      // Process each employee
      const empListToUse = empList || employees;
      empListToUse.forEach(emp => {
        const empId = String(emp.id);
        const empRecords = groupedByEmployee[empId] || {};
        const empMappings = (mapList || mappings).filter(m => String(m.crmUserId) === empId);
        const shift = empMappings[0]?.shift || { start: '10:00', end: '16:00' };
        const shiftStartMins = timeToMins(shift.start);
        
        allDays.forEach(dateStr => {
          const dayRecords = empRecords[dateStr] || [];
          let status = 'absent';
          let delayMins = 0;
          
          if (dayRecords.length > 0) {
            const checkIns = dayRecords.filter(p => p.type === 'check-in' || p.punchCode === 0);
            const firstIn = checkIns[0] ? toDate(checkIns[0].timestamp) : null;
            
            if (firstIn) {
              const arrivalMins = dayjs(firstIn).hour() * 60 + dayjs(firstIn).minute();
              delayMins = Math.max(0, arrivalMins - shiftStartMins);
              status = delayMins > 15 ? 'late' : 'present';
            }
          }
          
          const key = `${empId}_${dateStr}`;
          if (notesMap[key]) {
            status = notesMap[key].status;
          }
          
          allRecords.push({
            employeeId: empId,
            employeeName: `${emp.firstname || ''} ${emp.lastname || ''}`.trim() || 'Unknown',
            date: dateStr,
            status: status,
            delayMins: delayMins,
            employee: emp,
            isOverridden: !!notesMap[key],
          });
        });
      });
      
      setAttendanceRecords(allRecords);
      return allRecords;
    } catch (error) {
      console.error('Error fetching attendance:', error);
      message.error('Failed to fetch attendance data');
      return [];
    } finally {
      setLoading(false);
    }
  }, [companyId, employees, mappings]);

  // ─── Optimized: Fetch Payrolls ──────────────────────────────────────────
  const fetchPayrolls = useCallback(async () => {
    if (!companyId) return [];
    try {
      const payrollRef = collection(db, 'payroll');
      const q = query(payrollRef, where('company_id', '==', companyId));
      const payrollSnapshot = await getDocs(q);
      const payrollsList = payrollSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPayrolls(payrollsList);
      return payrollsList;
    } catch (error) {
      console.error('Error fetching payrolls:', error);
      return [];
    }
  }, [companyId]);

  // ─── Get Only Employees with Mappings ──────────────────────────────────
  const mappedEmployees = useMemo(() => {
    const mappedIds = new Set(mappings.map(m => String(m.crmUserId)));
    return employees.filter(emp => mappedIds.has(String(emp.id)));
  }, [employees, mappings]);

  // ─── Auto-Calculate Payroll ──────────────────────────────────────────────
  const calculatedPayrolls = useMemo(() => {
    if (!mappedEmployees.length) return [];
    
    const results = [];
    const monthStart = dateRange[0];
    const monthEnd = dateRange[1];
    
    mappedEmployees.forEach(emp => {
      const empRecords = attendanceRecords.filter(r => r.employeeId === String(emp.id));
      const payroll = calculatePayrollFromAttendance(empRecords, emp, monthStart, monthEnd);
      
      const saved = payrolls.find(p => 
        String(p.employee_id) === String(emp.id) && 
        p.period_start === dayjs(monthStart).format('YYYY-MM-DD') &&
        p.period_end === dayjs(monthEnd).format('YYYY-MM-DD')
      );
      
      if (saved) {
        results.push({ 
          ...saved, 
          id: saved.id, 
          isSaved: true,
          ...payroll,
          calculated_from_attendance: true,
        });
      } else {
        results.push({ 
          ...payroll, 
          id: `calc_${emp.id}`, 
          isSaved: false 
        });
      }
    });
    
    return results;
  }, [mappedEmployees, attendanceRecords, dateRange, payrolls]);

  // ─── Save Payroll to Database ──────────────────────────────────────────
  const savePayrollToDb = useCallback(async (payrollData) => {
    try {
      const existing = payrolls.find(p => 
        String(p.employee_id) === String(payrollData.employee_id) && 
        p.period_start === payrollData.period_start &&
        p.period_end === payrollData.period_end
      );
      
      if (existing) {
        await updateDoc(doc(db, 'payroll', existing.id), {
          ...payrollData,
          LastUpdate: serverTimestamp(),
        });
        return existing.id;
      } else {
        const docRef = await addDoc(collection(db, 'payroll'), {
          ...payrollData,
          company_id: companyId,
          CreationDate: serverTimestamp(),
          LastUpdate: serverTimestamp(),
        });
        return docRef.id;
      }
    } catch (error) {
      console.error('Error saving payroll:', error);
      throw error;
    }
  }, [companyId, payrolls]);

  // ─── Optimized: Auto-Save Payrolls (with debounce) ──────────────────────
  const autoSavePayrolls = useCallback(async () => {
    if (!calculatedPayrolls.length) return;
    
    // Prevent multiple concurrent saves
    if (saving) return;
    
    // Check if we have unsaved records
    const unsaved = calculatedPayrolls.filter(p => !p.isSaved && p.employee_id);
    if (!unsaved.length) return;
    
    setSaving(true);
    try {
      let savedCount = 0;
      
      for (const payroll of unsaved) {
        const { id, isSaved, ...payrollData } = payroll;
        await savePayrollToDb(payrollData);
        savedCount++;
      }
      
      if (savedCount > 0) {
        message.success(`Auto-saved ${savedCount} payroll records for ${dateRange[0].format('MMMM YYYY')}`);
        // Fetch updated payrolls but don't trigger another save cycle
        const updatedPayrolls = await fetchPayrolls();
        setPayrolls(updatedPayrolls);
      }
    } catch (error) {
      console.error('Error auto-saving payrolls:', error);
    } finally {
      setSaving(false);
    }
  }, [calculatedPayrolls, savePayrollToDb, fetchPayrolls, dateRange, saving]);

  // ─── Optimized: Initial Data Load ──────────────────────────────────────
  useEffect(() => {
    const loadInitialData = async () => {
      if (!companyId) return;
      if (initialLoadDone) return;
      
      setLoading(true);
      try {
        // Fetch all data in parallel
        const [empList, mapList, payrollList] = await Promise.all([
          fetchEmployees(),
          fetchMappings(),
          fetchPayrolls()
        ]);
        
        // After employees and mappings are loaded, fetch attendance
        if (empList.length > 0 && mapList.length > 0) {
          await fetchAttendanceData(dateRange[0], dateRange[1], empList, mapList);
        }
        
        setInitialLoadDone(true);
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, [companyId, fetchEmployees, fetchMappings, fetchPayrolls, fetchAttendanceData, dateRange]);

  // ─── Handle Date Range Change ──────────────────────────────────────────
  useEffect(() => {
    if (!initialLoadDone) return;
    
    // Debounce date range changes
    const timer = setTimeout(() => {
      fetchAttendanceData(dateRange[0], dateRange[1]);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [dateRange, fetchAttendanceData, initialLoadDone]);

  // ─── Auto-save when calculated payrolls change (with debounce) ──────────
  useEffect(() => {
    if (!initialLoadDone) return;
    if (loading) return;
    if (calculatedPayrolls.length === 0) return;
    
    // Debounce auto-save
    const timer = setTimeout(() => {
      autoSavePayrolls();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [calculatedPayrolls, autoSavePayrolls, loading, initialLoadDone]);

  // ─── Calculate Statistics ────────────────────────────────────────────
  useEffect(() => {
    const displayData = calculatedPayrolls.filter(p => {
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        return p.employee_name?.toLowerCase().includes(searchLower) ||
               p.position?.toLowerCase().includes(searchLower) ||
               p.employee_id?.includes(searchText);
      }
      return true;
    });
    
    const avgAttendance = displayData.length > 0
      ? Math.round(displayData.reduce((sum, p) => sum + (p.attendance_rate || 0), 0) / displayData.length)
      : 0;
    
    setStats({
      total: displayData.length,
      total_gross_pay: displayData.reduce((sum, p) => sum + (p.gross_pay || 0), 0),
      total_net_pay: displayData.reduce((sum, p) => sum + (p.net_pay || 0), 0),
      total_employees: new Set(displayData.map(p => p.employee_id)).size,
      avg_attendance: avgAttendance,
    });
  }, [calculatedPayrolls, searchText]);

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleSearchChange = (e) => {
    setSearchText(e.target.value);
  };

  const handleAddEditPayroll = (isAdd = true, record = null) => {
    setIsEditing(!isAdd);
    setSelectedPayroll(record);
    setPayrollFormVisible(true);
  };

  const handlePayrollFormSubmit = async (formData) => {
    try {
      const cleanData = { ...formData };
      const { update_employee_salary, ...restData } = cleanData;
      
      const monthlySalary = Number(cleanData.monthly_salary || 0);
      const totalWorkingDays = Number(cleanData.total_working_days || 22);
      const absentDays = Number(cleanData.absent_days || 0);
      const otherDeduction = Number(cleanData.other_deduction || 0);
      const overtimeHours = Number(cleanData.overtime_hours || 0);
      
      // ===== CORRECT CALCULATIONS =====
      // Basic Pay = Monthly Salary (when working days = total working days)
      const workingDays = Number(cleanData.working_days || 0);
      const basicPay = monthlySalary * (workingDays / totalWorkingDays);
      
      // Absence Deduction = (Monthly Salary / Working Days In Month) × Absent Days
      const absenceDeduction = totalWorkingDays > 0 
        ? (monthlySalary / totalWorkingDays) * absentDays 
        : 0;
      
      // Overtime Pay = Overtime Hours × Hourly Rate × 1.5
      const hoursPerDay = Number(cleanData.hours_per_day || 8);
      const hourlyRate = monthlySalary / (totalWorkingDays * hoursPerDay);
      const overtimePay = overtimeHours * hourlyRate * 1.5;
      
      // Gross Pay = Basic Pay + Overtime + Bonus
      const grossPay = basicPay + overtimePay;
      
      // Net Pay = Gross Pay - Absence Deduction - Other Deduction
      const totalDeduction = absenceDeduction + otherDeduction;
      const netPay = grossPay - totalDeduction;

      // Update employee salary if requested
      if (update_employee_salary && cleanData.employee_id && monthlySalary > 0) {
        try {
          const userRef = doc(db, 'users', cleanData.employee_id);
          await updateDoc(userRef, {
            monthly_salary: monthlySalary,
            salary: monthlySalary,
            LastUpdate: serverTimestamp(),
          });
          message.success(`Updated salary for ${cleanData.employee_name}`);
          await fetchEmployees();
        } catch (error) {
          console.error('Error updating employee salary:', error);
          message.warning('Payroll saved but failed to update employee salary');
        }
      }

      const payrollData = {
        ...restData,
        monthly_salary: monthlySalary,
        total_working_days: totalWorkingDays,
        basic_pay: Math.round(basicPay * 100) / 100,
        overtime_pay: Math.round(overtimePay * 100) / 100,
        absence_deduction: Math.round(absenceDeduction * 100) / 100,
        total_deduction: Math.round(totalDeduction * 100) / 100,
        gross_pay: Math.round(grossPay * 100) / 100,
        net_pay: Math.round(netPay * 100) / 100,
        company_id: companyId,
        calculated_from_attendance: false,
        period_start: cleanData.period_start || dayjs(dateRange[0]).format('YYYY-MM-DD'),
        period_end: cleanData.period_end || dayjs(dateRange[1]).format('YYYY-MM-DD'),
        sick_pay: 0,
        late_deduction: 0,
      };

      if (isEditing && selectedPayroll) {
        await updateDoc(doc(db, 'payroll', selectedPayroll.id), {
          ...payrollData,
          LastUpdate: serverTimestamp(),
        });
        message.success('Payroll updated successfully');
      } else {
        await addDoc(collection(db, 'payroll'), {
          ...payrollData,
          CreationDate: serverTimestamp(),
          LastUpdate: serverTimestamp(),
        });
        message.success('Payroll added successfully');
      }

      setPayrollFormVisible(false);
      const updatedPayrolls = await fetchPayrolls();
      setPayrolls(updatedPayrolls);
    } catch (error) {
      console.error('Error saving payroll:', error);
      message.error('Failed to save payroll');
    }
  };

  const handleDeletePayroll = async (payrollId) => {
    try {
      await deleteDoc(doc(db, 'payroll', payrollId));
      message.success('Payroll deleted successfully');
      const updatedPayrolls = await fetchPayrolls();
      setPayrolls(updatedPayrolls);
    } catch (error) {
      console.error('Error deleting payroll:', error);
      message.error('Failed to delete payroll');
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const [empList, mapList, payrollList] = await Promise.all([
        fetchEmployees(),
        fetchMappings(),
        fetchPayrolls()
      ]);
      if (empList.length > 0 && mapList.length > 0) {
        await fetchAttendanceData(dateRange[0], dateRange[1], empList, mapList);
      }
      message.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      message.error('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  // ─── Table Data ──────────────────────────────────────────────────────
  const tableData = useMemo(() => {
    let data = [...calculatedPayrolls];
    
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      data = data.filter(p => 
        p.employee_name?.toLowerCase().includes(searchLower) ||
        p.position?.toLowerCase().includes(searchLower) ||
        p.employee_id?.includes(searchText)
      );
    }
    
    if (sortField && sortOrder) {
      data.sort((a, b) => {
        let aValue = a[sortField] || '';
        let bValue = b[sortField] || '';
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue ? bValue.toLowerCase() : '';
        } else {
          aValue = aValue || 0;
          bValue = bValue || 0;
        }
        return sortOrder === 'ascend' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
      });
    }
    
    return data;
  }, [calculatedPayrolls, searchText, sortField, sortOrder]);

  // ─── Columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Employee',
      dataIndex: 'employee_name',
      key: 'employee_name',
      width: 180,
      fixed: 'left',
      sorter: true,
      sortOrder: sortField === 'employee_name' && sortOrder,
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }}>
            {text?.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <Text strong style={{ fontSize: 13 }}>{text || 'N/A'}</Text>
            <div>
              <Tag color="blue" style={{ fontSize: 9 }}>From Attendance</Tag>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Position',
      dataIndex: 'position',
      key: 'position',
      width: 120,
      sorter: true,
      sortOrder: sortField === 'position' && sortOrder,
      render: (text) => <Text style={{ fontSize: 12 }}>{text || '-'}</Text>,
    },
    {
      title: 'Attendance Rate',
      dataIndex: 'attendance_rate',
      key: 'attendance_rate',
      width: 130,
      align: 'center',
      sorter: true,
      sortOrder: sortField === 'attendance_rate' && sortOrder,
      render: (value) => (
        <Progress 
          percent={value || 0} 
          size="small" 
          status={value >= 80 ? 'success' : value >= 60 ? 'active' : 'exception'}
          format={percent => `${percent}%`}
          style={{ width: 100 }}
        />
      ),
    },
    {
      title: 'Present',
      dataIndex: 'working_days',
      key: 'working_days',
      width: 80,
      align: 'center',
      sorter: true,
      sortOrder: sortField === 'working_days' && sortOrder,
      render: (value) => (
        <Tag color="green" style={{ fontWeight: 600 }}>{value || 0}</Tag>
      ),
    },
    {
      title: 'Absent',
      dataIndex: 'absent_days',
      key: 'absent_days',
      width: 80,
      align: 'center',
      sorter: true,
      sortOrder: sortField === 'absent_days' && sortOrder,
      render: (value) => (
        <Text style={{ color: value > 0 ? '#ff4d4f' : '#52c41a', fontWeight: value > 0 ? 700 : 400 }}>
          {value || 0}
        </Text>
      ),
    },
    {
      title: 'Total Days',
      dataIndex: 'total_working_days',
      key: 'total_working_days',
      width: 90,
      align: 'center',
      sorter: true,
      sortOrder: sortField === 'total_working_days' && sortOrder,
      render: (value) => (
        <Text>{value || 0}</Text>
      ),
    },
    {
      title: 'Late (min)',
      dataIndex: 'late_minutes',
      key: 'late_minutes',
      width: 100,
      align: 'center',
      sorter: true,
      sortOrder: sortField === 'late_minutes' && sortOrder,
      render: (value, record) => (
        <Tooltip title={`${record.late_days || 0} late days (No deduction)`}>
          <Tag color="orange" style={{ fontWeight: 600 }}>
            {value || 0} min
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: 'Basic Pay',
      dataIndex: 'basic_pay',
      key: 'basic_pay',
      width: 120,
      align: 'right',
      sorter: true,
      sortOrder: sortField === 'basic_pay' && sortOrder,
      render: (value) => (
        <Text strong style={{ color: '#52c41a' }}>
          AED {value?.toLocaleString() || '0'}
        </Text>
      ),
    },
    {
      title: 'Deductions',
      dataIndex: 'total_deduction',
      key: 'total_deduction',
      width: 120,
      align: 'right',
      sorter: true,
      sortOrder: sortField === 'total_deduction' && sortOrder,
      render: (value) => (
        <Text style={{ color: '#ff4d4f' }}>
          AED {value?.toLocaleString() || '0'}
        </Text>
      ),
    },
    {
      title: 'Net Pay',
      dataIndex: 'net_pay',
      key: 'net_pay',
      width: 130,
      align: 'right',
      fixed: 'right',
      sorter: true,
      sortOrder: sortField === 'net_pay' && sortOrder,
      render: (value) => (
        <Text strong style={{ color: value > 0 ? '#1890ff' : '#ff4d4f', fontSize: 15 }}>
          AED {value?.toLocaleString() || '0'}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 100,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Edit">
            <Button 
              icon={<EditOutlined />} 
              size="small" 
              type="primary"
              ghost
              onClick={() => handleAddEditPayroll(false, record)}
            />
          </Tooltip>
          {record.isSaved && (
            <Popconfirm
              title="Delete this payroll record?"
              onConfirm={() => handleDeletePayroll(record.id)}
            >
              <Button icon={<DeleteOutlined />} size="small" danger />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // ─── Date Presets ──────────────────────────────────────────────────────
  const datePresets = [
    { label: 'Current Month', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
    { label: 'Last Month', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
    { label: 'Last 2 Months', value: [dayjs().subtract(2, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
    { label: 'This Quarter', value: [dayjs().startOf('quarter'), dayjs().endOf('quarter')] },
  ];

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div className="employees-container" style={{ padding: '12px 16px' }}>
      {/* Header */}
      <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: '16px 20px' }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={16} md={18}>
            <Title level={3} style={{ margin: 0, fontSize: 'clamp(18px, 2.5vw, 28px)' }}>
              <CalculatorOutlined style={{ marginRight: 10, color: '#1890ff' }} />
              Payroll Management
            </Title>
            <Text type="secondary" style={{ fontSize: 'clamp(11px, 1.2vw, 14px)' }}>
              {dateRange[0].format('MMMM YYYY')} • {mappedEmployees.length} employees linked • 
              {saving && <SyncOutlined spin style={{ marginLeft: 6 }} />} 
              {saving ? ' Saving...' : ' Auto-saving'}
            </Text>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Space wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button 
                icon={<ReloadOutlined />} 
                size="small"
                onClick={handleRefresh}
                loading={loading}
              >
                Refresh
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                size="small"
                onClick={() => handleAddEditPayroll(true)}
              >
                Add Manual
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Stats - Responsive */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6} md={6}>
          <Card size="small" bodyStyle={{ padding: '10px 12px' }}>
            <Statistic 
              title="Linked Employees" 
              value={stats.total_employees || 0} 
              prefix={<TeamOutlined />}
              valueStyle={{ fontSize: 'clamp(18px, 2vw, 24px)' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card size="small" bodyStyle={{ padding: '10px 12px' }}>
            <Statistic 
              title="Payroll Records" 
              value={stats.total} 
              prefix={<CalculatorOutlined />}
              valueStyle={{ fontSize: 'clamp(18px, 2vw, 24px)' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card size="small" bodyStyle={{ padding: '10px 12px' }}>
            <Statistic 
              title="Total Gross Pay" 
              value={stats.total_gross_pay} 
              valueStyle={{ color: '#52c41a', fontSize: 'clamp(14px, 1.6vw, 20px)' }}
              formatter={value => `AED ${value.toLocaleString()}`}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card size="small" bodyStyle={{ padding: '10px 12px' }}>
            <Statistic 
              title="Avg Attendance" 
              value={stats.avg_attendance} 
              suffix="%"
              valueStyle={{ 
                color: stats.avg_attendance >= 80 ? '#52c41a' : '#faad14',
                fontSize: 'clamp(18px, 2vw, 24px)'
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Table Card */}
      <Card style={{ overflow: 'hidden' }}>
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={8}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search by name, position..."
              value={searchText}
              onChange={handleSearchChange}
              allowClear
              size="middle"
            />
          </Col>
          <Col xs={24} md={12}>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              format="DD MMM YYYY"
              presets={datePresets}
              style={{ width: '100%' }}
              picker="month"
              size="middle"
            />
          </Col>
          <Col xs={24} md={4}>
            <Button 
              onClick={() => { setSearchText(''); }}
              style={{ width: '100%' }}
              size="middle"
            >
              Reset Filters
            </Button>
          </Col>
        </Row>

        <Alert
          message="Payroll Calculation Rules"
          description={
            <div style={{ fontSize: 'clamp(11px, 1vw, 13px)' }}>
              <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                <li><strong>Basic Pay</strong> = Monthly Salary × (Working Days / Total Working Days)</li>
                <li><strong>Absence Deduction</strong> = (Monthly Salary / Total Working Days) × Absent Days</li>
                <li><strong>Gross Pay</strong> = Basic Pay + Overtime + Bonus</li>
                <li><strong>Net Pay</strong> = Gross Pay - Absence Deduction - Other Deduction</li>
                <li><strong>Weekend:</strong> Saturday only (no deduction, no pay)</li>
                <li><strong>Late:</strong> <span style={{ color: '#faad14' }}>Information only</span> - No deduction</li>
              </ul>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Table 
          columns={columns} 
          dataSource={tableData} 
          rowKey="id" 
          loading={loading || saving}
          pagination={{ 
            defaultPageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} records`,
            size: 'small',
          }}
          scroll={{ x: 1200 }}
          size="small"
          bordered
          className="attendance-table"
        />
      </Card>

      <PayrollForm
        visible={payrollFormVisible}
        onCancel={() => setPayrollFormVisible(false)}
        onSubmit={handlePayrollFormSubmit}
        isEditing={isEditing}
        initialValues={selectedPayroll}
        employees={mappedEmployees}
        dateRange={dateRange}
      />
    </div>
  );
};

export default PayrollPage;