// @ts-nocheck
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { AUTH_TOKEN, USER_DATA } from 'constants/AuthConstant';
import FirebaseService from 'services/FirebaseService';
import UserService from 'services/firebase/UserService';

/**
 * @typedef {Object} AuthState
 * @property {boolean} loading - Loading state
 * @property {string} message - Message to display
 * @property {boolean} showMessage - Whether to show the message
 * @property {string} redirect - Redirect URL
 * @property {string|null} token - Auth token
 * @property {Object|null} user - User data
 * @property {boolean} forcePasswordReset - Whether password reset is required
 * @property {Object|null} pendingUser - User data when force reset is needed
 */

/**
 * @typedef {Object} AuthCredentials
 * @property {string} email - User email
 * @property {string} password - User password
 */

/**
 * @typedef {Object} AuthResponse
 * @property {string} token - Authentication token
 * @property {Object} user - User data
 * @property {boolean} [forcePasswordReset] - Whether password reset is required
 */

/** @type {AuthState} */
export const initialState = {
	loading: false,
	message: '',
	showMessage: false,
	redirect: '',
	token: localStorage.getItem(AUTH_TOKEN) || null,
	user: JSON.parse(localStorage.getItem(USER_DATA) || 'null'),
	forcePasswordReset: false,
	pendingUser: null // Store user data when force reset is needed
}

/**
 * Sign in thunk
 * @type {import('@reduxjs/toolkit').AsyncThunk<any, any, {rejectValue: string}>}
 */
export const signIn = createAsyncThunk('auth/signIn',async (data, { rejectWithValue }) => {
	// Type checking for data
	if (!data || typeof data !== 'object') {
		return rejectWithValue('Invalid data provided');
	}
	// Safely access properties with type checking
	const email = data?.email;
	const password = data?.password;
	
	if (!email || !password) {
		return rejectWithValue('Email and password are required');
	}
	try {
		const response = await FirebaseService.signInEmailRequest(email, password)
		if (response.user) {
			const token = response.user.refreshToken;
			// Store token in localStorage
			localStorage.setItem(AUTH_TOKEN, response.user.refreshToken);
			
			// Store user data in localStorage
			if (response.userData) {
				localStorage.setItem(USER_DATA, JSON.stringify(response.userData));
			}
			
			// Return both token and user data
			return { 
				token, 
				user: response.userData,
				forcePasswordReset: response.userData?.forcePasswordReset || false
			};
		} else {
			return rejectWithValue(response.message?.replace('Firebase: ', ''));
		}
	} catch (err) {
		return rejectWithValue(err.message || 'Error')
	}
})

/**
 * Sign up thunk
 * @type {import('@reduxjs/toolkit').AsyncThunk<any, any, {rejectValue: string}>}
 */
export const signUp = createAsyncThunk('auth/signUp',async (data, { rejectWithValue }) => {
	try {
		// Include additional user fields beyond email and password
		const response = await FirebaseService.signUpEmailRequest(data)
		if (response.user) {
			const token = response.user.refreshToken;
			// Store token in localStorage
			localStorage.setItem(AUTH_TOKEN, response.user.refreshToken);
			
			// Store user data in localStorage
			if (response.userData) {
				localStorage.setItem(USER_DATA, JSON.stringify(response.userData));
			}
			
			// Return both token and user data
			return { 
				token, 
				user: response.userData,
				forcePasswordReset: response.userData?.forcePasswordReset || false
			};
		} else {
			return rejectWithValue(response.message?.replace('Firebase: ', ''));
		}
	} catch (err) {
		return rejectWithValue(err.message || 'Error')
	}
})

export const signOut = createAsyncThunk('auth/signOut',async (_, { dispatch }) => {
    const response = await FirebaseService.signOutRequest()
    
    // Clear auth token and user data
    localStorage.removeItem(AUTH_TOKEN);
    localStorage.removeItem(USER_DATA);
    
    // Use setTimeout to prevent navigation throttling
    setTimeout(() => {
        dispatch(signOutSuccess());
    }, 100);
    
    return { success: true }
})

export const signInWithGoogle = createAsyncThunk('auth/signInWithGoogle', async (_, { rejectWithValue }) => {
    const response = await FirebaseService.signInGoogleRequest()
	if (response.user) {
		const token = response.user.refreshToken;
		// Store token in localStorage
		localStorage.setItem(AUTH_TOKEN, response.user.refreshToken);
		
		// Store user data in localStorage
		if (response.userData) {
			localStorage.setItem(USER_DATA, JSON.stringify(response.userData));
		}
		
		// Return both token and user data
		return { 
			token, 
			user: response.userData,
			forcePasswordReset: response.userData?.forcePasswordReset || false
		};
	} else {
		return rejectWithValue(response.message?.replace('Firebase: ', ''));
	}
})

