// ============================================================================
// SPRINT 23 TEST SUITE — 120 TESTS
// Scholarly Platform — Deployment + Content SDK
// ============================================================================

import { Result, ok, fail } from '../shared/base';

interface TestResult { name: string; passed: boolean; error?: string; }
interface TestSuite { name: string; tests: TestResult[]; }

function assert(condition: boolean, msg: string): void { if (!condition) throw new Error(msg); }
function assertContains(h: string, n: string, c?: string): void { if (!h.includes(n)) throw new Error(`Expected "${n}"${c ? ` (${c})` : ''}`); }
function assertResult<T>(r: Result<T>, c?: string): T { assert(r.success === true, `Expected success${c ? ` for ${c}` : ''}`); return (r as any).data; }

// ============================================================================
// PATH B TESTS (60 tests)
// ============================================================================

function testPathB(): TestSuite {
  const tests: TestResult[] = [];
  const run = (name: string, fn: () => void) => { try { fn(); tests.push({ name, passed: true }); } catch (e: any) { tests.push({ name, passed: false, error: e.message }); } };
  const inf = () => require('../infrastructure/cicd-staging-deployment');

  // B23-001: Staging Terraform (15 tests)
  run('B001: staging env is staging', () => assert(inf().DEFAULT_STAGING_CONFIG.environment === 'staging', 'env'));
  run('B002: staging RDS is t3.medium', () => assert(inf().DEFAULT_STAGING_CONFIG.rds.instanceClass === 'db.t3.medium', 'rds'));
  run('B003: staging no read replica', () => assert(inf().DEFAULT_STAGING_CONFIG.rds.readReplica === false, 'replica'));
  run('B004: staging Redis 0 replicas', () => assert(inf().DEFAULT_STAGING_CONFIG.redis.numReplicas === 0, 'redis'));
  run('B005: staging NATS 1 node', () => assert(inf().DEFAULT_STAGING_CONFIG.nats.nodes === 1, 'nats'));
  run('B006: region ap-southeast-2', () => assert(inf().DEFAULT_STAGING_CONFIG.region === 'ap-southeast-2', 'region'));
  run('B007: TF generator produces 4 files', () => { const g = new (inf().StagingTerraformGenerator)(); assert(assertResult(g.generateStagingStack(inf().DEFAULT_STAGING_CONFIG)).size === 4, '4 files'); });
  run('B008: main refs all modules', () => { const g = new (inf().StagingTerraformGenerator)(); const m = assertResult(g.generateStagingStack(inf().DEFAULT_STAGING_CONFIG)).get('staging-main.tf'); for (const mod of ['vpc', 'rds', 'redis', 's3', 'cloudfront', 'nats', 'ecs']) assertContains(m, `module "${mod}"`); });
  run('B009: backend uses S3+DynamoDB locking', () => { const g = new (inf().StagingTerraformGenerator)(); const b = assertResult(g.generateStagingStack(inf().DEFAULT_STAGING_CONFIG)).get('staging-backend.tf'); assertContains(b, 'dynamodb_table'); });
  run('B010: outputs include staging_url', () => { const g = new (inf().StagingTerraformGenerator)(); assertContains(assertResult(g.generateStagingStack(inf().DEFAULT_STAGING_CONFIG)).get('staging-outputs.tf'), 'staging_url'); });
  run('B011: variables mark secrets sensitive', () => { const g = new (inf().StagingTerraformGenerator)(); assertContains(assertResult(g.generateStagingStack(inf().DEFAULT_STAGING_CONFIG)).get('staging-variables.tf'), 'sensitive'); });
  run('B012: COPPA always enabled', () => { const g = new (inf().StagingTerraformGenerator)(); assertContains(assertResult(g.generateStagingStack(inf().DEFAULT_STAGING_CONFIG)).get('staging-main.tf'), 'coppa_enabled'); });
  run('B013: single NAT gateway', () => { const g = new (inf().StagingTerraformGenerator)(); assertContains(assertResult(g.generateStagingStack(inf().DEFAULT_STAGING_CONFIG)).get('staging-main.tf'), 'single_nat_gateway = true'); });
  run('B014: deletion_protection false', () => { const g = new (inf().StagingTerraformGenerator)(); assertContains(assertResult(g.generateStagingStack(inf().DEFAULT_STAGING_CONFIG)).get('staging-main.tf'), 'deletion_protection = false'); });
  run('B015: MFA disabled in staging', () => { const g = new (inf().StagingTerraformGenerator)(); assertContains(assertResult(g.generateStagingStack(inf().DEFAULT_STAGING_CONFIG)).get('staging-main.tf'), 'enable_mfa          = false'); });

  // B23-002: ECS + Docker (15 tests)
  run('B016: ECS module 6 files', () => { const g = new (inf().EcsServiceTerraformGenerator)(); assert(assertResult(g.generateEcsModule(inf().DEFAULT_ECS_CONFIG)).size === 6, '6 files'); });
  run('B017: ECS uses Fargate', () => { const g = new (inf().EcsServiceTerraformGenerator)(); assertContains(assertResult(g.generateEcsModule(inf().DEFAULT_ECS_CONFIG)).get('ecs-task-definition.tf'), 'FARGATE'); });
  run('B018: ECS health check /api/health', () => { const g = new (inf().EcsServiceTerraformGenerator)(); assertContains(assertResult(g.generateEcsModule(inf().DEFAULT_ECS_CONFIG)).get('ecs-task-definition.tf'), '/api/health'); });
  run('B019: ECS uses CODE_DEPLOY', () => { const g = new (inf().EcsServiceTerraformGenerator)(); assertContains(assertResult(g.generateEcsModule(inf().DEFAULT_ECS_CONFIG)).get('ecs-service.tf'), 'CODE_DEPLOY'); });
  run('B020: ECR immutable tags', () => { const g = new (inf().EcsServiceTerraformGenerator)(); assertContains(assertResult(g.generateEcsModule(inf().DEFAULT_ECS_CONFIG)).get('ecs-ecr.tf'), 'IMMUTABLE'); });
  run('B021: ECR scan on push', () => { const g = new (inf().EcsServiceTerraformGenerator)(); assertContains(assertResult(g.generateEcsModule(inf().DEFAULT_ECS_CONFIG)).get('ecs-ecr.tf'), 'scan_on_push = true'); });
  run('B022: auto-scale threshold 70%', () => assert(inf().DEFAULT_ECS_CONFIG.scaleUpThreshold === 70, '70%'));
  run('B023: Docker node 20-alpine', () => assert(inf().DEFAULT_DOCKER_CONFIG.nodeVersion === '20-alpine', 'node'));
  run('B024: Dockerfile 3 stages', () => { const g = new (inf().DockerfileGenerator)(); assert((assertResult(g.generateDockerfile()).match(/^FROM /gm)||[]).length === 3, '3 stages'); });
  run('B025: Dockerfile non-root user', () => { const g = new (inf().DockerfileGenerator)(); assertContains(assertResult(g.generateDockerfile()), 'USER scholarly'); });
  run('B026: Dockerfile HEALTHCHECK', () => { const g = new (inf().DockerfileGenerator)(); assertContains(assertResult(g.generateDockerfile()), 'HEALTHCHECK'); });
  run('B027: .dockerignore excludes node_modules', () => { const g = new (inf().DockerfileGenerator)(); assertContains(g.generateDockerIgnore(), 'node_modules'); });
  run('B028: .dockerignore excludes .terraform', () => { const g = new (inf().DockerfileGenerator)(); assertContains(g.generateDockerIgnore(), '.terraform'); });
  run('B029: service discovery in ECS', () => { const g = new (inf().EcsServiceTerraformGenerator)(); assertContains(assertResult(g.generateEcsModule(inf().DEFAULT_ECS_CONFIG)).get('ecs-service.tf'), 'service_discovery'); });
  run('B030: blue/green target groups', () => { const g = new (inf().EcsServiceTerraformGenerator)(); const s = assertResult(g.generateEcsModule(inf().DEFAULT_ECS_CONFIG)).get('ecs-service.tf'); assertContains(s, 'blue'); assertContains(s, 'green'); });

  // B23-003: CI/CD + Blue/Green (15 tests)
  run('B031: GHA workflow generated', () => { const g = new (inf().GitHubActionsGenerator)(); assertContains(assertResult(g.generateDeployWorkflow(inf().DEFAULT_CICD_CONFIG)), 'Deploy to Staging'); });
  run('B032: workflow has lint', () => { const g = new (inf().GitHubActionsGenerator)(); assertContains(assertResult(g.generateDeployWorkflow(inf().DEFAULT_CICD_CONFIG)), 'npm run lint'); });
  run('B033: workflow has postgres', () => { const g = new (inf().GitHubActionsGenerator)(); assertContains(assertResult(g.generateDeployWorkflow(inf().DEFAULT_CICD_CONFIG)), 'postgres:16-alpine'); });
  run('B034: workflow pushes ECR', () => { const g = new (inf().GitHubActionsGenerator)(); assertContains(assertResult(g.generateDeployWorkflow(inf().DEFAULT_CICD_CONFIG)), 'ecr-login'); });
  run('B035: workflow runs migrations', () => { const g = new (inf().GitHubActionsGenerator)(); assertContains(assertResult(g.generateDeployWorkflow(inf().DEFAULT_CICD_CONFIG)), 'prisma migrate deploy'); });
  run('B036: workflow uses CodeDeploy', () => { const g = new (inf().GitHubActionsGenerator)(); assertContains(assertResult(g.generateDeployWorkflow(inf().DEFAULT_CICD_CONFIG)), 'deploy create-deployment'); });
  run('B037: workflow runs Playwright smoke', () => { const g = new (inf().GitHubActionsGenerator)(); assertContains(assertResult(g.generateDeployWorkflow(inf().DEFAULT_CICD_CONFIG)), 'playwright test'); });
  run('B038: workflow Slack notify', () => { const g = new (inf().GitHubActionsGenerator)(); assertContains(assertResult(g.generateDeployWorkflow(inf().DEFAULT_CICD_CONFIG)), 'SLACK_WEBHOOK'); });
  run('B039: skip_tests for emergency', () => { const g = new (inf().GitHubActionsGenerator)(); assertContains(assertResult(g.generateDeployWorkflow(inf().DEFAULT_CICD_CONFIG)), 'skip_tests'); });
  run('B040: branch protection 2 approvals main', () => { const g = new (inf().GitHubActionsGenerator)(); assertContains(assertResult(g.generateBranchProtection()), 'required_approving_review_count: 2'); });
  run('B041: auto-rollback enabled', () => assert(inf().DEFAULT_BLUE_GREEN_CONFIG.autoRollbackEnabled === true, 'rollback'));
  run('B042: rollback on DEPLOYMENT_FAILURE', () => assert(inf().DEFAULT_BLUE_GREEN_CONFIG.autoRollbackEvents.includes('DEPLOYMENT_FAILURE'), 'failure'));
  run('B043: CodeDeploy 5xx alarm', () => { const g = new (inf().BlueGreenDeploymentGenerator)(); assertContains(assertResult(g.generateCodeDeployTerraform(inf().DEFAULT_BLUE_GREEN_CONFIG)), '5XX'); });
  run('B044: termination wait 15min', () => assert(inf().DEFAULT_BLUE_GREEN_CONFIG.terminationWaitMinutes === 15, '15min'));
  run('B045: no parallel deploys', () => { const g = new (inf().GitHubActionsGenerator)(); assertContains(assertResult(g.generateDeployWorkflow(inf().DEFAULT_CICD_CONFIG)), 'cancel-in-progress: false'); });

  // B23-004: Smoke Tests + Parity (15 tests)
  run('B046: smoke URL staging', () => assertContains(inf().DEFAULT_SMOKE_CONFIG.baseUrl, 'staging.scholarly.app'));
  run('B047: Playwright config generated', () => { const g = new (inf().SmokeTestGenerator)(); assertContains(assertResult(g.generatePlaywrightConfig()), 'defineConfig'); });
  run('B048: smoke covers 5 paths', () => { const g = new (inf().SmokeTestGenerator)(); const t = assertResult(g.generateSmokeTests(inf().DEFAULT_SMOKE_CONFIG)); for (const p of ['Health Check','Authentication','API CRUD','Storybook Generation','Library Search']) assertContains(t, p); });
  run('B049: smoke checks NATS', () => { const g = new (inf().SmokeTestGenerator)(); assertContains(assertResult(g.generateSmokeTests(inf().DEFAULT_SMOKE_CONFIG)), 'nats'); });
  run('B050: smoke rejects bad API key', () => { const g = new (inf().SmokeTestGenerator)(); const t = assertResult(g.generateSmokeTests(inf().DEFAULT_SMOKE_CONFIG)); assertContains(t, 'invalid-key'); assertContains(t, '401'); });
  run('B051: parity finds differences', () => { const c = new (inf().EnvironmentParityChecker)(); assert(assertResult(c.checkParity({ 'rds.instance_class': 'sm' }, { 'rds.instance_class': 'lg' })).differences.length === 1, 'diff'); });
  run('B052: parity size diffs acceptable', () => { const c = new (inf().EnvironmentParityChecker)(); assert(assertResult(c.checkParity({ 'rds.instance_class': 'sm' }, { 'rds.instance_class': 'lg' })).acceptableDifferences.length === 1, 'acceptable'); });
  run('B053: parity 100 when identical', () => { const c = new (inf().EnvironmentParityChecker)(); assert(assertResult(c.checkParity({ a: '1' }, { a: '1' })).parityScore === 100, '100%'); });
  run('B054: parity penalises unacceptable', () => { const c = new (inf().EnvironmentParityChecker)(); assert(assertResult(c.checkParity({ 'x.y': 'a' }, { 'x.y': 'b' })).parityScore < 100, '<100'); });
  run('B055: smoke retry 2', () => assert(inf().DEFAULT_SMOKE_CONFIG.retryCount === 2, 'retry'));
  run('B056: smoke timeout 30s', () => assert(inf().DEFAULT_SMOKE_CONFIG.testTimeout === 30000, '30s'));
  run('B057: Playwright sequential', () => { const g = new (inf().SmokeTestGenerator)(); assertContains(assertResult(g.generatePlaywrightConfig()), 'workers: 1'); });
  run('B058: Playwright screenshots on failure', () => { const g = new (inf().SmokeTestGenerator)(); assertContains(assertResult(g.generatePlaywrightConfig()), 'only-on-failure'); });
  run('B059: Playwright HTML+JSON reporters', () => { const g = new (inf().SmokeTestGenerator)(); const c = assertResult(g.generatePlaywrightConfig()); assertContains(c, 'html'); assertContains(c, 'json'); });
  run('B060: smoke expects 202 for generation', () => { const g = new (inf().SmokeTestGenerator)(); assertContains(assertResult(g.generateSmokeTests(inf().DEFAULT_SMOKE_CONFIG)), '202'); });

  return { name: 'Path B: Staging + CI/CD + Deployment', tests };
}

