/**
 * Core Blockchain Service
 *
 * Provides ethers.js integration for interacting with
 * Polygon smart contracts.
 */

import { ethers, Contract, Wallet, Provider, TransactionResponse, TransactionReceipt } from 'ethers';
import { ScholarlyBaseService, Result, success, failure, ScholarlyError } from './base.service';
import { log } from '../lib/logger';

// Contract ABIs (simplified - in production, import from typechain)
const SCHOLARLY_TOKEN_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function mint(address to, uint256 amount, string reason)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

const CREDENTIAL_NFT_ABI = [
  'function issueCredential(address recipient, string credentialType, uint256 expiresAt, bytes32 dataHash, string metadataURI) returns (uint256)',
  'function revokeCredential(uint256 tokenId, string reason)',
  'function verifyCredential(uint256 tokenId) view returns (bool valid, tuple(string credentialType, address issuer, uint256 issuedAt, uint256 expiresAt, bytes32 dataHash, bool revoked, uint256 revokedAt, string revocationReason) credential)',
  'function getHolderCredentials(address holder) view returns (uint256[])',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'event CredentialIssued(uint256 indexed tokenId, address indexed recipient, string credentialType, address issuer, bytes32 dataHash)',
  'event CredentialRevoked(uint256 indexed tokenId, address indexed revoker, string reason)',
];

const BOOKING_ESCROW_ABI = [
  'function createEscrow(bytes32 escrowId, bytes32 bookingId, address tutor, address token, uint256 amount, uint256 sessionScheduledAt)',
  'function fundEscrow(bytes32 escrowId)',
  'function releaseEscrow(bytes32 escrowId)',
  'function refundEscrow(bytes32 escrowId)',
  'function raiseDispute(bytes32 escrowId, string reason)',
  'function resolveDispute(bytes32 escrowId, uint256 learnerPercentage)',
  'function getEscrow(bytes32 escrowId) view returns (tuple(address learner, address tutor, address token, uint256 amount, uint256 platformFeeBps, bytes32 bookingId, uint8 state, uint256 createdAt, uint256 sessionScheduledAt, uint256 fundedAt, uint256 completedAt))',
  'event EscrowCreated(bytes32 indexed escrowId, bytes32 indexed bookingId, address indexed learner, address tutor, uint256 amount, address token)',
  'event EscrowFunded(bytes32 indexed escrowId, uint256 amount)',
  'event EscrowReleased(bytes32 indexed escrowId, uint256 tutorAmount, uint256 feeAmount)',
  'event EscrowRefunded(bytes32 indexed escrowId, uint256 amount)',
  'event DisputeRaised(bytes32 indexed escrowId, address indexed initiator, string reason)',
  'event DisputeResolved(bytes32 indexed escrowId, uint256 learnerAmount, uint256 tutorAmount, address arbiter)',
];

const REPUTATION_REGISTRY_ABI = [
  'function initializeUser(address user)',
  'function recordSessionCompletion(address user, uint256 rating)',
  'function recordSessionCancellation(address user, bool cancelledByThisUser)',
  'function recordDispute(address user, bool won)',
  'function getReputationScore(address user) view returns (uint256)',
  'function getReputationDetails(address user) view returns (uint256 totalSessions, uint256 completedSessions, uint256 completionRate, uint256 averageRating, uint256 disputesWon, uint256 disputesTotal, uint256 overallScore, uint256 lastUpdated)',
  'function hasReliableScore(address user) view returns (bool)',
  'event ReputationInitialized(address indexed user)',
  'event SessionRecorded(address indexed user, bool completed, uint256 rating)',
  'event DisputeRecorded(address indexed user, bool won)',
  'event ScoreUpdated(address indexed user, uint256 newScore, uint256 completionRate, uint256 averageRating)',
];

export interface BlockchainConfig {
  rpcUrl: string;
  privateKey: string;
  contracts: {
    scholarlyToken: string;
    credentialNFT: string;
    bookingEscrow: string;
    reputationRegistry: string;
  };
}

export interface TransactionResult {
  txHash: string;
  blockNumber: number;
  gasUsed: string;
  status: 'success' | 'failed';
}

export class BlockchainService extends ScholarlyBaseService {
  private provider: Provider;
  private wallet: Wallet;
  private contracts: {
    token: Contract;
    credential: Contract;
    escrow: Contract;
    reputation: Contract;
  };
  private blockchainConfig: BlockchainConfig;

