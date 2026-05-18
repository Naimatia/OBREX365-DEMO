import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Table, Tag, Space, Button, Input, Select, Modal, Form,
  message, Tooltip, Popconfirm, Typography, Row, Col,
  DatePicker, Tabs, Switch, TimePicker, Avatar, Badge,
  InputNumber, Divider, Alert, Empty, Timeline,
  Progress,
} from 'antd';
import {
  EditOutlined, DeleteOutlined, SearchOutlined,
  ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  CalendarOutlined, ReloadOutlined,
  LoginOutlined, LogoutOutlined, ThunderboltOutlined,
  WarningOutlined, IdcardOutlined, FieldTimeOutlined, LinkOutlined,
  FileExcelOutlined, EyeOutlined, CoffeeOutlined, ArrowLeftOutlined,
  UserOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  db, collection, query, where, getDocs, doc,
  addDoc, deleteDoc, updateDoc, serverTimestamp, orderBy,
} from 'configs/FirebaseConfig';
import UserService from 'services/firebase/UserService';
import { UserRoles } from 'models/UserModel';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';


const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

// ─── Config ───────────────────────────────────────────────────────────────────
// ─── Config ───────────────────────────────────────────────────────────────────
const DEFAULT_GRACE_MINUTES = 0;
const MONTHLY_LATE_ALLOWANCE = 60; // minutes per employee per month

const DEFAULT_SHIFT = { start: '10:00', end: '16:00', breakStart: '13:00', breakEnd: '14:00' };
const COLL_MAPPING = 'attendance_device_mapping';
const COLL_RECORDS = 'attendance';
const COLL_APPROVALS = 'attendance_approvals';

const PUNCH_CODE_MAP = {
  0: 'check-in',
  1: 'check-out',
  2: 'break-out',
  3: 'break-in',
  4: 'overtime-in',
  5: 'overtime-out',
};

const PUNCH_TYPE_CFG = {
  'check-in': { color: '#52c41a', bg: '#f6ffed', label: 'Check In', short: 'IN', icon: <LoginOutlined />, dotColor: 'green' },
  'check-out': { color: '#ff4d4f', bg: '#fff2f0', label: 'Check Out', short: 'OUT', icon: <LogoutOutlined />, dotColor: 'red' },
  'break-out': { color: '#fa8c16', bg: '#fff7e6', label: 'Break Out', short: 'BRK↓', icon: <CoffeeOutlined />, dotColor: 'orange' },
  'break-in': { color: '#1890ff', bg: '#e6f7ff', label: 'Break In', short: 'BRK↑', icon: <ArrowLeftOutlined />, dotColor: 'blue' },
  'overtime-in': { color: '#722ed1', bg: '#f9f0ff', label: 'OT In', short: 'OT↓', icon: <ThunderboltOutlined />, dotColor: 'purple' },
  'overtime-out': { color: '#531dab', bg: '#efdbff', label: 'OT Out', short: 'OT↑', icon: <ThunderboltOutlined />, dotColor: 'purple' },
};

const STAFF_ROLES = [
  UserRoles.SELLER, UserRoles.SALES_EXECUTIVE, UserRoles.AGENT,
  UserRoles.TEAM_LEADER, UserRoles.SALES_MANAGER,
  UserRoles.OFF_PLAN_SALES, UserRoles.READY_TO_MOVE_SALES, UserRoles.HR,
];

const C = {
  blue: '#1890ff', green: '#52c41a', red: '#ff4d4f',
  orange: '#fa8c16', purple: '#722ed1', gray: '#8c8c8c',
};
const STATUS_COLOR = { Present: 'green', Late: 'orange', Absent: 'red' };

// ─── Helpers ──────────────────────────────────────────────────────────────────
// ─── Helpers ──────────────────────────────────────────────────────────────────
const timeToMins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fmtDuration = m => (!m || m <= 0) ? '—' : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;


const fmtHHMM = d => d ? dayjs(d).format('HH:mm') : '—';
const toDate = t => t?.toDate ? t.toDate() : (t ? new Date(t) : null);


// Resolve punch type: prefer stored `type`, fallback to punchCode map
const resolveType = p =>
  p.type || PUNCH_CODE_MAP[Number(p.punchCode)] || PUNCH_CODE_MAP[Number(p.state)] || 'check-in';

// ─── Core: build one row ─────────────────────────────────────────────────────
const buildDailyRow = (emp, mapping, punchesForDay, dateStr, graceMinutes = DEFAULT_GRACE_MINUTES) => {
  if (!emp || !mapping || !dateStr) return null;

  const shift = mapping.shift || DEFAULT_SHIFT;
  const shiftStartMins = timeToMins(shift.start);
  const shiftEndMins = timeToMins(shift.end);
  const shiftTotalMins = shiftEndMins - shiftStartMins;

  // === IMPORTANT: Use Dubai Time for calculations ===
  const byType = {};
  (punchesForDay || []).forEach(p => {
    const type = resolveType(p);
    let ts = toDate(p.timestamp);
    if (!ts) return;

    if (!byType[type]) byType[type] = [];
    byType[type].push({ ts, raw: p });
  });

  Object.keys(byType).forEach(k => byType[k].sort((a, b) => a.ts - b.ts));

  const checkIns = (byType['check-in'] || []).map(x => x.ts);
  const checkOuts = (byType['check-out'] || []).map(x => x.ts);
  const breakOuts = (byType['break-out'] || []).map(x => x.ts);
  const breakIns = (byType['break-in'] || []).map(x => x.ts);
  const otIns = (byType['overtime-in'] || []).map(x => x.ts);
  const otOuts = (byType['overtime-out'] || []).map(x => x.ts);

  const firstIn = checkIns[0] || null;
  const lastOut = checkOuts[checkOuts.length - 1] || null;

  // ====================== DELAY CALCULATION ======================
  let delayMins = 0;
  if (firstIn) {
    const arrivalMins = dayjs(firstIn).hour() * 60 + dayjs(firstIn).minute();
    delayMins = Math.max(0, arrivalMins - shiftStartMins);
  }

  const status = !firstIn
    ? 'Absent'
    : delayMins > graceMinutes
      ? 'Late'
      : 'Present';

  // Break & OT
  let breakMins = 0;
  const bPairs = Math.min(breakOuts.length, breakIns.length);
  for (let i = 0; i < bPairs; i++) {
    const diff = Math.round((breakIns[i] - breakOuts[i]) / 60000);
    if (diff > 0) breakMins += diff;
  }

  let overtimeMins = 0;
  const otPairs = Math.min(otIns.length, otOuts.length);
  for (let i = 0; i < otPairs; i++) {
    const diff = Math.round((otOuts[i] - otIns[i]) / 60000);
    if (diff > 0) overtimeMins += diff;
  }

  let grossMins = 0;
  if (firstIn && lastOut) {
    grossMins = Math.max(0, Math.round((lastOut - firstIn) / 60000));
  }
  const workMins = Math.max(0, grossMins - breakMins);

  const missingMins = status === 'Absent'
    ? shiftTotalMins
    : Math.max(0, shiftTotalMins - workMins - overtimeMins);

  const onBreak = breakOuts.length > breakIns.length;
  const clockedIn = checkIns.length > 0 && checkOuts.length === 0;

  return {
    key: `${emp.id}_${dateStr}`,
    employeeId: emp.id,
    deviceUserId: mapping.deviceUserId || '',
    name: `${emp.firstname || ''} ${emp.lastname || ''}`.trim() || 'Unknown',
    department: emp.department || emp.Role || '',
    date: dateStr,
    weekday: dayjs(dateStr).format('ddd'),
    shift,
    firstIn,
    lastOut,
    breakMins,
    grossMins,
    workMins,
    overtimeMins,
    delayMins,
    missingMins,
    onBreak,
    clockedIn,
    status,
    approved: false,
    rawPunches: punchesForDay,
  };
};

