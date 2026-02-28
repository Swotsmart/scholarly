# Chekd Unified Communications 3.3

A pluggable, event-driven unified communications platform that provides video conferencing, team chat, telephony, collaborative whiteboard, cloud file sharing, AI transcription, scheduling, notifications, search & archive, analytics, compliance, and **AI-powered webinars** as composable plugins.

## What Changed from v1.0

| Aspect | v1.0 (Video Service) | v3.3 (Unified Communications) |
|--------|---------------------|-------------------------------|
| Scope | Video only (2,426 lines) | 12 plugins (10,700+ lines) |
| Architecture | Monolithic Express server | Plugin-based with EventBus |
| Integration | Hardcoded Chekd Lawyer Toolkit | Pluggable into any host app |
| Communication | Direct function calls | Event-driven bus (pub/sub) |
| Storage | In-memory only | StorageAdapter + Write-Behind Cache |
| Capabilities | Video, screen share, recording | + Chat, Telephony, Whiteboard, Cloud Files, AI Transcription, Scheduling, Notifications, Search, Analytics, Compliance, **Webinar** |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Host Application                      │
│            (Plutus OS, Chekd Toolkit, etc.)             │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│           UnifiedCommsPlatform (core)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  │
│  │  EventBus   │  │ PluginMgr   │  │ StorageAdapter │  │
│  │  (pub/sub)  │  │ (lifecycle) │  │  (persistence) │  │
│  └──────┬──────┘  └──────┬──────┘  └───────┬────────┘  │
│         │                │                  │           │
│  ┌──────▼──────────────────────────────────▼──────┐    │
│  │              Plugin Interface                    │    │
│  │  initialize() · getRoutes() · handleWS()        │    │
│  │  shutdown() · healthCheck()                      │    │
│  └──┬──────┬──────┬──────┬──────┬──────┬─────┐    │
│     │      │      │      │      │      │     │    │
│  ┌──▼──┐┌──▼──┐┌──▼───┐┌──▼───┐┌──▼────┐┌─▼─┐│  │
│  │Video││Chat ││Telep.││Whit. ││CloudF.││...││  │
│  └─────┘└─────┘└──────┘└──────┘└───────┘└───┘│  │
│                                                    │
│  + AI Transcription · Scheduling · Notifications  │
│  + Search & Archive · Analytics · Compliance      │
│  + Webinar (AI co-pilot, HLS, write-behind)       │
└────────────────────────────────────────────────────┘
```

The EventBus is the central nervous system. Plugins never call each other directly — they publish events and subscribe to events. This means you can add, remove, or replace any plugin without breaking the others.

## Quick Start

### Minimal (Video Only)

```typescript
import { UnifiedCommsPlatform } from '@chekd/unified-communications';
import { VideoPlugin } from '@chekd/unified-communications/plugins/video';

const platform = new UnifiedCommsPlatform({ port: 3100 });
platform.register(new VideoPlugin());
await platform.start();
// → HTTP API at http://localhost:3100/api/video/
// → Health at http://localhost:3100/health
```

### Full Suite

```typescript
import { UnifiedCommsPlatform } from '@chekd/unified-communications';
import {
  VideoPlugin, ChatPlugin, TelephonyPlugin,
  WhiteboardPlugin, CloudFilesPlugin,
  AITranscriptionPlugin, NotificationsPlugin,
  SchedulingPlugin, SearchArchivePlugin,
  AnalyticsPlugin, CompliancePlugin,
  WebinarPlugin,
} from '@chekd/unified-communications/plugins';

const platform = new UnifiedCommsPlatform({
  port: 3100,
  wsPort: 3101,
  jwtSecret: process.env.JWT_SECRET!,
  plugins: {
    telephony: {
      twilioAccountSid: process.env.TWILIO_SID,
      twilioAuthToken: process.env.TWILIO_TOKEN,
    },
    'cloud-files': {
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      onedriveClientId: process.env.ONEDRIVE_CLIENT_ID,
    },
    webinar: {
      aiProvider: 'openai',
      openaiApiKey: process.env.OPENAI_API_KEY,
      publicBaseUrl: 'https://app.chekd.com.au',
    },
  },
});

platform
  .register(new VideoPlugin())
  .register(new ChatPlugin())              // depends on: video
  .register(new TelephonyPlugin())         // depends on: video
  .register(new WhiteboardPlugin())        // depends on: video
  .register(new CloudFilesPlugin())        // no dependencies
  .register(new AITranscriptionPlugin())   // depends on: video
  .register(new NotificationsPlugin())     // no dependencies
  .register(new SchedulingPlugin())        // depends on: video, notifications
  .register(new SearchArchivePlugin())     // depends on: chat
  .register(new AnalyticsPlugin())         // depends on: video
  .register(new CompliancePlugin())        // depends on: chat, cloud-files
  .register(new WebinarPlugin());          // depends on: video

await platform.start();
```

### Embed into Existing App (Plutus OS)

```typescript
import express from 'express';
import { UnifiedCommsPlatform } from '@chekd/unified-communications';
import { VideoPlugin, ChatPlugin } from '@chekd/unified-communications/plugins';

const app = express();
// ... your existing routes ...

const collab = new UnifiedCommsPlatform({ port: 3100 });
collab.register(new VideoPlugin());
collab.register(new ChatPlugin());

// Mount under /collab — routes become /collab/api/video/, /collab/api/chat/
collab.mountOnto(app, '/collab');
await collab.initialize();

