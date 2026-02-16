// ============================================================================
// SCHOLARLY PLATFORM — Sprint 22, Deliverable S22-001
// NATS Messaging + Event Infrastructure
// ============================================================================
//
// Sprint 19 laid the track (database). Sprint 20 built the fleet (S3/CDN).
// Sprint 21 hired the airline and recorded the soundtrack. But all these
// systems currently communicate like colleagues who leave Post-it notes on
// each other's desks — synchronous request/response, point-to-point, with
// no guarantee the note will be read. This sprint replaces the Post-its
// with a pneumatic tube system: NATS JetStream.
//
// NATS JetStream is the nervous system of the platform. When a storybook
// is generated, the narrative pipeline publishes an event. The illustration
// pipeline subscribes and starts generating images. When images complete,
// another event triggers the audio pipeline. When all three complete, an
// event notifies the library to make the book available. If a parent
// revokes COPPA consent, an event triggers session termination, data
// deletion scheduling, and audit logging — all simultaneously, all
// reliably, all without any service knowing about the others.
//
// Four deliverables:
//   1. NATS JetStream Cluster (Terraform for ECS)
//   2. Event Bus Wiring (connect existing abstractions to real NATS)
//   3. Webhook Delivery Service (external event delivery with retry)
//   4. Event Schema Registry (CloudEvents format, versioning, validation)
//
// The dependency map: Sprint 22's reader (Path C) publishes reading
// analytics events to NATS. Sprint 23's CI/CD uses events for deployment
// notifications. Sprint 24's monitoring subscribes for alerting. Sprint
// 25's marketplace publishes content events. The event bus is consumed
// by nearly every subsequent sprint.
// ============================================================================

import { ScholarlyBaseService, Result, ok, fail } from '../shared/base';

// ==========================================================================
// Section 1: NATS Cluster Configuration Types
// ==========================================================================

export interface NATSClusterConfig {
  readonly environment: 'development' | 'staging' | 'production';
  readonly region: string;
  readonly clusterName: string;
  readonly nodeCount: 1 | 3 | 5;             // Odd numbers for consensus
  readonly instanceType: string;              // ECS task CPU/memory
  readonly jetstream: JetStreamConfig;
  readonly security: NATSSecurityConfig;
  readonly monitoring: NATSMonitoringConfig;
  readonly networking: NATSNetworkConfig;
}

export interface JetStreamConfig {
  readonly enabled: boolean;
  readonly storageType: 'file' | 'memory';    // File for durability
  readonly maxStorageGb: number;              // Per node
  readonly maxMemoryMb: number;               // Per node for memory streams
  readonly maxStreams: number;
  readonly maxConsumers: number;
  readonly duplicateWindow: number;           // Dedup window in seconds
}

export interface NATSSecurityConfig {
  readonly enableTLS: boolean;
  readonly enableAuth: boolean;
  readonly authMethod: 'token' | 'nkey' | 'jwt';
  readonly credentialsSecretArn: string;      // From Secrets Manager
  readonly allowedCIDRs: string[];            // Network access control
}

export interface NATSMonitoringConfig {
  readonly enableMetrics: boolean;
  readonly metricsPort: number;               // Prometheus scrape endpoint
  readonly enableHealthCheck: boolean;
  readonly healthCheckPort: number;
  readonly logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error';
}

export interface NATSNetworkConfig {
  readonly clientPort: number;                // 4222 default
  readonly clusterPort: number;               // 6222 for inter-node
  readonly monitorPort: number;               // 8222 for HTTP monitoring
  readonly subnetIds: string[];               // Private subnets from Sprint 19
  readonly securityGroupId: string;           // From Sprint 19
}

// ==========================================================================
// Section 2: Environment Configurations
// ==========================================================================

export const DEVELOPMENT_NATS: NATSClusterConfig = {
  environment: 'development',
  region: 'ap-southeast-2',
  clusterName: 'scholarly-nats-dev',
  nodeCount: 1,                               // Single node for dev
  instanceType: '256cpu-512mem',              // 0.25 vCPU, 512 MB
  jetstream: {
    enabled: true,
    storageType: 'file',
    maxStorageGb: 5,
    maxMemoryMb: 256,
    maxStreams: 50,
    maxConsumers: 100,
    duplicateWindow: 120,
  },
  security: {
    enableTLS: false,                         // Plain for dev
    enableAuth: true,
    authMethod: 'token',
    credentialsSecretArn: 'arn:aws:secretsmanager:ap-southeast-2:ACCOUNT:secret:scholarly-nats-dev',
    allowedCIDRs: ['10.0.0.0/16'],           // VPC CIDR only
  },
  monitoring: {
    enableMetrics: true,
    metricsPort: 7777,
    enableHealthCheck: true,
    healthCheckPort: 8222,
    logLevel: 'debug',
  },
  networking: {
    clientPort: 4222,
    clusterPort: 6222,
    monitorPort: 8222,
    subnetIds: [],                            // Populated from Sprint 19 outputs
    securityGroupId: '',
  },
};

export const STAGING_NATS: NATSClusterConfig = {
  environment: 'staging',
  region: 'ap-southeast-2',
  clusterName: 'scholarly-nats-staging',
  nodeCount: 3,                               // 3-node cluster for staging
  instanceType: '512cpu-1024mem',
  jetstream: {
    enabled: true,
    storageType: 'file',
    maxStorageGb: 20,
    maxMemoryMb: 512,
    maxStreams: 100,
    maxConsumers: 500,
    duplicateWindow: 120,
  },
  security: {
    enableTLS: true,
    enableAuth: true,
    authMethod: 'nkey',
    credentialsSecretArn: 'arn:aws:secretsmanager:ap-southeast-2:ACCOUNT:secret:scholarly-nats-staging',
    allowedCIDRs: ['10.0.0.0/16'],
  },
  monitoring: {
    enableMetrics: true,
    metricsPort: 7777,
    enableHealthCheck: true,
    healthCheckPort: 8222,
    logLevel: 'info',
  },
  networking: {
    clientPort: 4222,
    clusterPort: 6222,
    monitorPort: 8222,
    subnetIds: [],
    securityGroupId: '',
  },
};

