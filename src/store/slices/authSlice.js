// @ts-nocheck
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { AUTH_TOKEN, USER_DATA } from 'constants/AuthConstant';
import FirebaseService from 'services/FirebaseService';
import UserService from 'services/firebase/UserService';
import { UserRoles } from 'models/UserModel';


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
 * @property {boolean} isBanned - Whether user is banned
 * @property {string} banMessage - Ban message to display
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
	pendingUser: null, // Store user data when force reset is needed
	isBanned: false, // ✅ New: Track if user is banned
	banMessage: '', // ✅ New: Store ban message
}

const salesRoles = [
	UserRoles.SELLER,
	UserRoles.SALES_EXECUTIVE,
	UserRoles.AGENT,
	UserRoles.TEAM_LEADER,
	UserRoles.SALES_MANAGER,
	UserRoles.OFF_PLAN_SALES,
	UserRoles.READY_TO_MOVE_SALES
];

/**
 * Sign in thunk - ✅ Updated to handle banned users
 * @type {import('@reduxjs/toolkit').AsyncThunk<any, any, {rejectValue: string}>}
 */
export const signIn = createAsyncThunk('auth/signIn', async (data, { rejectWithValue }) => {
	// Type checking for data
	if (!data || typeof data !== 'object') {
		return rejectWithValue('Invalid data provided');
	}
	
	const email = data?.email;
	const password = data?.password;

	if (!email || !password) {
		return rejectWithValue('Email and password are required');
	}
	
	try {
		const response = await FirebaseService.signInEmailRequest(email, password);
		
		if (response.user) {
			// ✅ Check if user is banned
			if (response.userData?.isBanned === true) {
				console.log('🔴 User is banned:', response.userData.email);
				// Sign out immediately
				await FirebaseService.signOutRequest();
				localStorage.removeItem(AUTH_TOKEN);
				localStorage.removeItem(USER_DATA);
				
				return rejectWithValue({
					message: '⛔ Your account has been banned. Please contact your administrator.',
					isBanned: true
				});
			}
			
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
		console.error('Login error:', err);
		return rejectWithValue(err.message || 'Error');
	}
});

/**
 * Sign up thunk
 * @type {import('@reduxjs/toolkit').AsyncThunk<any, any, {rejectValue: string}>}
 */
export const signUp = createAsyncThunk('auth/signUp', async (data, { rejectWithValue }) => {
	try {
		const response = await FirebaseService.signUpEmailRequest(data);
		if (response.user) {
			const token = response.user.refreshToken;
			localStorage.setItem(AUTH_TOKEN, response.user.refreshToken);

			if (response.userData) {
				localStorage.setItem(USER_DATA, JSON.stringify(response.userData));
			}

			return {
				token,
				user: response.userData,
				forcePasswordReset: response.userData?.forcePasswordReset || false
			};
		} else {
			return rejectWithValue(response.message?.replace('Firebase: ', ''));
		}
	} catch (err) {
		return rejectWithValue(err.message || 'Error');
	}
});

export const signOut = createAsyncThunk('auth/signOut', async (_, { dispatch }) => {
	const response = await FirebaseService.signOutRequest();

	// Clear auth token and user data
	localStorage.removeItem(AUTH_TOKEN);
	localStorage.removeItem(USER_DATA);

	// Use setTimeout to prevent navigation throttling
	setTimeout(() => {
		dispatch(signOutSuccess());
	}, 100);

	return { success: true };
});

export const signInWithGoogle = createAsyncThunk('auth/signInWithGoogle', async (_, { rejectWithValue }) => {
	const response = await FirebaseService.signInGoogleRequest();
	if (response.user) {
		// ✅ Check if user is banned
		if (response.userData?.isBanned === true) {
			console.log('🔴 Google user is banned:', response.userData.email);
			await FirebaseService.signOutRequest();
			localStorage.removeItem(AUTH_TOKEN);
			localStorage.removeItem(USER_DATA);
			
			return rejectWithValue({
				message: '⛔ Your account has been banned. Please contact your administrator.',
				isBanned: true
			});
		}
		
		const token = response.user.refreshToken;
		localStorage.setItem(AUTH_TOKEN, response.user.refreshToken);

		if (response.userData) {
			localStorage.setItem(USER_DATA, JSON.stringify(response.userData));
		}

		return {
			token,
			user: response.userData,
			forcePasswordReset: response.userData?.forcePasswordReset || false
		};
	} else {
		return rejectWithValue(response.message?.replace('Firebase: ', ''));
	}
});

export const signInWithFacebook = createAsyncThunk('auth/signInWithFacebook', async (_, { rejectWithValue }) => {
	const response = await FirebaseService.signInFacebookRequest();
	if (response.user) {
		// ✅ Check if user is banned
		if (response.userData?.isBanned === true) {
			console.log('🔴 Facebook user is banned:', response.userData.email);
			await FirebaseService.signOutRequest();
			localStorage.removeItem(AUTH_TOKEN);
			localStorage.removeItem(USER_DATA);
			
			return rejectWithValue({
				message: '⛔ Your account has been banned. Please contact your administrator.',
				isBanned: true
			});
		}
		
		const token = response.user.refreshToken;
		localStorage.setItem(AUTH_TOKEN, response.user.refreshToken);

		if (response.userData) {
			localStorage.setItem(USER_DATA, JSON.stringify(response.userData));
		}

		return {
			token,
			user: response.userData,
			forcePasswordReset: response.userData?.forcePasswordReset || false
		};
	} else {
		return rejectWithValue(response.message?.replace('Firebase: ', ''));
	}
});

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
 * Check ban status thunk - ✅ NEW
 */
export const checkBanStatus = createAsyncThunk('auth/checkBanStatus', async (userId, { rejectWithValue }) => {
	if (!userId) return { isBanned: false };
	
	try {
		const userData = await UserService.getUserData(userId);
		const isBanned = userData?.isBanned === true;
		
		if (isBanned) {
			// If banned, clear everything
			await FirebaseService.signOutRequest();
			localStorage.removeItem(AUTH_TOKEN);
			localStorage.removeItem(USER_DATA);
		}
		
		return { isBanned, userData };
	} catch (error) {
		console.error('Error checking ban status:', error);
		return { isBanned: false };
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
			state.loading = false;
			state.redirect = '/app/dashboards/default';
			state.token = action.payload.token;
			state.user = action.payload.user;
			state.forcePasswordReset = action.payload.forcePasswordReset || false;
			state.isBanned = false;
			state.banMessage = '';
		},
		showAuthMessage: (state, action) => {
			state.message = action.payload;
			state.showMessage = true;
			state.loading = false;
		},
		hideAuthMessage: (state) => {
			state.message = '';
			state.showMessage = false;
		},
		signOutSuccess: (state) => {
			state.loading = false;
			state.token = null;
			state.user = null;
			state.forcePasswordReset = false;
			state.pendingUser = null;
			state.isBanned = false;
			state.banMessage = '';
			state.redirect = '/';
		},
		showLoading: (state) => {
			state.loading = true;
		},
		signInSuccess: (state, action) => {
			state.loading = false;
			state.token = action.payload.token;
			state.user = action.payload.user;
			state.forcePasswordReset = action.payload.forcePasswordReset || false;
			state.isBanned = false;
			state.banMessage = '';
		},
		resetPasswordSuccess: (state) => {
			state.forcePasswordReset = false;
		},
		updateUserData: (state, action) => {
			state.user = { ...state.user, ...action.payload };
			localStorage.setItem(USER_DATA, JSON.stringify(state.user));
		},
		// ✅ New: Set ban state
		setBanned: (state, action) => {
			state.isBanned = true;
			state.banMessage = action.payload || 'Your account has been banned.';
			state.token = null;
			state.user = null;
			localStorage.removeItem(AUTH_TOKEN);
			localStorage.removeItem(USER_DATA);
		},
		clearBanState: (state) => {
			state.isBanned = false;
			state.banMessage = '';
		}
	},
	extraReducers: (builder) => {
		builder
			.addCase(signIn.pending, (state) => {
				state.loading = true;
				state.isBanned = false;
				state.banMessage = '';
			})
			.addCase(signIn.fulfilled, (state, action) => {
				state.loading = false;
				state.isBanned = false;
				state.banMessage = '';

				const needsForceReset = action.payload.forcePasswordReset === true || action.payload.user?.forcePasswordReset === true;

				console.log('🔍 AUTH SLICE - Sign In Success');
				console.log('🔍 Needs force reset:', needsForceReset);

				if (needsForceReset) {
					console.log('🛑 AUTH SLICE - Force password reset required - DENYING AUTHENTICATION');

					localStorage.removeItem(AUTH_TOKEN);
					localStorage.removeItem(USER_DATA);

					state.token = null;
					state.user = null;
					state.forcePasswordReset = true;
					state.redirect = '/auth/login';
					state.pendingUser = {
						id: action.payload.user?.id,
						email: action.payload.user?.email,
						firstname: action.payload.user?.firstname,
						lastname: action.payload.user?.lastname
					};
				} else {
					console.log('✅ AUTH SLICE - No force reset needed, proceeding with authentication');

					state.token = action.payload.token;
					state.user = action.payload.user;
					state.forcePasswordReset = false;
					state.pendingUser = null;
					const userRole = action.payload.user?.role || action.payload.user?.Role;

					if (salesRoles.includes(userRole)) {
						state.redirect = '/app/seller/dashboard';
					} else {
						state.redirect = '/app/dashboards/default';
					}
				}
			})
			.addCase(signIn.rejected, (state, action) => {
				state.loading = false;
				
				// ✅ Check if the error is a ban error
				if (action.payload && typeof action.payload === 'object' && action.payload.isBanned) {
					state.isBanned = true;
					state.banMessage = action.payload.message || 'Your account has been banned.';
					state.message = state.banMessage;
					state.showMessage = true;
					state.token = null;
					state.user = null;
					localStorage.removeItem(AUTH_TOKEN);
					localStorage.removeItem(USER_DATA);
				} else {
					state.message = typeof action.payload === 'string' ? action.payload : 'Login failed';
					state.showMessage = true;
				}
			})
			.addCase(signOut.fulfilled, (state) => {
				state.loading = false;
				state.token = null;
				state.user = null;
				state.forcePasswordReset = false;
				state.pendingUser = null;
				state.isBanned = false;
				state.banMessage = '';
				state.redirect = '/';
			})
			.addCase(signOut.rejected, (state) => {
				state.loading = false;
				state.token = null;
				state.user = null;
				state.forcePasswordReset = false;
				state.pendingUser = null;
				state.isBanned = false;
				state.banMessage = '';
				state.redirect = '/';
			})
			.addCase(signUp.pending, (state) => {
				state.loading = true;
			})
			.addCase(signUp.fulfilled, (state, action) => {
				state.loading = false;
				state.token = action.payload.token;
				state.user = action.payload.user;
				state.forcePasswordReset = action.payload.forcePasswordReset || false;
				state.isBanned = false;
				state.banMessage = '';
				const userRole = action.payload.user?.role || action.payload.user?.Role;

				if (salesRoles.includes(userRole)) {
					state.redirect = '/app/seller/dashboard';
				} else {
					state.redirect = '/app/dashboards/default';
				}
			})
			.addCase(signUp.rejected, (state, action) => {
				state.message = action.payload;
				state.showMessage = true;
				state.loading = false;
			})
			.addCase(signInWithGoogle.pending, (state) => {
				state.loading = true;
			})
			.addCase(signInWithGoogle.fulfilled, (state, action) => {
				state.loading = false;
				state.token = action.payload.token;
				state.user = action.payload.user;
				state.forcePasswordReset = action.payload.forcePasswordReset || false;
				state.isBanned = false;
				state.banMessage = '';
				const userRole = action.payload.user?.role || action.payload.user?.Role;

				if (action.payload.forcePasswordReset) {
					state.redirect = '/auth/reset-password';
				} else if (salesRoles.includes(userRole)) {
					state.redirect = '/app/seller/dashboard';
				} else {
					state.redirect = '/app/dashboards/default';
				}
			})
			.addCase(signInWithGoogle.rejected, (state, action) => {
				state.loading = false;
				if (action.payload && typeof action.payload === 'object' && action.payload.isBanned) {
					state.isBanned = true;
					state.banMessage = action.payload.message || 'Your account has been banned.';
					state.message = state.banMessage;
					state.showMessage = true;
					state.token = null;
					state.user = null;
					localStorage.removeItem(AUTH_TOKEN);
					localStorage.removeItem(USER_DATA);
				} else {
					state.message = typeof action.payload === 'string' ? action.payload : 'Login failed';
					state.showMessage = true;
				}
			})
			.addCase(signInWithFacebook.pending, (state) => {
				state.loading = true;
			})
			.addCase(signInWithFacebook.fulfilled, (state, action) => {
				state.loading = false;
				state.token = action.payload.token;
				state.user = action.payload.user;
				state.forcePasswordReset = action.payload.forcePasswordReset || false;
				state.isBanned = false;
				state.banMessage = '';
				const userRole = action.payload.user?.role || action.payload.user?.Role;

				if (action.payload.forcePasswordReset) {
					state.redirect = '/auth/reset-password';
				} else if (salesRoles.includes(userRole)) {
					state.redirect = '/app/seller/dashboard';
				} else {
					state.redirect = '/app/dashboards/default';
				}
			})
			.addCase(signInWithFacebook.rejected, (state, action) => {
				state.loading = false;
				if (action.payload && typeof action.payload === 'object' && action.payload.isBanned) {
					state.isBanned = true;
					state.banMessage = action.payload.message || 'Your account has been banned.';
					state.message = state.banMessage;
					state.showMessage = true;
					state.token = null;
					state.user = null;
					localStorage.removeItem(AUTH_TOKEN);
					localStorage.removeItem(USER_DATA);
				} else {
					state.message = typeof action.payload === 'string' ? action.payload : 'Login failed';
					state.showMessage = true;
				}
			})
			.addCase(forcePasswordReset.pending, (state) => {
				state.loading = true;
				state.message = '';
				state.showMessage = false;
			})
			.addCase(forcePasswordReset.fulfilled, (state, action) => {
				state.loading = false;
				state.user = action.payload.user;
				state.forcePasswordReset = false;
				state.pendingUser = null;
				state.token = action.payload.token;
				state.message = action.payload.message;
				state.showMessage = true;
				state.isBanned = false;
				state.banMessage = '';
				const userRole = action.payload.user?.role || action.payload.user?.Role;

				if (salesRoles.includes(userRole)) {
					state.redirect = '/app/seller/dashboard';
				} else {
					state.redirect = '/app/dashboards/default';
				}
			})
			.addCase(forcePasswordReset.rejected, (state, action) => {
				state.loading = false;
				state.message = action.payload;
				state.showMessage = true;
			})
			.addCase(checkBanStatus.fulfilled, (state, action) => {
				if (action.payload.isBanned) {
					state.isBanned = true;
					state.banMessage = 'Your account has been banned.';
					state.token = null;
					state.user = null;
					state.forcePasswordReset = false;
					state.pendingUser = null;
				}
			});
	},
});

export const {
	authenticated,
	showAuthMessage,
	hideAuthMessage,
	signOutSuccess,
	showLoading,
	signInSuccess,
	resetPasswordSuccess,
	updateUserData,
	setBanned, // ✅ New
	clearBanState // ✅ New
} = authSlice.actions;

/**
 * Reset password action creator
 * @returns {Function} Thunk function
 */
export const resetPassword = () => (dispatch) => {
	dispatch(resetPasswordSuccess());
};

export default authSlice.reducer;