// ─── Build matrix ─────────────────────────────────────────────────────────────
const buildMatrix = ({ rawRecords, employees, mappings, approvals, startDate, endDate, graceMinutes }) => {
  const mappingByCrmId = Object.fromEntries(mappings.map(m => [String(m.crmUserId), m]));
  const approvalMap = Object.fromEntries(approvals.map(a => [a.rowKey, a.approved]));

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
    employees.forEach(emp => {
      const mapping = mappingByCrmId[String(emp.id)];
      if (!mapping) return;
      const punches = punchGroup[`${mapping.deviceUserId}_${dateStr}`] || [];
      const row = buildDailyRow(emp, mapping, punches, dateStr, graceMinutes);  // ← pass graceMinutes
      if (row) {
        row.approved = approvalMap[row.key] || false;
        rows.push(row);
      }
    });
    cursor = cursor.add(1, 'day');
  }

  return rows.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (a.name || '').localeCompare(b.name || '');
  });
};

// ─── Excel export ─────────────────────────────────────────────────────────────
const exportToExcel = (rows, dateRange) => {
  if (!rows.length) { message.warning('No data to export'); return; }

  const logData = rows.map(r => ({
    'Date': r.date,
    'Day': r.weekday,
    'Employee': r.name,
    'Department': r.department,
    'Shift': `${r.shift.start}–${r.shift.end}`,
    'Check In': r.firstIn ? fmtHHMM(r.firstIn) : '',
    'Check Out': r.lastOut ? fmtHHMM(r.lastOut) : '',
    'Break Time': fmtDuration(r.breakMins),
    'Gross Time': fmtDuration(r.grossMins),
    'Net Work': fmtDuration(r.workMins),
    'Overtime': fmtDuration(r.overtimeMins),
    'Delay (min)': r.delayMins || 0,
    'Missing': fmtDuration(r.missingMins),
    'Punches': r.punchCount,
    'Status': r.status,
    'Approved': r.approved ? 'Yes' : 'No',
  }));

  const empStats = {};
  rows.forEach(r => {
    if (!empStats[r.name]) empStats[r.name] = {
      name: r.name, dept: r.department,
      present: 0, late: 0, absent: 0,
      work: 0, break: 0, overtime: 0, miss: 0,
    };
    const s = empStats[r.name];
    if (r.status === 'Present') s.present++;
    else if (r.status === 'Late') s.late++;
    else s.absent++;
    s.work += r.workMins;
    s.break += r.breakMins;
    s.overtime += r.overtimeMins;
    s.miss += r.missingMins;
  });

  const summaryData = Object.values(empStats).map(s => {
    const total = s.present + s.late + s.absent;
    return {
      'Employee': s.name,
      'Department': s.dept,
      'Present': s.present,
      'Late': s.late,
      'Absent': s.absent,
      'Total Days': total,
      'Attendance %': total > 0 ? `${Math.round((s.present + s.late) / total * 100)}%` : '0%',
      'Total Work': fmtDuration(s.work),
      'Total Break': fmtDuration(s.break),
      'Total Overtime': fmtDuration(s.overtime),
      'Total Missing': fmtDuration(s.miss),
    };
  });

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(logData);
  ws1['!cols'] = Array(16).fill({ wch: 14 });
  XLSX.utils.book_append_sheet(wb, ws1, 'Attendance Log');

  const ws2 = XLSX.utils.json_to_sheet(summaryData);
  ws2['!cols'] = Array(11).fill({ wch: 16 });
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary by Employee');

  XLSX.writeFile(wb, `Attendance_${dateRange[0].format('YYYYMMDD')}_${dateRange[1].format('YYYYMMDD')}.xlsx`);
  message.success('Excel downloaded');
};

