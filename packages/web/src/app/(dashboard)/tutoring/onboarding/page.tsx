'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  User,
  Palette,
  Calendar,
  Globe,
  CreditCard,
  FileText,
  Rocket,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Sparkles,
  Clock,
  MapPin,
  Plus,
  Trash2,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

// =============================================================================
// Types (mirroring backend)
// =============================================================================

type OnboardingStepName = 'IDENTITY' | 'BRANDING' | 'CALENDAR' | 'DOMAIN' | 'PAYMENTS' | 'PROFILE' | 'GO_LIVE';

interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface ThemeConfig {
  primaryColour: string;
  accentColour: string;
  logoUrl?: string;
}

type DomainChoice = 'subdomain_only' | 'purchase_new' | 'transfer_existing' | 'point_existing';

const STEPS: { key: OnboardingStepName; label: string; icon: typeof User; description: string }[] = [
  { key: 'IDENTITY', label: 'Identity', icon: User, description: 'Create your tutor account' },
  { key: 'BRANDING', label: 'Branding', icon: Palette, description: 'Set up your brand' },
  { key: 'CALENDAR', label: 'Calendar', icon: Calendar, description: 'Configure availability' },
  { key: 'DOMAIN', label: 'Domain', icon: Globe, description: 'Set up your web address' },
  { key: 'PAYMENTS', label: 'Payments', icon: CreditCard, description: 'Connect Stripe' },
  { key: 'PROFILE', label: 'Profile', icon: FileText, description: 'Build your profile' },
  { key: 'GO_LIVE', label: 'Go Live', icon: Rocket, description: 'Launch your site' },
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SUBJECTS = [
  'Mathematics', 'English', 'Science', 'Physics', 'Chemistry', 'Biology',
  'French', 'Spanish', 'German', 'Japanese', 'Music', 'Art', 'History',
  'Geography', 'Computer Science', 'Economics', 'Business Studies',
];

// =============================================================================
// Page Component
// =============================================================================

export default function TutorOnboardingPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Step 1: Identity
  const [displayName, setDisplayName] = useState(user?.displayName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim());
  const [email, setEmail] = useState(user?.email || '');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [location, setLocation] = useState('');

  // Step 2: Branding
  const [businessName, setBusinessName] = useState('');
  const [theme, setTheme] = useState<ThemeConfig>({ primaryColour: '#2563EB', accentColour: '#F59E0B' });
  const [subdomain, setSubdomain] = useState('');

  // Step 3: Calendar
  const [slots, setSlots] = useState<AvailabilitySlot[]>([
    { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
  ]);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Step 4: Domain
  const [domainChoice, setDomainChoice] = useState<DomainChoice>('subdomain_only');
  const [customDomain, setCustomDomain] = useState('');

  // Step 5: Payments
  const [skipPayments, setSkipPayments] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<string>('not_started');

  // Step 6: Profile
  const [bio, setBio] = useState('');
  const [suggestedBio, setSuggestedBio] = useState('');
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);
  const [profileAnswers, setProfileAnswers] = useState<Record<string, string>>({
    teaching_philosophy: '',
    experience: '',
    fun_fact: '',
  });

  // Step 7: Go Live
  const [confirmed, setConfirmed] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState('');

  // Step completion tracking
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  // Try to resume existing session
  useEffect(() => {
    if (user?.id) {
      // In a real implementation, this would call api to check for existing session
      // For now, we start fresh
    }
  }, [user?.id]);

  const markStepComplete = useCallback((step: number) => {
    setCompletedSteps(prev => new Set([...prev, step]));
  }, []);

  const handleNext = useCallback(async () => {
    setIsLoading(true);
    try {
      // Validate current step
      switch (currentStep) {
        case 0: // Identity
          if (!displayName.trim() || !email.trim() || subjects.length === 0) {
            toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' });
            return;
          }
          break;
        case 1: // Branding
          if (!businessName.trim()) {
            toast({ title: 'Missing business name', description: 'Please enter a business name.', variant: 'destructive' });
            return;
          }
          break;
        case 2: // Calendar
          if (slots.length === 0) {
            toast({ title: 'No availability', description: 'Please add at least one availability slot.', variant: 'destructive' });
            return;
          }
          break;
      }

      markStepComplete(currentStep);

      if (currentStep < STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentStep, displayName, email, subjects, businessName, slots, markStepComplete]);

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const handleGoLive = async () => {
    if (!confirmed) {
      toast({ title: 'Please confirm', description: 'Review the checklist and confirm to go live.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const url = subdomain ? `https://${subdomain}.scholar.ly` : 'https://scholar.ly/your-profile';
      setPublishedUrl(url);
      markStepComplete(6);
      toast({ title: 'Congratulations!', description: 'Your tutor profile is now live!' });
    } finally {
      setIsLoading(false);
    }
  };

  const generateBio = async () => {
    setIsGeneratingBio(true);
    try {
      // Simulate AI bio generation (would call backend in production)
      await new Promise(r => setTimeout(r, 1500));
      const generated = `${displayName} is a dedicated ${subjects.join(' and ')} tutor based in ${location || 'Australia'}. ${profileAnswers.teaching_philosophy ? `Their teaching philosophy centres on ${profileAnswers.teaching_philosophy.toLowerCase()}.` : ''} ${profileAnswers.experience ? `With ${profileAnswers.experience}, they bring real expertise to every session.` : ''} ${profileAnswers.fun_fact ? `Fun fact: ${profileAnswers.fun_fact}` : ''}`.trim();
      setSuggestedBio(generated);
      setBio(generated);
    } finally {
      setIsGeneratingBio(false);
    }
  };

  const addSlot = () => {
    setSlots(prev => [...prev, { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }]);
  };

  const removeSlot = (index: number) => {
    setSlots(prev => prev.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: keyof AvailabilitySlot, value: string | number) => {
    setSlots(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const toggleSubject = (subject: string) => {
    setSubjects(prev =>
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    );
  };

  // Auto-generate subdomain from business name
  useEffect(() => {
    if (businessName) {
      setSubdomain(businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    }
  }, [businessName]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Tutor Onboarding</h1>
        <p className="text-muted-foreground mt-1">Set up your professional tutoring profile in 7 easy steps</p>
      </div>

      {/* Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span>Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].label}</span>
          <span className="text-muted-foreground">{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />

        {/* Step indicators */}
        <div className="flex items-center justify-between">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isComplete = completedSteps.has(i);
            const isCurrent = i === currentStep;
            return (
              <button
                key={step.key}
                onClick={() => i <= Math.max(currentStep, ...Array.from(completedSteps)) && setCurrentStep(i)}
                className={`flex flex-col items-center gap-1 text-xs transition-colors ${
                  isCurrent ? 'text-primary font-medium' : isComplete ? 'text-primary/70' : 'text-muted-foreground'
                }`}
              >
                <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                  isCurrent ? 'border-primary bg-primary text-primary-foreground' :
                  isComplete ? 'border-primary bg-primary/10' : 'border-muted'
                }`}>
                  {isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className="hidden sm:block">{step.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => { const Icon = STEPS[currentStep].icon; return <Icon className="h-5 w-5" />; })()}
            {STEPS[currentStep].label}
          </CardTitle>
          <CardDescription>{STEPS[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Step 1: Identity */}
          {currentStep === 0 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Full Name *</Label>
                  <Input id="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Jane Smith" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="location" className="pl-9" value={location} onChange={e => setLocation(e.target.value)} placeholder="Sydney, NSW" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Subjects You Teach *</Label>
                <div className="flex flex-wrap gap-2">
                  {SUBJECTS.map(s => (
                    <Badge
                      key={s}
                      variant={subjects.includes(s) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleSubject(s)}
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Step 2: Branding */}
          {currentStep === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name *</Label>
                <Input id="businessName" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g., Jane's Math Tutoring" />
                <p className="text-xs text-muted-foreground">This will appear on your website and booking pages</p>
              </div>
              <div className="space-y-2">
                <Label>Your URL</Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">https://</span>
                  <span className="text-primary font-medium">{subdomain || 'your-name'}</span>
                  <span className="text-muted-foreground">.scholar.ly</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColour">Primary Colour</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" id="primaryColour" value={theme.primaryColour} onChange={e => setTheme(t => ({ ...t, primaryColour: e.target.value }))} className="h-10 w-10 rounded border cursor-pointer" />
                    <Input value={theme.primaryColour} onChange={e => setTheme(t => ({ ...t, primaryColour: e.target.value }))} className="font-mono" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accentColour">Accent Colour</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" id="accentColour" value={theme.accentColour} onChange={e => setTheme(t => ({ ...t, accentColour: e.target.value }))} className="h-10 w-10 rounded border cursor-pointer" />
                    <Input value={theme.accentColour} onChange={e => setTheme(t => ({ ...t, accentColour: e.target.value }))} className="font-mono" />
                  </div>
                </div>
              </div>
              {/* Preview */}
              <div className="rounded-lg border overflow-hidden">
                <div className="h-2" style={{ background: `linear-gradient(to right, ${theme.primaryColour}, ${theme.accentColour})` }} />
                <div className="p-6 text-center">
                  <h3 className="text-lg font-bold" style={{ color: theme.primaryColour }}>{businessName || 'Your Business'}</h3>
                  <p className="text-sm text-muted-foreground mt-1">Professional tutoring in {subjects.join(', ') || 'your subjects'}</p>
                  <Button className="mt-4" style={{ backgroundColor: theme.primaryColour }}>Book a Session</Button>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Calendar */}
          {currentStep === 2 && (
            <>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{timezone}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Availability Slots</Label>
                  <Button variant="outline" size="sm" onClick={addSlot}>
                    <Plus className="h-4 w-4 mr-1" /> Add Slot
                  </Button>
                </div>
                {slots.map((slot, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Select value={String(slot.dayOfWeek)} onValueChange={v => updateSlot(i, 'dayOfWeek', parseInt(v))}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map((d, di) => (
                          <SelectItem key={di} value={String(di)}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input type="time" value={slot.startTime} onChange={e => updateSlot(i, 'startTime', e.target.value)} className="w-32" />
                    <span className="text-muted-foreground">to</span>
                    <Input type="time" value={slot.endTime} onChange={e => updateSlot(i, 'endTime', e.target.value)} className="w-32" />
                    <Button variant="ghost" size="icon" onClick={() => removeSlot(i)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                You can always adjust your availability later from the Availability page.
              </p>
            </>
          )}

          {/* Step 4: Domain */}
          {currentStep === 3 && (
            <>
              <div className="space-y-4">
                {[
                  { value: 'subdomain_only' as DomainChoice, label: 'Use Scholarly subdomain', desc: `${subdomain || 'your-name'}.scholar.ly — free, always available` },
                  { value: 'purchase_new' as DomainChoice, label: 'Purchase a new domain', desc: 'Buy a custom domain through us (from $14.99/yr)' },
                  { value: 'transfer_existing' as DomainChoice, label: 'Transfer an existing domain', desc: 'Move your domain to our management' },
                  { value: 'point_existing' as DomainChoice, label: 'Point an existing domain', desc: 'Keep your registrar, point DNS to us' },
                ].map(opt => (
                  <div
                    key={opt.value}
                    onClick={() => setDomainChoice(opt.value)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      domainChoice === opt.value ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-4 w-4 rounded-full border-2 ${domainChoice === opt.value ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                        {domainChoice === opt.value && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div>
                        <p className="font-medium">{opt.label}</p>
                        <p className="text-sm text-muted-foreground">{opt.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {domainChoice !== 'subdomain_only' && (
                <div className="space-y-2">
                  <Label htmlFor="customDomain">Domain Name</Label>
                  <Input id="customDomain" value={customDomain} onChange={e => setCustomDomain(e.target.value)} placeholder="e.g., janetutoring.com.au" />
                </div>
              )}
            </>
          )}

          {/* Step 5: Payments */}
          {currentStep === 4 && (
            <>
              <div className="p-6 border rounded-lg text-center space-y-4">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="font-semibold text-lg">Connect Stripe</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Accept payments from students securely through Stripe. Funds go directly to your bank account.
                  </p>
                </div>
                {stripeStatus === 'not_started' ? (
                  <div className="space-y-3">
                    <Button size="lg" onClick={() => {
                      setStripeStatus('pending');
                      toast({ title: 'Stripe Connect', description: 'Opening Stripe onboarding...' });
                    }}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Connect with Stripe
                    </Button>
                    <div className="flex items-center gap-2 justify-center">
                      <Checkbox id="skipPayments" checked={skipPayments} onCheckedChange={(c) => setSkipPayments(!!c)} />
                      <Label htmlFor="skipPayments" className="text-sm text-muted-foreground cursor-pointer">
                        Skip for now — I'll set this up later
                      </Label>
                    </div>
                  </div>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Stripe onboarding pending
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Stripe charges 1.75% + $0.30 per transaction.</p>
                <p>Scholarly takes 0% platform fee during the free tier.</p>
              </div>
            </>
          )}

          {/* Step 6: Profile */}
          {currentStep === 5 && (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>What's your teaching philosophy?</Label>
                  <Textarea
                    value={profileAnswers.teaching_philosophy}
                    onChange={e => setProfileAnswers(p => ({ ...p, teaching_philosophy: e.target.value }))}
                    placeholder="e.g., I believe every student learns differently..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Describe your experience</Label>
                  <Textarea
                    value={profileAnswers.experience}
                    onChange={e => setProfileAnswers(p => ({ ...p, experience: e.target.value }))}
                    placeholder="e.g., 5 years of private tutoring, former high school teacher..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fun fact about you</Label>
                  <Input
                    value={profileAnswers.fun_fact}
                    onChange={e => setProfileAnswers(p => ({ ...p, fun_fact: e.target.value }))}
                    placeholder="e.g., I can solve a Rubik's cube in under 2 minutes"
                  />
                </div>
              </div>

              <Button variant="outline" onClick={generateBio} disabled={isGeneratingBio}>
                {isGeneratingBio ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate Bio with AI
              </Button>

              <div className="space-y-2">
                <Label>Your Bio</Label>
                <Textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Your professional bio will appear on your tutor profile..."
                  rows={4}
                />
                {suggestedBio && bio !== suggestedBio && (
                  <Button variant="ghost" size="sm" onClick={() => setBio(suggestedBio)}>
                    Restore AI suggestion
                  </Button>
                )}
              </div>
            </>
          )}

          {/* Step 7: Go Live */}
          {currentStep === 6 && (
            <>
              {publishedUrl ? (
                <div className="text-center space-y-4 py-8">
                  <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                    <Rocket className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold">You're Live!</h3>
                  <p className="text-muted-foreground">Your professional tutoring profile is now available at:</p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="bg-muted px-4 py-2 rounded-lg text-primary font-mono">{publishedUrl}</code>
                    <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(publishedUrl); toast({ title: 'Copied!' }); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-3 justify-center pt-4">
                    <Button onClick={() => router.push('/tutoring')}>
                      Go to Dashboard
                    </Button>
                    <Button variant="outline" onClick={() => window.open(publishedUrl, '_blank')}>
                      <ExternalLink className="h-4 w-4 mr-2" /> View Site
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <h3 className="font-semibold">Review your setup</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground">Business Name</p>
                        <p className="font-medium">{businessName || 'Not set'}</p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground">Subjects</p>
                        <p className="font-medium">{subjects.join(', ') || 'None'}</p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground">Availability</p>
                        <p className="font-medium">{slots.length} slot{slots.length !== 1 ? 's' : ''} configured</p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground">Domain</p>
                        <p className="font-medium">{domainChoice === 'subdomain_only' ? `${subdomain}.scholar.ly` : customDomain || 'Not set'}</p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground">Payments</p>
                        <p className="font-medium">{skipPayments ? 'Skipped' : stripeStatus === 'not_started' ? 'Not connected' : 'Pending'}</p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground">Profile</p>
                        <p className="font-medium">{bio ? 'Complete' : 'Incomplete'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-4 border rounded-lg">
                    <Checkbox id="confirm" checked={confirmed} onCheckedChange={c => setConfirmed(!!c)} />
                    <Label htmlFor="confirm" className="cursor-pointer">
                      I've reviewed my setup and I'm ready to go live
                    </Label>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      {!publishedUrl && (
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          {currentStep === 6 ? (
            <Button onClick={handleGoLive} disabled={isLoading || !confirmed}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Rocket className="h-4 w-4 mr-2" />}
              Go Live
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
