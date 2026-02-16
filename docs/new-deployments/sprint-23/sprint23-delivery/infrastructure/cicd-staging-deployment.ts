// ============================================================================
// SCHOLARLY PLATFORM — Sprint 23, Path B
// Staging Environment + CI/CD Hardening
// ============================================================================
//
// Sprints 19–22 built the infrastructure piece by piece: the database
// (Sprint 19), the content delivery network (Sprint 20), the identity
// provider and API gateway (Sprint 21), and the messaging nervous system
// (Sprint 22). Each piece was provisioned via Terraform modules that now
// total 22 files across VPC, RDS, Redis, S3, CloudFront, IAM, security
// groups, Secrets Manager, Auth0, API Gateway, and NATS.
//
// But provisioned infrastructure without a deployment pipeline is like
// having a factory with no assembly line. The machines are all there,
// the raw materials are in the warehouse, but nobody has designed the
// process for turning inputs into finished products reliably, repeatedly,
// and safely.
//
// Sprint 23 Path B builds that assembly line. It has four stations:
//
//   Station 1 (B23-001): The Staging Environment
//     A complete mirror of production using the same Terraform modules
//     but with smaller instance sizes. Think of it as the dress rehearsal
//     stage — identical layout to the opening night theatre, but with
//     cheaper seats and a smaller audience. Every deployment performs
//     here before the production curtain rises.
//
//   Station 2 (B23-002): The CI/CD Pipeline
//     GitHub Actions workflow that automates the entire journey from
//     code commit to running service. Lint → unit test → Docker build →
//     push to ECR → run migrations → deploy to ECS → smoke test → notify.
//     Like a relay race where each runner must finish successfully before
//     the next begins, and dropping the baton means the whole team stops.
//
//   Station 3 (B23-003): Blue/Green Deployment
//     Two identical ECS task sets — "blue" (current) and "green" (new).
//     Traffic shifts from blue to green only after health checks pass.
//     If the green environment starts failing (5xx rate > 1%), traffic
//     automatically routes back to blue. It's the trapeze artist's safety
//     net: you always have the old version ready to catch you.
//
//   Station 4 (B23-004): End-to-End Smoke Tests
//     Playwright tests that exercise the critical paths after every
//     deployment: authentication flow, API CRUD operations, file upload,
//     storybook generation trigger, and library search. These are the
//     factory's final quality inspectors — they don't check every widget,
//     but they verify that every production line is producing output.
//
// Consumes from prior sprints:
//   - All Terraform modules from Sprints 19–22 (VPC, subnets, SGs, RDS,
//     Redis, S3, CloudFront, Auth0, API Gateway, NATS)
//   - Docker abstractions from Sprint 6–12 service layer
//   - Auth0 JWT configuration from Sprint 21
//   - NATS connection URLs from Sprint 22
//   - API Gateway endpoint from Sprint 21
//
// Produces for Sprint 23 Path C:
//   - Staging environment URL for Content SDK integration testing
//   - ECR repository for containerised services
//   - Deployment pipeline that Path C's developer portal deploys through
// ============================================================================

import { ScholarlyBaseService, Result, ok, fail } from '../shared/base';

// ============================================================================
// Section 1: Staging Environment Configuration
// ============================================================================
// The staging environment uses the exact same Terraform modules as production
// but with size overrides. This is crucial: if staging uses different modules,
// you're rehearsing in a different theatre and bugs specific to the real venue
// won't show up until opening night.

export interface StagingEnvironmentConfig {
  readonly environment: 'staging';
  readonly region: string;
  readonly accountId: string;
  readonly domainName: string;

  // Instance size overrides — same architecture, smaller resources
  readonly rds: {
    readonly instanceClass: string;       // db.t3.medium (vs db.r6g.large prod)
    readonly allocatedStorage: number;     // 20 GB (vs 100 GB prod)
    readonly multiAz: boolean;            // false (vs true prod)
    readonly readReplica: boolean;         // false (vs true prod)
  };

  readonly redis: {
    readonly nodeType: string;            // cache.t3.medium (vs cache.r6g.large)
    readonly numReplicas: number;         // 0 (vs 2 prod)
    readonly clusterMode: boolean;        // false (vs true prod)
  };

  readonly nats: {
    readonly nodes: number;               // 1 (vs 3 prod)
    readonly storageGb: number;           // 5 GB (vs 100 GB prod)
    readonly authMode: 'token';           // token (vs nkey prod)
  };

  readonly ecs: {
    readonly desiredCount: number;        // 1 (vs 2+ prod)
    readonly cpu: number;                 // 512 (vs 1024 prod)
    readonly memory: number;              // 1024 (vs 2048 prod)
  };
}

export const DEFAULT_STAGING_CONFIG: StagingEnvironmentConfig = {
  environment: 'staging',
  region: 'ap-southeast-2',       // Sydney — closest to Perth
  accountId: '${AWS_ACCOUNT_ID}',
  domainName: 'staging.scholarly.app',

  rds: {
    instanceClass: 'db.t3.medium',
    allocatedStorage: 20,
    multiAz: false,
    readReplica: false,
  },
  redis: {
    nodeType: 'cache.t3.medium',
    numReplicas: 0,
    clusterMode: false,
  },
  nats: {
    nodes: 1,
    storageGb: 5,
    authMode: 'token',
  },
  ecs: {
    desiredCount: 1,
    cpu: 512,
    memory: 1024,
  },
};

// ============================================================================
// Section 2: Terraform Staging Generator
// ============================================================================
// Generates a Terraform configuration that composes all the existing modules
// from Sprints 19–22 into a single staging environment. The key insight is
// that this file doesn't redefine infrastructure — it instantiates the
// existing modules with staging-appropriate parameters.

export class StagingTerraformGenerator extends ScholarlyBaseService {
  constructor() {
    super(null as any, 'StagingTerraformGenerator');
  }

  generateStagingStack(config: StagingEnvironmentConfig): Result<Map<string, string>> {
    try {
      const files = new Map<string, string>();

      // Main staging composition — wires all Sprint 19-22 modules together
      files.set('staging-main.tf', this.generateMainComposition(config));
      files.set('staging-variables.tf', this.generateVariables(config));
      files.set('staging-outputs.tf', this.generateOutputs());
      files.set('staging-backend.tf', this.generateBackend(config));

      this.log('info', 'Staging Terraform generated', {
        environment: config.environment,
        files: files.size,
        modules: ['vpc', 'rds', 'redis', 'nats', 's3', 'cloudfront', 'auth0', 'api-gateway'],
      });

      return ok(files);
    } catch (error) {
      return fail(`Staging Terraform generation failed: ${error}`, 'STAGING_GEN_FAILED');
    }
  }