export const signInWithFacebook = createAsyncThunk('auth/signInWithFacebook', async (_, { rejectWithValue }) => {
    const response = await FirebaseService.signInFacebookRequest()
	if (response.user) {
		const token = response.user.refreshToken;
		// Store token in localStorage
		localStorage.setItem(AUTH_TOKEN, response.user.refreshToken);
		
		// Store user data in localStorage
		if (response.userData) {
			localStorage.setItem(USER_DATA, JSON.stringify(response.userData));
		}
		
		// Return both token and user data
		return { 
			token, 
			user: response.userData,
			forcePasswordReset: response.userData?.forcePasswordReset || false
		};
	} else {
		return rejectWithValue(response.message?.replace('Firebase: ', ''));
	}
})

/**
 * Force password reset thunk
 * @type {import('@reduxjs/toolkit').AsyncThunk<any, any, {rejectValue: string}>}
 */
export const forcePasswordReset = createAsyncThunk('auth/forcePasswordReset', async (data, { rejectWithValue }) => {
	const { userId, userEmail, newPassword } = data;
	
	if (!userId || !userEmail || !newPassword) {
		return rejectWithValue('User ID, email, and new password are required');
	}
	
	try {
		console.log('🔄 Force password reset thunk started for:', userEmail);
		
		const result = await UserService.completeForcePasswordReset(userId, userEmail, newPassword);
		
		// Update localStorage with new user data and token
		localStorage.setItem(USER_DATA, JSON.stringify(result.user));
		localStorage.setItem(AUTH_TOKEN, result.token);
		
		console.log('✅ Force password reset thunk completed successfully');
		
		return {
			user: result.user,
			token: result.token,
			message: result.message
		};
	} catch (error) {
		console.error('❌ Force password reset thunk error:', error);
		return rejectWithValue(error.message || 'Failed to update password');
	}
});

/**
 * Auth slice
 * @type {import('@reduxjs/toolkit').Slice<AuthState>}
 */
