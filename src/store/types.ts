import { ThunkAction } from '@reduxjs/toolkit';

// Define RootState type manually
// This avoids TypeScript errors when importing from JavaScript files
export interface RootState {
  auth: {
    loading: boolean;
    message: string;
    showMessage: boolean;
    redirect: string;
    token: string | null;
    user: any | null;
    forcePasswordReset: boolean;
  };
  // Add other state slices as needed
}

// Define Action type for the thunk
type Action<T = string> = {
  type: T;
  payload?: any;
};

// Define AppThunk type for async actions
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action
>;
