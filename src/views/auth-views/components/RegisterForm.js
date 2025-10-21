import React, { useEffect, useState, useRef } from 'react'
import { connect } from 'react-redux'
import { LockOutlined, MailOutlined, UserOutlined, PhoneOutlined, GlobalOutlined } from '@ant-design/icons';
import { Button, Form, Input, Alert, Select, Row, Col, Space } from "antd";
import { signUp, showAuthMessage, showLoading, hideAuthMessage } from 'store/slices/authSlice';
import { useNavigate } from 'react-router-dom'
import { motion } from "framer-motion"
// @ts-nocheck
import countryList from 'react-select-country-list'
import { UserRoles } from 'models/UserModel'

// Get all countries for the dropdown
const countries = countryList().getData().map(country => ({
	value: country.value,
	label: country.label,
	// Phone codes from a reliable source
	phoneCode: getCountryPhoneCode(country.value)
}))

// Function to get country phone code
function getCountryPhoneCode(countryCode) {
	// Common country codes - this could be expanded to a more complete list
	const phoneCodes = {
		US: '+1',
		CA: '+1',
		GB: '+44',
		FR: '+33',
		DE: '+49',
		IT: '+39',
		ES: '+34',
		JP: '+81',
		CN: '+86',
		IN: '+91',
		BR: '+55',
		RU: '+7',
		AU: '+61',
		TN: '+216',
		// Add more as needed
	};
	
	return phoneCodes[countryCode] || '+0';
}

const rules = {
	firstname: [
		{
			required: true,
			message: 'Please input your first name'
		}
	],
	lastname: [
		{
			required: true,
			message: 'Please input your last name'
		}
	],
	country: [
		{
			required: true,
			message: 'Please select your country'
		}
	],
	phoneNumber: [
		{
			required: false,
			message: 'Please input your phone number'
		},
		{
			pattern: /^[0-9\s()\-]*$/,
			message: 'Please enter a valid phone number (without country code)'
		}
	],
	email: [
		{ 
			required: true,
			message: 'Please input your email address'
		},
		{ 
			validator: (_, value) => {
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				if (!value || emailRegex.test(value)) {
					return Promise.resolve();
				}
				return Promise.reject('Please enter a valid email!');
			}
		}
	],
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
	confirm: [
		{ 
			required: true,
			message: 'Please confirm your password!'
		},
		({ getFieldValue }) => ({
			validator(_, value) {
				if (!value || getFieldValue('password') === value) {
					return Promise.resolve();
				}
				return Promise.reject('Passwords do not match!');
			},
		})
	]
}

/**
 * RegisterForm component for user signup
 * @param {Object} props Component props
 * @returns {JSX.Element} RegisterForm component
 */