export const authSlice = createSlice({
	name: 'auth',
	initialState,
	reducers: {
		authenticated: (state, action) => {
			state.loading = false
			state.redirect = '/app/dashboards/default'
			state.token = action.payload.token
			state.user = action.payload.user
			state.forcePasswordReset = action.payload.forcePasswordReset || false
		},
		showAuthMessage: (state, action) => {
			state.message = action.payload
			state.showMessage = true
			state.loading = false
		},
		hideAuthMessage: (state) => {
			state.message = ''
			state.showMessage = false
		},
		signOutSuccess: (state) => {
			state.loading = false
			state.token = null
			state.user = null
			state.forcePasswordReset = false
			state.redirect = '/'
		},
		showLoading: (state) => {
			state.loading = true
		},
		signInSuccess: (state, action) => {
			state.loading = false
			state.token = action.payload.token
			state.user = action.payload.user
			state.forcePasswordReset = action.payload.forcePasswordReset || false
		},
		resetPasswordSuccess: (state) => {
			state.forcePasswordReset = false
		},
		updateUserData: (state, action) => {
			// Update user data and save to localStorage
			state.user = { ...state.user, ...action.payload }
			localStorage.setItem(USER_DATA, JSON.stringify(state.user))
		}
	},
	extraReducers: (builder) => {
		builder
			.addCase(signIn.pending, (state) => {
				state.loading = true
			})
			.addCase(signIn.fulfilled, (state, action) => {
				state.loading = false
				
				// 🚨 CRITICAL: Check for force password reset FIRST - BEFORE setting token/user
				const needsForceReset = action.payload.forcePasswordReset === true || action.payload.user?.forcePasswordReset === true;
				
				console.log('🔍 AUTH SLICE - Sign In Success');
				console.log('🔍 forcePasswordReset from payload:', action.payload.forcePasswordReset);
				console.log('🔍 user.forcePasswordReset:', action.payload.user?.forcePasswordReset);
				console.log('🔍 Needs force reset (computed):', needsForceReset);
				
				if (needsForceReset) {
					// 🛑 DO NOT AUTHENTICATE - Clear everything and show force reset modal
					console.log('🛑 AUTH SLICE - Force password reset required - DENYING AUTHENTICATION');
					
					// Clear localStorage to prevent any session persistence
					localStorage.removeItem(AUTH_TOKEN);
					localStorage.removeItem(USER_DATA);
					
					// Reset auth state (no token, no user)
					state.token = null
					state.user = null
					state.forcePasswordReset = true
					state.redirect = '/auth/login'
					
					// Store minimal user data needed for password reset (email, id)
					state.pendingUser = {
						id: action.payload.user?.id,
						email: action.payload.user?.email,
						firstname: action.payload.user?.firstname,
						lastname: action.payload.user?.lastname
					}
					
				} else {
					// ✅ Normal authentication flow
					console.log('✅ AUTH SLICE - No force reset needed, proceeding with authentication');
					
					state.token = action.payload.token
					state.user = action.payload.user
					state.forcePasswordReset = false
					state.pendingUser = null
					
					// Set redirect based on user role
					if (action.payload.user?.Role === 'Seller' || action.payload.user?.role === 'Seller') {
						console.log('🚀 AUTH SLICE - Setting seller redirect to dashboard');
						state.redirect = '/app/seller/dashboard'
					} else {
						console.log('🚀 AUTH SLICE - Setting non-seller redirect to main dashboard');
						state.redirect = '/app/dashboards/default'
					}
				}
			})
			.addCase(signIn.rejected, (state, action) => {
				state.message = action.payload
				state.showMessage = true
				state.loading = false
			})
			.addCase(signOut.fulfilled, (state) => {
				state.loading = false
				state.token = null
				state.user = null
				state.forcePasswordReset = false
				state.redirect = '/'
			})
			.addCase(signOut.rejected, (state) => {
				state.loading = false
				state.token = null
				state.user = null
				state.forcePasswordReset = false
				state.redirect = '/'
			})
			.addCase(signUp.pending, (state) => {
				state.loading = true
			})
			.addCase(signUp.fulfilled, (state, action) => {
				state.loading = false
				state.token = action.payload.token
				state.user = action.payload.user
				state.forcePasswordReset = action.payload.forcePasswordReset || false
				
				// Set redirect based on user role
				if (action.payload.user?.Role === 'Seller' || action.payload.user?.role === 'Seller') {
					state.redirect = '/app/seller/dashboard'
				} else {
					state.redirect = '/app/dashboards/default'
				}
			})
			.addCase(signUp.rejected, (state, action) => {
				state.message = action.payload
				state.showMessage = true
				state.loading = false
			})
			.addCase(signInWithGoogle.pending, (state) => {
				state.loading = true
			})
			.addCase(signInWithGoogle.fulfilled, (state, action) => {
				state.loading = false
				state.token = action.payload.token
				state.user = action.payload.user
				state.forcePasswordReset = action.payload.forcePasswordReset || false
				
				// Redirect to password reset if needed, otherwise role-based dashboard
				if (action.payload.forcePasswordReset) {
					state.redirect = '/auth/reset-password'
				} else if (action.payload.user?.Role === 'Seller' || action.payload.user?.role === 'Seller') {
					state.redirect = '/app/seller/dashboard'
				} else {
					state.redirect = '/app/dashboards/default'
				}
			})
			.addCase(signInWithGoogle.rejected, (state, action) => {
				state.message = action.payload
				state.showMessage = true
				state.loading = false
			})
			.addCase(signInWithFacebook.pending, (state) => {
				state.loading = true
			})
			.addCase(signInWithFacebook.fulfilled, (state, action) => {
				state.loading = false
				state.token = action.payload.token
				state.user = action.payload.user
				state.forcePasswordReset = action.payload.forcePasswordReset || false
				
				// Redirect to password reset if needed, otherwise role-based dashboard
				if (action.payload.forcePasswordReset) {
					state.redirect = '/auth/reset-password'
				} else if (action.payload.user?.Role === 'Seller' || action.payload.user?.role === 'Seller') {
					state.redirect = '/app/seller/dashboard'
				} else {
					state.redirect = '/app/dashboards/default'
				}
			})
			.addCase(signInWithFacebook.rejected, (state, action) => {
				state.message = action.payload
				state.showMessage = true
				state.loading = false
			})
			.addCase(forcePasswordReset.pending, (state) => {
				state.loading = true
				state.message = ''
				state.showMessage = false
			})
			.addCase(forcePasswordReset.fulfilled, (state, action) => {
				state.loading = false
				state.user = action.payload.user
				state.forcePasswordReset = false
				state.pendingUser = null // Clear pending user data
				state.token = action.payload.token // Set new auth token
				state.message = action.payload.message
				state.showMessage = true
				
				// Set appropriate redirect after password reset
				if (action.payload.user?.Role === 'Seller' || action.payload.user?.role === 'Seller') {
					state.redirect = '/app/seller/dashboard'
				} else {
					state.redirect = '/app/dashboards/default'
				}
			})
			.addCase(forcePasswordReset.rejected, (state, action) => {
				state.loading = false
				state.message = action.payload
				state.showMessage = true
			})
	},
})

export const { 
	authenticated,
	showAuthMessage,
	hideAuthMessage,
	signOutSuccess,
	showLoading,
	signInSuccess,
	resetPasswordSuccess,
	updateUserData
} = authSlice.actions

// Action creator for resetting password
/**
 * Reset password action creator
 * @returns {Function} Thunk function
 */
export const resetPassword = () => (dispatch) => {
	dispatch(resetPasswordSuccess());
};

export default authSlice.reducer