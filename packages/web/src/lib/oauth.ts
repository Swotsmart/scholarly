/**
 * OAuth Authentication Service
 * Handles Google, Microsoft, and Apple Sign-In
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export type OAuthProvider = 'google' | 'microsoft' | 'apple';

interface OAuthConfig {
  google: {
    clientId: string;
    redirectUri: string;
    scope: string;
  };
  microsoft: {
    clientId: string;
    redirectUri: string;
    scope: string;
    tenant: string;
  };
  apple: {
    clientId: string;
    redirectUri: string;
    scope: string;
  };
}

// OAuth configuration - in production these would come from environment variables
const getOAuthConfig = (): OAuthConfig => ({
  google: {
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    redirectUri: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback/google`,
    scope: 'openid email profile',
  },
  microsoft: {
    clientId: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || '',
    redirectUri: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback/microsoft`,
    scope: 'openid email profile User.Read',
    tenant: 'common', // Use 'common' for multi-tenant
  },
  apple: {
    clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || '',
    redirectUri: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback/apple`,
    scope: 'name email',
  },
});

/**
 * Generate a random state parameter for OAuth security
 */
function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Store state in sessionStorage for verification
 */
function storeState(provider: OAuthProvider, state: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(`oauth_state_${provider}`, state);
  }
}

/**
 * Verify state from callback
 */
export function verifyState(provider: OAuthProvider, state: string): boolean {
  if (typeof window !== 'undefined') {
    const storedState = sessionStorage.getItem(`oauth_state_${provider}`);
    sessionStorage.removeItem(`oauth_state_${provider}`);
    return storedState === state;
  }
  return false;
}

/**
 * Get Google OAuth URL
 */
function getGoogleAuthUrl(): string {
  const config = getOAuthConfig().google;
  const state = generateState();
  storeState('google', state);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scope,
    state,
    access_type: 'offline',
    prompt: 'select_account',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/**
 * Get Microsoft OAuth URL
 */
function getMicrosoftAuthUrl(): string {
  const config = getOAuthConfig().microsoft;
  const state = generateState();
  storeState('microsoft', state);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scope,
    state,
    response_mode: 'query',
  });

  return `https://login.microsoftonline.com/${config.tenant}/oauth2/v2.0/authorize?${params}`;
}

/**
 * Get Apple OAuth URL
 */
function getAppleAuthUrl(): string {
  const config = getOAuthConfig().apple;
  const state = generateState();
  storeState('apple', state);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code id_token',
    scope: config.scope,
    state,
    response_mode: 'form_post',
  });

  return `https://appleid.apple.com/auth/authorize?${params}`;
}

/**
 * Initiate OAuth flow for a provider
 */
export function initiateOAuth(provider: OAuthProvider): void {
  if (DEMO_MODE) {
    // In demo mode, simulate OAuth by redirecting to callback with mock data
    const mockCode = `demo_${provider}_${Date.now()}`;
    const mockState = 'demo_state';

    // Store mock state
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`oauth_state_${provider}`, mockState);

      // Redirect to callback with mock data
      window.location.href = `/auth/callback/${provider}?code=${mockCode}&state=${mockState}`;
    }
    return;
  }

  let authUrl: string;

  switch (provider) {
    case 'google':
      authUrl = getGoogleAuthUrl();
      break;
    case 'microsoft':
      authUrl = getMicrosoftAuthUrl();
      break;
    case 'apple':
      authUrl = getAppleAuthUrl();
      break;
    default:
      throw new Error(`Unknown OAuth provider: ${provider}`);
  }

  // Redirect to OAuth provider
  if (typeof window !== 'undefined') {
    window.location.href = authUrl;
  }
}

/**
 * Exchange OAuth code for tokens (called from callback page)
 */
export async function exchangeOAuthCode(
  provider: OAuthProvider,
  code: string,
  state: string
): Promise<{ success: boolean; user?: any; accessToken?: string; error?: string }> {
  // Verify state
  if (!DEMO_MODE && !verifyState(provider, state)) {
    return { success: false, error: 'Invalid state parameter' };
  }

  if (DEMO_MODE) {
    // In demo mode, return mock user based on provider
    const mockUsers: Record<OAuthProvider, any> = {
      google: {
        id: `user_google_${Date.now()}`,
        email: 'demo.user@gmail.com',
        firstName: 'Demo',
        lastName: 'User',
        role: 'learner',
        avatarUrl: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
      },
      microsoft: {
        id: `user_microsoft_${Date.now()}`,
        email: 'demo.user@outlook.com',
        firstName: 'Demo',
        lastName: 'User',
        role: 'learner',
        avatarUrl: undefined,
      },
      apple: {
        id: `user_apple_${Date.now()}`,
        email: 'demo.user@icloud.com',
        firstName: 'Demo',
        lastName: 'User',
        role: 'learner',
        avatarUrl: undefined,
      },
    };

    return {
      success: true,
      user: mockUsers[provider],
      accessToken: `demo_token_${provider}_${Date.now()}`,
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/oauth/${provider}/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state }),
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'OAuth authentication failed' };
    }

    return { success: true, user: data.user, accessToken: data.accessToken };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error during OAuth',
    };
  }
}

/**
 * Check if OAuth providers are configured
 */
export function isOAuthConfigured(provider: OAuthProvider): boolean {
  if (DEMO_MODE) return true; // Always available in demo mode

  const config = getOAuthConfig();
  switch (provider) {
    case 'google':
      return !!config.google.clientId;
    case 'microsoft':
      return !!config.microsoft.clientId;
    case 'apple':
      return !!config.apple.clientId;
    default:
      return false;
  }
}

export default {
  initiateOAuth,
  exchangeOAuthCode,
  verifyState,
  isOAuthConfigured,
};
