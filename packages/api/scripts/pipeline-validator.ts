// =============================================================================
// SCHOLARLY PLATFORM — Sprint 30, Week 4
// Voice Pipeline Validator (Deployment Smoke Test)
// =============================================================================
//
// This utility runs against a live Voice Service instance and validates
// that every endpoint in the pipeline responds correctly. It's designed
// to be run as part of the deployment pipeline:
//
//   1. Deploy the Voice Service container
//   2. Wait for health check
//   3. Run this validator
//   4. If all checks pass → promote to production
//   5. If any check fails → rollback
//
// Usage:
//   VOICE_SERVICE_URL=http://localhost:8100 npx ts-node pipeline-validator.ts
//
// The validator tests each stage of the pipeline independently, so a failure
// in stage 3 doesn't prevent testing of stages 4–7.
// =============================================================================

interface ValidationResult {
  stage: string;
  endpoint: string;
  status: 'pass' | 'fail' | 'skip';
  durationMs: number;
  message: string;
  details?: Record<string, unknown>;
}

interface PipelineReport {
  voiceServiceUrl: string;
  timestamp: string;
  totalDurationMs: number;
  results: ValidationResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
}


// =============================================================================
// Section 1: Test Data
// =============================================================================

const TEST_TEXT = 'The cat sat on the mat.';
const TEST_TARGET_GPCS = ['a', 'th'];

/** Generate a minimal valid WAV (16kHz mono, 0.5s silence) */
function generateTestWav(): string {
  const sampleRate = 16000;
  const numSamples = sampleRate * 0.5;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer.toString('base64');
}


// =============================================================================
// Section 2: Stage Validators
// =============================================================================

async function validateHealthCheck(baseUrl: string): Promise<ValidationResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${baseUrl}/healthz`);
    const data = await res.json() as Record<string, unknown>;
    return {
      stage: '0', endpoint: 'GET /healthz', status: res.ok ? 'pass' : 'fail',
      durationMs: Date.now() - start,
      message: res.ok ? `Healthy: ${JSON.stringify(data)}` : `Unhealthy: ${res.status}`,
      details: data,
    };
  } catch (e) {
    return {
      stage: '0', endpoint: 'GET /healthz', status: 'fail',
      durationMs: Date.now() - start,
      message: `Connection failed: ${(e as Error).message}`,
    };
  }
}

async function validateTTSSynthesis(baseUrl: string): Promise<ValidationResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${baseUrl}/api/v1/tts/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: TEST_TEXT,
        voice_id: 'af_bella',
        output_format: 'wav',
        word_timestamps: true,
      }),
    });

    if (!res.ok) {
      return {
        stage: '1', endpoint: 'POST /api/v1/tts/synthesize', status: 'fail',
        durationMs: Date.now() - start,
        message: `HTTP ${res.status}: ${await res.text()}`,
      };
    }

    const data = await res.json() as Record<string, unknown>;
    const hasAudio = typeof data.audio_base64 === 'string' && (data.audio_base64 as string).length > 100;
    const hasTimestamps = Array.isArray(data.word_timestamps) && (data.word_timestamps as unknown[]).length > 0;

    return {
      stage: '1', endpoint: 'POST /api/v1/tts/synthesize',
      status: hasAudio && hasTimestamps ? 'pass' : 'fail',
      durationMs: Date.now() - start,
      message: hasAudio && hasTimestamps
        ? `Audio: ${((data.audio_base64 as string).length / 1024).toFixed(0)}KB, ${(data.word_timestamps as unknown[]).length} timestamps`
        : `Missing ${!hasAudio ? 'audio' : 'timestamps'}`,
      details: { durationMs: data.duration_ms, wordCount: (data.word_timestamps as unknown[])?.length },
    };
  } catch (e) {
    return {
      stage: '1', endpoint: 'POST /api/v1/tts/synthesize', status: 'fail',
      durationMs: Date.now() - start,
      message: `Error: ${(e as Error).message}`,
    };
  }
}

async function validateForcedAlignment(baseUrl: string): Promise<ValidationResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${baseUrl}/api/v1/stt/align`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: TEST_TEXT,
        audio_base64: generateTestWav(),
        language: 'en',
        include_phonemes: true,
      }),
    });

    if (!res.ok) {
      return {
        stage: '2', endpoint: 'POST /api/v1/stt/align', status: 'fail',
        durationMs: Date.now() - start,
        message: `HTTP ${res.status}: ${await res.text()}`,
      };
    }

    const data = await res.json() as Record<string, unknown>;
    const hasWords = Array.isArray(data.word_timestamps) && (data.word_timestamps as unknown[]).length > 0;

    return {
      stage: '2', endpoint: 'POST /api/v1/stt/align',
      status: hasWords ? 'pass' : 'fail',
      durationMs: Date.now() - start,
      message: hasWords
        ? `${(data.word_timestamps as unknown[]).length} word timestamps, ${(data.phoneme_timestamps as unknown[])?.length ?? 0} phonemes`
        : 'No word timestamps returned',
      details: { duration: data.duration_seconds },
    };
  } catch (e) {
    return {
      stage: '2', endpoint: 'POST /api/v1/stt/align', status: 'fail',
      durationMs: Date.now() - start,
      message: `Error: ${(e as Error).message}`,
    };
  }
}

