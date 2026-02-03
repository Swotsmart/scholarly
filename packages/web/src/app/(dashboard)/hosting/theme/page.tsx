'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Palette, Type, Image, Layout } from 'lucide-react';

export default function HostingThemePage() {
  const colors = [
    { name: 'Primary', value: '#4F46E5', description: 'Main brand color' },
    { name: 'Secondary', value: '#10B981', description: 'Accent color' },
    { name: 'Background', value: '#FFFFFF', description: 'Page background' },
  ];

  const templates = [
    { id: 1, name: 'Modern', description: 'Clean and minimal design' },
    { id: 2, name: 'Playful', description: 'Colorful and engaging' },
    { id: 3, name: 'Classic', description: 'Traditional and professional' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Theme Customization</h1>
        <p className="text-muted-foreground">Personalize your micro-school&apos;s appearance</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Colors
            </CardTitle>
            <CardDescription>Customize your brand colors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {colors.map((color) => (
              <div key={color.name} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{color.name}</p>
                  <p className="text-sm text-muted-foreground">{color.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 rounded-lg border"
                    style={{ backgroundColor: color.value }}
                  />
                  <span className="text-sm font-mono">{color.value}</span>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full">Customize Colors</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layout className="h-5 w-5" />
              Templates
            </CardTitle>
            <CardDescription>Choose a base template</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="p-4 rounded-lg border cursor-pointer hover:border-primary transition-colors"
              >
                <p className="font-medium">{template.name}</p>
                <p className="text-sm text-muted-foreground">{template.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Logo & Images
            </CardTitle>
            <CardDescription>Upload your branding assets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Image className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Drop your logo here or click to upload</p>
              <Button variant="outline" size="sm" className="mt-2">Upload Logo</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="h-5 w-5" />
              Typography
            </CardTitle>
            <CardDescription>Select your fonts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Heading Font</label>
              <select className="w-full mt-1 px-3 py-2 border rounded-md bg-background">
                <option>Inter</option>
                <option>Poppins</option>
                <option>Playfair Display</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Body Font</label>
              <select className="w-full mt-1 px-3 py-2 border rounded-md bg-background">
                <option>Inter</option>
                <option>Open Sans</option>
                <option>Roboto</option>
              </select>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Preview</Button>
        <Button>Save Theme</Button>
      </div>
    </div>
  );
}
