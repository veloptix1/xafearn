import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.xafearn.app',
  appName: 'XAFEARN',
  webDir: 'out', // Next.js exporte dans le dossier 'out' par défaut
  server: {
    androidScheme: 'https'
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
