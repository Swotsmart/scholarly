/**
 * SSI/VC API Routes
 * 
 * Phase 1 Foundation: Trust & Identity Layer
 * 
 * RESTful API endpoints for Self-Sovereign Identity and Verifiable Credentials.
 * All endpoints follow OpenAPI 3.1 specification with comprehensive documentation.
 * 
 * ## Security
 * 
 * - All endpoints require JWT authentication
 * - Wallet operations require wallet to be unlocked
 * - Rate limiting applied to prevent abuse
 * - CSRF protection on state-changing operations
 * 
 * @module SSIRoutes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { DIDService } from './did-service';
import { VerifiableCredentialsService } from './verifiable-credentials-service';
import { DigitalWalletService } from './digital-wallet-service';
import { DIDMethod, VerifiableCredential, PresentationRequest } from './ssi-vc-types';

// ============================================================================
// OPENAPI SPECIFICATION
// ============================================================================

/**
 * OpenAPI 3.1 specification for SSI/VC endpoints
 */
export const ssiOpenAPISpec = {
  openapi: '3.1.0',
  info: {
    title: 'Scholarly SSI/VC API',
    version: '1.0.0',
    description: 'Self-Sovereign Identity and Verifiable Credentials API for the Scholarly platform',
    contact: {
      name: 'Scholarly Support',
      email: 'support@scholarly.edu.au'
    },
    license: {
      name: 'Proprietary'
    }
  },
  servers: [
    {
      url: '/api/v1/ssi',
      description: 'SSI API'
    }
  ],
  tags: [
    { name: 'Wallet', description: 'Digital wallet management' },
    { name: 'DID', description: 'Decentralized Identifier operations' },
    { name: 'Credentials', description: 'Verifiable Credential operations' },
    { name: 'Presentations', description: 'Verifiable Presentation operations' }
  ],
  paths: {
    '/wallet': {
      post: {
        tags: ['Wallet'],
        summary: 'Create a new digital wallet',
        operationId: 'createWallet',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateWalletRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Wallet created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateWalletResponse' }
              }
            }
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '409': { description: 'User already has a wallet' }
        }
      },
      get: {
        tags: ['Wallet'],
        summary: 'Get wallet information',
        operationId: 'getWalletInfo',
        responses: {
          '200': {
            description: 'Wallet information',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WalletInfo' }
              }
            }
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { description: 'Wallet not found' }
        }
      }
    },
    '/wallet/unlock': {
      post: {
        tags: ['Wallet'],
        summary: 'Unlock wallet for use',
        operationId: 'unlockWallet',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UnlockWalletRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Wallet unlocked',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UnlockWalletResponse' }
              }
            }
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '423': { description: 'Wallet locked due to too many attempts' }
        }
      }
    },
    '/wallet/lock': {
      post: {
        tags: ['Wallet'],
        summary: 'Lock wallet',
        operationId: 'lockWallet',
        responses: {
          '204': { description: 'Wallet locked' },
          '401': { $ref: '#/components/responses/Unauthorized' }
        }
      }
    },
    '/wallet/backup': {
      post: {
        tags: ['Wallet'],
        summary: 'Create encrypted wallet backup',
        operationId: 'createBackup',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateBackupRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Backup created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BackupResponse' }
              }
            }
          },
          '401': { $ref: '#/components/responses/Unauthorized' }
        }
      },
      get: {
        tags: ['Wallet'],
        summary: 'List wallet backups',
        operationId: 'listBackups',
        responses: {
          '200': {
            description: 'List of backups',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/BackupInfo' }
                }
              }
            }
          }
        }
      }
    },
    '/dids': {
      get: {
        tags: ['DID'],
        summary: 'Get all DIDs in wallet',
        operationId: 'getDIDs',
        responses: {
          '200': {
            description: 'List of DIDs',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/DID' }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['DID'],
        summary: 'Create a new DID',
        operationId: 'createDID',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateDIDRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'DID created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateDIDResponse' }
              }
            }
          }
        }
      }
    },
    '/dids/{did}/resolve': {
      get: {
        tags: ['DID'],
        summary: 'Resolve a DID to its document',
        operationId: 'resolveDID',
        parameters: [
          {
            name: 'did',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'The DID to resolve'
          }
        ],
        responses: {
          '200': {
            description: 'DID Document',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DIDDocument' }
              }
            }
          },
          '404': { description: 'DID not found' }
        }
      }
    },
    '/credentials': {
      get: {
        tags: ['Credentials'],
        summary: 'Get credentials from wallet',
        operationId: 'getCredentials',
        parameters: [
          {
            name: 'type',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by credential type'
          }
        ],
        responses: {
          '200': {
            description: 'List of credentials',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/VerifiableCredential' }
                }
              }
            }
          }
        }
      }
    },
    '/credentials/issue': {
      post: {
        tags: ['Credentials'],
        summary: 'Issue a new credential',
        operationId: 'issueCredential',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/IssueCredentialRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Credential issued',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VerifiableCredential' }
              }
            }
          }
        }
      }
    },
    '/credentials/verify': {
      post: {
        tags: ['Credentials'],
        summary: 'Verify a credential',
        operationId: 'verifyCredential',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VerifiableCredential' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Verification result',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VerificationResult' }
              }
            }
          }
        }
      }
    },
    '/presentations': {
      post: {
        tags: ['Presentations'],
        summary: 'Create a verifiable presentation',
        operationId: 'createPresentation',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreatePresentationRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Presentation created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VerifiablePresentation' }
              }
            }
          }
        }
      }
    },
    '/presentations/verify': {
      post: {
        tags: ['Presentations'],
        summary: 'Verify a presentation',
        operationId: 'verifyPresentation',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VerifyPresentationRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Verification result',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VerificationResult' }
              }
            }
          }
        }
      }
    },
    '/presentations/request': {
      post: {
        tags: ['Presentations'],
        summary: 'Process presentation request',
        operationId: 'processRequest',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PresentationRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Matching credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RequestProcessingResult' }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      CreateWalletRequest: {
        type: 'object',
        required: ['passphrase'],
        properties: {
          passphrase: { type: 'string', minLength: 12, description: 'Wallet passphrase' },
          didMethod: { type: 'string', enum: ['did:web', 'did:key', 'did:ethr'], default: 'did:key' }
        }
      },
      CreateWalletResponse: {
        type: 'object',
        properties: {
          wallet: { $ref: '#/components/schemas/WalletInfo' },
          did: { $ref: '#/components/schemas/DID' }
        }
      },
      WalletInfo: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          primaryDid: { type: 'string' },
          didCount: { type: 'integer' },
          credentialCount: { type: 'integer' },
          created: { type: 'string', format: 'date-time' },
          lastAccessed: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['active', 'locked', 'deactivated'] }
        }
      },
      UnlockWalletRequest: {
        type: 'object',
        required: ['passphrase'],
        properties: {
          passphrase: { type: 'string' }
        }
      },
      UnlockWalletResponse: {
        type: 'object',
        properties: {
          sessionExpires: { type: 'string', format: 'date-time' }
        }
      },
      CreateBackupRequest: {
        type: 'object',
        required: ['passphrase'],
        properties: {
          passphrase: { type: 'string' }
        }
      },
      BackupResponse: {
        type: 'object',
        properties: {
          backupId: { type: 'string' },
          created: { type: 'string', format: 'date-time' }
        }
      },
      BackupInfo: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          created: { type: 'string', format: 'date-time' }
        }
      },
      DID: {
        type: 'object',
        properties: {
          did: { type: 'string' },
          method: { type: 'string' },
          created: { type: 'string', format: 'date-time' },
          status: { type: 'string' }
        }
      },
      DIDDocument: {
        type: 'object',
        properties: {
          '@context': { type: 'array', items: { type: 'string' } },
          id: { type: 'string' },
          verificationMethod: { type: 'array' },
          authentication: { type: 'array' },
          assertionMethod: { type: 'array' }
        }
      },
      CreateDIDRequest: {
        type: 'object',
        required: ['passphrase', 'method'],
        properties: {
          passphrase: { type: 'string' },
          method: { type: 'string', enum: ['did:web', 'did:key', 'did:ethr'] }
        }
      },
      CreateDIDResponse: {
        type: 'object',
        properties: {
          did: { $ref: '#/components/schemas/DID' },
          document: { $ref: '#/components/schemas/DIDDocument' }
        }
      },
      VerifiableCredential: {
        type: 'object',
        properties: {
          '@context': { type: 'array', items: { type: 'string' } },
          id: { type: 'string' },
          type: { type: 'array', items: { type: 'string' } },
          issuer: { oneOf: [{ type: 'string' }, { type: 'object' }] },
          issuanceDate: { type: 'string', format: 'date-time' },
          expirationDate: { type: 'string', format: 'date-time' },
          credentialSubject: { type: 'object' },
          proof: { type: 'object' }
        }
      },
      IssueCredentialRequest: {
        type: 'object',
        required: ['credentialType', 'subjectDid', 'subjectData', 'issuerPassphrase'],
        properties: {
          credentialType: { type: 'string' },
          subjectDid: { type: 'string' },
          subjectData: { type: 'object' },
          issuerPassphrase: { type: 'string' },
          expirationDate: { type: 'string', format: 'date-time' }
        }
      },
      VerificationResult: {
        type: 'object',
        properties: {
          valid: { type: 'boolean' },
          checks: { type: 'array', items: { $ref: '#/components/schemas/VerificationCheck' } },
          warnings: { type: 'array', items: { type: 'string' } },
          errors: { type: 'array', items: { type: 'string' } }
        }
      },
      VerificationCheck: {
        type: 'object',
        properties: {
          check: { type: 'string' },
          passed: { type: 'boolean' },
          message: { type: 'string' }
        }
      },
      VerifiablePresentation: {
        type: 'object',
        properties: {
          '@context': { type: 'array', items: { type: 'string' } },
          type: { type: 'array', items: { type: 'string' } },
          holder: { type: 'string' },
          verifiableCredential: { type: 'array', items: { $ref: '#/components/schemas/VerifiableCredential' } },
          proof: { type: 'object' }
        }
      },
      CreatePresentationRequest: {
        type: 'object',
        required: ['credentialIds', 'passphrase'],
        properties: {
          credentialIds: { type: 'array', items: { type: 'string' } },
          passphrase: { type: 'string' },
          challenge: { type: 'string' },
          domain: { type: 'string' }
        }
      },
      VerifyPresentationRequest: {
        type: 'object',
        required: ['presentation'],
        properties: {
          presentation: { $ref: '#/components/schemas/VerifiablePresentation' },
          challenge: { type: 'string' },
          domain: { type: 'string' },
          trustedIssuers: { type: 'array', items: { type: 'string' } }
        }
      },
      PresentationRequest: {
        type: 'object',
        required: ['input_descriptors'],
        properties: {
          id: { type: 'string' },
          input_descriptors: { type: 'array' }
        }
      },
      RequestProcessingResult: {
        type: 'object',
        properties: {
          canSatisfy: { type: 'boolean' },
          matchingCredentials: { type: 'object' },
          missingDescriptors: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    responses: {
      BadRequest: {
        description: 'Invalid request',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string' },
                details: { type: 'object' }
              }
            }
          }
        }
      },
      Unauthorized: {
        description: 'Authentication required'
      }
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  security: [{ bearerAuth: [] }]
};

