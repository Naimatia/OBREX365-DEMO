// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Card, Table, Tag, Space, Button, Input, Select, Modal, Form,
  message, Tooltip, Typography, Row, Col, DatePicker, Avatar, Badge,
  Statistic, Alert, Empty, Divider, Dropdown, Menu, Switch, InputNumber,
  Popconfirm, Spin
} from 'antd';
import {
  SearchOutlined, ReloadOutlined, CalendarOutlined, TeamOutlined,
  UserOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ClockCircleOutlined, WarningOutlined, EyeOutlined,
  FilterOutlined, SortAscendingOutlined, SortDescendingOutlined,
  FileExcelOutlined, PrinterOutlined, DownloadOutlined,
  LeftOutlined, RightOutlined, EditOutlined, SaveOutlined,
  CloseOutlined, PlusOutlined, DeleteOutlined, LoginOutlined, LogoutOutlined
} from '@ant-design/icons';
import {
  db, collection, query, where, getDocs,
  doc, updateDoc, addDoc, deleteDoc, serverTimestamp, orderBy,
  getDoc, setDoc
} from 'configs/FirebaseConfig';
import UserService from 'services/firebase/UserService';
import { UserRoles } from 'models/UserModel';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import './AttendancePage.css';
import { debounce } from 'lodash';
import { LRUCache } from 'lru-cache';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

// ─── Constants ──────────────────────────────────────────────────────────────
const STAFF_ROLES = [
  UserRoles.SELLER, UserRoles.SALES_EXECUTIVE, UserRoles.AGENT,
  UserRoles.TEAM_LEADER, UserRoles.SALES_MANAGER,
  UserRoles.OFF_PLAN_SALES, UserRoles.READY_TO_MOVE_SALES, UserRoles.HR,
];

const ATTENDANCE_STATUSES = {
  'present': { label: 'Present', color: '#52c41a', bg: '#f6ffed', icon: <CheckCircleOutlined /> },
  'absent': { label: 'Absent', color: '#ff4d4f', bg: '#fff1f0', icon: <CloseCircleOutlined /> },
  'late': { label: 'Late', color: '#faad14', bg: '#fffbe6', icon: <WarningOutlined /> },
  'sick_pto': { label: 'Sick/PTO', color: '#1890ff', bg: '#e6f7ff', icon: <ClockCircleOutlined /> },
  'unpaid_leave': { label: 'Unpaid Leave', color: '#fa8c16', bg: '#fff7e6', icon: <CloseOutlined /> },
  'holiday_nonwork': { label: 'Holiday', color: '#722ed1', bg: '#f9f0ff', icon: <CalendarOutlined /> },
  'no_show': { label: 'No Show', color: '#ff4d4f', bg: '#fff1f0', icon: <CloseCircleOutlined /> },
  'weekly_off': { label: 'Weekly Off', color: '#8c8c8c', bg: '#f5f5f5', icon: <CalendarOutlined /> },
};

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'sick_pto', label: 'Sick/PTO' },
  { value: 'unpaid_leave', label: 'Unpaid Leave' },
  { value: 'holiday_nonwork', label: 'Holiday' },
  { value: 'no_show', label: 'No Show' },
  { value: 'weekly_off', label: 'Weekly Off' },
];

// ─── Cache Configuration ──────────────────────────────────────────────────
// LRU Cache with TTL for different data types
const CACHE_CONFIG = {
  employees: { max: 100, ttl: 1000 * 60 * 15 }, // 15 minutes
  mappings: { max: 50, ttl: 1000 * 60 * 30 },   // 30 minutes
  notes: { max: 200, ttl: 1000 * 60 * 5 },      // 5 minutes
  attendance: { max: 150, ttl: 1000 * 60 * 2 }, // 2 minutes
};

