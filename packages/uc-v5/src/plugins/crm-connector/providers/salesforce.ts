/**
 * Scholarly UC 4.0 — Salesforce CRM Provider
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  SPEAKING SALESFORCE'S LANGUAGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Salesforce is the 800-pound gorilla of CRM. Its REST API is mature,
 * well-documented, and powerful — but also idiosyncratic. Objects are
 * called "sObjects", queries use SOQL (a SQL dialect), and everything
 * revolves around the concept of a "Record" with a fixed schema that
 * admins can extend with custom fields.
 *
 * This adapter translates between our universal CRM types and Salesforce's
 * specific object model:
 *
 *   CrmContact → Contact or Lead sObject
 *   CrmAccount → Account sObject
 *   CrmActivity → Task sObject (Type = 'Call')
 *   CrmDeal → Opportunity sObject
 *
 * Authentication uses OAuth 2.0 with automatic token refresh. The
 * instanceUrl (e.g., https://na1.salesforce.com) is discovered during
 * the OAuth flow and stored in the config.
 *
 * Key Salesforce API patterns used:
 *   - SOQL queries via /services/data/vXX.0/query/?q=...
 *   - sObject CRUD via /services/data/vXX.0/sobjects/Contact/
 *   - Parameterised search via /services/data/vXX.0/parameterizedSearch/
 */

import type {
  CrmProvider, CrmProviderConfig, CrmContact, CrmAccount,
  CrmActivity, CrmDeal, CrmOAuthConfig,
} from '../types';

const SF_API_VERSION = 'v59.0';

export class SalesforceProvider implements CrmProvider {
  readonly providerId = 'salesforce';
  readonly providerName = 'Salesforce';

  private config!: CrmProviderConfig;
  private auth!: CrmOAuthConfig;
  private instanceUrl = '';
  private accessToken = '';

  async initialize(config: CrmProviderConfig): Promise<void> {
    this.config = config;
    if (config.auth.type !== 'oauth2') {
      throw new Error('Salesforce requires OAuth2 authentication');
    }
    this.auth = config.auth as CrmOAuthConfig;
    this.instanceUrl = this.auth.instanceUrl || '';
    this.accessToken = this.auth.accessToken || '';

    // If we have a refresh token but no valid access token, refresh now
    if (this.auth.refreshToken && (!this.accessToken || this.isTokenExpired())) {
      await this.refreshAccessToken();
    }
  }

  async testConnection(): Promise<{ connected: boolean; error?: string; details?: string }> {
    try {
      const result = await this.sfRequest<any>(`/services/data/${SF_API_VERSION}/limits`);
      return {
        connected: true,
        details: `Connected to ${this.instanceUrl}. API calls remaining: ${result?.DailyApiRequests?.Remaining || 'unknown'}`,
      };
    } catch (err: any) {
      return { connected: false, error: err.message };
    }
  }

  // ── Contact Lookup ──────────────────────────────────────────────

  async lookupByPhone(phone: string): Promise<CrmContact | null> {
    // Salesforce phone field matching: strip formatting for SOQL LIKE
    const normalised = phone.replace(/[\s\-\(\)]/g, '');
    const soql = `SELECT Id, FirstName, LastName, Name, Email, Phone, MobilePhone, Title, AccountId, Account.Name, OwnerId, Owner.Name, LeadSource, CreatedDate, LastModifiedDate FROM Contact WHERE Phone LIKE '%${this.escSoql(normalised)}%' OR MobilePhone LIKE '%${this.escSoql(normalised)}%' LIMIT 1`;

    const records = await this.soqlQuery(soql);
    if (records.length === 0) {
      // Fall back to Lead search
      return this.lookupLeadByPhone(normalised);
    }
    return this.mapSfContactToUniversal(records[0]);
  }

  private async lookupLeadByPhone(phone: string): Promise<CrmContact | null> {
    const soql = `SELECT Id, FirstName, LastName, Name, Email, Phone, MobilePhone, Title, Company, OwnerId, Owner.Name, Status, CreatedDate FROM Lead WHERE Phone LIKE '%${this.escSoql(phone)}%' OR MobilePhone LIKE '%${this.escSoql(phone)}%' LIMIT 1`;
    const records = await this.soqlQuery(soql);
    if (records.length === 0) return null;
    return this.mapSfLeadToUniversal(records[0]);
  }

