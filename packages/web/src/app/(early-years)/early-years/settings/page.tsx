'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Settings, Bell, Shield, Palette, Volume2 } from 'lucide-react';

export default function EarlyYearsSettingsPage() {
  const settings = [
    { id: 'sounds', label: 'Sound Effects', description: 'Play sounds during activities', icon: Volume2, enabled: true },
    { id: 'notifications', label: 'Parent Notifications', description: 'Send activity updates to parents', icon: Bell, enabled: true },
    { id: 'safety', label: 'Enhanced Safety Mode', description: 'Extra content filtering for young learners', icon: Shield, enabled: true },
    { id: 'theme', label: 'Colorful Theme', description: 'Use bright, engaging colors', icon: Palette, enabled: true },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Little Explorers Settings</h1>
        <p className="text-muted-foreground">Customize the early years learning experience</p>
      </div>

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
                <Switch defaultChecked={setting.enabled} />
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
