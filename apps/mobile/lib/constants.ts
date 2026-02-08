export const APP_NAME = 'Scholarly - Learn to Read';
export const APP_SLUG = 'scholarly-phonics';

export const BUNDLE_IDS = {
  ios: 'com.scholarly.phonics',
  android: 'app.scholarly.phonics',
} as const;

export const BASE_URL =
  'https://scholarly.bravefield-dce0abaf.australiaeast.azurecontainerapps.io';

export const WEBVIEW_URLS = {
  earlyYears: `${BASE_URL}/early-years`,
  phonicsForest: `${BASE_URL}/early-years/phonics-forest`,
  storyGarden: `${BASE_URL}/early-years/story-garden`,
  privacy: `${BASE_URL}/privacy`,
  support: `${BASE_URL}/support`,
} as const;

export const API_URL = 'https://scholarly.bravefield-dce0abaf.australiaeast.azurecontainerapps.io/api';

export const ALLOWED_DOMAINS = [
  'scholarly.bravefield-dce0abaf.australiaeast.azurecontainerapps.io',
] as const;

export const SUBSCRIPTION_TIERS = {
  explorer: {
    id: 'scholarly_explorer_monthly',
    name: 'Explorer',
    price: '$4.99/month',
    trialDays: 7,
    features: ['Phonics Forest', 'Story Garden', '1 child profile'],
  },
  scholar: {
    id: 'scholarly_scholar_monthly',
    name: 'Scholar',
    price: '$9.99/month',
    trialDays: 7,
    features: [
      'Everything in Explorer',
      'Up to 3 child profiles',
      'Progress reports',
      'Offline mode',
    ],
  },
  academy: {
    id: 'scholarly_academy_monthly',
    name: 'Academy',
    price: '$19.99/month',
    trialDays: 14,
    features: [
      'Everything in Scholar',
      'Unlimited child profiles',
      'AI tutor sessions',
      'Priority support',
    ],
  },
} as const;

export const COLORS = {
  primary: '#8839ef',
  primaryLight: '#cba6f7',
  accent: '#04a5e5',
  accentLight: '#89dceb',
  background: '#eff1f5',
  foreground: '#4c4f69',
  success: '#40a02b',
  warning: '#fe640b',
  destructive: '#d20f39',
  white: '#ffffff',
  black: '#000000',
} as const;
