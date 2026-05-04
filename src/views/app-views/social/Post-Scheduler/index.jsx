import React, { useState, useEffect } from "react";
import {
  Card, Button, Input, message, Typography, Upload,
  Modal, DatePicker, Table, Tooltip, Space, Popconfirm, Result, Avatar
} from "antd";
import {
  PictureOutlined, VideoCameraOutlined, CalendarOutlined,
  EyeOutlined, ClockCircleOutlined, CheckCircleOutlined,
  CloseCircleOutlined, PlusOutlined, FacebookOutlined,
  InstagramOutlined, ReloadOutlined, PlayCircleOutlined,
  EditOutlined, DeleteOutlined
} from "@ant-design/icons";
import axios from "axios";
import { useSelector } from "react-redux";
import cloudinaryService from "services/CloudinaryService";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import API_BASE_URL from "../../../../constants/ApiConstant";
import companyService from 'services/CompanyService';

dayjs.extend(relativeTime);

const { TextArea } = Input;
const { Title, Text } = Typography;

const API = API_BASE_URL;

// Status Config
const STATUS = {
  scheduled:  { color: "#1677ff", bg: "#e6f4ff", label: "Scheduled",  icon: <ClockCircleOutlined style={{ fontSize: 12 }} /> },
  publishing: { color: "#fa8c16", bg: "#fff7e6", label: "Publishing", icon: <ClockCircleOutlined style={{ fontSize: 12 }} /> },
  published:  { color: "#52c41a", bg: "#f6ffed", label: "Published",  icon: <CheckCircleOutlined style={{ fontSize: 12 }} /> },
  failed:     { color: "#ff4d4f", bg: "#fff2f0", label: "Failed",     icon: <CloseCircleOutlined style={{ fontSize: 12 }} /> },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS[status] || STATUS.scheduled;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500,
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}30`
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

// Helper to safely convert Firestore Timestamp
const toDayjs = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp?.seconds) return dayjs(timestamp.seconds * 1000);
  if (timestamp?.toDate) return dayjs(timestamp.toDate());
  return dayjs(timestamp);
};

// Post Form Modal
const PostFormModal = ({ open, onClose, onSave, initialData, company }) => {
  const isEdit = !!initialData;

  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [selectedDate, setSelectedDate] = useState(dayjs().add(1, "hour"));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (isEdit) {
        setContent(initialData.message || "");
        setFileType(initialData.mediaType || "image");
        setFile(null);
        setSelectedDate(toDayjs(initialData.scheduledTime) || dayjs().add(1, "hour"));
      } else {
        setContent("");
        setFile(null);
        setFileType(null);
        setSelectedDate(dayjs().add(1, "hour"));
      }
    }
  }, [open, initialData]);

  const handleFileChange = (info) => {
    const f = info.file;
    if (!f.type.startsWith("image/") && !f.type.startsWith("video/")) {
      return message.error("Only images and videos are allowed");
    }
    setFile(f);
    setFileType(f.type.startsWith("image/") ? "image" : "video");
  };

  const handleSave = async () => {
    if (!content.trim()) return message.warning("Please write a caption");
    if (!isEdit && !file) return message.warning("Please select an image or video");

    setSaving(true);
    try {
      let mediaUrl = isEdit ? initialData.mediaUrl : null;
      let mediaType = isEdit ? initialData.mediaType : fileType;

      if (file) {
        message.loading("Uploading media...", 0);
        const result = await cloudinaryService.uploadFile(file, { folder: "scheduled-posts" });
        mediaUrl = result.secure_url;
        mediaType = fileType;
        message.destroy();
      }

      await onSave({
        message: content.trim(),
        mediaUrl,
        mediaType,
        scheduledTime: selectedDate.toISOString(),
        company_id: company?.id 
      });

      onClose();
    } catch (err) {
      message.error(err.response?.data?.error || err.message || "Failed to save post");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? "Edit Scheduled Post" : "Schedule New Post"}
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      destroyOnClose
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>PUBLISH DATE & TIME</Text>
          <DatePicker 
            showTime 
            format="YYYY-MM-DD HH:mm" 
            value={selectedDate} 
            onChange={setSelectedDate}
            style={{ width: "100%" }} 
            disabledDate={(current) => current && current < dayjs().startOf("day")} 
            minuteStep={5} 
          />
        </div>

        <div>
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>CAPTION</Text>
          <TextArea 
            rows={4} 
            placeholder="Write your post caption..." 
            value={content}
            onChange={(e) => setContent(e.target.value)} 
            showCount 
            maxLength={2200} 
          />
        </div>

        <div>
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>MEDIA</Text>

          {isEdit && initialData.mediaUrl && !file && (
            <div style={{ marginBottom: 12, borderRadius: 8, overflow: "hidden", border: "1px solid #f0f0f0", maxHeight: 160 }}>
              {initialData.mediaType === "video" ? (
                <video src={initialData.mediaUrl} style={{ maxHeight: 160, width: "100%" }} controls />
              ) : (
                <img src={initialData.mediaUrl} alt="" style={{ maxHeight: 160, width: "100%", objectFit: "contain" }} />
              )}
            </div>
          )}

          <Upload beforeUpload={() => false} onChange={handleFileChange} maxCount={1} accept="image/*,video/*" showUploadList={false}>
            <Button icon={fileType === "video" ? <VideoCameraOutlined /> : <PictureOutlined />} block style={{ height: 44 }}>
              {file ? "Change File" : isEdit ? "Replace Media (optional)" : "Select Image or Video"}
            </Button>
          </Upload>

          {file && (
            <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, background: "#f5f5f5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 13 }}>{file.name}</Text>
              <Button danger size="small" type="text" onClick={() => { setFile(null); setFileType(null); }}>Remove</Button>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <Button block size="large" onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={saving} onClick={handleSave} size="large" block disabled={!content.trim() || (!isEdit && !file)}>
            {isEdit ? "Save Changes" : `Schedule for ${selectedDate.format("MMM D [at] HH:mm")}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ====================== MAIN COMPONENT ======================
