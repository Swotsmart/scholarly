/**
 * Scholarly UC 4.0 — HubSpot CRM Provider
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  SPEAKING HUBSPOT'S LANGUAGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Where Salesforce is the enterprise battleship, HubSpot is the modern
 * frigate: faster to deploy, cleaner API design, more approachable for
 * SMBs. Its CRM API v3 uses standard REST patterns with JSON filter
 * bodies for searching — no proprietary query language like SOQL.
 *
 * The object mapping is slightly different from Salesforce:
 *
 *   CrmContact → Contact object
 *   CrmAccount → Company object
 *   CrmActivity → Engagement (type: CALL)
 *   CrmDeal → Deal object
 *
 * Authentication supports both OAuth 2.0 (for marketplace apps) and
 * Private App tokens (api_key auth type — simpler for single-tenant).
 *
 * Key HubSpot API patterns:
 *   - Search: POST /crm/v3/objects/contacts/search with filter groups
 *   - CRUD: GET/POST /crm/v3/objects/contacts/{id}
 *   - Engagements: POST /crm/v3/objects/calls (for call logging)
 *   - Associations: POST /crm/v4/objects/calls/{id}/associations/contacts
 */

import type {
  CrmProvider, CrmProviderConfig, CrmContact, CrmAccount,
  CrmActivity, CrmDeal, CrmOAuthConfig, CrmApiKeyConfig,
} from '../types';

const HS_BASE = 'https://api.hubapi.com';

export class HubSpotProvider implements CrmProvider {
  readonly providerId = 'hubspot';
  readonly providerName = 'HubSpot';

  private config!: CrmProviderConfig;
  private accessToken = '';
  private authType: 'oauth2' | 'api_key' = 'api_key';
  private oauthConfig?: CrmOAuthConfig;

  async initialize(config: CrmProviderConfig): Promise<void> {
    this.config = config;

    if (config.auth.type === 'oauth2') {
      this.authType = 'oauth2';
      this.oauthConfig = config.auth as CrmOAuthConfig;
      this.accessToken = this.oauthConfig.accessToken || '';

      if (this.oauthConfig.refreshToken && (!this.accessToken || this.isTokenExpired())) {
        await this.refreshAccessToken();
      }
    } else {
      this.authType = 'api_key';
      this.accessToken = (config.auth as CrmApiKeyConfig).apiKey;
    }
  }

  async testConnection(): Promise<{ connected: boolean; error?: string; details?: string }> {
    try {
      const result = await this.hsRequest<any>('/crm/v3/objects/contacts?limit=1');
      return {
        connected: true,
        details: `Connected to HubSpot. Total contacts accessible: ${result?.total || 'unknown'}`,
      };
    } catch (err: any) {
      return { connected: false, error: err.message };
    }
  }

  // ── Contact Lookup ──────────────────────────────────────────────

  async lookupByPhone(phone: string): Promise<CrmContact | null> {
    const normalised = phone.replace(/[\s\-\(\)]/g, '');

    // HubSpot search API with phone filter
    const result = await this.hsSearch('contacts', {
      filterGroups: [
        {
          filters: [
            { propertyName: 'phone', operator: 'CONTAINS_TOKEN', value: normalised },
          ],
        },
        {
          filters: [
            { propertyName: 'mobilephone', operator: 'CONTAINS_TOKEN', value: normalised },
          ],
        },
      ],
      properties: this.contactProperties(),
      limit: 1,
    });

    if (result.length === 0) return null;
    return this.mapHsContactToUniversal(result[0]);
  }

  async lookupByEmail(email: string): Promise<CrmContact | null> {
    const result = await this.hsSearch('contacts', {
      filterGroups: [{
        filters: [
          { propertyName: 'email', operator: 'EQ', value: email },
        ],
      }],
      properties: this.contactProperties(),
      limit: 1,
    });

    if (result.length === 0) return null;
    return this.mapHsContactToUniversal(result[0]);
  }

  async lookupById(id: string): Promise<CrmContact | null> {
    try {
      const props = this.contactProperties().join(',');
      const record = await this.hsRequest<any>(
        `/crm/v3/objects/contacts/${id}?properties=${props}`
      );
      return this.mapHsContactToUniversal(record);
    } catch {
      return null;
    }
  }

  async searchContacts(query: string, limit: number = 10): Promise<CrmContact[]> {
    // HubSpot full-text search
    try {
      const result = await this.hsRequest<any>('/crm/v3/objects/contacts/search', 'POST', {
        query,
        properties: this.contactProperties(),
        limit,
      });
      return (result?.results || []).map((r: any) => this.mapHsContactToUniversal(r));
    } catch {
      return [];
    }
  }

