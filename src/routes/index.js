// @ts-nocheck
import React, { Suspense, lazy } from 'react';
import { Routes as RouterRoutes, Route, Navigate } from 'react-router-dom';
import { APP_PREFIX_PATH, AUTH_PREFIX_PATH } from 'configs/AppConfig';
import { protectedRoutes, publicRoutes } from 'configs/RoutesConfig';
import { UserRoles } from 'models/UserModel';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import AppRoute from './AppRoute';
import RoleBasedRoute from './RoleBasedRoute';
import Loading from 'components/shared-components/Loading';
import { useSelector } from 'react-redux';

// Lazy load the access denied page
const AccessDenied = lazy(() => import('views/app-views/access-denied'));

/**
 * Role-based redirection component
 * Routes users to the appropriate dashboard based on their role
 */
const RoleBasedRedirect = () => {
  const user = useSelector(state => state.auth.user);
  const redirect = useSelector(state => state.auth.redirect);
  const forcePasswordReset = useSelector(state => state.auth.forcePasswordReset);
  const userRole = user?.Role || user?.role || '';
  
  // Debug logging
  console.log('🔍 RoleBasedRedirect - Auth redirect from slice:', redirect);
  console.log('🔍 RoleBasedRedirect - UserRole:', userRole);
  
  // 🚨 CRITICAL: Check for force password reset FIRST
  const needsForceReset = forcePasswordReset === true || user?.forcePasswordReset === true;
  
  if (needsForceReset) {
    console.log('🛑 RoleBasedRedirect - Force password reset required, staying on login page');
    return <Navigate replace to={`${AUTH_PREFIX_PATH}/login`} />;
  }
  
  // Use the redirect from auth slice if it exists and is valid
  if (redirect && redirect !== '/' && redirect !== '') {
    console.log('✅ RoleBasedRedirect - Using auth slice redirect:', redirect);
    return <Navigate replace to={redirect} />;
  }
  
  // Fallback role-based redirection
  if (userRole === UserRoles.SELLER || userRole === 'seller' || userRole === 'Seller') {
    console.log('✅ RoleBasedRedirect - Fallback: Redirecting seller to dashboard');
    return <Navigate replace to={`${APP_PREFIX_PATH}/seller/dashboard`} />;
  }
  
  // CEO, HR and SuperAdmin go to the main dashboard
  console.log('✅ RoleBasedRedirect - Fallback: Redirecting non-seller to main dashboard');
  return <Navigate replace to={`${APP_PREFIX_PATH}/dashboards`} />;
};

const Routes = () => {
	return (
		<RouterRoutes>
			{/* Protected Routes - Require Authentication */}
			<Route path="/" element={<ProtectedRoute />}>
				{/* Dynamic role-based redirection */}
				<Route path="/" element={<RoleBasedRedirect />} />
				
				{/* Access Denied Route */}
				<Route 
					path={`${APP_PREFIX_PATH}/access-denied`}
					element={
						<Suspense fallback={<Loading cover="content" />}>
							<AccessDenied />
						</Suspense>
					}
				/>

				{/* Map all protected routes with role-based access control */}
				{protectedRoutes.map((route, index) => {
					console.log('🔍 ROUTES - Registering route:', route.path, 'with roles:', route.allowedRoles);
					return (
						<Route 
							key={route.key + index} 
							path={route.path}
							element={
								<RoleBasedRoute 
									allowedRoles={route.allowedRoles || [UserRoles.SUPER_ADMIN, UserRoles.CEO, UserRoles.HR]}
								>
									<AppRoute
										routeKey={route.key} 
										component={route.component}
										{...route.meta} 
									/>
								</RoleBasedRoute>
							}
						/>
					);
				})}

				{/* Fallback for any unmatched protected routes - role-based redirection */}
				<Route path="*" element={<RoleBasedRedirect />} />
			</Route>

			{/* Public Routes - No Authentication Required */}
			<Route path="/" element={<PublicRoute />}>
				{publicRoutes.map(route => {
					return (
						<Route 
							key={route.path} 
							path={route.path}
							element={
								<Suspense fallback={<Loading cover="content" />}>
									<AppRoute
										routeKey={route.key} 
										component={route.component}
										{...route.meta} 
									/>
								</Suspense>
							}
						/>
					);
				})}
			</Route>
		</RouterRoutes>
	);
}

export default Routes