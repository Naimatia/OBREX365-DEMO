// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Modal, Table, Select, Button, message, Spin } from 'antd';
import moment from 'moment';
import '../AttendanceDetail.css'; // Import new CSS file for styling
const { Option } = Select;

const statusOptions = [
  { value: '', label: 'Not Set' },
  { value: 'Y', label: 'Attended' },
  { value: 'P', label: 'Sick/PTO' },
  { value: 'U', label: 'Unpaid Leave' },
  { value: 'N', label: 'No Show/No Call' },
  { value: 'H', label: 'Holiday/Non-working' },
];

const AttendanceDetail = ({ visible, onClose, attendance, onUpdate }) => {
  const [daysData, setDaysData] = useState([]);

  useEffect(() => {
    if (attendance) {
      const daysInMonth = moment(attendance.month_year, 'YYYY-MM').daysInMonth();
      const data = [];
      for (let day = 1; day <= daysInMonth; day++) {
        data.push({ day, status: attendance.days[day] || '' });
      }
      setDaysData(data);
    }
  }, [attendance]);

  const handleStatusChange = (day, value) => {
    const updated = daysData.map(d => d.day === day ? { ...d, status: value } : d);
    setDaysData(updated);
  };

  const handleSave = () => {
    const newDays = daysData.reduce((acc, d) => ({ ...acc, [d.day]: d.status }), {});
    onUpdate({ ...attendance, days: newDays });
    message.success('Daily attendance updated');
    onClose();
  };

  const columns = [
    { title: 'Day', dataIndex: 'day', key: 'day' },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (text, record) => (
        <Select
          value={text}
          onChange={(val) => handleStatusChange(record.day, val)}
          style={{ width: 150 }}
          className={`status-select status-${text}`}
          dropdownStyle={{ minWidth: 150 }}
        >
          {statusOptions.map(opt => (
            <Option key={opt.value} value={opt.value} className={`status-option status-${opt.value}`}>
              {opt.label}
            </Option>
          ))}
        </Select>
      ),
    },
  ];

  return (
    <Modal
      title={`Attendance for ${attendance?.name} - ${attendance?.month_year}`}
      open={visible}
      onCancel={onClose}
      footer={[<Button key="save" type="primary" onClick={handleSave}>Save Changes</Button>]}
      width={600}
    >
      {attendance ? (
        <Table
          columns={columns}
          dataSource={daysData}
          rowKey="day"
          pagination={false}
        />
      ) : (
        <Spin tip="Loading attendance details..." />
      )}
    </Modal>
  );
};

export default AttendanceDetail;