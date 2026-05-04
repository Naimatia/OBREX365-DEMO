import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Typography, InputNumber, Slider, Select, Button,
  Divider, Table, Tabs, Tag, Alert, Input, Space, Tooltip,
} from 'antd';
import {
  CalculatorOutlined, DollarOutlined, FilePdfOutlined,
  SyncOutlined, InfoCircleOutlined, BankOutlined,
  PercentageOutlined, CalendarOutlined, HomeOutlined,
  UserOutlined, PhoneOutlined, MailOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

// ─── Constants ────────────────────────────────────────────────────────────────
const CURRENCIES = [
  { code: 'USD', name: 'US Dollar',        flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro',             flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound',    flag: '🇬🇧' },
  { code: 'SAR', name: 'Saudi Riyal',      flag: '🇸🇦' },
  { code: 'QAR', name: 'Qatari Riyal',     flag: '🇶🇦' },
  { code: 'KWD', name: 'Kuwaiti Dinar',    flag: '🇰🇼' },
  { code: 'BHD', name: 'Bahraini Dinar',   flag: '🇧🇭' },
  { code: 'OMR', name: 'Omani Rial',       flag: '🇴🇲' },
  { code: 'EGP', name: 'Egyptian Pound',   flag: '🇪🇬' },
  { code: 'TND', name: 'Tunisian Dinar',   flag: '🇹🇳' },
  { code: 'MAD', name: 'Moroccan Dirham',  flag: '🇲🇦' },
  { code: 'INR', name: 'Indian Rupee',     flag: '🇮🇳' },
  { code: 'PKR', name: 'Pakistani Rupee',  flag: '🇵🇰' },
  { code: 'JPY', name: 'Japanese Yen',     flag: '🇯🇵' },
  { code: 'CNY', name: 'Chinese Yuan',     flag: '🇨🇳' },
  { code: 'CAD', name: 'Canadian Dollar',  flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar',flag: '🇦🇺' },
  { code: 'CHF', name: 'Swiss Franc',      flag: '🇨🇭' },
  { code: 'RUB', name: 'Russian Ruble',    flag: '🇷🇺' },
  { code: 'TRY', name: 'Turkish Lira',     flag: '🇹🇷' },
];

const STAT_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// ─── Utilities ────────────────────────────────────────────────────────────────
const fmt = (n, decimals = 0) =>
  Number(n).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const sqftToM2 = (sqft) => sqft * 0.092903;

const calcMonthlyPayment = (principal, annualRate, years) => {
  if (!principal || years <= 0) return 0;
  if (annualRate <= 0) return principal / (years * 12);
  const r = annualRate / 100 / 12;
  const n = years * 12;
  return (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
};

const buildAmortization = (principal, annualRate, years) => {
  if (!principal || years <= 0) return [];
  const r = annualRate / 100 / 12;
  const monthly = calcMonthlyPayment(principal, annualRate, years);
  let balance = principal;
  const rows = [];

  for (let yr = 1; yr <= years; yr++) {
    let yearInterest = 0;
    let yearPrincipal = 0;
    for (let m = 0; m < 12; m++) {
      if (balance <= 0) break;
      const interest = balance * r;
      const princ = Math.min(monthly - interest, balance);
      yearInterest += interest;
      yearPrincipal += princ;
      balance = Math.max(balance - princ, 0);
    }
    rows.push({
      key: yr,
      year: yr,
      payment: fmt(monthly * 12),
      principal: fmt(yearPrincipal),
      interest: fmt(yearInterest),
      balance: fmt(Math.max(balance, 0)),
    });
    if (balance <= 0) break;
  }
  return rows;
};

// ─── MetricCard ───────────────────────────────────────────────────────────────
const MetricCard = ({ label, value, sub, color, icon }) => (
  <div
    style={{
      background: `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`,
      border: `1px solid ${color}44`,
      borderRadius: 14,
      padding: '20px 22px',
      position: 'relative',
      overflow: 'hidden',
      height: '100%',
    }}
  >
    <div
      style={{
        position: 'absolute', top: -10, right: -10,
        width: 70, height: 70, borderRadius: '50%',
        background: `${color}18`,
      }}
    />
    <Text style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
      {label}
    </Text>
    <div
      style={{
        fontSize: 22, fontWeight: 700, color,
        margin: '6px 0 2px', fontFamily: 'Georgia, serif',
      }}
    >
      {value}
    </div>
    {sub && <Text style={{ fontSize: 12, color: '#64748b' }}>{sub}</Text>}
    <div style={{ position: 'absolute', bottom: 14, right: 18, color: `${color}66`, fontSize: 28 }}>
      {icon}
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const PropertyFinancePage = () => {
  // ── Calculator state ──
  const [propertyPrice,  setPropertyPrice]  = useState(1_500_000);
  const [downPaymentPct, setDownPaymentPct] = useState(20);
  const [interestRate,   setInterestRate]   = useState(4.5);
  const [loanTerm,       setLoanTerm]       = useState(25);
  const [customFees,     setCustomFees]     = useState(0);

  // ── Size converter ──
  const [sizeSqft, setSizeSqft] = useState(1500);
  const sizeM2 = sqftToM2(sizeSqft);

  // ── Currency state ──
  const [targetCurrency, setTargetCurrency] = useState('USD');
  const [rates,          setRates]          = useState({});
  const [ratesLoading,   setRatesLoading]   = useState(false);
  const [ratesError,     setRatesError]     = useState(null);
  const [lastUpdated,    setLastUpdated]    = useState(null);
  const [freeAedAmount,  setFreeAedAmount]  = useState(1_000_000);

  // ── PDF client/agent fields ──
  const [clientName,    setClientName]    = useState('');
  const [clientEmail,   setClientEmail]   = useState('');
  const [clientPhone,   setClientPhone]   = useState('');
  const [agentName,     setAgentName]     = useState('');
  const [propertyRef,   setPropertyRef]   = useState('');
  const [propertyTitle, setPropertyTitle] = useState('');
  const [pdfLoading,    setPdfLoading]    = useState(false);

  // ── Derived values ──
  const downPaymentAmt  = (propertyPrice * downPaymentPct) / 100;
  const loanAmount      = propertyPrice - downPaymentAmt;
  const totalCashNeeded = downPaymentAmt + customFees;
  const monthlyPayment  = calcMonthlyPayment(loanAmount, interestRate, loanTerm);
  const totalRepayment  = monthlyPayment * loanTerm * 12;
  const totalInterest   = totalRepayment - loanAmount;
  const amortRows       = buildAmortization(loanAmount, interestRate, loanTerm);

  // ── Exchange rate fetch ──
  const fetchRates = useCallback(async () => {
    setRatesLoading(true);
    setRatesError(null);
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/AED');
      if (!res.ok) throw new Error('Rate fetch failed');
      const data = await res.json();
      setRates(data.rates || {});
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      setRatesError('Unable to fetch live rates. Showing AED values only.');
    } finally {
      setRatesLoading(false);
    }
  }, []);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  // Safe conversion helper — returns null when rate unavailable
  const convert = (aed) => (rates[targetCurrency] != null ? aed * rates[targetCurrency] : null);
  const convFmt  = (aed) => {
    const v = convert(aed);
    return v !== null ? `${fmt(v, 2)} ${targetCurrency}` : '—';
  };

  // ── PDF generation ──
  const generatePDF = async () => {
    setPdfLoading(true);
    try {
      const { default: jsPDF }    = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W   = doc.internal.pageSize.getWidth();
      const H   = doc.internal.pageSize.getHeight();

      const now       = new Date();
      const dateStr   = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      const invoiceNo = `ORB-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`;

      const PURPLE = [102, 126, 234];
      const DARK   = [30, 41, 59];
      const LIGHT  = [248, 250, 252];

      // ── Header banner ──
      doc.setFillColor(...PURPLE);
      doc.rect(0, 0, W, 40, 'F');
      doc.setFillColor(118, 75, 162);
      doc.rect(W - 60, 0, 60, 40, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('ORBREX365', 14, 17);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Property Finance Statement', 14, 24);
      doc.text('Dubai, United Arab Emirates', 14, 30);

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('QUOTE', W - 14, 17, { align: 'right' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`No: ${invoiceNo}`, W - 14, 24, { align: 'right' });
      doc.text(`Date: ${dateStr}`, W - 14, 30, { align: 'right' });

      // ── Client / Agent ──
      let y = 50;
      doc.setTextColor(...DARK);
      doc.setFillColor(...LIGHT);
      doc.rect(10, y, (W - 20) / 2 - 4, 32, 'F');
      doc.rect(W / 2 + 4, y, (W - 20) / 2 - 4, 32, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...PURPLE);
      doc.text('PREPARED FOR',       14,         y + 7);
      doc.text('AGENT / CONSULTANT', W / 2 + 8,  y + 7);

      doc.setTextColor(...DARK);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(clientName || 'Valued Client',      14,        y + 15);
      doc.text(agentName  || 'ORBREX365 Agent',    W / 2 + 8, y + 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      if (clientEmail) doc.text(clientEmail, 14, y + 21);
      if (clientPhone) doc.text(clientPhone, 14, y + 27);

      // ── Property info ──
      y += 40;
      doc.setFillColor(...PURPLE);
      doc.rect(10, y, W - 20, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('PROPERTY DETAILS', 14, y + 5.5);

      y += 10;
      doc.setTextColor(...DARK);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Property:  ${propertyTitle || 'BARDAWIL LUXURY PROPERTIES'}`, 14, y);
      y += 6;
      if (propertyRef) { doc.text(`Reference:  ${propertyRef}`, 14, y); y += 6; }

      // ── Purchase price table ──
      // Dynamically build body rows — customFees row only if user entered fees
      const priceRows = [
        ['Property Price',             `AED ${fmt(propertyPrice)}`,   convFmt(propertyPrice)],
        [`Down Payment (${downPaymentPct}%)`, `AED ${fmt(downPaymentAmt)}`, convFmt(downPaymentAmt)],
        ['Loan Amount',                `AED ${fmt(loanAmount)}`,      convFmt(loanAmount)],
      ];
      if (customFees > 0) {
        priceRows.push(['Additional Fees', `AED ${fmt(customFees)}`, convFmt(customFees)]);
      }
      const totalRowIndex = priceRows.length; // index of the next row
      priceRows.push(['Total Cash Required', `AED ${fmt(totalCashNeeded)}`, convFmt(totalCashNeeded)]);

      y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Description', 'Amount (AED)', rates[targetCurrency] ? `Amount (${targetCurrency})` : '']],
        body: priceRows,
        headStyles: { fillColor: PURPLE, textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: LIGHT },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { halign: 'right' },
          2: { halign: 'right' },
        },
        didParseCell(data) {
          if (data.section === 'body' && data.row.index === totalRowIndex) {
            data.cell.styles.fillColor    = PURPLE;
            data.cell.styles.textColor    = [255, 255, 255];
            data.cell.styles.fontStyle    = 'bold';
          }
        },
        margin: { left: 10, right: 10 },
      });

      y = doc.lastAutoTable.finalY + 8;

      // ── Mortgage summary ──
      doc.setFillColor(...PURPLE);
      doc.rect(10, y, W - 20, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('MORTGAGE SUMMARY', 14, y + 5.5);
      y += 10;

      autoTable(doc, {
        startY: y,
        head: [['Parameter', 'Value']],
        body: [
          ['Loan Amount',      `AED ${fmt(loanAmount)}`],
          ['Annual Interest Rate', `${interestRate}%`],
          ['Loan Term',        `${loanTerm} years`],
          ['Monthly Payment',  `AED ${fmt(monthlyPayment, 2)}`],
          ['Total Repayment',  `AED ${fmt(totalRepayment)}`],
          ['Total Interest',   `AED ${fmt(totalInterest)}`],
        ],
        headStyles: { fillColor: PURPLE, textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: LIGHT },
        columnStyles: { 0: { cellWidth: 80 }, 1: { halign: 'right', fontStyle: 'bold' } },
        margin: { left: 10, right: 10 },
        didParseCell(data) {
          if (data.section === 'body' && data.row.index === 3) {
            data.cell.styles.textColor = PURPLE;
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });

      y = doc.lastAutoTable.finalY + 8;

      // ── Amortization (up to 15 years) ──
      if (amortRows.length) {
        if (y > H - 80) { doc.addPage(); y = 14; }

        doc.setFillColor(...PURPLE);
        doc.rect(10, y, W - 20, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('AMORTIZATION SCHEDULE (Year-by-Year)', 14, y + 5.5);
        y += 10;

        autoTable(doc, {
          startY: y,
          head: [['Year', 'Annual Payment (AED)', 'Principal (AED)', 'Interest (AED)', 'Balance (AED)']],
          body: amortRows.slice(0, 15).map((r) => [r.year, r.payment, r.principal, r.interest, r.balance]),
          headStyles: { fillColor: PURPLE, textColor: 255, fontStyle: 'bold', fontSize: 7 },
          bodyStyles: { fontSize: 7 },
          alternateRowStyles: { fillColor: LIGHT },
          columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right', fontStyle: 'bold' },
          },
          margin: { left: 10, right: 10 },
        });
        y = doc.lastAutoTable.finalY + 8;
      }

      // ── Disclaimer ──
      if (y > H - 40) { doc.addPage(); y = 14; }
      doc.setFillColor(254, 249, 195);
      doc.rect(10, y, W - 20, 18, 'F');
      doc.setTextColor(120, 83, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('Disclaimer', 14, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(
        'This document is for illustrative purposes only. Actual payments may vary based on bank terms, central bank decisions,',
        14, y + 11,
      );
      doc.text(
        'and applicable fees. Consult a licensed mortgage advisor before making any financial commitments.',
        14, y + 15.5,
      );

      // ── Footer on every page ──
      const pages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFillColor(...PURPLE);
        doc.rect(0, H - 12, W, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text('ORBREX365 • Dubai Real Estate', 14, H - 4.5);
        doc.text(`Page ${i} of ${pages}`, W - 14, H - 4.5, { align: 'right' });
        if (lastUpdated) {
          doc.text(`Exchange rates as of ${lastUpdated}`, W / 2, H - 4.5, { align: 'center' });
        }
      }

      doc.save(`ORBREX365_Finance_Quote_${invoiceNo}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert(
        'PDF generation failed. Make sure jspdf and jspdf-autotable are installed:\n' +
        'npm install jspdf jspdf-autotable',
      );
    } finally {
      setPdfLoading(false);
    }
  };

  // ── Amortization table columns ──
  const amorCols = [
    {
      title: 'Year', dataIndex: 'year', width: 60, align: 'center',
      render: (v) => <Tag color="purple">{v}</Tag>,
    },
    {
      title: 'Payment', dataIndex: 'payment', align: 'right',
      render: (v) => <Text strong>AED {v}</Text>,
    },
    {
      title: 'Principal', dataIndex: 'principal', align: 'right',
      render: (v) => <Text style={{ color: '#10b981' }}>AED {v}</Text>,
    },
    {
      title: 'Interest', dataIndex: 'interest', align: 'right',
      render: (v) => <Text style={{ color: '#ef4444' }}>AED {v}</Text>,
    },
    {
      title: 'Balance', dataIndex: 'balance', align: 'right',
      render: (v) => <Text type="secondary">AED {v}</Text>,
    },
  ];

  // ── Shared styles ──
  const sectionTitle = {
    fontSize: 15, fontWeight: 700, color: '#1e293b',
    marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8,
  };
  const labelStyle = { fontSize: 12, color: '#64748b', marginBottom: 4, display: 'block' };
  const inputStyle = { width: '100%' };

  // ── Tab items (modern Tabs API — no deprecated TabPane) ──
  const tabItems = [
    {
      key: 'calculator',
      label: <span><CalculatorOutlined /> Calculator</span>,
      children: (
        <Row gutter={[24, 24]}>
          {/* LEFT: INPUTS */}
          <Col xs={24} lg={9}>
            <Card
              title={
                <span style={sectionTitle}>
                  <HomeOutlined style={{ color: '#6366f1' }} /> Property Details
                </span>
              }
              style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}
              styles={{ body: { paddingTop: 8 } }}
            >
              <Space direction="vertical" size={16} style={{ width: '100%' }}>

                {/* Price */}
                <div>
                  <Text style={labelStyle}>Property Price (AED)</Text>
                  <InputNumber
                    style={inputStyle}
                    min={100_000}
                    max={500_000_000}
                    step={50_000}
                    value={propertyPrice}
                    formatter={(v) => `AED ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(v) => v.replace(/AED\s?|(,*)/g, '')}
                    onChange={(v) => v && setPropertyPrice(v)}
                    size="large"
                  />
                </div>

                {/* Size converter */}
                <div>
                  <Text style={labelStyle}>Property Size</Text>
                  <Row gutter={12}>
                    <Col span={12}>
                      <InputNumber
                        style={{ width: '100%' }}
                        size="large"
                        value={sizeSqft}
                        onChange={(v) => v && setSizeSqft(v)}
                        addonAfter="sqft"
                      />
                    </Col>
                    <Col span={12}>
                      <InputNumber
                        style={{ width: '100%' }}
                        size="large"
                        value={Math.round(sizeM2)}
                        addonAfter="m²"
                        disabled
                      />
                    </Col>
                  </Row>
                </div>

                {/* Down payment */}
                <div>
                  <Text style={labelStyle}>
                    Down Payment —{' '}
                    <Text strong style={{ color: '#6366f1' }}>{downPaymentPct}%</Text>
                  </Text>
                  <Slider
                    min={10} max={80} step={1}
                    value={downPaymentPct}
                    onChange={setDownPaymentPct}
                    marks={{ 20: '20%', 25: '25%', 50: '50%' }}
                  />
                  <Text strong>= AED {fmt(downPaymentAmt)}</Text>
                </div>

                {/* Interest rate */}
                <div>
                  <Text style={labelStyle}>
                    Annual Interest Rate —{' '}
                    <Text strong style={{ color: '#0ea5e9' }}>{interestRate}%</Text>
                  </Text>
                  <Slider min={1} max={12} step={0.1} value={interestRate} onChange={setInterestRate} />
                </div>

                {/* Loan term */}
                <div>
                  <Text style={labelStyle}>
                    Loan Term —{' '}
                    <Text strong style={{ color: '#10b981' }}>{loanTerm} years</Text>
                  </Text>
                  <Slider min={5} max={30} step={1} value={loanTerm} onChange={setLoanTerm} />
                </div>

                <Divider />

                {/* Manual fees */}
                <div>
                  <Text style={labelStyle}>
                    Additional Fees (AED)
                    <Tooltip title="Enter your total fees: DLD, admin, registration, agent commission, etc.">
                      <InfoCircleOutlined style={{ marginLeft: 6, color: '#94a3b8' }} />
                    </Tooltip>
                  </Text>
                  <InputNumber
                    style={inputStyle}
                    size="large"
                    value={customFees}
                    onChange={(v) => setCustomFees(v || 0)}
                    formatter={(v) => `AED ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(v) => Number(v?.replace(/[^0-9.-]+/g, ''))}
                  />
                </div>

              </Space>
            </Card>
          </Col>

          {/* RIGHT: RESULTS */}
          <Col xs={24} lg={15}>
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
              {[
                { label: 'Monthly Payment',    value: `AED ${fmt(monthlyPayment, 0)}`,  sub: `${fmt(monthlyPayment * 12, 0)} AED / yr`, color: STAT_COLORS[0], icon: <CalendarOutlined /> },
                { label: 'Down Payment',        value: `AED ${fmt(downPaymentAmt)}`,     sub: `${downPaymentPct}% of price`,             color: STAT_COLORS[1], icon: <DollarOutlined />  },
                { label: 'Loan Amount',         value: `AED ${fmt(loanAmount)}`,         sub: `${100 - downPaymentPct}% financed`,        color: STAT_COLORS[2], icon: <BankOutlined />    },
                { label: 'Total Interest',      value: `AED ${fmt(totalInterest)}`,      sub: `over ${loanTerm} years`,                  color: STAT_COLORS[4], icon: <PercentageOutlined /> },
                { label: 'Total Cash at Closing', value: `AED ${fmt(totalCashNeeded)}`, sub: 'incl. fees',                               color: STAT_COLORS[5], icon: <HomeOutlined />    },
                { label: 'Total Repayment',     value: `AED ${fmt(totalRepayment)}`,     sub: 'loan + interest',                         color: STAT_COLORS[3], icon: <BankOutlined />    },
              ].map((m, i) => (
                <Col xs={12} sm={8} key={i}>
                  <MetricCard {...m} />
                </Col>
              ))}
            </Row>

            <Card
              title={<Text style={{ fontWeight: 700 }}>📅 Year-by-Year Amortization</Text>}
              style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}
            >
              <Table
                dataSource={amortRows}
                columns={amorCols}
                pagination={{ pageSize: 10, size: 'small' }}
                size="small"
                scroll={{ x: 500 }}
              />
            </Card>
          </Col>
        </Row>
      ),
    },

    {
      key: 'currency',
      label: <span><DollarOutlined /> Currency Converter</span>,
      children: (
        <Row gutter={[24, 24]}>
          {/* Live rate card */}
          <Col xs={24} lg={10}>
            <Card
              title={
                <span style={sectionTitle}>
                  <SyncOutlined style={{ color: '#0ea5e9' }} /> Live Exchange Rates
                </span>
              }
              style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}
              extra={
                <Button
                  icon={<SyncOutlined spin={ratesLoading} />}
                  onClick={fetchRates}
                  disabled={ratesLoading}
                >
                  Refresh
                </Button>
              }
            >
              {ratesError && (
                <Alert message={ratesError} type="warning" showIcon style={{ marginBottom: 16 }} />
              )}

              <Text style={labelStyle}>Target Currency</Text>
              <Select
                showSearch
                size="large"
                style={{ width: '100%', marginBottom: 20 }}
                value={targetCurrency}
                onChange={setTargetCurrency}
                options={CURRENCIES.map((c) => ({
                  value: c.code,
                  label: `${c.flag} ${c.code} — ${c.name}`,
                }))}
              />

              {rates[targetCurrency] != null && (
                <Card style={{ textAlign: 'center', background: 'linear-gradient(135deg,#0ea5e922,#6366f111)' }}>
                  <Text style={{ fontSize: 13, color: '#64748b' }}>1 AED =</Text>
                  <div style={{ fontSize: 42, fontWeight: 800, color: '#0ea5e9' }}>
                    {fmt(rates[targetCurrency], 4)}
                  </div>
                  <Text strong>{targetCurrency}</Text>
                </Card>
              )}
            </Card>
          </Col>

          {/* Free amount converter */}
          <Col xs={24} lg={14}>
            <Card
              title={<span style={sectionTitle}>💱 Any Amount Converter</span>}
              style={{ borderRadius: 14 }}
            >
              <InputNumber
                size="large"
                style={{ width: '100%', marginBottom: 16 }}
                value={freeAedAmount}
                onChange={(v) => setFreeAedAmount(v || 0)}
                formatter={(v) => `AED ${fmt(v)}`}
                parser={(v) => Number(v?.replace(/[^0-9.-]+/g, ''))}
              />

              <div style={{
                textAlign: 'center', padding: '30px 20px',
                background: '#f8fafc', borderRadius: 12,
              }}>
                <Text type="secondary">Equivalent in {targetCurrency}</Text>
                <div style={{ fontSize: 48, fontWeight: 800, color: '#0ea5e9', margin: '8px 0' }}>
                  {fmt(freeAedAmount * (rates[targetCurrency] || 0), 2)}
                </div>
                <Text strong style={{ fontSize: 20 }}>{targetCurrency}</Text>
              </div>
            </Card>
          </Col>
        </Row>
      ),
    },

    {
      key: 'pdf',
      label: <span><FilePdfOutlined /> PDF Quote</span>,
      children: (
        <Row gutter={[24, 24]}>
          {/* Client info */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <span style={sectionTitle}>
                  <UserOutlined style={{ color: '#6366f1' }} /> Client Information
                </span>
              }
              style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}
            >
              <Space direction="vertical" size={14} style={{ width: '100%' }}>
                <div>
                  <Text style={labelStyle}><UserOutlined /> Client Full Name</Text>
                  <Input size="large" placeholder="e.g. Mohammed Al Rashid" value={clientName} onChange={(e) => setClientName(e.target.value)} />
                </div>
                <div>
                  <Text style={labelStyle}><MailOutlined /> Email Address</Text>
                  <Input size="large" placeholder="client@email.com" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
                </div>
                <div>
                  <Text style={labelStyle}><PhoneOutlined /> Phone Number</Text>
                  <Input size="large" placeholder="+971 50 000 0000" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
                </div>
              </Space>
            </Card>
          </Col>

          {/* Property & agent */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <span style={sectionTitle}>
                  <HomeOutlined style={{ color: '#10b981' }} /> Property &amp; Agent
                </span>
              }
              style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}
            >
              <Space direction="vertical" size={14} style={{ width: '100%' }}>
                <div>
                  <Text style={labelStyle}>Property Title / Name</Text>
                  <Input size="large" placeholder="e.g. 2BR Marina Heights, JBR" value={propertyTitle} onChange={(e) => setPropertyTitle(e.target.value)} />
                </div>
                <div>
                  <Text style={labelStyle}>Property Reference</Text>
                  <Input size="large" placeholder="e.g. ORB-MRN-24001" value={propertyRef} onChange={(e) => setPropertyRef(e.target.value)} />
                </div>
                <div>
                  <Text style={labelStyle}>Agent / Consultant Name</Text>
                  <Input size="large" placeholder="Agent's full name" value={agentName} onChange={(e) => setAgentName(e.target.value)} />
                </div>
              </Space>
            </Card>
          </Col>

          {/* Quote preview */}
          <Col xs={24}>
            <Card
              title={<Text style={{ fontWeight: 700, fontSize: 15 }}>📋 Quote Summary Preview</Text>}
              style={{ borderRadius: 14, border: '1px solid #e2e8f0', background: '#fafafa' }}
              extra={
                <Button
                  type="primary"
                  size="large"
                  icon={<FilePdfOutlined />}
                  loading={pdfLoading}
                  onClick={generatePDF}
                  style={{
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    border: 'none', borderRadius: 10, fontWeight: 600,
                  }}
                >
                  Download PDF Quote
                </Button>
              }
            >
              <Row gutter={[16, 16]}>
                {[
                  { label: 'Client',                    value: clientName    || '—' },
                  { label: 'Property',                  value: propertyTitle || '—' },
                  { label: 'Reference',                 value: propertyRef   || '—' },
                  { label: 'Property Price',            value: `AED ${fmt(propertyPrice)}` },
                  { label: `Down Payment (${downPaymentPct}%)`, value: `AED ${fmt(downPaymentAmt)}` },
                  { label: 'Monthly Payment',           value: `AED ${fmt(monthlyPayment, 2)}` },
                  { label: 'Loan Term',                 value: `${loanTerm} years @ ${interestRate}%` },
                  { label: 'Total Cash at Closing',     value: `AED ${fmt(totalCashNeeded)}` },
                  ...(rates[targetCurrency] != null
                    ? [{ label: `Monthly in ${targetCurrency}`, value: `${fmt(monthlyPayment * rates[targetCurrency], 2)} ${targetCurrency}` }]
                    : []
                  ),
                ].map(({ label, value }, i) => (
                  <Col xs={12} sm={8} md={6} key={i}>
                    <div style={{
                      background: 'white', borderRadius: 10, padding: '12px 14px',
                      border: '1px solid #e2e8f0',
                    }}>
                      <Text style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 3 }}>{label}</Text>
                      <Text strong style={{ fontSize: 13 }}>{value}</Text>
                    </div>
                  </Col>
                ))}
              </Row>

              <Divider />
              <Paragraph style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>
                📌 The PDF will include the full amortization schedule, custom fee breakdown,
                {rates[targetCurrency] != null ? ` currency conversion to ${targetCurrency},` : ''}
                &nbsp;and an official ORBREX365 disclaimer.
              </Paragraph>
            </Card>
          </Col>
        </Row>
      ),
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto', fontFamily: 'sans-serif' }}>

      {/* Page header */}
      <Card
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #312e81 100%)',
          border: 'none', borderRadius: 16, marginBottom: 24,
        }}
      >
        <Row align="middle" gutter={24}>
          <Col>
            <div style={{
              background: 'rgba(99,102,241,0.3)', borderRadius: 14,
              padding: 18, border: '1px solid rgba(99,102,241,0.4)',
            }}>
              <CalculatorOutlined style={{ fontSize: 44, color: '#a5b4fc' }} />
            </div>
          </Col>
          <Col flex={1}>
            <Title level={2} style={{ color: '#f1f5f9', margin: 0, fontFamily: 'Georgia, serif' }}>
              Property Finance Calculator
            </Title>
            <Text style={{ color: '#94a3b8', fontSize: 15 }}>
              Mortgage calculator • Size converter • Live rates • PDF quotes — Dubai
            </Text>
          </Col>
          <Col>
            <Button
              type="primary"
              size="large"
              icon={<FilePdfOutlined />}
              loading={pdfLoading}
              onClick={generatePDF}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none', borderRadius: 10, height: 46, padding: '0 28px',
                fontWeight: 600, fontSize: 14,
              }}
            >
              Generate PDF Quote
            </Button>
          </Col>
        </Row>
      </Card>

      <Tabs
        defaultActiveKey="calculator"
        size="large"
        tabBarStyle={{ fontWeight: 600 }}
        items={tabItems}
      />
    </div>
  );
};

export default PropertyFinancePage;