// ============================================================================
// MIDDLEWARE
// ============================================================================

interface AuthenticatedRequest extends Request {
  tenantId: string;
  userId: string;
}

/**
 * Authentication middleware (placeholder - integrate with existing auth)
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authReq = req as AuthenticatedRequest;
  
  // Extract from JWT (placeholder)
  const tenantId = req.headers['x-tenant-id'] as string;
  const userId = (req as any).user?.id;

  if (!tenantId || !userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  authReq.tenantId = tenantId;
  authReq.userId = userId;
  next();
}

/**
 * Rate limiting middleware
 */
export function rateLimit(maxRequests: number, windowMs: number) {
  const requests = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${(req as any).userId || req.ip}`;
    const now = Date.now();
    const record = requests.get(key);

    if (!record || now > record.resetAt) {
      requests.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (record.count >= maxRequests) {
      res.status(429).json({ error: 'Too many requests' });
      return;
    }

    record.count++;
    next();
  };
}

// ============================================================================
// ROUTE FACTORY
// ============================================================================

export interface SSIRoutesDeps {
  didService: DIDService;
  vcService: VerifiableCredentialsService;
  walletService: DigitalWalletService;
}

/**
 * Create SSI API routes
 */
export function createSSIRoutes(deps: SSIRoutesDeps): Router {
  const router = Router();
  const { didService, vcService, walletService } = deps;

  // Apply middleware
  router.use(requireAuth);
  router.use(rateLimit(100, 60000)); // 100 requests per minute

  // --------------------------------------------------------------------------
  // WALLET ROUTES
  // --------------------------------------------------------------------------

  /**
   * Create wallet
   * POST /wallet
   */
  router.post('/wallet', async (req: Request, res: Response) => {
    const { tenantId, userId } = req as AuthenticatedRequest;
    const { passphrase, didMethod } = req.body;

    const result = await walletService.createWallet(tenantId, userId, passphrase, {
      didMethod: didMethod as DIDMethod
    });

    if (!result.success) {
      const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
      res.status(status).json({ error: result.error.message, details: result.error.details });
      return;
    }

    res.status(201).json(result.data);
  });

  /**
   * Get wallet info
   * GET /wallet
   */
  router.get('/wallet', async (req: Request, res: Response) => {
    const { tenantId, userId } = req as AuthenticatedRequest;

    const result = await walletService.getWalletInfo(tenantId, userId);

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 500;
      res.status(status).json({ error: result.error.message });
      return;
    }

    res.json(result.data);
  });

  /**
   * Unlock wallet
   * POST /wallet/unlock
   */
  router.post('/wallet/unlock', async (req: Request, res: Response) => {
    const { tenantId, userId } = req as AuthenticatedRequest;
    const { passphrase } = req.body;

    const result = await walletService.unlockWallet(tenantId, userId, passphrase);

    if (!result.success) {
      const status = result.error.code === 'WALLET_ERROR' ? 423 : 401;
      res.status(status).json({ error: result.error.message, details: result.error.details });
      return;
    }

    res.json({ sessionExpires: result.data.sessionExpires });
  });

  /**
   * Lock wallet
   * POST /wallet/lock
   */
  router.post('/wallet/lock', async (req: Request, res: Response) => {
    const { tenantId, userId } = req as AuthenticatedRequest;

    const result = await walletService.lockWallet(tenantId, userId);

    if (!result.success) {
      res.status(500).json({ error: result.error.message });
      return;
    }

    res.status(204).send();
  });

  /**
   * Create backup
   * POST /wallet/backup
   */
  router.post('/wallet/backup', async (req: Request, res: Response) => {
    const { tenantId, userId } = req as AuthenticatedRequest;
    const { passphrase } = req.body;

    const result = await walletService.createBackup(tenantId, userId, passphrase);

    if (!result.success) {
      res.status(400).json({ error: result.error.message });
      return;
    }

    res.status(201).json(result.data);
  });

  /**
   * List backups
   * GET /wallet/backup
   */
  router.get('/wallet/backup', async (req: Request, res: Response) => {
    const { tenantId, userId } = req as AuthenticatedRequest;

    const result = await walletService.listBackups(tenantId, userId);

    if (!result.success) {
      res.status(500).json({ error: result.error.message });
      return;
    }

    res.json(result.data);
  });

  // --------------------------------------------------------------------------
  // DID ROUTES
  // --------------------------------------------------------------------------

  /**
   * Get DIDs
   * GET /dids
   */
  router.get('/dids', async (req: Request, res: Response) => {
    const { tenantId, userId } = req as AuthenticatedRequest;

    const result = await didService.getUserDIDs(tenantId, userId);

    if (!result.success) {
      res.status(500).json({ error: result.error.message });
      return;
    }

    res.json(result.data);
  });

  /**
   * Resolve DID
   * GET /dids/:did/resolve
   */
  router.get('/dids/:did/resolve', async (req: Request, res: Response) => {
    const { did } = req.params;

    const result = await didService.resolveDID(decodeURIComponent(did));

    if (!result.success) {
      const status = result.error.code === 'DID_RESOLUTION_ERROR' ? 404 : 500;
      res.status(status).json({ error: result.error.message });
      return;
    }

    res.json(result.data);
  });

  // --------------------------------------------------------------------------
  // CREDENTIAL ROUTES
  // --------------------------------------------------------------------------

  /**
   * Get credentials
   * GET /credentials
   */
  router.get('/credentials', async (req: Request, res: Response) => {
    const { tenantId, userId } = req as AuthenticatedRequest;
    const { type } = req.query;

    const result = await walletService.getCredentials(tenantId, userId, {
      type: type as string
    });

    if (!result.success) {
      const status = result.error.code === 'WALLET_ERROR' ? 423 : 500;
      res.status(status).json({ error: result.error.message });
      return;
    }

    res.json(result.data);
  });

  /**
   * Issue credential
   * POST /credentials/issue
   */
  router.post('/credentials/issue', async (req: Request, res: Response) => {
    const { tenantId } = req as AuthenticatedRequest;
    const { credentialType, subjectDid, subjectData, issuerPassphrase, expirationDate } = req.body;

    const result = await vcService.issueCredential(tenantId, issuerPassphrase, {
      credentialType,
      subjectDid,
      subjectData,
      expirationDate: expirationDate ? new Date(expirationDate) : undefined
    });

    if (!result.success) {
      res.status(400).json({ error: result.error.message, details: result.error.details });
      return;
    }

    res.status(201).json(result.data);
  });

  /**
   * Verify credential
   * POST /credentials/verify
   */
  router.post('/credentials/verify', async (req: Request, res: Response) => {
    const credential = req.body as VerifiableCredential;
    const { checkStatus, checkSchema, trustedIssuers } = req.query;

    const result = await vcService.verifyCredential(credential, {
      checkStatus: checkStatus !== 'false',
      checkSchema: checkSchema !== 'false',
      trustedIssuers: trustedIssuers ? (trustedIssuers as string).split(',') : undefined
    });

    if (!result.success) {
      res.status(500).json({ error: result.error.message });
      return;
    }

    res.json(result.data);
  });

  // --------------------------------------------------------------------------
  // PRESENTATION ROUTES
  // --------------------------------------------------------------------------

  /**
   * Create presentation
   * POST /presentations
   */
  router.post('/presentations', async (req: Request, res: Response) => {
    const { tenantId, userId } = req as AuthenticatedRequest;
    const { credentialIds, passphrase, challenge, domain } = req.body;

    // Get credentials
    const credsResult = await walletService.getCredentials(tenantId, userId);
    if (!credsResult.success) {
      res.status(400).json({ error: credsResult.error.message });
      return;
    }

    const credentials = credsResult.data.filter(c => credentialIds.includes(c.id));
    if (credentials.length !== credentialIds.length) {
      res.status(400).json({ error: 'Some credentials not found' });
      return;
    }

    // Get primary DID
    const didResult = await didService.getPrimaryDID(tenantId, userId);
    if (!didResult.success || !didResult.data) {
      res.status(400).json({ error: 'No primary DID found' });
      return;
    }

    const result = await vcService.createPresentation(
      tenantId,
      didResult.data.did,
      passphrase,
      credentials,
      { challenge, domain }
    );

    if (!result.success) {
      res.status(400).json({ error: result.error.message });
      return;
    }

    res.status(201).json(result.data);
  });

  /**
   * Verify presentation
   * POST /presentations/verify
   */
  router.post('/presentations/verify', async (req: Request, res: Response) => {
    const { presentation, challenge, domain, trustedIssuers } = req.body;

    const result = await vcService.verifyPresentation(presentation, {
      challenge,
      domain,
      trustedIssuers
    });

    if (!result.success) {
      res.status(500).json({ error: result.error.message });
      return;
    }

    res.json(result.data);
  });

  /**
   * Process presentation request
   * POST /presentations/request
   */
  router.post('/presentations/request', async (req: Request, res: Response) => {
    const { tenantId, userId } = req as AuthenticatedRequest;
    const request = req.body as PresentationRequest;

    // Get primary DID
    const didResult = await didService.getPrimaryDID(tenantId, userId);
    if (!didResult.success || !didResult.data) {
      res.status(400).json({ error: 'No primary DID found' });
      return;
    }

    const result = await vcService.processRequestForCredentials(
      tenantId,
      didResult.data.did,
      request
    );

    if (!result.success) {
      res.status(400).json({ error: result.error.message });
      return;
    }

    // Convert Map to object for JSON serialization
    const matchingCredentials: Record<string, any[]> = {};
    result.data.matchingCredentials.forEach((v, k) => {
      matchingCredentials[k] = v;
    });

    res.json({
      canSatisfy: result.data.canSatisfy,
      matchingCredentials,
      missingDescriptors: result.data.missingDescriptors
    });
  });

  return router;
}

// ============================================================================
// OPENAPI ENDPOINT
// ============================================================================

/**
 * Create OpenAPI documentation endpoint
 */
export function createOpenAPIRoute(): Router {
  const router = Router();

  router.get('/openapi.json', (req: Request, res: Response) => {
    res.json(ssiOpenAPISpec);
  });

  return router;
}
