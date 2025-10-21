import {
  DashboardOutlined,
  EnvironmentOutlined,
  CheckSquareOutlined,
  UserOutlined,
  TeamOutlined,
  FundOutlined,
  HomeOutlined,
  FileTextOutlined,
  HistoryOutlined,
  BankOutlined,
  ShopOutlined,
  AppstoreOutlined,
  ApartmentOutlined,
  SettingOutlined,
  SolutionOutlined,
  ClockCircleOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { APP_PREFIX_PATH } from 'configs/AppConfig';
import { UserRoles } from 'models/UserModel';

/**
 * Navigation configuration for CEO and HR roles
 */
const ceoHrNavigation = [
  // Management Dashboard
  {
    key: 'dashboards',
    path: `${APP_PREFIX_PATH}/dashboards`,
    title: 'Dashboard',
    icon: DashboardOutlined,
    breadcrumb: false,
    submenu: []
  },

  // Company Management
  {
    key: 'company',
    title: 'Company',
    icon: ApartmentOutlined,
    breadcrumb: true,
    submenu: [
      {
        key: 'my-company',
        path: `${APP_PREFIX_PATH}/my-company`,
        title: 'Profile & Settings',
        icon: BankOutlined,
        breadcrumb: true,
        submenu: []
      },
      {
        key: 'sellers',
        path: `${APP_PREFIX_PATH}/sellers`,
        title: 'Team Members',
        icon: ShopOutlined,
        breadcrumb: true,
        submenu: []
      },
      {
        key: 'invoices',
        path: `${APP_PREFIX_PATH}/invoices`,
        title: 'Invoices & Billing',
        icon: FileTextOutlined,
        breadcrumb: true,
        submenu: []
      },
      {
        key: 'employees',
        path: `${APP_PREFIX_PATH}/company/employees`,
        title: 'Employees',
        icon: TeamOutlined,
        breadcrumb: true,
        submenu: []
      },
      {
        key: 'meetings',
        path: `${APP_PREFIX_PATH}/company/meetings`,
        title: 'Meetings',
        icon: FileTextOutlined,
        breadcrumb: true,
        submenu: []
      }
    ]
  },
  // HR Management
  {
    key: 'hr',
    title: 'HR',
    icon: TeamOutlined, // You can choose an appropriate icon for HR
    breadcrumb: true,
    submenu: [
        {
        key: 'invoices',
        path: `${APP_PREFIX_PATH}/invoices`,
        title: 'Invoices & Billing',
        icon: FileTextOutlined,
        breadcrumb: true,
        submenu: []
      },
      {
        key: 'applications',
        path: `${APP_PREFIX_PATH}/applications`,
        title: 'C.V Applications',
        icon: SolutionOutlined,
        breadcrumb: true,
        submenu: []
      },
      {
        key: 'payroll',
        path: `${APP_PREFIX_PATH}/payroll`,
        title: 'Payroll',
        icon: DollarOutlined,
        breadcrumb: true,
        submenu: []
      },
      {
        key: 'attendees',
        path: `${APP_PREFIX_PATH}/attendees`,
        title: 'Attendees',
        icon: ClockCircleOutlined,
        breadcrumb: true,
        submenu: []
      }
    ]
  },

  // CRM Tools
  {
    key: 'crm',
    title: 'CRM',
    icon: AppstoreOutlined,
    breadcrumb: true,
    submenu: [
      {
        key: 'contacts',
        path: `${APP_PREFIX_PATH}/contacts`,
        title: 'Contacts',
        icon: UserOutlined,
        breadcrumb: true,
        submenu: []
      },
      {
        key: 'leads',
        path: `${APP_PREFIX_PATH}/leads`,
        title: 'Leads',
        icon: TeamOutlined,
        breadcrumb: true,
        submenu: []
      },
      {
        key: 'deals',
        path: `${APP_PREFIX_PATH}/deals`,
        title: 'Deals',
        icon: FundOutlined,
        breadcrumb: true,
        submenu: []
      },
      {
        key: 'properties',
        path: `${APP_PREFIX_PATH}/properties`,
        title: 'Properties',
        icon: HomeOutlined,
        breadcrumb: true,
        submenu: []
      },
    ]
  },

  // Tools
  {
    key: 'tools',
    title: 'Tools',
    icon: SettingOutlined,
    breadcrumb: true,
    submenu: [
      {
        key: 'property-scanner',
        path: `${APP_PREFIX_PATH}/property-scanner`,
        title: 'Property Scanner',
        icon: EnvironmentOutlined,
        breadcrumb: true,
        submenu: []
      },
      {
        key: 'todo',
        path: `${APP_PREFIX_PATH}/todo`,
        title: 'To Do',
        icon: CheckSquareOutlined,
        breadcrumb: true,
        submenu: []
      },
      {
        key: 'history',
        path: `${APP_PREFIX_PATH}/history`,
        title: 'History',
        icon: HistoryOutlined,
        breadcrumb: true,
        submenu: []
      }
    ]
  }
];

/**
 * Navigation configuration for Seller role
 */
const sellerNavigation = [
  // Seller Dashboard
  {
    key: 'seller.dashboard',
    path: `${APP_PREFIX_PATH}/seller/dashboard`,
    title: 'Dashboard',
    icon: DashboardOutlined,
    breadcrumb: false,
    submenu: []
  },

  // CRM Tools for Sellers
  {
    key: 'seller.crm',
    title: 'CRM',
    icon: AppstoreOutlined,
    breadcrumb: true,
    submenu: [
      {
        key: 'seller.contacts',
        path: `${APP_PREFIX_PATH}/seller/contacts`,
        title: 'Contacts',
        icon: UserOutlined,
        breadcrumb: true,
        submenu: []
      },
      {
        key: 'seller.leads',
        path: `${APP_PREFIX_PATH}/seller/leads`,
        title: 'Leads',
        icon: TeamOutlined,
        breadcrumb: true,
        submenu: []
      },
      {
        key: 'seller.deals',
        path: `${APP_PREFIX_PATH}/seller/deals`,
        title: 'Deals',
        icon: FundOutlined,
        breadcrumb: true,
        submenu: []
      },
      {
        key: 'seller.properties',
        path: `${APP_PREFIX_PATH}/seller/properties`,
        title: 'Properties',
        icon: HomeOutlined,
        breadcrumb: true,
        submenu: []
      },
    ]
  },

  // Tools for Sellers
  {
    key: 'seller.tools',
    title: 'Tools',
    icon: SettingOutlined,
    breadcrumb: true,
    submenu: [
      {
        key: 'seller.property-scanner',
        path: `${APP_PREFIX_PATH}/property-scanner`,
        title: 'Property Scanner',
        icon: EnvironmentOutlined,
        breadcrumb: true,
        submenu: []
      },
      {
        key: 'seller.todo',
        path: `${APP_PREFIX_PATH}/seller/todo`,
        title: 'To Do',
        icon: CheckSquareOutlined,
        breadcrumb: true,
        submenu: []
      }
    ]
  },

  // Financial for Sellers
  {
    key: 'seller.financial',
    title: 'Financial',
    icon: FileTextOutlined,
    breadcrumb: true,
    submenu: [
      {
        key: 'seller.invoices',
        path: `${APP_PREFIX_PATH}/seller/invoices`,
        title: 'Invoices',
        icon: FileTextOutlined,
        breadcrumb: true,
        submenu: []
      }
    ]
  }
];

/**
 * Get navigation configuration based on user role
 * @param {string} role - User role from UserRoles enum
 * @returns {Array} - Navigation configuration array
 */
export const getNavigation = (role) => {
  switch (role) {
    case UserRoles.CEO:
    case UserRoles.HR:
      return ceoHrNavigation;
    case UserRoles.SELLER:
      return sellerNavigation;
    case UserRoles.SUPER_ADMIN:
      return [...ceoHrNavigation]; // SuperAdmin sees everything
    default:
      return sellerNavigation; // Default to seller for unknown roles
  }
};

export default getNavigation;
