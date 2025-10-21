import React from 'react';
import { Dropdown, Avatar } from 'antd';
import { useDispatch, useSelector } from 'react-redux'
import { 
	EditOutlined, 
	SettingOutlined, 
	ShopOutlined, 
	QuestionCircleOutlined, 
	LogoutOutlined 
} from '@ant-design/icons';
import NavItem from './NavItem';
import Flex from 'components/shared-components/Flex';
import { signOut } from 'store/slices/authSlice';
import styled from '@emotion/styled';
import { FONT_WEIGHT, MEDIA_QUERIES, SPACER, FONT_SIZES } from 'constants/ThemeConstant'

const Icon = styled.div(() => ({
	fontSize: FONT_SIZES.LG
}))

const Profile = styled.div(() => ({
	display: 'flex',
	alignItems: 'center'
}))

const UserInfo = styled('div')`
	padding-left: ${SPACER[2]};

	@media ${MEDIA_QUERIES.MOBILE} {
		display: none
	}
`

const Name = styled.div(() => ({
	fontWeight: FONT_WEIGHT.SEMIBOLD
}))

const Title = styled.span(() => ({
	opacity: 0.8
}))

const MenuItem = (props) => (
	<Flex as="a" href={props.path} alignItems="center" gap={SPACER[2]}>
		<Icon>{props.icon}</Icon>
		<span>{props.label}</span>
	</Flex>
)

const MenuItemSignOut = (props) => {

	const dispatch = useDispatch();

	const handleSignOut = () => {
		dispatch(signOut())
	}

	return (
		<div onClick={handleSignOut}>
			<Flex alignItems="center" gap={SPACER[2]} >
				<Icon>
					<LogoutOutlined />
				</Icon>
				<span>{props.label}</span>
			</Flex>
		</div>
	)
}

const items = [
	{
		key: 'Edit Profile',
		label: <MenuItem path="/" label="Edit Profile" icon={<EditOutlined />} />,
	},
	{
		key: 'Account Setting',
		label: <MenuItem path="/" label="Account Setting" icon={<SettingOutlined />} />,
	},
	{
		key: 'Account Billing',
		label: <MenuItem path="/" label="Account Billing" icon={<ShopOutlined />} />,
	},
	{
		key: 'Help Center',
		label: <MenuItem path="/" label="Help Center" icon={<QuestionCircleOutlined />} />,
	},
	{
		key: 'Sign Out',
		label: <MenuItemSignOut label="Sign Out" />,
	}
]

export const NavProfile = ({mode}) => {
	// Get user data from Redux store
	const { user } = useSelector(state => state.auth);
	
	// Generate initials for avatar if no photoURL
	const getInitials = (firstname = '', lastname = '') => {
		return `${firstname.charAt(0) || ''}${lastname.charAt(0) || ''}`.toUpperCase();
	}
	
	// Get proper display name
	const getDisplayName = () => {
		if (user?.firstname && user?.lastname) {
			return `${user.firstname} ${user.lastname}`;
		} else if (user?.firstname) {
			return user.firstname;
		} else if (user?.email) {
			return user.email.split('@')[0];
		} else {
			return 'User';
		}
	}
	
	return (
		<Dropdown placement="bottomRight" menu={{items}} trigger={["click"]}>
			<NavItem mode={mode}>
				<Profile>
					{user?.photoURL ? (
						<Avatar src={user.photoURL} />
					) : (
						<Avatar style={{ backgroundColor: '#1890ff' }}>
							{getInitials(user?.firstname, user?.lastname)}
						</Avatar>
					)}
					<UserInfo className="profile-text">
						<Name>{getDisplayName()}</Name>
						<Title>{user?.Role || 'User'}</Title>
					</UserInfo>
				</Profile>
			</NavItem>
		</Dropdown>
	);
}

export default NavProfile
