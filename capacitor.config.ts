import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ferdian.cafepos',
  appName: 'Cafe POS',
  webDir: 'dist',
  android: {
    backgroundColor: '#f6efe8',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
