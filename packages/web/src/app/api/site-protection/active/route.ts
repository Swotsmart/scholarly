/**
 * Site Protection Active Rules Proxy
 *
 * Proxies to the Express API to return active protection rules.
 * Used by the middleware to determine which routes are protected.
 */

import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export async function GET() {
  try {
    const upstream = await fetch(`${API_URL}/site-protection/active`, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    // If API is unreachable, return empty rules (don't block the site)
    return NextResponse.json({ success: true, data: [] });
  }
}