  // ── Account (Company) Lookup ────────────────────────────────────

  async getAccount(id: string): Promise<CrmAccount | null> {
    try {
      const record = await this.hsRequest<any>(
        `/crm/v3/objects/companies/${id}?properties=name,industry,website,phone,numberofemployees,annualrevenue,address,city,state,zip,country`
      );
      const props = record.properties || {};
      return {
        id: record.id,
        provider: 'hubspot',
        name: props.name || '',
        industry: props.industry,
        website: props.website,
        phone: props.phone,
        billingAddress: props.address ? {
          street: props.address,
          city: props.city,
          state: props.state,
          postalCode: props.zip,
          country: props.country,
        } : undefined,
        size: props.numberofemployees,
        revenue: props.annualrevenue ? parseFloat(props.annualrevenue) : undefined,
        recordUrl: `https://app.hubspot.com/contacts/${this.getPortalId()}/company/${record.id}`,
      };
    } catch {
      return null;
    }
  }

  // ── Activity (Engagement) Logging ───────────────────────────────

  async logActivity(activity: CrmActivity): Promise<{ id: string; success: boolean; error?: string }> {
    try {
      if (activity.type === 'CALL') {
        return this.logCallEngagement(activity);
      } else if (activity.type === 'EMAIL') {
        return this.logEmailEngagement(activity);
      } else if (activity.type === 'NOTE') {
        return this.logNoteEngagement(activity);
      } else {
        // Default: log as a note
        return this.logNoteEngagement(activity);
      }
    } catch (err: any) {
      return { id: '', success: false, error: err.message };
    }
  }

  private async logCallEngagement(activity: CrmActivity): Promise<{ id: string; success: boolean; error?: string }> {
    // HubSpot v3: Create a call engagement
    const body = activity.description || '';
    let fullBody = body;

    // Append UC references
    if (activity.ucReferences) {
      const refs = activity.ucReferences;
      fullBody += '\n\n--- UC Platform References ---';
      if (refs.callId) fullBody += `\nCall ID: ${refs.callId}`;
      if (refs.interactionId) fullBody += `\nInteraction ID: ${refs.interactionId}`;
      if (refs.recordingUrl) fullBody += `\nRecording: ${refs.recordingUrl}`;
      if (refs.transcriptUrl) fullBody += `\nTranscript: ${refs.transcriptUrl}`;
    }

    const callData: Record<string, any> = {
      properties: {
        hs_call_title: activity.subject,
        hs_call_body: fullBody,
        hs_call_status: 'COMPLETED',
        hs_call_duration: activity.durationSeconds ? String(activity.durationSeconds * 1000) : '0', // HubSpot uses milliseconds
        hs_call_direction: activity.direction || 'OUTBOUND',
        hs_call_disposition: this.mapDisposition(activity.disposition),
        hs_timestamp: new Date(activity.activityDate).getTime(),
      },
    };

    if (activity.crmUserId) {
      callData.properties.hubspot_owner_id = activity.crmUserId;
    }

    const result = await this.hsRequest<any>('/crm/v3/objects/calls', 'POST', callData);
    const callId = result.id;

    // Associate with contact
    if (activity.contactId && callId) {
      await this.associateCall(callId, 'contacts', activity.contactId);
    }

    // Associate with company
    if (activity.accountId && callId) {
      await this.associateCall(callId, 'companies', activity.accountId);
    }

    // Associate with deal
    if (activity.dealId && callId) {
      await this.associateCall(callId, 'deals', activity.dealId);
    }

    return { id: callId, success: true };
  }

  private async logEmailEngagement(activity: CrmActivity): Promise<{ id: string; success: boolean; error?: string }> {
    const emailData = {
      properties: {
        hs_email_subject: activity.subject,
        hs_email_text: activity.description,
        hs_email_status: 'SENT',
        hs_email_direction: activity.direction || 'OUTBOUND',
        hs_timestamp: new Date(activity.activityDate).getTime(),
      },
    };

    const result = await this.hsRequest<any>('/crm/v3/objects/emails', 'POST', emailData);
    if (activity.contactId && result.id) {
      await this.associateEngagement(result.id, 'emails', 'contacts', activity.contactId);
    }
    return { id: result.id, success: true };
  }