  async lookupByEmail(email: string): Promise<CrmContact | null> {
    const soql = `SELECT Id, FirstName, LastName, Name, Email, Phone, MobilePhone, Title, AccountId, Account.Name, OwnerId, Owner.Name, CreatedDate, LastModifiedDate FROM Contact WHERE Email = '${this.escSoql(email)}' LIMIT 1`;
    const records = await this.soqlQuery(soql);
    if (records.length === 0) return null;
    return this.mapSfContactToUniversal(records[0]);
  }

  async lookupById(id: string): Promise<CrmContact | null> {
    try {
      const record = await this.sfRequest<any>(
        `/services/data/${SF_API_VERSION}/sobjects/Contact/${id}`
      );
      return this.mapSfContactToUniversal(record);
    } catch {
      return null;
    }
  }

  async searchContacts(query: string, limit: number = 10): Promise<CrmContact[]> {
    const sosl = `FIND {${this.escSosl(query)}} IN ALL FIELDS RETURNING Contact(Id, FirstName, LastName, Name, Email, Phone, Title, AccountId, Account.Name LIMIT ${limit})`;
    try {
      const result = await this.sfRequest<any>(
        `/services/data/${SF_API_VERSION}/search/?q=${encodeURIComponent(sosl)}`
      );
      const contacts = result?.searchRecords || [];
      return contacts.map((r: any) => this.mapSfContactToUniversal(r));
    } catch {
      return [];
    }
  }

  // ── Account Lookup ──────────────────────────────────────────────

  async getAccount(id: string): Promise<CrmAccount | null> {
    try {
      const record = await this.sfRequest<any>(
        `/services/data/${SF_API_VERSION}/sobjects/Account/${id}`
      );
      return {
        id: record.Id,
        provider: 'salesforce',
        name: record.Name,
        industry: record.Industry,
        website: record.Website,
        phone: record.Phone,
        billingAddress: record.BillingStreet ? {
          street: record.BillingStreet,
          city: record.BillingCity,
          state: record.BillingState,
          postalCode: record.BillingPostalCode,
          country: record.BillingCountry,
        } : undefined,
        size: record.NumberOfEmployees?.toString(),
        revenue: record.AnnualRevenue,
        ownerId: record.OwnerId,
        recordUrl: `${this.instanceUrl}/${record.Id}`,
      };
    } catch {
      return null;
    }
  }

  // ── Activity Logging ────────────────────────────────────────────

  async logActivity(activity: CrmActivity): Promise<{ id: string; success: boolean; error?: string }> {
    try {
      // Salesforce logs calls as Task records with Type = 'Call'
      const task: Record<string, any> = {
        Subject: activity.subject,
        Description: activity.description,
        Status: 'Completed',
        Priority: 'Normal',
        Type: this.mapActivityType(activity.type),
        ActivityDate: activity.activityDate.split('T')[0], // SF wants date-only
      };

      // Duration: Salesforce uses CallDurationInSeconds for call tasks
      if (activity.durationSeconds) {
        task.CallDurationInSeconds = activity.durationSeconds;
      }

      // Call direction
      if (activity.direction) {
        task.CallType = activity.direction === 'INBOUND' ? 'Inbound' : 'Outbound';
      }

      // Disposition
      if (activity.disposition) {
        task.CallDisposition = activity.disposition;
      }

      // Associate with contact
      if (activity.contactId) {
        task.WhoId = activity.contactId;
      }

      // Associate with account or deal
      if (activity.dealId) {
        task.WhatId = activity.dealId;
      } else if (activity.accountId) {
        task.WhatId = activity.accountId;
      }

      // CRM user as owner
      if (activity.crmUserId) {
        task.OwnerId = activity.crmUserId;
      }

      // UC platform references in description
      if (activity.ucReferences) {
        const refs = activity.ucReferences;
        let refBlock = '\n\n--- UC Platform References ---';
        if (refs.callId) refBlock += `\nCall ID: ${refs.callId}`;
        if (refs.interactionId) refBlock += `\nInteraction ID: ${refs.interactionId}`;
        if (refs.queueId) refBlock += `\nQueue ID: ${refs.queueId}`;
        if (refs.recordingUrl) refBlock += `\nRecording: ${refs.recordingUrl}`;
        if (refs.transcriptUrl) refBlock += `\nTranscript: ${refs.transcriptUrl}`;
        task.Description = (task.Description || '') + refBlock;
      }

      const result = await this.sfRequest<any>(
        `/services/data/${SF_API_VERSION}/sobjects/Task`,
        'POST',
        task,
      );

      return { id: result.id, success: true };
    } catch (err: any) {
      return { id: '', success: false, error: err.message };
    }
  }