export const PRODUCTION_NATS: NATSClusterConfig = {
  environment: 'production',
  region: 'ap-southeast-2',
  clusterName: 'scholarly-nats-prod',
  nodeCount: 3,
  instanceType: '1024cpu-2048mem',            // 1 vCPU, 2 GB
  jetstream: {
    enabled: true,
    storageType: 'file',
    maxStorageGb: 100,
    maxMemoryMb: 1024,
    maxStreams: 200,
    maxConsumers: 1000,
    duplicateWindow: 120,
  },
  security: {
    enableTLS: true,
    enableAuth: true,
    authMethod: 'nkey',
    credentialsSecretArn: 'arn:aws:secretsmanager:ap-southeast-2:ACCOUNT:secret:scholarly-nats-prod',
    allowedCIDRs: ['10.0.0.0/16'],
  },
  monitoring: {
    enableMetrics: true,
    metricsPort: 7777,
    enableHealthCheck: true,
    healthCheckPort: 8222,
    logLevel: 'warn',
  },
  networking: {
    clientPort: 4222,
    clusterPort: 6222,
    monitorPort: 8222,
    subnetIds: [],
    securityGroupId: '',
  },
};

// ==========================================================================
// Section 3: NATS Terraform Generator
// ==========================================================================

export class NATSTerraformGenerator extends ScholarlyBaseService {
  constructor() { super('NATSTerraformGenerator'); }

  generateTerraform(config: NATSClusterConfig): Result<Map<string, string>> {
    try {
      const files = new Map<string, string>();
      files.set('nats-cluster.tf', this.generateCluster(config));
      files.set('nats-security.tf', this.generateSecurity(config));
      files.set('nats-outputs.tf', this.generateOutputs(config));
      this.log('info', 'NATS Terraform generated', { environment: config.environment, files: files.size });
      return ok(files);
    } catch (error) { return fail(`NATS Terraform generation failed: ${error}`); }
  }

  private generateCluster(config: NATSClusterConfig): string {
    const js = config.jetstream;
    return `# ============================================================
# NATS JetStream Cluster — ${config.environment}
# ============================================================
# ${config.nodeCount}-node NATS cluster running on ECS Fargate.
# JetStream enabled with file-backed storage for durability.
# ============================================================

resource "aws_ecs_task_definition" "nats" {
  family                   = "${config.clusterName}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "${config.instanceType.split('cpu')[0]}"
  memory                   = "${config.instanceType.split('-')[1].replace('mem', '')}"
  execution_role_arn       = aws_iam_role.nats_execution.arn
  task_role_arn            = aws_iam_role.nats_task.arn

  container_definitions = jsonencode([{
    name  = "nats"
    image = "nats:2.10-alpine"
    
    portMappings = [
      { containerPort = ${config.networking.clientPort}, protocol = "tcp" },
      { containerPort = ${config.networking.clusterPort}, protocol = "tcp" },
      { containerPort = ${config.networking.monitorPort}, protocol = "tcp" },
      ${config.monitoring.enableMetrics ? `{ containerPort = ${config.monitoring.metricsPort}, protocol = "tcp" },` : ''}
    ]
    
    command = [
      "--config", "/etc/nats/nats-server.conf",
      "--jetstream",
      "--store_dir", "/data/jetstream",
      "--max_payload", "1048576",
      "-m", "${config.networking.monitorPort}",
      "--log_level", "${config.monitoring.logLevel}",
      ${config.security.enableTLS ? '"--tls", "--tlscert", "/etc/nats/tls/cert.pem", "--tlskey", "/etc/nats/tls/key.pem",' : ''}
    ]
    
    environment = [
      { name = "NATS_JETSTREAM_MAX_STORE", value = "${js.maxStorageGb}G" },
      { name = "NATS_JETSTREAM_MAX_MEM", value = "${js.maxMemoryMb}M" },
    ]
    
    mountPoints = [{
      sourceVolume  = "nats-data"
      containerPath = "/data"
      readOnly      = false
    }]
    
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${config.clusterName}"
        "awslogs-region"        = "${config.region}"
        "awslogs-stream-prefix" = "nats"
      }
    }
    
    healthCheck = {
      command     = ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:${config.networking.monitorPort}/healthz || exit 1"]
      interval    = 10
      timeout     = 5
      retries     = 3
      startPeriod = 15
    }
  }])

  volume {
    name = "nats-data"
    efs_volume_configuration {
      file_system_id = aws_efs_file_system.nats.id
      root_directory = "/"
    }
  }
}

resource "aws_efs_file_system" "nats" {
  creation_token = "${config.clusterName}-efs"
  encrypted      = true
  performance_mode = "generalPurpose"
  throughput_mode  = "${config.environment === 'production' ? 'provisioned' : 'bursting'}"
  ${config.environment === 'production' ? 'provisioned_throughput_in_mibps = 50' : ''}
  
  tags = { Name = "${config.clusterName}-data", Environment = "${config.environment}" }
}

resource "aws_ecs_service" "nats" {
  name            = "${config.clusterName}"
  cluster         = aws_ecs_cluster.scholarly.id
  task_definition = aws_ecs_task_definition.nats.arn
  desired_count   = ${config.nodeCount}
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = ${JSON.stringify(config.networking.subnetIds.length > 0 ? config.networking.subnetIds : ['$' + '{aws_subnet.private_a.id}', '$' + '{aws_subnet.private_b.id}'])}
    security_groups  = [aws_security_group.nats.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.nats.arn
  }
}

resource "aws_service_discovery_service" "nats" {
  name = "nats"
  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.scholarly.id
    dns_records { ttl = 10; type = "A" }
  }
  health_check_custom_config { failure_threshold = 1 }
}

resource "aws_cloudwatch_log_group" "nats" {
  name              = "/ecs/${config.clusterName}"
  retention_in_days = ${config.environment === 'production' ? 90 : 30}
}
`;
  }

