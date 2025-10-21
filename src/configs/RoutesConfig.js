// @ts-nocheck
import React from 'react'
import { AUTH_PREFIX_PATH, APP_PREFIX_PATH } from 'configs/AppConfig'
import { UserRoles } from 'models/UserModel'

// Public routes accessible without authentication
export const publicRoutes = [
    {
        key: 'login',
        path: `${AUTH_PREFIX_PATH}/login`,
        component: React.lazy(() => import('views/auth-views/authentication/login')),
    },
    {
        key: 'register',
        path: `${AUTH_PREFIX_PATH}/register-1`,
        component: React.lazy(() => import('views/auth-views/authentication/register-1')),
    },
    {
        key: 'forgot-password',
        path: `${AUTH_PREFIX_PATH}/forgot-password`,
        component: React.lazy(() => import('views/auth-views/authentication/forgot-password')),
    },
    {
        key: 'reset-password',
        path: `${AUTH_PREFIX_PATH}/reset-password`,
        component: React.lazy(() => import('views/auth-views/authentication/reset-password')),
    },
    {
        key: 'error-page-1',
        path: `${AUTH_PREFIX_PATH}/error-page-1`,
        component: React.lazy(() => import('views/auth-views/errors/error-page-1')),
    },
]

// Role-based routes for OBREX365 CRM
export const protectedRoutes = [
    // CEO/HR Role Routes
    {
        key: 'dashboard',
        path: `${APP_PREFIX_PATH}/dashboards`,
        component: React.lazy(() => import('views/app-views/company/dashboard/index')),
        allowedRoles: [UserRoles.SUPER_ADMIN, UserRoles.CEO, UserRoles.HR]
    },
    {
        key: 'my-company',
        path: `${APP_PREFIX_PATH}/my-company`,
        component: React.lazy(() => import('views/app-views/company/my-company')),
        allowedRoles: [UserRoles.SUPER_ADMIN, UserRoles.CEO, UserRoles.HR]
    },
    {
        key: 'property-scanner',
        path: `${APP_PREFIX_PATH}/property-scanner`,
        component: React.lazy(() => import('views/app-views/company/property-scanner')),
        allowedRoles: [UserRoles.SUPER_ADMIN, UserRoles.CEO, UserRoles.HR, UserRoles.SELLER]
    },
    {
        key: 'todo',
        path: `${APP_PREFIX_PATH}/todo`,
        component: React.lazy(() => import('views/app-views/company/todo')),
        allowedRoles: [UserRoles.SUPER_ADMIN, UserRoles.CEO, UserRoles.HR]
    },
    {
        key: 'sellers',
        path: `${APP_PREFIX_PATH}/sellers`,
        component: React.lazy(() => import('views/app-views/company/sellers')),
        allowedRoles: [UserRoles.SUPER_ADMIN, UserRoles.CEO, UserRoles.HR]
    },
    {
        key: 'contacts',
        path: `${APP_PREFIX_PATH}/contacts`,
        component: React.lazy(() => import('views/app-views/company/contacts')),
        allowedRoles: [UserRoles.SUPER_ADMIN, UserRoles.CEO, UserRoles.HR]
    },
    {
        key: 'leads',
        path: `${APP_PREFIX_PATH}/leads`,
        component: React.lazy(() => import('views/app-views/company/leads')),
        allowedRoles: [UserRoles.SUPER_ADMIN, UserRoles.CEO, UserRoles.HR]
    },
    {
        key: 'deals',
        path: `${APP_PREFIX_PATH}/deals`,
        component: React.lazy(() => import('views/app-views/company/deals')),
        allowedRoles: [UserRoles.SUPER_ADMIN, UserRoles.CEO, UserRoles.HR]
    },
    {
        key: 'properties',
        path: `${APP_PREFIX_PATH}/properties`,
        component: React.lazy(() => import('views/app-views/company/properties')),
        allowedRoles: [UserRoles.SUPER_ADMIN, UserRoles.CEO, UserRoles.HR]
    },
    {
        key: 'history',
        path: `${APP_PREFIX_PATH}/history`,
        component: React.lazy(() => import('views/app-views/company/history')),
        allowedRoles: [UserRoles.SUPER_ADMIN, UserRoles.CEO, UserRoles.HR]
    },
    {
        key: 'invoices',
        path: `${APP_PREFIX_PATH}/invoices`,
        component: React.lazy(() => import('views/app-views/company/invoices')),
        allowedRoles: [UserRoles.SUPER_ADMIN, UserRoles.CEO, UserRoles.HR]
    },
    {
        key: 'employees',
        path: `${APP_PREFIX_PATH}/company/employees`,
        component: React.lazy(() => import('views/app-views/company/employees')),
        allowedRoles: [UserRoles.SUPER_ADMIN, UserRoles.CEO, UserRoles.HR]
    },
    {
        key: 'meetings',
        path: `${APP_PREFIX_PATH}/company/meetings`,
        component: React.lazy(() => import('views/app-views/company/meetings')),
        allowedRoles: [UserRoles.SUPER_ADMIN, UserRoles.CEO, UserRoles.HR]
    },
    {
        key: 'applications',
        path: `${APP_PREFIX_PATH}/applications`,
        component: React.lazy(() => import('views/app-views/company/applications')),
        allowedRoles: [UserRoles.SUPER_ADMIN, UserRoles.CEO, UserRoles.HR]
    },
    {
        key: 'attendees',
        path: `${APP_PREFIX_PATH}/attendees`,
        component: React.lazy(() => import('views/app-views/company/attendees')),
        allowedRoles: [UserRoles.SUPER_ADMIN, UserRoles.CEO, UserRoles.HR]
    },
      {
        key: 'payroll',
        path: `${APP_PREFIX_PATH}/payroll`,
        component: React.lazy(() => import('views/app-views/company/payroll')),
        allowedRoles: [UserRoles.SUPER_ADMIN, UserRoles.CEO, UserRoles.HR]
    },
    
    // Seller Role Routes
    {
        key: 'seller-dashboard',
        path: `${APP_PREFIX_PATH}/seller/dashboard`,
        component: React.lazy(() => import('views/app-views/seller/dashboard')),
        allowedRoles: [UserRoles.SUPER_ADMIN, UserRoles.SELLER]
    },
    {
        key: 'seller-todo',
        path: `${APP_PREFIX_PATH}/seller/todo`,
        component: React.lazy(() => import('views/app-views/seller/todo')),
        allowedRoles: [UserRoles.SUPER_ADMIN, UserRoles.SELLER]
    },
    {
        key: 'seller-contacts',
        path: `${APP_PREFIX_PATH}/seller/contacts`,
        component: React.lazy(() => import('views/app-views/seller/contacts')),
        allowedRoles: [UserRoles.SUPER_ADMIN, UserRoles.SELLER]
    },
    {
        key: 'seller-leads',
        path: `${APP_PREFIX_PATH}/seller/leads`,
        component: React.lazy(() => import('views/app-views/seller/leads')),
        allowedRoles: [UserRoles.SUPER_ADMIN, UserRoles.SELLER]
    },
    {
        key: 'seller-deals',
        path: `${APP_PREFIX_PATH}/seller/deals`,
        component: React.lazy(() => import('views/app-views/seller/deals')),
        allowedRoles: [UserRoles.SUPER_ADMIN, UserRoles.SELLER]
    },
    {
        key: 'seller-properties',
        path: `${APP_PREFIX_PATH}/seller/properties`,
        component: React.lazy(() => import('views/app-views/seller/properties')),
        allowedRoles: [UserRoles.SUPER_ADMIN, UserRoles.SELLER]
    },
    {
        key: 'seller-invoices',
        path: `${APP_PREFIX_PATH}/seller/invoices`,
        component: React.lazy(() => import('views/app-views/seller/invoices')),
        allowedRoles: [UserRoles.SUPER_ADMIN, UserRoles.SELLER]
    }
]
   