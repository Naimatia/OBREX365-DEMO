import React, { useEffect, useRef, useState } from 'react';
import { connect, useSelector, useDispatch } from 'react-redux';
import { Button, Form, Input, Alert } from 'antd';
import { MailOutlined, LockOutlined, StopOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';
import { signIn, showLoading, showAuthMessage, hideAuthMessage, forcePasswordReset } from 'store/slices/authSlice';
import { useNavigate } from 'react-router-dom'
import { motion } from "framer-motion"
import ForcePasswordResetModal from 'components/shared-components/ForcePasswordResetModal';
import ResetPasswordModal from 'components/shared-components/ResetPasswordModal';
import { UserRoles } from 'models/UserModel';

export const LoginForm = props => {

	const navigate = useNavigate();
	const dispatch = useDispatch();

	// Local state for force reset modal
	const [resetError, setResetError] = useState(null);
	const [loginError, setLoginError] = useState(null);

	// Local state for reset password modal
	const [resetModalVisible, setResetModalVisible] = useState(false);

	const {
		showForgetPassword,
		onForgetPasswordClick,
		loading,
		redirect,
		showMessage,
		message,
		showLoading,
		hideAuthMessage,
		signIn,
		token,
		forcePasswordReset: needsForceReset,
		pendingUser,
		allowRedirect = true
	} = props

	const user = useSelector(state => state.auth.user);

	const onLogin = values => {
		showLoading()
		setLoginError(null); // Clear any previous errors
		setResetError(null);
		signIn(values);
	};

	const salesRoles = [
		UserRoles.SELLER,
		UserRoles.SALES_EXECUTIVE,
		UserRoles.AGENT,
		UserRoles.TEAM_LEADER,
		UserRoles.SALES_MANAGER,
		UserRoles.OFF_PLAN_SALES,
		UserRoles.READY_TO_MOVE_SALES
	];

	// Handle force password reset
	const handleForcePasswordReset = async (newPassword) => {
		setResetError(null);
		try {
			console.log('🔄 Handling force password reset for user:', pendingUser?.email);

			const result = await dispatch(forcePasswordReset({
				userId: pendingUser?.id,
				userEmail: pendingUser?.email,
				newPassword: newPassword
			})).unwrap();

			console.log('✅ Force password reset successful:', result);

		} catch (error) {
			console.error('❌ Force password reset failed:', error);
			setResetError(typeof error === 'string' ? error : 'An error occurred during password reset');
		}
	};

	// Create navigation timer ref to prevent throttling
	const navigationTimerRef = useRef(null);

	// ✅ Check for ban error in the auth message
	useEffect(() => {
		if (showMessage && message) {
			// Check if the error message indicates a banned account
			if (message.toLowerCase().includes('banned') || message.toLowerCase().includes('ban')) {
				setLoginError('⛔ Your account has been banned. Please contact your administrator.');
			} else {
				setLoginError(null);
			}
		}
	}, [showMessage, message]);

	useEffect(() => {
		// Clear any pending navigation
		if (navigationTimerRef.current) {
			clearTimeout(navigationTimerRef.current);
			navigationTimerRef.current = null;
		}

		// Handle navigation with debounce - only if NOT in force reset mode
		if (token !== null && allowRedirect && !needsForceReset) {
			// For sellers, force correct redirect regardless of what's in props
			const userRole = user?.Role || user?.role;
			let finalRedirect = redirect;

			if (salesRoles.includes(userRole)) {
				finalRedirect = '/app/seller/dashboard';
				console.log('🔧 LoginForm - FORCING seller redirect to:', finalRedirect);
			}

			// Debounce navigation to prevent throttling
			navigationTimerRef.current = setTimeout(() => {
				console.log('🔍 LoginForm - Auth redirect value:', redirect);
				console.log('🔍 LoginForm - User role:', userRole);
				console.log('🔍 LoginForm - Final redirect destination:', finalRedirect);
				navigate(finalRedirect);
			}, 100);
		}

		// Handle message timeout
		if (showMessage) {
			const timer = setTimeout(() => hideAuthMessage(), 3000);
			return () => {
				clearTimeout(timer);
			};
		}

		// Cleanup navigation timer
		return () => {
			if (navigationTimerRef.current) {
				clearTimeout(navigationTimerRef.current);
			}
		};
	}, [token, redirect, showMessage, hideAuthMessage, navigate, allowRedirect, needsForceReset]);

	return (
		<>
			{/* ✅ Banned Account Alert - Shows prominently */}
			{loginError && (
				<motion.div
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					style={{ marginBottom: 20 }}
				>
					<Alert
						type="error"
						showIcon
						icon={<StopOutlined />}
						message={
							<div>
								<div style={{ fontSize: 16, fontWeight: 700, color: '#ff4d4f' }}>
									⛔ Account Banned
								</div>
								<div style={{ fontSize: 14, marginTop: 4 }}>
									{loginError}
								</div>
							</div>
						}
						description={
							<div style={{ marginTop: 8 }}>
								<p style={{ margin: 0, fontSize: 13, color: '#666' }}>
									If you believe this is a mistake, please contact your HR department or system administrator.
								</p>
							</div>
						}
						style={{ 
							borderRadius: 8,
							border: '1px solid #ff4d4f',
							background: '#fff1f0'
						}}
					/>
				</motion.div>
			)}

			{/* Regular error message */}
			{!loginError && (
				<motion.div
					initial={{ opacity: 0, marginBottom: 0 }}
					animate={{
						opacity: showMessage ? 1 : 0,
						marginBottom: showMessage ? 20 : 0
					}}
				>
					<Alert type="error" showIcon message={message}></Alert>
				</motion.div>
			)}

			<Form
				layout="vertical"
				name="login-form"
				onFinish={onLogin}
			>
				<Form.Item
					name="email"
					label="Email"
					rules={[
						{
							required: true,
							message: 'Please input your email',
						},
						{
							type: 'email',
							message: 'Please enter a validate email!'
						}
					]}>
					<Input prefix={<MailOutlined className="text-primary" />} />
				</Form.Item>
				<Form.Item
					name="password"
					label={
						<div className={`${showForgetPassword ? 'd-flex justify-content-between w-100 align-items-center' : ''}`}>
							<span>Password</span>
							{
								showForgetPassword &&
								<span
									onClick={() => setResetModalVisible(true)}
									className="cursor-pointer font-size-sm font-weight-normal text-muted"
								>
									Forget Password?
								</span>
							}
						</div>
					}
					rules={[
						{
							required: true,
							message: 'Please input your password',
						}
					]}
				>
					<Input.Password prefix={<LockOutlined className="text-primary" />} />
				</Form.Item>
				<Form.Item>
					<Button type="primary" htmlType="submit" block loading={loading}>
						Sign In
					</Button>
				</Form.Item>
			</Form>

			{/* Reset Password Modal */}
			<ResetPasswordModal
				visible={resetModalVisible}
				onCancel={() => setResetModalVisible(false)}
			/>

			{/* Force Password Reset Modal */}
			<ForcePasswordResetModal
				visible={needsForceReset && pendingUser}
				user={pendingUser}
				loading={loading}
				error={resetError}
				onPasswordReset={handleForcePasswordReset}
			/>
		</>
	)
}

LoginForm.propTypes = {
	showForgetPassword: PropTypes.bool,
};

LoginForm.defaultProps = {
	showForgetPassword: false
};

const mapStateToProps = ({ auth }) => {
	const { loading, message, showMessage, token, redirect, forcePasswordReset, pendingUser } = auth;
	console.log('🔍 LoginForm mapStateToProps - redirect from auth:', redirect);
	return { loading, message, showMessage, token, redirect, forcePasswordReset, pendingUser }
}

const mapDispatchToProps = {
	signIn,
	showAuthMessage,
	hideAuthMessage,
	showLoading
}

export default connect(mapStateToProps, mapDispatchToProps)(LoginForm)