// Global cache instances (singleton pattern)
const cacheInstances = {
  employees: new LRUCache(CACHE_CONFIG.employees),
  mappings: new LRUCache(CACHE_CONFIG.mappings),
  notes: new LRUCache(CACHE_CONFIG.notes),
  attendance: new LRUCache(CACHE_CONFIG.attendance),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const timeToMins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fmtHHMM = d => d ? dayjs(d).format('HH:mm') : '—';
const toDate = t => t?.toDate ? t.toDate() : (t ? new Date(t) : null);

const resolveType = p =>
  p.type || ['check-in', 'check-out', 'break-out', 'break-in', 'overtime-in', 'overtime-out'][Number(p.punchCode)] || 'check-in';

// ─── Firestore Query Optimizer ──────────────────────────────────────────────
class FirestoreQueryOptimizer {
  constructor() {
    this.pendingRequests = new Map();
    this.requestCount = 0;
    this.requestLimit = 80000; // Quota limit per day
    this.lastResetDate = dayjs().format('YYYY-MM-DD');
  }

  // Check if we're approaching quota limit
  isQuotaExceeded() {
    const today = dayjs().format('YYYY-MM-DD');
    if (today !== this.lastResetDate) {
      this.requestCount = 0;
      this.lastResetDate = today;
    }
    return this.requestCount >= this.requestLimit * 0.9; // 90% threshold
  }

  // Track each request
  trackRequest() {
    this.requestCount++;
    if (this.requestCount % 100 === 0) {
      console.log(`Firestore requests today: ${this.requestCount}/${this.requestLimit}`);
    }
  }

  // Get or create request promise (deduplication)
  getRequest(key, requestFn) {
    if (this.isQuotaExceeded()) {
      console.warn('Firestore quota nearing limit, using cached data');
      return Promise.reject(new Error('QUOTA_EXCEEDED'));
    }

    // Check if there's already a pending request for this key
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // Create new request
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

    // Store pending request
    this.pendingRequests.set(key, promise);
    return promise;
  }

  // Batch multiple requests into one when possible
  batchRequests(requests) {
    if (requests.length === 0) return Promise.resolve([]);
    if (requests.length === 1) return requests[0]();

    // For attendance records, we can batch by date range
    return Promise.all(requests.map(req => req()));
  }
}

const queryOptimizer = new FirestoreQueryOptimizer();

// ─── Build attendance rows ──────────────────────────────────────────────────
const buildAttendanceRows = (rawRecords, employees, startDate, endDate, mappings = [], savedNotes = {}) => {
  const mappingByCrmId = Object.fromEntries(mappings.map(m => [String(m.crmUserId), m]));

  const punchGroup = {};
  rawRecords.forEach(rec => {
    const ts = toDate(rec.timestamp);
    if (!ts) return;
    const dateKey = dayjs(ts).format('YYYY-MM-DD');
    const groupKey = `${rec.userId}_${dateKey}`;
    if (!punchGroup[groupKey]) punchGroup[groupKey] = [];
    punchGroup[groupKey].push(rec);
  });

  const rows = [];
  let cursor = dayjs(startDate);
  const end = dayjs(endDate);

  while (cursor.isBefore(end.add(1, 'day'), 'day')) {
    const dateStr = cursor.format('YYYY-MM-DD');
    const dayOfWeek = cursor.day();

    employees.forEach(emp => {
      const mapping = mappingByCrmId[String(emp.id)];
      if (!mapping) return;

      const punches = punchGroup[`${mapping.deviceUserId}_${dateStr}`] || [];
      const isSunday = dayOfWeek === 0;

      const checkIns = punches.filter(p => resolveType(p) === 'check-in');
      const checkOuts = punches.filter(p => resolveType(p) === 'check-out');
      const firstIn = checkIns[0] ? toDate(checkIns[0].timestamp) : null;
      const lastOut = checkOuts[checkOuts.length - 1] ? toDate(checkOuts[checkOuts.length - 1].timestamp) : null;

      const shift = mapping.shift || { start: '10:00', end: '16:00' };
      const shiftStartMins = timeToMins(shift.start);

      let delayMins = 0;
      let status = 'absent';
      let statusLabel = 'Absent';

      if (isSunday && punches.length === 0) {
        status = 'weekly_off';
        statusLabel = 'Weekly Off';
      } else if (firstIn) {
        const arrivalMins = dayjs(firstIn).hour() * 60 + dayjs(firstIn).minute();
        delayMins = Math.max(0, arrivalMins - shiftStartMins);
        status = delayMins > 15 ? 'late' : 'present';
        statusLabel = delayMins > 15 ? 'Late' : 'Present';
      } else if (punches.length > 0 && !firstIn) {
        status = 'no_show';
        statusLabel = 'No Show';
      }

      let workMins = 0;
      if (firstIn && lastOut) {
        workMins = Math.max(0, Math.round((lastOut - firstIn) / 60000));
      }

      const noteKey = `${emp.id}_${dateStr}`;
      const savedNote = savedNotes[noteKey] || {};

      rows.push({
        key: `${emp.id}_${dateStr}`,
        employeeId: emp.id,
        employeeName: `${emp.firstname || ''} ${emp.lastname || ''}`.trim() || 'Unknown',
        role: emp.Role || emp.department || '',
        department: emp.department || emp.Role || '',
        date: dateStr,
        displayDate: dayjs(dateStr).format('DD MMM YYYY'),
        weekday: dayjs(dateStr).format('ddd'),
        status: savedNote.status || status,
        statusLabel: ATTENDANCE_STATUSES[savedNote.status]?.label || statusLabel,
        delayMins: delayMins,
        firstIn: firstIn,
        lastOut: lastOut,
        workMins: workMins,
        note: savedNote.note || '',
        employee: emp,
        rawPunches: punches,
        shift: shift,
        isOverridden: savedNote.isOverridden || false,
        originalStatus: status,
        isSunday: isSunday,
      });
    });
    cursor = cursor.add(1, 'day');
  }

  return rows.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (a.employeeName || '').localeCompare(b.employeeName || '');
  });
};

