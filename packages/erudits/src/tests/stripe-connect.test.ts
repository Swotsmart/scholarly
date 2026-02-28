/**
 * Stripe Connect Client — Onboarding Tests
 */
import { StripeConnectClient } from '../integrations/stripe-connect.client';
import type { ConnectedAccountRegistry } from '../integrations/stripe-connect.client';

// ── Mock factories ──

function createMockStripeSDK() {
  return {
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ id: 'pi_test', client_secret: 'secret_test', status: 'requires_payment_method', metadata: {} }),
      retrieve: jest.fn().mockResolvedValue({ id: 'pi_test', client_secret: 'secret_test', status: 'succeeded', metadata: {} }),
      confirm: jest.fn().mockResolvedValue({ id: 'pi_test', client_secret: 'secret_test', status: 'succeeded', metadata: {} }),
    },
    refunds: {
      create: jest.fn().mockResolvedValue({ id: 're_test', amount: 1500, status: 'succeeded', payment_intent: 'pi_test' }),
    },
    accounts: {
      create: jest.fn().mockResolvedValue({
        id: 'acct_test123',
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'acct_test123',
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      }),
      update: jest.fn().mockResolvedValue({ id: 'acct_test123' }),
    },
    accountLinks: {
      create: jest.fn().mockResolvedValue({
        url: 'https://connect.stripe.com/setup/e/acct_test123/abc',
        created: 1709000000,
        expires_at: 1709000300,
      }),
    },
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({ id: 'evt_test', type: 'payment_intent.succeeded', data: { object: {} } }),
    },
  };
}

function createMockRegistry(): ConnectedAccountRegistry {
  const store = new Map<string, string>();
  return {
    getAccountId: jest.fn().mockImplementation((id: string) => Promise.resolve(store.get(id) ?? null)),
    setAccountId: jest.fn().mockImplementation((authorId: string, stripeId: string) => {
      store.set(authorId, stripeId);
      return Promise.resolve();
    }),
  };
}

// ── Tests ──

describe('StripeConnectClient — Onboarding', () => {
  let stripe: ReturnType<typeof createMockStripeSDK>;
  let registry: ConnectedAccountRegistry;
  let client: StripeConnectClient;

  beforeEach(() => {
    stripe = createMockStripeSDK();
    registry = createMockRegistry();
    client = new StripeConnectClient(stripe, registry, 'whsec_test');
  });

  describe('createConnectedAccount', () => {
    it('should create an Express account and persist the mapping', async () => {
      const result = await client.createConnectedAccount({
        authorId: 'author-1',
        email: 'tutor@erudits.com',
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.stripeAccountId).toBe('acct_test123');

      // Verify Stripe SDK was called with correct params
      expect(stripe.accounts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'express',
          email: 'tutor@erudits.com',
          country: 'AU',
          business_type: 'individual',
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          metadata: expect.objectContaining({
            erudits_author_id: 'author-1',
          }),
        }),
      );

      // Verify registry was updated
      expect(registry.setAccountId).toHaveBeenCalledWith('author-1', 'acct_test123');
    });

    it('should return existing account if already registered (idempotent)', async () => {
      // Pre-populate registry
      await registry.setAccountId('author-existing', 'acct_existing');

      const result = await client.createConnectedAccount({
        authorId: 'author-existing',
        email: 'existing@erudits.com',
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.stripeAccountId).toBe('acct_existing');

      // Stripe should NOT have been called
      expect(stripe.accounts.create).not.toHaveBeenCalled();
    });

    it('should pass custom country and business type', async () => {
      await client.createConnectedAccount({
        authorId: 'author-fr',
        email: 'tuteur@erudits.com',
        country: 'FR',
        businessType: 'company',
      });

      expect(stripe.accounts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          country: 'FR',
          business_type: 'company',
        }),
      );
    });

    it('should return failure on Stripe error', async () => {
      const error = new Error('Invalid email') as Error & { type: string };
      error.type = 'StripeInvalidRequestError';
      stripe.accounts.create.mockRejectedValueOnce(error);

      const result = await client.createConnectedAccount({
        authorId: 'author-bad',
        email: 'bad-email',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('createOnboardingLink', () => {
    it('should generate an onboarding link with return/refresh URLs', async () => {
      const result = await client.createOnboardingLink({
        stripeAccountId: 'acct_test123',
        returnUrl: 'https://erudits.com/onboarding/complete',
        refreshUrl: 'https://erudits.com/onboarding/refresh',
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.url).toContain('connect.stripe.com');
      expect(result.data.expiresAt).toBe(1709000300);

      expect(stripe.accountLinks.create).toHaveBeenCalledWith({
        account: 'acct_test123',
        type: 'account_onboarding',
        return_url: 'https://erudits.com/onboarding/complete',
        refresh_url: 'https://erudits.com/onboarding/refresh',
      });
    });

    it('should return failure on Stripe error', async () => {
      const error = new Error('Account not found') as Error & { type: string };
      error.type = 'StripeInvalidRequestError';
      stripe.accountLinks.create.mockRejectedValueOnce(error);

      const result = await client.createOnboardingLink({
        stripeAccountId: 'acct_nonexistent',
        returnUrl: 'https://erudits.com/return',
        refreshUrl: 'https://erudits.com/refresh',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('getAccountStatus', () => {
    it('should return active status for fully onboarded account', async () => {
      stripe.accounts.retrieve.mockResolvedValueOnce({
        id: 'acct_active',
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      });

      const result = await client.getAccountStatus('acct_active');

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.status).toBe('active');
      expect(result.data.chargesEnabled).toBe(true);
      expect(result.data.payoutsEnabled).toBe(true);
      expect(result.data.detailsSubmitted).toBe(true);
    });

    it('should return not_started for new account', async () => {
      stripe.accounts.retrieve.mockResolvedValueOnce({
        id: 'acct_new',
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
      });

      const result = await client.getAccountStatus('acct_new');

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.status).toBe('not_started');
    });

    it('should return pending for submitted but not yet verified account', async () => {
      stripe.accounts.retrieve.mockResolvedValueOnce({
        id: 'acct_pending',
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: true,
      });

      const result = await client.getAccountStatus('acct_pending');

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.status).toBe('pending');
    });
  });
});
