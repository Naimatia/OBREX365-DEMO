import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux';
import { 
	AUTH_PREFIX_PATH, 
	UNAUTHENTICATED_ENTRY, 
	REDIRECT_URL_KEY 
} from '../configs/AppConfig'

/**
 * @typedef {Object} AuthState
 * @property {string|null} token - The authentication token
 */

/**
 * @typedef {Object} RootState
 * @property {AuthState} auth - The auth slice of the Redux state
 */

const ProtectedRoute = () => {
	
	/**
	 * @type {{token: string|null}}
	 */
	const { token } = useSelector(/** @param {import('redux').AnyAction & {auth: {token: string|null}}} state */ state => state.auth)
	const location = useLocation()

	if (!token) {
		return <Navigate to={`${AUTH_PREFIX_PATH}${UNAUTHENTICATED_ENTRY}?${REDIRECT_URL_KEY}=${location.pathname}`} replace />;
	}

	return <Outlet />
}

export default ProtectedRoute