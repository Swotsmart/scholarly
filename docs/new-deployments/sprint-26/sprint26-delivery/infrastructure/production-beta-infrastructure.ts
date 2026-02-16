// ============================================================================
// SCHOLARLY PLATFORM — Sprint 26, Path B
// Production Environment + Beta Infrastructure
// ============================================================================
//
// Sprint 25 stress-tested the railway at staging speed with 170 virtual
// passengers and documented every vibration, every pressure reading, every
// millisecond of delay. Sprint 26 Path B is opening day: we provision the
// real station, lay the production-grade track, install the security
// checkpoints, and write the emergency procedures.
//
// If Sprint 25 was the Formula 1 pre-season test (same car, practice
// circuit, telemetry), Sprint 26 is race day infrastructure: the real
// circuit with real crash barriers, real marshals, real medical teams,
// and real spectators. The car is ready — we proved that in Sprint 25.
// Now we build the venue it races in.
//
// Four deliverables, each a pillar of production readiness:
//
//   B26-001: TERRAFORM PRODUCTION ENVIRONMENT
//     The real venue. Multi-AZ RDS (db.r6g.large) instead of staging's
//     db.t3.medium. ElastiCache r6g.large with a replica instead of
//     t3.micro. 3-node NATS cluster instead of 1. ECS auto-scaling
//     with production-grade task definitions. Route53 DNS. ACM
//     certificates. Every Sprint 25 capacity plan recommendation
//     implemented as actual Terraform.
//
//   B26-002: BETA ACCESS MANAGEMENT
//     The guest list and ushers. Invite codes with cohort assignment
//     (educator-beta, parent-beta, general-beta). Feature flags via
//     a lightweight Unleash-compatible service for gradual rollout.
//     In-app feedback collection so beta testers can report issues
//     from inside the reading experience. Cohort-level analytics
//     to compare engagement across beta groups.
//
//   B26-003: SECURITY PENETRATION TEST
//     The safety inspection before the public enters. OWASP ZAP
//     automated scan against every API endpoint. Manual review of
//     auth flows (login, token refresh, role escalation). File upload
//     testing (storybook illustrations). API input fuzzing. Every
//     critical/high finding must be remediated before launch.
//
//   B26-004: DISASTER RECOVERY VERIFICATION
//     The emergency plan. RDS snapshot restore (tested, timed). S3
//     cross-region replication verification. Service restart runbooks.
//     Database failover procedure. Rollback procedures for bad deploys.
//     Like fire drills before a building opens to the public — you
//     hope you never need them, but the inspectors won't sign off
//     without proof they work.
//
// Consumes from prior sprints:
//   - All Terraform modules from Sprints 19-22 (VPC, RDS, Redis, S3,
//     CDN, Auth0, API Gateway, NATS — the building blocks composed
//     into a production environment)
//   - ECS + CI/CD from Sprint 23 (staging → production promotion)
//   - Grafana dashboards from Sprint 24 (production monitoring)
//   - Performance baseline from Sprint 25 (sizing validation)
//   - Capacity plans from Sprint 25 (instance size decisions)
//   - CDN cache behaviours from Sprint 25 (production CloudFront)
//
// Produces for Sprint 27:
//   - Production environment ready for self-composing interface
//   - Beta cohorts receiving real content
//   - Security clearance for public-facing deployment
//   - Tested disaster recovery procedures
// ============================================================================

import { ScholarlyBaseService, Result, ok, fail } from '../shared/base';

// ============================================================================
// Section 1: Terraform Production Environment (B26-001)
// ============================================================================

// ── Environment Definitions ─────────────────────────────────

export type Environment = 'development' | 'staging' | 'production';

export interface EnvironmentConfig {
  readonly name: Environment;
  readonly description: string;
  readonly region: string;
  readonly availabilityZones: string[];
  readonly dns: DnsConfig;
  readonly compute: ComputeConfig;
  readonly database: DatabaseConfig;
  readonly cache: CacheConfig;
  readonly messaging: MessagingConfig;
  readonly cdn: CdnConfig;
  readonly monitoring: MonitoringConfig;
  readonly backup: BackupConfig;
  readonly tags: Record<string, string>;
}

export interface DnsConfig {
  readonly hostedZoneId: string;
  readonly domainName: string;
  readonly apiSubdomain: string;
  readonly cdnSubdomain: string;
  readonly certificateArn: string;
  readonly healthCheckEnabled: boolean;
}

export interface ComputeConfig {
  readonly ecsCluster: {
    readonly name: string;
    readonly capacityProviders: ('FARGATE' | 'FARGATE_SPOT')[];
    readonly defaultCapacityProviderWeight: number;
  };
  readonly apiService: EcsServiceConfig;
  readonly workerService: EcsServiceConfig;
}

export interface EcsServiceConfig {
  readonly name: string;
  readonly cpu: number;
  readonly memory: number;
  readonly desiredCount: number;
  readonly minCapacity: number;
  readonly maxCapacity: number;
  readonly scalingTargetCpuPercent: number;
  readonly scalingTargetMemoryPercent: number;
  readonly healthCheckGracePeriod: number;
  readonly deregistrationDelay: number;
  readonly circuitBreaker: { enabled: boolean; rollback: boolean };
}

export interface DatabaseConfig {
  readonly instanceClass: string;
  readonly engine: string;
  readonly engineVersion: string;
  readonly allocatedStorage: number;
  readonly maxAllocatedStorage: number;
  readonly multiAz: boolean;
  readonly readReplica: boolean;
  readonly backupRetention: number;
  readonly backupWindow: string;
  readonly maintenanceWindow: string;
  readonly deletionProtection: boolean;
  readonly performanceInsights: boolean;
  readonly enhancedMonitoring: boolean;
  readonly monitoringInterval: number;
  readonly parameterGroup: DatabaseParameterGroup;
  readonly connectionLimits: { min: number; max: number; idleTimeout: number };
}

export interface DatabaseParameterGroup {
  readonly family: string;
  readonly parameters: Record<string, string>;
}

export interface CacheConfig {
  readonly nodeType: string;
  readonly numCacheClusters: number;
  readonly automaticFailover: boolean;
  readonly atRestEncryption: boolean;
  readonly transitEncryption: boolean;
  readonly snapshotRetention: number;
  readonly snapshotWindow: string;
  readonly maintenanceWindow: string;
  readonly parameterGroup: Record<string, string>;
}

export interface MessagingConfig {
  readonly clusterSize: number;
  readonly instanceType: string;
  readonly jetstream: { maxMemory: string; maxStorage: string; storeDir: string };
  readonly tls: boolean;
  readonly authorization: boolean;
}

export interface CdnConfig {
  readonly priceClass: 'PriceClass_100' | 'PriceClass_200' | 'PriceClass_All';
  readonly originShield: { enabled: boolean; region: string };
  readonly wafEnabled: boolean;
  readonly loggingEnabled: boolean;
  readonly geoRestrictions: string[];
}

export interface MonitoringConfig {
  readonly grafanaEnabled: boolean;
  readonly alertsEnabled: boolean;
  readonly logRetention: number;
  readonly dashboardAutoProvision: boolean;
  readonly pagerdutyIntegration: boolean;
  readonly slackIntegration: boolean;
}

export interface BackupConfig {
  readonly rdsSnapshots: { enabled: boolean; retentionDays: number; copyToRegion?: string };
  readonly s3Replication: { enabled: boolean; destinationRegion: string; destinationBucket: string };
  readonly pointInTimeRecovery: boolean;
}

// ── Staging vs Production Comparison ────────────────────────
// This is the Sprint 25 capacity plan made concrete. Every sizing
// decision here traces back to a load test result and headroom
// calculation from B25-004.

export const STAGING_CONFIG: EnvironmentConfig = {
  name: 'staging',
  description: 'Pre-production environment for testing and QA',
  region: 'ap-southeast-2',
  availabilityZones: ['ap-southeast-2a', 'ap-southeast-2b'],
  dns: {
    hostedZoneId: 'Z_STAGING',
    domainName: 'staging.scholarly.app',
    apiSubdomain: 'api.staging.scholarly.app',
    cdnSubdomain: 'cdn.staging.scholarly.app',
    certificateArn: 'arn:aws:acm:ap-southeast-2:ACCOUNT:certificate/staging-cert',
    healthCheckEnabled: true,
  },
  compute: {
    ecsCluster: { name: 'scholarly-staging', capacityProviders: ['FARGATE'], defaultCapacityProviderWeight: 1 },
    apiService: {
      name: 'api-staging', cpu: 512, memory: 1024, desiredCount: 1,
      minCapacity: 1, maxCapacity: 4, scalingTargetCpuPercent: 70,
      scalingTargetMemoryPercent: 80, healthCheckGracePeriod: 60,
      deregistrationDelay: 30, circuitBreaker: { enabled: true, rollback: true },
    },
    workerService: {
      name: 'worker-staging', cpu: 256, memory: 512, desiredCount: 1,
      minCapacity: 1, maxCapacity: 2, scalingTargetCpuPercent: 80,
      scalingTargetMemoryPercent: 80, healthCheckGracePeriod: 60,
      deregistrationDelay: 30, circuitBreaker: { enabled: true, rollback: false },
    },
  },
  database: {
    instanceClass: 'db.t3.medium', engine: 'postgres', engineVersion: '16.4',
    allocatedStorage: 20, maxAllocatedStorage: 50, multiAz: false, readReplica: false,
    backupRetention: 7, backupWindow: '03:00-04:00', maintenanceWindow: 'sun:04:00-sun:05:00',
    deletionProtection: false, performanceInsights: true, enhancedMonitoring: true,
    monitoringInterval: 60,
    parameterGroup: { family: 'postgres16', parameters: { 'log_min_duration_statement': '100', 'shared_preload_libraries': 'pg_stat_statements', 'pg_stat_statements.track': 'all' } },
    connectionLimits: { min: 5, max: 20, idleTimeout: 30000 },
  },
  cache: {
    nodeType: 'cache.t3.micro', numCacheClusters: 1, automaticFailover: false,
    atRestEncryption: true, transitEncryption: true, snapshotRetention: 1,
    snapshotWindow: '03:00-04:00', maintenanceWindow: 'sun:05:00-sun:06:00',
    parameterGroup: { 'maxmemory-policy': 'allkeys-lru' },
  },
  messaging: {
    clusterSize: 1, instanceType: 't3.small',
    jetstream: { maxMemory: '256MB', maxStorage: '1GB', storeDir: '/data/jetstream' },
    tls: true, authorization: true,
  },
  cdn: {
    priceClass: 'PriceClass_200', originShield: { enabled: true, region: 'ap-southeast-2' },
    wafEnabled: false, loggingEnabled: true, geoRestrictions: [],
  },
  monitoring: {
    grafanaEnabled: true, alertsEnabled: true, logRetention: 14,
    dashboardAutoProvision: true, pagerdutyIntegration: false, slackIntegration: true,
  },
  backup: {
    rdsSnapshots: { enabled: true, retentionDays: 7 },
    s3Replication: { enabled: false, destinationRegion: '', destinationBucket: '' },
    pointInTimeRecovery: true,
  },
  tags: { Environment: 'staging', Project: 'scholarly', ManagedBy: 'terraform' },
};