async function validatePhonicsEmphasis(baseUrl: string): Promise<ValidationResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${baseUrl}/api/v1/studio/phonics-pace`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: TEST_TEXT,
        target_gpcs: TEST_TARGET_GPCS,
        audio_base64: generateTestWav(),
        emphasis_pace: 0.8,
      }),
    });

    if (!res.ok) {
      return {
        stage: '3', endpoint: 'POST /api/v1/studio/phonics-pace', status: 'fail',
        durationMs: Date.now() - start,
        message: `HTTP ${res.status}: ${await res.text()}`,
      };
    }

    const data = await res.json() as Record<string, unknown>;
    const hasPaceMap = Array.isArray(data.pace_map) && (data.pace_map as unknown[]).length > 0;

    return {
      stage: '3', endpoint: 'POST /api/v1/studio/phonics-pace',
      status: hasPaceMap ? 'pass' : 'fail',
      durationMs: Date.now() - start,
      message: hasPaceMap
        ? `Pace map: ${(data.pace_map as unknown[]).length} entries, ${(data as any).emphasis_summary?.emphasised_words ?? 0} emphasised`
        : 'No pace map returned',
    };
  } catch (e) {
    return {
      stage: '3', endpoint: 'POST /api/v1/studio/phonics-pace', status: 'fail',
      durationMs: Date.now() - start,
      message: `Error: ${(e as Error).message}`,
    };
  }
}

async function validatePronunciationScoring(baseUrl: string): Promise<ValidationResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${baseUrl}/api/v1/stt/assess-pronunciation/enhanced`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio_base64: generateTestWav(),
        expected_text: TEST_TEXT,
        target_gpcs: TEST_TARGET_GPCS,
        language: 'en',
      }),
    });

    if (!res.ok) {
      return {
        stage: '4', endpoint: 'POST /api/v1/stt/assess-pronunciation/enhanced', status: 'fail',
        durationMs: Date.now() - start,
        message: `HTTP ${res.status}: ${await res.text()}`,
      };
    }

    const data = await res.json() as Record<string, unknown>;
    const hasScore = typeof data.overall_score === 'number';
    const hasGpcScores = data.gpc_scores && typeof data.gpc_scores === 'object';

    return {
      stage: '4', endpoint: 'POST /api/v1/stt/assess-pronunciation/enhanced',
      status: hasScore && hasGpcScores ? 'pass' : 'fail',
      durationMs: Date.now() - start,
      message: hasScore && hasGpcScores
        ? `Overall: ${(data.overall_score as number).toFixed(2)}, GPCs: ${JSON.stringify(data.gpc_scores)}`
        : `Missing ${!hasScore ? 'overall_score' : 'gpc_scores'}`,
      details: { fluencyWpm: data.fluency_wpm },
    };
  } catch (e) {
    return {
      stage: '4', endpoint: 'POST /api/v1/stt/assess-pronunciation/enhanced', status: 'fail',
      durationMs: Date.now() - start,
      message: `Error: ${(e as Error).message}`,
    };
  }
}