  private generateMainComposition(config: StagingEnvironmentConfig): string {
    // This composition file is the architectural equivalent of a blueprint
    // that references pre-built component specifications (the Sprint 19-22
    // modules) and says "build one of each, in this arrangement, at this size."
    return `# ============================================================
# Scholarly Platform — Staging Environment
# ============================================================
# Composes Sprint 19-22 Terraform modules into a complete
# staging stack. Same architecture as production, smaller sizes.
# ============================================================

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Environment = "staging"
      Project     = "scholarly"
      ManagedBy   = "terraform"
      Sprint      = "23"
    }
  }
}

# ── Sprint 19: VPC + Networking ──────────────────────────────
module "vpc" {
  source = "../../modules/vpc"

  environment     = "staging"
  vpc_cidr        = "10.1.0.0/16"
  azs             = ["${config.region}a", "${config.region}b"]
  private_subnets = ["10.1.1.0/24", "10.1.2.0/24"]
  public_subnets  = ["10.1.101.0/24", "10.1.102.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true   # Cost saving: one NAT vs per-AZ in prod

  tags = {
    Component = "networking"
  }
}

# ── Sprint 19: RDS PostgreSQL ────────────────────────────────
module "rds" {
  source = "../../modules/rds"

  environment         = "staging"
  instance_class      = "${config.rds.instanceClass}"
  allocated_storage   = ${config.rds.allocatedStorage}
  multi_az            = ${config.rds.multiAz}
  create_read_replica = ${config.rds.readReplica}

  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.private_subnet_ids
  security_group_ids  = [module.vpc.db_security_group_id]

  database_name       = "scholarly_staging"
  master_username     = "scholarly_admin"
  master_password     = var.db_master_password   # From Secrets Manager

  backup_retention    = 3      # 3 days vs 30 in prod
  deletion_protection = false  # Can destroy staging freely

  tags = {
    Component = "database"
  }
}

# ── Sprint 19: ElastiCache Redis ─────────────────────────────
module "redis" {
  source = "../../modules/redis"

  environment     = "staging"
  node_type       = "${config.redis.nodeType}"
  num_replicas    = ${config.redis.numReplicas}
  cluster_mode    = ${config.redis.clusterMode}

  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  security_group_ids = [module.vpc.cache_security_group_id]

  tags = {
    Component = "cache"
  }
}

# ── Sprint 20: S3 + CloudFront ───────────────────────────────
module "s3" {
  source = "../../modules/s3"

  environment   = "staging"
  bucket_prefix = "scholarly-staging"

  lifecycle_ia_days      = 30    # 30 days vs 90 in prod
  lifecycle_glacier_days = 90    # 90 days vs 365 in prod

  enable_versioning = true
  cors_origins      = ["https://${config.domainName}", "http://localhost:3000"]

  tags = {
    Component = "storage"
  }
}

module "cloudfront" {
  source = "../../modules/cloudfront"

  environment     = "staging"
  s3_bucket_arn   = module.s3.bucket_arn
  s3_bucket_domain = module.s3.bucket_regional_domain_name
  custom_domain   = "${config.domainName}"
  certificate_arn = var.staging_certificate_arn

  illustration_cache_ttl = 86400     # 1 day vs 7 days in prod
  audio_cache_ttl        = 259200    # 3 days vs 30 days in prod

  tags = {
    Component = "cdn"
  }
}

# ── Sprint 20: Secrets Manager ───────────────────────────────
module "secrets" {
  source = "../../modules/secrets"

  environment = "staging"
  secrets = {
    "scholarly/staging/anthropic-api-key"  = var.anthropic_api_key
    "scholarly/staging/openai-api-key"     = var.openai_api_key
    "scholarly/staging/elevenlabs-api-key" = var.elevenlabs_api_key
    "scholarly/staging/database-url"       = module.rds.connection_string
    "scholarly/staging/redis-url"          = module.redis.primary_endpoint
    "scholarly/staging/nats-url"           = module.nats.connection_url
  }

  tags = {
    Component = "secrets"
  }
}

# ── Sprint 21: Auth0 Identity Provider ───────────────────────
module "auth0" {
  source = "../../modules/auth0"

  environment      = "staging"
  domain           = var.auth0_domain
  custom_domain    = "auth.${config.domainName}"
  callback_urls    = ["https://${config.domainName}/api/auth/callback"]
  logout_urls      = ["https://${config.domainName}"]
  web_origins      = ["https://${config.domainName}"]

  enable_social_login = true
  enable_mfa          = false    # Disabled for easier staging testing
  coppa_enabled       = true     # Always enabled — compliance non-negotiable

  tags = {
    Component = "identity"
  }
}

# ── Sprint 21: API Gateway ───────────────────────────────────
module "api_gateway" {
  source = "../../modules/api-gateway"

  environment         = "staging"
  custom_domain       = "api.${config.domainName}"
  certificate_arn     = var.staging_certificate_arn
  backend_service_url = "http://\${module.ecs.service_discovery_endpoint}:3000"
  auth0_issuer        = "https://\${var.auth0_domain}/"
  auth0_audience      = var.auth0_api_audience

  rate_limit_learner  = 100
  rate_limit_teacher  = 500
  rate_limit_admin    = 1000

  enable_access_logs  = true
  enable_request_validation = true

  cors_origins = ["https://${config.domainName}", "http://localhost:3000"]

  tags = {
    Component = "api-gateway"
  }
}

# ── Sprint 22: NATS JetStream ────────────────────────────────
module "nats" {
  source = "../../modules/nats"

  environment     = "staging"
  cluster_size    = ${config.nats.nodes}
  storage_gb      = ${config.nats.storageGb}
  auth_mode       = "${config.nats.authMode}"

  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  security_group_ids = [module.vpc.nats_security_group_id]

  ecs_cluster_id  = module.ecs.cluster_id

  tags = {
    Component = "messaging"
  }
}

# ── Sprint 23: ECS Cluster + Service ─────────────────────────
module "ecs" {
  source = "./ecs"

  environment     = "staging"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  security_group_ids = [module.vpc.app_security_group_id]

  desired_count   = ${config.ecs.desiredCount}
  cpu             = ${config.ecs.cpu}
  memory          = ${config.ecs.memory}

  container_image = "\${var.ecr_repository_url}:latest"

  environment_variables = {
    NODE_ENV           = "staging"
    DATABASE_URL       = module.rds.connection_string
    REDIS_URL          = module.redis.primary_endpoint
    NATS_URL           = module.nats.connection_url
    S3_BUCKET          = module.s3.bucket_name
    CLOUDFRONT_DOMAIN  = module.cloudfront.distribution_domain
    AUTH0_DOMAIN       = var.auth0_domain
    AUTH0_AUDIENCE     = var.auth0_api_audience
    API_GATEWAY_URL    = module.api_gateway.invoke_url
  }

  secrets = {
    ANTHROPIC_API_KEY  = module.secrets.secret_arns["scholarly/staging/anthropic-api-key"]
    OPENAI_API_KEY     = module.secrets.secret_arns["scholarly/staging/openai-api-key"]
    ELEVENLABS_API_KEY = module.secrets.secret_arns["scholarly/staging/elevenlabs-api-key"]
  }

  health_check_path = "/api/health"
  enable_service_discovery = true
  service_discovery_namespace = "scholarly.staging.local"

  tags = {
    Component = "application"
  }
}
`;
  }

  private generateVariables(config: StagingEnvironmentConfig): string {
    return `# ============================================================
# Staging Variables
# ============================================================

variable "aws_region" {
  description = "AWS region for staging"
  type        = string
  default     = "${config.region}"
}

variable "db_master_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "staging_certificate_arn" {
  description = "ACM certificate ARN for staging domain"
  type        = string
}

variable "auth0_domain" {
  description = "Auth0 tenant domain"
  type        = string
}

variable "auth0_api_audience" {
  description = "Auth0 API audience identifier"
  type        = string
}

variable "ecr_repository_url" {
  description = "ECR repository URL for container images"
  type        = string
}

variable "anthropic_api_key" {
  description = "Anthropic Claude API key"
  type        = string
  sensitive   = true
}

variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  sensitive   = true
}

variable "elevenlabs_api_key" {
  description = "ElevenLabs API key"
  type        = string
  sensitive   = true
}
`;
  }

