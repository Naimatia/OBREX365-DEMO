/**
 * PropertyFinancePage.jsx
 *
 * Features:
 *  1. Dubai property payment calculator (down payment, monthly mortgage, amortisation)
 *  2. Live currency converter  (AED → any world currency via open.er-api.com)
 *  3. PDF invoice / quote generator  (jsPDF + jspdf-autotable)
 *
 * Dependencies to install:
 *   npm install jspdf jspdf-autotable
 *
 * The component is self-contained and works alongside your existing
 * Ant Design + Redux stack.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Typography, InputNumber, Slider, Select, Button,
  Divider, Statistic, Table, Tabs, Tag, Spin, Alert, Input, Space,
  Form, Tooltip, Badge,Empty,
} from 'antd';
import {
  CalculatorOutlined, DollarOutlined, FilePdfOutlined,
  SyncOutlined, InfoCircleOutlined, BankOutlined,
  PercentageOutlined, CalendarOutlined, HomeOutlined,
  UserOutlined, PhoneOutlined, MailOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

// ─── Constants ────────────────────────────────────────────────────────────────
const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'QAR', name: 'Qatari Riyal', flag: '🇶🇦' },
  { code: 'KWD', name: 'Kuwaiti Dinar', flag: '🇰🇼' },
  { code: 'BHD', name: 'Bahraini Dinar', flag: '🇧🇭' },
  { code: 'OMR', name: 'Omani Rial', flag: '🇴🇲' },
  { code: 'EGP', name: 'Egyptian Pound', flag: '🇪🇬' },
  { code: 'TND', name: 'Tunisian Dinar', flag: '🇹🇳' },
  { code: 'MAD', name: 'Moroccan Dirham', flag: '🇲🇦' },
  { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'PKR', name: 'Pakistani Rupee', flag: '🇵🇰' },
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'RUB', name: 'Russian Ruble', flag: '🇷🇺' },
  { code: 'TRY', name: 'Turkish Lira', flag: '🇹🇷' },
];

// Dubai-specific fees
const DLD_FEE_PCT   = 0.04;   // Dubai Land Department 4 %
const REG_FEE       = 4200;   // AED – typical admin / trustee fee
const MORTGAGE_REG  = 0.0025; // 0.25 % of loan amount to DLD

// Pastel card colours for stat boxes
const STAT_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// ─── Utility helpers ──────────────────────────────────────────────────────────
const fmt = (n, decimals = 0) =>
  Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmtCurrency = (n, currency = 'AED', decimals = 2) =>
  `${fmt(n, decimals)} ${currency}`;

/** Standard mortgage formula: M = P * [r(1+r)^n] / [(1+r)^n - 1] */
const calcMonthlyPayment = (principal, annualRate, years) => {
  if (!principal || annualRate <= 0 || years <= 0) return principal / (years * 12) || 0;
  const r = annualRate / 100 / 12;
  const n = years * 12;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};

