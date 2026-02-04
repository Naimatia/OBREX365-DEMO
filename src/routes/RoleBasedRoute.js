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
  // Add COORDINATOR here too if they should have same access
];

const RoleBasedRoute = ({
  children,
  allowedRoles = [],
  redirectPath = `${APP_PREFIX_PATH}/access-denied`,
}) => {
  const user = useSelector((state) => state.auth.user);

  if (!user) {
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

  // 1. Super Admin → full access to everything
  if (userRole === UserRoles.SUPER_ADMIN) {
    console.log('✅ SuperAdmin – full access granted');
    return <>{children}</>;
  }

  // 2. Sales team members (Seller + Managers + Executives + ...)
  if (SALES_TEAM_ROLES.includes(userRole)) {
    // Grant access if route allows SELLER or any sales-team role
    const allowsSales =
      allowedRoles.includes(UserRoles.SELLER) ||
      allowedRoles.includes('Seller') || // legacy support
      allowedRoles.some((r) => SALES_TEAM_ROLES.includes(r));

    if (allowsSales) {
      console.log(`✅ ${userRole} – sales team access granted`);
      return <>{children}</>;
    }
  }

  // 3. CEO & HR group
  if (
    (userRole === UserRoles.CEO || userRole === UserRoles.HR) &&
    (allowedRoles.includes(UserRoles.CEO) ||
     allowedRoles.includes(UserRoles.HR) ||
     allowedRoles.includes('CEO') ||
     allowedRoles.includes('HR'))
  ) {
    console.log(`✅ ${userRole} – CEO/HR access granted`);
    return <>{children}</>;
  }

  // 4. Explicit match (fallback – other roles like Accountant, Secretary…)
  if (allowedRoles.includes(userRole)) {
    console.log(`✅ Explicit role match – ${userRole} granted`);
    return <>{children}</>;
  }

  // Denied
  console.log('❌ ACCESS DENIED', {
    userRole,
    requiredRoles: allowedRoles,
  });

  return <Navigate to={redirectPath} replace />;
};

export default RoleBasedRoute;