/**
 * Site Protection Verify Proxy
 *
 * Proxies password verification to the Express API, then sets
 * the sp_access cookie on the same origin so Next.js middleware can read it.
 */

import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const upstream = await fetch(`${API_URL}/site-protection/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await upstream.json();

  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status });
  }

  // Set sp_access cookie with the HMAC token so middleware can verify
  const res = NextResponse.json(data);
  res.cookies.set('sp_access', data.data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: data.data.expiresIn,
    path: '/',
  });

  return res;
}
