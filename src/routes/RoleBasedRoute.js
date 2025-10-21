import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { UserRoles } from 'models/UserModel';
import { AUTH_PREFIX_PATH, APP_PREFIX_PATH } from 'configs/AppConfig';

/**
 * Role-based route guard component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child component to render if authorized
 * @param {string[]} props.allowedRoles - Array of roles allowed to access this route
 * @param {string} [props.redirectPath] - Path to redirect if not authorized
 * @returns {JSX.Element} - Rendered component or redirect
 */
const RoleBasedRoute = ({ 
  children, 
  allowedRoles = [], 
  redirectPath = `${APP_PREFIX_PATH}/access-denied` 
}) => {
  // Get user from Redux state
  const user = useSelector(state => state.auth.user);
  
  // If no user or token, redirect to login
  if (!user) {
    return <Navigate to={`${AUTH_PREFIX_PATH}/login`} replace />;
  }
  
  // Check if user role is allowed - check both Role and role fields
  const userRole = user.Role || user.role || '';
  
  console.log('🔍 RoleBasedRoute - User role check:', { userRole, userId: user.id, allowedRoles, currentPath: window.location.pathname });
  
  // SuperAdmin has access to all routes
  if (userRole === UserRoles.SUPER_ADMIN) {
    console.log('✅ RoleBasedRoute - SuperAdmin access granted');
    return <>{children}</>;
  }
  
  // For CEO and HR, they share the same permissions
  if ((userRole === UserRoles.CEO || userRole === UserRoles.HR) && 
      (allowedRoles.includes(UserRoles.CEO) || allowedRoles.includes(UserRoles.HR))) {
    console.log('✅ RoleBasedRoute - CEO/HR access granted');
    return <>{children}</>;
  }
  
  // For Seller role, check both 'Seller' and UserRoles.SELLER
  if (userRole === 'Seller' || userRole === UserRoles.SELLER) {
    if (allowedRoles.includes('Seller') || allowedRoles.includes(UserRoles.SELLER)) {
      console.log('✅ RoleBasedRoute - Seller access granted');
      return <>{children}</>;
    }
  }
  
  // For other roles, check if explicitly allowed
  if (allowedRoles.includes(userRole)) {
    console.log('✅ RoleBasedRoute - Role access granted for:', userRole);
    return <>{children}</>;
  }
  
  // If not authorized, redirect to specified path
  console.log('❌ RoleBasedRoute - Access DENIED for role:', userRole, 'Required roles:', allowedRoles);
  return <Navigate to={redirectPath} replace />;
};

export default RoleBasedRoute;