export const PRODUCTION_CONFIG: EnvironmentConfig = {
  name: 'production',
  description: 'Production environment serving real users — the live venue',
  region: 'ap-southeast-2',
  availabilityZones: ['ap-southeast-2a', 'ap-southeast-2b', 'ap-southeast-2c'],
  dns: {
    hostedZoneId: 'Z_PRODUCTION',
    domainName: 'scholarly.app',
    apiSubdomain: 'api.scholarly.app',
    cdnSubdomain: 'cdn.scholarly.app',
    certificateArn: 'arn:aws:acm:ap-southeast-2:ACCOUNT:certificate/prod-cert',
    healthCheckEnabled: true,
  },
  compute: {
    ecsCluster: {
      name: 'scholarly-production',
      capacityProviders: ['FARGATE', 'FARGATE_SPOT'],
      defaultCapacityProviderWeight: 3,         // 75% Fargate, 25% Spot for workers
    },
    apiService: {
      name: 'api-production', cpu: 1024, memory: 2048, desiredCount: 2,
      minCapacity: 2, maxCapacity: 8, scalingTargetCpuPercent: 60,
      scalingTargetMemoryPercent: 70, healthCheckGracePeriod: 120,
      deregistrationDelay: 60, circuitBreaker: { enabled: true, rollback: true },
    },
    workerService: {
      name: 'worker-production', cpu: 512, memory: 1024, desiredCount: 2,
      minCapacity: 1, maxCapacity: 6, scalingTargetCpuPercent: 70,
      scalingTargetMemoryPercent: 80, healthCheckGracePeriod: 120,
      deregistrationDelay: 60, circuitBreaker: { enabled: true, rollback: true },
    },
  },
  database: {
    instanceClass: 'db.r6g.large',   // Sprint 25 B25-004: "For production: db.r6g.large (2 vCPU / 16 GB)"
    engine: 'postgres', engineVersion: '16.4',
    allocatedStorage: 100, maxAllocatedStorage: 500,
    multiAz: true,                    // Production: Multi-AZ for automatic failover
    readReplica: true,                // Sprint 25: "Add read replica at 500+ users"
    backupRetention: 35,              // 5 weeks of daily snapshots
    backupWindow: '02:00-03:00',
    maintenanceWindow: 'sun:03:00-sun:04:00',
    deletionProtection: true,         // Production: prevent accidental deletion
    performanceInsights: true,
    enhancedMonitoring: true,
    monitoringInterval: 15,           // 15-second granularity in production
    parameterGroup: {
      family: 'postgres16',
      parameters: {
        'log_min_duration_statement': '50',        // Log queries >50ms
        'shared_preload_libraries': 'pg_stat_statements,pg_cron',
        'pg_stat_statements.track': 'all',
        'pg_stat_statements.max': '10000',
        'max_connections': '200',                   // r6g.large supports up to 1600
        'work_mem': '32MB',                         // 16GB RAM allows generous work_mem
        'maintenance_work_mem': '512MB',
        'effective_cache_size': '12GB',             // ~75% of 16GB
        'random_page_cost': '1.1',                  // SSD storage
        'checkpoint_completion_target': '0.9',
        'wal_buffers': '64MB',
        'default_statistics_target': '200',
      },
    },
    connectionLimits: { min: 10, max: 50, idleTimeout: 30000 },
  },
  cache: {
    nodeType: 'cache.r6g.large',      // Sprint 25: "For production: cache.r6g.large with 1 replica"
    numCacheClusters: 2,              // Primary + 1 replica
    automaticFailover: true,
    atRestEncryption: true, transitEncryption: true,
    snapshotRetention: 7,
    snapshotWindow: '02:00-03:00',
    maintenanceWindow: 'sun:04:00-sun:05:00',
    parameterGroup: {
      'maxmemory-policy': 'allkeys-lru',
      'notify-keyspace-events': 'Ex',   // Expiry notifications for session cleanup
    },
  },
  messaging: {
    clusterSize: 3,                    // Sprint 25: "For production: 3-node cluster"
    instanceType: 't3.medium',
    jetstream: { maxMemory: '1GB', maxStorage: '10GB', storeDir: '/data/jetstream' },
    tls: true, authorization: true,
  },
  cdn: {
    priceClass: 'PriceClass_200',      // AP + EU + NA coverage
    originShield: { enabled: true, region: 'ap-southeast-2' },
    wafEnabled: true,                  // Production: WAF for DDoS protection
    loggingEnabled: true,
    geoRestrictions: [],               // No geo restrictions for global beta
  },
  monitoring: {
    grafanaEnabled: true, alertsEnabled: true, logRetention: 90,
    dashboardAutoProvision: true, pagerdutyIntegration: true, slackIntegration: true,
  },
  backup: {
    rdsSnapshots: { enabled: true, retentionDays: 35, copyToRegion: 'ap-southeast-1' },
    s3Replication: {
      enabled: true,
      destinationRegion: 'ap-southeast-1',
      destinationBucket: 'scholarly-production-replica-apse1',
    },
    pointInTimeRecovery: true,
  },
  tags: { Environment: 'production', Project: 'scholarly', ManagedBy: 'terraform', CostCenter: 'product' },
};

// ── Terraform Generator ─────────────────────────────────────
// Generates the production Terraform that composes all Sprint 19-22
// modules into a full production stack. This is the architectural
// equivalent of assembling prefabricated building sections — each
// module was tested individually, now we bolt them together on the
// production site.

export interface TerraformModule {
  readonly source: string;            // Sprint source: e.g. "../modules/vpc" from Sprint 19
  readonly variables: Record<string, unknown>;
  readonly description: string;
  readonly sprintOrigin: number;      // Which sprint created this module
}

export class ProductionTerraformGenerator extends ScholarlyBaseService {
  private config: EnvironmentConfig;

  constructor(config: EnvironmentConfig) {
    super({}, 'ProductionTerraformGenerator');
    this.config = config;
  }

