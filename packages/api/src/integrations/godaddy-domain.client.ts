/**
 * ============================================================================
 * Scholarly Platform — GoDaddy Domain Client
 * ============================================================================
 *
 * Wraps the GoDaddy Domain API (v1) for domain lifecycle management during
 * tutor onboarding. Think of this as a specialised estate agent for web
 * addresses: it checks if the address you want is available, suggests
 * alternatives if not, handles the purchase paperwork, and then updates the
 * mailbox (DNS) to point visitors to your new home on Scholarly.
 *
 * The GoDaddy API uses OTE (Operational Test Environment) for sandbox testing
 * and production for live purchases. The environment is controlled by the
 * base URL — the same API key format works for both.
 *
 * ## Environment Variables
 *   GODADDY_API_KEY      — Your GoDaddy API key
 *   GODADDY_API_SECRET   — Your GoDaddy API secret
 *   GODADDY_ENVIRONMENT  — 'production' | 'ote' (default: 'ote')
 *
 * ## Endpoints Used
 *   GET  /v1/domains/available       — Check domain availability
 *   GET  /v1/domains/suggest         — Get domain suggestions
 *   POST /v1/domains/purchase        — Purchase a domain
 *   GET  /v1/domains/{domain}        — Get domain details
 *   PATCH /v1/domains/{domain}/records — Update DNS records
 *   PUT  /v1/domains/{domain}/records/{type}/{name} — Set specific DNS record
 *
 * @module scholarly/integrations/godaddy-domain
 * @version 1.0.0
 */

import type { Result, ServiceError } from './stripe-connect.client';
import { success, failure, Errors } from './stripe-connect.client';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface GoDaddyConfig {
  apiKey: string;
  apiSecret: string;
  /** 'production' for live purchases, 'ote' for sandbox testing. */
  environment: 'production' | 'ote';
  /** Override base URL (useful for mocking in tests). */
  baseUrl?: string | undefined;
}

const BASE_URLS = {
  production: 'https://api.godaddy.com',
  ote: 'https://api.ote-godaddy.com',
} as const;

// ============================================================================
// DOMAIN TYPES
// ============================================================================

export interface DomainAvailability {
  domain: string;
  available: boolean;
  /** Price in micro-units (millionths of the currency). Divide by 1_000_000. */
  priceMicros: number;
  currency: string;
  /** Price in human-readable dollars. */
  priceFormatted: string;
  /** Registration period in years. */
  periodYears: number;
}

export interface DomainSuggestion {
  domain: string;
  priceMicros: number;
  currency: string;
  priceFormatted: string;
}

export interface DomainPurchaseResult {
  domain: string;
  orderId: string;
  /** When the domain registration expires. */
  expiresAt: string;
  /** Whether auto-renew is enabled. */
  autoRenew: boolean;
}

export interface DomainDetails {
  domain: string;
  status: 'ACTIVE' | 'PENDING' | 'CANCELLED' | 'EXPIRED' | 'TRANSFERRED_OUT';
  expiresAt: string;
  autoRenew: boolean;
  nameServers: string[];
  locked: boolean;
}

export interface DnsRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SRV';
  name: string;
  data: string;
  ttl: number;
  priority?: number | undefined;
}

/** Contact info required for domain registration. */
export interface DomainContact {
  nameFirst: string;
  nameLast: string;
  email: string;
  phone: string;
  addressMailing: {
    address1: string;
    address2?: string | undefined;
    city: string;
    state: string;
    postalCode: string;
    country: string; // ISO 3166 two-letter code
  };
}

// ============================================================================
// CLIENT IMPLEMENTATION
// ============================================================================

