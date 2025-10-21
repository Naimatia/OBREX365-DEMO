import React, { useState } from 'react'
import { Card, Row, Col, Form, Input, Button, message, Alert } from "antd";
import { LockOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { resetPassword } from 'store/slices/authSlice';
import IntlMessage from 'components/util-components/IntlMessage';
import { motion } from "framer-motion"
import FirebaseService from 'services/FirebaseService';

const backgroundStyle = {
	backgroundImage: 'url(/img/others/img-17.jpg)',
	backgroundRepeat: 'no-repeat',
	backgroundSize: 'cover'
}

const ResetPassword = () => {
	const [form] = Form.useForm();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState(false);
	
	const dispatch = useDispatch();
	const { user } = useSelector(state => state.auth);

	const onPasswordResetSubmit = async (values) => {
		const { password, confirmPassword } = values;
		
		if (password !== confirmPassword) {
			setError('Passwords do not match');
			return;
		}

		setLoading(true);
		setError('');
		
		try {
			await FirebaseService.updatePassword(password);
			
			// Update the forcePasswordReset flag in Firestore
			await FirebaseService.updateUserForcePasswordReset(user.id, false);
			
			// Dispatch action to update the Redux state
			dispatch(resetPassword());
			
			setSuccess(true);
			message.success('Password updated successfully! You will be redirected to the dashboard.');
			
			// Redirect to dashboard after 3 seconds
			setTimeout(() => {
				window.location.href = '/app/dashboards/default';
			}, 3000);
			
		} catch (err) {
			setError(err.message || 'Failed to update password. Please try again.');
		} finally {
			setLoading(false);
		}
	}

	const rules = {
		password: [
			{ 
				required: true,
				message: 'Please input your password'
			},
			{ 
				min: 8,
				message: 'Password must be at least 8 characters'
			}
		],
		confirmPassword: [
			{ 
				required: true,
				message: 'Please confirm your password'
			},
			({ getFieldValue }) => ({
				validator(_, value) {
					if (!value || getFieldValue('password') === value) {
						return Promise.resolve();
					}
					return Promise.reject('Passwords do not match');
				},
			})
		]
	}

	return (
		<div className="h-100" style={backgroundStyle}>
			<div className="container d-flex flex-column justify-content-center h-100">
				<Row justify="center">
					<Col xs={20} sm={20} md={20} lg={10}>
						<Card>
							<div className="my-4">
								<div className="text-center">
									<h3 className="mt-3 font-weight-bold">Reset Password</h3>
									<p className="mb-4">
										As this is your first login or a password reset has been requested,<br/>
										please set a new password for your account.
									</p>
								</div>
								{error && 
									<Alert
										className="mb-4"
										type="error"
										showIcon
										message={error}
									/>
								}
								{success && 
									<Alert
										className="mb-4"
										type="success"
										showIcon
										message="Password updated successfully! Redirecting to dashboard..."
									/>
								}
								<Form 
									form={form}
									layout="vertical" 
									name="reset-password"
									onFinish={onPasswordResetSubmit}
								>
									<Form.Item 
										name="password" 
										label="New Password" 
										rules={rules.password}
										hasFeedback
									>
										<Input.Password prefix={<LockOutlined className="text-primary" />}/>
									</Form.Item>
									<Form.Item 
										name="confirmPassword" 
										label="Confirm Password" 
										rules={rules.confirmPassword}
										hasFeedback
									>
										<Input.Password prefix={<LockOutlined className="text-primary" />}/>
									</Form.Item>
									<Form.Item>
										<Button type="primary" htmlType="submit" block loading={loading}>
											Reset Password
										</Button>
									</Form.Item>
								</Form>
							</div>
						</Card>
					</Col>
				</Row>
			</div>
		</div>
	)
}

export default ResetPassword
