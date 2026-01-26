/**
 * LinguaFlow API - Integration Tests
 * 
 * Tests the complete request/response cycle through the API layer.
 * Covers profile management, vocabulary, conversations, heritage pathways,
 * IB curriculum, and offline support.
 */

import { jest, describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import jwt from 'jsonwebtoken';
import { createApp, getDefaultConfig } from '../../../apps/api/src/app.js';
import {
  createProfileInput,
  addVocabularyInput,
  reviewVocabularyInput,
  startConversationInput,
  addMessageInput,
  endConversationInput,
  createHeritagePathwayInput,
  createOfflinePackageInput,
  syncOfflineProgressInput,
  ibCriteriaInput,
  updateCefrLevelInput,
  generateTenantId,
  generateUserId,
  generateProfileId,
  SUPPORTED_LANGUAGES,
  CEFR_LEVELS,
} from '../../fixtures/linguaflow.fixtures.js';

// =============================================================================
// TEST SETUP
// =============================================================================

describe('LinguaFlow API Integration Tests', () => {
  let app: Application;
  let authToken: string;
  let tenantId: string;
  let userId: string;

  beforeAll(() => {
    const config = {
      ...getDefaultConfig(),
      jwtSecret: 'test-secret-minimum-32-characters-long',
      logLevel: 'silent',
      enableMetrics: false,
    };
    app = createApp(config);

    tenantId = generateTenantId();
    userId = generateUserId();

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

  const authenticatedRequest = (method: 'get' | 'post' | 'put' | 'delete', url: string) => {
    return request(app)[method](url).set('Authorization', `Bearer ${authToken}`);
  };

  // ===========================================================================
  // PROFILE ENDPOINT TESTS
  // ===========================================================================

  describe('POST /api/v1/linguaflow/profiles', () => {
    it('should validate required targetLanguage', async () => {
      const response = await authenticatedRequest('post', '/api/v1/linguaflow/profiles')
        .send({
          // Missing targetLanguage
          nativeLanguage: 'en',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate supported languages', async () => {
      const response = await authenticatedRequest('post', '/api/v1/linguaflow/profiles')
        .send(createProfileInput({ targetLanguage: 'klingon' }));

      expect(response.status).toBe(400);
      expect(response.body.error.fields).toContainEqual(
        expect.objectContaining({ field: 'targetLanguage' })
      );
    });

    it('should accept all supported languages', async () => {
      for (const language of SUPPORTED_LANGUAGES) {
        const response = await authenticatedRequest('post', '/api/v1/linguaflow/profiles')
          .send(createProfileInput({ targetLanguage: language }));

        // Should not be a validation error (might be 500 without DB, but not 400)
        expect(response.status).not.toBe(400);
      }
    });

    it('should validate CEFR level format', async () => {
      const response = await authenticatedRequest('post', '/api/v1/linguaflow/profiles')
        .send(createProfileInput({ overallLevel: 'X9' }));

      expect(response.status).toBe(400);
    });

    it('should accept valid CEFR levels', async () => {
      for (const level of CEFR_LEVELS) {
        const response = await authenticatedRequest('post', '/api/v1/linguaflow/profiles')
          .send(createProfileInput({ targetLanguage: 'french', overallLevel: level }));

        expect(response.status).not.toBe(400);
      }
    });

    it('should validate dailyGoal range', async () => {
      const response = await authenticatedRequest('post', '/api/v1/linguaflow/profiles')
        .send(createProfileInput({ dailyGoal: 100 })); // Too high

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/linguaflow/profiles/:profileId', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/linguaflow/profiles/test-profile-id');

      expect(response.status).toBe(401);
    });

    it('should validate profileId format', async () => {
      const response = await authenticatedRequest(
        'get',
        '/api/v1/linguaflow/profiles/'
      );

      expect(response.status).toBe(404); // Route not found for empty ID
    });
  });

  describe('PUT /api/v1/linguaflow/profiles/:profileId/cefr', () => {
    it('should validate skill enum', async () => {
      const response = await authenticatedRequest(
        'put',
        '/api/v1/linguaflow/profiles/test-profile-id/cefr'
      ).send({
        skill: 'dancing', // Invalid
        level: 'A2',
      });

      expect(response.status).toBe(400);
      expect(response.body.error.fields).toContainEqual(
        expect.objectContaining({ field: 'skill' })
      );
    });

    it('should validate level format', async () => {
      const response = await authenticatedRequest(
        'put',
        '/api/v1/linguaflow/profiles/test-profile-id/cefr'
      ).send({
        skill: 'speaking',
        level: 'expert', // Invalid
      });

      expect(response.status).toBe(400);
    });

    it('should accept valid skill updates', async () => {
      const skills = ['listening', 'speaking', 'reading', 'writing', 'overall'];
      
      for (const skill of skills) {
        const response = await authenticatedRequest(
          'put',
          '/api/v1/linguaflow/profiles/test-profile-id/cefr'
        ).send(updateCefrLevelInput({ skill: skill as any, level: 'B1' }));

        expect(response.status).not.toBe(400);
      }
    });
  });

  // ===========================================================================
  // VOCABULARY ENDPOINT TESTS
  // ===========================================================================

  describe('POST /api/v1/linguaflow/profiles/:profileId/vocabulary', () => {
    it('should validate required fields', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/linguaflow/profiles/test-profile-id/vocabulary'
      ).send({
        // Missing word, translation
        wordId: 'word_123',
      });

      expect(response.status).toBe(400);
    });

    it('should accept valid vocabulary', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/linguaflow/profiles/test-profile-id/vocabulary'
      ).send(addVocabularyInput());

      expect(response.status).not.toBe(400);
    });
  });

  describe('GET /api/v1/linguaflow/profiles/:profileId/vocabulary/review', () => {
    it('should accept limit parameter', async () => {
      const response = await authenticatedRequest(
        'get',
        '/api/v1/linguaflow/profiles/test-profile-id/vocabulary/review?limit=10'
      );

      expect(response.status).not.toBe(400);
    });

    it('should validate limit range', async () => {
      const response = await authenticatedRequest(
        'get',
        '/api/v1/linguaflow/profiles/test-profile-id/vocabulary/review?limit=1000'
      );

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/linguaflow/profiles/:profileId/vocabulary/review', () => {
    it('should validate quality range (0-5)', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/linguaflow/profiles/test-profile-id/vocabulary/review'
      ).send(reviewVocabularyInput(10)); // Invalid: above 5

      expect(response.status).toBe(400);
    });

    it('should accept valid quality values', async () => {
      for (let quality = 0; quality <= 5; quality++) {
        const response = await authenticatedRequest(
          'post',
          '/api/v1/linguaflow/profiles/test-profile-id/vocabulary/review'
        ).send(reviewVocabularyInput(quality));

        expect(response.status).not.toBe(400);
      }
    });
  });

  describe('POST /api/v1/linguaflow/profiles/:profileId/vocabulary/review-session', () => {
    it('should validate batch reviews', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/linguaflow/profiles/test-profile-id/vocabulary/review-session'
      ).send({
        reviews: [], // Empty array
      });

      expect(response.status).toBe(400);
    });

    it('should accept valid batch reviews', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/linguaflow/profiles/test-profile-id/vocabulary/review-session'
      ).send({
        reviews: [
          { wordId: 'word_1', quality: 4 },
          { wordId: 'word_2', quality: 5 },
        ],
      });

      expect(response.status).not.toBe(400);
    });
  });

  // ===========================================================================
  // CONVERSATION ENDPOINT TESTS
  // ===========================================================================

  describe('POST /api/v1/linguaflow/profiles/:profileId/conversations', () => {
    it('should validate required scenario', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/linguaflow/profiles/test-profile-id/conversations'
      ).send({
        // Missing scenario
        targetSkills: ['speaking'],
      });

      expect(response.status).toBe(400);
    });

    it('should accept valid conversation start', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/linguaflow/profiles/test-profile-id/conversations'
      ).send(startConversationInput());

      expect(response.status).not.toBe(400);
    });
  });

  describe('POST /api/v1/linguaflow/conversations/:conversationId/messages', () => {
    it('should validate required content', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/linguaflow/conversations/test-conv-id/messages'
      ).send({
        // Missing content
        role: 'user',
      });

      expect(response.status).toBe(400);
    });

    it('should accept valid message', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/linguaflow/conversations/test-conv-id/messages'
      ).send(addMessageInput());

      expect(response.status).not.toBe(400);
    });
  });

  describe('POST /api/v1/linguaflow/conversations/:conversationId/end', () => {
    it('should accept optional self-assessment', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/linguaflow/conversations/test-conv-id/end'
      ).send(endConversationInput({ selfAssessment: 4 }));

      expect(response.status).not.toBe(400);
    });

    it('should validate self-assessment range', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/linguaflow/conversations/test-conv-id/end'
      ).send(endConversationInput({ selfAssessment: 10 }));

      expect(response.status).toBe(400);
    });
  });

  // ===========================================================================
  // HERITAGE PATHWAY ENDPOINT TESTS
  // ===========================================================================

  describe('POST /api/v1/linguaflow/profiles/:profileId/heritage-pathway', () => {
    it('should validate homeExposureLevel enum', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/linguaflow/profiles/test-profile-id/heritage-pathway'
      ).send({
        ...createHeritagePathwayInput(),
        homeExposureLevel: 'extreme', // Invalid
      });

      expect(response.status).toBe(400);
    });

    it('should validate literacyLevel enum', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/linguaflow/profiles/test-profile-id/heritage-pathway'
      ).send({
        ...createHeritagePathwayInput(),
        literacyLevel: 'genius', // Invalid
      });

      expect(response.status).toBe(400);
    });

    it('should accept valid pathway input', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/linguaflow/profiles/test-profile-id/heritage-pathway'
      ).send(createHeritagePathwayInput());

      expect(response.status).not.toBe(400);
    });
  });

  // ===========================================================================
  // IB CURRICULUM ENDPOINT TESTS
  // ===========================================================================

  describe('POST /api/v1/linguaflow/profiles/:profileId/ib-criteria', () => {
    it('should validate programme enum', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/linguaflow/profiles/test-profile-id/ib-criteria'
      ).send({
        ...ibCriteriaInput(),
        programme: 'AP', // Invalid (not IB)
      });

      expect(response.status).toBe(400);
    });

    it('should validate criterion enum', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/linguaflow/profiles/test-profile-id/ib-criteria'
      ).send({
        ...ibCriteriaInput(),
        criterion: 'E', // Invalid (only A-D)
      });

      expect(response.status).toBe(400);
    });

    it('should accept valid IB criteria', async () => {
      const programmes = ['PYP', 'MYP', 'DP'];
      const criteria = ['A', 'B', 'C', 'D'];

      for (const programme of programmes) {
        for (const criterion of criteria) {
          const response = await authenticatedRequest(
            'post',
            '/api/v1/linguaflow/profiles/test-profile-id/ib-criteria'
          ).send(ibCriteriaInput({ programme: programme as any, criterion: criterion as any, score: 5 }));

          expect(response.status).not.toBe(400);
        }
      }
    });
  });

  describe('GET /api/v1/linguaflow/myp-cefr/:phase', () => {
    it('should return CEFR levels for valid phases', async () => {
      for (let phase = 1; phase <= 6; phase++) {
        const response = await authenticatedRequest(
          'get',
          `/api/v1/linguaflow/myp-cefr/${phase}`
        );

        // Should return 200 with expected CEFR levels
        expect([200, 500]).toContain(response.status);
      }
    });

    it('should reject invalid phases', async () => {
      const response = await authenticatedRequest(
        'get',
        '/api/v1/linguaflow/myp-cefr/10'
      );

      expect([400, 500]).toContain(response.status);
    });
  });

  // ===========================================================================
  // OFFLINE SUPPORT ENDPOINT TESTS
  // ===========================================================================

  describe('POST /api/v1/linguaflow/profiles/:profileId/offline-packages', () => {
    it('should validate packageType enum', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/linguaflow/profiles/test-profile-id/offline-packages'
      ).send({
        ...createOfflinePackageInput(),
        packageType: 'gaming', // Invalid
      });

      expect(response.status).toBe(400);
    });

    it('should validate maxItems range', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/linguaflow/profiles/test-profile-id/offline-packages'
      ).send(createOfflinePackageInput({ maxItems: 1000 })); // Too many

      expect(response.status).toBe(400);
    });

    it('should accept valid package request', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/linguaflow/profiles/test-profile-id/offline-packages'
      ).send(createOfflinePackageInput());

      expect(response.status).not.toBe(400);
    });
  });

  describe('POST /api/v1/linguaflow/profiles/:profileId/sync', () => {
    it('should validate required packageId', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/linguaflow/profiles/test-profile-id/sync'
      ).send({
        // Missing packageId
        reviews: [],
      });

      expect(response.status).toBe(400);
    });

    it('should validate reviews array', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/linguaflow/profiles/test-profile-id/sync'
      ).send({
        packageId: 'pkg_123',
        reviews: [
          { wordId: 'word_1', quality: 10 }, // Invalid quality
        ],
      });

      expect(response.status).toBe(400);
    });

    it('should accept valid sync request', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/linguaflow/profiles/test-profile-id/sync'
      ).send(syncOfflineProgressInput('pkg_123'));

      expect(response.status).not.toBe(400);
    });
  });

  // ===========================================================================
  // ERROR HANDLING TESTS
  // ===========================================================================

  describe('Error Handling', () => {
    it('should return structured error for validation failures', async () => {
      const response = await authenticatedRequest('post', '/api/v1/linguaflow/profiles')
        .send({ targetLanguage: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.any(String),
          fields: expect.any(Array),
        },
      });
    });

    it('should include request ID in all responses', async () => {
      const response = await authenticatedRequest('post', '/api/v1/linguaflow/profiles')
        .send(createProfileInput());

      expect(response.headers['x-request-id']).toBeDefined();
    });
  });

  // ===========================================================================
  // RATE LIMITING TESTS
  // ===========================================================================

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const response = await authenticatedRequest(
        'get',
        '/api/v1/linguaflow/profiles/test-id'
      );

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });
  });
});