export class GoDaddyDomainClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(private readonly config: GoDaddyConfig) {
    this.baseUrl = config.baseUrl ?? BASE_URLS[config.environment];
    this.headers = {
      'Authorization': `sso-key ${config.apiKey}:${config.apiSecret}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  // ── Availability Check ──────────────────────────────────────────────────

  /**
   * Check if a specific domain is available for purchase.
   *
   * This is the first call in the onboarding domain step. The tutor
   * types "erudits.com.au" and we instantly tell them if it's available
   * and how much it costs.
   */
  async checkAvailability(domain: string): Promise<Result<DomainAvailability>> {
    try {
      const response = await this.fetch(
        `/v1/domains/available?domain=${encodeURIComponent(domain)}&checkType=FAST`,
      );

      if (!response.ok) {
        const error = await this.parseError(response);
        return failure(error);
      }

      const data = await response.json() as {
        available: boolean;
        domain: string;
        price?: number;
        currency?: string;
        period?: number;
      };

      const priceMicros = data.price ?? 0;
      const currency = data.currency ?? 'USD';

      return success({
        domain: data.domain,
        available: data.available,
        priceMicros,
        currency,
        priceFormatted: this.formatPrice(priceMicros, currency),
        periodYears: data.period ?? 1,
      });
    } catch (err) {
      return failure(Errors.external('GoDaddy', (err as Error).message));
    }
  }

  // ── Domain Suggestions ──────────────────────────────────────────────────

  /**
   * Get alternative domain suggestions based on keywords.
   *
   * When "erudits.com" is taken, we suggest "erudits.com.au", "erudits.io",
   * "eruditsfrench.com", etc. The tutor picks their favourite from the list.
   */
  async suggestDomains(
    query: string,
    options?: {
      tlds?: string[];
      limit?: number;
      country?: string;
    },
  ): Promise<Result<DomainSuggestion[]>> {
    try {
      const params = new URLSearchParams({
        query,
        limit: String(options?.limit ?? 10),
      });

      if (options?.tlds?.length) {
        params.set('tlds', options.tlds.join(','));
      }
      if (options?.country) {
        params.set('country', options.country);
      }

      const response = await this.fetch(`/v1/domains/suggest?${params.toString()}`);

      if (!response.ok) {
        const error = await this.parseError(response);
        return failure(error);
      }

      const data = await response.json() as Array<{
        domain: string;
        price?: number;
        currency?: string;
      }>;

      return success(
        data.map(d => ({
          domain: d.domain,
          priceMicros: d.price ?? 0,
          currency: d.currency ?? 'USD',
          priceFormatted: this.formatPrice(d.price ?? 0, d.currency ?? 'USD'),
        })),
      );
    } catch (err) {
      return failure(Errors.external('GoDaddy', (err as Error).message));
    }
  }

  // ── Domain Purchase ─────────────────────────────────────────────────────

  /**
   * Purchase a domain for the tutor.
   *
   * This is the point of no financial return — Scholarly pays for the
   * domain on behalf of the tutor, and the cost is either absorbed into
   * the subscription or billed separately. The domain is registered under
   * Scholarly's registrant account but the tutor is listed as the
   * administrative contact.
   *
   * In OTE (test environment), this simulates the purchase without
   * actually spending money.
   */
  async purchaseDomain(
    domain: string,
    contact: DomainContact,
    options?: {
      periodYears?: number;
      autoRenew?: boolean;
      privacy?: boolean;
      nameServers?: string[];
    },
  ): Promise<Result<DomainPurchaseResult>> {
    try {
      const body = {
        domain,
        consent: {
          agreedAt: new Date().toISOString(),
          agreedBy: contact.email,
          agreementKeys: ['DNRA'], // Domain Name Registration Agreement
        },
        contactAdmin: this.formatContact(contact),
        contactBilling: this.formatContact(contact),
        contactRegistrant: this.formatContact(contact),
        contactTech: this.formatContact(contact),
        period: options?.periodYears ?? 1,
        renewAuto: options?.autoRenew ?? true,
        privacy: options?.privacy ?? true,
        nameServers: options?.nameServers ?? undefined,
      };

      const response = await this.fetch('/v1/domains/purchase', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await this.parseError(response);
        return failure(error);
      }

      const data = await response.json() as {
        orderId: number;
        itemCount: number;
      };

      // GoDaddy doesn't return the domain details in the purchase response,
      // so we fetch them separately.
      const details = await this.getDomainDetails(domain);
      const expiresAt = details.success ? details.data.expiresAt : new Date(
        Date.now() + (options?.periodYears ?? 1) * 365 * 24 * 60 * 60 * 1000,
      ).toISOString();

      return success({
        domain,
        orderId: String(data.orderId),
        expiresAt,
        autoRenew: options?.autoRenew ?? true,
      });
    } catch (err) {
      return failure(Errors.external('GoDaddy', (err as Error).message));
    }
  }

  // ── Domain Details ──────────────────────────────────────────────────────

  /**
   * Get current details for a domain we own.
   */
  async getDomainDetails(domain: string): Promise<Result<DomainDetails>> {
    try {
      const response = await this.fetch(`/v1/domains/${encodeURIComponent(domain)}`);

      if (!response.ok) {
        const error = await this.parseError(response);
        return failure(error);
      }

      const data = await response.json() as {
        domain: string;
        status: string;
        expires: string;
        renewAuto: boolean;
        nameServers: string[];
        locked: boolean;
      };

      return success({
        domain: data.domain,
        status: data.status as DomainDetails['status'],
        expiresAt: data.expires,
        autoRenew: data.renewAuto,
        nameServers: data.nameServers ?? [],
        locked: data.locked,
      });
    } catch (err) {
      return failure(Errors.external('GoDaddy', (err as Error).message));
    }
  }

  // ── DNS Management ──────────────────────────────────────────────────────

  /**
   * Update DNS records for a domain.
   *
   * Used during onboarding Step 4 to point the tutor's custom domain
   * at Scholarly's infrastructure:
   *
   *   CNAME  erudits.com → erudits-com.ssl.scholar.ly
   *   TXT    _scholarly-verify.erudits.com → scholarly-verify=<sessionId>
   *
   * This is also used during migration Stage 6 (DNS cutover) to switch
   * the domain from Squarespace to Scholarly.
   */
  async updateDnsRecords(
    domain: string,
    records: DnsRecord[],
  ): Promise<Result<{ updated: number }>> {
    try {
      const body = records.map(r => ({
        type: r.type,
        name: r.name,
        data: r.data,
        ttl: r.ttl,
        ...(r.priority !== undefined ? { priority: r.priority } : {}),
      }));

      const response = await this.fetch(
        `/v1/domains/${encodeURIComponent(domain)}/records`,
        {
          method: 'PATCH',
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const error = await this.parseError(response);
        return failure(error);
      }

      return success({ updated: records.length });
    } catch (err) {
      return failure(Errors.external('GoDaddy', (err as Error).message));
    }
  }

  /**
   * Set a specific DNS record by type and name.
   *
   * Overwrites any existing records of the same type and name.
   * Useful for setting a single CNAME or TXT record without
   * affecting others.
   */
  async setDnsRecord(
    domain: string,
    record: DnsRecord,
  ): Promise<Result<void>> {
    try {
      const body = [{
        data: record.data,
        ttl: record.ttl,
        ...(record.priority !== undefined ? { priority: record.priority } : {}),
      }];

      const response = await this.fetch(
        `/v1/domains/${encodeURIComponent(domain)}/records/${record.type}/${record.name}`,
        {
          method: 'PUT',
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const error = await this.parseError(response);
        return failure(error);
      }

      return success(undefined);
    } catch (err) {
      return failure(Errors.external('GoDaddy', (err as Error).message));
    }
  }

  /**
   * Initiate a domain transfer into Scholarly's GoDaddy account.
   *
   * Used when a tutor already owns a domain at another registrar
   * (e.g., Namecheap, Cloudflare). The tutor provides their auth/EPP
   * code and we start the transfer process.
   *
   * Transfers typically take 5–7 days due to ICANN regulations.
   */
  async initiateTransfer(
    domain: string,
    authCode: string,
    contact: DomainContact,
    options?: { periodYears?: number },
  ): Promise<Result<{ orderId: string; estimatedCompletionDays: number }>> {
    try {
      const body = {
        authCode,
        consent: {
          agreedAt: new Date().toISOString(),
          agreedBy: contact.email,
          agreementKeys: ['DNTA'], // Domain Name Transfer Agreement
        },
        contactAdmin: this.formatContact(contact),
        contactBilling: this.formatContact(contact),
        contactRegistrant: this.formatContact(contact),
        contactTech: this.formatContact(contact),
        period: options?.periodYears ?? 1,
        privacy: true,
        renewAuto: true,
      };

      const response = await this.fetch(
        `/v1/domains/${encodeURIComponent(domain)}/transfer`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const error = await this.parseError(response);
        return failure(error);
      }

      const data = await response.json() as { orderId: number };

      return success({
        orderId: String(data.orderId),
        estimatedCompletionDays: 7,
      });
    } catch (err) {
      return failure(Errors.external('GoDaddy', (err as Error).message));
    }
  }

  // ── Private Helpers ──────────────────────────────────────────────────────

  private async fetch(
    path: string,
    init?: RequestInit,
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    return globalThis.fetch(url, {
      ...init,
      headers: {
        ...this.headers,
        ...(init?.headers as Record<string, string> ?? {}),
      },
    });
  }

  private async parseError(response: Response): Promise<ServiceError> {
    try {
      const body = await response.json() as { code?: string; message?: string };
      const code = body.code ?? 'GODADDY_ERROR';
      const message = body.message ?? `GoDaddy API returned ${response.status}`;

      if (response.status === 404) {
        return Errors.notFound('Domain', message);
      }
      if (response.status === 422) {
        return Errors.validation(`GoDaddy: ${message}`);
      }
      if (response.status === 429) {
        return Errors.rateLimited(`GoDaddy: ${message}`);
      }

      return Errors.external('GoDaddy', `[${code}] ${message}`);
    } catch {
      return Errors.external('GoDaddy', `HTTP ${response.status}: ${response.statusText}`);
    }
  }

  private formatContact(contact: DomainContact): Record<string, unknown> {
    return {
      nameFirst: contact.nameFirst,
      nameLast: contact.nameLast,
      email: contact.email,
      phone: contact.phone,
      addressMailing: {
        address1: contact.addressMailing.address1,
        ...(contact.addressMailing.address2 ? { address2: contact.addressMailing.address2 } : {}),
        city: contact.addressMailing.city,
        state: contact.addressMailing.state,
        postalCode: contact.addressMailing.postalCode,
        country: contact.addressMailing.country,
      },
    };
  }

  /**
   * Format price from micro-units to human-readable string.
   * GoDaddy prices are in micro-units (millionths): 14990000 = $14.99
   */
  private formatPrice(micros: number, currency: string): string {
    const amount = micros / 1_000_000;
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency,
    }).format(amount);
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createGoDaddyDomainClient(config: GoDaddyConfig): GoDaddyDomainClient {
  return new GoDaddyDomainClient(config);
}