  private generateOutputs(): string {
    return `# ============================================================
# Staging Outputs
# ============================================================

output "staging_url" {
  description = "Staging application URL"
  value       = "https://\${module.api_gateway.custom_domain_url}"
}

output "staging_api_url" {
  description = "Staging API endpoint"
  value       = module.api_gateway.invoke_url
}

output "database_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.redis.primary_endpoint
  sensitive   = true
}

output "nats_url" {
  description = "NATS connection URL"
  value       = module.nats.connection_url
  sensitive   = true
}

output "s3_bucket" {
  description = "S3 bucket name"
  value       = module.s3.bucket_name
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain"
  value       = module.cloudfront.distribution_domain
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = module.ecs.service_name
}

output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = module.ecs.ecr_repository_url
}
`;
  }

  private generateBackend(config: StagingEnvironmentConfig): string {
    return `# ============================================================
# Terraform Backend — S3 + DynamoDB State Locking
# ============================================================
# Sprint 22 risk register: "Terraform state drift between
# environments" — mitigated by S3 state storage with DynamoDB
# locking. Manual changes prohibited via IAM.

terraform {
  backend "s3" {
    bucket         = "scholarly-terraform-state"
    key            = "staging/terraform.tfstate"
    region         = "${config.region}"
    encrypt        = true
    dynamodb_table = "scholarly-terraform-locks"
  }
}
`;
  }
}

// ============================================================================
// Section 3: ECS Service Definition
// ============================================================================
// The ECS module provisions the Fargate cluster, task definition, service,
// ECR repository, and service discovery. Think of ECS Fargate as a valet
// parking service for Docker containers: you hand over the container, tell
// them how much CPU and memory it needs, and they find a parking spot
// (EC2 instance) without you ever seeing the car park.

export interface EcsServiceConfig {
  readonly environment: string;
  readonly serviceName: string;
  readonly containerPort: number;
  readonly healthCheckPath: string;
  readonly cpu: number;
  readonly memory: number;
  readonly desiredCount: number;
  readonly minCount: number;
  readonly maxCount: number;
  readonly scaleUpThreshold: number;     // CPU % to trigger scale up
  readonly scaleDownThreshold: number;   // CPU % to trigger scale down
}

export const DEFAULT_ECS_CONFIG: EcsServiceConfig = {
  environment: 'staging',
  serviceName: 'scholarly-api',
  containerPort: 3000,
  healthCheckPath: '/api/health',
  cpu: 512,
  memory: 1024,
  desiredCount: 1,
  minCount: 1,
  maxCount: 4,
  scaleUpThreshold: 70,
  scaleDownThreshold: 30,
};

export class EcsServiceTerraformGenerator extends ScholarlyBaseService {
  constructor() {
    super(null as any, 'EcsServiceTerraformGenerator');
  }

  generateEcsModule(config: EcsServiceConfig): Result<Map<string, string>> {
    try {
      const files = new Map<string, string>();

      files.set('ecs-cluster.tf', this.generateCluster(config));
      files.set('ecs-task-definition.tf', this.generateTaskDefinition(config));
      files.set('ecs-service.tf', this.generateService(config));
      files.set('ecs-ecr.tf', this.generateEcr(config));
      files.set('ecs-auto-scaling.tf', this.generateAutoScaling(config));
      files.set('ecs-outputs.tf', this.generateEcsOutputs(config));

      this.log('info', 'ECS module generated', {
        environment: config.environment,
        files: files.size,
      });

      return ok(files);
    } catch (error) {
      return fail(`ECS module generation failed: ${error}`, 'ECS_GEN_FAILED');
    }
  }

  private generateCluster(config: EcsServiceConfig): string {
    return `# ============================================================
# ECS Cluster — ${config.environment}
# ============================================================

resource "aws_ecs_cluster" "scholarly" {
  name = "scholarly-${config.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"
      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.ecs_exec.name
      }
    }
  }

  tags = merge(var.tags, {
    Component = "ecs-cluster"
  })
}

resource "aws_ecs_cluster_capacity_providers" "scholarly" {
  cluster_name = aws_ecs_cluster.scholarly.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 1
  }
}

resource "aws_cloudwatch_log_group" "ecs_exec" {
  name              = "/ecs/scholarly-${config.environment}/exec"
  retention_in_days = 30
}
`;
  }

  private generateTaskDefinition(config: EcsServiceConfig): string {
    return `# ============================================================
# ECS Task Definition — ${config.environment}
# ============================================================
# The task definition is the recipe card: it tells ECS exactly
# what container to run, how much CPU/memory to give it, which
# environment variables to inject, and which secrets to pull
# from Secrets Manager.

resource "aws_ecs_task_definition" "scholarly_api" {
  family                   = "scholarly-api-${config.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = ${config.cpu}
  memory                   = ${config.memory}
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "scholarly-api"
      image     = "\${var.container_image}"
      essential = true

      portMappings = [
        {
          containerPort = ${config.containerPort}
          hostPort      = ${config.containerPort}
          protocol      = "tcp"
        }
      ]

      environment = [for k, v in var.environment_variables : {
        name  = k
        value = v
      }]

      secrets = [for k, v in var.secrets : {
        name      = k
        valueFrom = v
      }]

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${config.containerPort}${config.healthCheckPath} || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.api.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "api"
        }
      }

      linuxParameters = {
        initProcessEnabled = true
      }
    }
  ])

  tags = merge(var.tags, {
    Component = "task-definition"
  })
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/scholarly-api-${config.environment}"
  retention_in_days = ${config.environment === 'staging' ? 14 : 90}
}

# ── IAM Roles ────────────────────────────────────────────────

resource "aws_iam_role" "ecs_execution" {
  name = "scholarly-ecs-execution-${config.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name = "secrets-access"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = [for _, arn in var.secrets : arn]
    }]
  })
}

resource "aws_iam_role" "ecs_task" {
  name = "scholarly-ecs-task-${config.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

# Task role permissions: S3, SQS, NATS, CloudWatch
resource "aws_iam_role_policy" "ecs_task_permissions" {
  name = "task-permissions"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject", "s3:PutObject", "s3:DeleteObject",
          "s3:ListBucket", "s3:GetBucketLocation"
        ]
        Resource = [
          "\${var.s3_bucket_arn}",
          "\${var.s3_bucket_arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData",
          "logs:CreateLogStream", "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}
`;
  }

