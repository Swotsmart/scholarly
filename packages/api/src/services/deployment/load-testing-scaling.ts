// ============================================================================
// SCHOLARLY PLATFORM — S12-008: Load Testing & Horizontal Scaling
// Sprint 12: k6 load tests, auto-scaling, CDN cache warming
// ============================================================================
import { ScholarlyBaseService, Result } from '../shared/base';

// Section 1: Types
interface LoadTestConfig { name: string; baseUrl: string; scenarios: LoadScenario[]; thresholds: PerformanceThreshold[]; duration: string; vus: number; rampUp: string; }
interface LoadScenario { name: string; endpoint: string; method: string; weight: number; expectedLatency: number; payload?: any; auth: boolean; }
interface PerformanceThreshold { metric: string; condition: string; value: number; }
interface LoadTestResult { scenarioName: string; totalRequests: number; successRate: number; avgLatency: number; p95Latency: number; p99Latency: number; maxLatency: number; rps: number; errors: { code: number; count: number }[]; }
interface ScalingConfig { provider: 'aws' | 'gcp' | 'azure'; services: ServiceScalingConfig[]; cdn: CDNConfig; }
interface ServiceScalingConfig { name: string; minInstances: number; maxInstances: number; targetCPU: number; targetMemory: number; scaleUpCooldown: number; scaleDownCooldown: number; }
interface CDNConfig { provider: string; origins: string[]; cachePolicies: CachePolicy[]; warmupUrls: string[]; }
interface CachePolicy { pathPattern: string; ttl: number; cacheControl: string; }

// Section 2: Load Test Definitions
class LoadTestSuite extends ScholarlyBaseService {
  private scenarios: LoadScenario[] = [
    // Critical path: Reading experience
    { name: 'Library Browse', endpoint: '/api/v1/library/search', method: 'GET', weight: 25, expectedLatency: 200, auth: true },
    { name: 'Book Load', endpoint: '/api/v1/storybooks/{id}', method: 'GET', weight: 20, expectedLatency: 150, auth: true },
    { name: 'Reading Session Start', endpoint: '/api/v1/reading-sessions', method: 'POST', weight: 15, expectedLatency: 300, auth: true },
    { name: 'BKT Update', endpoint: '/api/v1/bkt/update', method: 'POST', weight: 15, expectedLatency: 100, auth: true },
    { name: 'Recommendations', endpoint: '/api/v1/library/recommend', method: 'GET', weight: 10, expectedLatency: 500, auth: true },
    // Auth flow
    { name: 'Login', endpoint: '/api/v1/auth/login', method: 'POST', weight: 5, expectedLatency: 200, auth: false },
    // AI generation (expensive, low weight)
    { name: 'Story Generate', endpoint: '/api/v1/stories/generate', method: 'POST', weight: 3, expectedLatency: 5000, auth: true },
    // Dashboard
    { name: 'Teacher Dashboard', endpoint: '/api/v1/analytics/dashboard', method: 'GET', weight: 5, expectedLatency: 400, auth: true },
    // Health check
    { name: 'Health', endpoint: '/api/v1/health', method: 'GET', weight: 2, expectedLatency: 50, auth: false },
  ];

  generateK6Script(config: LoadTestConfig): string {
    return `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const latency = new Trend('request_latency');

export const options = {
  stages: [
    { duration: '${config.rampUp}', target: ${config.vus} },
    { duration: '${config.duration}', target: ${config.vus} },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    errors: ['rate<0.05'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = '${config.baseUrl}';
let authToken = '';

export function setup() {
  const loginRes = http.post(BASE_URL + '/api/v1/auth/login', JSON.stringify({ email: 'loadtest@scholarly.com', password: 'LoadTest123!' }), { headers: { 'Content-Type': 'application/json' } });
  return { token: JSON.parse(loginRes.body).token };
}

export default function(data) {
  const headers = { 'Authorization': 'Bearer ' + data.token, 'Content-Type': 'application/json' };
  const rand = Math.random() * 100;
  let cumWeight = 0;

  ${self._generateScenarioBlocks(config)}

  sleep(Math.random() * 2 + 0.5);
}`;
  }

