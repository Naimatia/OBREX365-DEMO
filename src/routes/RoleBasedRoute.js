// @ts-nocheck
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { UserRoles } from 'models/UserModel';
import { AUTH_PREFIX_PATH, APP_PREFIX_PATH } from 'configs/AppConfig';

// All roles that should behave like "sales team / seller" users
const SALES_TEAM_ROLES = [
  UserRoles.SELLER,
  UserRoles.SALES_EXECUTIVE,
  UserRoles.AGENT,
  UserRoles.TEAM_LEADER,
  UserRoles.SALES_MANAGER,
  UserRoles.OFF_PLAN_SALES,
  UserRoles.READY_TO_MOVE_SALES,
];

const RoleBasedRoute = ({
  children,
  allowedRoles = [],
  redirectPath = `${APP_PREFIX_PATH}/access-denied`,
}) => {
  const user = useSelector((state) => state.auth.user);

  if (!user) {
    console.log('🔒 No user found – redirecting to login');
    return <Navigate to={`${AUTH_PREFIX_PATH}/login`} replace />;
  }

  // Normalize role field (some docs use Role, some use role)
  const userRole = (user.Role || user.role || '').trim();

  console.log('🔍 RoleBasedRoute', {
    userRole,
    userId: user.id,
    allowedRoles,
    currentPath: window.location.pathname,
  });

  // 1. Super Admin → full access to everything (bypass all checks)
  if (userRole === UserRoles.SUPER_ADMIN) {
    console.log('✅ SuperAdmin – full access granted');
    return <>{children}</>;
  }

  // 2. HR role – only allow if explicitly permitted
  if (userRole === UserRoles.HR) {
    const hrAllowed = allowedRoles.includes(UserRoles.HR) || allowedRoles.includes('HR');
    if (hrAllowed) {
      console.log('✅ HR – access granted (explicitly allowed)');
      return <>{children}</>;
    } else {
      console.log('❌ HR – access denied (route not allowed for HR)');
      return <Navigate to={redirectPath} replace />;
    }
  }

  // 3. Sales team members (Seller + Managers + Executives + ...)
  if (SALES_TEAM_ROLES.includes(userRole)) {
    const salesAllowed = allowedRoles.some(role => SALES_TEAM_ROLES.includes(role) || role === userRole);
    if (salesAllowed) {
      console.log(`✅ ${userRole} – sales team access granted`);
      return <>{children}</>;
    } else {
      console.log(`❌ ${userRole} – access denied (not allowed on this route)`);
      return <Navigate to={redirectPath} replace />;
    }
  }

  // 4. CEO (and other non-HR, non-sales roles) – check explicit match
  if (userRole === UserRoles.CEO) {
    const ceoAllowed = allowedRoles.includes(UserRoles.CEO) || allowedRoles.includes('CEO');
    if (ceoAllowed) {
      console.log('✅ CEO – access granted');
      return <>{children}</>;
    }
  }

  // 5. Explicit match for any other roles (fallback)
  if (allowedRoles.includes(userRole)) {
    console.log(`✅ Explicit role match – ${userRole} granted`);
    return <>{children}</>;
  }

  // Denied – default case
  console.log('❌ ACCESS DENIED', {
    userRole,
    requiredRoles: allowedRoles,
  });

  return <Navigate to={redirectPath} replace />;
};

export default RoleBasedRoute;