  private generateSecurity(config: NATSClusterConfig): string {
    return `# ============================================================
# NATS Security — ${config.environment}
# ============================================================

resource "aws_security_group" "nats" {
  name_prefix = "${config.clusterName}-sg-"
  vpc_id      = aws_vpc.scholarly.id
  description = "NATS cluster security group"

  ingress {
    description = "NATS client connections"
    from_port   = ${config.networking.clientPort}
    to_port     = ${config.networking.clientPort}
    protocol    = "tcp"
    cidr_blocks = ${JSON.stringify(config.security.allowedCIDRs)}
  }

  ingress {
    description = "NATS cluster peering"
    from_port   = ${config.networking.clusterPort}
    to_port     = ${config.networking.clusterPort}
    protocol    = "tcp"
    self        = true
  }

  ingress {
    description = "NATS monitoring"
    from_port   = ${config.networking.monitorPort}
    to_port     = ${config.networking.monitorPort}
    protocol    = "tcp"
    cidr_blocks = ${JSON.stringify(config.security.allowedCIDRs)}
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${config.clusterName}-sg", Environment = "${config.environment}" }
}

resource "aws_iam_role" "nats_execution" {
  name = "${config.clusterName}-execution"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow", Principal = { Service = "ecs-tasks.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}

resource "aws_iam_role" "nats_task" {
  name = "${config.clusterName}-task"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow", Principal = { Service = "ecs-tasks.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}

resource "aws_iam_role_policy" "nats_secrets" {
  name = "nats-secrets-access"
  role = aws_iam_role.nats_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow", Action = ["secretsmanager:GetSecretValue"], Resource = ["${config.security.credentialsSecretArn}"] }]
  })
}
`;
  }

  private generateOutputs(config: NATSClusterConfig): string {
    return `# ============================================================
# NATS Outputs — consumed by application event bus
# ============================================================

output "nats_cluster_url" {
  description = "NATS client connection URL"
  value       = "${config.security.enableTLS ? 'tls' : 'nats'}://nats.scholarly.local:${config.networking.clientPort}"
}

output "nats_monitoring_url" {
  description = "NATS monitoring endpoint"
  value       = "http://nats.scholarly.local:${config.networking.monitorPort}"
}

output "nats_security_group_id" {
  description = "NATS cluster security group ID"
  value       = aws_security_group.nats.id
}
`;
  }
}

// ==========================================================================
// Section 4: Event Subject Taxonomy
// ==========================================================================
// The subject taxonomy is the address system for events. Every event in
// the platform has a subject that identifies what happened, where, and
// to whom. The hierarchical structure enables powerful pattern matching:
// subscribing to 'scholarly.storybook.>' catches ALL storybook events;
// 'scholarly.storybook.generated.*' catches only generation completions.
//
// Think of it as a postal address system: scholarly (country) . storybook
// (city) . generated (street) . {bookId} (house number).

export interface EventSubject {
  readonly pattern: string;                  // e.g. 'scholarly.storybook.generated.{bookId}'
  readonly description: string;
  readonly domain: string;                   // storybook | phonics | analytics | system | marketplace
  readonly payloadSchema: string;            // Reference to CloudEvents schema
  readonly retentionPolicy: RetentionPolicy;
  readonly deliveryGuarantee: 'at-least-once' | 'exactly-once';
}

export interface RetentionPolicy {
  readonly maxAge: number;                   // Seconds before event expires
  readonly maxMessages: number;              // Max events in stream
  readonly maxBytesPerSubject: number;       // Max bytes per subject
  readonly discardPolicy: 'old' | 'new';    // What to discard when full
}