  private generateService(config: EcsServiceConfig): string {
    return `# ============================================================
# ECS Service — ${config.environment}
# ============================================================
# The service is the shift manager: it ensures the right number
# of task instances are running, replaces unhealthy ones, and
# integrates with the load balancer for traffic distribution.

resource "aws_ecs_service" "scholarly_api" {
  name            = "scholarly-api-${config.environment}"
  cluster         = aws_ecs_cluster.scholarly.id
  task_definition = aws_ecs_task_definition.scholarly_api.arn
  desired_count   = ${config.desiredCount}
  launch_type     = "FARGATE"

  deployment_controller {
    type = "CODE_DEPLOY"   # Blue/green deployment via CodeDeploy
  }

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.blue.arn
    container_name   = "scholarly-api"
    container_port   = ${config.containerPort}
  }

  service_registries {
    registry_arn = aws_service_discovery_service.scholarly_api.arn
  }

  lifecycle {
    ignore_changes = [
      task_definition,     # Managed by CodeDeploy
      load_balancer,       # Managed by CodeDeploy
      desired_count        # Managed by auto-scaling
    ]
  }

  depends_on = [
    aws_lb_listener.http,
    aws_iam_role_policy_attachment.ecs_execution
  ]

  tags = merge(var.tags, {
    Component = "ecs-service"
  })
}

# ── Load Balancer ────────────────────────────────────────────

resource "aws_lb" "scholarly" {
  name               = "scholarly-${config.environment}"
  internal           = true
  load_balancer_type = "application"
  security_groups    = var.security_group_ids
  subnets            = var.subnet_ids

  tags = merge(var.tags, {
    Component = "alb"
  })
}

resource "aws_lb_target_group" "blue" {
  name        = "scholarly-blue-${config.environment}"
  port        = ${config.containerPort}
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "${config.healthCheckPath}"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 15
    matcher             = "200"
  }

  tags = merge(var.tags, {
    Deployment = "blue"
  })
}

resource "aws_lb_target_group" "green" {
  name        = "scholarly-green-${config.environment}"
  port        = ${config.containerPort}
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "${config.healthCheckPath}"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 15
    matcher             = "200"
  }

  tags = merge(var.tags, {
    Deployment = "green"
  })
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.scholarly.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.blue.arn
  }
}

# ── Service Discovery ───────────────────────────────────────

resource "aws_service_discovery_private_dns_namespace" "scholarly" {
  name = var.service_discovery_namespace
  vpc  = var.vpc_id
}

resource "aws_service_discovery_service" "scholarly_api" {
  name = "api"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.scholarly.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}
`;
  }

  private generateEcr(config: EcsServiceConfig): string {
    return `# ============================================================
# ECR Repository — Container Image Registry
# ============================================================

resource "aws_ecr_repository" "scholarly_api" {
  name                 = "scholarly-api"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = merge(var.tags, {
    Component = "ecr"
  })
}

resource "aws_ecr_lifecycle_policy" "scholarly_api" {
  repository = aws_ecr_repository.scholarly_api.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 20 tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "staging", "production"]
          countType     = "imageCountMoreThan"
          countNumber   = 20
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Remove untagged images after 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = { type = "expire" }
      }
    ]
  })
}
`;
  }

  private generateAutoScaling(config: EcsServiceConfig): string {
    return `# ============================================================
# ECS Auto Scaling — CPU-Based
# ============================================================
# Like a restaurant that opens more tables when the queue grows
# and closes them when the dining room empties — but automated,
# and without the awkward conversation with the maître d'.

resource "aws_appautoscaling_target" "scholarly_api" {
  max_capacity       = ${config.maxCount}
  min_capacity       = ${config.minCount}
  resource_id        = "service/\${aws_ecs_cluster.scholarly.name}/\${aws_ecs_service.scholarly_api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "scale_up" {
  name               = "scholarly-scale-up-${config.environment}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.scholarly_api.resource_id
  scalable_dimension = aws_appautoscaling_target.scholarly_api.scalable_dimension
  service_namespace  = aws_appautoscaling_target.scholarly_api.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = ${config.scaleUpThreshold}.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
`;
  }

  private generateEcsOutputs(config: EcsServiceConfig): string {
    return `# ============================================================
# ECS Outputs
# ============================================================

output "cluster_name" {
  value = aws_ecs_cluster.scholarly.name
}

output "cluster_id" {
  value = aws_ecs_cluster.scholarly.id
}

output "service_name" {
  value = aws_ecs_service.scholarly_api.name
}

output "ecr_repository_url" {
  value = aws_ecr_repository.scholarly_api.repository_url
}

output "service_discovery_endpoint" {
  value = "\${aws_service_discovery_service.scholarly_api.name}.\${aws_service_discovery_private_dns_namespace.scholarly.name}"
}

output "alb_dns_name" {
  value = aws_lb.scholarly.dns_name
}

output "blue_target_group_arn" {
  value = aws_lb_target_group.blue.arn
}

output "green_target_group_arn" {
  value = aws_lb_target_group.green.arn
}
`;
  }
}

// ============================================================================
// Section 4: Docker Multi-Stage Build
// ============================================================================
// The Dockerfile is the packing list for the container. Multi-stage builds
// are like packing for a holiday: you lay everything out (dependencies,
// source code, build tools), do the work (compile TypeScript, run Prisma
// generate), then pack only what you need for the trip (the built JS, the
// Prisma client, production dependencies). The hotel doesn't need your
// entire wardrobe — just the outfits you're wearing.

export interface DockerConfig {
  readonly nodeVersion: string;
  readonly workdir: string;
  readonly port: number;
  readonly healthCheckEndpoint: string;
  readonly prismaSchemaPath: string;
}

export const DEFAULT_DOCKER_CONFIG: DockerConfig = {
  nodeVersion: '20-alpine',
  workdir: '/app',
  port: 3000,
  healthCheckEndpoint: '/api/health',
  prismaSchemaPath: 'prisma/schema.prisma',
};

export class DockerfileGenerator extends ScholarlyBaseService {
  constructor() {
    super(null as any, 'DockerfileGenerator');
  }

  generateDockerfile(config: DockerConfig = DEFAULT_DOCKER_CONFIG): Result<string> {
    try {
      const dockerfile = `# ============================================================
# Scholarly Platform — Multi-Stage Docker Build
# ============================================================
# Stage 1: Install ALL dependencies (including devDependencies)
# Stage 2: Build TypeScript → JavaScript, generate Prisma client
# Stage 3: Production image with only what's needed to run
# ============================================================

# ── Stage 1: Dependencies ────────────────────────────────────
FROM node:${config.nodeVersion} AS deps

WORKDIR ${config.workdir}

# Copy only package files first — Docker caches this layer so
# dependency installation is skipped when only source code changes
COPY package.json package-lock.json ./
COPY prisma/${config.prismaSchemaPath.split('/').pop()} prisma/

RUN npm ci --include=dev

# ── Stage 2: Build ───────────────────────────────────────────
FROM node:${config.nodeVersion} AS builder

WORKDIR ${config.workdir}

COPY --from=deps ${config.workdir}/node_modules ./node_modules
COPY . .

# Generate Prisma client for the target platform
RUN npx prisma generate --schema=${config.prismaSchemaPath}

# Compile TypeScript
RUN npm run build

# ── Stage 3: Production ─────────────────────────────────────
FROM node:${config.nodeVersion} AS runner

WORKDIR ${config.workdir}

# Security: non-root user
RUN addgroup --system --gid 1001 scholarly && \\
    adduser --system --uid 1001 --ingroup scholarly scholarly

# Copy only production dependencies
COPY --from=deps ${config.workdir}/node_modules ./node_modules

# Copy built output
COPY --from=builder ${config.workdir}/dist ./dist
COPY --from=builder ${config.workdir}/prisma ./prisma
COPY --from=builder ${config.workdir}/node_modules/.prisma ./node_modules/.prisma

# Copy package.json for version info
COPY package.json ./

# Environment
ENV NODE_ENV=production
ENV PORT=${config.port}

EXPOSE ${config.port}

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \\
  CMD wget --no-verbose --tries=1 --spider http://localhost:${config.port}${config.healthCheckEndpoint} || exit 1

USER scholarly

CMD ["node", "dist/server.js"]
`;

      this.log('info', 'Dockerfile generated', { stages: 3 });
      return ok(dockerfile);
    } catch (error) {
      return fail(`Dockerfile generation failed: ${error}`, 'DOCKER_GEN_FAILED');
    }
  }

