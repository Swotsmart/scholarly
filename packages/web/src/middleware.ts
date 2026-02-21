/**
 * Next.js Edge Middleware — Site Password Protection
 *
 * Checks active protection rules and redirects unauthenticated visitors
 * to the /password-gate page. Users with bypass roles (via sp_roles cookie)
 * or a valid sp_access token skip the gate.
 *
 * Uses Web Crypto API (HMAC-SHA256) for token verification — Edge Runtime compatible.
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// Types
// ============================================================================

interface ProtectionRule {
  id: string;
  tenantId: string | null;
  scope: string;
  routePattern: string | null;
  hint: string | null;
  bypassRoles: string[];
  expiresAt: string | null;
}

// ============================================================================
// In-memory cache for protection rules
// ============================================================================

let cachedRules: ProtectionRule[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 60 seconds

async function getActiveRules(req: NextRequest): Promise<ProtectionRule[]> {
  const now = Date.now();
  if (cachedRules && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedRules;
  }

  try {
    // Build absolute URL from the incoming request
    const url = new URL('/api/site-protection/active', req.nextUrl.origin);
    const res = await fetch(url.toString(), {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      return cachedRules || [];
    }

    const data = await res.json();
    cachedRules = data.data || [];
    cacheTimestamp = now;
    return cachedRules!;
  } catch {
    return cachedRules || [];
  }
}

// ============================================================================
// Glob pattern → regex conversion
// ============================================================================

function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex specials except * and ?
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/\{\{GLOBSTAR\}\}/g, '.*');
  return new RegExp(`^${escaped}$`);
}

// ============================================================================
// HMAC token verification (Web Crypto API)
// ============================================================================

async function verifyToken(
  token: string,
  secret: string
): Promise<{ pids: string[]; exp: number } | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, sigB64] = parts;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Convert base64url to Uint8Array
    const sigStr = sigB64.replace(/-/g, '+').replace(/_/g, '/');
    const sigBinary = atob(sigStr);
    const sigBytes = new Uint8Array(sigBinary.length);
    for (let i = 0; i < sigBinary.length; i++) {
      sigBytes[i] = sigBinary.charCodeAt(i);
    }

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      encoder.encode(payloadB64)
    );

    if (!valid) return null;

    // Decode payload
    const payloadStr = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadStr);

    // Check expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// ============================================================================
// Middleware
// ============================================================================

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Fetch active rules
  const rules = await getActiveRules(req);
  if (rules.length === 0) {
    return NextResponse.next();
  }

  // 2. Match rules: site-wide first, then route patterns
  const matchedRule = findMatchingRule(rules, pathname);
  if (!matchedRule) {
    return NextResponse.next();
  }

  // 3. RBAC bypass via sp_roles cookie
  const rolesStr = req.cookies.get('sp_roles')?.value;
  if (rolesStr) {
    try {
      const roles: string[] = JSON.parse(rolesStr);
      // platform_admin always bypasses
      if (roles.includes('platform_admin')) {
        return NextResponse.next();
      }
      // Check rule-specific bypass roles
      if (matchedRule.bypassRoles.some((r) => roles.includes(r))) {
        return NextResponse.next();
      }
    } catch {
      // Invalid cookie, continue to password check
    }
  }

  // 4. Check sp_access cookie for valid HMAC token
  const secret =
    process.env.SITE_PROTECTION_SECRET || 'dev-site-protection-secret-change-me';
  const accessToken = req.cookies.get('sp_access')?.value;
  if (accessToken) {
    const payload = await verifyToken(accessToken, secret);
    if (payload && payload.pids.includes(matchedRule.id)) {
      return NextResponse.next();
    }
  }

  // 5. Redirect to password gate
  const gateUrl = new URL('/password-gate', req.nextUrl.origin);
  gateUrl.searchParams.set('protectionId', matchedRule.id);
  gateUrl.searchParams.set('returnTo', pathname);
  if (matchedRule.hint) {
    gateUrl.searchParams.set('hint', matchedRule.hint);
  }

  return NextResponse.redirect(gateUrl);
}

function findMatchingRule(
  rules: ProtectionRule[],
  pathname: string
): ProtectionRule | null {
  // Site-wide rules first
  const siteRule = rules.find((r) => r.scope === 'site');
  if (siteRule) return siteRule;

  // Route pattern rules
  for (const rule of rules) {
    if (rule.scope === 'route_pattern' && rule.routePattern) {
      const regex = globToRegex(rule.routePattern);
      if (regex.test(pathname)) {
        return rule;
      }
    }
  }

  return null;
}

// ============================================================================
// Matcher — skip static assets, API routes, and the password gate itself
// ============================================================================

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|api/|password-gate).*)'],
};
