// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Card, Typography, Table, Input, Button, Row, Col, Space, 
  Statistic, Tooltip, Spin, Divider, message, Popconfirm,
  Avatar, Tag, Select, DatePicker, Alert, Badge, Progress,
  Empty, Skeleton, theme
} from 'antd';
import { 
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, 
  UserOutlined, SortAscendingOutlined, SortDescendingOutlined,
  ReloadOutlined, CalculatorOutlined, CheckCircleOutlined,
  CloseCircleOutlined, WarningOutlined, ClockCircleOutlined,
  SyncOutlined, CalendarOutlined, TeamOutlined, DollarOutlined,
  FileExcelOutlined, PrinterOutlined, FilterOutlined
} from '@ant-design/icons';
import { db, collection, getDocs, doc, addDoc, deleteDoc, updateDoc, serverTimestamp, query, where, orderBy, limit } from 'configs/FirebaseConfig';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import PayrollForm from './PayrollForm';
import './employees.css';
import { LRUCache } from 'lru-cache';

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

const WEEKEND_DAYS = [0];

// ─── Cache Configuration ──────────────────────────────────────────────────
const CACHE_CONFIG = {
  employees: { max: 100, ttl: 1000 * 60 * 15 },
  mappings: { max: 50, ttl: 1000 * 60 * 30 },
  payrolls: { max: 200, ttl: 1000 * 60 * 5 },
  attendance: { max: 150, ttl: 1000 * 60 * 2 },
  notes: { max: 200, ttl: 1000 * 60 * 5 },
};

const cacheInstances = {
  employees: new LRUCache(CACHE_CONFIG.employees),
  mappings: new LRUCache(CACHE_CONFIG.mappings),
  payrolls: new LRUCache(CACHE_CONFIG.payrolls),
  attendance: new LRUCache(CACHE_CONFIG.attendance),
  notes: new LRUCache(CACHE_CONFIG.notes),
};

// ─── Firestore Query Optimizer ──────────────────────────────────────────────
class FirestoreQueryOptimizer {
  constructor() {
    this.pendingRequests = new Map();
    this.requestCount = 0;
    this.requestLimit = 80000;
    this.lastResetDate = dayjs().format('YYYY-MM-DD');
  }

  isQuotaExceeded() {
    const today = dayjs().format('YYYY-MM-DD');
    if (today !== this.lastResetDate) {
      this.requestCount = 0;
      this.lastResetDate = today;
    }
    return this.requestCount >= this.requestLimit * 0.9;
  }

  trackRequest() {
    this.requestCount++;
    if (this.requestCount % 100 === 0) {
      console.log(`Firestore requests today: ${this.requestCount}/${this.requestLimit}`);
    }
  }

