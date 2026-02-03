'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Building, MapPin, Users, BookOpen, ArrowRight, CheckCircle } from 'lucide-react';

export default function NewMicroSchoolPage() {
  const [step, setStep] = useState(1);

  const steps = [
    { number: 1, title: 'Basic Info', icon: Building },
    { number: 2, title: 'Location', icon: MapPin },
    { number: 3, title: 'Programs', icon: BookOpen },
    { number: 4, title: 'Review', icon: CheckCircle },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Micro-School</h1>
        <p className="text-muted-foreground">Set up your learning community</p>
      </div>

      <div className="flex items-center justify-between mb-8">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  s.number <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs mt-1 text-muted-foreground">{s.title}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-2 ${s.number < step ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Tell us about your micro-school</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">School Name</label>
              <Input placeholder="e.g., Sunshine Learning Hub" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Tagline</label>
              <Input placeholder="e.g., Where curiosity meets excellence" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea placeholder="Describe your micro-school's philosophy and approach..." className="mt-1" />
            </div>
            <Button onClick={() => setStep(2)} className="w-full">
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
            <CardDescription>Where will learning happen?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Address</label>
              <Input placeholder="Street address" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">City</label>
                <Input placeholder="City" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Postcode</label>
                <Input placeholder="Postcode" className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Learning Environment</label>
              <select className="w-full mt-1 px-3 py-2 border rounded-md bg-background">
                <option>Home-based</option>
                <option>Dedicated facility</option>
                <option>Shared space</option>
                <option>Hybrid</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} className="flex-1">
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Programs</CardTitle>
            <CardDescription>What will you offer?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Age Groups</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {['Early Years (3-5)', 'Primary (6-11)', 'Middle (12-14)', 'Senior (15-18)'].map((age) => (
                  <label key={age} className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">{age}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Maximum Capacity</label>
              <Input type="number" placeholder="e.g., 20" className="mt-1" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={() => setStep(4)} className="flex-1">
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Ready to Launch</CardTitle>
            <CardDescription>Review and create your micro-school</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Your micro-school will be created with a customizable website, student management tools,
                and curriculum integration. You can adjust all settings after creation.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
              <Button className="flex-1">
                <CheckCircle className="mr-2 h-4 w-4" />
                Create Micro-School
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