/** Build a year-by-year amortization summary */
const buildAmortization = (principal, annualRate, years) => {
  if (!principal || years <= 0) return [];
  const r = annualRate / 100 / 12;
  const monthly = calcMonthlyPayment(principal, annualRate, years);
  let balance = principal;
  const rows = [];

  for (let yr = 1; yr <= years; yr++) {
    let yearInterest = 0, yearPrincipal = 0;
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

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Glowing metric card */
const MetricCard = ({ label, value, sub, color, icon }) => (
  <div style={{
    background: `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`,
    border: `1px solid ${color}44`,
    borderRadius: 14,
    padding: '20px 22px',
    position: 'relative',
    overflow: 'hidden',
    height: '100%',
  }}>
    <div style={{
      position: 'absolute', top: -10, right: -10,
      width: 70, height: 70, borderRadius: '50%',
      background: `${color}18`,
    }} />
    <Text style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
      {label}
    </Text>
    <div style={{ fontSize: 22, fontWeight: 700, color: color, margin: '6px 0 2px', fontFamily: 'Georgia, serif' }}>
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

  /* ── Calculator state ── */
  const [propertyPrice, setPropertyPrice]     = useState(1_500_000);
  const [downPaymentPct, setDownPaymentPct]   = useState(20);
  const [interestRate, setInterestRate]       = useState(4.5);
  const [loanTerm, setLoanTerm]               = useState(25);
  const [includeFees, setIncludeFees]         = useState(true);

  /* ── Currency state ── */
  const [targetCurrency, setTargetCurrency]   = useState('USD');
  const [rates, setRates]                     = useState({});
  const [ratesLoading, setRatesLoading]       = useState(false);
  const [ratesError, setRatesError]           = useState(null);
  const [lastUpdated, setLastUpdated]         = useState(null);

  /* ── Invoice / PDF state ── */
  const [clientName, setClientName]           = useState('');
  const [clientEmail, setClientEmail]         = useState('');
  const [clientPhone, setClientPhone]         = useState('');
  const [agentName, setAgentName]             = useState('');
  const [propertyRef, setPropertyRef]         = useState('');
  const [propertyTitle, setPropertyTitle]     = useState('');
  const [pdfLoading, setPdfLoading]           = useState(false);

  /* ── Derived calculations ── */
  const downPaymentAmt  = (propertyPrice * downPaymentPct) / 100;
  const loanAmount      = propertyPrice - downPaymentAmt;
  const dldFee          = includeFees ? propertyPrice * DLD_FEE_PCT : 0;
  const regFee          = includeFees ? REG_FEE : 0;
  const mortgageRegFee  = includeFees ? loanAmount * MORTGAGE_REG : 0;
  const totalFees       = dldFee + regFee + mortgageRegFee;
  const totalCashNeeded = downPaymentAmt + totalFees;
  const monthlyPayment  = calcMonthlyPayment(loanAmount, interestRate, loanTerm);
  const totalRepayment  = monthlyPayment * loanTerm * 12;
  const totalInterest   = totalRepayment - loanAmount;
  const amortRows       = buildAmortization(loanAmount, interestRate, loanTerm);

  /* ── Exchange rate fetch ── */
  const fetchRates = useCallback(async () => {
    setRatesLoading(true);
    setRatesError(null);
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/AED');
      if (!res.ok) throw new Error('Rate fetch failed');
      const data = await res.json();
      setRates(data.rates || {});
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      setRatesError('Unable to fetch live rates. Showing AED values only.');
    } finally {
      setRatesLoading(false);
    }
  }, []);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  const convert = (aed) => {
    if (!rates[targetCurrency]) return null;
    return aed * rates[targetCurrency];
  };

  const convFmt = (aed) => {
    const v = convert(aed);
    return v !== null ? `${fmt(v, 2)} ${targetCurrency}` : '—';
  };

  /* ── PDF generation (jsPDF) ── */
  const generatePDF = async () => {
    setPdfLoading(true);
    try {
      // Dynamic import – requires: npm install jspdf jspdf-autotable
      const { default: jsPDF }      = await import('jspdf');
      const { default: autoTable }  = await import('jspdf-autotable');

      const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W    = doc.internal.pageSize.getWidth();
      const H    = doc.internal.pageSize.getHeight();
      const now  = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      const invoiceNo = `ORB-${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*9000+1000)}`;

      const PURPLE = [102, 126, 234];
      const DARK   = [30,  41,  59];
      const LIGHT  = [248, 250, 252];
      const GOLD   = [245, 158, 11];

      /* ── Header banner ── */
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

      /* ── Client / Agent info ── */
      let y = 50;
      doc.setTextColor(...DARK);
      doc.setFillColor(...LIGHT);
      doc.rect(10, y, (W - 20) / 2 - 4, 32, 'F');
      doc.rect((W / 2) + 4, y, (W - 20) / 2 - 4, 32, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...PURPLE);
      doc.text('PREPARED FOR', 14, y + 7);
      doc.text('AGENT / CONSULTANT', W / 2 + 8, y + 7);

      doc.setTextColor(...DARK);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(clientName || 'Valued Client', 14, y + 15);
      doc.text(agentName  || 'ORBREX365 Agent', W / 2 + 8, y + 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      if (clientEmail) doc.text(clientEmail, 14, y + 21);
      if (clientPhone) doc.text(clientPhone, 14, y + 27);

      /* ── Property info ── */
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
      const propName = propertyTitle || 'Dubai Residential Property';
      doc.text(`Property:  ${propName}`, 14, y);
      y += 6;
      if (propertyRef) { doc.text(`Reference:  ${propertyRef}`, 14, y); y += 6; }

      /* ── Purchase price summary table ── */
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Description', 'Amount (AED)', rates[targetCurrency] ? `Amount (${targetCurrency})` : '']],
        body: [
          ['Property Price',            `AED ${fmt(propertyPrice)}`,     convFmt(propertyPrice)],
          [`Down Payment (${downPaymentPct}%)`, `AED ${fmt(downPaymentAmt)}`, convFmt(downPaymentAmt)],
          ['Loan Amount',               `AED ${fmt(loanAmount)}`,        convFmt(loanAmount)],
          ...(includeFees ? [
            ['Dubai Land Dept Fee (4%)',   `AED ${fmt(dldFee)}`,          convFmt(dldFee)],
            ['Admin / Trustee Fee',        `AED ${fmt(regFee)}`,          convFmt(regFee)],
            ['Mortgage Reg. Fee (0.25%)',  `AED ${fmt(mortgageRegFee)}`,  convFmt(mortgageRegFee)],
          ] : []),
          ['Total Cash Required',       `AED ${fmt(totalCashNeeded)}`,   convFmt(totalCashNeeded)],
        ],
        headStyles: { fillColor: PURPLE, textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: LIGHT },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { halign: 'right' },
          2: { halign: 'right' },
        },
        didParseCell(data) {
          if (data.row.index === (includeFees ? 6 : 2)) {
            data.cell.styles.fillColor  = [102, 126, 234];
            data.cell.styles.textColor  = 255;
            data.cell.styles.fontStyle  = 'bold';
          }
        },
        margin: { left: 10, right: 10 },
      });

      y = doc.lastAutoTable.finalY + 8;

      /* ── Mortgage summary ── */
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
          ['Loan Amount',          `AED ${fmt(loanAmount)}`],
          ['Annual Interest Rate', `${interestRate}%`],
          ['Loan Term',            `${loanTerm} years`],
          ['Monthly Payment',      `AED ${fmt(monthlyPayment, 2)}`],
          ['Total Repayment',      `AED ${fmt(totalRepayment)}`],
          ['Total Interest',       `AED ${fmt(totalInterest)}`],
        ],
        headStyles: { fillColor: PURPLE, textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: LIGHT },
        columnStyles: { 0: { cellWidth: 80 }, 1: { halign: 'right', fontStyle: 'bold' } },
        margin: { left: 10, right: 10 },
        didParseCell(data) {
          if (data.row.index === 3) {
            data.cell.styles.textColor = PURPLE;
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });

      y = doc.lastAutoTable.finalY + 8;

      /* ── Amortization (first 10 years) ── */
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
          body: amortRows.slice(0, 15).map(r => [r.year, r.payment, r.principal, r.interest, r.balance]),
          headStyles: { fillColor: PURPLE, textColor: 255, fontStyle: 'bold', fontSize: 7 },
          bodyStyles: { fontSize: 7 },
          alternateRowStyles: { fillColor: LIGHT },
          columnStyles: { 0: { cellWidth: 15, halign: 'center' }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } },
          margin: { left: 10, right: 10 },
        });
        y = doc.lastAutoTable.finalY + 8;
      }

      /* ── Disclaimer ── */
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
        14, y + 11
      );
      doc.text(
        'and applicable fees. Consult a licensed mortgage advisor before making any financial commitments.',
        14, y + 15.5
      );

      /* ── Footer ── */
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
        if (lastUpdated) doc.text(`Exchange rates as of ${lastUpdated}`, W / 2, H - 4.5, { align: 'center' });
      }

      doc.save(`ORBREX365_Finance_Quote_${invoiceNo}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('PDF generation failed. Make sure jspdf and jspdf-autotable are installed:\nnpm install jspdf jspdf-autotable');
    } finally {
      setPdfLoading(false);
    }
  };

  /* ── Amortization table columns ── */
  const amorCols = [
    { title: 'Year',     dataIndex: 'year',      width: 60,  align: 'center', render: v => <Tag color="purple">{v}</Tag> },
    { title: 'Payment',  dataIndex: 'payment',   align: 'right', render: v => <Text strong>AED {v}</Text> },
    { title: 'Principal',dataIndex: 'principal', align: 'right', render: v => <Text style={{ color: '#10b981' }}>AED {v}</Text> },
    { title: 'Interest', dataIndex: 'interest',  align: 'right', render: v => <Text style={{ color: '#ef4444' }}>AED {v}</Text> },
    { title: 'Balance',  dataIndex: 'balance',   align: 'right', render: v => <Text type="secondary">AED {v}</Text> },
  ];

  /* ── Styles ── */
  const sectionTitle = {
    fontSize: 15, fontWeight: 700, color: '#1e293b',
    marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8,
  };

  const labelStyle = { fontSize: 12, color: '#64748b', marginBottom: 4, display: 'block' };
  const inputStyle = { width: '100%' };

  /* ─── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto', fontFamily: 'sans-serif' }}>

      {/* ── Page Header ── */}
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
              Mortgage calculator · Currency converter · PDF quote generator — Dubai UAE
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
        items={[
          /* ════════════════════════════════════════════════════════════════
             TAB 1 — CALCULATOR
          ════════════════════════════════════════════════════════════════ */
          {
            key: 'calculator',
            label: <span><CalculatorOutlined /> Calculator</span>,
            children: (
              <Row gutter={[24, 24]}>

                {/* ── Left: Inputs ── */}
                <Col xs={24} lg={9}>
                  <Card
                    title={<span style={sectionTitle}><HomeOutlined style={{ color: '#6366f1' }} /> Property Details</span>}
                    style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}
                    bodyStyle={{ paddingTop: 8 }}
                  >
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>

                      <div>
                        <Text style={labelStyle}>Property Price (AED)</Text>
                        <InputNumber
                          style={inputStyle}
                          min={100_000} max={500_000_000} step={50_000}
                          value={propertyPrice}
                          formatter={v => `AED ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          parser={v => v.replace(/AED\s?|(,*)/g, '')}
                          onChange={v => v && setPropertyPrice(v)}
                          size="large"
                        />
                      </div>

                      <div>
                        <Text style={labelStyle}>
                          Down Payment — <Text strong style={{ color: '#6366f1' }}>{downPaymentPct}%</Text>
                          <Tooltip title="UAE banks typically require 20% for residents, 25% for non-residents">
                            <InfoCircleOutlined style={{ marginLeft: 6, color: '#94a3b8' }} />
                          </Tooltip>
                        </Text>
                        <Slider
                          min={10} max={80} step={1}
                          value={downPaymentPct}
                          onChange={setDownPaymentPct}
                          marks={{ 10: '10%', 20: '20%', 25: '25%', 50: '50%', 80: '80%' }}
                          trackStyle={{ background: '#6366f1' }}
                          handleStyle={{ borderColor: '#6366f1' }}
                        />
                        <Text style={{ color: '#6366f1', fontWeight: 600 }}>
                          = AED {fmt(downPaymentAmt)}
                        </Text>
                      </div>

                      <div>
                        <Text style={labelStyle}>
                          Annual Interest Rate — <Text strong style={{ color: '#0ea5e9' }}>{interestRate}%</Text>
                        </Text>
                        <Slider
                          min={1} max={12} step={0.1}
                          value={interestRate}
                          onChange={setInterestRate}
                          marks={{ 1: '1%', 4.5: '4.5%', 8: '8%', 12: '12%' }}
                          trackStyle={{ background: '#0ea5e9' }}
                          handleStyle={{ borderColor: '#0ea5e9' }}
                        />
                      </div>

                      <div>
                        <Text style={labelStyle}>
                          Loan Term — <Text strong style={{ color: '#10b981' }}>{loanTerm} years</Text>
                        </Text>
                        <Slider
                          min={5} max={30} step={1}
                          value={loanTerm}
                          onChange={setLoanTerm}
                          marks={{ 5: '5yr', 10: '10yr', 15: '15yr', 25: '25yr', 30: '30yr' }}
                          trackStyle={{ background: '#10b981' }}
                          handleStyle={{ borderColor: '#10b981' }}
                        />
                      </div>

                      <Divider style={{ margin: '8px 0' }} />

                      <div>
                        <Text style={labelStyle}>
                          Include Dubai purchase fees
                          <Tooltip title="DLD 4% + Admin ~AED 4,200 + Mortgage Reg 0.25%">
                            <InfoCircleOutlined style={{ marginLeft: 6, color: '#94a3b8' }} />
                          </Tooltip>
                        </Text>
                        <Row gutter={8}>
                          {[true, false].map(v => (
                            <Col key={String(v)}>
                              <Button
                                size="small"
                                type={includeFees === v ? 'primary' : 'default'}
                                onClick={() => setIncludeFees(v)}
                                style={includeFees === v ? { background: '#6366f1', border: 'none' } : {}}
                              >
                                {v ? 'Yes' : 'No'}
                              </Button>
                            </Col>
                          ))}
                        </Row>
                      </div>
                    </Space>
                  </Card>
                </Col>

                {/* ── Right: Results ── */}
                <Col xs={24} lg={15}>

                  {/* Key Metrics */}
                  <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                    {[
                      { label: 'Monthly Payment',      value: `AED ${fmt(monthlyPayment, 0)}`, sub: `${fmt(monthlyPayment * 12, 0)} AED / yr`, color: STAT_COLORS[0], icon: <CalendarOutlined /> },
                      { label: 'Down Payment',          value: `AED ${fmt(downPaymentAmt)}`,    sub: `${downPaymentPct}% of price`,            color: STAT_COLORS[1], icon: <DollarOutlined /> },
                      { label: 'Loan Amount',           value: `AED ${fmt(loanAmount)}`,         sub: `${100 - downPaymentPct}% financed`,      color: STAT_COLORS[2], icon: <BankOutlined /> },
                      { label: 'Total Interest',        value: `AED ${fmt(totalInterest)}`,      sub: `over ${loanTerm} years`,                 color: STAT_COLORS[4], icon: <PercentageOutlined /> },
                      { label: 'Total Cash at Closing', value: `AED ${fmt(totalCashNeeded)}`,    sub: includeFees ? 'incl. Dubai fees' : 'excl. fees', color: STAT_COLORS[5], icon: <HomeOutlined /> },
                      { label: 'Total Repayment',       value: `AED ${fmt(totalRepayment)}`,     sub: `loan + interest`,                        color: STAT_COLORS[3], icon: <BankOutlined /> },
                    ].map((m, i) => (
                      <Col xs={12} sm={8} key={i}>
                        <MetricCard {...m} />
                      </Col>
                    ))}
                  </Row>

                  {/* Dubai Fees Breakdown */}
                  {includeFees && (
                    <Card
                      title={<Text style={{ fontWeight: 700, color: '#92400e' }}>🏛️ Dubai Purchase Fees Breakdown</Text>}
                      style={{ borderRadius: 14, border: '1px solid #fde68a', background: '#fffbeb', marginBottom: 16 }}
                      bodyStyle={{ padding: '12px 20px' }}
                    >
                      <Row gutter={16}>
                        {[
                          { label: 'DLD Fee (4%)', value: dldFee },
                          { label: 'Admin/Trustee', value: regFee },
                          { label: 'Mortgage Reg (0.25%)', value: mortgageRegFee },
                          { label: 'Total Fees', value: totalFees },
                        ].map(({ label, value }, i) => (
                          <Col xs={12} sm={6} key={i}>
                            <Statistic
                              title={<Text style={{ fontSize: 11, color: '#78350f' }}>{label}</Text>}
                              value={value}
                              prefix="AED"
                              precision={0}
                              valueStyle={{ fontSize: 14, color: i === 3 ? '#b45309' : '#92400e', fontWeight: i === 3 ? 700 : 500 }}
                              formatter={v => fmt(v)}
                            />
                          </Col>
                        ))}
                      </Row>
                    </Card>
                  )}

                  {/* Amortization Table */}
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

          /* ════════════════════════════════════════════════════════════════
             TAB 2 — CURRENCY CONVERTER
          ════════════════════════════════════════════════════════════════ */
          {
            key: 'currency',
            label: <span><DollarOutlined /> Currency Converter</span>,
            children: (
              <Row gutter={[24, 24]}>
                <Col xs={24} lg={10}>
                  <Card
                    title={<span style={sectionTitle}><SyncOutlined style={{ color: '#0ea5e9' }} /> Live Exchange Rates</span>}
                    style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}
                    extra={
                      <Button
                        icon={<SyncOutlined spin={ratesLoading} />}
                        onClick={fetchRates}
                        disabled={ratesLoading}
                        size="small"
                      >
                        Refresh
                      </Button>
                    }
                  >
                    {ratesError && <Alert message={ratesError} type="warning" showIcon style={{ marginBottom: 16 }} />}

                    <Text style={labelStyle}>Target Currency</Text>
                    <Select
                      showSearch
                      style={{ width: '100%', marginBottom: 20 }}
                      size="large"
                      value={targetCurrency}
                      onChange={setTargetCurrency}
                      optionFilterProp="label"
                      options={CURRENCIES.map(c => ({
                        value: c.code,
                        label: `${c.flag} ${c.code} — ${c.name}`,
                      }))}
                    />

                    {ratesLoading ? (
                      <div style={{ textAlign: 'center', padding: 40 }}>
                        <Spin /> <br /><Text type="secondary" style={{ marginTop: 12, display: 'block' }}>Fetching live rates…</Text>
                      </div>
                    ) : rates[targetCurrency] ? (
                      <Card
                        style={{ background: 'linear-gradient(135deg,#0ea5e922,#6366f111)', borderRadius: 12, border: '1px solid #0ea5e933' }}
                        bodyStyle={{ textAlign: 'center', padding: 24 }}
                      >
                        <Text style={{ fontSize: 13, color: '#64748b' }}>1 AED =</Text>
                        <div style={{ fontSize: 36, fontWeight: 800, color: '#0ea5e9', fontFamily: 'Georgia,serif', margin: '4px 0' }}>
                          {fmt(rates[targetCurrency], 4)}
                        </div>
                        <Text style={{ fontSize: 18, color: '#475569', fontWeight: 600 }}>{targetCurrency}</Text>
                        {lastUpdated && (
                          <div style={{ marginTop: 10 }}>
                            <Badge status="processing" color="green" text={<Text style={{ fontSize: 11, color: '#94a3b8' }}>Updated {lastUpdated}</Text>} />
                          </div>
                        )}
                      </Card>
                    ) : null}
                  </Card>
                </Col>

                <Col xs={24} lg={14}>
                  <Card
                    title={<span style={sectionTitle}>💱 Your Property Values in {targetCurrency}</span>}
                    style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}
                  >
                    {!rates[targetCurrency] ? (
                      <Empty description="Select a currency to see converted values" />
                    ) : (
                      <Space direction="vertical" size={0} style={{ width: '100%' }}>
                        {[
                          { label: 'Property Price',         aed: propertyPrice,      color: '#6366f1' },
                          { label: `Down Payment (${downPaymentPct}%)`, aed: downPaymentAmt, color: '#0ea5e9' },
                          { label: 'Loan Amount',            aed: loanAmount,         color: '#10b981' },
                          { label: 'Monthly Payment',        aed: monthlyPayment,     color: '#f59e0b' },
                          { label: 'Annual Payment',         aed: monthlyPayment*12,  color: '#8b5cf6' },
                          { label: 'Total Interest',         aed: totalInterest,      color: '#ef4444' },
                          { label: 'Total Repayment',        aed: totalRepayment,     color: '#64748b' },
                          ...(includeFees ? [{ label: 'Total Fees (DLD+Admin)', aed: totalFees, color: '#92400e' }] : []),
                          { label: 'Total Cash at Closing',  aed: totalCashNeeded,    color: '#0f172a', bold: true },
                        ].map(({ label, aed, color, bold }, i) => (
                          <div
                            key={i}
                            style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '12px 16px', borderRadius: 10, marginBottom: 4,
                              background: bold ? '#f1f5f9' : (i % 2 === 0 ? '#fafafa' : 'white'),
                              border: bold ? '1px solid #e2e8f0' : 'none',
                            }}
                          >
                            <Text style={{ color: '#475569', fontWeight: bold ? 700 : 400, fontSize: 13 }}>{label}</Text>
                            <Space size={16}>
                              <Text style={{ color: '#94a3b8', fontSize: 12 }}>AED {fmt(aed, 0)}</Text>
                              <Text style={{ color, fontWeight: bold ? 700 : 600, fontSize: bold ? 15 : 13 }}>
                                {fmt(aed * rates[targetCurrency], 2)} {targetCurrency}
                              </Text>
                            </Space>
                          </div>
                        ))}
                      </Space>
                    )}
                  </Card>
                </Col>
              </Row>
            ),
          },

          /* ════════════════════════════════════════════════════════════════
             TAB 3 — PDF QUOTE
          ════════════════════════════════════════════════════════════════ */
          {
            key: 'pdf',
            label: <span><FilePdfOutlined /> PDF Quote</span>,
            children: (
              <Row gutter={[24, 24]}>
                <Col xs={24} lg={12}>
                  <Card
                    title={<span style={sectionTitle}><UserOutlined style={{ color: '#6366f1' }} /> Client Information</span>}
                    style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}
                  >
                    <Space direction="vertical" size={14} style={{ width: '100%' }}>
                      <div>
                        <Text style={labelStyle}><UserOutlined /> Client Full Name</Text>
                        <Input size="large" placeholder="e.g. Mohammed Al Rashid" value={clientName} onChange={e => setClientName(e.target.value)} />
                      </div>
                      <div>
                        <Text style={labelStyle}><MailOutlined /> Email Address</Text>
                        <Input size="large" placeholder="client@email.com" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
                      </div>
                      <div>
                        <Text style={labelStyle}><PhoneOutlined /> Phone Number</Text>
                        <Input size="large" placeholder="+971 50 000 0000" value={clientPhone} onChange={e => setClientPhone(e.target.value)} />
                      </div>
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} lg={12}>
                  <Card
                    title={<span style={sectionTitle}><HomeOutlined style={{ color: '#10b981' }} /> Property & Agent</span>}
                    style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}
                  >
                    <Space direction="vertical" size={14} style={{ width: '100%' }}>
                      <div>
                        <Text style={labelStyle}>Property Title / Name</Text>
                        <Input size="large" placeholder="e.g. 2BR Marina Heights, JBR" value={propertyTitle} onChange={e => setPropertyTitle(e.target.value)} />
                      </div>
                      <div>
                        <Text style={labelStyle}>Property Reference</Text>
                        <Input size="large" placeholder="e.g. ORB-MRN-24001" value={propertyRef} onChange={e => setPropertyRef(e.target.value)} />
                      </div>
                      <div>
                        <Text style={labelStyle}>Agent / Consultant Name</Text>
                        <Input size="large" placeholder="Agent's full name" value={agentName} onChange={e => setAgentName(e.target.value)} />
                      </div>
                    </Space>
                  </Card>
                </Col>

                {/* Quote Preview Summary */}
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
                        { label: 'Client',              value: clientName    || '—' },
                        { label: 'Property',            value: propertyTitle || '—' },
                        { label: 'Reference',           value: propertyRef   || '—' },
                        { label: 'Property Price',      value: `AED ${fmt(propertyPrice)}` },
                        { label: `Down Payment (${downPaymentPct}%)`, value: `AED ${fmt(downPaymentAmt)}` },
                        { label: 'Monthly Payment',     value: `AED ${fmt(monthlyPayment, 2)}` },
                        { label: 'Loan Term',           value: `${loanTerm} years @ ${interestRate}%` },
                        { label: 'Total Cash at Closing', value: `AED ${fmt(totalCashNeeded)}` },
                        ...(rates[targetCurrency] ? [
                          { label: `Monthly in ${targetCurrency}`, value: `${fmt(monthlyPayment * rates[targetCurrency], 2)} ${targetCurrency}` },
                        ] : []),
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
                      📌 The PDF will include the full amortization schedule, Dubai fee breakdown,
                      {rates[targetCurrency] ? ` currency conversion to ${targetCurrency},` : ''}
                      &nbsp;and an official ORBREX365 disclaimer.
                    </Paragraph>
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]}
      />
    </div>
  );
};

export default PropertyFinancePage;