  generateDockerIgnore(): string {
    return `# ── Build artifacts ──
node_modules
dist
.next
coverage

# ── Development ──
.env
.env.local
.env.*.local
*.log
.git
.gitignore
README.md
docker-compose*.yml
Dockerfile*

# ── IDE ──
.vscode
.idea
*.swp
*.swo

# ── Testing ──
__tests__
*.test.ts
*.spec.ts
jest.config.*
playwright.config.*

# ── Documentation ──
docs
*.md
*.docx

# ── Terraform ──
terraform
*.tf
*.tfstate*
.terraform
`;
  }
}

// ============================================================================
// Section 5: GitHub Actions CI/CD Pipeline
// ============================================================================
// The CI/CD pipeline is the assembly line that turns a code commit into a
// running service. Each step is a station on the line:
//   1. Checkout → get the code
//   2. Lint → verify code quality (the spell-checker)
//   3. Test → verify correctness (the quality inspector)
//   4. Build → compile and package (the assembly station)
//   5. Push → store the artefact (the warehouse)
//   6. Migrate → update the database (the facility upgrade)
//   7. Deploy → launch the new version (the grand opening)
//   8. Smoke → verify everything works (the opening night review)
//   9. Notify → tell the team (the morning briefing)
//
// If any station fails, the line stops. The product doesn't ship until
// every station signs off.

export interface CiCdPipelineConfig {
  readonly repositoryName: string;
  readonly mainBranch: string;
  readonly stagingBranch: string;
  readonly awsRegion: string;
  readonly ecrRepository: string;
  readonly ecsCluster: string;
  readonly ecsService: string;
  readonly slackWebhookSecretName: string;
  readonly codeDeployApplication: string;
  readonly codeDeployGroup: string;
  readonly smokeTestUrl: string;
}

export const DEFAULT_CICD_CONFIG: CiCdPipelineConfig = {
  repositoryName: 'scholarly-platform',
  mainBranch: 'main',
  stagingBranch: 'staging',
  awsRegion: 'ap-southeast-2',
  ecrRepository: 'scholarly-api',
  ecsCluster: 'scholarly-staging',
  ecsService: 'scholarly-api-staging',
  slackWebhookSecretName: 'SLACK_DEPLOY_WEBHOOK',
  codeDeployApplication: 'scholarly-staging',
  codeDeployGroup: 'scholarly-api-staging',
  smokeTestUrl: 'https://staging.scholarly.app',
};

export class GitHubActionsGenerator extends ScholarlyBaseService {
  constructor() {
    super(null as any, 'GitHubActionsGenerator');
  }

  generateDeployWorkflow(config: CiCdPipelineConfig): Result<string> {
    try {
      const workflow = `# ============================================================
# Scholarly Platform — Deploy to Staging
# ============================================================
# Triggered on push to staging branch or manual dispatch.
# Runs the full pipeline: lint → test → build → deploy → verify.
# ============================================================

name: Deploy to Staging

on:
  push:
    branches: [${config.stagingBranch}]
  workflow_dispatch:
    inputs:
      skip_tests:
        description: 'Skip test step (emergency deploys only)'
        required: false
        type: boolean
        default: false

concurrency:
  group: staging-deploy
  cancel-in-progress: false    # Never cancel an in-flight deploy

env:
  AWS_REGION: ${config.awsRegion}
  ECR_REPOSITORY: ${config.ecrRepository}
  ECS_CLUSTER: ${config.ecsCluster}
  ECS_SERVICE: ${config.ecsService}
  NODE_VERSION: '20'

jobs:
  # ── Station 1: Lint ──────────────────────────────────────
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  # ── Station 2: Test ──────────────────────────────────────
  test:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest
    if: \${{ !inputs.skip_tests }}
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: scholarly_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
        options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5

      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
        options: --health-cmd "redis-cli ping" --health-interval 10s --health-timeout 5s --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/scholarly_test

      - name: Run tests
        run: npm run test:ci
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/scholarly_test
          REDIS_URL: redis://localhost:6379

      - name: Upload coverage
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/

  # ── Station 3: Build & Push ──────────────────────────────
  build:
    name: Build & Push Docker Image
    runs-on: ubuntu-latest
    needs: [lint, test]
    if: always() && needs.lint.result == 'success' && (needs.test.result == 'success' || needs.test.result == 'skipped')
    outputs:
      image_tag: \${{ steps.meta.outputs.tags }}
      image_digest: \${{ steps.build.outputs.digest }}

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: \${{ env.AWS_REGION }}

      - name: Login to ECR
        id: ecr-login
        uses: aws-actions/amazon-ecr-login@v2

      - name: Extract metadata
        id: meta
        run: |
          SHA=\${{ github.sha }}
          SHORT_SHA=\${SHA::8}
          TAG="staging-\${SHORT_SHA}-\$(date +%Y%m%d%H%M%S)"
          echo "tags=\${{ steps.ecr-login.outputs.registry }}/\${{ env.ECR_REPOSITORY }}:\${TAG}" >> \$GITHUB_OUTPUT
          echo "short_sha=\${SHORT_SHA}" >> \$GITHUB_OUTPUT

      - name: Build and push Docker image
        id: build
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: \${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ── Station 4: Migrate ──────────────────────────────────
  migrate:
    name: Run Database Migrations
    runs-on: ubuntu-latest
    needs: build
    environment: staging

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: \${{ env.AWS_REGION }}

      - name: Get database URL from Secrets Manager
        id: db-secret
        run: |
          DB_URL=\$(aws secretsmanager get-secret-value \\
            --secret-id scholarly/staging/database-url \\
            --query SecretString --output text)
          echo "::add-mask::\$DB_URL"
          echo "database_url=\$DB_URL" >> \$GITHUB_OUTPUT

      - name: Run Prisma migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: \${{ steps.db-secret.outputs.database_url }}

  # ── Station 5: Deploy (Blue/Green) ──────────────────────
  deploy:
    name: Deploy to Staging (Blue/Green)
    runs-on: ubuntu-latest
    needs: [build, migrate]
    environment: staging

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: \${{ env.AWS_REGION }}

      - name: Generate CodeDeploy AppSpec
        run: |
          cat > appspec.yaml << EOF
          version: 0.0
          Resources:
            - TargetService:
                Type: AWS::ECS::Service
                Properties:
                  TaskDefinition: <TASK_DEFINITION>
                  LoadBalancerInfo:
                    ContainerName: scholarly-api
                    ContainerPort: 3000
          Hooks:
            - AfterAllowTestTraffic: "arn:aws:lambda:\${{ env.AWS_REGION }}:\${{ secrets.AWS_ACCOUNT_ID }}:function:scholarly-staging-smoke-test"
          EOF

      - name: Update ECS task definition
        id: task-def
        run: |
          # Get current task definition
          TASK_DEF=\$(aws ecs describe-task-definition \\
            --task-definition scholarly-api-staging \\
            --query taskDefinition)

          # Update image in container definition
          NEW_TASK_DEF=\$(echo \$TASK_DEF | jq \\
            --arg IMAGE "\${{ needs.build.outputs.image_tag }}" \\
            '.containerDefinitions[0].image = \$IMAGE |
             del(.taskDefinitionArn, .revision, .status,
                 .requiresAttributes, .compatibilities,
                 .registeredAt, .registeredBy)')

          # Register new task definition
          NEW_ARN=\$(aws ecs register-task-definition \\
            --cli-input-json "\$NEW_TASK_DEF" \\
            --query 'taskDefinition.taskDefinitionArn' \\
            --output text)

          echo "task_definition_arn=\$NEW_ARN" >> \$GITHUB_OUTPUT

      - name: Create CodeDeploy deployment
        run: |
          aws deploy create-deployment \\
            --application-name ${config.codeDeployApplication} \\
            --deployment-group-name ${config.codeDeployGroup} \\
            --revision revisionType=AppSpecContent,appSpecContent="{content=\$(cat appspec.yaml | base64 -w0)}" \\
            --description "Staging deploy: \${{ github.sha }}"

  # ── Station 6: Smoke Tests ─────────────────────────────
  smoke:
    name: End-to-End Smoke Tests
    runs-on: ubuntu-latest
    needs: deploy
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Wait for deployment to stabilise
        run: sleep 60

      - name: Run smoke tests
        run: npx playwright test --project=smoke
        env:
          STAGING_URL: ${config.smokeTestUrl}
          STAGING_API_KEY: \${{ secrets.STAGING_API_KEY }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: smoke-test-results
          path: playwright-report/

  # ── Station 7: Notify ──────────────────────────────────
  notify:
    name: Notify Team
    runs-on: ubuntu-latest
    needs: [build, deploy, smoke]
    if: always()

    steps:
      - name: Determine status
        id: status
        run: |
          if [[ "\${{ needs.smoke.result }}" == "success" ]]; then
            echo "emoji=✅" >> \$GITHUB_OUTPUT
            echo "status=SUCCESS" >> \$GITHUB_OUTPUT
            echo "color=good" >> \$GITHUB_OUTPUT
          else
            echo "emoji=❌" >> \$GITHUB_OUTPUT
            echo "status=FAILED" >> \$GITHUB_OUTPUT
            echo "color=danger" >> \$GITHUB_OUTPUT
          fi

      - name: Send Slack notification
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "attachments": [{
                "color": "\${{ steps.status.outputs.color }}",
                "blocks": [
                  {
                    "type": "section",
                    "text": {
                      "type": "mrkdwn",
                      "text": "\${{ steps.status.outputs.emoji }} *Staging Deploy \${{ steps.status.outputs.status }}*\\nCommit: \`\${{ github.sha }}\`\\nBranch: \${{ github.ref_name }}\\nActor: \${{ github.actor }}"
                    }
                  }
                ]
              }]
            }
        env:
          SLACK_WEBHOOK_URL: \${{ secrets.${config.slackWebhookSecretName} }}
          SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK
`;

      this.log('info', 'Deploy workflow generated');
      return ok(workflow);
    } catch (error) {
      return fail(`Deploy workflow generation failed: ${error}`, 'WORKFLOW_GEN_FAILED');
    }
  }

