import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.runitownit.app',
  appName: 'RunItOwnIt',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;