  /**
   * Generate the complete production Terraform configuration.
   * Each module references infrastructure built in Sprints 19-22,
   * sized according to Sprint 25's capacity plans.
   */
  generateProductionTerraform(): Result<string> {
    const c = this.config;
    const modules: TerraformModule[] = [
      // Sprint 19: VPC + Database
      {
        source: '../modules/vpc',
        sprintOrigin: 19,
        description: 'VPC with 3 AZs, public/private/data subnets, NAT gateways',
        variables: {
          environment: c.name,
          region: c.region,
          availability_zones: c.availabilityZones,
          vpc_cidr: '10.0.0.0/16',
          enable_nat_gateway: true,
          single_nat_gateway: false,       // Production: NAT per AZ for HA
          enable_flow_logs: true,
        },
      },
      {
        source: '../modules/database',
        sprintOrigin: 19,
        description: 'RDS PostgreSQL with Multi-AZ, read replica, Performance Insights',
        variables: {
          environment: c.name,
          instance_class: c.database.instanceClass,
          engine_version: c.database.engineVersion,
          allocated_storage: c.database.allocatedStorage,
          max_allocated_storage: c.database.maxAllocatedStorage,
          multi_az: c.database.multiAz,
          create_read_replica: c.database.readReplica,
          backup_retention_period: c.database.backupRetention,
          backup_window: c.database.backupWindow,
          maintenance_window: c.database.maintenanceWindow,
          deletion_protection: c.database.deletionProtection,
          performance_insights_enabled: c.database.performanceInsights,
          monitoring_interval: c.database.monitoringInterval,
          parameter_group_parameters: c.database.parameterGroup.parameters,
          subnet_group_name: '${module.vpc.database_subnet_group_name}',
          vpc_security_group_ids: ['${module.vpc.database_security_group_id}'],
        },
      },
      // Sprint 19: Redis cache
      {
        source: '../modules/cache',
        sprintOrigin: 19,
        description: 'ElastiCache Redis with automatic failover and replica',
        variables: {
          environment: c.name,
          node_type: c.cache.nodeType,
          num_cache_clusters: c.cache.numCacheClusters,
          automatic_failover_enabled: c.cache.automaticFailover,
          at_rest_encryption_enabled: c.cache.atRestEncryption,
          transit_encryption_enabled: c.cache.transitEncryption,
          snapshot_retention_limit: c.cache.snapshotRetention,
          snapshot_window: c.cache.snapshotWindow,
          maintenance_window: c.cache.maintenanceWindow,
          parameter_group_parameters: c.cache.parameterGroup,
          subnet_group_name: '${module.vpc.cache_subnet_group_name}',
          security_group_ids: ['${module.vpc.cache_security_group_id}'],
        },
      },
      // Sprint 20: S3 + CloudFront
      {
        source: '../modules/storage',
        sprintOrigin: 20,
        description: 'S3 buckets for storybook content with versioning and lifecycle',
        variables: {
          environment: c.name,
          enable_versioning: true,
          enable_replication: c.backup.s3Replication.enabled,
          replication_destination_region: c.backup.s3Replication.destinationRegion,
          replication_destination_bucket: c.backup.s3Replication.destinationBucket,
          lifecycle_ia_transition_days: 90,
          lifecycle_glacier_transition_days: 365,
        },
      },
      {
        source: '../modules/cdn',
        sprintOrigin: 20,
        description: 'CloudFront with Sprint 25 optimised cache behaviours',
        variables: {
          environment: c.name,
          price_class: c.cdn.priceClass,
          origin_shield_enabled: c.cdn.originShield.enabled,
          origin_shield_region: c.cdn.originShield.region,
          waf_enabled: c.cdn.wafEnabled,
          logging_enabled: c.cdn.loggingEnabled,
          certificate_arn: c.dns.certificateArn,
          domain_aliases: [c.dns.cdnSubdomain],
          // Sprint 25 B25-003 cache behaviours baked in
          cache_behaviours: PRODUCTION_CDN_CACHE_BEHAVIOURS,
        },
      },
      // Sprint 20: Secrets Manager
      {
        source: '../modules/secrets',
        sprintOrigin: 20,
        description: 'Secrets Manager for API keys with 90-day rotation',
        variables: {
          environment: c.name,
          secrets: [
            { name: 'anthropic-api-key', description: 'Claude API key for narrative generation', rotation_days: 90 },
            { name: 'openai-api-key', description: 'GPT Image API key for illustration', rotation_days: 90 },
            { name: 'elevenlabs-api-key', description: 'ElevenLabs API key for narration', rotation_days: 90 },
            { name: 'database-credentials', description: 'RDS master credentials', rotation_days: 30 },
            { name: 'stripe-api-key', description: 'Stripe API key for payments', rotation_days: 90 },
          ],
        },
      },
      // Sprint 21: Auth0 + API Gateway
      {
        source: '../modules/auth',
        sprintOrigin: 21,
        description: 'Auth0 tenant configuration for production',
        variables: {
          environment: c.name,
          domain: `scholarly-${c.name}.au.auth0.com`,
          callback_urls: [`https://${c.dns.domainName}/callback`, `https://${c.dns.domainName}/api/auth/callback`],
          logout_urls: [`https://${c.dns.domainName}`],
          allowed_origins: [`https://${c.dns.domainName}`, `https://${c.dns.cdnSubdomain}`],
          enable_mfa: true,
          mfa_policy: 'adaptive',            // Production: risk-based MFA
          enable_brute_force_protection: true,
          enable_bot_detection: true,
        },
      },
      {
        source: '../modules/api-gateway',
        sprintOrigin: 21,
        description: 'API Gateway with rate limiting and WAF integration',
        variables: {
          environment: c.name,
          domain_name: c.dns.apiSubdomain,
          certificate_arn: c.dns.certificateArn,
          throttle_burst_limit: 500,          // Production: higher burst
          throttle_rate_limit: 1000,          // 1000 req/s sustained
          enable_waf: c.cdn.wafEnabled,
          cors_allow_origins: [`https://${c.dns.domainName}`],
          access_log_retention: c.monitoring.logRetention,
        },
      },
      // Sprint 22: NATS
      {
        source: '../modules/nats',
        sprintOrigin: 22,
        description: '3-node NATS cluster with JetStream for production event bus',
        variables: {
          environment: c.name,
          cluster_size: c.messaging.clusterSize,
          instance_type: c.messaging.instanceType,
          jetstream_max_memory: c.messaging.jetstream.maxMemory,
          jetstream_max_storage: c.messaging.jetstream.maxStorage,
          enable_tls: c.messaging.tls,
          enable_authorization: c.messaging.authorization,
          subnet_ids: '${module.vpc.private_subnet_ids}',
          security_group_ids: ['${module.vpc.nats_security_group_id}'],
        },
      },
      // Sprint 23: ECS services
      {
        source: '../modules/ecs',
        sprintOrigin: 23,
        description: 'ECS Fargate services with auto-scaling and circuit breaker',
        variables: {
          environment: c.name,
          cluster_name: c.compute.ecsCluster.name,
          capacity_providers: c.compute.ecsCluster.capacityProviders,
          api_service: c.compute.apiService,
          worker_service: c.compute.workerService,
          vpc_id: '${module.vpc.vpc_id}',
          private_subnet_ids: '${module.vpc.private_subnet_ids}',
          public_subnet_ids: '${module.vpc.public_subnet_ids}',
          target_group_arn: '${module.api_gateway.target_group_arn}',
        },
      },
      // Sprint 24: Grafana + monitoring
      {
        source: '../modules/monitoring',
        sprintOrigin: 24,
        description: 'Grafana with 5 dashboards, 11 alerts, PagerDuty + Slack',
        variables: {
          environment: c.name,
          grafana_enabled: c.monitoring.grafanaEnabled,
          alerts_enabled: c.monitoring.alertsEnabled,
          log_retention_days: c.monitoring.logRetention,
          pagerduty_integration: c.monitoring.pagerdutyIntegration,
          slack_integration: c.monitoring.slackIntegration,
          dashboard_auto_provision: c.monitoring.dashboardAutoProvision,
        },
      },
    ];

    const terraformLines: string[] = [
      '# ============================================================================',
      '# SCHOLARLY PLATFORM — Production Environment',
      `# Generated: ${new Date().toISOString()}`,
      '# Sprint 26: Composes all Sprint 19-24 modules into production stack',
      '# ============================================================================',
      '',
      'terraform {',
      '  required_version = ">= 1.7.0"',
      '  required_providers {',
      '    aws = { source = "hashicorp/aws", version = "~> 5.40" }',
      '  }',
      '  backend "s3" {',
      `    bucket         = "scholarly-terraform-state-${c.name}"`,
      `    key            = "${c.name}/terraform.tfstate"`,
      `    region         = "${c.region}"`,
      '    encrypt        = true',
      '    dynamodb_table = "scholarly-terraform-locks"',
      '  }',
      '}',
      '',
      `provider "aws" { region = "${c.region}" }`,
      `provider "aws" { alias = "failover", region = "${c.backup.s3Replication.destinationRegion || 'ap-southeast-1'}" }`,
      '',
    ];

    for (const mod of modules) {
      const moduleName = mod.source.split('/').pop()!;
      terraformLines.push(`# Sprint ${mod.sprintOrigin}: ${mod.description}`);
      terraformLines.push(`module "${moduleName}" {`);
      terraformLines.push(`  source = "${mod.source}"`);
      for (const [key, value] of Object.entries(mod.variables)) {
        terraformLines.push(`  ${key} = ${JSON.stringify(value)}`);
      }
      terraformLines.push('}');
      terraformLines.push('');
    }

    // Route53 DNS records
    terraformLines.push(
      '# DNS Records',
      'resource "aws_route53_record" "api" {',
      `  zone_id = "${c.dns.hostedZoneId}"`,
      `  name    = "${c.dns.apiSubdomain}"`,
      '  type    = "A"',
      '  alias {',
      '    name                   = module.api_gateway.domain_name',
      '    zone_id                = module.api_gateway.hosted_zone_id',
      '    evaluate_target_health = true',
      '  }',
      '}',
      '',
      'resource "aws_route53_record" "cdn" {',
      `  zone_id = "${c.dns.hostedZoneId}"`,
      `  name    = "${c.dns.cdnSubdomain}"`,
      '  type    = "A"',
      '  alias {',
      '    name                   = module.cdn.domain_name',
      '    zone_id                = module.cdn.hosted_zone_id',
      '    evaluate_target_health = false',
      '  }',
      '}',
      '',
      '# Health check for Route53 failover',
      'resource "aws_route53_health_check" "api" {',
      `  fqdn              = "${c.dns.apiSubdomain}"`,
      '  port              = 443',
      '  type              = "HTTPS"',
      '  resource_path     = "/health"',
      '  failure_threshold = 3',
      '  request_interval  = 30',
      `  tags = ${JSON.stringify(c.tags)}`,
      '}',
    );

    this.log('info', 'Generated production Terraform', {
      modules: modules.length,
      environment: c.name,
      lines: terraformLines.length,
    });

    return ok(terraformLines.join('\n'));
  }

