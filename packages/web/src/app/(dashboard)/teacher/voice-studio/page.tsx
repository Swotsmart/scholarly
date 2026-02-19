'use client';

import { PageHeader } from '@/components/shared';

export default function VoiceStudioPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Voice Studio"
        description="Text-to-speech synthesis, audio processing, and phonics narration tools"
      />
      <p>Minimal test — if you can see this, the route works.</p>
    </div>
  );
}