  private mapActivityType(type: CrmActivity['type']): string {
    const map: Record<string, string> = {
      CALL: 'Call', EMAIL: 'Email', MEETING: 'Meeting',
      TASK: 'Other', NOTE: 'Other', CHAT: 'Call', SMS: 'Call',
    };
    return map[type] || 'Other';
  }

  // ── Deal (Opportunity) Lookup ───────────────────────────────────

  async getOpenDeals(contactId: string): Promise<CrmDeal[]> {
    // Salesforce links Opportunities to Contacts via OpportunityContactRole
    const soql = `SELECT OpportunityId, Opportunity.Name, Opportunity.StageName, Opportunity.Amount, Opportunity.CurrencyIsoCode, Opportunity.CloseDate, Opportunity.OwnerId FROM OpportunityContactRole WHERE ContactId = '${this.escSoql(contactId)}' AND Opportunity.IsClosed = false LIMIT 10`;
    try {
      const records = await this.soqlQuery(soql);
      return records.map((r: any) => ({
        id: r.OpportunityId,
        provider: 'salesforce',
        name: r.Opportunity?.Name || '',
        stage: r.Opportunity?.StageName || '',
        amount: r.Opportunity?.Amount,
        currency: r.Opportunity?.CurrencyIsoCode,
        contactId,
        ownerId: r.Opportunity?.OwnerId,
        closeDate: r.Opportunity?.CloseDate,
        recordUrl: `${this.instanceUrl}/${r.OpportunityId}`,
      }));
    } catch {
      return [];
    }
  }

  // ── Recent Activities ───────────────────────────────────────────

  async getRecentActivities(contactId: string, limit: number = 5): Promise<CrmActivity[]> {
    const soql = `SELECT Id, Subject, Description, Status, Type, ActivityDate, CallDurationInSeconds, CallType, CallDisposition, OwnerId FROM Task WHERE WhoId = '${this.escSoql(contactId)}' ORDER BY ActivityDate DESC LIMIT ${limit}`;
    try {
      const records = await this.soqlQuery(soql);
      return records.map((r: any) => ({
        id: r.Id,
        provider: 'salesforce',
        type: r.Type === 'Call' ? 'CALL' : r.Type === 'Email' ? 'EMAIL' : 'TASK',
        subject: r.Subject || '',
        description: r.Description || '',
        direction: r.CallType === 'Inbound' ? 'INBOUND' : r.CallType === 'Outbound' ? 'OUTBOUND' : undefined,
        durationSeconds: r.CallDurationInSeconds,
        disposition: r.CallDisposition,
        contactId,
        activityDate: r.ActivityDate,
      }));
    } catch {
      return [];
    }
  }

  // ── User Mapping ────────────────────────────────────────────────

  async lookupUserByEmail(email: string): Promise<{ id: string; name: string; email: string } | null> {
    const soql = `SELECT Id, Name, Email FROM User WHERE Email = '${this.escSoql(email)}' AND IsActive = true LIMIT 1`;
    const records = await this.soqlQuery(soql);
    if (records.length === 0) return null;
    return { id: records[0].Id, name: records[0].Name, email: records[0].Email };
  }

  async shutdown(): Promise<void> {
    // No persistent connections to close
  }

  // ─── Salesforce API Helpers ───────────────────────────────────────