const FacebookPostsManager = () => {
  const [posts, setPosts] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editPost, setEditPost] = useState(null);
  const [previewPost, setPreviewPost] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const user = useSelector((state) => state.auth.user);
  const companyId = user?.company_id;

  const fetchData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const companyData = await companyService.getCompanyById(companyId);
      setCompany(companyData);

      const { data } = await axios.get(`${API}/api/scheduled-posts`, {
        params: { company_id: companyId }
      });
      setPosts(data.posts || []);
    } catch (err) {
      message.error("Failed to load scheduled posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const stats = {
    total: posts.length,
    scheduled: posts.filter(p => p.status === "scheduled").length,
    published: posts.filter(p => p.status === "published").length,
    failed: posts.filter(p => p.status === "failed").length,
  };

  const handleCreate = async (payload) => {
    await axios.post(`${API}/api/schedule-post`, payload);
    message.success("Post scheduled successfully!");
    fetchData();
  };

  const handleEdit = async (payload) => {
    if (!editPost?.id) return;
    await axios.put(`${API}/api/scheduled-posts/${editPost.id}`, payload);
    message.success("Post updated successfully");
    setEditPost(null);
    setFormOpen(false);
    fetchData();
  };

  const handleDelete = async (postId) => {
    setDeleting(postId);
    try {
      await axios.delete(`${API}/api/delete-post`, {
        data: { scheduledPostId: postId, company_id: companyId }
      });
      message.success("Post deleted successfully");
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.error || "Failed to delete post");
    } finally {
      setDeleting(null);
    }
  };

  const openEdit = (row) => {
    if (row.status !== "scheduled") {
      return message.warning("Only scheduled posts can be edited");
    }
    setEditPost(row);
    setFormOpen(true);
  };

  const columns = [
    {
      title: "Media", dataIndex: "mediaUrl", width: 72,
      render: (url, row) => (
        <div onClick={() => setPreviewPost(row)} style={{
          width: 56, height: 56, borderRadius: 8, overflow: "hidden",
          cursor: "pointer", border: "1px solid #f0f0f0",
          background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          {row.mediaType === "video" ? (
            <div style={{ position: "relative", width: "100%", height: "100%" }}>
              <video src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <PlayCircleOutlined style={{ position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%,-50%)", fontSize: 20, color: "#fff" }} />
            </div>
          ) : (
            <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          )}
        </div>
      ),
    },
    {
      title: "Caption", dataIndex: "message", ellipsis: true,
      render: (msg) => <Text style={{ fontSize: 14 }}>{msg?.length > 80 ? msg.slice(0, 80) + "…" : msg}</Text>,
    },
    {
      title: "Platforms", width: 100,
      render: (_, row) => (
        <Space size={6}>
          <Tooltip title={row.facebookPostId ? `FB: ${row.facebookPostId}` : "Facebook"}>
            <FacebookOutlined style={{ fontSize: 18, color: row.facebookPostId ? "#1877f2" : "#bbb" }} />
          </Tooltip>
          <Tooltip title={row.instagramPostId ? `IG: ${row.instagramPostId}` : "Instagram"}>
            <InstagramOutlined style={{ fontSize: 18, color: row.instagramPostId ? "#e1306c" : "#bbb" }} />
          </Tooltip>
        </Space>
      ),
    },
{
      title: "Scheduled",
      dataIndex: "scheduledTime",
      width: 170,
      sorter: (a, b) => (a.scheduledTime?.seconds || 0) - (b.scheduledTime?.seconds || 0),
      render: (t) => {
        const date = toDayjs(t);
        if (!date) return "—";
        return (
          <div>
            <Text style={{ fontSize: 13, display: "block" }}>{date.format("MMM D, YYYY")}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{date.format("HH:mm")} · {date.fromNow()}</Text>
          </div>
        );
      },
    },
    {
      title: "Status", dataIndex: "status", width: 125,
      filters: Object.entries(STATUS).map(([k, v]) => ({ text: v.label, value: k })),
      onFilter: (val, row) => row.status === val,
      render: (s) => <StatusBadge status={s} />,
    },
{
      title: "Actions",
      width: 140,
   render: (_, row) => {
  const canEdit = row.status === "scheduled";
  const canDelete = row.status === "scheduled"; // 👈 same rule

  return (
    <Space size={4}>
      <Tooltip title="Preview">
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => setPreviewPost(row)}
        />
      </Tooltip>

      <Tooltip title={canEdit ? "Edit Post" : "Cannot edit published post"}>
        <Button
          type="text"
          icon={<EditOutlined />}
          disabled={!canEdit}
          onClick={() => openEdit(row)}
          style={{ color: canEdit ? "#1677ff" : "#d9d9d9" }}
        />
      </Tooltip>

      <Popconfirm
        title={
          canDelete
            ? "Delete this post?"
            : "Published posts cannot be deleted"
        }
        description={
          canDelete
            ? "This action cannot be undone."
            : "This post is locked after publishing."
        }
        onConfirm={() => canDelete && handleDelete(row.id)}
        okText="Delete"
        okButtonProps={{ danger: true }}
        disabled={!canDelete}   // 👈 important
      >
        <Tooltip title={canDelete ? "Delete" : "Locked"}>
          <Button
            type="text"
            icon={<DeleteOutlined />}
            danger
            disabled={!canDelete}
            loading={deleting === row.id}
          />
        </Tooltip>
      </Popconfirm>
    </Space>
  );
}
    },
  ];

  if (!companyId) {
    return <Result status="warning" title="No Company Found" subTitle="Please create or join a company first." />;
  }
  
  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>

      {/* Header with Company Info */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar 
            src={company?.logo} 
            size={52} 
            shape="square" 
            style={{ border: "1px solid #f0f0f0" }}
          />
          <div>
            <Title level={3} style={{ margin: 0 }}>
              {company?.name || "My Company"}
            </Title>
            <Text type="secondary">Post Scheduler • Facebook & Instagram</Text>
          </div>
        </div>

        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchData} 
            loading={loading}
          >
            Refresh
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => { 
              setEditPost(null); 
              setFormOpen(true); 
            }}
          >
            New Scheduled Post
          </Button>
        </Space>
      </div>

      {/* Statistics Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total Posts",  value: stats.total,     color: "#595959", bg: "#fafafa" },
          { label: "Scheduled",    value: stats.scheduled, color: "#1677ff", bg: "#e6f4ff" },
          { label: "Published",    value: stats.published, color: "#52c41a", bg: "#f6ffed" },
          { label: "Failed",       value: stats.failed,    color: "#ff4d4f", bg: "#fff2f0" },
        ].map(({ label, value, color, bg }) => (
          <div 
            key={label} 
            style={{ 
              background: bg, 
              border: `1px solid ${color}20`, 
              borderRadius: 12, 
              padding: "16px 20px" 
            }}
          >
            <Text style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>
              {label}
            </Text>
            <Text style={{ fontSize: 28, fontWeight: 600, color }}>
              {value}
            </Text>
          </div>
        ))}
      </div>

      {/* Scheduled Posts Table */}
      <Card 
        bodyStyle={{ padding: 0 }} 
        style={{ borderRadius: 12, border: "1px solid #f0f0f0" }}
      >
        <Table 
          columns={columns} 
          dataSource={posts} 
          rowKey="id" 
          loading={loading}
          pagination={{ 
            pageSize: 10, 
            showSizeChanger: false, 
            showTotal: (total) => `${total} posts` 
          }}
          style={{ borderRadius: 12, overflow: "hidden" }} 
          rowClassName={() => "post-row"}
          locale={{
            emptyText: (
              <div style={{ padding: 60, textAlign: "center" }}>
                <CalendarOutlined style={{ fontSize: 48, color: "#d9d9d9", marginBottom: 16 }} />
                <Text type="secondary" style={{ fontSize: 16 }}>No scheduled posts yet</Text>
              </div>
            )
          }}
        />
      </Card>

      {/* Create / Edit Modal */}
      <PostFormModal
        open={formOpen}
        onClose={() => { 
          setFormOpen(false); 
          setEditPost(null); 
        }}
        onSave={editPost ? handleEdit : handleCreate}
        initialData={editPost}
        company={company}
      />

      {/* Preview Modal with Fixed Date Handling */}
      <Modal 
        open={!!previewPost} 
        onCancel={() => setPreviewPost(null)}
        footer={null} 
        width={480} 
        title="Post Preview"
        bodyStyle={{ padding: 0 }}
      >
        {previewPost && (
          <div>
            {/* Media Preview */}
            <div style={{ 
              background: "#000", 
              maxHeight: 340, 
              overflow: "hidden",
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center" 
            }}>
              {previewPost.mediaType === "video" ? (
                <video 
                  src={previewPost.mediaUrl} 
                  controls 
                  style={{ width: "100%", maxHeight: 340 }} 
                />
              ) : (
                <img 
                  src={previewPost.mediaUrl} 
                  alt="preview" 
                  style={{ width: "100%", maxHeight: 340, objectFit: "contain" }} 
                />
              )}
            </div>

            {/* Post Content */}
            <div style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <StatusBadge status={previewPost.status} />
                <Space size={12}>
                  <Tooltip title={previewPost.facebookPostId ? "Posted on Facebook" : "Not posted on Facebook yet"}>
                    <FacebookOutlined style={{ fontSize: 20, color: previewPost.facebookPostId ? "#1877f2" : "#bbb" }} />
                  </Tooltip>
                  <Tooltip title={previewPost.instagramPostId ? "Posted on Instagram" : "Not posted on Instagram yet"}>
                    <InstagramOutlined style={{ fontSize: 20, color: previewPost.instagramPostId ? "#e1306c" : "#bbb" }} />
                  </Tooltip>
                </Space>
              </div>

              <Text style={{ display: "block", fontSize: 15.5, lineHeight: 1.6, marginBottom: 20 }}>
                {previewPost.message}
              </Text>

              <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 16 }}>
                {[
                  { 
                    label: "Scheduled for", 
                    value: toDayjs(previewPost.scheduledTime)?.format("MMMM D, YYYY [at] HH:mm") || "—" 
                  },
                  { 
                    label: "Created at", 
                    value: toDayjs(previewPost.createdAt)?.format("MMMM D, YYYY [at] HH:mm") || "—" 
                  },
                  ...(previewPost.postedAt ? [{ 
                    label: "Published at", 
                    value: toDayjs(previewPost.postedAt)?.format("MMMM D, YYYY [at] HH:mm") 
                  }] : []),
                ].map(({ label, value }) => (
                  <div key={label} style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    padding: "7px 0", 
                    borderBottom: "1px solid #fafafa" 
                  }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>{label}</Text>
                    <Text style={{ fontSize: 13 }}>{value}</Text>
                  </div>
                ))}
              </div>

              {previewPost.status === "scheduled" && (
                <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                  <Button 
                    icon={<EditOutlined />} 
                    block 
                    onClick={() => { 
                      openEdit(previewPost); 
                      setPreviewPost(null); 
                    }}
                  >
                    Edit Post
                  </Button>
                  <Popconfirm 
                    title="Delete this post?" 
                    okText="Delete" 
                    okButtonProps={{ danger: true }}
                    onConfirm={() => { 
                      handleDelete(previewPost.id); 
                      setPreviewPost(null); 
                    }}
                  >
                    <Button danger icon={<DeleteOutlined />} block>Delete</Button>
                  </Popconfirm>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <style>{`
        .post-row:hover td { background: #fafafa !important; }
        .ant-table-thead > tr > th { 
          background: #fafafa !important; 
          font-size: 12px; 
          font-weight: 600;
          text-transform: uppercase; 
          letter-spacing: 0.5px; 
          color: #888 !important; 
        }
      `}</style>
    </div>
  );
};

export default FacebookPostsManager;