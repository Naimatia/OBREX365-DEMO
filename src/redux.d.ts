// This file extends TypeScript's type definitions for Redux

import { THEME_CONFIG } from './configs/AppConfig';

// Extend the DefaultRootState interface from react-redux
declare module 'react-redux' {
  interface DefaultRootState {
    theme: typeof THEME_CONFIG;
    auth: {
      token: string | null;
      user: any;
      loading: boolean;
      redirect: string;
      message: string;
    };
    // Add other slices as needed
  }
}