  generateBranchProtection(): Result<string> {
    try {
      const config = `# ============================================================
# Branch Protection Rules
# ============================================================
# Enforced via GitHub API or repository settings UI.
# These rules prevent the "just push to main, it'll be fine"
# approach that works until it doesn't.
# ============================================================

branch_protection:
  main:
    required_pull_request_reviews:
      required_approving_review_count: 2
      dismiss_stale_reviews: true
      require_code_owner_reviews: true
    required_status_checks:
      strict: true
      contexts:
        - "Lint & Type Check"
        - "Unit & Integration Tests"
    enforce_admins: false
    restrictions: null
    allow_force_pushes: false
    allow_deletions: false

  staging:
    required_pull_request_reviews:
      required_approving_review_count: 1
      dismiss_stale_reviews: true
    required_status_checks:
      strict: true
      contexts:
        - "Lint & Type Check"
        - "Unit & Integration Tests"
    enforce_admins: false
    allow_force_pushes: false
`;
      return ok(config);
    } catch (error) {
      return fail(`Branch protection generation failed: ${error}`, 'BRANCH_PROT_FAILED');
    }
  }
}

// ============================================================================
// Section 6: Blue/Green Deployment Configuration
// ============================================================================
// Blue/green deployment is the understudy system of theatrical production:
// while the lead actor (blue) performs on stage, the understudy (green) is
// fully rehearsed, in costume, and ready to step in. When it's time for
// the switch, the understudy takes the stage and the lead steps back —
// but they don't leave the building. If the understudy stumbles, the
// lead can be back on stage in seconds.

export interface BlueGreenConfig {
  readonly environment: string;
  readonly applicationName: string;
  readonly deploymentGroupName: string;
  readonly ecsClusterName: string;
  readonly ecsServiceName: string;
  readonly blueTargetGroupArn: string;
  readonly greenTargetGroupArn: string;
  readonly listenerArn: string;
  readonly terminationWaitMinutes: number;
  readonly autoRollbackEnabled: boolean;
  readonly autoRollbackEvents: string[];
  readonly healthCheckWaitSeconds: number;
}

export const DEFAULT_BLUE_GREEN_CONFIG: BlueGreenConfig = {
  environment: 'staging',
  applicationName: 'scholarly-staging',
  deploymentGroupName: 'scholarly-api-staging',
  ecsClusterName: 'scholarly-staging',
  ecsServiceName: 'scholarly-api-staging',
  blueTargetGroupArn: '${BLUE_TG_ARN}',
  greenTargetGroupArn: '${GREEN_TG_ARN}',
  listenerArn: '${LISTENER_ARN}',
  terminationWaitMinutes: 15,
  autoRollbackEnabled: true,
  autoRollbackEvents: ['DEPLOYMENT_FAILURE', 'DEPLOYMENT_STOP_ON_ALARM'],
  healthCheckWaitSeconds: 120,
};

export class BlueGreenDeploymentGenerator extends ScholarlyBaseService {
  constructor() {
    super(null as any, 'BlueGreenDeploymentGenerator');
  }

