import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import { ThemeSwitcherProvider } from 'react-css-theme-switcher';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

import store from './store';
import Layouts from './layouts';
import { THEME_CONFIG } from './configs/AppConfig';
import './lang';

const themes = {
  dark: `${process.env.PUBLIC_URL}/css/dark-theme.css`,
  light: `${process.env.PUBLIC_URL}/css/light-theme.css`,
};

function App() {

  // ✅ FIX STATUS BAR / NOTCH
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
    //  StatusBar.setOverlaysWebView({ overlay: false });
      StatusBar.setStyle({ style: Style.Dark }); // dark icons
    }
  }, []);

  return (
    <div className="App">
      <Provider store={store}>
        <HashRouter>
          <ThemeSwitcherProvider
            themeMap={themes}
            defaultTheme={THEME_CONFIG.currentTheme}
            insertionPoint="styles-insertion-point"
          >
            <Layouts />
          </ThemeSwitcherProvider>
        </HashRouter>
      </Provider>
    </div>
  );
}

export default App;
