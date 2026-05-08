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
  DollarOutlined,
  FacebookOutlined,
  GlobalOutlined,
  InstagramOutlined,
  
} from '@ant-design/icons';
import { APP_PREFIX_PATH } from 'configs/AppConfig';
import { UserRoles } from 'models/UserModel';

/**
 * Navigation configuration - only HR Management for HR role
 */
const hrNavigation = [
  // HR Management (only this section for HR)
  // Dashboard for HR
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
        key: 'sellers',
        path: `${APP_PREFIX_PATH}/sellers`,
        title: 'Sales Team Members',
        icon: ShopOutlined,
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
  {
    key: 'hr',
    title: 'HR',
    icon: TeamOutlined,
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
        key: 'property-finance',
        path: `${APP_PREFIX_PATH}/property-finance`,
        title: 'Property Finance',
        icon: DollarOutlined,           
        breadcrumb: true,
        submenu: []
      },
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
 * Navigation configuration for CEO (full access - company + HR + CRM + etc.)
 */
const ceoNavigation = [
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
        title: 'Sales Team Members',
        icon: ShopOutlined,
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

  // HR Management (CEO can see it too)
  {
    key: 'hr',
    title: 'HR',
    icon: TeamOutlined,
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

  {
    key: 'social-media',
    title: 'Social Media',
    icon: GlobalOutlined, // import it
    breadcrumb: true,
    submenu: [
      {
        key: 'facebook',
        path: `${APP_PREFIX_PATH}/social/facebook`,
        title: 'Facebook',
        icon: FacebookOutlined, // import
        breadcrumb: true,
        submenu: []
      },
      {
        key: 'instagram',
        path: `${APP_PREFIX_PATH}/social/instagram`,
        title: 'instagram',
        icon: InstagramOutlined, // import
        breadcrumb: true,
        submenu: []
      },
      {
        key: 'scheduler',
        path: `${APP_PREFIX_PATH}/social/Post-Scheduler`,
        title: 'Post Scheduler',
        icon: ClockCircleOutlined,
        breadcrumb: true,
        submenu: []
      }
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
        key: 'property-finance',
        path: `${APP_PREFIX_PATH}/property-finance`,
        title: 'Property Finance',
        icon: DollarOutlined,           
        breadcrumb: true,
        submenu: []
      },
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
 * Navigation configuration for Seller & Sales Team roles
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

    // Company Management
  {
    key: 'company',
    title: 'Company',
    icon: ApartmentOutlined,
    breadcrumb: true,
    submenu: [
      {
        key: 'seller-meetings',
        path: `${APP_PREFIX_PATH}/seller/meetings`,
        title: 'Meetings',
        icon: FileTextOutlined,
        breadcrumb: true,
        submenu: []
      }
    ]
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
];

/**
 * Get navigation configuration based on user role
 * @param {string} role - User role from UserRoles enum
 * @returns {Array} - Navigation configuration array
 */
export const getNavigation = (role) => {
  // HR sees ONLY HR Management section
  if (role === UserRoles.HR) {
    return hrNavigation;
  }

  // SUPER_ADMIN sees everything (CEO + Seller navigation)
  if (role === UserRoles.SUPER_ADMIN) {
    return [...ceoNavigation, ...sellerNavigation];
  }

  // CEO sees full company + HR + CRM + Tools
  if (role === UserRoles.CEO) {
    return ceoNavigation;
  }

  // All Sales & Seller Roles
  const salesRoles = [
    UserRoles.SELLER,
    UserRoles.SALES_EXECUTIVE,
    UserRoles.AGENT,
    UserRoles.TEAM_LEADER,
    UserRoles.SALES_MANAGER,
    UserRoles.OFF_PLAN_SALES,
    UserRoles.READY_TO_MOVE_SALES
  ];

  if (salesRoles.includes(role)) {
    return sellerNavigation;
  }

  // Default fallback (for any other roles)
  return sellerNavigation;
};

export default getNavigation;