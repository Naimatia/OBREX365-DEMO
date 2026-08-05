// components/NavCompanySwitcher.js
import React, { useState, useEffect } from 'react';
import { CheckOutlined, SwapOutlined } from '@ant-design/icons';
import { Dropdown, Modal, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { signOut as reduxSignOut } from 'store/slices/authSlice';
import NavItem from './NavItem';
import { SPACER } from 'constants/ThemeConstant';
import Flex from 'components/shared-components/Flex';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from 'configs/FirebaseConfig';
import UserService from 'services/firebase/UserService';
import { baseTheme } from 'configs/ThemeConfig';

const formatDate = (timestamp) => {
  if (!timestamp || !timestamp.toDate) return '';
  const date = timestamp.toDate();
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) + ' UTC+' + (-date.getTimezoneOffset() / 60);
};

const CompanyMenuItem = ({ company, isActive, onClick }) => {
  return (
    <Flex
      alignItems="center"
      justifyContent="space-between"
      style={{ gap: SPACER[4], cursor: 'pointer' }}
      onClick={onClick}
    >
      <Flex alignItems="center" style={{ gap: SPACER[2] }}>
        {company.logo ? (
          <img src={company.logo} alt={company.name} style={{ width: 20, height: 20, borderRadius: '50%' }} />
        ) : (
          <div style={{ width: 20, height: 20, background: '#eee', borderRadius: '50%' }} />
        )}
        <div>
          <div style={{ fontWeight: 'normal' }}>{company.name}</div>
          <div style={{ fontSize: '11px', color: '#888' }}>{formatDate(company.createdAt)}</div>
        </div>
      </Flex>
      {isActive && <CheckOutlined style={{ color: baseTheme.colorSuccess }} />}
    </Flex>
  );
};

const NavCompanySwitcher = ({ mode }) => {
  const [companies, setCompanies] = useState([]);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [loading, setLoading] = useState(false);

  const user = useSelector(state => state.auth.user);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Check if user is the joker account
  const isJoker = user?.isJoker === true || (user?.isOwner === true && user?.Role === 'CEO');

  // Load companies only if joker
  useEffect(() => {
    if (!user || !isJoker) {
      setCompanies([]);
      setCurrentCompany(null);
      return;
    }

    const loadCompanies = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'companies'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setCompanies(list);

        const companyId = user.company_id || user.companyId;
        const match = list.find(c => c.id === companyId);
        setCurrentCompany(match || null);
      } catch (err) {
        console.error('Failed to load companies:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCompanies();
  }, [user, isJoker]);

  const confirmSwitch = (company) => {
    Modal.confirm({
      title: `Switch to ${company.name}?`,
      content: (
        <span>
          Your <strong>Company</strong> will be updated.<br />
          You will be <strong>signed out</strong> and taken to the login page.
        </span>
      ),
      okText: 'Yes, Switch & Sign Out',
      cancelText: 'Cancel',
      centered: true,
      icon: <SwapOutlined />,
      onOk: async () => {
        try {
          message.loading('Updating company...', 1.5);

          // Update company_id for joker account
          await UserService.changeUserCompanyId(user.id || user.uid, company.id);
          
          // Sign out
          await UserService.signOut();
          dispatch(reduxSignOut());
          localStorage.removeItem('user');

          message.destroy();
          message.success('Company updated. Redirecting to login…', 2);

          setTimeout(() => {
            navigate('/auth/login', { replace: true });
          }, 500);
        } catch (err) {
          message.destroy();
          message.error('Switch failed: ' + err.message);
        }
      },
    });
  };

  const menuItems = companies.map(company => ({
    key: company.id,
    label: (
      <CompanyMenuItem
        company={company}
        isActive={currentCompany?.id === company.id}
        onClick={() => confirmSwitch(company)}
      />
    ),
  }));

  // Only show for joker account
  if (!isJoker) return null;

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={['click']}
      disabled={loading || companies.length === 0}
      placement="bottomRight"
    >
      <NavItem mode={mode}>
        <SwapOutlined className="nav-icon mr-0" style={{ fontSize: '18px' }} />
      </NavItem>
    </Dropdown>
  );
};

export default NavCompanySwitcher;