/**
 * Chekd Unified Communications 3.3 — Standalone Server Entrypoint
 *
 * Registers all 12 plugins and starts on port 3100 (REST) / 3101 (WebSocket).
 *
 * Run: npx ts-node-dev server.ts
 * Or:  node dist/server.js (after build)
 */

import { UnifiedCommsPlatform } from './src';
import { VideoPlugin } from './src/plugins/video';
import { ChatPlugin } from './src/plugins/chat';
import { TelephonyPlugin } from './src/plugins/telephony';
import { WhiteboardPlugin } from './src/plugins/whiteboard';
import { CloudFilesPlugin } from './src/plugins/cloud-files';
import { AITranscriptionPlugin } from './src/plugins/ai-transcription';
import { SchedulingPlugin } from './src/plugins/scheduling';
import { SearchArchivePlugin } from './src/plugins/search-archive';
import { AnalyticsPlugin } from './src/plugins/analytics';
import { NotificationsPlugin } from './src/plugins/notifications';
import { CompliancePlugin } from './src/plugins/compliance';
import { WebinarPlugin } from './src/plugins/webinar';

const platform = new UnifiedCommsPlatform({
  port: parseInt(process.env.UC_PORT || '3100', 10),
  wsPort: parseInt(process.env.UC_WS_PORT || '3101', 10),
  jwtSecret: process.env.JWT_SECRET || 'chekd-uc-dev-secret',
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').filter(Boolean),
});

// Register all 12 plugins
platform.register(new VideoPlugin());
platform.register(new ChatPlugin());
platform.register(new TelephonyPlugin());
platform.register(new WhiteboardPlugin());
platform.register(new CloudFilesPlugin());
platform.register(new AITranscriptionPlugin());
platform.register(new SchedulingPlugin());
platform.register(new SearchArchivePlugin());
platform.register(new AnalyticsPlugin());
platform.register(new NotificationsPlugin());
platform.register(new CompliancePlugin());
platform.register(new WebinarPlugin());

platform.start().catch((err) => {
  console.error('Failed to start UC platform:', err);
  process.exit(1);
});
