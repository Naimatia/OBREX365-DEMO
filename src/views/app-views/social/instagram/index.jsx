import React, { useEffect, useState } from "react";
import { 
  Card, Button, message, Row, Col, Statistic, Typography, 
  Avatar, Spin, Modal, Divider, Result 
} from "antd";
import { 
  EyeOutlined, LikeOutlined, DeleteOutlined, 
  ReloadOutlined, PlayCircleOutlined 
} from "@ant-design/icons";
import axios from "axios";
import { useSelector } from "react-redux";

import API_BASE_URL from "../../../../constants/ApiConstant";
import companyService from 'services/CompanyService';

const { Title, Text } = Typography;

const InstagramDashboard = () => {
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

  // Fetch Company + Instagram Posts
  useEffect(() => {
    const fetchCompanyAndPosts = async () => {
      if (!companyId) {
        message.warning("No company associated with your account");
        return;
      }

      setLoading(true);
      try {
        const companyData = await companyService.getCompanyById(companyId);
        setCompany(companyData);

        await fetchPosts(companyId);
      } catch (err) {
        console.error(err);
        message.error("Failed to load company or Instagram posts");
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyAndPosts();
  }, [companyId]);

  // Fetch Posts
  const fetchPosts = async (cid, after = null) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/instagram/posts`, {
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
      message.error("Failed to load Instagram posts");
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
      title: 'Delete Instagram Post',
      content: 'This will permanently delete the post/Reel from Instagram and your database.',
      okText: 'Yes, Delete Permanently',
      okType: 'danger',
      onOk: async () => {
        try {
          setDeletingId(post.id);
          await axios.delete(`${API_BASE_URL}/api/delete-post`, {
            data: {
              facebookPostId: null,
              instagramPostId: post.id,
              scheduledPostId: post.scheduledPostId || null,
              company_id: companyId
            }
          });

          message.success("✅ Instagram post deleted successfully");
          fetchPosts(companyId); // Refresh
        } catch (err) {
          message.error(err.response?.data?.error || "Failed to delete post");
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
    setInsights(null);

    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/instagram/posts/${post.id}/insights`,
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
    const isVideo = post.media_type === "VIDEO" || post.media_product_type === "REELS";
    
    if (isVideo && post.media_url) {
      return (
        <video
          controls
          style={{ width: "100%", borderRadius: "8px", maxHeight: "320px", background: "#000" }}
        >
          <source src={post.media_url} type="video/mp4" />
        </video>
      );
    }

    if (post.media_url || post.thumbnail_url) {
      return (
        <img 
          src={post.media_url || post.thumbnail_url} 
          alt="post"
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
            {company?.name || "My Company"} - Instagram
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
          <Card>
            <Statistic title="Total Posts" value={posts.length} />
          </Card>
        </Col>
      </Row>

      {/* Posts Grid */}
      <Row gutter={[16, 16]}>
        {loading ? (
          <Col span={24}>
            <Spin size="large" tip="Loading Instagram posts..." style={{ display: 'block', padding: '80px 0' }} />
          </Col>
        ) : posts.length === 0 ? (
          <Col span={24}>
            <Card style={{ textAlign: "center", padding: "60px 20px" }}>
              <Text type="secondary">No Instagram posts or Reels found for this company</Text>
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
                  <Button 
                    key="analytics" 
                    type="link" 
                    icon={<EyeOutlined />} 
                    onClick={() => showPostAnalytics(post)}
                  >
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
                  description={new Date(post.timestamp).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })}
                />

                {post.caption && (
                  <div style={{ marginTop: 12, fontSize: "14px", lineHeight: "1.5" }}>
                    {post.caption.length > 120 ? post.caption.substring(0, 120) + "..." : post.caption}
                  </div>
                )}

                {post.permalink && (
                  <a 
                    href={post.permalink} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ display: "block", marginTop: 8, fontSize: "12px" }}
                  >
                    View on Instagram →
                  </a>
                )}
              </Card>
            </Col>
          ))
        )}
      </Row>

      {/* Load More */}
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
        title="Instagram Post Analytics"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={950}
      >
        {selectedPost && (
          <>
            <Card style={{ marginBottom: 24 }}>
              {renderMedia(selectedPost)}
              {selectedPost.caption && (
                <p style={{ marginTop: 16, fontSize: "15.5px", lineHeight: "1.6" }}>
                  {selectedPost.caption}
                </p>
              )}
            </Card>

            <Divider />

            {modalLoading ? (
              <Spin size="large" style={{ display: "block", padding: "80px 0" }} tip="Loading analytics..." />
            ) : (
              <>
                <Title level={5} style={{ marginBottom: 20 }}>Performance Analytics</Title>

                {insights && Object.values(insights).every(v => v === 0) ? (
                  <Card style={{ textAlign: "center", padding: "50px 20px" }}>
                    <Text type="secondary">
                      No analytics data available yet.<br />
                      Insights usually appear after 24-48 hours.
                    </Text>
                  </Card>
                ) : (
                  <>
                    <Row gutter={[24, 24]}>
                      <Col xs={12} sm={8}>
                        <Statistic 
                          title="Impressions" 
                          value={insights?.impressions || 0} 
                          prefix={<EyeOutlined style={{ color: '#1890ff' }} />} 
                          valueStyle={{ color: '#1890ff', fontSize: '24px' }} 
                        />
                      </Col>
                      <Col xs={12} sm={8}>
                        <Statistic title="Reach" value={insights?.reach || 0} valueStyle={{ fontSize: '24px' }} />
                      </Col>
                      <Col xs={12} sm={8}>
                        <Statistic 
                          title="Plays / Views" 
                          value={insights?.plays || 0} 
                          prefix={<PlayCircleOutlined style={{ color: '#eb2f96' }} />} 
                          valueStyle={{ color: '#eb2f96', fontSize: '24px' }} 
                        />
                      </Col>
                      <Col xs={12} sm={8}>
                        <Statistic 
                          title="Likes" 
                          value={insights?.likes || 0} 
                          prefix={<LikeOutlined style={{ color: '#52c41a' }} />} 
                          valueStyle={{ color: '#52c41a', fontSize: '24px' }} 
                        />
                      </Col>
                      <Col xs={12} sm={8}>
                        <Statistic title="Comments" value={insights?.comments || 0} valueStyle={{ fontSize: '24px' }} />
                      </Col>
                      <Col xs={12} sm={8}>
                        <Statistic title="Saves" value={insights?.saves || 0} valueStyle={{ fontSize: '24px' }} />
                      </Col>
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

export default InstagramDashboard;