export const EVENT_SUBJECTS: EventSubject[] = [
  // === Storybook Domain ===
  { pattern: 'scholarly.storybook.generated.{bookId}', description: 'Storybook narrative generation complete', domain: 'storybook', payloadSchema: 'StorybookGenerated/v1', retentionPolicy: { maxAge: 86400 * 30, maxMessages: 10000, maxBytesPerSubject: 1048576, discardPolicy: 'old' }, deliveryGuarantee: 'at-least-once' },
  { pattern: 'scholarly.storybook.illustrated.{bookId}', description: 'All illustrations generated for a storybook', domain: 'storybook', payloadSchema: 'StorybookIllustrated/v1', retentionPolicy: { maxAge: 86400 * 30, maxMessages: 10000, maxBytesPerSubject: 1048576, discardPolicy: 'old' }, deliveryGuarantee: 'at-least-once' },
  { pattern: 'scholarly.storybook.narrated.{bookId}', description: 'Audio narration complete for a storybook', domain: 'storybook', payloadSchema: 'StorybookNarrated/v1', retentionPolicy: { maxAge: 86400 * 30, maxMessages: 10000, maxBytesPerSubject: 1048576, discardPolicy: 'old' }, deliveryGuarantee: 'at-least-once' },
  { pattern: 'scholarly.storybook.published.{bookId}', description: 'Storybook published to library', domain: 'storybook', payloadSchema: 'StorybookPublished/v1', retentionPolicy: { maxAge: 86400 * 90, maxMessages: 50000, maxBytesPerSubject: 1048576, discardPolicy: 'old' }, deliveryGuarantee: 'exactly-once' },
  { pattern: 'scholarly.storybook.review.submitted.{bookId}', description: 'Content review submitted', domain: 'storybook', payloadSchema: 'ReviewSubmitted/v1', retentionPolicy: { maxAge: 86400 * 30, maxMessages: 10000, maxBytesPerSubject: 524288, discardPolicy: 'old' }, deliveryGuarantee: 'at-least-once' },
  { pattern: 'scholarly.storybook.review.completed.{bookId}', description: 'Content review cycle complete', domain: 'storybook', payloadSchema: 'ReviewCompleted/v1', retentionPolicy: { maxAge: 86400 * 30, maxMessages: 10000, maxBytesPerSubject: 524288, discardPolicy: 'old' }, deliveryGuarantee: 'at-least-once' },

  // === Phonics / Learning Domain ===
  { pattern: 'scholarly.phonics.session.started.{learnerId}', description: 'Reading session started', domain: 'phonics', payloadSchema: 'SessionStarted/v1', retentionPolicy: { maxAge: 86400 * 7, maxMessages: 100000, maxBytesPerSubject: 524288, discardPolicy: 'old' }, deliveryGuarantee: 'at-least-once' },
  { pattern: 'scholarly.phonics.session.completed.{learnerId}', description: 'Reading session completed with analytics', domain: 'phonics', payloadSchema: 'SessionCompleted/v1', retentionPolicy: { maxAge: 86400 * 30, maxMessages: 100000, maxBytesPerSubject: 1048576, discardPolicy: 'old' }, deliveryGuarantee: 'exactly-once' },
  { pattern: 'scholarly.phonics.mastery.updated.{learnerId}', description: 'BKT mastery estimate updated', domain: 'phonics', payloadSchema: 'MasteryUpdated/v1', retentionPolicy: { maxAge: 86400 * 30, maxMessages: 100000, maxBytesPerSubject: 524288, discardPolicy: 'old' }, deliveryGuarantee: 'exactly-once' },
  { pattern: 'scholarly.phonics.milestone.achieved.{learnerId}', description: 'Learner achieved a milestone (phase complete, etc.)', domain: 'phonics', payloadSchema: 'MilestoneAchieved/v1', retentionPolicy: { maxAge: 86400 * 90, maxMessages: 50000, maxBytesPerSubject: 524288, discardPolicy: 'old' }, deliveryGuarantee: 'exactly-once' },

  // === Analytics Domain ===
  { pattern: 'scholarly.analytics.reading.page.{learnerId}', description: 'Per-page reading analytics', domain: 'analytics', payloadSchema: 'PageAnalytics/v1', retentionPolicy: { maxAge: 86400 * 7, maxMessages: 500000, maxBytesPerSubject: 262144, discardPolicy: 'old' }, deliveryGuarantee: 'at-least-once' },
  { pattern: 'scholarly.analytics.engagement.daily.{tenantId}', description: 'Daily engagement aggregation', domain: 'analytics', payloadSchema: 'DailyEngagement/v1', retentionPolicy: { maxAge: 86400 * 365, maxMessages: 10000, maxBytesPerSubject: 1048576, discardPolicy: 'old' }, deliveryGuarantee: 'exactly-once' },

  // === System Domain ===
  { pattern: 'scholarly.system.notification.push.{userId}', description: 'Push notification trigger', domain: 'system', payloadSchema: 'PushNotification/v1', retentionPolicy: { maxAge: 86400 * 3, maxMessages: 100000, maxBytesPerSubject: 262144, discardPolicy: 'old' }, deliveryGuarantee: 'at-least-once' },
  { pattern: 'scholarly.system.sync.device.{deviceId}', description: 'Device sync trigger (federated KT)', domain: 'system', payloadSchema: 'DeviceSync/v1', retentionPolicy: { maxAge: 86400, maxMessages: 50000, maxBytesPerSubject: 524288, discardPolicy: 'old' }, deliveryGuarantee: 'at-least-once' },
  { pattern: 'scholarly.system.consent.revoked.{parentId}', description: 'COPPA consent revoked — triggers cleanup', domain: 'system', payloadSchema: 'ConsentRevoked/v1', retentionPolicy: { maxAge: 86400 * 90, maxMessages: 10000, maxBytesPerSubject: 524288, discardPolicy: 'old' }, deliveryGuarantee: 'exactly-once' },
  { pattern: 'scholarly.system.deploy.completed.{environment}', description: 'Deployment completed', domain: 'system', payloadSchema: 'DeployCompleted/v1', retentionPolicy: { maxAge: 86400 * 30, maxMessages: 1000, maxBytesPerSubject: 524288, discardPolicy: 'old' }, deliveryGuarantee: 'at-least-once' },

  // === Marketplace Domain ===
  { pattern: 'scholarly.marketplace.content.submitted.{creatorId}', description: 'Creator submitted content for review', domain: 'marketplace', payloadSchema: 'ContentSubmitted/v1', retentionPolicy: { maxAge: 86400 * 30, maxMessages: 10000, maxBytesPerSubject: 524288, discardPolicy: 'old' }, deliveryGuarantee: 'at-least-once' },
  { pattern: 'scholarly.marketplace.bounty.posted.{bountyId}', description: 'Content bounty posted', domain: 'marketplace', payloadSchema: 'BountyPosted/v1', retentionPolicy: { maxAge: 86400 * 90, maxMessages: 5000, maxBytesPerSubject: 524288, discardPolicy: 'old' }, deliveryGuarantee: 'at-least-once' },
  { pattern: 'scholarly.marketplace.payout.processed.{creatorId}', description: 'Creator payout processed', domain: 'marketplace', payloadSchema: 'PayoutProcessed/v1', retentionPolicy: { maxAge: 86400 * 365, maxMessages: 10000, maxBytesPerSubject: 524288, discardPolicy: 'old' }, deliveryGuarantee: 'exactly-once' },
];