  getRequest(key, requestFn) {
    if (this.isQuotaExceeded()) {
      console.warn('Firestore quota nearing limit, using cached data');
      return Promise.reject(new Error('QUOTA_EXCEEDED'));
    }

    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    const promise = requestFn()
      .then(result => {
        this.pendingRequests.delete(key);
        this.trackRequest();
        return result;
      })
      .catch(error => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }
}

const queryOptimizer = new FirestoreQueryOptimizer();

// ─── Helpers ──────────────────────────────────────────────────────────────
const toDate = t => t?.toDate ? t.toDate() : (t ? new Date(t) : null);
const timeToMins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

const isWeekend = (dateStr) => {
  const dayOfWeek = dayjs(dateStr).day();
  return WEEKEND_DAYS.includes(dayOfWeek);
};

// ─── Calculate Payroll from Attendance (Monthly Salary Model) ────────────
const calculatePayrollFromAttendance = (
  attendanceRecords,
  employee,
  monthStart,
  monthEnd
) => {
  const monthlySalary =
    Number(employee.monthly_salary || employee.salary || 5000);

  const start = dayjs(monthStart);
  const end = dayjs(monthEnd);

  const daysInMonth = end.diff(start, "day") + 1;

  // Build all days in selected period
  const daysArray = [];
  let current = start.clone();

  while (current.isBefore(end.add(1, "day"), "day")) {
    daysArray.push(current.format("YYYY-MM-DD"));
    current = current.add(1, "day");
  }

  // Attendance summary
  const statusCounts = {
    present: 0,
    absent: 0,
    late: 0,
    sick_pto: 0,
    unpaid_leave: 0,
    holiday_nonwork: 0,
  };

  let workingDays = 0;
  let totalAbsentDays = 0;
  let totalLateMinutes = 0;

  // Process attendance
  daysArray.forEach((dateStr) => {
    const weekend = isWeekend(dateStr);

    // Skip weekends
    if (weekend) {
      statusCounts.holiday_nonwork++;
      return;
    }

    const dayRecords = attendanceRecords.filter(
      (r) => r.date === dateStr
    );

    // No record = absent
    if (dayRecords.length === 0) {
      statusCounts.absent++;
      totalAbsentDays++;
      return;
    }

    const latestRecord =
      dayRecords[dayRecords.length - 1];

    let status = latestRecord.status || "absent";

    // Treat late as present
    if (status === "late") {
      statusCounts.late++;

      if (latestRecord.delayMins) {
        totalLateMinutes += Number(
          latestRecord.delayMins
        );
      }

      status = "present";
    }

    switch (status) {
      case "present":
        statusCounts.present++;
        workingDays++;
        break;

      case "absent":
        statusCounts.absent++;
        totalAbsentDays++;
        break;

      case "unpaid_leave":
        statusCounts.unpaid_leave++;
        totalAbsentDays++;
        break;

      case "sick_pto":
        statusCounts.sick_pto++;
        workingDays++;
        break;

      default:
        if (statusCounts[status] !== undefined) {
          statusCounts[status]++;
        }
        break;
    }
  });

  // ─── Payroll Calculations ─────────────────────────────────────────────

  const dailyRate =
    daysInMonth > 0
      ? monthlySalary / daysInMonth
      : 0;

  // Full monthly salary
  const basicPay = monthlySalary;

  // Deduct absences
  const absenceDeduction =
    totalAbsentDays * dailyRate;

  // Overtime placeholder
  const overtimePay = 0;

  // Additional deductions
  const otherDeduction = 0;

  // Gross Pay
  const grossPay =
    basicPay + overtimePay;

  // Total Deduction
  const totalDeduction =
    absenceDeduction + otherDeduction;

  // Net Pay
  const netPay = Math.max(
    0,
    grossPay - totalDeduction
  );

  // Attendance %
  const totalAttendanceDays =
    workingDays + totalAbsentDays;

  const attendanceRate =
    totalAttendanceDays > 0
      ? Math.round(
          (workingDays /
            totalAttendanceDays) *
            100
        )
      : 0;

  return {
    employee_id: employee.id,

    employee_name:
      `${employee.firstname || ""} ${
        employee.lastname || ""
      }`.trim() || "Unknown",

    position:
      employee.Role ||
      employee.department ||
      "",

    monthly_salary: monthlySalary,

    days_in_month: daysInMonth,

    working_days: workingDays,

    absent_days: totalAbsentDays,

    late_minutes: Math.round(
      totalLateMinutes
    ),

    attendance_rate: attendanceRate,

    daily_rate: Number(
      dailyRate.toFixed(2)
    ),

    basic_pay: Number(
      basicPay.toFixed(2)
    ),

    overtime_pay: Number(
      overtimePay.toFixed(2)
    ),

    absence_deduction: Number(
      absenceDeduction.toFixed(2)
    ),

    other_deduction: Number(
      otherDeduction.toFixed(2)
    ),

    total_deduction: Number(
      totalDeduction.toFixed(2)
    ),

    gross_pay: Number(
      grossPay.toFixed(2)
    ),

    net_pay: Number(
      netPay.toFixed(2)
    ),

    sick_pay: 0,

    late_deduction: 0,

    attendance_summary: statusCounts,

    calculated_from_attendance: true,

    period_start: start.format(
      "YYYY-MM-DD"
    ),

    period_end: end.format(
      "YYYY-MM-DD"
    ),
  };
};

// ─── Main Component ──────────────────────────────────────────────────────
const PayrollPage = () => {
  const { token } = theme.useToken();
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
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  
  const fetchCounter = useRef(0);
  const lastFetchTime = useRef(0);
  const dataLoadedRef = useRef({
    employees: false,
    mappings: false,
    payrolls: false,
    attendance: false,
    notes: false,
  });
  
  const [stats, setStats] = useState({
    total: 0,
    total_gross_pay: 0,
    total_net_pay: 0,
    total_employees: 0,
    avg_attendance: 0,
  });

  // ── Optimized: Fetch Employees with Cache ──────────────────────────────
  const fetchEmployees = useCallback(async (forceRefresh = false) => {
    if (!companyId) return [];
    
    const cacheKey = `employees_${companyId}`;
    const cached = cacheInstances.employees.get(cacheKey);
    
    if (!forceRefresh && cached && dataLoadedRef.current.employees) {
      setEmployees(cached);
      return cached;
    }
    
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('company_id', '==', companyId));
      const snapshot = await queryOptimizer.getRequest(cacheKey, () => getDocs(q));
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      cacheInstances.employees.set(cacheKey, users);
      setEmployees(users);
      dataLoadedRef.current.employees = true;
      return users;
    } catch (error) {
      if (error.message !== 'QUOTA_EXCEEDED') console.error('Error fetching employees:', error);
      return [];
    }
  }, [companyId]);

  // ── Optimized: Fetch Mappings with Cache ──────────────────────────────
  const fetchMappings = useCallback(async (forceRefresh = false) => {
    if (!companyId) return [];
    
    const cacheKey = `mappings_${companyId}`;
    const cached = cacheInstances.mappings.get(cacheKey);
    
    if (!forceRefresh && cached && dataLoadedRef.current.mappings) {
      setMappings(cached);
      return cached;
    }
    
    try {
      const snap = await queryOptimizer.getRequest(
        cacheKey,
        () => getDocs(query(collection(db, 'attendance_device_mapping'), where('company_id', '==', companyId)))
      );
      const mappingsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      cacheInstances.mappings.set(cacheKey, mappingsData);
      setMappings(mappingsData);
      dataLoadedRef.current.mappings = true;
      return mappingsData;
    } catch (error) {
      if (error.message !== 'QUOTA_EXCEEDED') console.error('Error fetching mappings:', error);
      return [];
    }
  }, [companyId]);

  // ── Optimized: Fetch Payrolls with Cache ──────────────────────────────
  const fetchPayrolls = useCallback(async (forceRefresh = false) => {
    if (!companyId) return [];
    
    const cacheKey = `payrolls_${companyId}`;
    const cached = cacheInstances.payrolls.get(cacheKey);
    
    if (!forceRefresh && cached && dataLoadedRef.current.payrolls) {
      setPayrolls(cached);
      return cached;
    }
    
    try {
      const payrollRef = collection(db, 'payroll');
      const q = query(payrollRef, where('company_id', '==', companyId));
      const payrollSnapshot = await queryOptimizer.getRequest(cacheKey, () => getDocs(q));
      const payrollsList = payrollSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      cacheInstances.payrolls.set(cacheKey, payrollsList);
      setPayrolls(payrollsList);
      dataLoadedRef.current.payrolls = true;
      return payrollsList;
    } catch (error) {
      if (error.message !== 'QUOTA_EXCEEDED') console.error('Error fetching payrolls:', error);
      return [];
    }
  }, [companyId]);

  // ── Optimized: Fetch Attendance Notes with Cache ──────────────────────
  const fetchAttendanceNotes = useCallback(async (forceRefresh = false) => {
    if (!companyId) return {};
    
    const cacheKey = `notes_${companyId}`;
    const cached = cacheInstances.notes.get(cacheKey);
    if (!forceRefresh && cached) return cached;
    
    try {
      const notesRef = collection(db, 'attendance_notes');
      const notesQuery = query(notesRef, where('company_id', '==', companyId));
      const notesSnapshot = await queryOptimizer.getRequest(cacheKey, () => getDocs(notesQuery));
      const notesMap = {};
      notesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const key = `${data.employeeId}_${data.date}`;
        notesMap[key] = data;
      });
      cacheInstances.notes.set(cacheKey, notesMap);
      return notesMap;
    } catch (error) {
      if (error.message !== 'QUOTA_EXCEEDED') console.error('Error fetching notes:', error);
      return {};
    }
  }, [companyId]);

  // ─── Optimized: Fetch Attendance Data with Cache ──────────────────────
  const fetchAttendanceData = useCallback(async (startDate, endDate, forceRefresh = false) => {
    if (!companyId || !startDate || !endDate) {
      setAttendanceRecords([]);
      return [];
    }
    
    const startStr = dayjs(startDate).format('YYYY-MM-DD');
    const endStr = dayjs(endDate).format('YYYY-MM-DD');
    const cacheKey = `attendance_${companyId}_${startStr}_${endStr}`;
    const cached = cacheInstances.attendance.get(cacheKey);
    
    if (!forceRefresh && cached && dataLoadedRef.current.attendance) {
      setAttendanceRecords(cached);
      return cached;
    }
    
    setLoading(true);
    try {
      const start = dayjs(startDate).startOf('day').toDate();
      const end = dayjs(endDate).endOf('day').toDate();
      
      const attendanceRef = collection(db, 'attendance');
      const q = query(
        attendanceRef,
        where('company_id', '==', companyId),
        where('timestamp', '>=', start),
        where('timestamp', '<=', end)
      );
      const snapshot = await queryOptimizer.getRequest(`${cacheKey}_records`, () => getDocs(q));
      
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const notesMap = await fetchAttendanceNotes(forceRefresh);
      const currentMappings = mappings.length ? mappings : await fetchMappings();
      
      const deviceToEmployeeMap = {};
      currentMappings.forEach(m => {
        deviceToEmployeeMap[String(m.deviceUserId)] = String(m.crmUserId);
      });
      
      const groupedByEmployee = {};
      const allRecords = [];
      
      const allDays = [];
      let cursor = dayjs(startDate);
      while (cursor.isBefore(dayjs(endDate).add(1, 'day'), 'day')) {
        allDays.push(cursor.format('YYYY-MM-DD'));
        cursor = cursor.add(1, 'day');
      }
      
      records.forEach(record => {
        const deviceUserId = String(record.userId);
        const employeeId = deviceToEmployeeMap[deviceUserId];
        if (!employeeId) return;
        
        const ts = toDate(record.timestamp);
        const dateStr = dayjs(ts).format('YYYY-MM-DD');
        
        if (!groupedByEmployee[employeeId]) groupedByEmployee[employeeId] = {};
        if (!groupedByEmployee[employeeId][dateStr]) groupedByEmployee[employeeId][dateStr] = [];
        groupedByEmployee[employeeId][dateStr].push(record);
      });
      
      const currentEmployees = employees.length ? employees : await fetchEmployees();
      currentEmployees.forEach(emp => {
        const empId = String(emp.id);
        const empRecords = groupedByEmployee[empId] || {};
        const empMappings = currentMappings.filter(m => String(m.crmUserId) === empId);
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
          if (notesMap[key]) status = notesMap[key].status || status;
          
          allRecords.push({
            employeeId: empId,
            employeeName: `${emp.firstname || ''} ${emp.lastname || ''}`.trim() || 'Unknown',
            date: dateStr,
            status,
            delayMins,
            employee: emp,
            isOverridden: !!notesMap[key],
          });
        });
      });
      
      cacheInstances.attendance.set(cacheKey, allRecords);
      setAttendanceRecords(allRecords);
      dataLoadedRef.current.attendance = true;
      return allRecords;
    } catch (error) {
      if (error.message !== 'QUOTA_EXCEEDED') {
        console.error('Error fetching attendance:', error);
        message.error('Failed to fetch attendance data');
      }
      return [];
    } finally {
      setLoading(false);
    }
  }, [companyId, employees, mappings, fetchEmployees, fetchMappings, fetchAttendanceNotes]);

  // ─── Get Only Employees with Mappings ──────────────────────────────────
  const mappedEmployees = useMemo(() => {
    const mappedIds = new Set(mappings.map(m => String(m.crmUserId)));
    return employees.filter(emp => mappedIds.has(String(emp.id)));
  }, [employees, mappings]);

  // ─── ✅ FIX: Auto-Calculate Payroll — saved records keep their DB values ──
  const calculatedPayrolls = useMemo(() => {
    if (!mappedEmployees.length) return [];
    
    const results = [];
    const monthStart = dateRange[0];
    const monthEnd = dateRange[1];
    
    mappedEmployees.forEach(emp => {
      const empRecords = attendanceRecords.filter(r => r.employeeId === String(emp.id));
      const autoCalc = calculatePayrollFromAttendance(empRecords, emp, monthStart, monthEnd);
      
      const saved = payrolls.find(p =>
        String(p.employee_id) === String(emp.id) &&
        p.period_start === dayjs(monthStart).format('YYYY-MM-DD') &&
        p.period_end === dayjs(monthEnd).format('YYYY-MM-DD')
      );
      
      if (saved) {
        // ✅ FIXED: Use saved DB values as the source of truth.
        // Only pull attendance_rate + attendance_summary from auto-calc (display-only stats).
        results.push({
          ...autoCalc,                        // base shape (attendance stats)
          ...saved,                           // DB values WIN — preserves manual edits
          id: saved.id,
          isSaved: true,
          attendance_rate: autoCalc.attendance_rate,
          attendance_summary: autoCalc.attendance_summary,
          calculated_from_attendance: true,
        });
      } else {
        results.push({
          ...autoCalc,
          id: `calc_${emp.id}`,
          isSaved: false,
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

  // ─── Optimized: Auto-Save Payrolls ──────────────────────────────────────
  const autoSavePayrolls = useCallback(async () => {
    if (!calculatedPayrolls.length || saving) return;
    
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
        const cacheKey = `payrolls_${companyId}`;
        cacheInstances.payrolls.delete(cacheKey);
        const updatedPayrolls = await fetchPayrolls(true);
        setPayrolls(updatedPayrolls);
      }
    } catch (error) {
      console.error('Error auto-saving payrolls:', error);
    } finally {
      setSaving(false);
    }
  }, [calculatedPayrolls, savePayrollToDb, fetchPayrolls, dateRange, saving, companyId]);

  // ─── Optimized: Initial Data Load ──────────────────────────────────────
  useEffect(() => {
    const loadInitialData = async () => {
      if (!companyId || initialLoadDone) return;
      
      setLoading(true);
      try {
        const [empList, mapList, payrollList] = await Promise.all([
          fetchEmployees(false),
          fetchMappings(false),
          fetchPayrolls(false),
        ]);
        
        if (empList.length > 0 && mapList.length > 0) {
          await fetchAttendanceData(dateRange[0], dateRange[1], false);
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
    
    const timer = setTimeout(() => {
      dataLoadedRef.current.attendance = false;
      fetchAttendanceData(dateRange[0], dateRange[1], false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [dateRange, fetchAttendanceData, initialLoadDone]);

  // ─── Auto-save when calculated payrolls change ──────────────────────────
  useEffect(() => {
    if (!initialLoadDone || loading || calculatedPayrolls.length === 0) return;
    
    const timer = setTimeout(() => { autoSavePayrolls(); }, 2000);
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
  const handleSearchChange = (e) => setSearchText(e.target.value);

  const handleAddEditPayroll = (isAdd = true, record = null) => {
    setIsEditing(!isAdd);
    setSelectedPayroll(record);
    setPayrollFormVisible(true);
  };

  // ─── ✅ FIX: Handle Payroll Form Submit — trust pre-calculated values from form ──
  const handlePayrollFormSubmit = async (formData) => {
    try {
      const { update_employee_salary, ...restData } = formData;

      // Update employee salary in users collection if requested
      if (update_employee_salary && restData.employee_id && restData.monthly_salary > 0) {
        try {
          const userRef = doc(db, 'users', restData.employee_id);
          await updateDoc(userRef, {
            monthly_salary: restData.monthly_salary,
            salary: restData.monthly_salary,
            LastUpdate: serverTimestamp(),
          });
          message.success(`Updated salary for ${restData.employee_name}`);
          
          const cacheKey = `employees_${companyId}`;
          cacheInstances.employees.delete(cacheKey);
          await fetchEmployees(true);
        } catch (error) {
          console.error('Error updating employee salary:', error);
          message.warning('Payroll saved but failed to update employee salary');
        }
      }

      // ✅ FIXED: Use the pre-calculated values sent by the form (basic_pay, net_pay, etc.)
      // instead of recalculating from scratch here. The form already computed these correctly.
      const payrollData = {
        ...restData,
        company_id: companyId,
        calculated_from_attendance: false,
        period_start: restData.period_start || dayjs(dateRange[0]).format('YYYY-MM-DD'),
        period_end: restData.period_end || dayjs(dateRange[1]).format('YYYY-MM-DD'),
        sick_pay: restData.sick_pay ?? 0,
        late_deduction: restData.late_deduction ?? 0,
      };

      if (isEditing && selectedPayroll && selectedPayroll.id && !selectedPayroll.id.startsWith('calc_')) {
        // Update existing saved payroll
        const payrollRef = doc(db, 'payroll', selectedPayroll.id);
        await updateDoc(payrollRef, {
          ...payrollData,
          LastUpdate: serverTimestamp(),
        });
        message.success('Payroll updated successfully');
      } else {
        // Add new payroll (or convert auto-calc to saved)
        await addDoc(collection(db, 'payroll'), {
          ...payrollData,
          CreationDate: serverTimestamp(),
          LastUpdate: serverTimestamp(),
        });
        message.success('Payroll saved successfully');
      }

      setPayrollFormVisible(false);
      setIsEditing(false);
      setSelectedPayroll(null);

      // Invalidate cache and refresh
      const cacheKey = `payrolls_${companyId}`;
      cacheInstances.payrolls.delete(cacheKey);
      await fetchPayrolls(true);
    } catch (error) {
      console.error('Error saving payroll:', error);
      message.error('Failed to save payroll: ' + error.message);
    }
  };

  const handleDeletePayroll = async (payrollId) => {
    try {
      await deleteDoc(doc(db, 'payroll', payrollId));
      message.success('Payroll deleted successfully');
      
      const cacheKey = `payrolls_${companyId}`;
      cacheInstances.payrolls.delete(cacheKey);
      const updatedPayrolls = await fetchPayrolls(true);
      setPayrolls(updatedPayrolls);
    } catch (error) {
      console.error('Error deleting payroll:', error);
      message.error('Failed to delete payroll');
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      Object.values(cacheInstances).forEach(cache => cache.clear());
      
      dataLoadedRef.current = {
        employees: false,
        mappings: false,
        payrolls: false,
        attendance: false,
        notes: false,
      };
      
      const [empList, mapList] = await Promise.all([
        fetchEmployees(true),
        fetchMappings(true),
        fetchPayrolls(true),
      ]);
      
      if (empList.length > 0 && mapList.length > 0) {
        await fetchAttendanceData(dateRange[0], dateRange[1], true);
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

  // ─── Enhanced Columns ──────────────────────────────────────────────────
  const columns = [
    {
      title: 'Employee',
      dataIndex: 'employee_name',
      key: 'employee_name',
      width: 200,
      fixed: 'left',
      sorter: true,
      sortOrder: sortField === 'employee_name' && sortOrder,
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar
            icon={<UserOutlined />}
            style={{ backgroundColor: record.isSaved ? '#1890ff' : '#52c41a', flexShrink: 0 }}
            size={40}
          >
            {text?.charAt(0).toUpperCase()}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <Text strong ellipsis style={{ fontSize: 14, display: 'block' }}>{text || 'N/A'}</Text>
            <Space size={4}>
              {record.isSaved ? (
                <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>Saved</Tag>
              ) : (
                <Tag color="green" style={{ fontSize: 10, margin: 0 }}>Auto</Tag>
              )}
              {record.calculated_from_attendance && (
                <Tag color="purple" style={{ fontSize: 10, margin: 0 }}>From Attendance</Tag>
              )}
            </Space>
          </div>
        </div>
      ),
    },
    {
      title: 'Position',
      dataIndex: 'position',
      key: 'position',
      width: 130,
      sorter: true,
      sortOrder: sortField === 'position' && sortOrder,
      render: (text) => <Text style={{ fontSize: 12 }} ellipsis>{text || '-'}</Text>,
    },
    {
      title: 'Attendance',
      dataIndex: 'attendance_rate',
      key: 'attendance_rate',
      width: 140,
      align: 'center',
      sorter: true,
      sortOrder: sortField === 'attendance_rate' && sortOrder,
      render: (value) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Progress
            percent={value || 0}
            size="small"
            status={value >= 80 ? 'success' : value >= 60 ? 'active' : 'exception'}
            format={percent => `${percent}%`}
            style={{ width: '100%', marginBottom: 0 }}
          />
          <Text type="secondary" style={{ fontSize: 10 }}>
            {value >= 80 ? 'Good' : value >= 60 ? 'Fair' : 'Poor'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Days',
      key: 'days',
      width: 150,
      children: [
        {
          title: 'Present',
          dataIndex: 'working_days',
          key: 'working_days',
          width: 80,
          align: 'center',
          sorter: true,
          sortOrder: sortField === 'working_days' && sortOrder,
          render: (value) => (
            <Tag color="green" style={{ fontWeight: 600, fontSize: 13 }}>{value || 0}</Tag>
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
            <Text style={{ color: value > 0 ? '#ff4d4f' : '#52c41a', fontWeight: value > 0 ? 700 : 400, fontSize: 13 }}>
              {value || 0}
            </Text>
          ),
        },
      ],
    },
    {
      title: 'Salary',
      key: 'salary',
      width: 180,
      children: [
        {
          title: 'Basic',
          dataIndex: 'basic_pay',
          key: 'basic_pay',
          width: 100,
          align: 'right',
          sorter: true,
          sortOrder: sortField === 'basic_pay' && sortOrder,
          render: (value) => (
            <Text strong style={{ color: '#52c41a', fontSize: 13 }}>
              AED {value?.toLocaleString() || '0'}
            </Text>
          ),
        },
        {
          title: 'Net',
          dataIndex: 'net_pay',
          key: 'net_pay',
          width: 120,
          align: 'right',
          sorter: true,
          sortOrder: sortField === 'net_pay' && sortOrder,
          render: (value, record) => (
            <div>
              <Text strong style={{ color: value > 0 ? '#1890ff' : '#ff4d4f', fontSize: 15, display: 'block' }}>
                AED {value?.toLocaleString() || '0'}
              </Text>
              {record.total_deduction > 0 && (
                <Text type="danger" style={{ fontSize: 10 }}>
                  -AED {record.total_deduction?.toLocaleString() || '0'}
                </Text>
              )}
            </div>
          ),
        },
      ],
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Edit">
            <Button
              icon={<EditOutlined />}
              size="small"
              type="primary"
              ghost
              onClick={() => handleAddEditPayroll(false, record)}
              style={{ padding: '0 8px' }}
            />
          </Tooltip>
          {record.isSaved && (
            <Popconfirm
              title="Delete this payroll record?"
              onConfirm={() => handleDeletePayroll(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button icon={<DeleteOutlined />} size="small" danger style={{ padding: '0 8px' }} />
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
    { label: 'Last Quarter', value: [dayjs().subtract(1, 'quarter').startOf('quarter'), dayjs().subtract(1, 'quarter').endOf('quarter')] },
  ];

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '16px 20px', background: '#f0f2f5', minHeight: '100vh' }}>
      {/* Header */}
      <Card
        style={{ marginBottom: 16, borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
        bodyStyle={{ padding: '16px 24px' }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={16} md={18}>
            <Space align="center">
              <div style={{
                background: '#1890ff', borderRadius: '50%', width: 44, height: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <CalculatorOutlined style={{ fontSize: 22, color: 'white' }} />
              </div>
              <div>
                <Title level={3} style={{ margin: 0, fontSize: 'clamp(18px, 2.5vw, 24px)' }}>
                  Payroll Management
                </Title>
                <Text type="secondary" style={{ fontSize: 'clamp(11px, 1.2vw, 13px)' }}>
                  {dateRange[0].format('MMMM YYYY')} • {mappedEmployees.length} employees linked
                  {saving && <SyncOutlined spin style={{ marginLeft: 8 }} />}
                  {saving && ' Saving...'}
                </Text>
              </div>
            </Space>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Space wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Tooltip title="Refresh data">
                <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
                  Refresh
                </Button>
              </Tooltip>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAddEditPayroll(true)}>
                Add Manual
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6} lg={6}>
          <Card size="small" bodyStyle={{ padding: '14px 16px' }}
            style={{ borderRadius: 10, borderLeft: `3px solid ${token.colorPrimary}`, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 12 }}>Linked Employees</Text>}
              value={stats.total_employees || 0}
              prefix={<TeamOutlined style={{ fontSize: 16 }} />}
              valueStyle={{ fontSize: 'clamp(18px, 2vw, 24px)', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={6}>
          <Card size="small" bodyStyle={{ padding: '14px 16px' }}
            style={{ borderRadius: 10, borderLeft: `3px solid ${token.colorPrimary}`, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 12 }}>Payroll Records</Text>}
              value={stats.total}
              prefix={<CalculatorOutlined style={{ fontSize: 16 }} />}
              valueStyle={{ fontSize: 'clamp(18px, 2vw, 24px)', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={6}>
          <Card size="small" bodyStyle={{ padding: '14px 16px' }}
            style={{ borderRadius: 10, borderLeft: '3px solid #52c41a', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 12 }}>Total Gross Pay</Text>}
              value={stats.total_gross_pay}
              valueStyle={{ color: '#52c41a', fontSize: 'clamp(16px, 1.8vw, 22px)', fontWeight: 600 }}
              prefix={<DollarOutlined style={{ fontSize: 16 }} />}
              formatter={value => `${value.toLocaleString()}`}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={6}>
          <Card size="small" bodyStyle={{ padding: '14px 16px' }}
            style={{ borderRadius: 10, borderLeft: `3px solid ${stats.avg_attendance >= 80 ? '#52c41a' : '#faad14'}`, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 12 }}>Avg Attendance</Text>}
              value={stats.avg_attendance}
              suffix="%"
              valueStyle={{
                color: stats.avg_attendance >= 80 ? '#52c41a' : stats.avg_attendance >= 60 ? '#faad14' : '#ff4d4f',
                fontSize: 'clamp(18px, 2vw, 24px)', fontWeight: 600
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Table Card */}
      <Card
        style={{ borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', overflow: 'hidden' }}
        bodyStyle={{ padding: '16px 20px' }}
      >
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={7}>
            <Input
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Search by name, position..."
              value={searchText}
              onChange={handleSearchChange}
              allowClear
              size="middle"
              style={{ borderRadius: 6 }}
            />
          </Col>
          <Col xs={24} md={12}>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              format="DD MMM YYYY"
              presets={datePresets}
              style={{ width: '100%', borderRadius: 6 }}
              picker="month"
              size="middle"
              suffixIcon={<CalendarOutlined />}
            />
          </Col>
          <Col xs={12} md={3}>
            <Button onClick={() => setSearchText('')} style={{ width: '100%', borderRadius: 6 }} size="middle" icon={<FilterOutlined />}>
              Reset
            </Button>
          </Col>
          <Col xs={12} md={2}>
            <Button style={{ width: '100%', borderRadius: 6 }} size="middle" icon={<FileExcelOutlined />}>
              Export
            </Button>
          </Col>
        </Row>

        <Alert
          message="Payroll Calculation Rules"
          description={
            <div style={{ fontSize: 'clamp(11px, 1vw, 13px)' }}>
              <Row gutter={[16, 8]}>
                <Col xs={24} sm={12} md={8}><div><strong>Basic Pay</strong> = Monthly Salary × (Working Days / Days in Month)</div></Col>
                <Col xs={24} sm={12} md={8}><div><strong>Absence Deduction</strong> = (Monthly Salary / Days in Month) × Absent Days</div></Col>
                <Col xs={24} sm={12} md={8}><div><strong>Gross Pay</strong> = Basic Pay + Overtime + Bonus</div></Col>
                <Col xs={24} sm={12} md={8}><div><strong>Net Pay</strong> = Gross Pay − Absence Deduction − Other Deduction</div></Col>
                <Col xs={24} sm={12} md={8}><div><strong>Weekend:</strong> Sunday only (no deduction, no pay)</div></Col>
                <Col xs={24} sm={12} md={8}><div><strong>Late:</strong> <span style={{ color: '#faad14' }}>Information only</span> — No deduction</div></Col>
              </Row>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16, borderRadius: 8 }}
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
            showQuickJumper: true,
          }}
          scroll={{ x: 1200 }}
          size="middle"
          bordered={false}
          className="payroll-table"
          rowClassName={(record) => !record.isSaved ? 'unsaved-row' : ''}
          style={{ borderRadius: 8, overflow: 'hidden' }}
          components={{
            header: {
              cell: (props) => (
                <th {...props} style={{ ...props.style, background: '#fafafa', fontWeight: 600, fontSize: 13 }} />
              ),
            },
          }}
        />
      </Card>

      <PayrollForm
        visible={payrollFormVisible}
        onCancel={() => {
          setPayrollFormVisible(false);
          setIsEditing(false);
          setSelectedPayroll(null);
        }}
        onSubmit={handlePayrollFormSubmit}
        isEditing={isEditing}
        initialValues={selectedPayroll}
        employees={mappedEmployees}
        dateRange={dateRange}
      />

      <style jsx="true">{`
        .payroll-table .ant-table-row:hover { background: #f5f9ff; }
        .payroll-table .unsaved-row { background: #f6ffed; }
        .payroll-table .unsaved-row:hover { background: #d9f7be !important; }
        .payroll-table .ant-table-cell { padding: 12px 12px !important; }
        @media (max-width: 768px) {
          .payroll-table .ant-table-cell { padding: 8px 8px !important; }
        }
        .ant-statistic-title { font-size: 12px !important; color: #8c8c8c !important; }
      `}</style>
    </div>
  );
};

export default PayrollPage;