  private async logNoteEngagement(activity: CrmActivity): Promise<{ id: string; success: boolean; error?: string }> {
    const noteData = {
      properties: {
        hs_note_body: `${activity.subject}\n\n${activity.description}`,
        hs_timestamp: new Date(activity.activityDate).getTime(),
      },
    };

    const result = await this.hsRequest<any>('/crm/v3/objects/notes', 'POST', noteData);
    if (activity.contactId && result.id) {
      await this.associateEngagement(result.id, 'notes', 'contacts', activity.contactId);
    }
    return { id: result.id, success: true };
  }

  private mapDisposition(disposition?: string): string {
    if (!disposition) return '9d9162e7-6cf3-4944-bf63-4dff82258764'; // "Connected"
    const map: Record<string, string> = {
      'connected': '9d9162e7-6cf3-4944-bf63-4dff82258764',
      'no-answer': 'f240bbac-87c9-4f6e-bf70-924b57d47db7',
      'busy': '73a0d17f-1163-4015-bdd5-ec830791da20',
      'voicemail': 'a4c4c377-d246-4b32-a13b-75a56a4cd0ff',
      'wrong-number': 'b2cf5968-551e-4856-9783-52b3da59a7d0',
    };
    return map[disposition.toLowerCase()] || disposition;
  }

