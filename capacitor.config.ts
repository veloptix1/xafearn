import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.xafearn.app',
  appName: 'XAFEARN',
  webDir: 'public',
  server: {
    url: 'https://www.getagriculture.store',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0ea5e9",
      showSpinner: true,
      spinnerColor: "#ffffff"
    }
  }
};

export default config;
