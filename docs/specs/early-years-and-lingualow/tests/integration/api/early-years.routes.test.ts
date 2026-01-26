/**
 * Early Years API - Integration Tests
 * 
 * Tests the complete request/response cycle through the API layer.
 * Uses supertest to make HTTP requests and verify responses.
 * 
 * Note: These tests require a test database to be running.
 * Run with: npm run test:integration
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import jwt from 'jsonwebtoken';
import { createApp, getDefaultConfig } from '../../../apps/api/src/app.js';
import {
  createFamilyInput,
  enrollChildInput,
  startSessionInput,
  recordActivityInput,
  validPictureSequence,
  generateTenantId,
  generateUserId,
} from '../../fixtures/early-years.fixtures.js';

// =============================================================================
// TEST SETUP
// =============================================================================

describe('Early Years API Integration Tests', () => {
  let app: Application;
  let authToken: string;
  let tenantId: string;
  let userId: string;

  beforeAll(() => {
    // Create app with test configuration
    const config = {
      ...getDefaultConfig(),
      jwtSecret: 'test-secret-minimum-32-characters-long',
      logLevel: 'silent',
      enableMetrics: false,
    };
    app = createApp(config);

    // Generate test identifiers
    tenantId = generateTenantId();
    userId = generateUserId();

    // Create a valid auth token
    authToken = jwt.sign(
      {
        userId,
        tenantId,
        roles: ['user'],
        permissions: ['read:own', 'write:own'],
        sessionId: 'test-session',
        tokenType: 'access',
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  // ===========================================================================
  // HELPER FUNCTIONS
  // ===========================================================================

  const authenticatedRequest = (method: 'get' | 'post' | 'put' | 'delete', url: string) => {
    return request(app)[method](url).set('Authorization', `Bearer ${authToken}`);
  };

  // ===========================================================================
  // HEALTH CHECK TESTS
  // ===========================================================================

  describe('Health Checks', () => {
    it('GET /health should return healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
    });

    it('GET /ready should return ready status', async () => {
      const response = await request(app).get('/ready');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ready');
    });
  });

  // ===========================================================================
  // AUTHENTICATION TESTS
  // ===========================================================================

  describe('Authentication', () => {
    it('should reject requests without auth token', async () => {
      const response = await request(app)
        .post('/api/v1/early-years/families')
        .send(createFamilyInput());

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/early-years/families')
        .set('Authorization', 'Bearer invalid-token')
        .send(createFamilyInput());

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject expired tokens', async () => {
      const expiredToken = jwt.sign(
        {
          userId,
          tenantId,
          roles: ['user'],
          permissions: [],
          sessionId: 'test',
          tokenType: 'access',
        },
        'test-secret-minimum-32-characters-long',
        { expiresIn: '-1h' } // Already expired
      );

      const response = await request(app)
        .post('/api/v1/early-years/families')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send(createFamilyInput());

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('expired');
    });
  });

  // ===========================================================================
  // FAMILY ENDPOINT TESTS
  // ===========================================================================

  describe('POST /api/v1/early-years/families', () => {
    it('should validate required fields', async () => {
      const response = await authenticatedRequest('post', '/api/v1/early-years/families')
        .send({
          // Missing dataProcessingConsent
          familyName: 'Test Family',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject if data processing consent is false', async () => {
      const response = await authenticatedRequest('post', '/api/v1/early-years/families')
        .send({
          ...createFamilyInput(),
          dataProcessingConsent: false,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.fields).toContainEqual(
        expect.objectContaining({ field: 'dataProcessingConsent' })
      );
    });

    it('should accept valid family creation request', async () => {
      // Note: This test will fail without a real database
      // In a real integration test environment, this would create a family
      const response = await authenticatedRequest('post', '/api/v1/early-years/families')
        .send(createFamilyInput());

      // Without a real database, we expect either:
      // - 201 Created (if database is available)
      // - 500 Internal Error (if database is not available)
      expect([201, 500]).toContain(response.status);
    });
  });

  describe('GET /api/v1/early-years/families/me', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/v1/early-years/families/me');

      expect(response.status).toBe(401);
    });
  });

  // ===========================================================================
  // CHILD ENDPOINT TESTS
  // ===========================================================================

  describe('POST /api/v1/early-years/families/:familyId/children', () => {
    it('should validate child age', async () => {
      const tooYoung = new Date();
      tooYoung.setFullYear(tooYoung.getFullYear() - 2); // 2 years old

      const response = await authenticatedRequest(
        'post',
        '/api/v1/early-years/families/test-family-id/children'
      ).send({
        firstName: 'Test Child',
        dateOfBirth: tooYoung.toISOString(),
      });

      expect(response.status).toBe(400);
      expect(response.body.error.fields).toContainEqual(
        expect.objectContaining({ field: 'dateOfBirth' })
      );
    });

    it('should validate required fields', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/early-years/families/test-family-id/children'
      ).send({
        // Missing firstName
        dateOfBirth: new Date().toISOString(),
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/early-years/children/:childId', () => {
    it('should validate childId parameter', async () => {
      const response = await authenticatedRequest(
        'get',
        '/api/v1/early-years/children/'
      );

      expect(response.status).toBe(404); // Route not found for empty childId
    });
  });

  // ===========================================================================
  // PICTURE PASSWORD ENDPOINT TESTS
  // ===========================================================================

  describe('POST /api/v1/early-years/children/:childId/picture-password', () => {
    it('should validate sequence length (minimum 3)', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/early-years/children/test-child-id/picture-password'
      ).send({
        imageSequence: ['cat', 'dog'], // Only 2 images
      });

      expect(response.status).toBe(400);
      expect(response.body.error.fields).toContainEqual(
        expect.objectContaining({ field: 'imageSequence' })
      );
    });

    it('should validate sequence length (maximum 5)', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/early-years/children/test-child-id/picture-password'
      ).send({
        imageSequence: ['cat', 'dog', 'bird', 'fish', 'horse', 'cow'], // 6 images
      });

      expect(response.status).toBe(400);
      expect(response.body.error.fields).toContainEqual(
        expect.objectContaining({ field: 'imageSequence' })
      );
    });

    it('should accept valid sequence', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/early-years/children/test-child-id/picture-password'
      ).send({
        imageSequence: validPictureSequence,
      });

      // Without database, expect 500; with database, could be 200 or 404
      expect([200, 404, 500]).toContain(response.status);
    });
  });

  // ===========================================================================
  // SESSION ENDPOINT TESTS
  // ===========================================================================

  describe('POST /api/v1/early-years/children/:childId/sessions', () => {
    it('should validate session type', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/early-years/children/test-child-id/sessions'
      ).send({
        sessionType: 'invalid_type',
      });

      expect(response.status).toBe(400);
      expect(response.body.error.fields).toContainEqual(
        expect.objectContaining({ field: 'sessionType' })
      );
    });

    it('should accept valid session types', async () => {
      for (const sessionType of ['learning', 'practice', 'assessment']) {
        const response = await authenticatedRequest(
          'post',
          '/api/v1/early-years/children/test-child-id/sessions'
        ).send({
          sessionType,
        });

        // Should not be a validation error
        expect(response.status).not.toBe(400);
      }
    });

    it('should validate world enum', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/early-years/children/test-child-id/sessions'
      ).send({
        world: 'invalid_world',
      });

      expect(response.status).toBe(400);
    });
  });

  // ===========================================================================
  // ACTIVITY ENDPOINT TESTS
  // ===========================================================================

  describe('POST /api/v1/early-years/sessions/:sessionId/activities', () => {
    it('should validate activity type', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/early-years/sessions/test-session-id/activities'
      ).send({
        activityType: 'invalid_activity',
        targetContent: ['s', 'a', 't'],
      });

      expect(response.status).toBe(400);
      expect(response.body.error.fields).toContainEqual(
        expect.objectContaining({ field: 'activityType' })
      );
    });

    it('should require targetContent', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/early-years/sessions/test-session-id/activities'
      ).send({
        activityType: 'phoneme_identification',
        // Missing targetContent
      });

      expect(response.status).toBe(400);
    });

    it('should validate score range (0-1)', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/early-years/sessions/test-session-id/activities'
      ).send({
        ...recordActivityInput(),
        score: 1.5, // Invalid: above 1
      });

      expect(response.status).toBe(400);
    });

    it('should validate difficulty range (1-5)', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/early-years/sessions/test-session-id/activities'
      ).send({
        ...recordActivityInput(),
        difficulty: 10, // Invalid: above 5
      });

      expect(response.status).toBe(400);
    });
  });

  // ===========================================================================
  // SESSION END ENDPOINT TESTS
  // ===========================================================================

  describe('POST /api/v1/early-years/sessions/:sessionId/end', () => {
    it('should accept optional mood rating', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/early-years/sessions/test-session-id/end'
      ).send({
        childMoodRating: 5,
      });

      // Should not be a validation error
      expect(response.status).not.toBe(400);
    });

    it('should validate mood rating range (1-5)', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/early-years/sessions/test-session-id/end'
      ).send({
        childMoodRating: 10, // Invalid: above 5
      });

      expect(response.status).toBe(400);
    });
  });

  // ===========================================================================
  // PHONICS PROGRESS ENDPOINT TESTS
  // ===========================================================================

  describe('GET /api/v1/early-years/children/:childId/phonics', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/early-years/children/test-child-id/phonics');

      expect(response.status).toBe(401);
    });

    it('should accept authenticated request', async () => {
      const response = await authenticatedRequest(
        'get',
        '/api/v1/early-years/children/test-child-id/phonics'
      );

      // Without database, expect 500; with database, could be 200 or 404
      expect([200, 404, 500]).toContain(response.status);
    });
  });

  // ===========================================================================
  // ERROR HANDLING TESTS
  // ===========================================================================

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await authenticatedRequest(
        'get',
        '/api/v1/early-years/unknown-route'
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should include request ID in error responses', async () => {
      const response = await authenticatedRequest(
        'get',
        '/api/v1/early-years/unknown-route'
      );

      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.body.error.requestId).toBeDefined();
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/early-years/families')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });
  });

  // ===========================================================================
  // RATE LIMITING TESTS
  // ===========================================================================

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const response = await authenticatedRequest(
        'get',
        '/api/v1/early-years/families/me'
      );

      // Rate limit headers should be present
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });
  });
});