  /**
   * Generate a staging-to-production diff report showing every
   * sizing and configuration change. This is the evidence trail
   * for the beta launch approval.
   */
  generateConfigDiff(): Result<EnvironmentDiff[]> {
    const diffs: EnvironmentDiff[] = [
      { component: 'RDS Instance', staging: STAGING_CONFIG.database.instanceClass, production: this.config.database.instanceClass, reason: 'Sprint 25 load test: 40% CPU at staging size, need headroom for 10x growth' },
      { component: 'RDS Multi-AZ', staging: 'false', production: 'true', reason: 'Production requires automatic failover for RTO < 5 minutes' },
      { component: 'RDS Read Replica', staging: 'false', production: 'true', reason: 'Sprint 25: "Add read replica at 500+ users" — ready for growth' },
      { component: 'RDS Backup Retention', staging: '7 days', production: '35 days', reason: '5 weeks covers monthly compliance audit window' },
      { component: 'RDS Monitoring Interval', staging: '60s', production: '15s', reason: 'Higher granularity for production incident response' },
      { component: 'Redis Node Type', staging: STAGING_CONFIG.cache.nodeType, production: this.config.cache.nodeType, reason: 'Sprint 25: staging at 20% memory, but production needs headroom for BKT caching' },
      { component: 'Redis Replicas', staging: '1 node', production: '2 nodes (primary + replica)', reason: 'Automatic failover in production' },
      { component: 'NATS Cluster', staging: '1 node', production: '3 nodes', reason: 'Sprint 25: "For production: 3-node cluster" — quorum-based consensus' },
      { component: 'ECS API Tasks', staging: '1 (max 4)', production: '2 (max 8)', reason: 'Sprint 25: 170 VU needed 2 tasks average, production starts at that baseline' },
      { component: 'ECS CPU/Memory', staging: '512/1024', production: '1024/2048', reason: 'Double resources for production headroom + AI API client concurrency' },
      { component: 'ECS Scaling Target', staging: '70% CPU', production: '60% CPU', reason: 'More aggressive scaling in production to maintain latency under spike' },
      { component: 'CloudFront WAF', staging: 'disabled', production: 'enabled', reason: 'DDoS protection for public-facing production endpoints' },
      { component: 'Log Retention', staging: '14 days', production: '90 days', reason: 'Compliance requirement for educational platform auditing' },
      { component: 'PagerDuty', staging: 'disabled', production: 'enabled', reason: 'On-call alerting for production incidents' },
      { component: 'S3 Replication', staging: 'disabled', production: 'ap-southeast-1', reason: 'Cross-region disaster recovery for content assets' },
      { component: 'Availability Zones', staging: '2 AZs', production: '3 AZs', reason: 'Higher availability and fault tolerance' },
      { component: 'Deletion Protection', staging: 'disabled', production: 'enabled', reason: 'Prevent accidental database deletion' },
      { component: 'NAT Gateways', staging: '1 (shared)', production: '3 (per-AZ)', reason: 'HA: AZ failure should not affect outbound connectivity' },
    ];

    return ok(diffs);
  }
}

export interface EnvironmentDiff {
  readonly component: string;
  readonly staging: string;
  readonly production: string;
  readonly reason: string;
}

// Production CDN cache behaviours from Sprint 25 B25-003 optimisations
export const PRODUCTION_CDN_CACHE_BEHAVIOURS = [
  {
    pathPattern: '/illustrations/*',
    ttl: 31536000,                    // 1 year — content-addressed, immutable
    compress: true,
    originShield: true,
    allowedMethods: ['GET', 'HEAD'],
    cachedMethods: ['GET', 'HEAD'],
    forwardHeaders: [],
    forwardQueryStrings: false,
    description: 'Immutable illustration assets (content-addressed S3 keys)',
  },
  {
    pathPattern: '/audio/*',
    ttl: 31536000,                    // 1 year — immutable
    compress: false,                  // Audio already compressed
    originShield: true,
    allowedMethods: ['GET', 'HEAD'],
    cachedMethods: ['GET', 'HEAD'],
    forwardHeaders: ['Range'],        // Byte-range streaming for audio seek
    forwardQueryStrings: false,
    description: 'Immutable audio narration assets with byte-range support',
  },
  {
    pathPattern: '/thumbnails/*',
    ttl: 2592000,                     // 30 days
    compress: true,
    originShield: true,
    allowedMethods: ['GET', 'HEAD'],
    cachedMethods: ['GET', 'HEAD'],
    forwardHeaders: [],
    forwardQueryStrings: ['w', 'h', 'q'],  // Responsive image dimensions
    description: 'Book cover thumbnails with responsive sizing',
  },
  {
    pathPattern: '/api/*',
    ttl: 0,                           // No caching for API
    compress: true,
    originShield: false,
    allowedMethods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    cachedMethods: ['GET', 'HEAD'],
    forwardHeaders: ['Authorization', 'Content-Type', 'Accept'],
    forwardQueryStrings: true,
    description: 'API endpoints — all methods forwarded, no caching',
  },
  {
    pathPattern: '/*',
    ttl: 3600,                        // 1 hour — OTA updates for reader UI
    compress: true,
    originShield: false,
    allowedMethods: ['GET', 'HEAD'],
    cachedMethods: ['GET', 'HEAD'],
    forwardHeaders: [],
    forwardQueryStrings: false,
    description: 'Default: reader UI and static assets with 1-hour TTL',
  },
];


// ============================================================================
// Section 2: Beta Access Management (B26-002)
// ============================================================================

// The beta access system is like a theatre's preview performances.
// Before the grand public opening, you run a series of previews
// for specific audiences: critics first (educator-beta), then
// invited guests (parent-beta), then general admission (open-beta).
// Each group sees the same show, but you control the audience size
// and collect targeted feedback to refine the performance.

export type BetaCohort = 'educator-beta' | 'parent-beta' | 'general-beta' | 'internal';

export interface InviteCode {
  readonly code: string;
  readonly cohort: BetaCohort;
  readonly maxUses: number;
  readonly currentUses: number;
  readonly expiresAt: Date;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly isActive: boolean;
  readonly metadata: Record<string, string>;
}

export interface BetaUser {
  readonly userId: string;
  readonly cohort: BetaCohort;
  readonly inviteCode: string;
  readonly joinedAt: Date;
  readonly feedbackCount: number;
  readonly lastActiveAt: Date;
  readonly featureFlags: Record<string, boolean>;
}

export interface BetaFeedback {
  readonly id: string;
  readonly userId: string;
  readonly cohort: BetaCohort;
  readonly type: 'bug' | 'feature_request' | 'content_issue' | 'usability' | 'praise' | 'other';
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
  readonly title: string;
  readonly description: string;
  readonly context: FeedbackContext;
  readonly status: 'new' | 'triaged' | 'in_progress' | 'resolved' | 'wont_fix';
  readonly createdAt: Date;
  readonly screenshots?: string[];
}

export interface FeedbackContext {
  readonly currentPage: string;
  readonly storyId?: string;
  readonly deviceType: 'ios' | 'android' | 'web';
  readonly appVersion: string;
  readonly browserInfo?: string;
  readonly sessionDuration: number;
}

// ── Feature Flags ───────────────────────────────────────────
// Unleash-compatible feature flag definitions for gradual rollout.
// Each flag controls a specific capability that can be toggled
// per cohort, per percentage, or per user.

export interface FeatureFlag {
  readonly name: string;
  readonly description: string;
  readonly defaultEnabled: boolean;
  readonly strategies: FeatureFlagStrategy[];
  readonly tags: string[];
}

export type FeatureFlagStrategy =
  | { type: 'cohort'; cohorts: BetaCohort[] }
  | { type: 'percentage'; percentage: number }
  | { type: 'userId'; userIds: string[] }
  | { type: 'gradual'; startPercent: number; incrementPercent: number; intervalHours: number };

export const BETA_FEATURE_FLAGS: FeatureFlag[] = [
  {
    name: 'enchanted-library',
    description: 'Show the Enchanted Library UI (3D-ish shelves, animations)',
    defaultEnabled: false,
    strategies: [{ type: 'cohort', cohorts: ['internal', 'educator-beta'] }],
    tags: ['ui', 'beta'],
  },
  {
    name: 'read-aloud-mode',
    description: 'Enable active read-aloud mode with ASR comparison',
    defaultEnabled: false,
    strategies: [{ type: 'cohort', cohorts: ['internal', 'educator-beta', 'parent-beta'] }],
    tags: ['feature', 'beta'],
  },
  {
    name: 'community-content',
    description: 'Show community-created storybooks in library',
    defaultEnabled: false,
    strategies: [{ type: 'percentage', percentage: 0 }],    // Starts at 0%, ramps up
    tags: ['content', 'beta'],
  },
  {
    name: 'bkt-mastery-display',
    description: 'Show learner mastery visualisation to parents',
    defaultEnabled: false,
    strategies: [{ type: 'cohort', cohorts: ['internal', 'parent-beta'] }],
    tags: ['analytics', 'beta'],
  },
  {
    name: 'marketplace-access',
    description: 'Enable access to creator marketplace',
    defaultEnabled: false,
    strategies: [{ type: 'cohort', cohorts: ['internal'] }],  // Internal only at launch
    tags: ['marketplace', 'beta'],
  },
  {
    name: 'offline-reading',
    description: 'Allow downloading books for offline reading',
    defaultEnabled: false,
    strategies: [{ type: 'gradual', startPercent: 10, incrementPercent: 10, intervalHours: 48 }],
    tags: ['feature', 'beta'],
  },
  {
    name: 'feedback-widget',
    description: 'Show in-app feedback button for beta testers',
    defaultEnabled: true,
    strategies: [{ type: 'cohort', cohorts: ['internal', 'educator-beta', 'parent-beta', 'general-beta'] }],
    tags: ['beta', 'feedback'],
  },
  {
    name: 'narration-pace-adaptive',
    description: 'Auto-adjust narration speed based on learner profile',
    defaultEnabled: false,
    strategies: [{ type: 'cohort', cohorts: ['internal', 'educator-beta'] }],
    tags: ['feature', 'audio'],
  },
];

export class BetaAccessService extends ScholarlyBaseService {
  private inviteCodes: Map<string, InviteCode> = new Map();
  private betaUsers: Map<string, BetaUser> = new Map();
  private feedback: Map<string, BetaFeedback> = new Map();
  private featureFlags: Map<string, FeatureFlag> = new Map();