export const RegisterForm = (props) => {

	const { signUp, showLoading, token, loading, redirect, message, showMessage, hideAuthMessage, allowRedirect = true } = props
	const [form] = Form.useForm();
	const [selectedCountry, setSelectedCountry] = useState('');
	const [phoneCode, setPhoneCode] = useState('');

	const navigate = useNavigate();

	const onSignUp = () => {
    	form.validateFields().then(values => {
			// Format phone number with country code if phone number exists
			if (values.phoneNumber && phoneCode) {
				values.phoneNumber = `${phoneCode} ${values.phoneNumber}`;
			}

			// Add additional required fields from the user model
			values.Role = UserRoles.CEO; // Default role
			values.isVerified = false;
			values.isBanned = false;
			values.Notification = false;
			values.forcePasswordReset = false;

			showLoading();
			signUp(values);
		}).catch(info => {
			console.log('Validate Failed:', info);
		});
	}

	// Update phone code when country changes
	const handleCountryChange = (value) => {
		setSelectedCountry(value);
		const country = countries.find(c => c.value === value);
		if (country) {
			setPhoneCode(country.phoneCode);
			form.setFieldsValue({ country: value });
		}
	}

	// Create a ref for the navigation timer to prevent throttling
	const navigationTimerRef = useRef(null);

	useEffect(() => {
		// Clear any existing navigation timer
		if (navigationTimerRef.current) {
			clearTimeout(navigationTimerRef.current);
			navigationTimerRef.current = null;
		}

		// Handle navigation with debounce
		if (token !== null && allowRedirect) {
			// Debounce navigation to prevent throttling
			navigationTimerRef.current = setTimeout(() => {
				navigate(redirect);
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
	}, [token, redirect, showMessage, hideAuthMessage, navigate, allowRedirect]);
	
	return (
		<>
			<motion.div 
				initial={{ opacity: 0, marginBottom: 0 }} 
				animate={{ 
					opacity: showMessage ? 1 : 0,
					marginBottom: showMessage ? 20 : 0 
				}}> 
				<Alert type="error" showIcon message={message}></Alert>
			</motion.div>
			<Form 
			form={form} 
			layout="vertical" 
			name="register-form" 
			onFinish={onSignUp}
			className="mt-4 mb-4"
		>
			<Row gutter={16}>
				<Col xs={24} sm={12}>
					<Form.Item 
						name="firstname" 
						label="First Name" 
						rules={rules.firstname}
						hasFeedback
					>
						<Input prefix={<UserOutlined className="text-primary" />}/>
					</Form.Item>
				</Col>
				<Col xs={24} sm={12}>
					<Form.Item 
						name="lastname" 
						label="Last Name" 
						rules={rules.lastname}
						hasFeedback
					>
						<Input prefix={<UserOutlined className="text-primary" />}/>
					</Form.Item>
				</Col>
			</Row>
			
			<Row gutter={16}>
				<Col xs={24} sm={12}>
					<Form.Item 
						name="country" 
						label="Country" 
						rules={rules.country}
						hasFeedback
					>
						<Select
							showSearch
							placeholder="Select your country"
							options={countries}
							filterOption={(input, option) =>
								(option?.label?.toString() || '').toLowerCase().indexOf(input.toLowerCase()) >= 0
							}
							onChange={handleCountryChange}
							prefixCls="ant-select"
						>
						</Select>
					</Form.Item>
				</Col>
				<Col xs={24} sm={12}>
					<Form.Item 
						name="phoneNumber" 
						label="Phone Number" 
						rules={rules.phoneNumber}
						hasFeedback
					>
						<Input 
							addonBefore={phoneCode || '+0'} 
							placeholder="Phone number without country code"
						/>
					</Form.Item>
				</Col>
			</Row>
			
			<Form.Item 
				name="email" 
				label="Email" 
				rules={rules.email}
				hasFeedback
			>
				<Input prefix={<MailOutlined className="text-primary" />}/>
			</Form.Item>
			
			<Row gutter={16}>
				<Col xs={24} sm={12}>
					<Form.Item 
						name="password" 
						label="Password" 
						rules={rules.password}
						hasFeedback
					>
						<Input.Password prefix={<LockOutlined className="text-primary" />}/>
					</Form.Item>
				</Col>
				<Col xs={24} sm={12}>
					<Form.Item 
						name="confirm" 
						label="Confirm Password" 
						rules={rules.confirm}
						hasFeedback
					>
						<Input.Password prefix={<LockOutlined className="text-primary" />}/>
					</Form.Item>
				</Col>
			</Row>
			
			<Form.Item className="mt-4">
				<Button type="primary" htmlType="submit" block loading={loading}>
					Sign Up
				</Button>
			</Form.Item>
		</Form>
		</>
	)
}

const mapStateToProps = ({auth}) => {
	const { loading, message, showMessage, token, redirect } = auth;
  return { loading, message, showMessage, token, redirect }
}

const mapDispatchToProps = {
	signUp,
	showAuthMessage,
	hideAuthMessage,
	showLoading
}

export default connect(mapStateToProps, mapDispatchToProps)(RegisterForm)
