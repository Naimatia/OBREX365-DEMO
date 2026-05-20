import React, { useState } from 'react';
import {
    Card, Form, Input, Button, Alert, Typography, Space, Divider, Modal, message
} from 'antd';
import { LockOutlined, SaveOutlined, LogoutOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import {
    getAuth, EmailAuthProvider, reauthenticateWithCredential,
    updatePassword, signOut
} from 'firebase/auth';
import axios from 'axios';
import { motion } from 'framer-motion';
import { signOut as reduxSignOut } from 'store/slices/authSlice';

const { Title, Text } = Typography;
const { confirm } = Modal;

const AccountSettings = () => {
    const { user } = useSelector(state => state.auth);
    const dispatch = useDispatch();

    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [revokeLoading, setRevokeLoading] = useState(false);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState(null);

    const auth = getAuth();

    const revokeAllSessions = async (idToken) => {
        const res = await axios.post(
            'https://delete-user-demo.vercel.app/api/revokeSessions',
            {},
            { headers: { Authorization: `Bearer ${idToken}` } }
        );
        return res.data;
    };

    // ====================== CHANGE PASSWORD ======================
    const onFinish = async (values) => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const currentUser = auth.currentUser;
            if (!currentUser?.email) throw new Error("No active user session");

            if (values.newPassword !== values.confirmPassword) {
                throw new Error("New passwords do not match");
            }

            // Re-authenticate
            const credential = EmailAuthProvider.credential(currentUser.email, values.oldPassword);
            await reauthenticateWithCredential(currentUser, credential);

            // Update password (Firebase auto-revokes sessions)
            await updatePassword(currentUser, values.newPassword);

            // Extra manual revoke (safety)
            const idToken = await currentUser.getIdToken(true);
            await revokeAllSessions(idToken);

            setSuccess("Password updated successfully. All devices have been logged out.");

            setTimeout(async () => {
                await signOut(auth);
                dispatch(reduxSignOut());
                window.location.href = '/login';
            }, 1800);

        } catch (err) {
            console.error(err);
            if (err.code === 'auth/wrong-password') setError("Current password is incorrect");
            else if (err.code === 'auth/weak-password') setError("New password is too weak");
            else setError(err.message || "Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    // ====================== MANUAL REVOKE ======================
    const showRevokeConfirm = () => {
        confirm({
            title: 'Sign out from all other devices?',
            icon: <ExclamationCircleOutlined />,
            content: 'This action will log you out from all other devices. Current device stays logged in.',
            okText: 'Yes, sign out all others',
            okType: 'danger',
            onOk: async () => {
                setRevokeLoading(true);
                setError(null);

                try {
                    const currentUser = auth.currentUser;
                    if (!currentUser) throw new Error("No active session");

                    const idToken = await currentUser.getIdToken(true);
                    const data = await revokeAllSessions(idToken);

                    setSuccess(data.message || "All other sessions revoked successfully");
                    message.success("Other devices will be logged out shortly");
                } catch (err) {
                    setError(err.message || "Failed to revoke sessions");
                } finally {
                    setRevokeLoading(false);
                }
            }
        });
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card style={{ maxWidth: 620, margin: '40px auto' }}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div>
                        <Title level={3}>Account Settings</Title>
                        <Text type="secondary">Password & Security</Text>
                    </div>

                    {success && <Alert type="success" message={success} showIcon />}
                    {error && <Alert type="error" message={error} showIcon />}

                    <Divider />

                    <Form form={form} layout="vertical" onFinish={onFinish}>
                        <Form.Item name="oldPassword" label="Current Password" rules={[{ required: true }]}>
                            <Input.Password prefix={<LockOutlined />} />
                        </Form.Item>

                        <Form.Item name="newPassword" label="New Password" rules={[{ required: true, min: 8 }]}>
                            <Input.Password prefix={<LockOutlined />} />
                        </Form.Item>

                        <Form.Item
                            name="confirmPassword"
                            label="Confirm New Password"
                            dependencies={['newPassword']}
                            rules={[
                                { required: true },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                                        return Promise.reject("Passwords do not match");
                                    }
                                })
                            ]}
                        >
                            <Input.Password prefix={<LockOutlined />} />
                        </Form.Item>

                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            icon={<SaveOutlined />}
                            block
                            size="large"
                        >
                            Update Password & Logout All Devices
                        </Button>
                    </Form>

                    <Divider />

                    <Button
                        danger
                        icon={<LogoutOutlined />}
                        loading={revokeLoading}
                        onClick={showRevokeConfirm}
                        block
                        size="large"
                    >
                        Sign Out All Other Devices
                    </Button>
                </Space>
            </Card>
        </motion.div>
    );
};

export default AccountSettings;