  private async sfRequest<T>(path: string, method: string = 'GET', body?: any): Promise<T> {
    if (!this.instanceUrl) throw new Error('Salesforce instance URL not configured');
    if (!this.accessToken) throw new Error('Salesforce access token not available');

    // Check token expiry
    if (this.isTokenExpired() && this.auth.refreshToken) {
      await this.refreshAccessToken();
    }

    const url = `${this.instanceUrl}${path}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const fetchOptions: RequestInit = { method, headers };
    if (body) fetchOptions.body = JSON.stringify(body);

    const response = await fetch(url, fetchOptions);

    if (response.status === 401 && this.auth.refreshToken) {
      // Token expired mid-request — refresh and retry once
      await this.refreshAccessToken();
      headers['Authorization'] = `Bearer ${this.accessToken}`;
      const retry = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
      if (!retry.ok) throw new Error(`Salesforce API error: ${retry.status} ${retry.statusText}`);
      return retry.json() as Promise<T>;
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Salesforce API error: ${response.status} ${errorBody}`);
    }

    if (response.status === 204) return {} as T; // No content
    return response.json() as Promise<T>;
  }

  private async soqlQuery(soql: string): Promise<any[]> {
    const result = await this.sfRequest<any>(
      `/services/data/${SF_API_VERSION}/query/?q=${encodeURIComponent(soql)}`
    );
    return result?.records || [];
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.auth.refreshToken || !this.auth.tokenUrl) {
      throw new Error('Cannot refresh: no refresh token or token URL');
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.auth.clientId,
      client_secret: this.auth.clientSecret,
      refresh_token: this.auth.refreshToken,
    });

    const response = await fetch(this.auth.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data = await response.json() as any;
    this.accessToken = data.access_token;
    this.auth.accessToken = data.access_token;
    if (data.instance_url) {
      this.instanceUrl = data.instance_url;
      this.auth.instanceUrl = data.instance_url;
    }
    this.auth.expiresAt = new Date(Date.now() + (data.expires_in || 7200) * 1000).toISOString();
  }

  private isTokenExpired(): boolean {
    if (!this.auth.expiresAt) return false;
    // Refresh 5 minutes before actual expiry
    return new Date(this.auth.expiresAt).getTime() - 300000 < Date.now();
  }

  // ─── Mapping Helpers ──────────────────────────────────────────────

  private mapSfContactToUniversal(sf: any): CrmContact {
    return {
      id: sf.Id,
      provider: 'salesforce',
      firstName: sf.FirstName,
      lastName: sf.LastName,
      displayName: sf.Name || `${sf.FirstName || ''} ${sf.LastName || ''}`.trim(),
      email: sf.Email,
      phone: sf.Phone,
      mobilePhone: sf.MobilePhone,
      title: sf.Title,
      accountId: sf.AccountId,
      accountName: sf.Account?.Name,
      ownerId: sf.OwnerId,
      ownerName: sf.Owner?.Name,
      stage: 'Contact',
      createdAt: sf.CreatedDate,
      updatedAt: sf.LastModifiedDate,
      recordUrl: `${this.instanceUrl}/${sf.Id}`,
    };
  }

  private mapSfLeadToUniversal(sf: any): CrmContact {
    return {
      id: sf.Id,
      provider: 'salesforce',
      firstName: sf.FirstName,
      lastName: sf.LastName,
      displayName: sf.Name || `${sf.FirstName || ''} ${sf.LastName || ''}`.trim(),
      email: sf.Email,
      phone: sf.Phone,
      mobilePhone: sf.MobilePhone,
      title: sf.Title,
      company: sf.Company,
      ownerId: sf.OwnerId,
      ownerName: sf.Owner?.Name,
      stage: sf.Status || 'Lead',
      createdAt: sf.CreatedDate,
      recordUrl: `${this.instanceUrl}/${sf.Id}`,
    };
  }

  /** Escape single quotes for SOQL injection prevention */
  private escSoql(value: string): string {
    return value.replace(/'/g, "\\'").replace(/\\/g, '\\\\');
  }

  /** Escape special characters for SOSL search */
  private escSosl(value: string): string {
    return value.replace(/[?&|!{}[\]()^~*:\\"'+\-]/g, '\\$&');
  }
}

export default SalesforceProvider;