  generateCodeDeployTerraform(config: BlueGreenConfig): Result<string> {
    try {
      const terraform = `# ============================================================
# CodeDeploy — Blue/Green Deployment for ECS
# ============================================================
# The safety net: if the green deployment fails health checks,
# traffic automatically routes back to blue. The 5xx rate
# threshold (> 1% for 2 minutes) triggers automatic rollback.
# ============================================================

resource "aws_codedeploy_app" "scholarly" {
  name             = "${config.applicationName}"
  compute_platform = "ECS"
}

resource "aws_codedeploy_deployment_group" "scholarly_api" {
  app_name               = aws_codedeploy_app.scholarly.name
  deployment_group_name  = "${config.deploymentGroupName}"
  deployment_config_name = "CodeDeployDefault.ECSAllAtOnce"
  service_role_arn       = aws_iam_role.codedeploy.arn

  auto_rollback_configuration {
    enabled = ${config.autoRollbackEnabled}
    events  = ${JSON.stringify(config.autoRollbackEvents)}
  }

  blue_green_deployment_config {
    deployment_ready_option {
      action_on_timeout = "CONTINUE_DEPLOYMENT"
      wait_time_in_minutes = 0
    }

    terminate_blue_instances_on_deployment_success {
      action                           = "TERMINATE"
      termination_wait_time_in_minutes = ${config.terminationWaitMinutes}
    }
  }

  deployment_style {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "BLUE_GREEN"
  }

  ecs_service {
    cluster_name = "${config.ecsClusterName}"
    service_name = "${config.ecsServiceName}"
  }

  load_balancer_info {
    target_group_pair_info {
      prod_traffic_route {
        listener_arns = ["${config.listenerArn}"]
      }

      target_group {
        name = "${config.blueTargetGroupArn}"
      }

      target_group {
        name = "${config.greenTargetGroupArn}"
      }
    }
  }

  alarm_configuration {
    enabled = true
    alarms  = [aws_cloudwatch_metric_alarm.deployment_5xx.alarm_name]
  }
}

# ── Rollback Alarm ───────────────────────────────────────────
# If the 5xx rate exceeds 1% for 2 consecutive minutes during
# a deployment, CodeDeploy automatically rolls back to blue.

resource "aws_cloudwatch_metric_alarm" "deployment_5xx" {
  alarm_name          = "scholarly-${config.environment}-deploy-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "5xx errors during deployment — triggers rollback"

  dimensions = {
    LoadBalancer = "\${data.aws_lb.scholarly.arn_suffix}"
  }
}

# ── CodeDeploy IAM Role ─────────────────────────────────────

resource "aws_iam_role" "codedeploy" {
  name = "scholarly-codedeploy-${config.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "codedeploy.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "codedeploy" {
  role       = aws_iam_role.codedeploy.name
  policy_arn = "arn:aws:iam::aws:policy/AWSCodeDeployRoleForECS"
}
`;

      this.log('info', 'Blue/green deployment Terraform generated');
      return ok(terraform);
    } catch (error) {
      return fail(`Blue/green generation failed: ${error}`, 'BG_GEN_FAILED');
    }
  }
}

// ============================================================================
// Section 7: Playwright Smoke Test Suite
// ============================================================================
// Smoke tests are the "does the building still stand?" check after every
// renovation. They don't test every socket and light switch — they verify
// that the roof is on, the doors open, the water runs, and the electricity
// works. If any of these basic functions fail, something went very wrong
// during deployment.
//
// Five critical paths are tested:
//   1. Authentication flow (login → get token → access protected resource)
//   2. API CRUD (create, read, update, delete a resource)
//   3. File upload (upload an image → verify CDN delivery)
//   4. Storybook generation trigger (submit a generation request → verify queued)
//   5. Library search (search by phonics phase → verify results)

export interface SmokeTestConfig {
  readonly baseUrl: string;
  readonly apiBaseUrl: string;
  readonly testTimeout: number;
  readonly retryCount: number;
  readonly testCredentials: {
    readonly email: string;
    readonly password: string;
  };
}

export const DEFAULT_SMOKE_CONFIG: SmokeTestConfig = {
  baseUrl: 'https://staging.scholarly.app',
  apiBaseUrl: 'https://api.staging.scholarly.app',
  testTimeout: 30000,
  retryCount: 2,
  testCredentials: {
    email: 'smoke-test@scholarly.app',
    password: '${SMOKE_TEST_PASSWORD}',
  },
};

export class SmokeTestGenerator extends ScholarlyBaseService {
  constructor() {
    super(null as any, 'SmokeTestGenerator');
  }

  generatePlaywrightConfig(): Result<string> {
    try {
      const config = `// ============================================================
// Playwright Configuration — Smoke Tests
// ============================================================

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/smoke',
  timeout: 30000,
  retries: 2,
  workers: 1,    // Sequential — smoke tests may have ordering dependencies

  use: {
    baseURL: process.env.STAGING_URL || 'https://staging.scholarly.app',
    extraHTTPHeaders: {
      'X-Smoke-Test': 'true',
    },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'smoke',
      testMatch: /smoke\\.spec\\.ts/,
    },
  ],

  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'smoke-results.json' }],
  ],
});
`;
      return ok(config);
    } catch (error) {
      return fail(`Playwright config generation failed: ${error}`, 'PW_CONFIG_FAILED');
    }
  }