  constructor(config: BlockchainConfig) {
    super('BlockchainService');
    this.blockchainConfig = config;

    // Initialize provider and wallet
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new Wallet(config.privateKey, this.provider);

    // Initialize contracts
    this.contracts = {
      token: new Contract(config.contracts.scholarlyToken, SCHOLARLY_TOKEN_ABI, this.wallet),
      credential: new Contract(config.contracts.credentialNFT, CREDENTIAL_NFT_ABI, this.wallet),
      escrow: new Contract(config.contracts.bookingEscrow, BOOKING_ESCROW_ABI, this.wallet),
      reputation: new Contract(config.contracts.reputationRegistry, REPUTATION_REGISTRY_ABI, this.wallet),
    };
  }

  // ============ Token Operations ============

  async getTokenBalance(address: string): Promise<Result<string>> {
    return this.withTiming('getTokenBalance', async () => {
      try {
        const balance = await this.contracts.token.balanceOf(address);
        return success(ethers.formatEther(balance));
      } catch (error) {
        return failure({
          code: 'CHAIN_003',
          message: 'Failed to get token balance',
          details: { address, error: (error as Error).message },
        });
      }
    });
  }

  async mintTokens(
    to: string,
    amount: string,
    reason: string
  ): Promise<Result<TransactionResult>> {
    return this.withTiming('mintTokens', async () => {
      try {
        const amountWei = ethers.parseEther(amount);
        const tx: TransactionResponse = await this.contracts.token.mint(to, amountWei, reason);

        log.blockchain.txSubmitted(tx.hash, 'mint', to);

        const receipt = await tx.wait();
        if (!receipt) {
          return failure({ code: 'CHAIN_001', message: 'Transaction receipt null' });
        }

        log.blockchain.txConfirmed(tx.hash, receipt.blockNumber);

        return success({
          txHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          status: receipt.status === 1 ? 'success' : 'failed',
        });
      } catch (error) {
        log.blockchain.txFailed('pending', (error as Error).message);
        return failure({
          code: 'CHAIN_001',
          message: 'Token mint failed',
          details: { to, amount, error: (error as Error).message },
        });
      }
    });
  }

  // ============ Credential Operations ============

  async issueCredential(
    recipient: string,
    credentialType: string,
    expiresAt: number,
    dataHash: string,
    metadataURI: string
  ): Promise<Result<{ tokenId: string; txHash: string }>> {
    return this.withTiming('issueCredential', async () => {
      try {
        const tx: TransactionResponse = await this.contracts.credential.issueCredential(
          recipient,
          credentialType,
          expiresAt,
          dataHash,
          metadataURI
        );

        log.blockchain.txSubmitted(tx.hash, 'issueCredential', recipient);

        const receipt = await tx.wait();
        if (!receipt) {
          return failure({ code: 'CHAIN_001', message: 'Transaction receipt null' });
        }

        // Parse event to get token ID
        const event = receipt.logs.find(
          (l) => l.topics[0] === ethers.id('CredentialIssued(uint256,address,string,address,bytes32)')
        );
        const tokenId = event ? BigInt(event.topics[1]).toString() : 'unknown';

        log.blockchain.credentialIssued(tokenId, recipient, credentialType);

        return success({
          tokenId,
          txHash: tx.hash,
        });
      } catch (error) {
        return failure({
          code: 'CHAIN_001',
          message: 'Credential issuance failed',
          details: { recipient, credentialType, error: (error as Error).message },
        });
      }
    });
  }

  async verifyCredential(
    tokenId: string
  ): Promise<Result<{ valid: boolean; credential: any }>> {
    return this.withTiming('verifyCredential', async () => {
      try {
        const [valid, credential] = await this.contracts.credential.verifyCredential(tokenId);
        return success({ valid, credential });
      } catch (error) {
        return failure({
          code: 'CHAIN_010',
          message: 'Credential verification failed',
          details: { tokenId, error: (error as Error).message },
        });
      }
    });
  }