app.listen(3000);
```

## Plugin System

### Writing a Custom Plugin

```typescript
import type { CollaborationPlugin, PluginContext, PluginHealth } from '@chekd/unified-communications';
import { Router } from 'express';

class AITranscriptionPlugin implements CollaborationPlugin {
  readonly id = 'ai-transcription';
  readonly name = 'AI Transcription';
  readonly version = '1.0.0';
  readonly dependencies = ['video'];  // needs recording events

  private ctx!: PluginContext;

  async initialize(ctx: PluginContext): Promise<void> {
    this.ctx = ctx;

    // Listen for recording completions from the Video plugin
    ctx.bus.on('room:recording-stopped', async (data) => {
      ctx.logger.info(`Transcribing recording: ${data.recordingUrl}`);
      const transcript = await this.transcribe(data.recordingUrl);
      ctx.bus.emit('transcription:completed', {
        recordingId: data.recordingId,
        transcript,
      });
    });
  }

  getRoutes(): Router {
    const r = Router();
    r.get('/transcriptions', (_req, res) => res.json([]));
    return r;
  }

  async shutdown(): Promise<void> {}
  async healthCheck(): Promise<PluginHealth> { return { status: 'healthy' }; }

  private async transcribe(url: string): Promise<string> {
    // Your AI transcription logic here
    return 'Transcribed text...';
  }
}
```

### Plugin Lifecycle

1. **register()** — Plugin is added to the manager
2. **Dependency resolution** — Topological sort ensures correct init order
3. **initialize()** — Plugin receives bus, config, logger, storage
4. **getRoutes()** — REST routes mounted at `/api/{pluginId}/`
5. **Running** — Plugin handles events and WebSocket messages
6. **shutdown()** — Graceful cleanup (reverse dependency order)

### The EventBus

The bus uses a domain:action naming convention:

```typescript
// Emit events
ctx.bus.emit('room:participant-joined', { roomId, userId, userName });

// Subscribe to specific events
ctx.bus.on('chat:message-sent', async (data) => { /* ... */ });

// Subscribe to all events in a domain
ctx.bus.onPattern('room:*', async (data) => { /* ... */ });

// Request-reply (cross-plugin queries)
const participants = await ctx.bus.request('video:get-room-participants', { roomId });
```

### StorageAdapter

Plugins persist data through an abstract storage interface. The host app provides the implementation:

```typescript
// Prisma adapter (for Plutus OS)
const storage: StorageAdapter = {
  async get(collection, key) { return prisma[collection].findUnique({ where: { id: key } }); },
  async set(collection, key, value) { return prisma[collection].upsert({ where: { id: key }, create: value, update: value }); },
  async query(collection, filter, opts) { return prisma[collection].findMany({ where: filter, take: opts?.limit }); },
  // ...
};

const platform = new UnifiedCommsPlatform({ storage });
```

## API Reference

### Platform Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Platform + all plugin health |
| GET | `/plugins` | Registered plugin metadata |
| GET | `/bus/subscriptions` | Event bus subscription map |
| GET | `/bus/history?limit=50` | Recent event history |

### Plugin Endpoints

Each plugin mounts at `/api/{pluginId}/`:

| Plugin | Prefix | Key Endpoints |
|--------|--------|---------------|
| Video | `/api/video/` | rooms, join-token, ice-servers, stats |
| Chat | `/api/chat/` | channels, messages, reactions, presence |
| Telephony | `/api/telephony/` | numbers, calls, voice (TwiML webhook) |
| Whiteboard | `/api/whiteboard/` | boards, strokes, elements |
| Cloud Files | `/api/cloud-files/` | connections, browse, share |
| AI Transcription | `/api/ai-transcription/` | transcriptions, segments |
| Notifications | `/api/notifications/` | templates, channels, send |
| Scheduling | `/api/scheduling/` | meetings, availability, recurring |
| Search & Archive | `/api/search-archive/` | search, index, archive |
| Analytics | `/api/analytics/` | events, dashboards, reports |
| Compliance | `/api/compliance/` | policies, holds, exports |
| Webinar | `/api/webinar/` | webinars, register, broadcast, Q&A, polls, chat, reactions, analytics |

The webinar plugin also mounts a public landing page route at `/webinar/:slug`.

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist/ ./dist/
EXPOSE 3100 3101
CMD ["node", "dist/index.js"]
```

### Azure Container Instance

```bash
az acr build --registry chekdacr --image unified-comms:3.0 .
az container create \
  --resource-group chekd-rg \
  --name unified-comms \
  --image chekdacr.azurecr.io/unified-comms:3.0 \
  --ports 3100 3101
```

## Migration from v1.0

The original Chekd Video Service (`src/index.ts`, `RoomManager`, `SignalingServer`, `MediasoupManager`) maps directly to the Video plugin. The WebSocket signaling protocol is unchanged — existing clients continue to work.

| v1.0 Module | v3.0 Location |
|-------------|---------------|
| `src/index.ts` | `UnifiedCommsPlatform.start()` |
| `src/rooms/RoomManager.ts` | `VideoPlugin` (internal) |
| `src/signaling/SignalingServer.ts` | `PluginManager.routeWebSocketMessage()` |
| `src/mediasoup/MediasoupManager.ts` | `VideoPlugin` (peer dep) |
| `src/recording/RecordingService.ts` | `VideoPlugin` (peer dep) |
| `src/api/routes.ts` | `VideoPlugin.getRoutes()` |

## License

Copyright (c) 2026 Chekd Pty Ltd. All rights reserved.
