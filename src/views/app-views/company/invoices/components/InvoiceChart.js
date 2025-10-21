import React, { useMemo } from 'react';
import { Card } from 'antd';
import { Column } from '@ant-design/plots';
import { InvoiceStatus } from 'models/InvoiceModel';

/**
 * Component for displaying monthly invoice chart
 */
const InvoiceChart = ({ invoices, loading, year }) => {
  const chartData = useMemo(() => {
    if (!invoices?.length) return [];

    const currentYear = year || new Date().getFullYear();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Filter invoices for selected year
    const yearInvoices = invoices.filter(invoice => {
      const creationDate = invoice.CreationDate?.toDate();
      return creationDate && creationDate.getFullYear() === currentYear;
    });
    
    // Create data for all three status types across all months
    const data = [];
    
    months.forEach((month, idx) => {
      const monthInvoices = yearInvoices.filter(invoice => {
        const creationDate = invoice.CreationDate?.toDate();
        return creationDate && creationDate.getMonth() === idx;
      });
      
      // Count by status
      const paid = monthInvoices.filter(i => i.Status === InvoiceStatus.PAID).length;
      const pending = monthInvoices.filter(i => i.Status === InvoiceStatus.PENDING).length;
      const missed = monthInvoices.filter(i => i.Status === InvoiceStatus.MISSED).length;
      
      // Add entry for each status
      data.push({ month, status: 'Paid', count: paid });
      data.push({ month, status: 'Pending', count: pending });
      data.push({ month, status: 'Missed', count: missed });
    });
    
    return data;
  }, [invoices, year]);

  const config = {
    data: chartData,
    xField: 'month',
    yField: 'count',
    seriesField: 'status',
    isGroup: true,
    columnStyle: {
      radius: [4, 4, 0, 0],
    },
    legend: {
      position: 'top',
    },
    color: ['#52c41a', '#1890ff', '#ff4d4f'],
    label: {
      position: 'middle',
      style: {
        fill: '#FFFFFF',
        opacity: 0.6,
      },
      content: (item) => {
        return item.count > 0 ? item.count : '';
      }
    },
  };

  return (
    <Card 
      title={`Invoices by Month (${year || new Date().getFullYear()})`}
      loading={loading}
    >
      <div style={{ height: 320 }}>
        <Column {...config} />
      </div>
    </Card>
  );
};

export default InvoiceChart;
