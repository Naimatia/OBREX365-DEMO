import React, { useEffect, useState } from "react";
import {
  Card, Row, Col, Statistic, Typography, Table, Tag,
  Avatar, Spin, Space, Progress, Tooltip, Select,
  Button, message, Alert, Empty, Divider, Badge,
  Input, Collapse, Descriptions
} from "antd";
import {
  TrophyOutlined, UserOutlined, ClockCircleOutlined,
  CheckCircleOutlined, StarOutlined, CrownOutlined,
  TeamOutlined, ReloadOutlined, GoldOutlined,
  FireOutlined, RiseOutlined, FallOutlined,
  SearchOutlined, EnvironmentOutlined,
  HomeOutlined, DollarOutlined
} from "@ant-design/icons";
import axios from "axios";
import { useSelector } from "react-redux";

import API_BASE_URL from "../../../../constants/ApiConstant";

const { Title, Text } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

const PropertyFinderStatistics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [publicProfiles, setPublicProfiles] = useState([]);
  const [superAgents, setSuperAgents] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const user = useSelector((state) => state.auth.user);
  const companyId = user?.company_id;

  useEffect(() => {
    if (companyId) {
      fetchDashboardStats();
    }
  }, [companyId]);

  const fetchDashboardStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/propertyfinder/stats/dashboard`,
        { params: { company_id: companyId } }
      );

      if (response.data.success) {
        setDashboardData(response.data.dashboard);
        setPublicProfiles(response.data.dashboard.profiles || []);
        setSuperAgents(response.data.dashboard.superAgents || []);
        setTopPerformers(response.data.dashboard.topPerformers || []);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
      setError(err.response?.data?.error || "Failed to load statistics");
      message.error("Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };

  // Format response time from seconds to readable format
  const formatResponseTime = (seconds) => {
    if (!seconds || seconds === 0) return 'N/A';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  // Get rank badge
  const getRankBadge = (rank) => {
    if (rank <= 10) return <CrownOutlined style={{ color: '#fadb14', fontSize: 20 }} />;
    if (rank <= 50) return <GoldOutlined style={{ color: '#d4d4d4', fontSize: 18 }} />;
    return <Text type="secondary" style={{ fontSize: 14 }}>#{rank}</Text>;
  };

  // Get status tag for metrics
  const getStatusTag = (pass) => {
    if (pass === true) return <Tag color="success">✓ Pass</Tag>;
    if (pass === false) return <Tag color="error">✗ Fail</Tag>;
    return <Tag color="default">N/A</Tag>;
  };

  // Public Profiles Columns
  const profileColumns = [
    {
      title: 'Agent',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Avatar src={record.imageUrl} icon={<UserOutlined />} size={40} />
          <div>
            <Text strong>{text || 'Unknown'}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              ID: {record.id}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Verified',
      dataIndex: ['metrics', 'verification'],
      key: 'verified',
      render: (verification) => (
        <Tag color={verification?.value === "1" ? 'green' : 'default'}>
          {verification?.value === "1" ? '✓ Verified' : 'Not Verified'}
        </Tag>
      )
    },
    {
      title: 'Response Rate',
      dataIndex: ['metrics', 'responseRate'],
      key: 'responseRate',
      render: (rate) => {
        const value = parseInt(rate?.value) || 0;
        return (
          <Progress 
            percent={value} 
            size="small" 
            status={value > 80 ? 'success' : value > 50 ? 'active' : 'exception'}
            format={() => `${value}%`}
          />
        );
      }
    },
    {
      title: 'Response Time',
      dataIndex: ['metrics', 'responseTime'],
      key: 'responseTime',
      render: (time) => formatResponseTime(parseInt(time?.value))
    },
    {
      title: 'Rating',
      dataIndex: ['metrics', 'ratingAverage'],
      key: 'rating',
      render: (rating) => {
        const value = parseFloat(rating?.value) || 0;
        return (
          <Space>
            <StarOutlined style={{ color: '#faad14' }} />
            <Text>{value.toFixed(1)}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              ({parseInt(publicProfiles.find(p => p.metrics?.ratingsCount)?.metrics?.ratingsCount?.value) || 0})
            </Text>
          </Space>
        );
      }
    },
    {
      title: 'Quality Score',
      dataIndex: ['metrics', 'qualityScoreAvg'],
      key: 'quality',
      render: (score) => {
        const value = parseInt(score?.value) || 0;
        return (
          <Progress 
            percent={value} 
            size="small" 
            strokeColor={value > 80 ? '#52c41a' : value > 60 ? '#faad14' : '#ff4d4f'}
            format={() => `${value}%`}
          />
        );
      }
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        const metrics = record.metrics || {};
        const passes = Object.values(metrics).filter(m => m.pass === true).length;
        const total = Object.values(metrics).filter(m => m.pass !== undefined).length;
        return (
          <Badge 
            count={`${passes}/${total}`}
            style={{ backgroundColor: passes === total ? '#52c41a' : '#faad14' }}
          />
        );
      }
    }
  ];

  // Top Performers Columns
  const topPerformerColumns = [
    {
      title: 'Rank',
      dataIndex: 'rank',
      key: 'rank',
      render: (value) => (
        <Space>
          {getRankBadge(value)}
          <Text strong>#{value}</Text>
        </Space>
      )
    },
    {
      title: 'Agent',
      dataIndex: 'name',
      key: 'name',
      render: (text) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <Text strong>{text}</Text>
        </Space>
      )
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      render: (text) => (
        <Space>
          <EnvironmentOutlined />
          <Text>{text}</Text>
        </Space>
      )
    },
    {
      title: 'Property Type',
      dataIndex: 'propertyType',
      key: 'propertyType',
      render: (text) => <Tag color="cyan">{text}</Tag>
    }
  ];

  // SuperAgent Columns
  const superAgentColumns = [
    {
      title: 'Agent',
      dataIndex: 'name',
      key: 'name',
      render: (text) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#faad14' }} />
          <Text strong>{text}</Text>
        </Space>
      )
    },
    {
      title: 'Live Listings',
      key: 'listings',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>Sales: {record.liveListingsSalesCountActual || 0}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Rentals: {record.liveListingsRentalCountActual || 0}
          </Text>
        </Space>
      )
    },
    {
      title: 'Response Rate',
      dataIndex: 'responseRateActual',
      key: 'responseRate',
      render: (value) => (
        <Progress 
          percent={Math.round((value || 0) * 100)} 
          size="small"
          status={value > 0.8 ? 'success' : 'active'}
          format={() => `${Math.round((value || 0) * 100)}%`}
        />
      )
    },
    {
      title: 'Response Time',
      dataIndex: 'responseTimeActual',
      key: 'responseTime',
      render: (value) => formatResponseTime(value)
    },
    {
      title: 'Listing Quality',
      dataIndex: 'listingQualityActual',
      key: 'quality',
      render: (value) => (
        <Progress 
          percent={Math.round((value || 0) * 100)} 
          size="small"
          strokeColor="#52c41a"
          format={() => `${Math.round((value || 0) * 100)}%`}
        />
      )
    },
    {
      title: 'Streak',
      dataIndex: 'superagentStreakWeeks',
      key: 'streak',
      render: (value) => (
        <Space>
          <FireOutlined style={{ color: value > 0 ? '#faad14' : '#d9d9d9' }} />
          <Text>{value || 0} weeks</Text>
        </Space>
      )
    },
    {
      title: 'Total Points',
      key: 'points',
      render: (_, record) => {
        const points = (record.liveListingsPointsCombined || 0) + 
                      (record.responseRatePoints || 0) + 
                      (record.responseTimePoints || 0) +
                      (record.listingQualityPoints || 0) +
                      (record.claimedTransactionsPointsCombined || 0);
        return (
          <Tag color={points > 200 ? 'gold' : 'blue'}>
            {points} pts
          </Tag>
        );
      }
    }
  ];

  if (!companyId) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message="No Company Found"
          description="Please create or join a company first to view statistics."
          type="warning"
          showIcon
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <Spin size="large" tip="Loading statistics..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message="Error Loading Statistics"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={fetchDashboardStats}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  const overview = dashboardData?.overview || {};

  return (
    <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            <TrophyOutlined style={{ color: '#faad14' }} /> Performance Dashboard
          </Title>
          <Text type="secondary">SuperAgent performance metrics and rankings</Text>
        </div>
        <Space>
          <Input.Search
            placeholder="Search agent..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onSearch={() => fetchDashboardStats()}
            style={{ width: 200 }}
          />
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchDashboardStats}
          >
            Refresh
          </Button>
        </Space>
      </div>

      {/* Overview Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic
              title="Total Agents"
              value={overview.totalProfiles || 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic
              title="SuperAgents"
              value={overview.totalSuperAgents || 0}
              prefix={<StarOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic
              title="Verified Agents"
              value={overview.verifiedProfiles || 0}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic
              title="Avg Response Time"
              value={formatResponseTime(overview.avgResponseTime)}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic
              title="Avg Response Rate"
              value={overview.avgResponseRate || 0}
              suffix="%"
              prefix={<RiseOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic
              title="Total Rankings"
              value={dashboardData?.totalRankings || 0}
              prefix={<CrownOutlined style={{ color: '#fadb14' }} />}
              valueStyle={{ color: '#fadb14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Top Performers */}
      <Card 
        title={
          <Space>
            <CrownOutlined style={{ color: '#fadb14' }} />
            <Text strong>Top Performers</Text>
            <Badge count={topPerformers.length} />
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        {topPerformers.length > 0 ? (
          <Table
            dataSource={topPerformers}
            columns={topPerformerColumns}
            rowKey={(record) => `${record.id}-${record.rank}`}
            pagination={{ pageSize: 10 }}
            size="middle"
          />
        ) : (
          <Empty description="No rankings found" />
        )}
      </Card>

      {/* SuperAgents */}
      <Card 
        title={
          <Space>
            <StarOutlined style={{ color: '#faad14' }} />
            <Text strong>SuperAgent Performance</Text>
            <Badge count={superAgents.length} />
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        {superAgents.length > 0 ? (
          <Table
            dataSource={superAgents}
            columns={superAgentColumns}
            rowKey="id"
            pagination={{ pageSize: 5 }}
            size="small"
          />
        ) : (
          <Empty description="No SuperAgents found" />
        )}
      </Card>

      {/* All Agents */}
      <Card 
        title={
          <Space>
            <UserOutlined />
            <Text strong>All Agents</Text>
            <Badge count={publicProfiles.length} />
          </Space>
        }
      >
        {publicProfiles.length > 0 ? (
          <Table
            dataSource={publicProfiles}
            columns={profileColumns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="middle"
            scroll={{ x: 1200 }}
          />
        ) : (
          <Empty description="No agents found" />
        )}
      </Card>

      {/* Performance Summary */}
      {dashboardData && (
        <Card style={{ marginTop: 24 }}>
          <Title level={4}>Performance Summary</Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <div style={{ textAlign: 'center' }}>
                <Progress
                  type="dashboard"
                  percent={overview.avgResponseRate || 0}
                  format={(percent) => (
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 'bold' }}>
                        {percent}%
                      </div>
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                        Avg Response Rate
                      </div>
                    </div>
                  )}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                  width={150}
                />
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div style={{ textAlign: 'center', paddingTop: 20 }}>
                <div style={{ fontSize: 36, fontWeight: 'bold', color: '#faad14' }}>
                  {overview.totalSuperAgents || 0}
                </div>
                <div style={{ fontSize: 14, color: '#8c8c8c' }}>
                  <StarOutlined /> SuperAgents
                </div>
                <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                  {overview.verifiedProfiles || 0} verified agents
                </div>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div style={{ textAlign: 'center', paddingTop: 20 }}>
                <div style={{ fontSize: 36, fontWeight: 'bold', color: '#1890ff' }}>
                  {dashboardData.totalRankings || 0}
                </div>
                <div style={{ fontSize: 14, color: '#8c8c8c' }}>
                  <CrownOutlined /> Total Rankings
                </div>
                <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                  Across all categories and locations
                </div>
              </div>
            </Col>
          </Row>
        </Card>
      )}
    </div>
  );
};

export default PropertyFinderStatistics;