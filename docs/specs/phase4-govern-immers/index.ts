/**
 * Scholarly Phase 4: Governance & Immersion
 * Module Index
 * 
 * This module exports all Phase 4 services and types for:
 * - DAO Governance (proposals, voting, delegation, treasury)
 * - Token Economy (EDU-Nexus token, staking, NFT marketplace)
 * - Developer Marketplace (app store, community requests, bounties)
 * - Virtual Language Immersion (2D, 3D, AR, VR, WebXR experiences)
 * 
 * @module ScholarlyPhase4
 */

// Base types (re-exported from main Scholarly types)
export * from './types';

// Phase 4 specific types
export * from './phase4-types';

// Services
export { DAOGovernanceService } from './dao-governance-service';
export { TokenEconomyService } from './token-economy-service';
export { DeveloperMarketplaceService } from './developer-marketplace-service';
export { VirtualLanguageImmersionService } from './language-immersion-service';

// Re-export repository interfaces
export type {
  // DAO Governance
  ProposalRepository,
  VoteRepository,
  DelegationRepository,
  DelegateProfileRepository
} from './dao-governance-service';

export type {
  // Token Economy
  TokenBalanceRepository,
  StakingPoolRepository,
  StakingPositionRepository,
  TokenRewardRepository,
  PublisherNFTRepository,
  ContentValidatorRepository,
  NFTPurchaseRepository,
  TokenBlockchainProvider,
  IPFSProvider
} from './token-economy-service';

export type {
  // Developer Marketplace
  DeveloperAccountRepository,
  MarketplaceAppRepository,
  AppInstallationRepository,
  AppReviewRepository,
  CommunityRequestRepository,
  FundingPledgeRepository,
  BountyClaimRepository,
  DeveloperPayoutRepository,
  PaymentProvider,
  NotificationProvider
} from './developer-marketplace-service';

export type {
  // Language Immersion
  ImmersionScenarioRepository,
  ImmersionSessionRepository,
  ImmersionResultRepository,
  LanguageExchangeRepository,
  VocabularyProgressRepository,
  SpeechRecognitionProvider,
  TextToSpeechProvider,
  AIConversationProvider,
  CredentialProvider
} from './language-immersion-service';

/**
 * Factory function to create all Phase 4 services
 */
export function createPhase4Services(
  deps: {
    eventBus: any;
    cache: any;
    config: any;
  },
  repositories: {
    dao: {
      proposalRepo: any;
      voteRepo: any;
      delegationRepo: any;
      delegateProfileRepo: any;
    };
    token: {
      balanceRepo: any;
      poolRepo: any;
      positionRepo: any;
      rewardRepo: any;
      nftRepo: any;
      validatorRepo: any;
      purchaseRepo: any;
    };
    marketplace: {
      developerRepo: any;
      appRepo: any;
      installationRepo: any;
      reviewRepo: any;
      requestRepo: any;
      pledgeRepo: any;
      claimRepo: any;
      payoutRepo: any;
    };
    immersion: {
      scenarioRepo: any;
      sessionRepo: any;
      resultRepo: any;
      exchangeRepo: any;
      vocabularyRepo: any;
    };
  },
  providers: {
    blockchain: any;
    wallet: any;
    ipfs: any;
    payment: any;
    notification: any;
    speechRecognition: any;
    tts: any;
    aiConversation: any;
    credentials: any;
  }
) {
  const { DAOGovernanceService } = require('./dao-governance-service');
  const { TokenEconomyService } = require('./token-economy-service');
  const { DeveloperMarketplaceService } = require('./developer-marketplace-service');
  const { VirtualLanguageImmersionService } = require('./language-immersion-service');

  return {
    daoGovernance: new DAOGovernanceService(
      deps,
      repositories.dao,
      { blockchainProvider: providers.blockchain, walletProvider: providers.wallet }
    ),
    tokenEconomy: new TokenEconomyService(
      deps,
      repositories.token,
      { blockchainProvider: providers.blockchain, ipfsProvider: providers.ipfs, walletProvider: providers.wallet }
    ),
    developerMarketplace: new DeveloperMarketplaceService(
      deps,
      repositories.marketplace,
      { paymentProvider: providers.payment, walletProvider: providers.wallet, notificationProvider: providers.notification }
    ),
    languageImmersion: new VirtualLanguageImmersionService(
      deps,
      repositories.immersion,
      { speechRecognition: providers.speechRecognition, tts: providers.tts, aiConversation: providers.aiConversation, credentials: providers.credentials }
    )
  };
}

export default createPhase4Services;