// ─── Excel Export ────────────────────────────────────────────────────────────
const exportToExcel = (data, dateRange) => {
  if (!data.length) { message.warning('No data to export'); return; }

  const exportData = data.map(r => ({
    'Employee Name': r.employeeName,
    'Role': r.role,
    'Date': r.displayDate,
    'Day': r.weekday,
    'Status': r.statusLabel,
    'Note': r.note || '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);
  ws['!cols'] = Array(6).fill({ wch: 20 });
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

  const start = dayjs(dateRange[0]).format('YYYYMMDD');
  const end = dayjs(dateRange[1]).format('YYYYMMDD');
  XLSX.writeFile(wb, `Attendance_${start}_${end}.xlsx`);
  message.success('Excel downloaded successfully');
};

// ─────────────────────────────────────────────────────────────────────────────
// Inline Status Dropdown Component
// ─────────────────────────────────────────────────────────────────────────────
const InlineStatusSelect = ({ value, record, onStatusChange, saving }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = async (newStatus) => {
    setLoading(true);
    try {
      await onStatusChange(record, newStatus);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const config = ATTENDANCE_STATUSES[value] || ATTENDANCE_STATUSES.absent;

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={['click']}
      disabled={saving || loading}
      overlay={
        <Menu style={{ minWidth: 160 }}>
          {STATUS_OPTIONS.map(opt => {
            const cfg = ATTENDANCE_STATUSES[opt.value];
            return (
              <Menu.Item
                key={opt.value}
                onClick={() => handleChange(opt.value)}
                style={{
                  background: value === opt.value ? cfg.bg : 'transparent',
                  borderRadius: 4
                }}
              >
                <Space>
                  <span style={{ color: cfg.color }}>{cfg.icon}</span>
                  <span>{opt.label}</span>
                  {value === opt.value && (
                    <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 'auto' }} />
                  )}
                </Space>
              </Menu.Item>
            );
          })}
        </Menu>
      }
    >
      <div
        style={{
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 12px',
          borderRadius: 20,
          background: config.bg,
          border: `1px solid ${config.color}33`,
          transition: 'all 0.3s ease',
        }}
        onClick={() => setOpen(!open)}
      >
        <span style={{ color: config.color }}>{config.icon}</span>
        <span style={{ fontWeight: 600, color: config.color, fontSize: 13 }}>
          {config.label}
        </span>
        {record?.isOverridden && (
          <Badge status="processing" style={{ marginLeft: 4 }} />
        )}
        {loading && <Spin size="small" />}
        <EditOutlined style={{ fontSize: 11, color: '#8c8c8c' }} />
      </div>
    </Dropdown>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Inline Note Edit Component
// ─────────────────────────────────────────────────────────────────────────────
const InlineNoteEditor = ({ value, record, onNoteSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [noteValue, setNoteValue] = useState(value || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onNoteSave(record, noteValue);
      setIsEditing(false);
      message.success('Note updated');
    } catch (error) {
      message.error('Failed to update note');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setNoteValue(value || '');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Input.TextArea
          value={noteValue}
          onChange={(e) => setNoteValue(e.target.value)}
          autoSize={{ minRows: 1, maxRows: 3 }}
          placeholder="Enter note..."
          style={{ flex: 1 }}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              handleSave();
            }
          }}
        />
        <Button
          type="primary"
          size="small"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={saving}
        />
        <Button size="small" icon={<CloseOutlined />} onClick={handleCancel} />
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        padding: '4px 8px',
        borderRadius: 4,
        transition: 'background 0.2s',
        background: value ? 'transparent' : '#f5f5f5',
        minHeight: 32,
        border: '1px dashed transparent',
      }}
      onClick={() => setIsEditing(true)}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#f0f0f0';
        e.currentTarget.style.borderColor = '#d9d9d9';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = value ? 'transparent' : '#f5f5f5';
        e.currentTarget.style.borderColor = 'transparent';
      }}
    >
      <Text
        ellipsis={{ tooltip: value || 'Click to add note' }}
        style={{
          fontSize: 13,
          color: value ? '#1a1a2e' : '#bfbfbf',
          flex: 1,
        }}
      >
        {value || 'Click to add note...'}
      </Text>
      <EditOutlined style={{ fontSize: 12, color: '#8c8c8c', opacity: 0.6 }} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const AttendancePage = () => {
  const reduxUser = useSelector(s => s.auth.user);
  const companyId = reduxUser?.company_id || '';

  const [employees, setEmployees] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [rawRecords, setRawRecords] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [savedNotes, setSavedNotes] = useState({});

  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [employeeFilter, setEmployeeFilter] = useState(null);
  const [dateRange, setDateRange] = useState([dayjs(), dayjs()]);
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('descend');
  const [savingStatus, setSavingStatus] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // Track if data has been loaded to prevent duplicate requests
  const dataLoadedRef = useRef({
    employees: false,
    mappings: false,
    notes: false,
    attendance: false,
  });

  // ── Debounced Data Fetch Functions ──────────────────────────────────────
  const debouncedFetchEmployees = useMemo(
    () => debounce(async (forceRefresh = false) => {
      if (!companyId) return;
      
      const cacheKey = `employees_${companyId}`;
      const cached = cacheInstances.employees.get(cacheKey);

      if (!forceRefresh && cached && dataLoadedRef.current.employees) {
        setEmployees(cached);
        return;
      }

      try {
        const all = await queryOptimizer.getRequest(
          `employees_${companyId}`,
          () => UserService.getUsersByCompanyId(companyId)
        );
        const staff = all.filter(u => STAFF_ROLES.includes(u.Role));
        cacheInstances.employees.set(cacheKey, staff);
        setEmployees(staff);
        dataLoadedRef.current.employees = true;
      } catch (e) {
        if (e.message !== 'QUOTA_EXCEEDED') {
          console.error('Error fetching employees:', e);
          message.error('Failed to load employees');
        }
      }
    }, 300),
    [companyId]
  );

  const debouncedFetchMappings = useMemo(
    () => debounce(async (forceRefresh = false) => {
      if (!companyId) return;

      const cacheKey = `mappings_${companyId}`;
      const cached = cacheInstances.mappings.get(cacheKey);

      if (!forceRefresh && cached && dataLoadedRef.current.mappings) {
        setMappings(cached);
        return;
      }

      try {
        const snap = await queryOptimizer.getRequest(
          `mappings_${companyId}`,
          () => getDocs(query(collection(db, 'attendance_device_mapping'), where('company_id', '==', companyId)))
        );
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        cacheInstances.mappings.set(cacheKey, data);
        setMappings(data);
        dataLoadedRef.current.mappings = true;
      } catch (e) {
        if (e.message !== 'QUOTA_EXCEEDED') {
          console.error('Error fetching mappings:', e);
          message.error('Failed to load mappings');
        }
      }
    }, 300),
    [companyId]
  );

  const debouncedFetchNotes = useMemo(
    () => debounce(async (forceRefresh = false) => {
      if (!companyId) return;

      const cacheKey = `notes_${companyId}`;
      const cached = cacheInstances.notes.get(cacheKey);

      if (!forceRefresh && cached && dataLoadedRef.current.notes) {
        setSavedNotes(cached);
        return;
      }

      try {
        const snap = await queryOptimizer.getRequest(
          `notes_${companyId}`,
          () => getDocs(query(collection(db, 'attendance_notes'), where('company_id', '==', companyId)))
        );
        const notes = {};
        snap.docs.forEach(doc => {
          const data = doc.data();
          const key = `${data.employeeId}_${data.date}`;
          notes[key] = {
            id: doc.id,
            status: data.status,
            note: data.note || '',
            isOverridden: data.isOverridden || false,
          };
        });
        cacheInstances.notes.set(cacheKey, notes);
        setSavedNotes(notes);
        dataLoadedRef.current.notes = true;
      } catch (e) {
        if (e.message !== 'QUOTA_EXCEEDED') {
          console.error('Error fetching notes:', e);
          message.error('Failed to load notes');
        }
      }
    }, 300),
    [companyId]
  );

  const debouncedFetchRecords = useMemo(
    () => debounce(async (forceRefresh = false) => {
      if (!companyId || !dateRange || dateRange.length < 2) {
        setRawRecords([]);
        return;
      }

      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      const cacheKey = `attendance_${companyId}_${startDate}_${endDate}`;
      const cached = cacheInstances.attendance.get(cacheKey);

      if (!forceRefresh && cached && dataLoadedRef.current.attendance) {
        setRawRecords(cached);
        return;
      }

      setLoading(true);
      try {
        const start = dateRange[0].startOf('day').toDate();
        const end = dateRange[1].endOf('day').toDate();

        // Optimize: Fetch only what's needed
        const snap = await queryOptimizer.getRequest(
          cacheKey,
          () => getDocs(
            query(
              collection(db, 'attendance'),
              where('company_id', '==', companyId),
              where('timestamp', '>=', start),
              where('timestamp', '<=', end),
              orderBy('timestamp', 'desc')
            )
          )
        );

        const recs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(r => {
            const ts = toDate(r.timestamp);
            return ts && ts >= start && ts <= end;
          });

        cacheInstances.attendance.set(cacheKey, recs);
        setRawRecords(recs);
        dataLoadedRef.current.attendance = true;
      } catch (e) {
        if (e.code === 'failed-precondition') {
          message.error('Missing Firestore index. Please create the required index.');
        } else if (e.message !== 'QUOTA_EXCEEDED') {
          message.error('Failed to load attendance records: ' + e.message);
        }
      } finally {
        setLoading(false);
      }
    }, 500),
    [companyId, dateRange]
  );

  // ── Initial data load ────────────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        debouncedFetchEmployees(false),
        debouncedFetchMappings(false),
        debouncedFetchNotes(false),
      ]);
    };
    loadData();
  }, [companyId]);

  // ── Fetch records when date range changes ──────────────────────────────
  useEffect(() => {
    if (dateRange && dateRange.length === 2) {
      dataLoadedRef.current.attendance = false;
      debouncedFetchRecords(false);
    }
  }, [dateRange]);

  // ── Build attendance data when dependencies change ──────────────────────
  useEffect(() => {
    if (!employees.length || !dateRange || dateRange.length < 2 || !mappings.length) {
      setAttendanceData([]);
      return;
    }

    const data = buildAttendanceRows(
      rawRecords,
      employees,
      dateRange[0].toDate(),
      dateRange[1].toDate(),
      mappings,
      savedNotes
    );

    setAttendanceData(data);
  }, [rawRecords, employees, mappings, dateRange, savedNotes]);

  // ── Apply filters and sorting ─────────────────────────────────────────────
  useEffect(() => {
    let filtered = [...attendanceData];

    if (searchText) {
      const query = searchText.toLowerCase();
      filtered = filtered.filter(r =>
        r.employeeName.toLowerCase().includes(query) ||
        r.role?.toLowerCase().includes(query) ||
        r.department?.toLowerCase().includes(query)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (employeeFilter) {
      filtered = filtered.filter(r => r.employeeId === employeeFilter);
    }

    filtered.sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortOrder === 'ascend' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'ascend' ? 1 : -1;
      return 0;
    });

    setFilteredData(filtered);
  }, [attendanceData, searchText, statusFilter, employeeFilter, sortField, sortOrder]);

  // ── Statistics ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const uniqueEmployees = new Map();
    attendanceData.forEach(row => {
      if (!uniqueEmployees.has(row.employeeId)) {
        uniqueEmployees.set(row.employeeId, {
          id: row.employeeId,
          name: row.employeeName,
          role: row.role,
        });
      }
    });

    const totalEmployees = uniqueEmployees.size;
    const today = dayjs().format('YYYY-MM-DD');
    const todayData = attendanceData.filter(row => row.date === today);
    const targetDate = todayData.length > 0 ? today : dateRange[1]?.format('YYYY-MM-DD') || today;
    const targetData = attendanceData.filter(row => row.date === targetDate);

    const totalTarget = targetData.length;
    const present = targetData.filter(r => r.status === 'present').length;
    const late = targetData.filter(r => r.status === 'late').length;
    const absent = targetData.filter(r => r.status === 'absent').length;
    const sickPto = targetData.filter(r => r.status === 'sick_pto').length;
    const unpaidLeave = targetData.filter(r => r.status === 'unpaid_leave').length;
    const holiday = targetData.filter(r => r.status === 'holiday_nonwork').length;
    const noShow = targetData.filter(r => r.status === 'no_show').length;
    const weeklyOff = targetData.filter(r => r.status === 'weekly_off').length;

    const presentPercentage = totalEmployees > 0 ? ((present / totalEmployees) * 100).toFixed(1) : 0;
    const latePercentage = totalEmployees > 0 ? ((late / totalEmployees) * 100).toFixed(1) : 0;
    const absentPercentage = totalEmployees > 0 ? ((absent / totalEmployees) * 100).toFixed(1) : 0;
    const sickPtoPercentage = totalEmployees > 0 ? ((sickPto / totalEmployees) * 100).toFixed(1) : 0;
    const unpaidLeavePercentage = totalEmployees > 0 ? ((unpaidLeave / totalEmployees) * 100).toFixed(1) : 0;
    const holidayPercentage = totalEmployees > 0 ? ((holiday / totalEmployees) * 100).toFixed(1) : 0;
    const noShowPercentage = totalEmployees > 0 ? ((noShow / totalEmployees) * 100).toFixed(1) : 0;
    const weeklyOffPercentage = totalEmployees > 0 ? ((weeklyOff / totalEmployees) * 100).toFixed(1) : 0;

    return {
      totalEmployees,
      totalTarget,
      present,
      late,
      absent,
      sickPto,
      unpaidLeave,
      holiday,
      noShow,
      weeklyOff,
      presentPercentage,
      latePercentage,
      absentPercentage,
      sickPtoPercentage,
      unpaidLeavePercentage,
      holidayPercentage,
      noShowPercentage,
      weeklyOffPercentage,
      targetDate: dayjs(targetDate).format('DD MMM YYYY'),
    };
  }, [attendanceData, dateRange]);

  // ── Save Status Update ────────────────────────────────────────────────────
  const handleStatusChange = async (record, newStatus) => {
    if (!record) return;
    setSavingStatus(true);
    try {
      const key = `${record.employeeId}_${record.date}`;

      const data = {
        company_id: companyId,
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        date: record.date,
        status: newStatus,
        note: record.note || '',
        isOverridden: true,
        updatedBy: reduxUser?.email || 'unknown',
        updatedAt: serverTimestamp(),
      };

      const snap = await getDocs(
        query(
          collection(db, 'attendance_notes'),
          where('company_id', '==', companyId),
          where('employeeId', '==', record.employeeId),
          where('date', '==', record.date)
        )
      );

      if (!snap.empty) {
        await updateDoc(doc(db, 'attendance_notes', snap.docs[0].id), data);
      } else {
        await addDoc(collection(db, 'attendance_notes'), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }

      // Update local state and cache
      const updatedNotes = {
        ...savedNotes,
        [key]: {
          status: newStatus,
          note: record.note || '',
          isOverridden: true,
        }
      };
      setSavedNotes(updatedNotes);

      // Update cache
      const cacheKey = `notes_${companyId}`;
      cacheInstances.notes.set(cacheKey, updatedNotes);

      setAttendanceData(prev =>
        prev.map(row => {
          if (row.key === record.key) {
            return {
              ...row,
              status: newStatus,
              statusLabel: ATTENDANCE_STATUSES[newStatus]?.label || row.statusLabel,
              isOverridden: true,
            };
          }
          return row;
        })
      );

      message.success(`Status updated for ${record.employeeName}`);
    } catch (e) {
      console.error('Error saving status:', e);
      message.error('Failed to update status: ' + e.message);
    } finally {
      setSavingStatus(false);
    }
  };

  // ── Save Note Update ────────────────────────────────────────────────────
  const handleNoteSave = async (record, note) => {
    if (!record) return;

    try {
      const key = `${record.employeeId}_${record.date}`;

      const data = {
        company_id: companyId,
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        date: record.date,
        status: record.status,
        note: note,
        isOverridden: record.isOverridden || false,
        updatedBy: reduxUser?.email || 'unknown',
        updatedAt: serverTimestamp(),
      };

      const snap = await getDocs(
        query(
          collection(db, 'attendance_notes'),
          where('company_id', '==', companyId),
          where('employeeId', '==', record.employeeId),
          where('date', '==', record.date)
        )
      );

      if (!snap.empty) {
        await updateDoc(doc(db, 'attendance_notes', snap.docs[0].id), data);
      } else {
        await addDoc(collection(db, 'attendance_notes'), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }

      // Update local state and cache
      const updatedNotes = {
        ...savedNotes,
        [key]: {
          status: record.status,
          note: note,
          isOverridden: record.isOverridden || false,
        }
      };
      setSavedNotes(updatedNotes);

      // Update cache
      const cacheKey = `notes_${companyId}`;
      cacheInstances.notes.set(cacheKey, updatedNotes);

      setAttendanceData(prev =>
        prev.map(row => {
          if (row.key === record.key) {
            return {
              ...row,
              note: note,
            };
          }
          return row;
        })
      );

    } catch (e) {
      console.error('Error saving note:', e);
      throw e;
    }
  };

  // ─── Handle Date Change ──────────────────────────────────────────────────
  const handleDateChange = (dates) => {
    if (dates && dates.length === 2) {
      setDateRange(dates);
      dataLoadedRef.current.attendance = false;
      // Don't clear data immediately, let the fetch handle it
    }
  };

  // ─── Refresh All Data ──────────────────────────────────────────────────
  const handleRefresh = () => {
    setLoading(true);
    // Clear cache for this company
    const cacheKeys = [
      `employees_${companyId}`,
      `mappings_${companyId}`,
      `notes_${companyId}`,
    ];
    cacheKeys.forEach(key => {
      cacheInstances.employees.delete(key);
      cacheInstances.mappings.delete(key);
      cacheInstances.notes.delete(key);
    });

    // Reset loaded flags
    dataLoadedRef.current = {
      employees: false,
      mappings: false,
      notes: false,
      attendance: false,
    };

    // Force refetch
    Promise.all([
      debouncedFetchEmployees(true),
      debouncedFetchMappings(true),
      debouncedFetchNotes(true),
    ]).then(() => {
      dataLoadedRef.current.attendance = false;
      debouncedFetchRecords(true);
    }).catch(() => {
      setLoading(false);
    });

    setLastRefresh(Date.now());
  };

  // ─── Table Columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Employee Name',
      dataIndex: 'employeeName',
      key: 'employeeName',
      width: 200,
      sorter: true,
      render: (text, record) => (
        <Space>
          <Avatar size={36} style={{ backgroundColor: '#1890ff' }}>
            {text.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{text}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.role}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'displayDate',
      key: 'date',
      width: 130,
      sorter: true,
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 14 }}>{text}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.weekday}</Text>
        </div>
      ),
    },
    {
      title: 'Check In',
      dataIndex: 'firstIn',
      key: 'checkIn',
      width: 110,
      align: 'center',
      render: (value, record) => {
        if (!record.firstIn) {
          return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
        }
        const time = dayjs(record.firstIn).format('HH:mm');
        return (
          <Tag color="green" icon={<LoginOutlined />} style={{ fontWeight: 600 }}>
            {time}
          </Tag>
        );
      },
    },
    {
      title: 'Check Out',
      dataIndex: 'lastOut',
      key: 'checkOut',
      width: 110,
      align: 'center',
      render: (value, record) => {
        if (!record.lastOut) {
          return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
        }
        const time = dayjs(record.lastOut).format('HH:mm');
        return (
          <Tag color="red" icon={<LogoutOutlined />} style={{ fontWeight: 600 }}>
            {time}
          </Tag>
        );
      },
    },
    {
      title: 'Delay',
      dataIndex: 'delayMins',
      key: 'delay',
      width: 100,
      align: 'center',
      sorter: (a, b) => (a.delayMins || 0) - (b.delayMins || 0),
      render: (value, record) => {
        if (!record.delayMins || record.delayMins <= 0) {
          return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
        }
        const isLate = record.delayMins > 15;
        return (
          <Tooltip title={`Arrived ${record.delayMins} minutes late`}>
            <Tag
              color={isLate ? 'red' : 'orange'}
              icon={<WarningOutlined />}
              style={{ fontWeight: 600 }}
            >
              +{record.delayMins}m
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 180,
      render: (status, record) => (
        <InlineStatusSelect
          value={status}
          record={record}
          onStatusChange={handleStatusChange}
          saving={savingStatus}
        />
      ),
    },
    {
      title: 'Note / Feedback',
      dataIndex: 'note',
      key: 'note',
      width: 250,
      render: (text, record) => (
        <InlineNoteEditor
          value={text}
          record={record}
          onNoteSave={handleNoteSave}
        />
      ),
    },
  ];

  // ── Date Presets ──────────────────────────────────────────────────────────
  const datePresets = [
    { label: 'Today', value: [dayjs(), dayjs()] },
    { label: 'Yesterday', value: [dayjs().subtract(1, 'day'), dayjs().subtract(1, 'day')] },
    { label: 'This Week', value: [dayjs().startOf('week'), dayjs().endOf('week')] },
    { label: 'Last 7 Days', value: [dayjs().subtract(6, 'day'), dayjs()] },
    { label: 'This Month', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
    { label: 'Last Month', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
    { label: 'Last 30 Days', value: [dayjs().subtract(29, 'day'), dayjs()] },
  ];

  // ── Sort Menu ─────────────────────────────────────────────────────────────
  const sortMenu = (
    <Menu onClick={({ key }) => {
      const [field, order] = key.split('-');
      setSortField(field);
      setSortOrder(order);
    }}>
      <Menu.Item key="date-descend">📅 Newest First</Menu.Item>
      <Menu.Item key="date-ascend">📅 Oldest First</Menu.Item>
      <Menu.Item key="employeeName-ascend">👤 A → Z</Menu.Item>
      <Menu.Item key="employeeName-descend">👤 Z → A</Menu.Item>
      <Menu.Item key="status-ascend">✅ Status A → Z</Menu.Item>
      <Menu.Item key="status-descend">✅ Status Z → A</Menu.Item>
    </Menu>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="attendance-page">
      {/* Header Card */}
      <Card className="header-card" bodyStyle={{ padding: '20px 24px' }}>
        <Row align="middle" gutter={[16, 16]}>
          <Col flex="auto">
            <div className="header-title">
              <Title level={3} style={{ margin: 0 }}>
                <CalendarOutlined style={{ color: '#1890ff', marginRight: 10 }} />
                Attendance
              </Title>
            </div>
          </Col>
          <Col>
            <Space>
              <Badge count={queryOptimizer.requestCount} overflowCount={999} style={{ backgroundColor: '#52c41a' }}>
                <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
                  Refresh
                </Button>
              </Badge>
              <Button icon={<FileExcelOutlined />} onClick={() => exportToExcel(filteredData, dateRange)}>
                Export
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card total">
            <div className="stat-content">
              <div className="stat-icon" style={{ background: '#e6f7ff', color: '#1890ff' }}>
                <TeamOutlined />
              </div>
              <div className="stat-info">
                <div className="stat-value">{stats.totalEmployees}</div>
                <div className="stat-label">Total Employees</div>
              </div>
              <div className="stat-change positive">
                {stats.totalEmployees > 0 ? '100%' : '0%'}
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card present">
            <div className="stat-content">
              <div className="stat-icon" style={{ background: '#f6ffed', color: '#52c41a' }}>
                <CheckCircleOutlined />
              </div>
              <div className="stat-info">
                <div className="stat-value">{stats.present}</div>
                <div className="stat-label">Present {stats.targetDate}</div>
              </div>
              <div className="stat-change positive">{stats.presentPercentage}%</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card absent">
            <div className="stat-content">
              <div className="stat-icon" style={{ background: '#fff1f0', color: '#ff4d4f' }}>
                <CloseCircleOutlined />
              </div>
              <div className="stat-info">
                <div className="stat-value">{stats.absent}</div>
                <div className="stat-label">Absent {stats.targetDate}</div>
              </div>
              <div className="stat-change negative">{stats.absentPercentage}%</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card late">
            <div className="stat-content">
              <div className="stat-icon" style={{ background: '#fffbe6', color: '#faad14' }}>
                <WarningOutlined />
              </div>
              <div className="stat-info">
                <div className="stat-value">{stats.late}</div>
                <div className="stat-label">Late {stats.targetDate}</div>
              </div>
              <div className="stat-change neutral">{stats.latePercentage}%</div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Additional Stats Row */}
      <Row gutter={[16, 16]} className="stats-row" style={{ marginTop: 0 }}>
        <Col xs={24} sm={8} md={4}>
          <Card size="small" className="stat-card">
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>Sick/PTO</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1890ff' }}>
              {stats.sickPto} <span style={{ fontSize: 14, fontWeight: 400, color: '#8c8c8c' }}>({stats.sickPtoPercentage}%)</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Card size="small" className="stat-card">
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>Unpaid Leave</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fa8c16' }}>
              {stats.unpaidLeave} <span style={{ fontSize: 14, fontWeight: 400, color: '#8c8c8c' }}>({stats.unpaidLeavePercentage}%)</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Card size="small" className="stat-card">
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>Holiday</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#722ed1' }}>
              {stats.holiday} <span style={{ fontSize: 14, fontWeight: 400, color: '#8c8c8c' }}>({stats.holidayPercentage}%)</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Card size="small" className="stat-card">
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>No Show</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#ff4d4f' }}>
              {stats.noShow} <span style={{ fontSize: 14, fontWeight: 400, color: '#8c8c8c' }}>({stats.noShowPercentage}%)</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Card size="small" className="stat-card">
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>Weekly Off</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#8c8c8c' }}>
              {stats.weeklyOff} <span style={{ fontSize: 14, fontWeight: 400, color: '#8c8c8c' }}>({stats.weeklyOffPercentage}%)</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Card size="small" className="stat-card">
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>Total Records</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1890ff' }}>
              {stats.totalTarget}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Main Table Card */}
      <Card className="table-card" style={{ marginTop: 16 }}>
        {/* Filters */}
        <Row gutter={[16, 16]} className="filters-row">
          <Col xs={24} md={6}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search by name or role..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size="middle"
            />
          </Col>
          <Col xs={24} md={4}>
            <Select
              placeholder="Filter by Employee"
              value={employeeFilter}
              onChange={setEmployeeFilter}
              allowClear
              style={{ width: '100%' }}
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {employees.map(emp => (
                <Option key={emp.id} value={emp.id}>
                  {emp.firstname} {emp.lastname}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} md={4}>
            <Select
              placeholder="Filter by Status"
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
              style={{ width: '100%' }}
            >
              {STATUS_OPTIONS.map(opt => {
                const config = ATTENDANCE_STATUSES[opt.value];
                return (
                  <Option key={opt.value} value={opt.value}>
                    <Space>
                      <span style={{ color: config.color }}>{config.icon}</span>
                      <span>{opt.label}</span>
                    </Space>
                  </Option>
                );
              })}
            </Select>
          </Col>
          <Col xs={24} md={8}>
            <RangePicker
              value={dateRange}
              onChange={handleDateChange}
              format="DD MMM YYYY"
              presets={datePresets}
              style={{ width: '100%' }}
              allowClear={false}
            />
          </Col>
          <Col xs={24} md={2}>
            <Dropdown overlay={sortMenu} trigger={['click']}>
              <Button icon={<FilterOutlined />} style={{ width: '100%' }}>
                Sort
              </Button>
            </Dropdown>
          </Col>
        </Row>

        {/* Active Filters Info */}
        {(statusFilter || searchText || employeeFilter) && (
          <Alert
            message={
              <Space wrap>
                <span>Showing filtered results</span>
                {employeeFilter && (
                  <Tag color="blue">
                    {employees.find(e => e.id === employeeFilter)?.firstname || ''}
                    {employees.find(e => e.id === employeeFilter)?.lastname || ''}
                  </Tag>
                )}
                {statusFilter && (
                  <Tag color={ATTENDANCE_STATUSES[statusFilter]?.color || 'blue'}>
                    {ATTENDANCE_STATUSES[statusFilter]?.label || statusFilter}
                  </Tag>
                )}
                {searchText && <Tag>"{searchText}"</Tag>}
              </Space>
            }
            type="info"
            showIcon
            closable
            onClose={() => {
              setStatusFilter(null);
              setSearchText('');
              setEmployeeFilter(null);
            }}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Table */}
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="key"
          loading={loading}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['5', '10', '25', '50', '100'],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} records`,
            showQuickJumper: true,
          }}
          scroll={{ x: 1000 }}
          className="attendance-table"
          rowClassName={(record) => `status-${record.status}`}
        />
      </Card>

      {/* Footer */}
      <div className="footer">
        <Space>
          <Text type="secondary">
            <ClockCircleOutlined /> {dayjs().format('hh:mm A')}
          </Text>
          <Divider type="vertical" />
          <Text type="secondary">
            <CalendarOutlined /> {dayjs().format('DD/MM/YYYY')}
          </Text>
          <Divider type="vertical" />
          <Text type="secondary" style={{ fontSize: 11 }}>
            Requests Today: {queryOptimizer.requestCount}
          </Text>
        </Space>
      </div>
    </div>
  );
};

export default AttendancePage;