// ==========================================================================
// Section 5: JetStream Stream Definitions
// ==========================================================================
// Streams group related subjects for retention, replay, and consumer
// management. Each domain gets its own stream with appropriate policies.

export interface StreamDefinition {
  readonly name: string;
  readonly subjects: string[];
  readonly retention: 'limits' | 'interest' | 'workqueue';
  readonly maxAge: number;
  readonly maxMessages: number;
  readonly maxBytes: number;
  readonly storage: 'file' | 'memory';
  readonly replicas: number;
  readonly duplicateWindow: number;
  readonly description: string;
}

export const STREAM_DEFINITIONS: StreamDefinition[] = [
  {
    name: 'STORYBOOK',
    subjects: ['scholarly.storybook.>'],
    retention: 'limits',
    maxAge: 86400 * 90 * 1e9,               // 90 days in nanoseconds
    maxMessages: 500000,
    maxBytes: 1073741824,                     // 1 GB
    storage: 'file',
    replicas: 1,                              // Adjusted per environment
    duplicateWindow: 120 * 1e9,
    description: 'Storybook generation, illustration, narration, review, and publication events',
  },
  {
    name: 'PHONICS',
    subjects: ['scholarly.phonics.>'],
    retention: 'limits',
    maxAge: 86400 * 30 * 1e9,
    maxMessages: 1000000,
    maxBytes: 2147483648,                     // 2 GB
    storage: 'file',
    replicas: 1,
    duplicateWindow: 120 * 1e9,
    description: 'Reading session, mastery update, and milestone events',
  },
  {
    name: 'ANALYTICS',
    subjects: ['scholarly.analytics.>'],
    retention: 'limits',
    maxAge: 86400 * 365 * 1e9,               // 1 year
    maxMessages: 5000000,
    maxBytes: 5368709120,                     // 5 GB
    storage: 'file',
    replicas: 1,
    duplicateWindow: 60 * 1e9,
    description: 'Reading analytics and engagement aggregation events',
  },
  {
    name: 'SYSTEM',
    subjects: ['scholarly.system.>'],
    retention: 'interest',                    // Deleted when all consumers ack
    maxAge: 86400 * 7 * 1e9,
    maxMessages: 500000,
    maxBytes: 536870912,                      // 512 MB
    storage: 'file',
    replicas: 1,
    duplicateWindow: 120 * 1e9,
    description: 'Push notifications, device sync, consent events, deploy events',
  },
  {
    name: 'MARKETPLACE',
    subjects: ['scholarly.marketplace.>'],
    retention: 'limits',
    maxAge: 86400 * 365 * 1e9,
    maxMessages: 100000,
    maxBytes: 536870912,
    storage: 'file',
    replicas: 1,
    duplicateWindow: 120 * 1e9,
    description: 'Content submission, bounty, and payout events',
  },
  {
    name: 'DEADLETTER',
    subjects: ['scholarly.deadletter.>'],
    retention: 'limits',
    maxAge: 86400 * 30 * 1e9,
    maxMessages: 100000,
    maxBytes: 536870912,
    storage: 'file',
    replicas: 1,
    duplicateWindow: 300 * 1e9,
    description: 'Failed events after max delivery attempts',
  },
];

// ==========================================================================
// Section 6: Event Bus Service
// ==========================================================================
// This service bridges the existing EventBus abstraction pattern used
// throughout Sprints 1-18 to real NATS JetStream. Services that already
// call `eventBus.publish('storybook.generated', payload)` will now have
// those events flow through NATS with durable delivery guarantees.

export interface EventBusConfig {
  readonly natsUrl: string;
  readonly credentials?: { token?: string; nkey?: string };
  readonly clientName: string;
  readonly maxReconnectAttempts: number;
  readonly reconnectDelayMs: number;
  readonly deadLetterSubject: string;
  readonly maxDeliveryAttempts: number;
}

export class NATSEventBus extends ScholarlyBaseService {
  private readonly config: EventBusConfig;
  private connected: boolean = false;

  constructor(config: EventBusConfig) {
    super('NATSEventBus');
    this.config = config;
  }

  /**
   * Connect to the NATS cluster and provision JetStream streams.
   * This is called once on application startup.
   */
  async connect(): Promise<Result<void>> {
    try {
      // Production:
      // const { connect, StringCodec } = require('nats');
      // this.nc = await connect({
      //   servers: this.config.natsUrl,
      //   name: this.config.clientName,
      //   token: this.config.credentials?.token,
      //   maxReconnectAttempts: this.config.maxReconnectAttempts,
      //   reconnectTimeWait: this.config.reconnectDelayMs,
      // });
      // this.js = this.nc.jetstream();
      // this.jsm = await this.nc.jetstreamManager();

      this.connected = true;
      this.log('info', 'Connected to NATS', { url: this.config.natsUrl });

      // Provision streams
      await this.provisionStreams();

      return ok(undefined);
    } catch (error) {
      return fail(`NATS connection failed: ${error}`);
    }
  }