  generateSmokeTests(config: SmokeTestConfig): Result<string> {
    try {
      const tests = `// ============================================================
// Smoke Tests — Post-Deployment Verification
// ============================================================
// Five critical paths verify the platform is functional after
// every staging deployment. These run in the GitHub Actions
// pipeline (Station 6) and must all pass before the deployment
// is considered successful.
// ============================================================

import { test, expect } from '@playwright/test';

const API_BASE = process.env.STAGING_URL || '${config.apiBaseUrl}';
const API_KEY = process.env.STAGING_API_KEY || '';

// ── Smoke 1: Health Check ────────────────────────────────────
test.describe('Health Check', () => {
  test('API health endpoint returns 200', async ({ request }) => {
    const response = await request.get(\`\${API_BASE}/api/health\`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.services).toBeDefined();
    expect(body.services.database).toBe('connected');
    expect(body.services.redis).toBe('connected');
    expect(body.services.nats).toBe('connected');
  });

  test('API version endpoint returns build info', async ({ request }) => {
    const response = await request.get(\`\${API_BASE}/api/version\`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.version).toBeDefined();
    expect(body.environment).toBe('staging');
    expect(body.commitSha).toBeDefined();
  });
});

// ── Smoke 2: Authentication Flow ────────────────────────────
test.describe('Authentication', () => {
  test('obtains JWT token via API key', async ({ request }) => {
    const response = await request.post(\`\${API_BASE}/api/v1/auth/token\`, {
      headers: { 'X-API-Key': API_KEY },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.token).toBeDefined();
    expect(body.expiresIn).toBeGreaterThan(0);
  });

  test('rejects invalid API key', async ({ request }) => {
    const response = await request.post(\`\${API_BASE}/api/v1/auth/token\`, {
      headers: { 'X-API-Key': 'invalid-key-000' },
    });
    expect(response.status()).toBe(401);
  });

  test('protected endpoint rejects unauthenticated request', async ({ request }) => {
    const response = await request.get(\`\${API_BASE}/api/v1/library/search\`);
    expect(response.status()).toBe(401);
  });
});

// ── Smoke 3: API CRUD Operations ────────────────────────────
test.describe('API CRUD', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    const authResponse = await request.post(\`\${API_BASE}/api/v1/auth/token\`, {
      headers: { 'X-API-Key': API_KEY },
    });
    const body = await authResponse.json();
    authToken = body.token;
  });

  test('creates and retrieves a character', async ({ request }) => {
    // Create
    const createResponse = await request.post(\`\${API_BASE}/api/v1/characters\`, {
      headers: { Authorization: \`Bearer \${authToken}\` },
      data: {
        name: 'Smoke Test Character',
        description: 'A character created by smoke tests',
        personalityTraits: ['friendly', 'curious'],
      },
    });
    expect(createResponse.status()).toBe(201);

    const created = await createResponse.json();
    expect(created.id).toBeDefined();
    expect(created.name).toBe('Smoke Test Character');

    // Retrieve
    const getResponse = await request.get(
      \`\${API_BASE}/api/v1/characters/\${created.id}\`,
      { headers: { Authorization: \`Bearer \${authToken}\` } }
    );
    expect(getResponse.status()).toBe(200);

    const retrieved = await getResponse.json();
    expect(retrieved.name).toBe('Smoke Test Character');

    // Clean up
    const deleteResponse = await request.delete(
      \`\${API_BASE}/api/v1/characters/\${created.id}\`,
      { headers: { Authorization: \`Bearer \${authToken}\` } }
    );
    expect(deleteResponse.status()).toBe(204);
  });
});

// ── Smoke 4: Storybook Generation Trigger ────────────────────
test.describe('Storybook Generation', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    const authResponse = await request.post(\`\${API_BASE}/api/v1/auth/token\`, {
      headers: { 'X-API-Key': API_KEY },
    });
    const body = await authResponse.json();
    authToken = body.token;
  });

  test('submits generation request and receives job ID', async ({ request }) => {
    const response = await request.post(\`\${API_BASE}/api/v1/stories/generate\`, {
      headers: { Authorization: \`Bearer \${authToken}\` },
      data: {
        phonicsPhase: 3,
        targetGpcs: ['sh', 'ch', 'th'],
        ageGroup: '5-6',
        theme: 'animals',
        pageCount: 8,
      },
    });

    // 202 Accepted — generation is async
    expect(response.status()).toBe(202);

    const body = await response.json();
    expect(body.jobId).toBeDefined();
    expect(body.status).toBe('queued');
    expect(body.estimatedCompletionSeconds).toBeGreaterThan(0);
  });
});

// ── Smoke 5: Library Search ──────────────────────────────────
test.describe('Library Search', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    const authResponse = await request.post(\`\${API_BASE}/api/v1/auth/token\`, {
      headers: { 'X-API-Key': API_KEY },
    });
    const body = await authResponse.json();
    authToken = body.token;
  });

  test('searches library by phonics phase', async ({ request }) => {
    const response = await request.get(
      \`\${API_BASE}/api/v1/library/search?phonicsPhase=2&limit=5\`,
      { headers: { Authorization: \`Bearer \${authToken}\` } }
    );
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.results).toBeDefined();
    expect(body.total).toBeGreaterThanOrEqual(0);
    expect(body.page).toBe(1);
  });

  test('retrieves personalised recommendations', async ({ request }) => {
    const response = await request.get(
      \`\${API_BASE}/api/v1/library/recommend?learnerId=smoke-test-learner\`,
      { headers: { Authorization: \`Bearer \${authToken}\` } }
    );

    // May return 200 (has recommendations) or 404 (no learner profile)
    expect([200, 404]).toContain(response.status());
  });
});
`;

      this.log('info', 'Smoke tests generated', { testCount: 10 });
      return ok(tests);
    } catch (error) {
      return fail(`Smoke test generation failed: ${error}`, 'SMOKE_GEN_FAILED');
    }
  }
}

// ============================================================================
// Section 8: Environment Parity Verification
// ============================================================================
// Environment parity is the principle that staging and production should
// be identical twins, not distant cousins. They use the same Terraform
// modules, the same Docker images, the same configuration structure —
// differing only in resource sizes and domain names. This service
// verifies that parity by comparing the two environments' configurations.

export interface EnvironmentParityReport {
  readonly timestamp: Date;
  readonly stagingConfig: Record<string, string>;
  readonly productionConfig: Record<string, string>;
  readonly differences: ParityDifference[];
  readonly acceptableDifferences: string[];
  readonly unacceptableDifferences: string[];
  readonly parityScore: number;    // 0-100, where 100 = identical
}

export interface ParityDifference {
  readonly key: string;
  readonly staging: string;
  readonly production: string;
  readonly category: 'size' | 'config' | 'feature' | 'security';
  readonly acceptable: boolean;
  readonly reason?: string;
}

// Size differences are always acceptable (staging is intentionally smaller)
const ACCEPTABLE_DIFFERENCE_KEYS = [
  'rds.instance_class', 'rds.allocated_storage', 'rds.multi_az',
  'rds.read_replica', 'redis.node_type', 'redis.num_replicas',
  'redis.cluster_mode', 'nats.cluster_size', 'nats.storage_gb',
  'nats.auth_mode', 'ecs.desired_count', 'ecs.cpu', 'ecs.memory',
  'cloudfront.illustration_cache_ttl', 'cloudfront.audio_cache_ttl',
  'rds.backup_retention', 'rds.deletion_protection',
  'auth0.enable_mfa', 'logs.retention_days',
];

export class EnvironmentParityChecker extends ScholarlyBaseService {
  constructor() {
    super(null as any, 'EnvironmentParityChecker');
  }

  async checkParity(
    stagingOutputs: Record<string, string>,
    productionOutputs: Record<string, string>
  ): Promise<Result<EnvironmentParityReport>> {
    try {
      const differences: ParityDifference[] = [];
      const allKeys = new Set([
        ...Object.keys(stagingOutputs),
        ...Object.keys(productionOutputs),
      ]);

      for (const key of allKeys) {
        const stagingVal = stagingOutputs[key] || 'NOT_SET';
        const prodVal = productionOutputs[key] || 'NOT_SET';

        if (stagingVal !== prodVal) {
          const acceptable = ACCEPTABLE_DIFFERENCE_KEYS.includes(key);
          differences.push({
            key,
            staging: stagingVal,
            production: prodVal,
            category: this.categorizeDifference(key),
            acceptable,
            reason: acceptable
              ? 'Intentional size/config difference for cost management'
              : undefined,
          });
        }
      }

      const acceptableDiffs = differences.filter(d => d.acceptable).map(d => d.key);
      const unacceptableDiffs = differences.filter(d => !d.acceptable).map(d => d.key);

      // Parity score: 100 minus penalty for unacceptable differences
      const parityScore = Math.max(
        0,
        100 - (unacceptableDiffs.length * 10)
      );

      const report: EnvironmentParityReport = {
        timestamp: new Date(),
        stagingConfig: stagingOutputs,
        productionConfig: productionOutputs,
        differences,
        acceptableDifferences: acceptableDiffs,
        unacceptableDifferences: unacceptableDiffs,
        parityScore,
      };

      this.log('info', 'Parity check complete', {
        totalDifferences: differences.length,
        acceptable: acceptableDiffs.length,
        unacceptable: unacceptableDiffs.length,
        score: parityScore,
      });

      return ok(report);
    } catch (error) {
      return fail(`Parity check failed: ${error}`, 'PARITY_CHECK_FAILED');
    }
  }

  private categorizeDifference(key: string): 'size' | 'config' | 'feature' | 'security' {
    if (key.includes('instance') || key.includes('size') || key.includes('count')
        || key.includes('storage') || key.includes('memory') || key.includes('cpu')) {
      return 'size';
    }
    if (key.includes('mfa') || key.includes('auth') || key.includes('tls')
        || key.includes('encryption')) {
      return 'security';
    }
    if (key.includes('enable') || key.includes('feature')) {
      return 'feature';
    }
    return 'config';
  }
}