  async revokeCredential(tokenId: string, reason: string): Promise<Result<TransactionResult>> {
    return this.withTiming('revokeCredential', async () => {
      try {
        const tx: TransactionResponse = await this.contracts.credential.revokeCredential(
          tokenId,
          reason
        );

        const receipt = await tx.wait();
        if (!receipt) {
          return failure({ code: 'CHAIN_001', message: 'Transaction receipt null' });
        }

        return success({
          txHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          status: receipt.status === 1 ? 'success' : 'failed',
        });
      } catch (error) {
        return failure({
          code: 'CHAIN_001',
          message: 'Credential revocation failed',
          details: { tokenId, error: (error as Error).message },
        });
      }
    });
  }

  async getHolderCredentials(address: string): Promise<Result<string[]>> {
    return this.withTiming('getHolderCredentials', async () => {
      try {
        const tokenIds = await this.contracts.credential.getHolderCredentials(address);
        return success(tokenIds.map((id: bigint) => id.toString()));
      } catch (error) {
        return failure({
          code: 'CHAIN_003',
          message: 'Failed to get holder credentials',
          details: { address, error: (error as Error).message },
        });
      }
    });
  }

  // ============ Escrow Operations ============

  async createEscrow(
    escrowId: string,
    bookingId: string,
    tutor: string,
    amount: string,
    sessionScheduledAt: number
  ): Promise<Result<TransactionResult>> {
    return this.withTiming('createEscrow', async () => {
      try {
        const amountWei = ethers.parseEther(amount);
        const escrowIdBytes = ethers.id(escrowId);
        const bookingIdBytes = ethers.id(bookingId);

        const tx: TransactionResponse = await this.contracts.escrow.createEscrow(
          escrowIdBytes,
          bookingIdBytes,
          tutor,
          this.blockchainConfig.contracts.scholarlyToken,
          amountWei,
          sessionScheduledAt
        );

        log.blockchain.txSubmitted(tx.hash, 'createEscrow', escrowId);
        log.blockchain.escrowCreated(escrowId, bookingId, amount);

        const receipt = await tx.wait();
        if (!receipt) {
          return failure({ code: 'CHAIN_001', message: 'Transaction receipt null' });
        }

        return success({
          txHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          status: receipt.status === 1 ? 'success' : 'failed',
        });
      } catch (error) {
        return failure({
          code: 'CHAIN_001',
          message: 'Escrow creation failed',
          details: { escrowId, error: (error as Error).message },
        });
      }
    });
  }

  async releaseEscrow(escrowId: string): Promise<Result<TransactionResult>> {
    return this.withTiming('releaseEscrow', async () => {
      try {
        const escrowIdBytes = ethers.id(escrowId);
        const tx: TransactionResponse = await this.contracts.escrow.releaseEscrow(escrowIdBytes);

        log.blockchain.txSubmitted(tx.hash, 'releaseEscrow', escrowId);

        const receipt = await tx.wait();
        if (!receipt) {
          return failure({ code: 'CHAIN_001', message: 'Transaction receipt null' });
        }

        return success({
          txHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          status: receipt.status === 1 ? 'success' : 'failed',
        });
      } catch (error) {
        return failure({
          code: 'CHAIN_001',
          message: 'Escrow release failed',
          details: { escrowId, error: (error as Error).message },
        });
      }
    });
  }

  async refundEscrow(escrowId: string): Promise<Result<TransactionResult>> {
    return this.withTiming('refundEscrow', async () => {
      try {
        const escrowIdBytes = ethers.id(escrowId);
        const tx: TransactionResponse = await this.contracts.escrow.refundEscrow(escrowIdBytes);

        const receipt = await tx.wait();
        if (!receipt) {
          return failure({ code: 'CHAIN_001', message: 'Transaction receipt null' });
        }

        return success({
          txHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          status: receipt.status === 1 ? 'success' : 'failed',
        });
      } catch (error) {
        return failure({
          code: 'CHAIN_001',
          message: 'Escrow refund failed',
          details: { escrowId, error: (error as Error).message },
        });
      }
    });
  }

  async getEscrowDetails(escrowId: string): Promise<Result<any>> {
    return this.withTiming('getEscrowDetails', async () => {
      try {
        const escrowIdBytes = ethers.id(escrowId);
        const escrow = await this.contracts.escrow.getEscrow(escrowIdBytes);
        return success(escrow);
      } catch (error) {
        return failure({
          code: 'PAYM_006',
          message: 'Escrow not found',
          details: { escrowId, error: (error as Error).message },
        });
      }
    });
  }

