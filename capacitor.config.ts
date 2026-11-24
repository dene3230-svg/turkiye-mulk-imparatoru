interface CapacitorServerConfig {
  url?: string;
  cleartext?: boolean;
  androidScheme?: string;
  errorPath?: string;
  allowNavigation?: string[];
}

interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  server?: CapacitorServerConfig;
  android?: {
    allowMixedContent?: boolean;
    backgroundColor?: string;
    captureInput?: boolean;
  };
  plugins?: Record<string, Record<string, unknown>>;
}

const config: CapacitorConfig = {
  appId: 'com.fugames.turkiyemulkimparatoru',
  appName: 'Türkiye Mülk İmparatoru',
  webDir: 'dist',
  server: {
    url: 'https://dene3230-svg.github.io/turkiye-mulk-imparatoru/',
    cleartext: true,
    androidScheme: 'https',
    errorPath: 'index.html',
    allowNavigation: [
      '*.supabase.co',
      'accounts.google.com',
      '*.openstreetmap.org',
      '*.basemaps.cartocdn.com',
      'dene3230-svg.github.io',
    ],
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0F172A',
    captureInput: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#D97706',
      sound: 'default',
    },
  },
};

export default config;