  private _generateScenarioBlocks(config: LoadTestConfig): string {
    let blocks = '';
    let cumWeight = 0;
    for (const s of this.scenarios) {
      const prevWeight = cumWeight;
      cumWeight += s.weight;
      blocks += `  if (rand >= ${prevWeight} && rand < ${cumWeight}) {
    const res = http.${s.method.toLowerCase()}(BASE_URL + '${s.endpoint}', ${s.method === 'POST' ? 'JSON.stringify({}),' : ''} { headers${s.auth ? '' : ': {}'} });
    check(res, { '${s.name} status 200': (r) => r.status === 200 });
    latency.add(res.timings.duration);
    errorRate.add(res.status !== 200);
  }
`;
    }
    return blocks;
  }

  async analyseResults(results: LoadTestResult[]): Promise<Result<{ passed: boolean; summary: string; recommendations: string[] }>> {
    const failures = results.filter(r => r.successRate < 0.95 || r.p95Latency > 2000);
    const recommendations: string[] = [];
    for (const r of results) {
      if (r.p95Latency > 1000) recommendations.push(`${r.scenarioName}: p95 latency ${r.p95Latency}ms exceeds 1s target. Consider caching or query optimisation.`);
      if (r.successRate < 0.99) recommendations.push(`${r.scenarioName}: ${((1 - r.successRate) * 100).toFixed(1)}% error rate. Review error logs.`);
    }
    return { success: true, data: { passed: failures.length === 0, summary: `${results.length} scenarios, ${failures.length} failures`, recommendations } };
  }
}

// Section 3: Auto-Scaling Configuration
class AutoScalingConfigService extends ScholarlyBaseService {
  getScalingConfig(): ScalingConfig {
    return {
      provider: 'aws',
      services: [
        { name: 'api-gateway', minInstances: 2, maxInstances: 10, targetCPU: 70, targetMemory: 80, scaleUpCooldown: 60, scaleDownCooldown: 300 },
        { name: 'storybook-engine', minInstances: 2, maxInstances: 8, targetCPU: 60, targetMemory: 75, scaleUpCooldown: 120, scaleDownCooldown: 300 },
        { name: 'bkt-service', minInstances: 2, maxInstances: 6, targetCPU: 75, targetMemory: 80, scaleUpCooldown: 60, scaleDownCooldown: 300 },
        { name: 'websocket-server', minInstances: 2, maxInstances: 8, targetCPU: 65, targetMemory: 70, scaleUpCooldown: 60, scaleDownCooldown: 180 },
        { name: 'worker-queue', minInstances: 1, maxInstances: 5, targetCPU: 80, targetMemory: 85, scaleUpCooldown: 120, scaleDownCooldown: 600 },
      ],
      cdn: {
        provider: 'cloudflare',
        origins: ['api.scholarly.app', 'cdn.scholarly.app'],
        cachePolicies: [
          { pathPattern: '/api/v1/library/*', ttl: 300, cacheControl: 'public, max-age=300' },
          { pathPattern: '/api/v1/storybooks/*/pages/*/image', ttl: 86400, cacheControl: 'public, max-age=86400, immutable' },
          { pathPattern: '/api/v1/storybooks/*/pages/*/audio', ttl: 86400, cacheControl: 'public, max-age=86400, immutable' },
          { pathPattern: '/api/v1/health', ttl: 10, cacheControl: 'no-cache' },
          { pathPattern: '/api/v1/auth/*', ttl: 0, cacheControl: 'no-store' },
        ],
        warmupUrls: ['/api/v1/library/search?phase=2', '/api/v1/library/search?phase=3', '/api/v1/health'],
      }
    };
  }

  async warmCDNCache(config: CDNConfig): Promise<Result<{ warmed: number; failed: number }>> {
    let warmed = 0, failed = 0;
    for (const url of config.warmupUrls) {
      try { await fetch(url); warmed++; } catch { failed++; }
    }
    return { success: true, data: { warmed, failed } };
  }
}

export { LoadTestSuite, AutoScalingConfigService, LoadTestConfig, LoadScenario, LoadTestResult, ScalingConfig, CDNConfig };