async function validatePacePreview(baseUrl: string): Promise<ValidationResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${baseUrl}/api/v1/studio/phonics-pace/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: TEST_TEXT,
        target_gpcs: TEST_TARGET_GPCS,
        emphasis_pace: 0.8,
      }),
    });

    if (!res.ok) {
      return {
        stage: '5', endpoint: 'POST /api/v1/studio/phonics-pace/preview', status: 'fail',
        durationMs: Date.now() - start,
        message: `HTTP ${res.status}`,
      };
    }

    const data = await res.json() as Record<string, unknown>;
    const hasPaceMap = Array.isArray(data.pace_map);

    return {
      stage: '5', endpoint: 'POST /api/v1/studio/phonics-pace/preview',
      status: hasPaceMap ? 'pass' : 'fail',
      durationMs: Date.now() - start,
      message: hasPaceMap ? `Preview: ${(data.pace_map as unknown[]).length} entries` : 'No pace map',
    };
  } catch (e) {
    return {
      stage: '5', endpoint: 'POST /api/v1/studio/phonics-pace/preview', status: 'fail',
      durationMs: Date.now() - start,
      message: `Error: ${(e as Error).message}`,
    };
  }
}


// =============================================================================
// Section 3: Pipeline Runner
// =============================================================================

export async function runPipelineValidation(
  voiceServiceUrl: string,
): Promise<PipelineReport> {
  const start = Date.now();
  const results: ValidationResult[] = [];

  console.log(`\n🔬 Voice Pipeline Validator`);
  console.log(`   Target: ${voiceServiceUrl}`);
  console.log(`   Time:   ${new Date().toISOString()}\n`);

  // Stage 0: Health
  const health = await validateHealthCheck(voiceServiceUrl);
  results.push(health);
  logResult(health);

  if (health.status === 'fail') {
    console.log('\n❌ Voice Service is unreachable. Skipping remaining stages.\n');
    return buildReport(voiceServiceUrl, start, results);
  }

  // Stage 1: TTS Synthesis
  const tts = await validateTTSSynthesis(voiceServiceUrl);
  results.push(tts);
  logResult(tts);

  // Stage 2: Forced Alignment
  const alignment = await validateForcedAlignment(voiceServiceUrl);
  results.push(alignment);
  logResult(alignment);

  // Stage 3: Phonics Emphasis
  const emphasis = await validatePhonicsEmphasis(voiceServiceUrl);
  results.push(emphasis);
  logResult(emphasis);

  // Stage 4: Pronunciation Scoring
  const pronunciation = await validatePronunciationScoring(voiceServiceUrl);
  results.push(pronunciation);
  logResult(pronunciation);

  // Stage 5: Pace Preview (lightweight endpoint)
  const preview = await validatePacePreview(voiceServiceUrl);
  results.push(preview);
  logResult(preview);

  const report = buildReport(voiceServiceUrl, start, results);

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  Total: ${report.summary.total} | ✅ ${report.summary.passed} | ❌ ${report.summary.failed} | ⏭️  ${report.summary.skipped}`);
  console.log(`  Duration: ${report.totalDurationMs}ms`);
  console.log(`${'─'.repeat(60)}\n`);

  return report;
}


// =============================================================================
// Section 4: Helpers
// =============================================================================

function logResult(r: ValidationResult) {
  const icon = r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⏭️';
  console.log(`  ${icon} [Stage ${r.stage}] ${r.endpoint} (${r.durationMs}ms)`);
  console.log(`     ${r.message}`);
}

function buildReport(
  url: string, startTime: number, results: ValidationResult[],
): PipelineReport {
  return {
    voiceServiceUrl: url,
    timestamp: new Date().toISOString(),
    totalDurationMs: Date.now() - startTime,
    results,
    summary: {
      total: results.length,
      passed: results.filter(r => r.status === 'pass').length,
      failed: results.filter(r => r.status === 'fail').length,
      skipped: results.filter(r => r.status === 'skip').length,
    },
  };
}


// =============================================================================
// Section 5: CLI Entry Point
// =============================================================================

if (typeof process !== 'undefined' && process.argv[1]?.includes('pipeline-validator')) {
  const url = process.env.VOICE_SERVICE_URL ?? 'http://localhost:8100';
  runPipelineValidation(url).then(report => {
    if (report.summary.failed > 0) {
      process.exit(1);
    }
  });
}
