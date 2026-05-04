import React, { useEffect, useState } from "react";
import { 
  Card, Button, message, Row, Col, Statistic, Typography, 
  Avatar, Spin, Modal, Divider 
} from "antd";
import { 
  EyeOutlined, LikeOutlined, HeartOutlined, DeleteOutlined, 
  ReloadOutlined 
} from "@ant-design/icons";
import axios from "axios";
import { useSelector } from "react-redux";

import API_BASE_URL from "../../../../constants/ApiConstant";
import companyService from 'services/CompanyService';   // ← Same service as MyCompanyPage

const { Title, Text } = Typography;

const FacebookDashboard = () => {
  const [posts, setPosts] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // Modal states
  const [selectedPost, setSelectedPost] = useState(null);
  const [insights, setInsights] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const user = useSelector((state) => state.auth.user);
  const companyId = user?.company_id;

  // Fetch Company Data (same pattern as MyCompanyPage)
  useEffect(() => {
    const fetchCompanyAndPosts = async () => {
      if (!companyId) {
        message.warning("No company associated with your account");
        return;
      }

      setLoading(true);
      try {
        // Fetch full company details
        const companyData = await companyService.getCompanyById(companyId);
        setCompany(companyData);

        // Fetch Facebook posts for this company
        await fetchPosts(companyId);
      } catch (err) {
        console.error(err);
        message.error("Failed to load company or posts");
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyAndPosts();
  }, [companyId]);

  // Fetch Posts
  const fetchPosts = async (cid, after = null) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/facebook/posts`, {
        params: {
          limit: 20,
          after: after,
          company_id: cid
        }
      });

      if (after) {
        setPosts(prev => [...prev, ...res.data.data]);
      } else {
        setPosts(res.data.data || []);
      }

      setNextCursor(res.data.pagination?.nextCursor || null);
      setHasMore(res.data.pagination?.hasNextPage || false);
    } catch (err) {
      message.error("Failed to load Facebook posts");
      console.error(err);
    }
  };

  const loadMorePosts = () => {
    if (nextCursor && companyId) {
      setLoadingMore(true);
      fetchPosts(companyId, nextCursor).finally(() => setLoadingMore(false));
    }
  };

  const deletePost = async (post) => {
    Modal.confirm({
      title: 'Permanently Delete Post',
      content: 'This action cannot be undone.',
      okText: 'Delete Permanently',
      okType: 'danger',
      onOk: async () => {
        try {
          setDeletingId(post.id);
          await axios.delete(`${API_BASE_URL}/api/delete-post`, {
            data: {
              facebookPostId: post.id,
              instagramPostId: null,
              scheduledPostId: post.scheduledPostId || null,
              company_id: companyId
            }
          });

          message.success("Post deleted successfully");
          fetchPosts(companyId); // Refresh
        } catch (err) {
          message.error(err.response?.data?.error || "Delete failed");
        } finally {
          setDeletingId(null);
        }
      }
    });
  };

  const showPostAnalytics = async (post) => {
    setSelectedPost(post);
    setIsModalVisible(true);
    setModalLoading(true);

    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/facebook/posts/${post.id}/insights`,
        { params: { company_id: companyId } }
      );
      setInsights(res.data.insights);
    } catch (err) {
      message.error("Failed to load analytics");
      setInsights({});
    } finally {
      setModalLoading(false);
    }
  };

  const renderMedia = (post) => {
    const imageUrl = post.full_picture;
    const attachment = post.attachments?.data?.[0];
    const isVideo = attachment?.type?.includes("video");

    if (isVideo && attachment?.media?.source) {
      return (
        <video controls style={{ width: "100%", borderRadius: "8px", maxHeight: "320px" }}>
          <source src={attachment.media.source} type="video/mp4" />
        </video>
      );
    }

    if (imageUrl) {
      return (
        <img 
          src={imageUrl} 
          alt="post media"
          style={{ width: "100%", borderRadius: "8px", maxHeight: "320px", objectFit: "cover" }} 
        />
      );
    }
    return null;
  };

  if (!companyId) {
    return (
      <Result
        status="warning"
        title="No Company Found"
        subTitle="Please create or join a company first."
      />
    );
  }

  return (
    <div style={{ padding: "24px", background: "#f5f5f5", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar 
            src={company?.logo} 
            size={48} 
            shape="square"
          />
          <Title level={3} style={{ margin: 0 }}>
            {company?.name || "My Company"} - Facebook
          </Title>
        </div>
        <Button 
          icon={<ReloadOutlined />} 
          onClick={() => fetchPosts(companyId)}
          loading={loading}
        >
          Refresh
        </Button>
      </div>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        <Col xs={12} sm={8} lg={6}>
          <Card><Statistic title="Total Posts" value={posts.length} /></Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card><Statistic title="Published" value={posts.filter(p => p.is_published).length} /></Card>
        </Col>
      </Row>

      {/* Posts Grid */}
      <Row gutter={[16, 16]}>
        {loading ? (
          <Col span={24}>
            <Spin size="large" tip="Loading posts..." style={{ display: 'block', padding: '80px 0' }} />
          </Col>
        ) : posts.length === 0 ? (
          <Col span={24}>
            <Card style={{ textAlign: "center", padding: "60px 20px" }}>
              <Text type="secondary">No posts found for this company</Text>
            </Card>
          </Col>
        ) : (
          posts.map((post) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={post.id}>
              <Card
                hoverable
                style={{ height: "100%", borderRadius: "12px", overflow: "hidden" }}
                cover={renderMedia(post)}
                actions={[
                  <Button key="analytics" type="link" icon={<EyeOutlined />} onClick={() => showPostAnalytics(post)}>
                    Analytics
                  </Button>,
                  <Button 
                    key="delete"
                    danger 
                    icon={<DeleteOutlined />} 
                    loading={deletingId === post.id}
                    onClick={() => deletePost(post)}
                  >
                    Delete
                  </Button>
                ]}
              >
                <Card.Meta
                  avatar={<Avatar src={company?.logo} />}
                  title={company?.name}
                  description={new Date(post.created_time).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })}
                />

                {post.message && (
                  <div style={{ marginTop: 12, fontSize: "14px", lineHeight: "1.5" }}>
                    {post.message.length > 120 ? post.message.substring(0, 120) + "..." : post.message}
                  </div>
                )}

                {post.permalink_url && (
                  <a href={post.permalink_url} target="_blank" rel="noopener noreferrer" style={{ marginTop: 8, display: 'block', fontSize: '12px' }}>
                    View on Facebook →
                  </a>
                )}
              </Card>
            </Col>
          ))
        )}
      </Row>

      {/* Load More Button */}
      {hasMore && (
        <div style={{ textAlign: "center", margin: "40px 0" }}>
          <Button 
            type="primary" 
            size="large"
            onClick={loadMorePosts}
            loading={loadingMore}
            style={{ minWidth: 200 }}
          >
            {loadingMore ? "Loading..." : "Load More Posts"}
          </Button>
        </div>
      )}

      {/* Analytics Modal */}
      <Modal
        title="Post Performance Analytics"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={950}
      >
        {selectedPost && (
          <>
            <Card style={{ marginBottom: 24 }}>
              {renderMedia(selectedPost)}
              {selectedPost.message && (
                <p style={{ marginTop: 16, fontSize: "15.5px", lineHeight: "1.6" }}>
                  {selectedPost.message}
                </p>
              )}
            </Card>

            <Divider />

            {modalLoading ? (
              <Spin size="large" style={{ display: "block", padding: "80px 0" }} tip="Loading analytics..." />
            ) : (
              <>
                <Title level={5} style={{ marginBottom: 20 }}>Performance Analytics</Title>

                {insights && Object.values(insights).every(val => val === 0 || val === undefined) ? (
                  <Card style={{ textAlign: "center", padding: "50px 20px" }}>
                    <Text type="secondary" style={{ fontSize: "16px" }}>
                      No analytics data available yet.<br />
                      Insights are usually available for posts from the last 1-2 weeks.
                    </Text>
                  </Card>
                ) : (
                  <>
                    <Row gutter={[24, 24]}>
                      <Col xs={12} sm={8}>
                        <Statistic 
                          title="Unique Reach" 
                          value={insights?.impressions_unique || 0} 
                          prefix={<EyeOutlined style={{ color: '#1890ff' }} />} 
                          valueStyle={{ color: '#1890ff', fontSize: '24px' }}
                        />
                      </Col>
                      <Col xs={12} sm={8}>
                        <Statistic 
                          title="Organic Reach" 
                          value={insights?.impressions_organic_unique || 0} 
                          valueStyle={{ fontSize: '24px' }}
                        />
                      </Col>
                      <Col xs={12} sm={8}>
                        <Statistic 
                          title="Total Clicks" 
                          value={insights?.clicks || 0} 
                          valueStyle={{ fontSize: '24px' }}
                        />
                      </Col>

                      <Col xs={12} sm={8}>
                        <Statistic 
                          title="Likes" 
                          value={insights?.reactions?.like || 0} 
                          prefix={<LikeOutlined style={{ color: '#52c41a' }} />} 
                          valueStyle={{ color: '#52c41a', fontSize: '24px' }}
                        />
                      </Col>
                      <Col xs={12} sm={8}>
                        <Statistic 
                          title="Love" 
                          value={insights?.reactions?.love || 0} 
                          prefix={<HeartOutlined style={{ color: '#eb2f96' }} />} 
                          valueStyle={{ color: '#eb2f96', fontSize: '24px' }}
                        />
                      </Col>
                      <Col xs={12} sm={8}>
                        <Statistic 
                          title="Video Views" 
                          value={insights?.video_views || 0} 
                          valueStyle={{ fontSize: '24px' }}
                        />
                      </Col>
                    </Row>

                    <Divider style={{ margin: '32px 0 16px' }} />

                    <Title level={5} style={{ marginBottom: 16 }}>Reactions Breakdown</Title>
                    <Row gutter={[16, 12]}>
                      {[
                        { emoji: "👍", label: "Like", value: insights?.reactions?.like || 0 },
                        { emoji: "❤️", label: "Love", value: insights?.reactions?.love || 0 },
                        { emoji: "😮", label: "Wow", value: insights?.reactions?.wow || 0 },
                        { emoji: "😂", label: "Haha", value: insights?.reactions?.haha || 0 },
                        { emoji: "😢", label: "Sorry", value: insights?.reactions?.sorry || 0 },
                        { emoji: "😡", label: "Anger", value: insights?.reactions?.anger || 0 },
                      ].map((item) => (
                        <Col span={8} key={item.label}>
                          <Text>{item.emoji} {item.label}: <strong>{item.value}</strong></Text>
                        </Col>
                      ))}
                    </Row>
                  </>
                )}
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default FacebookDashboard;