  // ============ Reputation Operations ============

  async initializeUserReputation(address: string): Promise<Result<TransactionResult>> {
    return this.withTiming('initializeUserReputation', async () => {
      try {
        const tx: TransactionResponse = await this.contracts.reputation.initializeUser(address);

        const receipt = await tx.wait();
        if (!receipt) {
          return failure({ code: 'CHAIN_001', message: 'Transaction receipt null' });
        }

        return success({
          txHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          status: receipt.status === 1 ? 'success' : 'failed',
        });
      } catch (error) {
        return failure({
          code: 'CHAIN_001',
          message: 'User reputation initialization failed',
          details: { address, error: (error as Error).message },
        });
      }
    });
  }

  async recordSessionCompletion(
    address: string,
    rating: number // 100-500 scale
  ): Promise<Result<TransactionResult>> {
    return this.withTiming('recordSessionCompletion', async () => {
      try {
        const tx: TransactionResponse = await this.contracts.reputation.recordSessionCompletion(
          address,
          rating
        );

        const receipt = await tx.wait();
        if (!receipt) {
          return failure({ code: 'CHAIN_001', message: 'Transaction receipt null' });
        }

        return success({
          txHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          status: receipt.status === 1 ? 'success' : 'failed',
        });
      } catch (error) {
        return failure({
          code: 'CHAIN_001',
          message: 'Session completion recording failed',
          details: { address, rating, error: (error as Error).message },
        });
      }
    });
  }

  async getReputationScore(address: string): Promise<Result<number>> {
    return this.withTiming('getReputationScore', async () => {
      try {
        const score = await this.contracts.reputation.getReputationScore(address);
        return success(Number(score));
      } catch (error) {
        return failure({
          code: 'CHAIN_003',
          message: 'Failed to get reputation score',
          details: { address, error: (error as Error).message },
        });
      }
    });
  }

  async getReputationDetails(address: string): Promise<Result<{
    totalSessions: number;
    completedSessions: number;
    completionRate: number;
    averageRating: number;
    disputesWon: number;
    disputesTotal: number;
    overallScore: number;
    lastUpdated: number;
  }>> {
    return this.withTiming('getReputationDetails', async () => {
      try {
        const details = await this.contracts.reputation.getReputationDetails(address);
        return success({
          totalSessions: Number(details.totalSessions),
          completedSessions: Number(details.completedSessions),
          completionRate: Number(details.completionRate),
          averageRating: Number(details.averageRating),
          disputesWon: Number(details.disputesWon),
          disputesTotal: Number(details.disputesTotal),
          overallScore: Number(details.overallScore),
          lastUpdated: Number(details.lastUpdated),
        });
      } catch (error) {
        return failure({
          code: 'CHAIN_003',
          message: 'Failed to get reputation details',
          details: { address, error: (error as Error).message },
        });
      }
    });
  }

  // ============ Utility Functions ============

  async getGasPrice(): Promise<Result<string>> {
    try {
      const feeData = await this.provider.getFeeData();
      return success(ethers.formatUnits(feeData.gasPrice || 0, 'gwei'));
    } catch (error) {
      return failure({
        code: 'CHAIN_003',
        message: 'Failed to get gas price',
        details: { error: (error as Error).message },
      });
    }
  }

  async getWalletAddress(): Promise<string> {
    return this.wallet.address;
  }

  hashData(data: string): string {
    return ethers.id(data);
  }
}

// Factory function for creating blockchain service
export function createBlockchainService(): BlockchainService | null {
  const config: BlockchainConfig = {
    rpcUrl: process.env.POLYGON_RPC_URL || '',
    privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY || '',
    contracts: {
      scholarlyToken: process.env.SCHOLARLY_TOKEN_ADDRESS || '',
      credentialNFT: process.env.CREDENTIAL_NFT_ADDRESS || '',
      bookingEscrow: process.env.BOOKING_ESCROW_ADDRESS || '',
      reputationRegistry: process.env.REPUTATION_REGISTRY_ADDRESS || '',
    },
  };

  // Validate config
  if (!config.rpcUrl || !config.privateKey) {
    log.warn('Blockchain service not configured - missing RPC URL or private key');
    return null;
  }

  return new BlockchainService(config);
}