  constructor() {
    super({}, 'BetaAccessService');
    for (const flag of BETA_FEATURE_FLAGS) {
      this.featureFlags.set(flag.name, flag);
    }
  }

  /**
   * Generate a batch of invite codes for a specific cohort.
   * Like printing tickets for a preview performance — each code
   * admits one person and tracks which audience they belong to.
   */
  generateInviteCodes(params: {
    cohort: BetaCohort;
    count: number;
    maxUsesPerCode: number;
    expiresInDays: number;
    createdBy: string;
    metadata?: Record<string, string>;
  }): Result<InviteCode[]> {
    if (params.count < 1 || params.count > 1000) {
      return fail('Count must be between 1 and 1000');
    }
    if (params.maxUsesPerCode < 1 || params.maxUsesPerCode > 100) {
      return fail('Max uses per code must be between 1 and 100');
    }

    const codes: InviteCode[] = [];
    const expiresAt = new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000);

    for (let i = 0; i < params.count; i++) {
      const code: InviteCode = {
        code: this.generateCode(params.cohort),
        cohort: params.cohort,
        maxUses: params.maxUsesPerCode,
        currentUses: 0,
        expiresAt,
        createdBy: params.createdBy,
        createdAt: new Date(),
        isActive: true,
        metadata: params.metadata || {},
      };
      this.inviteCodes.set(code.code, code);
      codes.push(code);
    }

    this.log('info', `Generated ${params.count} invite codes for ${params.cohort}`, {
      cohort: params.cohort, count: params.count, expiresAt: expiresAt.toISOString(),
    });