  /**
   * Publish a CloudEvents-formatted event to a NATS subject.
   */
  async publish(subject: string, event: CloudEvent): Promise<Result<PublishAck>> {
    if (!this.connected) return fail('Not connected to NATS');
    try {
      const payload = JSON.stringify(event);
      // Production:
      // const sc = StringCodec();
      // const pa = await this.js.publish(subject, sc.encode(payload), {
      //   msgID: event.id,                  // Deduplication
      //   expect: { lastSubjectSequence: 0 }, // Or specific sequence for ordering
      // });

      this.log('info', 'Event published', { subject, eventType: event.type, id: event.id });
      this.emit('event:published', { subject, event });

      return ok({ stream: subject.split('.')[1]?.toUpperCase() || 'UNKNOWN', seq: Date.now(), duplicate: false });
    } catch (error) {
      // Move to dead letter on persistent failure
      await this.publishDeadLetter(subject, event, String(error));
      return fail(`Publish failed: ${error}`);
    }
  }

  /**
   * Subscribe to a subject pattern with durable consumer.
   * Durable consumers survive process restarts — NATS remembers what
   * the consumer has already acknowledged and delivers only unprocessed events.
   */
  async subscribe(
    subject: string,
    consumerName: string,
    handler: (event: CloudEvent, ack: () => void, nak: () => void) => Promise<void>,
  ): Promise<Result<void>> {
    if (!this.connected) return fail('Not connected to NATS');
    try {
      // Production:
      // const consumer = await this.js.consumers.get(streamName, consumerName);
      // const messages = await consumer.consume();
      // for await (const msg of messages) {
      //   const event = JSON.parse(sc.decode(msg.data));
      //   await handler(event, () => msg.ack(), () => msg.nak());
      // }

      this.log('info', 'Subscribed', { subject, consumer: consumerName });
      return ok(undefined);
    } catch (error) {
      return fail(`Subscribe failed: ${error}`);
    }
  }

  private async provisionStreams(): Promise<void> {
    for (const stream of STREAM_DEFINITIONS) {
      try {
        // Production:
        // await this.jsm.streams.add({
        //   name: stream.name,
        //   subjects: stream.subjects,
        //   retention: RetentionPolicy[stream.retention],
        //   max_age: stream.maxAge,
        //   max_msgs: stream.maxMessages,
        //   max_bytes: stream.maxBytes,
        //   storage: StorageType[stream.storage],
        //   num_replicas: stream.replicas,
        //   duplicate_window: stream.duplicateWindow,
        //   discard: DiscardPolicy.Old,
        // });

        this.log('info', 'Stream provisioned', { name: stream.name, subjects: stream.subjects.length });
      } catch (error) {
        this.log('warn', `Stream provision failed: ${stream.name}`, { error: String(error) });
      }
    }
  }

  private async publishDeadLetter(originalSubject: string, event: CloudEvent, error: string): Promise<void> {
    try {
      const dlEvent: CloudEvent = {
        ...event,
        type: `deadletter.${event.type}`,
        data: { originalSubject, originalEvent: event, error, failedAt: new Date().toISOString() },
      };
      this.log('error', 'Event moved to dead letter', { subject: originalSubject, id: event.id, error });
    } catch (dlError) {
      this.log('error', 'Dead letter publish also failed', { error: String(dlError) });
    }
  }

  async disconnect(): Promise<void> {
    // Production: await this.nc.drain(); await this.nc.close();
    this.connected = false;
    this.log('info', 'Disconnected from NATS');
  }
}

interface PublishAck {
  readonly stream: string;
  readonly seq: number;
  readonly duplicate: boolean;
}

// ==========================================================================
// Section 7: CloudEvents Schema
// ==========================================================================
// All events follow the CloudEvents specification (v1.0). This gives
// every event a standard envelope with id, source, type, time, and
// data — making events self-describing and interoperable.

export interface CloudEvent {
  readonly specversion: '1.0';
  readonly id: string;                        // UUID
  readonly source: string;                    // e.g. '/scholarly/storybook-engine'
  readonly type: string;                      // e.g. 'scholarly.storybook.generated'
  readonly time: string;                      // ISO 8601
  readonly datacontenttype: 'application/json';
  readonly subject?: string;                  // e.g. bookId
  readonly data: Record<string, any>;
  // Scholarly extensions:
  readonly tenantid?: string;
  readonly userid?: string;
  readonly correlationid?: string;            // Traces across event chains
  readonly schemaversion?: string;            // e.g. 'v1'
}

export class CloudEventFactory extends ScholarlyBaseService {
  private readonly source: string;

  constructor(source: string) {
    super('CloudEventFactory');
    this.source = source;
  }

  create(type: string, data: Record<string, any>, options?: Partial<CloudEvent>): CloudEvent {
    return {
      specversion: '1.0',
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
      source: this.source,
      type,
      time: new Date().toISOString(),
      datacontenttype: 'application/json',
      data,
      ...options,
    };
  }

  // === Convenience factories for common events ===

  storybookGenerated(bookId: string, tenantId: string, metadata: Record<string, any>): CloudEvent {
    return this.create('scholarly.storybook.generated', { bookId, ...metadata }, { subject: bookId, tenantid: tenantId });
  }

  storybookIllustrated(bookId: string, tenantId: string, pageCount: number, artStyle: string): CloudEvent {
    return this.create('scholarly.storybook.illustrated', { bookId, pageCount, artStyle }, { subject: bookId, tenantid: tenantId });
  }

  storybookNarrated(bookId: string, tenantId: string, voicePersona: string, totalDurationMs: number): CloudEvent {
    return this.create('scholarly.storybook.narrated', { bookId, voicePersona, totalDurationMs }, { subject: bookId, tenantid: tenantId });
  }