// ─────────────────────────────────────────────────────────────────────────────
// Mapping Modal — with break time config
// ─────────────────────────────────────────────────────────────────────────────
const MappingModal = ({ visible, onCancel, onSave, initial, employees, loading }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (!visible) return;
    form.resetFields();
    const s = initial?.shift || DEFAULT_SHIFT;
    form.setFieldsValue({
      crmUserId: initial?.crmUserId,
      deviceUserId: initial ? Number(initial.deviceUserId) : undefined,
      shiftStart: dayjs(s.start || '09:00', 'HH:mm'),
      shiftEnd: dayjs(s.end || '18:00', 'HH:mm'),
      breakStart: dayjs(s.breakStart || '13:00', 'HH:mm'),
      breakEnd: dayjs(s.breakEnd || '14:00', 'HH:mm'),
    });
  }, [visible, initial]);

  return (
    <Modal
      title={initial ? 'Edit Mapping' : 'Link Employee → Device'}
      open={visible} onCancel={onCancel} footer={null} destroyOnClose width={480}
    >
      <Alert type="info" showIcon style={{ marginBottom: 14 }}
        message="Find the employee's numeric User ID on the ZKTeco device under User Management." />
      <Form
        form={form} layout="vertical"
        onFinish={v => onSave({
          crmUserId: v.crmUserId,
          deviceUserId: String(v.deviceUserId),
          shift: {
            start: v.shiftStart.format('HH:mm'),
            end: v.shiftEnd.format('HH:mm'),
            breakStart: v.breakStart.format('HH:mm'),
            breakEnd: v.breakEnd.format('HH:mm'),
          },
        })}
      >
        <Form.Item name="crmUserId" label="Employee (CRM)"
          rules={[{ required: true, message: 'Select an employee' }]}>
          <Select showSearch placeholder="Select seller / staff"
            filterOption={(i, o) => String(o.children).toLowerCase().includes(i.toLowerCase())}>
            {employees.map(e => (
              <Option key={e.id} value={e.id}>
                {e.firstname} {e.lastname} — <Text type="secondary">{e.Role}</Text>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="deviceUserId" label="ZKTeco Device User ID"
          tooltip="Numeric ID assigned to this person on the physical device"
          rules={[{ required: true, message: 'Required' }]}>
          <InputNumber min={1} style={{ width: '100%' }} placeholder="e.g. 1, 2, 3…" />
        </Form.Item>

        <Divider style={{ margin: '4px 0 12px' }}>
          <FieldTimeOutlined style={{ marginRight: 6, color: C.purple }} />Working Shift
        </Divider>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="shiftStart" label="Start" rules={[{ required: true }]}>
              <TimePicker format="HH:mm" minuteStep={15} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="shiftEnd" label="End" rules={[{ required: true }]}>
              <TimePicker format="HH:mm" minuteStep={15} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '4px 0 12px' }}>
          <CoffeeOutlined style={{ marginRight: 6, color: C.orange }} />Scheduled Break
        </Divider>
        <Alert type="warning" showIcon style={{ marginBottom: 10, fontSize: 11 }}
          message="These are expected break times. Actual break is calculated from device break-out / break-in punches." />
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="breakStart" label="Break Start">
              <TimePicker format="HH:mm" minuteStep={15} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="breakEnd" label="Break End">
              <TimePicker format="HH:mm" minuteStep={15} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading} icon={<LinkOutlined />}>
              {initial ? 'Update' : 'Link Employee'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Punch Detail Modal — type-grouped timeline
// ─────────────────────────────────────────────────────────────────────────────
const PunchDetailModal = ({ row, onClose }) => {
  if (!row) return null;

  const sorted = [...(row.rawPunches || [])]
    .map(p => ({ ...p, resolvedType: resolveType(p), ts: toDate(p.timestamp) }))
    .filter(p => p.ts)
    .sort((a, b) => a.ts - b.ts);

  const shift = row.shift || DEFAULT_SHIFT;
  const scheduledBreakMins = shift.breakStart && shift.breakEnd
    ? timeToMins(shift.breakEnd) - timeToMins(shift.breakStart)
    : null;

  return (
    <Modal
      open={!!row} onCancel={onClose} footer={null} width={460}
      title={
        <Space>
          <Avatar size={32} style={{ background: C.blue, fontSize: 12 }}>
            {(row.name?.[0] || '?').toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 700, lineHeight: 1.2 }}>{row.name}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {row.date} · {row.weekday} · Shift {shift.start}–{shift.end}
            </Text>
          </div>
        </Space>
      }
    >
      {/* Status + summary chips */}
      <Space wrap style={{ marginBottom: 12 }}>
        <Tag color={STATUS_COLOR[row.status]} style={{ fontWeight: 700 }}>{row.status}</Tag>
        {row.firstIn && <Tag color="green" icon={<LoginOutlined />}>{fmtHHMM(row.firstIn)}</Tag>}
        {row.lastOut && <Tag color="red" icon={<LogoutOutlined />}>{fmtHHMM(row.lastOut)}</Tag>}
        {row.breakMins > 0 && <Tag color="orange" icon={<CoffeeOutlined />}>{fmtDuration(row.breakMins)}</Tag>}
        {row.workMins > 0 && <Tag color="blue" icon={<ClockCircleOutlined />}>{fmtDuration(row.workMins)}</Tag>}
        {row.overtimeMins > 0 && <Tag color="purple" icon={<ThunderboltOutlined />}>OT {fmtDuration(row.overtimeMins)}</Tag>}
        {row.delayMins > 0 && <Tag color="orange" icon={<WarningOutlined />}>+{row.delayMins} min late</Tag>}
        {row.onBreak && <Tag color="orange" style={{ fontWeight: 700 }}>🔴 On Break</Tag>}
        {row.clockedIn && <Tag color="green" style={{ fontWeight: 700 }}>🟢 Still Clocked In</Tag>}
      </Space>

      {/* Scheduled break info */}
      {scheduledBreakMins && (
        <div style={{
          background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 6,
          padding: '6px 10px', marginBottom: 10, fontSize: 11,
        }}>
          <CoffeeOutlined style={{ color: C.orange, marginRight: 6 }} />
          <Text style={{ fontSize: 11 }}>
            Scheduled break: <strong>{shift.breakStart}–{shift.breakEnd}</strong>
            {' '}({fmtDuration(scheduledBreakMins)})
            {row.breakMins > 0 && (
              <Text type="secondary"> · Actual: <strong>{fmtDuration(row.breakMins)}</strong></Text>
            )}
          </Text>
        </div>
      )}

      <Divider style={{ margin: '8px 0' }}>
        All Punches ({sorted.length})
      </Divider>

      {sorted.length === 0 ? (
        <Empty description="No punches recorded" />
      ) : (
        <Timeline style={{ marginTop: 12, paddingLeft: 4 }}>
          {sorted.map((p, i) => {
            const cfg = PUNCH_TYPE_CFG[p.resolvedType] || PUNCH_TYPE_CFG['check-in'];
            return (
              <Timeline.Item key={i} color={cfg.dotColor} dot={
                <span style={{
                  fontSize: 14, color: cfg.color,
                  background: cfg.bg, borderRadius: '50%',
                  padding: '2px',
                }}>
                  {cfg.icon}
                </span>
              }>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Tag color={cfg.color} style={{ minWidth: 70, textAlign: 'center', fontWeight: 700, fontSize: 11 }}>
                    {cfg.label}
                  </Tag>
                  <Text strong style={{ fontSize: 14, fontFamily: 'monospace' }}>
{dayjs(p.ts).format('HH:mm:ss') || '—'}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>{p.deviceId || ''}</Text>
                </div>
              </Timeline.Item>
            );
          })}
        </Timeline>
      )}
    </Modal>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
const ZKAttendancePage = () => {
  const reduxUser = useSelector(s => s.auth.user);
  const companyId = reduxUser?.company_id || '';

  const [employees, setEmployees] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [rawRecords, setRawRecords] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [matrix, setMatrix] = useState([]);

  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState('log');
  const [savingKey, setSavingKey] = useState(null);
  const [punchRow, setPunchRow] = useState(null);

  const [mapVisible, setMapVisible] = useState(false);
  const [editingMap, setEditingMap] = useState(null);
  const [mapSaving, setMapSaving] = useState(false);

  // Default: today only
  const [dateRange, setDateRange] = useState([dayjs(), dayjs()]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(undefined);
  const [deptFilter, setDeptFilter] = useState(undefined);


  const [graceMinutes, setGraceMinutes] = useState(DEFAULT_GRACE_MINUTES);
  const [selectedMonth, setSelectedMonth] = useState(dayjs());

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchEmployees = useCallback(async () => {
    if (!companyId) return;
    try {
      const all = await UserService.getUsersByCompanyId(companyId);
      setEmployees(all.filter(u => STAFF_ROLES.includes(u.Role)));
    } catch (e) { console.error(e); }
  }, [companyId]);

  const fetchMappings = useCallback(async () => {
    if (!companyId) return;
    try {
      const snap = await getDocs(query(collection(db, COLL_MAPPING), where('company_id', '==', companyId)));
      setMappings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  }, [companyId]);

  const fetchRecords = useCallback(async () => {
    if (!companyId) return;
    setLoadingData(true);
    try {
      const start = dateRange[0].startOf('day').toDate();
      const end = dateRange[1].endOf('day').toDate();

      const snap = await getDocs(
        query(collection(db, COLL_RECORDS),
          where('company_id', '==', companyId),
          orderBy('timestamp', 'desc'))
      );
      const recs = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => {
        const ts = toDate(r.timestamp);
        return ts && ts >= start && ts <= end;
      });
      setRawRecords(recs);
    } catch (e) {
      if (e.code === 'failed-precondition')
        message.error('Missing Firestore index — check console for the link to create it');
      else message.error('Load failed: ' + e.message);
    } finally { setLoadingData(false); }
  }, [companyId, dateRange]);

  const fetchApprovals = useCallback(async () => {
    if (!companyId) return;
    try {
      const snap = await getDocs(query(collection(db, COLL_APPROVALS), where('company_id', '==', companyId)));
      setApprovals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  }, [companyId]);

  useEffect(() => { fetchEmployees(); fetchMappings(); fetchApprovals(); }, [fetchEmployees, fetchMappings, fetchApprovals]);
  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  useEffect(() => {
    if (!employees.length || !mappings.length) { setMatrix([]); return; }
    setMatrix(buildMatrix({
      rawRecords, employees, mappings, approvals,
      startDate: dateRange[0].toDate(),
      endDate: dateRange[1].toDate(),
      graceMinutes,
    }));
  }, [rawRecords, employees, mappings, approvals, dateRange, graceMinutes]);

  // Monthly Late Summary Calculation
  const monthlyLateData = useMemo(() => {
    const map = {};
    matrix.forEach(row => {
      if (row.status === 'Late' && row.delayMins > 0) {
        const monthKey = dayjs(row.date).format('YYYY-MM');
        if (!map[row.name]) {
          map[row.name] = {
            name: row.name,
            department: row.department,
            totalLate: 0,
          };
        }
        map[row.name].totalLate += row.delayMins;
      }
    });
    return Object.values(map);
  }, [matrix]);

  // ── Approval toggle ────────────────────────────────────────────────────────
  const toggleApproval = async (row) => {
    setSavingKey(row.key);
    try {
      const newVal = !row.approved;
      const q = query(collection(db, COLL_APPROVALS),
        where('company_id', '==', companyId), where('rowKey', '==', row.key));
      const sn = await getDocs(q);
      const data = {
        company_id: companyId, rowKey: row.key, employeeId: row.employeeId,
        date: row.date, approved: newVal, approvedBy: reduxUser?.email || '',
        updatedAt: serverTimestamp(),
      };
      if (sn.empty) await addDoc(collection(db, COLL_APPROVALS), data);
      else await updateDoc(doc(db, COLL_APPROVALS, sn.docs[0].id), data);
      setMatrix(prev => prev.map(r => r.key === row.key ? { ...r, approved: newVal } : r));
    } catch (e) { message.error('Failed to save approval'); }
    finally { setSavingKey(null); }
  };

  // ── Mapping CRUD ───────────────────────────────────────────────────────────
  const handleSaveMapping = async (vals) => {
    setMapSaving(true);
    try {
      const data = { ...vals, company_id: companyId };
      if (editingMap) {
        await updateDoc(doc(db, COLL_MAPPING, editingMap.id), { ...data, updatedAt: serverTimestamp() });
        message.success('Mapping updated');
      } else {
        await addDoc(collection(db, COLL_MAPPING), { ...data, createdAt: serverTimestamp() });
        message.success('Employee linked to device');
      }
      setMapVisible(false); setEditingMap(null); fetchMappings();
    } catch (e) { message.error(e.message); }
    finally { setMapSaving(false); }
  };

  // ── Filtered rows ──────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => matrix.filter(r => {
    if (search) {
      const q = search.toLowerCase();
      if (!r.name?.toLowerCase().includes(q) && !r.department?.toLowerCase().includes(q)) return false;
    }
    if (statusFilter && r.status !== statusFilter) return false;
    if (deptFilter && r.department !== deptFilter) return false;
    return true;
  }), [matrix, search, statusFilter, deptFilter]);

  const stats = useMemo(() => ({
    present: filteredRows.filter(r => r.status === 'Present').length,
    late: filteredRows.filter(r => r.status === 'Late').length,
    absent: filteredRows.filter(r => r.status === 'Absent').length,
    approved: filteredRows.filter(r => r.approved).length,
    onBreak: filteredRows.filter(r => r.onBreak).length,
    clockedIn: filteredRows.filter(r => r.clockedIn && !r.onBreak).length,
    workMins: filteredRows.reduce((s, r) => s + r.workMins, 0),
    breakMins: filteredRows.reduce((s, r) => s + r.breakMins, 0),
    overtimeMins: filteredRows.reduce((s, r) => s + r.overtimeMins, 0),
    missMins: filteredRows.reduce((s, r) => s + r.missingMins, 0),
  }), [filteredRows]);

  const departments = useMemo(() =>
    [...new Set(employees.map(e => e.department || e.Role).filter(Boolean))],
    [employees]);

  const unmapped = useMemo(() => {
    const m = new Set(mappings.map(m => m.crmUserId));
    return employees.filter(e => !m.has(e.id));
  }, [employees, mappings]);

  const empById = useMemo(() =>
    Object.fromEntries(employees.map(e => [e.id, e])),
    [employees]);

  // Date range presets
  const datePresets = [
    { label: 'Today', value: [dayjs(), dayjs()] },
    { label: 'Yesterday', value: [dayjs().subtract(1, 'day'), dayjs().subtract(1, 'day')] },
    { label: 'This Week', value: [dayjs().startOf('week'), dayjs().endOf('week')] },
    { label: 'Last 7 Days', value: [dayjs().subtract(6, 'day'), dayjs()] },
    { label: 'This Month', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
    { label: 'Last 30 Days', value: [dayjs().subtract(29, 'day'), dayjs()] },
  ];

  // ── Attendance columns ─────────────────────────────────────────────────────
  const attCols = [
    {
      title: 'Employee',
      key: 'name',
      fixed: 'left',
      width: 220,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (_, r) => (
        <Space size={8}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <Avatar
              size={36}
              style={{
                background: C.blue,
                fontSize: 14,
                fontWeight: 600
              }}
            >
              {(r.name?.[0] || '?').toUpperCase()}
            </Avatar>

            {/* Small Green Circle for Active Employees */}
            {r.clockedIn && (
              <div style={{
                position: 'absolute',
                bottom: 2,
                right: 2,
                width: 12,
                height: 12,
                backgroundColor: '#52c41a',
                border: '2px solid white',
                borderRadius: '50%',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
              }} />
            )}
          </div>

          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>{r.department}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (_, r) => (
        <Space size={4} direction="vertical" align="center" style={{ gap: 2 }}>
          <Tag
            color={STATUS_COLOR[r.status]}
            style={{ fontWeight: 700, minWidth: 68, textAlign: 'center', fontSize: 12 }}
          >
            {r.status}
          </Tag>

          {r.onBreak && (
            <Tag color="orange" style={{ fontSize: 10, padding: '0 6px' }}>
              On Break
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Date', key: 'date', width: 90,
      sorter: (a, b) => a.date.localeCompare(b.date),
      defaultSortOrder: 'descend',
      render: (_, r) => (
        <div style={{ fontSize: 11 }}>
          <div style={{ fontWeight: 600 }}>{dayjs(r.date).format('DD MMM YY')}</div>
          <Text type="secondary" style={{ fontSize: 10 }}>{r.weekday}</Text>
        </div>
      ),
    },

    {
      title: 'Working Shift',
      key: 'shift',
      width: 145,
      render: (_, r) => {
        const s = r.shift || DEFAULT_SHIFT;
        return (
          <div style={{ lineHeight: '1.6' }}>
            <div style={{ color: C.purple, fontWeight: 600, fontSize: 13 }}>
              {s.start} – {s.end}
            </div>
            {s.breakStart && s.breakEnd && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                Break • {s.breakStart} – {s.breakEnd}
              </Text>
            )}
          </div>
        );
      },
    },
    //  columns (Check In, Check Out, etc.)
    {
      title: <span style={{ color: C.green }}><LoginOutlined /> Check In</span>,
      key: 'firstIn', width: 78, align: 'center',
      render: (_, r) => (
        <Text style={{ fontSize: 13, fontWeight: r.firstIn ? 700 : 400, fontFamily: 'monospace', color: r.firstIn ? C.green : C.gray }}>
          {fmtHHMM(r.firstIn)}
        </Text>
      ),
    },
    {
      title: <span style={{ color: C.red }}><LogoutOutlined /> Check Out</span>,
      key: 'lastOut', width: 78, align: 'center',
      render: (_, r) => (
        <Text style={{ fontSize: 13, fontWeight: r.lastOut ? 700 : 400, fontFamily: 'monospace', color: r.lastOut ? C.red : C.gray }}>
          {r.lastOut ? fmtHHMM(r.lastOut) : r.clockedIn ? '…' : '—'}
        </Text>
      ),
    },

    // === NEW COLUMNS ===
    {
      title: <span style={{ color: C.orange }}><CoffeeOutlined /> Break Out</span>,
      key: 'breakOut',
      width: 85,
      align: 'center',
      render: (_, r) => {
        const firstBreakOut = r.rawPunches?.find(p => resolveType(p) === 'break-out');
        return firstBreakOut ? (
          <Tooltip title={r.breakOutCount > 1 ? `Total ${r.breakOutCount} breaks` : ''}>
            <Text style={{ fontSize: 13, fontFamily: 'monospace', color: C.orange, fontWeight: 600 }}>
              {fmtHHMM(toDate(firstBreakOut.timestamp))}
            </Text>
          </Tooltip>
        ) : <Text type="secondary" style={{ fontSize: 10 }}>—</Text>;
      },
    },
    {
      title: <span style={{ color: C.blue }}><ArrowLeftOutlined /> Break In</span>,
      key: 'breakIn',
      width: 85,
      align: 'center',
      render: (_, r) => {
        const firstBreakIn = r.rawPunches?.find(p => resolveType(p) === 'break-in');
        return firstBreakIn ? (
          <Text style={{ fontSize: 13, fontFamily: 'monospace', color: C.blue, fontWeight: 600 }}>
            {fmtHHMM(toDate(firstBreakIn.timestamp))}
          </Text>
        ) : <Text type="secondary" style={{ fontSize: 10 }}>—</Text>;
      },
    },

    {
      title: <span style={{ color: C.purple }}><ThunderboltOutlined /> OT In</span>,
      key: 'otIn',
      width: 85,
      align: 'center',
      render: (_, r) => {
        const firstOtIn = r.rawPunches?.find(p => resolveType(p) === 'overtime-in');
        return firstOtIn ? (
          <Text style={{ fontSize: 13, fontFamily: 'monospace', color: C.purple, fontWeight: 600 }}>
            {fmtHHMM(toDate(firstOtIn.timestamp))}
          </Text>
        ) : <Text type="secondary" style={{ fontSize: 10 }}>—</Text>;
      },
    },
    {
      title: <span style={{ color: C.purple }}><ThunderboltOutlined /> OT Out</span>,
      key: 'otOut',
      width: 85,
      align: 'center',
      render: (_, r) => {
        const firstOtOut = r.rawPunches?.find(p => resolveType(p) === 'overtime-out');
        return firstOtOut ? (
          <Text style={{ fontSize: 13, fontFamily: 'monospace', color: C.purple, fontWeight: 600 }}>
            {fmtHHMM(toDate(firstOtOut.timestamp))}
          </Text>
        ) : <Text type="secondary" style={{ fontSize: 10 }}>—</Text>;
      },
    },



    {
      title: <span style={{ color: C.orange }}><CoffeeOutlined /> Break</span>,
      key: 'break', width: 76, align: 'center',
      sorter: (a, b) => a.breakMins - b.breakMins,
      render: (_, r) => (
        r.breakMins > 0
          ? <Tag color="orange" style={{ fontSize: 10 }}>{fmtDuration(r.breakMins)}</Tag>
          : r.onBreak
            ? <Tag color="orange" style={{ fontSize: 10, fontWeight: 700 }}>…</Tag>
            : <Text type="secondary" style={{ fontSize: 10 }}>—</Text>
      ),
    },

    {
      title: <span style={{ color: C.blue }}><ClockCircleOutlined /> Net Work</span>,
      key: 'working', width: 90, align: 'center',
      sorter: (a, b) => a.workMins - b.workMins,
      render: (_, r) => (
        <Tooltip title={r.grossMins > 0 ? `Gross: ${fmtDuration(r.grossMins)} − Break: ${fmtDuration(r.breakMins)}` : ''}>
          <Text style={{ fontSize: 11, color: r.workMins > 0 ? C.blue : C.gray, fontWeight: 600 }}>
            {fmtDuration(r.workMins)}
          </Text>
        </Tooltip>
      ),
    },

    {
      title: <Tooltip title={`Late by N min (grace: ${graceMinutes} min)`}><span style={{ color: C.orange }}><WarningOutlined /> Delay</span></Tooltip>,
      key: 'delay', width: 76, align: 'center',
      sorter: (a, b) => a.delayMins - b.delayMins,
      render: (_, r) => (
        r.delayMins > 0
          ? <Tag color="orange" style={{ fontSize: 10, fontWeight: 700 }}>+{r.delayMins}m</Tag>
          : <Text type="secondary" style={{ fontSize: 10 }}>—</Text>
      ),
    },

    {
      title: <span style={{ color: C.red }}>Missing</span>,
      key: 'missing', width: 82, align: 'center',
      sorter: (a, b) => a.missingMins - b.missingMins,
      render: (_, r) => (
        r.missingMins > 0
          ? <Tag color="red" style={{ fontSize: 10 }}>{fmtDuration(r.missingMins)}</Tag>
          : <Text type="secondary" style={{ fontSize: 10 }}>—</Text>
      ),
    },

    {
      title: <span style={{ color: C.purple }}><ThunderboltOutlined /> OT</span>,
      key: 'overtime', width: 76, align: 'center',
      sorter: (a, b) => a.overtimeMins - b.overtimeMins,
      render: (_, r) => (
        r.overtimeMins > 0
          ? <Tag color="purple" style={{ fontSize: 10 }}>+{fmtDuration(r.overtimeMins)}</Tag>
          : <Text type="secondary" style={{ fontSize: 10 }}>—</Text>
      ),
    },

    {
      title: 'Approved', key: 'approved', width: 86, align: 'center',
      render: (_, r) => (
        <Switch size="small" checked={r.approved} loading={savingKey === r.key}
          onChange={() => toggleApproval(r)}
          checkedChildren={<CheckCircleOutlined />} unCheckedChildren="○" />
      ),
    },
    {
      title: '', key: 'actions', width: 46, align: 'center', fixed: 'right',
      render: (_, r) => (
        <Tooltip title="View all punches">
          <Button size="small" icon={<EyeOutlined />} onClick={() => setPunchRow(r)} />
        </Tooltip>
      ),
    },
  ];

  // ── Mapping table columns ──────────────────────────────────────────────────
  const mapCols = [
    {
      title: 'Employee', key: 'emp',
      render: (_, r) => {
        const e = empById[r.crmUserId];
        const name = e ? `${e.firstname || ''} ${e.lastname || ''}`.trim() : `Unknown (${r.crmUserId})`;
        return (
          <Space>
            <Avatar size={28} style={{ background: C.purple, fontSize: 11 }}>
              {(name?.[0] || '?').toUpperCase()}
            </Avatar>
            <div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{name}</div>
              <Text type="secondary" style={{ fontSize: 10 }}>{e?.Role || ''}</Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Device User ID', dataIndex: 'deviceUserId', key: 'devId',
      render: id => (
        <Tag icon={<IdcardOutlined />} color="blue"
          style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>
          {id}
        </Tag>
      ),
    },
    {
      title: 'Shift', key: 'shift',
      render: (_, r) => (
        <div style={{ lineHeight: 1.6 }}>
          <div>
            <FieldTimeOutlined style={{ marginRight: 4, color: C.purple }} />
            <Text style={{ fontSize: 12 }}>{r.shift?.start || '—'} – {r.shift?.end || '—'}</Text>
          </div>
          {r.shift?.breakStart && r.shift?.breakEnd && (
            <div>
              <CoffeeOutlined style={{ marginRight: 4, color: C.orange }} />
              <Text type="secondary" style={{ fontSize: 11 }}>
                {r.shift.breakStart} – {r.shift.breakEnd}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />}
            onClick={() => { setEditingMap(r); setMapVisible(true); }} />
          <Popconfirm title="Remove this mapping?" okText="Yes" cancelText="No"
            onConfirm={async () => {
              await deleteDoc(doc(db, COLL_MAPPING, r.id));
              message.success('Mapping removed'); fetchMappings();
            }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 16 }}>

      {/* Header */}
      <Card bodyStyle={{ padding: '14px 20px' }} style={{ marginBottom: 14 }}>
        <Row align="middle">
          <Col flex="auto">
            <Title level={3} style={{ margin: 0 }}>
              <ClockCircleOutlined style={{ color: C.blue, marginRight: 8 }} />
              Biometric Attendance
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              ZKTeco · type-based punch tracking · {mappings.length} employees linked
            </Text>
          </Col>
          <Col>
            <Space wrap>
              <Button icon={<ReloadOutlined />} onClick={() => { fetchRecords(); fetchApprovals(); }}>
                Refresh
              </Button>
              <Button icon={<FileExcelOutlined />}
                style={{ color: C.green, borderColor: C.green }}
                onClick={() => exportToExcel(filteredRows, dateRange)}>
                Export Excel
              </Button>
              <Button type="primary" icon={<LinkOutlined />}
                onClick={() => { setEditingMap(null); setMapVisible(true); }}>
                Link Employee
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Unmapped warning */}
      {unmapped.length > 0 && (
        <Alert type="warning" showIcon style={{ marginBottom: 14 }}
          message={`${unmapped.length} seller(s) not linked to a device: ${unmapped.slice(0, 3).map(e => `${e.firstname} ${e.lastname}`).join(', ')}${unmapped.length > 3 ? '…' : ''}`}
          action={<Button size="small" onClick={() => setActiveTab('mapping')}>Link now</Button>}
        />
      )}

      {/* KPI strip */}
      <Row gutter={[10, 10]} style={{ marginBottom: 14 }}>
        {[
          { label: 'Present', val: stats.present, color: C.green, icon: <CheckCircleOutlined /> },
          { label: 'Late', val: stats.late, color: C.orange, icon: <WarningOutlined /> },
          { label: 'Absent', val: stats.absent, color: C.red, icon: <CloseCircleOutlined /> },
          { label: 'Active Now', val: stats.clockedIn, color: '#13c2c2', icon: <UserOutlined /> },
          { label: 'On Break', val: stats.onBreak, color: C.orange, icon: <CoffeeOutlined /> },
          { label: 'Net Work', val: fmtDuration(stats.workMins), color: C.blue, icon: <ClockCircleOutlined /> },
          { label: 'Break', val: fmtDuration(stats.breakMins), color: C.orange, icon: <CoffeeOutlined /> },
          { label: 'Missing', val: fmtDuration(stats.missMins), color: C.red, icon: <WarningOutlined /> },
          { label: 'Overtime', val: fmtDuration(stats.overtimeMins), color: C.purple, icon: <ThunderboltOutlined /> },
        ].map(s => (
          <Col xs={12} sm={8} md={3} flex="1" key={s.label}>
            <Card size="small" bodyStyle={{ padding: '10px 12px' }} style={{
              borderRadius: 10, border: `1px solid ${s.color}33`,
              background: `linear-gradient(135deg,#fff 55%,${s.color}0a 100%)`,
            }}>
              <div style={{ color: s.color, fontSize: 14, marginBottom: 2 }}>{s.icon}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: s.color, lineHeight: 1.1 }}>{s.val}</div>
              <Text type="secondary" style={{ fontSize: 10 }}>{s.label}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Tabs */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>

          {/* ── Log Tab ── */}
          <TabPane tab={<span><CalendarOutlined /> Attendance Log</span>} key="log">
            <Row gutter={[10, 10]} style={{ marginBottom: 14 }}>

              {/* Date range with quick presets */}
              <Col xs={24} sm={12} md={8}>
                <Space size={4}>
                  <RangePicker
                    value={dateRange}
                    onChange={d => d && setDateRange(d)}
                    format="DD MMM YYYY"
                    presets={datePresets}
                    style={{ width: '100%' }}
                    allowClear={false}
                  />
                </Space>
              </Col>

              {/* Quick date buttons */}
              <Col xs={24} sm={12} md={6}>
                <Space size={4} wrap>
                  {[
                    { label: 'Today', range: [dayjs(), dayjs()] },
                    { label: 'Yesterday', range: [dayjs().subtract(1, 'day'), dayjs().subtract(1, 'day')] },
                    { label: 'This Week', range: [dayjs().startOf('week'), dayjs().endOf('week')] },
                  ].map(p => {
                    const isActive =
                      dateRange[0].format('YYYY-MM-DD') === p.range[0].format('YYYY-MM-DD') &&
                      dateRange[1].format('YYYY-MM-DD') === p.range[1].format('YYYY-MM-DD');
                    return (
                      <Button key={p.label} size="small"
                        type={isActive ? 'primary' : 'default'}
                        onClick={() => setDateRange(p.range)}>
                        {p.label}
                      </Button>
                    );
                  })}
                </Space>
              </Col>

              <Col xs={24} sm={8} md={4}>
                <Input prefix={<SearchOutlined />} placeholder="Name / dept…"
                  value={search} onChange={e => setSearch(e.target.value)} allowClear />
              </Col>
              <Col xs={12} sm={6} md={3}>
                <Select placeholder="Status" style={{ width: '100%' }}
                  value={statusFilter} onChange={setStatusFilter} allowClear>
                  <Option value="Present">Present</Option>
                  <Option value="Late">Late</Option>
                  <Option value="Absent">Absent</Option>
                </Select>
              </Col>
              <Col xs={12} sm={6} md={3}>
                <Select placeholder="Department" style={{ width: '100%' }}
                  value={deptFilter} onChange={setDeptFilter} allowClear>
                  {departments.map(d => <Option key={d} value={d}>{d}</Option>)}
                </Select>
              </Col>
            </Row>

            {mappings.length === 0 && (
              <Alert type="info" showIcon style={{ marginBottom: 14 }}
                message='No device mappings yet — go to "Device Mapping" tab to link employees to their ZKTeco User IDs.' />
            )}

            <Table
              columns={attCols} dataSource={filteredRows} rowKey="key"
              loading={loadingData} scroll={{ x: 1680 }} size="small"
              pagination={{
                defaultPageSize: 25, showSizeChanger: true,
                pageSizeOptions: ['10', '25', '50', '100'],
                showTotal: (t, [f, l]) => `${f}–${l} of ${t} records`,
              }}
              rowClassName={r =>
                r.status === 'Absent' ? 'att-absent' : r.status === 'Late' ? 'att-late' : ''}
              summary={data => (
                <Table.Summary.Row style={{ fontWeight: 700, background: '#f5f7ff' }}>
                  <Table.Summary.Cell colSpan={5} index={0}>
                    <Text strong style={{ fontSize: 12 }}>Totals — {data.length} records</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} />
                  <Table.Summary.Cell index={6} />
                  <Table.Summary.Cell index={7} style={{ textAlign: 'center' }}>
                    <Text style={{ color: C.orange, fontSize: 11 }}>{fmtDuration(data.reduce((s, r) => s + r.breakMins, 0))}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={8} style={{ textAlign: 'center' }}>
                    <Text style={{ color: C.blue, fontSize: 11 }}>{fmtDuration(data.reduce((s, r) => s + r.workMins, 0))}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={9} style={{ textAlign: 'center' }}>
                    <Text style={{ color: C.orange, fontSize: 11 }}>{data.filter(r => r.delayMins > 0).length} late</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={10} style={{ textAlign: 'center' }}>
                    <Text style={{ color: C.red, fontSize: 11 }}>{fmtDuration(data.reduce((s, r) => s + r.missingMins, 0))}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={11} style={{ textAlign: 'center' }}>
                    <Text style={{ color: C.purple, fontSize: 11 }}>+{fmtDuration(data.reduce((s, r) => s + r.overtimeMins, 0))}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell colSpan={2} index={12} />
                </Table.Summary.Row>
              )}
            />
          </TabPane>

          {/* ── Mapping Tab ── */}
          <TabPane
            tab={
              <span>
                <LinkOutlined /> Device Mapping
                {unmapped.length > 0 && (
                  <Badge count={unmapped.length} size="small" style={{ marginLeft: 6 }} />
                )}
              </span>
            }
            key="mapping"
          >
            <div style={{ marginBottom: 12 }}>
              <Button type="primary" icon={<LinkOutlined />}
                onClick={() => { setEditingMap(null); setMapVisible(true); }}>
                Link Employee to Device
              </Button>
            </div>
            {unmapped.length > 0 && (
              <Alert type="warning" showIcon style={{ marginBottom: 12 }}
                message={`${unmapped.length} staff member(s) not yet linked to a device user ID`} />
            )}
            <Table
              columns={mapCols}
              dataSource={mappings.map(m => ({
                ...m,
                empName: empById[m.crmUserId]
                  ? `${empById[m.crmUserId].firstname} ${empById[m.crmUserId].lastname}`.trim()
                  : `Unknown (${m.crmUserId})`,
              }))}
              rowKey="id" size="small"
              pagination={{ defaultPageSize: 20, showSizeChanger: true }}
            />
          </TabPane>

          {/* ==================== NEW MANAGEMENT TAB ==================== */}
          <TabPane
            tab={<span><SettingOutlined /> Management</span>}
            key="management"
          >
            <Row gutter={16}>
              <Col span={10}>
                <Card title="Global Attendance Settings">
                  <Form layout="vertical">
                    <Form.Item label="Grace Period (Late Tolerance)">
                      <InputNumber
                        value={graceMinutes}
                        onChange={setGraceMinutes}
                        min={0}
                        max={60}
                        addonAfter="minutes"
                        style={{ width: '100%' }}
                      />
                      <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
                        Any arrival after shift start + {graceMinutes} minutes = Late
                      </Text>
                    </Form.Item>
                    <Button type="primary" onClick={() => message.success('Settings updated')}>
                      Save Settings
                    </Button>
                  </Form>
                </Card>
              </Col>

              <Col span={14}>
                <Card title={`Monthly Late Allowance - ${selectedMonth.format('MMMM YYYY')}`}>
                  <Space style={{ marginBottom: 16 }}>
                    <DatePicker
                      picker="month"
                      value={selectedMonth}
                      onChange={setSelectedMonth}
                      format="MMMM YYYY"
                    />
                    <Text strong>Allowance: {MONTHLY_LATE_ALLOWANCE} minutes per employee</Text>
                  </Space>

                  <Table
                    dataSource={monthlyLateData}
                    rowKey="name"
                    size="small"
                    columns={[
                      { title: 'Employee', dataIndex: 'name', key: 'name', width: 180 },
                      { title: 'Department', dataIndex: 'department', key: 'department' },
                      {
                        title: 'Total Late',
                        dataIndex: 'totalLate',
                        key: 'totalLate',
                        render: v => <Tag color="orange">{v} min</Tag>
                      },
                      {
                        title: 'Allowance Used',
                        key: 'used',
                        render: (_, r) => {
                          const percent = Math.min(Math.round((r.totalLate / MONTHLY_LATE_ALLOWANCE) * 100), 100);
                          return <Progress percent={percent} size="small" status={percent > 85 ? "exception" : "active"} />;
                        }
                      },
                      {
                        title: 'Remaining',
                        key: 'remaining',
                        render: (_, r) => {
                          const remaining = Math.max(0, MONTHLY_LATE_ALLOWANCE - r.totalLate);
                          return <Tag color={remaining > 15 ? "green" : "red"}>{remaining} min</Tag>;
                        }
                      },
                    ]}
                    pagination={false}
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>

        </Tabs>
      </Card>

      <MappingModal
        visible={mapVisible}
        onCancel={() => { setMapVisible(false); setEditingMap(null); }}
        onSave={handleSaveMapping}
        initial={editingMap}
        employees={employees}
        loading={mapSaving}
      />

      <PunchDetailModal row={punchRow} onClose={() => setPunchRow(null)} />

      <style>{`
        .att-absent td { background: #fff1f0 !important; }
        .att-late   td { background: #fffbe6 !important; }
        .att-absent:hover td { background: #ffe8e6 !important; }
        .att-late:hover   td { background: #fff3cc !important; }
      `}</style>
    </div>
  );
};

export default ZKAttendancePage;