  private async associateCall(callId: string, objectType: string, objectId: string): Promise<void> {
    try {
      await this.hsRequest(
        `/crm/v4/objects/calls/${callId}/associations/${objectType}/${objectId}`,
        'PUT',
        [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: objectType === 'contacts' ? 194 : objectType === 'companies' ? 182 : 206 }],
      );
    } catch {
      // Association failure is non-fatal
    }
  }

  private async associateEngagement(engagementId: string, engagementType: string, objectType: string, objectId: string): Promise<void> {
    try {
      await this.hsRequest(
        `/crm/v4/objects/${engagementType}/${engagementId}/associations/${objectType}/${objectId}`,
        'PUT',
        [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }],
      );
    } catch {
      // Non-fatal
    }
  }

  // ── Deal Lookup ─────────────────────────────────────────────────

  async getOpenDeals(contactId: string): Promise<CrmDeal[]> {
    try {
      // Get associated deals
      const assoc = await this.hsRequest<any>(
        `/crm/v4/objects/contacts/${contactId}/associations/deals`
      );

      const dealIds = (assoc?.results || []).map((a: any) => a.toObjectId);
      if (dealIds.length === 0) return [];

      // Batch read deals
      const result = await this.hsRequest<any>('/crm/v3/objects/deals/batch/read', 'POST', {
        inputs: dealIds.map((id: string) => ({ id })),
        properties: ['dealname', 'dealstage', 'amount', 'closedate', 'hubspot_owner_id', 'hs_is_closed'],
      });

      return (result?.results || [])
        .filter((d: any) => d.properties.hs_is_closed !== 'true')
        .map((d: any) => ({
          id: d.id,
          provider: 'hubspot',
          name: d.properties.dealname || '',
          stage: d.properties.dealstage || '',
          amount: d.properties.amount ? parseFloat(d.properties.amount) : undefined,
          contactId,
          ownerId: d.properties.hubspot_owner_id,
          closeDate: d.properties.closedate,
          recordUrl: `https://app.hubspot.com/contacts/${this.getPortalId()}/deal/${d.id}`,
        }));
    } catch {
      return [];
    }
  }

  // ── Recent Activities ───────────────────────────────────────────

  async getRecentActivities(contactId: string, limit: number = 5): Promise<CrmActivity[]> {
    try {
      // Get associated calls
      const assoc = await this.hsRequest<any>(
        `/crm/v4/objects/contacts/${contactId}/associations/calls`
      );

      const callIds = (assoc?.results || []).slice(0, limit).map((a: any) => a.toObjectId);
      if (callIds.length === 0) return [];

      const result = await this.hsRequest<any>('/crm/v3/objects/calls/batch/read', 'POST', {
        inputs: callIds.map((id: string) => ({ id })),
        properties: ['hs_call_title', 'hs_call_body', 'hs_call_duration', 'hs_call_direction', 'hs_call_disposition', 'hs_call_status', 'hs_timestamp'],
      });

      return (result?.results || []).map((c: any) => ({
        id: c.id,
        provider: 'hubspot',
        type: 'CALL' as const,
        subject: c.properties.hs_call_title || 'Call',
        description: c.properties.hs_call_body || '',
        direction: c.properties.hs_call_direction === 'INBOUND' ? 'INBOUND' : 'OUTBOUND',
        durationSeconds: c.properties.hs_call_duration ? parseInt(c.properties.hs_call_duration) / 1000 : undefined,
        disposition: c.properties.hs_call_disposition,
        contactId,
        activityDate: c.properties.hs_timestamp ? new Date(parseInt(c.properties.hs_timestamp)).toISOString() : new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  }

  // ── User (Owner) Mapping ────────────────────────────────────────

  async lookupUserByEmail(email: string): Promise<{ id: string; name: string; email: string } | null> {
    try {
      const result = await this.hsRequest<any>('/crm/v3/owners?email=' + encodeURIComponent(email));
      const owners = result?.results || [];
      if (owners.length === 0) return null;
      const owner = owners[0];
      return {
        id: owner.id,
        name: `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.email,
        email: owner.email,
      };
    } catch {
      return null;
    }
  }

  async shutdown(): Promise<void> {
    // No persistent connections
  }

  // ─── HubSpot API Helpers ──────────────────────────────────────────

  private async hsRequest<T>(path: string, method: string = 'GET', body?: any): Promise<T> {
    if (!this.accessToken) throw new Error('HubSpot access token not available');

    if (this.authType === 'oauth2' && this.isTokenExpired() && this.oauthConfig?.refreshToken) {
      await this.refreshAccessToken();
    }

    const url = `${HS_BASE}${path}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const fetchOptions: RequestInit = { method, headers };
    if (body) fetchOptions.body = JSON.stringify(body);

    const response = await fetch(url, fetchOptions);

    if (response.status === 401 && this.authType === 'oauth2' && this.oauthConfig?.refreshToken) {
      await this.refreshAccessToken();
      headers['Authorization'] = `Bearer ${this.accessToken}`;
      const retry = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
      if (!retry.ok) throw new Error(`HubSpot API error: ${retry.status} ${retry.statusText}`);
      return retry.json() as Promise<T>;
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HubSpot API error: ${response.status} ${errorBody}`);
    }

    if (response.status === 204) return {} as T;
    return response.json() as Promise<T>;
  }

  private async hsSearch(objectType: string, searchBody: any): Promise<any[]> {
    try {
      const result = await this.hsRequest<any>(
        `/crm/v3/objects/${objectType}/search`,
        'POST',
        searchBody,
      );
      return result?.results || [];
    } catch {
      return [];
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.oauthConfig?.refreshToken) throw new Error('No refresh token available');

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.oauthConfig.clientId,
      client_secret: this.oauthConfig.clientSecret,
      refresh_token: this.oauthConfig.refreshToken,
    });

    const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) throw new Error(`HubSpot token refresh failed: ${response.status}`);

    const data = await response.json() as any;
    this.accessToken = data.access_token;
    this.oauthConfig.accessToken = data.access_token;
    if (data.refresh_token) this.oauthConfig.refreshToken = data.refresh_token;
    this.oauthConfig.expiresAt = new Date(Date.now() + (data.expires_in || 21600) * 1000).toISOString();
  }

  private isTokenExpired(): boolean {
    if (!this.oauthConfig?.expiresAt) return false;
    return new Date(this.oauthConfig.expiresAt).getTime() - 300000 < Date.now();
  }

  private contactProperties(): string[] {
    return [
      'firstname', 'lastname', 'email', 'phone', 'mobilephone',
      'jobtitle', 'company', 'lifecyclestage', 'hubspot_owner_id',
      'createdate', 'lastmodifieddate', 'associatedcompanyid',
    ];
  }

  /** Extract portal ID from config or default. Used for record URLs. */
  private getPortalId(): string {
    return (this.config as any).portalId || 'portal';
  }

  // ─── Mapping Helpers ──────────────────────────────────────────────

  private mapHsContactToUniversal(hs: any): CrmContact {
    const props = hs.properties || {};
    return {
      id: hs.id,
      provider: 'hubspot',
      firstName: props.firstname,
      lastName: props.lastname,
      displayName: `${props.firstname || ''} ${props.lastname || ''}`.trim() || props.email || hs.id,
      email: props.email,
      phone: props.phone,
      mobilePhone: props.mobilephone,
      title: props.jobtitle,
      company: props.company,
      accountId: props.associatedcompanyid,
      ownerId: props.hubspot_owner_id,
      stage: props.lifecyclestage,
      createdAt: props.createdate,
      updatedAt: props.lastmodifieddate,
      recordUrl: `https://app.hubspot.com/contacts/${this.getPortalId()}/contact/${hs.id}`,
    };
  }
}

export default HubSpotProvider;