    return ok(codes);
  }

  /**
   * Redeem an invite code and register a beta user.
   */
  redeemInviteCode(params: { code: string; userId: string }): Result<BetaUser> {
    const invite = this.inviteCodes.get(params.code);
    if (!invite) return fail('Invalid invite code', 'INVALID_CODE');
    if (!invite.isActive) return fail('Invite code is deactivated', 'CODE_INACTIVE');
    if (invite.currentUses >= invite.maxUses) return fail('Invite code has been fully redeemed', 'CODE_EXHAUSTED');
    if (new Date() > invite.expiresAt) return fail('Invite code has expired', 'CODE_EXPIRED');
    if (this.betaUsers.has(params.userId)) return fail('User is already in the beta programme', 'ALREADY_ENROLLED');

    // Increment usage (mutation for in-memory; production uses DB transaction)
    (invite as any).currentUses += 1;

    // Evaluate feature flags for this user's cohort
    const flags: Record<string, boolean> = {};
    for (const [name, flag] of this.featureFlags) {
      flags[name] = this.evaluateFlag(flag, invite.cohort, params.userId);
    }

    const betaUser: BetaUser = {
      userId: params.userId,
      cohort: invite.cohort,
      inviteCode: params.code,
      joinedAt: new Date(),
      feedbackCount: 0,
      lastActiveAt: new Date(),
      featureFlags: flags,
    };

    this.betaUsers.set(params.userId, betaUser);

    this.log('info', `Beta user enrolled: ${params.userId} in ${invite.cohort}`, {
      userId: params.userId, cohort: invite.cohort,
    });

    return ok(betaUser);
  }

  /**
   * Evaluate a feature flag for a given cohort and user.
   */
  evaluateFlag(flag: FeatureFlag, cohort: BetaCohort, userId: string): boolean {
    if (flag.defaultEnabled) return true;

    for (const strategy of flag.strategies) {
      switch (strategy.type) {
        case 'cohort':
          if (strategy.cohorts.includes(cohort)) return true;
          break;
        case 'percentage':
          // Deterministic hash-based percentage — same user always gets same result
          const hash = this.hashUserId(userId, flag.name);
          if (hash < strategy.percentage) return true;
          break;
        case 'userId':
          if (strategy.userIds.includes(userId)) return true;
          break;
        case 'gradual':
          // Calculate current percentage based on time since flag creation
          const hoursElapsed = (Date.now() - flag.tags.length * 1000) / (1000 * 60 * 60);
          const currentPercent = Math.min(100, strategy.startPercent + Math.floor(hoursElapsed / strategy.intervalHours) * strategy.incrementPercent);
          const gradualHash = this.hashUserId(userId, flag.name);
          if (gradualHash < currentPercent) return true;
          break;
      }
    }

    return false;
  }

  /**
   * Submit in-app feedback from a beta tester.
   */
  submitFeedback(params: Omit<BetaFeedback, 'id' | 'createdAt' | 'status'>): Result<BetaFeedback> {
    const user = this.betaUsers.get(params.userId);
    if (!user) return fail('User is not enrolled in beta', 'NOT_ENROLLED');

    const feedback: BetaFeedback = {
      ...params,
      id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      status: 'new',
      createdAt: new Date(),
    };

    this.feedback.set(feedback.id, feedback);
    (user as any).feedbackCount += 1;

    this.log('info', `Beta feedback submitted: ${feedback.type}/${feedback.severity}`, {
      userId: params.userId, cohort: params.cohort, type: feedback.type,
    });

    return ok(feedback);
  }

  /**
   * Get cohort-level analytics for beta monitoring.
   */
  getCohortAnalytics(): Result<CohortAnalytics[]> {
    const cohorts: BetaCohort[] = ['internal', 'educator-beta', 'parent-beta', 'general-beta'];
    const analytics: CohortAnalytics[] = [];

    for (const cohort of cohorts) {
      const users = Array.from(this.betaUsers.values()).filter(u => u.cohort === cohort);
      const cohortFeedback = Array.from(this.feedback.values()).filter(f => f.cohort === cohort);

      analytics.push({
        cohort,
        totalUsers: users.length,
        activeUsers: users.filter(u => {
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return u.lastActiveAt > dayAgo;
        }).length,
        totalFeedback: cohortFeedback.length,
        feedbackByType: {
          bug: cohortFeedback.filter(f => f.type === 'bug').length,
          feature_request: cohortFeedback.filter(f => f.type === 'feature_request').length,
          content_issue: cohortFeedback.filter(f => f.type === 'content_issue').length,
          usability: cohortFeedback.filter(f => f.type === 'usability').length,
          praise: cohortFeedback.filter(f => f.type === 'praise').length,
          other: cohortFeedback.filter(f => f.type === 'other').length,
        },
        feedbackBySeverity: {
          critical: cohortFeedback.filter(f => f.severity === 'critical').length,
          high: cohortFeedback.filter(f => f.severity === 'high').length,
          medium: cohortFeedback.filter(f => f.severity === 'medium').length,
          low: cohortFeedback.filter(f => f.severity === 'low').length,
        },
        inviteCodesIssued: Array.from(this.inviteCodes.values()).filter(c => c.cohort === cohort).length,
        inviteCodesRedeemed: Array.from(this.inviteCodes.values()).filter(c => c.cohort === cohort && c.currentUses > 0).length,
      });
    }

    return ok(analytics);
  }

  private generateCode(cohort: BetaCohort): string {
    const prefix = cohort === 'educator-beta' ? 'EDU' : cohort === 'parent-beta' ? 'PAR' : cohort === 'general-beta' ? 'GEN' : 'INT';
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${random}`;
  }

  private hashUserId(userId: string, flagName: string): number {
    // Simple deterministic hash for percentage-based flags
    let hash = 0;
    const str = `${userId}:${flagName}`;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 100;
  }
}

export interface CohortAnalytics {
  readonly cohort: BetaCohort;
  readonly totalUsers: number;
  readonly activeUsers: number;
  readonly totalFeedback: number;
  readonly feedbackByType: Record<string, number>;
  readonly feedbackBySeverity: Record<string, number>;
  readonly inviteCodesIssued: number;
  readonly inviteCodesRedeemed: number;
}


// ============================================================================
// Section 3: Security Penetration Test (B26-003)
// ============================================================================

// OWASP ZAP automated scanning + manual security review.
// Think of this as hiring a professional burglar to try every
// door and window before you let the public in. You'd rather
// find the unlocked fire exit now than after the building is full.

export interface SecurityScanConfig {
  readonly targetUrl: string;
  readonly scanType: 'baseline' | 'full' | 'api';
  readonly authConfig: SecurityAuthConfig;
  readonly excludeUrls: string[];
  readonly maxDurationMinutes: number;
  readonly alertThreshold: 'low' | 'medium' | 'high';
  readonly reportFormats: ('html' | 'json' | 'xml' | 'md')[];
}

export interface SecurityAuthConfig {
  readonly type: 'bearer' | 'cookie' | 'api_key';
  readonly tokenEndpoint: string;
  readonly credentials: { username: string; password: string };
  readonly refreshInterval: number;
}

export interface SecurityFinding {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly risk: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  readonly confidence: 'high' | 'medium' | 'low';
  readonly url: string;
  readonly method: string;
  readonly parameter?: string;
  readonly evidence?: string;
  readonly solution: string;
  readonly cweid: number;            // Common Weakness Enumeration
  readonly wascid: number;           // Web Application Security Consortium
  readonly owaspCategory: string;
  readonly remediation: RemediationPlan;
}

export interface RemediationPlan {
  readonly priority: 'immediate' | 'before_launch' | 'post_launch';
  readonly estimatedEffort: string;
  readonly assignedTo?: string;
  readonly description: string;
  readonly status: 'pending' | 'in_progress' | 'resolved' | 'accepted_risk';
}

// ── OWASP ZAP Scan Profiles ────────────────────────────────

export const ZAP_SCAN_PROFILES: Record<string, SecurityScanConfig> = {
  apiScan: {
    targetUrl: 'https://api.scholarly.app',
    scanType: 'api',
    authConfig: {
      type: 'bearer',
      tokenEndpoint: 'https://scholarly-production.au.auth0.com/oauth/token',
      credentials: { username: 'zap-scanner@scholarly.app', password: '${ZAP_TEST_PASSWORD}' },
      refreshInterval: 3600,
    },
    excludeUrls: ['/health', '/metrics', '/api/v1/webhooks/stripe'],
    maxDurationMinutes: 60,
    alertThreshold: 'medium',
    reportFormats: ['html', 'json'],
  },
  baselineScan: {
    targetUrl: 'https://scholarly.app',
    scanType: 'baseline',
    authConfig: {
      type: 'bearer',
      tokenEndpoint: 'https://scholarly-production.au.auth0.com/oauth/token',
      credentials: { username: 'zap-scanner@scholarly.app', password: '${ZAP_TEST_PASSWORD}' },
      refreshInterval: 3600,
    },
    excludeUrls: [],
    maxDurationMinutes: 30,
    alertThreshold: 'low',
    reportFormats: ['html', 'json', 'md'],
  },
  fullScan: {
    targetUrl: 'https://scholarly.app',
    scanType: 'full',
    authConfig: {
      type: 'bearer',
      tokenEndpoint: 'https://scholarly-production.au.auth0.com/oauth/token',
      credentials: { username: 'zap-scanner@scholarly.app', password: '${ZAP_TEST_PASSWORD}' },
      refreshInterval: 3600,
    },
    excludeUrls: ['/api/v1/stories/generate'],     // Skip long-running generation
    maxDurationMinutes: 120,
    alertThreshold: 'medium',
    reportFormats: ['html', 'json'],
  },
};

// ── Manual Security Review Checklist ────────────────────────
// Beyond automated scanning, these are the human-evaluated
// security checks that require nuanced analysis.

export interface ManualSecurityCheck {
  readonly id: string;
  readonly category: string;
  readonly description: string;
  readonly owaspTop10: string;
  readonly testProcedure: string;
  readonly expectedResult: string;
  readonly status: 'pending' | 'pass' | 'fail' | 'conditional_pass';
  readonly notes?: string;
}

export const MANUAL_SECURITY_CHECKS: ManualSecurityCheck[] = [
  // Authentication & Authorisation
  {
    id: 'SEC-001', category: 'Authentication',
    description: 'Verify Auth0 JWT validation rejects expired, tampered, and wrongly-signed tokens',
    owaspTop10: 'A07:2021 – Identification and Authentication Failures',
    testProcedure: '1. Send request with expired JWT. 2. Send request with modified payload. 3. Send request signed with wrong key. 4. Send request with revoked token.',
    expectedResult: 'All four requests return 401 Unauthorized', status: 'pending',
  },
  {
    id: 'SEC-002', category: 'Authorisation',
    description: 'Verify role-based access control prevents learners from accessing teacher/admin endpoints',
    owaspTop10: 'A01:2021 – Broken Access Control',
    testProcedure: '1. Authenticate as learner. 2. Attempt to access /api/v1/admin/*. 3. Attempt to access /api/v1/stories/{id}/review. 4. Attempt to modify another learner\'s progress.',
    expectedResult: 'All requests return 403 Forbidden', status: 'pending',
  },
  {
    id: 'SEC-003', category: 'Authorisation',
    description: 'Verify tenant isolation — users from Tenant A cannot access Tenant B resources',
    owaspTop10: 'A01:2021 – Broken Access Control',
    testProcedure: '1. Authenticate as Tenant A user. 2. Request Tenant B storybooks. 3. Request Tenant B learner data. 4. Attempt to use Tenant B invite codes.',
    expectedResult: 'All cross-tenant requests return 403 or empty results', status: 'pending',
  },
  // Input Validation
  {
    id: 'SEC-004', category: 'Input Validation',
    description: 'Verify API input sanitisation prevents XSS in storybook content fields',
    owaspTop10: 'A03:2021 – Injection',
    testProcedure: '1. Submit story with XSS payloads in title, text, character names. 2. Verify stored content is sanitised. 3. Verify rendered output escapes HTML.',
    expectedResult: 'All XSS payloads neutralised, no script execution in reader', status: 'pending',
  },
  {
    id: 'SEC-005', category: 'Input Validation',
    description: 'Verify SQL injection prevention in library search and filter parameters',
    owaspTop10: 'A03:2021 – Injection',
    testProcedure: '1. Send SQL injection payloads in search query. 2. Send in phonicsPhase filter. 3. Send in sort/order parameters. 4. Verify Prisma parameterised queries.',
    expectedResult: 'All payloads treated as literal strings, no SQL execution', status: 'pending',
  },
  {
    id: 'SEC-006', category: 'Input Validation',
    description: 'Verify file upload restrictions for creator content and illustrations',
    owaspTop10: 'A08:2021 – Software and Data Integrity Failures',
    testProcedure: '1. Upload file exceeding size limit. 2. Upload non-image file with image extension. 3. Upload file with embedded malicious content. 4. Verify content-type validation.',
    expectedResult: 'All malicious uploads rejected with appropriate error', status: 'pending',
  },
  // Data Protection (COPPA compliance)
  {
    id: 'SEC-007', category: 'Data Protection',
    description: 'Verify child data is never exposed in API responses to non-authorised parties',
    owaspTop10: 'A02:2021 – Cryptographic Failures',
    testProcedure: '1. Request learner analytics without parent/teacher role. 2. Verify PII is not in analytics aggregates. 3. Verify audit logs do not contain child data.',
    expectedResult: 'Child PII inaccessible to unauthorised users', status: 'pending',
  },
  {
    id: 'SEC-008', category: 'Data Protection',
    description: 'Verify all data at rest is encrypted (RDS, S3, Redis, NATS JetStream)',
    owaspTop10: 'A02:2021 – Cryptographic Failures',
    testProcedure: '1. Verify RDS encryption status. 2. Verify S3 bucket encryption. 3. Verify Redis at-rest encryption. 4. Check NATS JetStream file encryption.',
    expectedResult: 'All storage layers encrypted with AES-256', status: 'pending',
  },
  // API Security
  {
    id: 'SEC-009', category: 'API Security',
    description: 'Verify rate limiting prevents abuse of AI generation endpoints',
    owaspTop10: 'A04:2021 – Insecure Design',
    testProcedure: '1. Send 100 rapid generation requests. 2. Verify 429 responses after limit. 3. Verify rate limit headers present. 4. Test per-user vs per-IP limits.',
    expectedResult: 'Rate limits enforced, 429 returned with Retry-After header', status: 'pending',
  },
  {
    id: 'SEC-010', category: 'API Security',
    description: 'Verify CORS configuration only allows scholarly.app origins',
    owaspTop10: 'A05:2021 – Security Misconfiguration',
    testProcedure: '1. Send requests with Origin: https://malicious.com. 2. Verify no Access-Control-Allow-Origin for unknown origins. 3. Test preflight OPTIONS response.',
    expectedResult: 'Only scholarly.app origins allowed in CORS headers', status: 'pending',
  },
  // Infrastructure Security
  {
    id: 'SEC-011', category: 'Infrastructure',
    description: 'Verify security groups restrict database access to application layer only',
    owaspTop10: 'A05:2021 – Security Misconfiguration',
    testProcedure: '1. Verify RDS SG only allows inbound from ECS SG. 2. Verify Redis SG only allows inbound from ECS SG. 3. Verify no 0.0.0.0/0 inbound rules on data tier.',
    expectedResult: 'Data tier accessible only from application tier', status: 'pending',
  },
  {
    id: 'SEC-012', category: 'Infrastructure',
    description: 'Verify secrets are not exposed in logs, environment variables dumps, or error responses',
    owaspTop10: 'A09:2021 – Security Logging and Monitoring Failures',
    testProcedure: '1. Trigger various error conditions. 2. Inspect CloudWatch logs for API keys. 3. Verify ECS task definitions use Secrets Manager ARNs not plaintext.',
    expectedResult: 'No secrets in logs or error responses', status: 'pending',
  },
];

export class SecurityPenTestService extends ScholarlyBaseService {
  constructor() { super({}, 'SecurityPenTestService'); }

  /**
   * Generate ZAP scan Docker command for CI/CD integration.
   * This runs in Sprint 23's GitHub Actions pipeline as a
   * pre-deployment gate.
   */
  generateZapCommand(profile: SecurityScanConfig): Result<string> {
    const zapImage = 'ghcr.io/zaproxy/zaproxy:stable';
    const scanFlag = profile.scanType === 'baseline' ? 'zap-baseline.py'
      : profile.scanType === 'api' ? 'zap-api-scan.py'
      : 'zap-full-scan.py';

    const excludeArgs = profile.excludeUrls.map(u => `-config "spider.excludedUrl=${u}"`).join(' ');
    const threshold = profile.alertThreshold === 'low' ? '-l LOW' : profile.alertThreshold === 'medium' ? '-l MEDIUM' : '-l HIGH';

    const command = [
      `docker run --rm -v $(pwd)/reports:/zap/wrk ${zapImage}`,
      scanFlag,
      `-t ${profile.targetUrl}`,
      threshold,
      `-m ${profile.maxDurationMinutes}`,
      profile.reportFormats.map(f => `-r scholarly-security-report.${f}`).join(' '),
      excludeArgs,
      '-I',     // Don't fail on warnings, only on errors
    ].filter(Boolean).join(' \\\n  ');

    return ok(command);
  }

  /**
   * Evaluate scan results against beta launch criteria.
   * Beta launch is blocked if any critical or high findings remain unresolved.
   */
  evaluateLaunchReadiness(findings: SecurityFinding[], manualChecks: ManualSecurityCheck[]): Result<LaunchReadinessReport> {
    const criticalFindings = findings.filter(f => f.risk === 'critical');
    const highFindings = findings.filter(f => f.risk === 'high');
    const unresolvedCritical = criticalFindings.filter(f => f.remediation.status !== 'resolved');
    const unresolvedHigh = highFindings.filter(f => f.remediation.status !== 'resolved' && f.remediation.status !== 'accepted_risk');
    const failedManualChecks = manualChecks.filter(c => c.status === 'fail');

    const approved = unresolvedCritical.length === 0
      && unresolvedHigh.length === 0
      && failedManualChecks.length === 0;

    const report: LaunchReadinessReport = {
      approved,
      totalFindings: findings.length,
      findingsBySeverity: {
        critical: criticalFindings.length,
        high: highFindings.length,
        medium: findings.filter(f => f.risk === 'medium').length,
        low: findings.filter(f => f.risk === 'low').length,
        informational: findings.filter(f => f.risk === 'informational').length,
      },
      unresolvedBlockers: [
        ...unresolvedCritical.map(f => ({ type: 'finding' as const, id: f.id, description: f.name, severity: f.risk })),
        ...unresolvedHigh.map(f => ({ type: 'finding' as const, id: f.id, description: f.name, severity: f.risk })),
        ...failedManualChecks.map(c => ({ type: 'manual_check' as const, id: c.id, description: c.description, severity: 'high' as const })),
      ],
      manualCheckResults: {
        total: manualChecks.length,
        passed: manualChecks.filter(c => c.status === 'pass').length,
        failed: failedManualChecks.length,
        conditionalPass: manualChecks.filter(c => c.status === 'conditional_pass').length,
        pending: manualChecks.filter(c => c.status === 'pending').length,
      },
      recommendation: approved
        ? 'APPROVED: All critical and high findings resolved. Beta launch may proceed.'
        : `BLOCKED: ${unresolvedCritical.length} critical + ${unresolvedHigh.length} high unresolved findings, ${failedManualChecks.length} failed manual checks. Remediate before launch.`,
      evaluatedAt: new Date(),
    };

    this.log('info', `Security evaluation: ${approved ? 'APPROVED' : 'BLOCKED'}`, {
      approved, criticalUnresolved: unresolvedCritical.length, highUnresolved: unresolvedHigh.length,
    });

    return ok(report);
  }
}

export interface LaunchReadinessReport {
  readonly approved: boolean;
  readonly totalFindings: number;
  readonly findingsBySeverity: Record<string, number>;
  readonly unresolvedBlockers: Array<{ type: 'finding' | 'manual_check'; id: string; description: string; severity: string }>;
  readonly manualCheckResults: { total: number; passed: number; failed: number; conditionalPass: number; pending: number };
  readonly recommendation: string;
  readonly evaluatedAt: Date;
}


// ============================================================================
// Section 4: Disaster Recovery Verification (B26-004)
// ============================================================================

// If the production Terraform is the building, disaster recovery
// is the fire safety system — sprinklers, extinguishers, exit routes,
// and assembly points. You test them all before opening to the public,
// and you document the procedures so anyone can execute them under
// pressure at 3am.

export interface DisasterRecoveryPlan {
  readonly version: string;
  readonly lastTested: Date;
  readonly rto: { target: string; actual: string };   // Recovery Time Objective
  readonly rpo: { target: string; actual: string };   // Recovery Point Objective
  readonly procedures: DRProcedure[];
  readonly contacts: DRContact[];
  readonly testResults: DRTestResult[];
}

export interface DRProcedure {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly triggerConditions: string[];
  readonly steps: DRStep[];
  readonly estimatedDuration: string;
  readonly requiredAccess: string[];
  readonly rollbackSteps?: DRStep[];
}

export interface DRStep {
  readonly order: number;
  readonly action: string;
  readonly command?: string;
  readonly expectedOutcome: string;
  readonly timeout: string;
  readonly verificationCommand?: string;
}

export interface DRContact {
  readonly role: string;
  readonly name: string;
  readonly phone: string;
  readonly email: string;
  readonly escalationOrder: number;
}

export interface DRTestResult {
  readonly procedureId: string;
  readonly testedAt: Date;
  readonly testedBy: string;
  readonly success: boolean;
  readonly actualDuration: string;
  readonly notes: string;
  readonly issuesFound: string[];
}

export const DISASTER_RECOVERY_PROCEDURES: DRProcedure[] = [
  // DR-001: RDS Snapshot Restore
  {
    id: 'DR-001',
    name: 'RDS Database Restore from Snapshot',
    description: 'Restore the production PostgreSQL database from an automated snapshot. This is the nuclear option — used when the primary database is corrupted, the Multi-AZ failover has also failed, or data corruption requires point-in-time recovery.',
    triggerConditions: [
      'Primary RDS instance unrecoverable after Multi-AZ failover',
      'Data corruption detected requiring point-in-time recovery',
      'Accidental data deletion requiring recovery beyond application-level undo',
    ],
    estimatedDuration: '15-30 minutes',
    requiredAccess: ['AWS Console or CLI', 'RDS:RestoreDBInstanceFromDBSnapshot', 'Terraform state access'],
    steps: [
      { order: 1, action: 'Identify the correct snapshot to restore from', command: 'aws rds describe-db-snapshots --db-instance-identifier scholarly-production --query "DBSnapshots | sort_by(@, &SnapshotCreateTime) | [-5:].[DBSnapshotIdentifier,SnapshotCreateTime,Status]" --output table', expectedOutcome: 'List of 5 most recent snapshots with timestamps', timeout: '30 seconds' },
      { order: 2, action: 'If point-in-time recovery needed, identify the exact target time', command: 'aws rds describe-db-instances --db-instance-identifier scholarly-production --query "DBInstances[0].LatestRestorableTime"', expectedOutcome: 'Latest restorable timestamp (typically within last 5 minutes)', timeout: '30 seconds' },
      { order: 3, action: 'Scale down ECS services to prevent writes during restore', command: 'aws ecs update-service --cluster scholarly-production --service api-production --desired-count 0', expectedOutcome: 'API service scales to 0 tasks', timeout: '2 minutes' },
      { order: 4, action: 'Restore from snapshot to a new instance', command: 'aws rds restore-db-instance-from-db-snapshot --db-instance-identifier scholarly-production-restored --db-snapshot-identifier {SNAPSHOT_ID} --db-instance-class db.r6g.large --multi-az --vpc-security-group-ids {SG_ID}', expectedOutcome: 'New RDS instance creation initiated', timeout: '15-25 minutes', verificationCommand: 'aws rds describe-db-instances --db-instance-identifier scholarly-production-restored --query "DBInstances[0].DBInstanceStatus"' },
      { order: 5, action: 'Update application database connection string to point to restored instance', command: 'aws secretsmanager update-secret --secret-id scholarly/production/database-credentials --secret-string \'{"host":"scholarly-production-restored.{region}.rds.amazonaws.com","port":5432}\'', expectedOutcome: 'Secret updated', timeout: '30 seconds' },
      { order: 6, action: 'Restart ECS services with new connection', command: 'aws ecs update-service --cluster scholarly-production --service api-production --desired-count 2 --force-new-deployment', expectedOutcome: 'API service restarts with new DB connection', timeout: '3 minutes' },
      { order: 7, action: 'Verify application health and data integrity', command: 'curl -s https://api.scholarly.app/health | jq .', expectedOutcome: 'Health check returns OK with database connected', timeout: '1 minute', verificationCommand: 'curl -s https://api.scholarly.app/api/v1/library/search?limit=1 | jq .data[0].title' },
    ],
    rollbackSteps: [
      { order: 1, action: 'If restored instance is also corrupted, revert to original', command: 'aws secretsmanager update-secret --secret-id scholarly/production/database-credentials --secret-string \'{"host":"scholarly-production.{region}.rds.amazonaws.com"}\'', expectedOutcome: 'Connection reverted to original instance', timeout: '30 seconds' },
      { order: 2, action: 'Force new deployment to pick up reverted credentials', command: 'aws ecs update-service --cluster scholarly-production --service api-production --force-new-deployment', expectedOutcome: 'Services restart with original DB', timeout: '3 minutes' },
    ],
  },

  // DR-002: S3 Cross-Region Recovery
  {
    id: 'DR-002',
    name: 'S3 Content Recovery from Replica Region',
    description: 'Switch CDN origin to the replica S3 bucket in ap-southeast-1 if the primary bucket in ap-southeast-2 is unavailable. Content assets (illustrations, audio, thumbnails) are replicated continuously.',
    triggerConditions: [
      'Primary S3 region (ap-southeast-2) experiencing outage',
      'Primary bucket accidentally deleted or access revoked',
      'Sustained high error rate (>5%) on CDN origin requests',
    ],
    estimatedDuration: '10-15 minutes',
    requiredAccess: ['AWS Console or CLI', 'CloudFront:UpdateDistribution', 'Route53:ChangeResourceRecordSets'],
    steps: [
      { order: 1, action: 'Verify replica bucket has recent content', command: 'aws s3 ls s3://scholarly-production-replica-apse1/illustrations/ --region ap-southeast-1 | tail -5', expectedOutcome: 'Recent illustration files present in replica', timeout: '30 seconds' },
      { order: 2, action: 'Check replication lag', command: 'aws s3api head-object --bucket scholarly-production-replica-apse1 --key illustrations/latest-marker.json --region ap-southeast-1 | jq .LastModified', expectedOutcome: 'Marker file less than 15 minutes old', timeout: '30 seconds' },
      { order: 3, action: 'Update CloudFront origin to replica bucket', command: 'aws cloudfront update-distribution --id {DISTRIBUTION_ID} --origin-domain-name scholarly-production-replica-apse1.s3.ap-southeast-1.amazonaws.com', expectedOutcome: 'Distribution update initiated (propagation ~5 min)', timeout: '5 minutes' },
      { order: 4, action: 'Invalidate CDN cache to force new origin', command: 'aws cloudfront create-invalidation --distribution-id {DISTRIBUTION_ID} --paths "/*"', expectedOutcome: 'Cache invalidation initiated', timeout: '2 minutes' },
      { order: 5, action: 'Verify content serving from replica', command: 'curl -sI https://cdn.scholarly.app/illustrations/test-image.webp | grep -i x-amz-cf-pop', expectedOutcome: 'Content served successfully', timeout: '1 minute' },
    ],
  },

  // DR-003: Service Restart / Rollback
  {
    id: 'DR-003',
    name: 'ECS Service Restart and Deployment Rollback',
    description: 'Restart crashed services or roll back a bad deployment. ECS circuit breaker will automatically roll back failed deployments, but this procedure covers manual intervention.',
    triggerConditions: [
      'Service health checks failing after deployment',
      'Error rate spike above 5% threshold',
      'ECS circuit breaker activated but rollback failed',
      'Out-of-memory kills recurring',
    ],
    estimatedDuration: '5-10 minutes',
    requiredAccess: ['AWS Console or CLI', 'ECS:UpdateService', 'ECR:DescribeImages'],
    steps: [
      { order: 1, action: 'Check current deployment status', command: 'aws ecs describe-services --cluster scholarly-production --services api-production --query "services[0].deployments[*].[status,desiredCount,runningCount,taskDefinition]" --output table', expectedOutcome: 'Shows current and previous deployments', timeout: '30 seconds' },
      { order: 2, action: 'Identify the last known good task definition', command: 'aws ecs list-task-definitions --family scholarly-api-production --sort DESC --max-items 5 --query "taskDefinitionArns"', expectedOutcome: 'List of recent task definition versions', timeout: '30 seconds' },
      { order: 3, action: 'Roll back to previous task definition', command: 'aws ecs update-service --cluster scholarly-production --service api-production --task-definition {PREVIOUS_TASK_DEF_ARN} --force-new-deployment', expectedOutcome: 'New deployment started with previous version', timeout: '5 minutes', verificationCommand: 'aws ecs describe-services --cluster scholarly-production --services api-production --query "services[0].deployments[?status==`PRIMARY`].runningCount"' },
      { order: 4, action: 'Verify rolled-back service is healthy', command: 'for i in $(seq 1 5); do curl -s https://api.scholarly.app/health | jq .status; sleep 5; done', expectedOutcome: '5 consecutive healthy responses', timeout: '1 minute' },
    ],
  },

  // DR-004: Redis Cache Recovery
  {
    id: 'DR-004',
    name: 'Redis Cache Failover and Recovery',
    description: 'Handle Redis primary node failure. ElastiCache automatic failover should handle this, but if it doesn\'t, manual promotion of the replica is required.',
    triggerConditions: [
      'Redis primary node unreachable',
      'Automatic failover not triggered within 60 seconds',
      'Cache-related errors exceeding 10% of requests',
    ],
    estimatedDuration: '5-10 minutes',
    requiredAccess: ['AWS Console or CLI', 'ElastiCache:ModifyReplicationGroup'],
    steps: [
      { order: 1, action: 'Check replication group status', command: 'aws elasticache describe-replication-groups --replication-group-id scholarly-production --query "ReplicationGroups[0].[Status,NodeGroups[0].NodeGroupMembers[*].[CacheClusterId,CurrentRole,PreferredAvailabilityZone]]"', expectedOutcome: 'Shows primary and replica status', timeout: '30 seconds' },
      { order: 2, action: 'If automatic failover hasn\'t occurred, trigger manual failover', command: 'aws elasticache modify-replication-group --replication-group-id scholarly-production --primary-cluster-id scholarly-production-002 --apply-immediately', expectedOutcome: 'Failover initiated to replica node', timeout: '2 minutes' },
      { order: 3, action: 'Verify new primary is accepting writes', command: 'redis-cli -h {NEW_PRIMARY_ENDPOINT} -p 6379 --tls SET dr-test "$(date)" && redis-cli -h {NEW_PRIMARY_ENDPOINT} -p 6379 --tls GET dr-test', expectedOutcome: 'Write and read succeed on new primary', timeout: '30 seconds' },
      { order: 4, action: 'Force ECS services to reconnect', command: 'aws ecs update-service --cluster scholarly-production --service api-production --force-new-deployment', expectedOutcome: 'Services restart with new Redis endpoint', timeout: '3 minutes' },
    ],
  },

  // DR-005: NATS Cluster Recovery
  {
    id: 'DR-005',
    name: 'NATS JetStream Cluster Recovery',
    description: 'Handle NATS cluster quorum loss. With a 3-node cluster, loss of 2 nodes breaks consensus. This procedure restores the cluster from the surviving node.',
    triggerConditions: [
      'NATS consumer lag exceeding 10,000 messages',
      'JetStream API returning "no suitable peers" errors',
      '2 of 3 NATS nodes unreachable',
    ],
    estimatedDuration: '15-20 minutes',
    requiredAccess: ['SSH to NATS instances', 'NATS CLI', 'AWS ECS access'],
    steps: [
      { order: 1, action: 'Check cluster status from surviving node', command: 'nats server list --context production', expectedOutcome: 'Shows 1 of 3 servers connected', timeout: '30 seconds' },
      { order: 2, action: 'Check JetStream stream status', command: 'nats stream list --context production', expectedOutcome: 'Shows streams with reduced replicas', timeout: '30 seconds' },
      { order: 3, action: 'Restart failed NATS instances', command: 'aws ecs update-service --cluster scholarly-production --service nats-production --force-new-deployment', expectedOutcome: 'NATS tasks restarted', timeout: '5 minutes' },
      { order: 4, action: 'Wait for cluster to reform and streams to replicate', command: 'nats server list --context production && nats stream info scholarly-storybook --context production', expectedOutcome: '3/3 servers connected, streams fully replicated', timeout: '10 minutes' },
      { order: 5, action: 'Check consumer lag has cleared', command: 'nats consumer info scholarly-storybook review-pipeline --context production | grep "Num Pending"', expectedOutcome: 'Pending messages draining', timeout: '2 minutes' },
    ],
  },
];

export class DisasterRecoveryService extends ScholarlyBaseService {
  constructor() { super({}, 'DisasterRecoveryService'); }

  /**
   * Generate the complete disaster recovery plan document.
   */
  generateDRPlan(): Result<DisasterRecoveryPlan> {
    const plan: DisasterRecoveryPlan = {
      version: '1.0.0',
      lastTested: new Date(),
      rto: { target: '30 minutes', actual: 'TBD — to be measured during DR test' },
      rpo: { target: '5 minutes', actual: 'TBD — depends on snapshot/replication lag' },
      procedures: DISASTER_RECOVERY_PROCEDURES,
      contacts: [
        { role: 'On-Call Engineer', name: 'TBD', phone: '+61-XXX-XXX-XXX', email: 'oncall@scholarly.app', escalationOrder: 1 },
        { role: 'Platform Lead', name: 'TBD', phone: '+61-XXX-XXX-XXX', email: 'platform@scholarly.app', escalationOrder: 2 },
        { role: 'CTO', name: 'TBD', phone: '+61-XXX-XXX-XXX', email: 'cto@scholarly.app', escalationOrder: 3 },
      ],
      testResults: [],
    };

    this.log('info', 'DR plan generated', { procedures: plan.procedures.length, version: plan.version });
    return ok(plan);
  }

  /**
   * Execute a DR test (dry run) and record results.
   * In a real implementation this would execute actual AWS CLI commands.
   * Here we generate the test plan and expected verification steps.
   */
  generateDRTestPlan(procedureId: string): Result<DRTestPlan> {
    const procedure = DISASTER_RECOVERY_PROCEDURES.find(p => p.id === procedureId);
    if (!procedure) return fail(`Procedure ${procedureId} not found`, 'NOT_FOUND');

    const testPlan: DRTestPlan = {
      procedureId,
      procedureName: procedure.name,
      testType: 'tabletop',         // Start with tabletop, graduate to live
      prerequisites: [
        'Staging environment available for testing',
        'AWS CLI configured with appropriate permissions',
        'All team members have reviewed the procedure',
        'Monitoring dashboards open for observation',
        `Required access verified: ${procedure.requiredAccess.join(', ')}`,
      ],
      steps: procedure.steps.map(step => ({
        ...step,
        preCondition: `Step ${step.order} is ready to execute`,
        postCondition: step.expectedOutcome,
        successCriteria: step.verificationCommand
          ? `Verification command returns expected result: ${step.expectedOutcome}`
          : step.expectedOutcome,
      })),
      successCriteria: [
        `Complete procedure within estimated ${procedure.estimatedDuration}`,
        'All steps produce expected outcomes',
        'Service restored to healthy state',
        'No data loss beyond RPO target (5 minutes)',
      ],
      rollbackPlan: procedure.rollbackSteps
        ? 'Rollback steps defined in procedure'
        : 'Manual intervention required — escalate to Platform Lead',
    };

    return ok(testPlan);
  }
}

export interface DRTestPlan {
  readonly procedureId: string;
  readonly procedureName: string;
  readonly testType: 'tabletop' | 'simulated' | 'live';
  readonly prerequisites: string[];
  readonly steps: (DRStep & { preCondition: string; postCondition: string; successCriteria: string })[];
  readonly successCriteria: string[];
  readonly rollbackPlan: string;
}