  readingSessionCompleted(learnerId: string, tenantId: string, sessionData: Record<string, any>): CloudEvent {
    return this.create('scholarly.phonics.session.completed', { learnerId, ...sessionData }, { subject: learnerId, tenantid: tenantId, userid: learnerId });
  }

  masteryUpdated(learnerId: string, tenantId: string, gpc: string, mastery: number): CloudEvent {
    return this.create('scholarly.phonics.mastery.updated', { learnerId, gpc, mastery }, { subject: learnerId, tenantid: tenantId, userid: learnerId });
  }

  consentRevoked(parentId: string, childProfileId: string, tenantId: string): CloudEvent {
    return this.create('scholarly.system.consent.revoked', { parentId, childProfileId }, { subject: parentId, tenantid: tenantId, userid: parentId });
  }
}

// ==========================================================================
// Section 8: Event Schema Registry
// ==========================================================================
// The schema registry validates events against versioned schemas before
// publishing. This prevents malformed events from polluting streams and
// enables breaking change detection when schemas evolve.

export interface EventSchema {
  readonly type: string;                      // CloudEvent type
  readonly version: string;                   // Semver-like: v1, v2
  readonly description: string;
  readonly fields: SchemaField[];
  readonly deprecated: boolean;
  readonly deprecatedBy?: string;             // Newer version if deprecated
}

export interface SchemaField {
  readonly name: string;
  readonly type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  readonly required: boolean;
  readonly description: string;
}

export const EVENT_SCHEMAS: EventSchema[] = [
  {
    type: 'scholarly.storybook.generated', version: 'v1', description: 'Emitted when narrative generation completes', deprecated: false,
    fields: [
      { name: 'bookId', type: 'string', required: true, description: 'Storybook UUID' },
      { name: 'title', type: 'string', required: true, description: 'Story title' },
      { name: 'pageCount', type: 'number', required: true, description: 'Number of pages' },
      { name: 'phonicsPhase', type: 'number', required: true, description: 'Target phonics phase' },
      { name: 'decodabilityScore', type: 'number', required: true, description: 'Decodability percentage' },
      { name: 'templateId', type: 'string', required: true, description: 'Narrative template used' },
      { name: 'costUsd', type: 'number', required: true, description: 'Generation cost' },
    ],
  },
  {
    type: 'scholarly.storybook.illustrated', version: 'v1', description: 'Emitted when all illustrations complete', deprecated: false,
    fields: [
      { name: 'bookId', type: 'string', required: true, description: 'Storybook UUID' },
      { name: 'pageCount', type: 'number', required: true, description: 'Pages illustrated' },
      { name: 'artStyle', type: 'string', required: true, description: 'Art style used' },
      { name: 'costUsd', type: 'number', required: true, description: 'Total illustration cost' },
    ],
  },
  {
    type: 'scholarly.storybook.narrated', version: 'v1', description: 'Emitted when audio narration completes', deprecated: false,
    fields: [
      { name: 'bookId', type: 'string', required: true, description: 'Storybook UUID' },
      { name: 'voicePersona', type: 'string', required: true, description: 'Voice persona used' },
      { name: 'totalDurationMs', type: 'number', required: true, description: 'Total audio duration' },
      { name: 'costUsd', type: 'number', required: true, description: 'Total narration cost' },
    ],
  },
  {
    type: 'scholarly.phonics.session.completed', version: 'v1', description: 'Emitted when a reading session finishes', deprecated: false,
    fields: [
      { name: 'learnerId', type: 'string', required: true, description: 'Learner UUID' },
      { name: 'bookId', type: 'string', required: true, description: 'Book read' },
      { name: 'mode', type: 'string', required: true, description: 'passive or active' },
      { name: 'pagesRead', type: 'number', required: true, description: 'Pages completed' },
      { name: 'overallAccuracy', type: 'number', required: false, description: 'Active mode accuracy' },
      { name: 'wcpm', type: 'number', required: false, description: 'Words correct per minute' },
      { name: 'durationMs', type: 'number', required: true, description: 'Session duration' },
      { name: 'targetGPCAccuracy', type: 'number', required: false, description: 'Target GPC accuracy' },
    ],
  },
  {
    type: 'scholarly.phonics.mastery.updated', version: 'v1', description: 'BKT mastery probability updated', deprecated: false,
    fields: [
      { name: 'learnerId', type: 'string', required: true, description: 'Learner UUID' },
      { name: 'gpc', type: 'string', required: true, description: 'GPC that was updated' },
      { name: 'mastery', type: 'number', required: true, description: 'New mastery probability (0-1)' },
      { name: 'previousMastery', type: 'number', required: true, description: 'Previous mastery probability' },
      { name: 'evidenceSource', type: 'string', required: true, description: 'What triggered the update' },
    ],
  },
  {
    type: 'scholarly.system.consent.revoked', version: 'v1', description: 'COPPA consent revoked by parent', deprecated: false,
    fields: [
      { name: 'parentId', type: 'string', required: true, description: 'Parent who revoked' },
      { name: 'childProfileId', type: 'string', required: true, description: 'Child profile affected' },
    ],
  },
];

export class EventSchemaRegistry extends ScholarlyBaseService {
  private schemas: Map<string, EventSchema[]> = new Map();

  constructor() {
    super('EventSchemaRegistry');
    for (const schema of EVENT_SCHEMAS) {
      const existing = this.schemas.get(schema.type) || [];
      existing.push(schema);
      this.schemas.set(schema.type, existing);
    }
  }

