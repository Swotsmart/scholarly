'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Settings, Bell, Shield, Palette, Volume2, Play, Check, Mic } from 'lucide-react';
import { useEarlyYearsStore } from '@/stores/early-years-store';
import { usePhonicsAudio, type VoicePersona } from '@/hooks/use-phonics-audio';
import { cn } from '@/lib/utils';

const VOICE_PERSONAS: { id: VoicePersona; name: string; description: string; emoji: string }[] = [
  { id: 'pip', name: 'Playful Pip', description: 'Warm, playful child voice (ages 3-5)', emoji: '🐣' },
  { id: 'sarah', name: 'Storytime Sarah', description: 'Gentle, clear narrator voice', emoji: '📖' },
  { id: 'alex', name: 'Adventure Alex', description: 'Energetic, encouraging voice', emoji: '🚀' },
  { id: 'willow', name: 'Wise Willow', description: 'Calm, soothing mentor voice', emoji: '🌳' },
];

export default function EarlyYearsSettingsPage() {
  const { voicePersona, audioEnabled, setVoicePersona, setAudioEnabled } = useEarlyYearsStore();
  const { speak, isTTSAvailable } = usePhonicsAudio();
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  const handlePreviewVoice = async (persona: VoicePersona) => {
    setPreviewingVoice(persona);
    // Temporarily speak with the selected persona
    await speak(`Hi! I'm your reading friend. Let's learn together!`);
    setPreviewingVoice(null);
  };

  const settings = [
    { id: 'sounds', label: 'Sound Effects', description: 'Play sounds during activities', icon: Volume2, enabled: audioEnabled, onToggle: setAudioEnabled },
    { id: 'notifications', label: 'Parent Notifications', description: 'Send activity updates to parents', icon: Bell, enabled: true, onToggle: () => {} },
    { id: 'safety', label: 'Enhanced Safety Mode', description: 'Extra content filtering for young learners', icon: Shield, enabled: true, onToggle: () => {} },
    { id: 'theme', label: 'Colorful Theme', description: 'Use bright, engaging colors', icon: Palette, enabled: true, onToggle: () => {} },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-purple-50 to-pink-100 max-w-2xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Little Explorers Settings</h1>
        <p className="text-muted-foreground">Customize the early years learning experience</p>
      </div>

      {/* Narrator Voice Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Narrator Voice
          </CardTitle>
          <CardDescription>
            Choose who reads aloud during activities
            {!isTTSAvailable && (
              <span className="block mt-1 text-amber-600 text-xs">
                Voice service unavailable — using browser voice as fallback
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {VOICE_PERSONAS.map((persona) => {
            const isSelected = voicePersona === persona.id;
            const isPreviewing = previewingVoice === persona.id;

            return (
              <button
                key={persona.id}
                onClick={() => setVoicePersona(persona.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                  isSelected
                    ? 'border-purple-400 bg-purple-50'
                    : 'border-transparent bg-white hover:border-gray-200 hover:bg-gray-50'
                )}
              >
                <span className="text-2xl shrink-0">{persona.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800">{persona.name}</p>
                    {isSelected && (
                      <span className="flex items-center gap-0.5 text-xs font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                        <Check className="h-3 w-3" />
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{persona.description}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreviewVoice(persona.id);
                  }}
                  disabled={isPreviewing}
                  className={cn(
                    'shrink-0 flex items-center justify-center w-10 h-10 rounded-full transition-colors',
                    isPreviewing
                      ? 'bg-purple-200 text-purple-600 animate-pulse'
                      : 'bg-gray-100 text-gray-500 hover:bg-purple-100 hover:text-purple-600'
                  )}
                  aria-label={`Preview ${persona.name} voice`}
                >
                  <Play className="h-4 w-4" />
                </button>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Preferences
          </CardTitle>
          <CardDescription>Adjust settings for young learners</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {settings.map((setting) => {
            const Icon = setting.icon;
            return (
              <div key={setting.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{setting.label}</p>
                    <p className="text-sm text-muted-foreground">{setting.description}</p>
                  </div>
                </div>
                <Switch
                  checked={setting.enabled}
                  onCheckedChange={(checked) => setting.onToggle(checked)}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Learning Pace</CardTitle>
          <CardDescription>Adjust how activities are presented</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {['Gentle', 'Balanced', 'Active'].map((pace) => (
              <Button key={pace} variant={pace === 'Balanced' ? 'default' : 'outline'} className="w-full">
                {pace}
              </Button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Balanced pace recommended for most children aged 3-6
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