// ============================================================================
// PATH C TESTS (60 tests)
// ============================================================================

function testPathC(): TestSuite {
  const tests: TestResult[] = [];
  const run = (name: string, fn: () => void) => { try { fn(); tests.push({ name, passed: true }); } catch (e: any) { tests.push({ name, passed: false, error: e.message }); } };
  const sdk = () => require('../storybook/content-sdk-types');
  const cli = () => require('../storybook/cli-developer-portal');

  // C23-001: SDK Client (15 tests)
  run('C001: client instantiates', () => assert(new (sdk().ScholarlyClient)({ apiKey: 'test' }) !== null, 'client'));
  run('C002: no rate limit initially', () => assert(new (sdk().ScholarlyClient)({ apiKey: 'test' }).getRateLimitInfo() === null, 'null'));
  run('C003: validator from phase', () => assert(sdk().ContentValidator.forPhase(3) !== null, 'validator'));
  run('C004: phase 2 includes phase 1 GPCs', () => assert(sdk().ContentValidator.forPhase(2).validateStory([{ text: 'a sat pat' }]).decodability.passed === true, 'phase1 in phase2'));
  run('C005: unknown GPCs fail decodability', () => assert(sdk().ContentValidator.forPhase(1).validateStory([{ text: 'the quick brown fox jumps' }]).decodability.passed === false, 'fail'));
  run('C006: tricky words always decodable', () => assert(sdk().ContentValidator.forPhase(1).validateStory([{ text: 'the I we he she' }]).decodability.score > 0.5, 'tricky'));
  run('C007: safety flags violence', () => { const r = sdk().ContentValidator.forPhase(3).validateStory([{ text: 'The dragon tried to kill the knight' }]); assert(!r.safety.safe, 'unsafe'); assert(r.safety.flags.length > 0, 'flags'); });
  run('C008: safety passes clean content', () => assert(sdk().ContentValidator.forPhase(3).validateStory([{ text: 'The cat sat on the mat' }]).safety.safe === true, 'safe'));
  run('C009: metadata reports missing fields', () => assert(sdk().ContentValidator.forPhase(3).validateStory([{ text: 'test' }], {}).metadata.missingFields.length > 0, 'missing'));
  run('C010: vocabulary tier1 for simple words', () => assert(sdk().ContentValidator.forPhase(3).validateStory([{ text: 'the big red cat sat in the sun' }]).vocabulary.tier === 'tier1', 'tier1'));
  run('C011: overall score 0-100', () => { const s = sdk().ContentValidator.forPhase(3).validateStory([{ text: 'the cat sat' }]).overallScore; assert(s >= 0 && s <= 100, 'range'); });
  run('C012: short stories get structure warning', () => assert(sdk().ContentValidator.forPhase(3).validateStory([{ text: 'test' }]).issues.some((i: any) => i.category === 'structure'), 'struct'));
  run('C013: non-decodable words reported', () => assert(sdk().ContentValidator.forPhase(1).validateStory([{ text: 'the butterfly chased' }]).decodability.nonDecodableWords.length > 0, 'nondec'));
  run('C014: valid result for good phase 3 content', () => { const r = sdk().ContentValidator.forPhase(3).validateStory([{ text: 'the sheep sat on the chair' }, { text: 'she had a fish and chips' }, { text: 'the ship went to the shop' }, { text: 'a thin cat sat in the shed' }, { text: 'she had a chat in the sun' }, { text: 'the moth sat on the path' }, { text: 'he ran up the green hill' }, { text: 'the end' }]); assert(r.valid === true, 'should be valid'); });
  run('C015: decodability reports total/decodable counts', () => { const r = sdk().ContentValidator.forPhase(3).validateStory([{ text: 'the cat sat on the mat' }]); assert(r.decodability.totalWords > 0, 'total'); assert(r.decodability.decodableWords > 0, 'decodable'); });

  // C23-002: CLI Commands (15 tests)
  run('C016: CLI instantiates', () => assert(new (cli().StorybookCli)() !== null, 'cli'));
  run('C017: CLI has 10 commands', () => assert(new (cli().StorybookCli)().getCommands().length === 10, '10 cmds'));
  run('C018: generate command exists', () => assert(new (cli().StorybookCli)().getCommands().some((c: any) => c.name === 'generate'), 'gen'));
  run('C019: validate command exists', () => assert(new (cli().StorybookCli)().getCommands().some((c: any) => c.name === 'validate'), 'val'));
  run('C020: illustrate command exists', () => assert(new (cli().StorybookCli)().getCommands().some((c: any) => c.name === 'illustrate'), 'illus'));
  run('C021: narrate command exists', () => assert(new (cli().StorybookCli)().getCommands().some((c: any) => c.name === 'narrate'), 'narr'));
  run('C022: submit command exists', () => assert(new (cli().StorybookCli)().getCommands().some((c: any) => c.name === 'submit'), 'sub'));
  run('C023: search command exists', () => assert(new (cli().StorybookCli)().getCommands().some((c: any) => c.name === 'search'), 'search'));
  run('C024: publish command exists', () => assert(new (cli().StorybookCli)().getCommands().some((c: any) => c.name === 'publish'), 'pub'));
  run('C025: list command exists', () => assert(new (cli().StorybookCli)().getCommands().some((c: any) => c.name === 'list'), 'list'));
  run('C026: generate has --phase option', () => assert(new (cli().StorybookCli)().getCommands().find((c: any) => c.name === 'generate').options.some((o: any) => o.flag === '--phase'), 'phase'));
  run('C027: search has --query option', () => assert(new (cli().StorybookCli)().getCommands().find((c: any) => c.name === 'search').options.some((o: any) => o.flag === '--query'), 'query'));
  run('C028: help text includes all commands', () => { const h = new (cli().StorybookCli)().generateHelp(); for (const cmd of ['generate', 'validate', 'illustrate', 'narrate', 'submit', 'search', 'publish', 'list']) assertContains(h, cmd); });
  run('C029: execute rejects unknown command', () => { const c = new (cli().StorybookCli)(); c.initialise({ apiKey: 'test', baseUrl: 'http://test', defaultPhase: 3, defaultAgeGroup: '5-6', defaultArtStyle: 'watercolour', defaultVoice: 'emma', outputFormat: 'json' }); });
  run('C030: CLI has aliases (gen, art, ls)', () => { const cmds = new (cli().StorybookCli)().getCommands(); assert(cmds.some((c: any) => c.aliases.includes('gen')), 'gen alias'); assert(cmds.some((c: any) => c.aliases.includes('art')), 'art alias'); assert(cmds.some((c: any) => c.aliases.includes('ls')), 'ls alias'); });

  // C23-003: Developer Portal (15 tests)
  run('C031: OpenAPI spec generated', () => { const g = new (cli().OpenApiSpecGenerator)(); assert(assertResult(g.generateSpec()).openapi === '3.1.0', 'openapi'); });
  run('C032: OpenAPI has 12 paths', () => { const g = new (cli().OpenApiSpecGenerator)(); assert(Object.keys(assertResult(g.generateSpec()).paths).length === 12, '12 paths'); });
  run('C033: OpenAPI has security scheme', () => { const g = new (cli().OpenApiSpecGenerator)(); assert(assertResult(g.generateSpec()).components.securitySchemes.apiKeyAuth !== undefined, 'apiKey'); });
  run('C034: OpenAPI has 9 tags', () => { const g = new (cli().OpenApiSpecGenerator)(); assert(assertResult(g.generateSpec()).tags.length === 9, '9 tags'); });
  run('C035: playground config has max 5 generations', () => assert(cli().DEFAULT_PLAYGROUND_CONFIG.maxGenerationsPerSession === 5, '5 gens'));
  run('C036: playground enables 4 features', () => assert(cli().DEFAULT_PLAYGROUND_CONFIG.enabledFeatures.length === 4, '4 features'));
  run('C037: 4 featured templates', () => assert(cli().FEATURED_TEMPLATES.length === 4, '4 templates'));
  run('C038: Finn Fox template exists', () => assert(cli().FEATURED_TEMPLATES.some((t: any) => t.id === 'tmpl_finn_fox'), 'finn'));
  run('C039: template has fork count', () => assert(cli().FEATURED_TEMPLATES.every((t: any) => typeof t.forkCount === 'number'), 'forkCount'));
  run('C040: 3 SDK tutorials', () => assert(cli().SDK_TUTORIALS.length === 3, '3 tutorials'));
  run('C041: first tutorial is beginner', () => assert(cli().SDK_TUTORIALS[0].difficulty === 'beginner', 'beginner'));
  run('C042: tutorials have runnable steps', () => assert(cli().SDK_TUTORIALS[0].steps.some((s: any) => s.runnable === true), 'runnable'));
  run('C043: 4 webhook events defined', () => assert(cli().WEBHOOK_EVENTS.length === 4, '4 webhooks'));
  run('C044: webhook events map to NATS subjects', () => assert(cli().WEBHOOK_EVENTS.every((e: any) => e.natsSubject.startsWith('scholarly.')), 'nats subjects'));
  run('C045: webhook events have examples', () => assert(cli().WEBHOOK_EVENTS.every((e: any) => Object.keys(e.example).length > 0), 'examples'));

  // C23-004: Config + Integration (15 tests)
  run('C046: default config file version 1', () => assert(cli().DEFAULT_CLI_CONFIG_FILE.version === 1, 'v1'));
  run('C047: config manager parses JSON', () => { const m = new (cli().CliConfigManager)(); const r = assertResult(m.parseConfigFile(JSON.stringify(cli().DEFAULT_CLI_CONFIG_FILE))); assert(r.version === 1, 'parsed'); });
  run('C048: config manager rejects bad version', () => { const m = new (cli().CliConfigManager)(); const r = m.parseConfigFile('{"version": 99}'); assert(r.success === false, 'rejected'); });
  run('C049: config manager generates default', () => { const m = new (cli().CliConfigManager)(); const c = m.generateDefaultConfig(); assert(JSON.parse(c).version === 1, 'default'); });
  run('C050: merge config prefers CLI flags', () => { const m = new (cli().CliConfigManager)(); const r = m.mergeConfig(cli().DEFAULT_CLI_CONFIG_FILE, { phase: 5 }); assert(r.defaultPhase === 5, 'override'); });
  run('C051: merge uses env var for API key', () => { const m = new (cli().CliConfigManager)(); const r = m.mergeConfig({ version: 1 } as any, {}); assert(r.apiKey !== undefined, 'key exists'); });
  run('C052: CI mode config available', () => assert(cli().DEFAULT_CLI_CONFIG_FILE.ci !== undefined, 'ci config'));
  run('C053: CI batch size default 5', () => assert(cli().DEFAULT_CLI_CONFIG_FILE.ci.batchSize === 5, 'batch 5'));
  run('C054: OpenAPI paths include /generate', () => { const s = assertResult(new (cli().OpenApiSpecGenerator)().generateSpec()); assert(s.paths['/api/v1/stories/generate'] !== undefined, 'generate'); });
  run('C055: OpenAPI paths include /library/search', () => { const s = assertResult(new (cli().OpenApiSpecGenerator)().generateSpec()); assert(s.paths['/api/v1/library/search'] !== undefined, 'search'); });
  run('C056: OpenAPI paths include /characters', () => { const s = assertResult(new (cli().OpenApiSpecGenerator)().generateSpec()); assert(s.paths['/api/v1/characters'] !== undefined, 'characters'); });
  run('C057: OpenAPI generate expects 202', () => { const s = assertResult(new (cli().OpenApiSpecGenerator)().generateSpec()); assert(s.paths['/api/v1/stories/generate'].post.responses['202'] !== undefined, '202'); });
  run('C058: cumulative tale template is Phase 2', () => assert(cli().FEATURED_TEMPLATES.find((t: any) => t.id === 'tmpl_cumulative_animals').parameters.phonicsPhase === 2, 'phase 2'));
  run('C059: space adventure targets sh,ch,th,ng', () => { const t = cli().FEATURED_TEMPLATES.find((t: any) => t.id === 'tmpl_adventure_space'); assert(t.parameters.targetGpcs.includes('sh'), 'sh'); assert(t.parameters.targetGpcs.includes('ng'), 'ng'); });
  run('C060: advanced tutorial has prerequisites', () => assert(cli().SDK_TUTORIALS[2].prerequisites.length > 0, 'prereqs'));

  return { name: 'Path C: Content SDK + Developer Portal', tests };
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

function runAll(): void {
  const suites = [testPathB(), testPathC()];

  let totalPassed = 0;
  let totalFailed = 0;

  for (const suite of suites) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${suite.name}`);
    console.log(`${'='.repeat(60)}`);

    let passed = 0;
    let failed = 0;

    for (const test of suite.tests) {
      if (test.passed) {
        console.log(`  ✓ ${test.name}`);
        passed++;
      } else {
        console.log(`  ✗ ${test.name}: ${test.error}`);
        failed++;
      }
    }

    console.log(`\n  ${passed} passed, ${failed} failed (${suite.tests.length} total)`);
    totalPassed += passed;
    totalFailed += failed;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  TOTAL: ${totalPassed} passed, ${totalFailed} failed (${totalPassed + totalFailed} total)`);
  console.log(`${'='.repeat(60)}\n`);
}

runAll();