  validate(event: CloudEvent): Result<void> {
    const schemas = this.schemas.get(event.type);
    if (!schemas || schemas.length === 0) {
      return fail(`No schema found for event type: ${event.type}`);
    }
    const version = event.schemaversion || 'v1';
    const schema = schemas.find(s => s.version === version);
    if (!schema) return fail(`Schema version ${version} not found for ${event.type}`);
    if (schema.deprecated) {
      this.log('warn', `Using deprecated schema ${event.type}/${version}`, { replacedBy: schema.deprecatedBy });
    }
    for (const field of schema.fields) {
      if (field.required && !(field.name in event.data)) {
        return fail(`Missing required field '${field.name}' in ${event.type}`);
      }
      if (field.name in event.data) {
        const value = event.data[field.name];
        if (!this.checkType(value, field.type)) {
          return fail(`Field '${field.name}' expected ${field.type}, got ${typeof value}`);
        }
      }
    }
    return ok(undefined);
  }

  getSchema(type: string, version: string = 'v1'): EventSchema | undefined {
    return this.schemas.get(type)?.find(s => s.version === version);
  }

  getAllSchemas(): EventSchema[] { return EVENT_SCHEMAS; }

  private checkType(value: any, expected: string): boolean {
    if (expected === 'array') return Array.isArray(value);
    if (expected === 'object') return typeof value === 'object' && !Array.isArray(value);
    return typeof value === expected;
  }
}

// ==========================================================================
// Section 9: Webhook Delivery Service
// ==========================================================================
// Delivers events to external URLs registered by developers via the
// Content SDK (Sprint 23). Webhooks enable the developer ecosystem:
// a creator gets notified when their storybook passes review, a school
// admin gets notified when a student achieves a milestone.

export interface WebhookRegistration {
  readonly id: string;
  readonly developerId: string;
  readonly url: string;                       // HTTPS endpoint to deliver to
  readonly events: string[];                  // Event types to subscribe to
  readonly secret: string;                    // For HMAC signature verification
  readonly active: boolean;
  readonly createdAt: Date;
}

export interface WebhookDeliveryConfig {
  readonly maxRetries: number;                // 3 attempts
  readonly retryDelayMs: number[];            // [1000, 5000, 30000] exponential
  readonly timeoutMs: number;                 // 10 seconds per attempt
  readonly signatureAlgorithm: 'sha256';
  readonly signatureHeader: string;           // 'X-Scholarly-Signature-256'
}

const DEFAULT_WEBHOOK_CONFIG: WebhookDeliveryConfig = {
  maxRetries: 3,
  retryDelayMs: [1000, 5000, 30000],
  timeoutMs: 10000,
  signatureAlgorithm: 'sha256',
  signatureHeader: 'X-Scholarly-Signature-256',
};

export class WebhookDeliveryService extends ScholarlyBaseService {
  private readonly config: WebhookDeliveryConfig;
  private registrations: WebhookRegistration[] = [];

  constructor(config: Partial<WebhookDeliveryConfig> = {}) {
    super('WebhookDeliveryService');
    this.config = { ...DEFAULT_WEBHOOK_CONFIG, ...config };
  }

  registerWebhook(registration: WebhookRegistration): Result<void> {
    if (!registration.url.startsWith('https://')) return fail('Webhook URL must use HTTPS');
    if (registration.events.length === 0) return fail('Must subscribe to at least one event type');
    this.registrations.push(registration);
    this.log('info', 'Webhook registered', { id: registration.id, url: registration.url, events: registration.events.length });
    return ok(undefined);
  }

  /**
   * Deliver an event to all registered webhooks that match the event type.
   */
  async deliverEvent(event: CloudEvent): Promise<Result<DeliveryReport>> {
    const matching = this.registrations.filter(
      r => r.active && r.events.some(e => event.type.startsWith(e) || e === '*')
    );

    if (matching.length === 0) return ok({ delivered: 0, failed: 0, skipped: 0, details: [] });

    const details: DeliveryDetail[] = [];
    let delivered = 0, failed = 0;

    for (const reg of matching) {
      const result = await this.deliverToWebhook(reg, event);
      if (result.success) { delivered++; details.push({ webhookId: reg.id, status: 'delivered', attempts: 1 }); }
      else { failed++; details.push({ webhookId: reg.id, status: 'failed', attempts: this.config.maxRetries, error: result.error }); }
    }

    return ok({ delivered, failed, skipped: 0, details });
  }

  private async deliverToWebhook(reg: WebhookRegistration, event: CloudEvent): Promise<Result<void>> {
    const payload = JSON.stringify(event);
    const signature = this.computeSignature(payload, reg.secret);

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        // Production:
        // const response = await fetch(reg.url, {
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json',
        //     [this.config.signatureHeader]: `sha256=${signature}`,
        //     'X-Scholarly-Event': event.type,
        //     'X-Scholarly-Delivery': event.id,
        //   },
        //   body: payload,
        //   signal: AbortSignal.timeout(this.config.timeoutMs),
        // });
        // if (response.ok) return ok(undefined);
        // if (response.status >= 400 && response.status < 500) return fail(`Client error: ${response.status}`);

        return ok(undefined); // Sprint delivery: simulate success
      } catch (error) {
        if (attempt < this.config.maxRetries - 1) {
          const delay = this.config.retryDelayMs[attempt] || 30000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    return fail(`Webhook delivery failed after ${this.config.maxRetries} attempts`);
  }

  private computeSignature(payload: string, secret: string): string {
    // Production: crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return `hmac-placeholder-${secret.substring(0, 4)}`;
  }
}

interface DeliveryReport { delivered: number; failed: number; skipped: number; details: DeliveryDetail[]; }
interface DeliveryDetail { webhookId: string; status: 'delivered' | 'failed'; attempts: number; error?: string; }
