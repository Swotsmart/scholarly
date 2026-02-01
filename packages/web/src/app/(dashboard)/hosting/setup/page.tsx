'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Globe,
  Building2,
  GraduationCap,
  Briefcase,
  Home,
  BookOpen,
  Users,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Mail,
  Phone,
  User,
  Palette,
  Sparkles,
  Bot,
  Search,
  Star,
  MessageSquare,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Provider types with icons
const PROVIDER_TYPES = [
  {
    id: 'school',
    label: 'School',
    description: 'Traditional K-12 school',
    icon: Building2,
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-600',
  },
  {
    id: 'micro_school',
    label: 'Micro-School',
    description: 'Small independent school (< 50 students)',
    icon: Home,
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-600',
  },
  {
    id: 'tutoring_centre',
    label: 'Tutoring Centre',
    description: 'Commercial tutoring business',
    icon: Building2,
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-600',
  },
  {
    id: 'solo_tutor',
    label: 'Solo Tutor',
    description: 'Independent tutor',
    icon: GraduationCap,
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-600',
  },
  {
    id: 'homeschool_coop',
    label: 'Homeschool Co-op',
    description: 'Homeschool cooperative',
    icon: Users,
    bgColor: 'bg-rose-500/10',
    textColor: 'text-rose-600',
  },
  {
    id: 'curriculum_provider',
    label: 'Curriculum Provider',
    description: 'Sells curriculum/resources',
    icon: BookOpen,
    bgColor: 'bg-indigo-500/10',
    textColor: 'text-indigo-600',
  },
  {
    id: 'enrichment',
    label: 'Enrichment Program',
    description: 'After-school programs, camps',
    icon: Sparkles,
    bgColor: 'bg-pink-500/10',
    textColor: 'text-pink-600',
  },
  {
    id: 'online_academy',
    label: 'Online Academy',
    description: 'Fully online provider',
    icon: Globe,
    bgColor: 'bg-cyan-500/10',
    textColor: 'text-cyan-600',
  },
];

const STEPS = [
  { id: 1, label: 'Type', description: 'Provider type' },
  { id: 2, label: 'Details', description: 'Basic information' },
  { id: 3, label: 'Location', description: 'Address & contact' },
  { id: 4, label: 'Review', description: 'Confirm & launch' },
];

const AUSTRALIAN_STATES = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'ACT', label: 'Australian Capital Territory' },
  { value: 'NT', label: 'Northern Territory' },
];

export default function HostingSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Provider Type
  const [providerType, setProviderType] = useState('');

  // Step 2: Basic Details
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [tagline, setTagline] = useState('');
  const [subdomain, setSubdomain] = useState('');

  // Step 3: Location & Contact
  const [locationName, setLocationName] = useState('Main Campus');
  const [streetAddress, setStreetAddress] = useState('');
  const [suburb, setSuburb] = useState('');
  const [state, setState] = useState('');
  const [postcode, setPostcode] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Generate subdomain from display name
  const suggestedSubdomain = useMemo(() => {
    return displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 63);
  }, [displayName]);

  const canProceed = useMemo(() => {
    switch (step) {
      case 1:
        return !!providerType;
      case 2:
        return displayName.trim().length >= 3 && description.trim().length >= 20;
      case 3:
        return (
          contactName.trim() !== '' &&
          contactRole.trim() !== '' &&
          contactEmail.trim() !== '' &&
          contactEmail.includes('@')
        );
      case 4:
        return true;
      default:
        return false;
    }
  }, [step, providerType, displayName, description, contactName, contactRole, contactEmail]);

  const handleNext = async () => {
    if (step < 4) {
      if (step === 2 && !subdomain) {
        setSubdomain(suggestedSubdomain);
      }
      setStep(step + 1);
    } else {
      // Submit
      setIsLoading(true);

      try {
        const response = await fetch('/api/v1/hosting/providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: providerType,
            displayName,
            description,
            tagline: tagline || undefined,
            subdomain: subdomain || suggestedSubdomain,
            location: streetAddress ? {
              name: locationName,
              address: {
                streetAddress,
                addressLocality: suburb,
                addressRegion: state,
                postalCode: postcode,
                addressCountry: 'AU',
              },
            } : undefined,
            contact: {
              name: contactName,
              role: contactRole,
              email: contactEmail,
              phone: contactPhone || undefined,
            },
          }),
        });

        if (response.ok) {
          toast({
            title: 'Web hosting enabled!',
            description: 'Your provider profile has been created. Complete setup in your hosting dashboard.',
          });
          router.push('/hosting');
        } else {
          const error = await response.json();
          toast({
            title: 'Setup failed',
            description: error.message || 'Please try again',
            variant: 'destructive',
          });
        }
      } catch {
        toast({
          title: 'Setup failed',
          description: 'An unexpected error occurred. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const selectedType = PROVIDER_TYPES.find((t) => t.id === providerType);

  return (
    <div className="container max-w-3xl py-8">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s, idx) => (
            <div key={s.id} className={`flex items-center ${idx < STEPS.length - 1 ? 'flex-1' : ''}`}>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  step > s.id
                    ? 'bg-primary text-primary-foreground'
                    : step === s.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step > s.id ? <Check className="h-5 w-5" /> : s.id}
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`mx-3 h-1 flex-1 rounded-full transition-colors ${
                    step > s.id ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm">
          {STEPS.map((s) => (
            <span key={s.id} className={step === s.id ? 'text-primary font-medium' : 'text-muted-foreground'}>
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {step === 1 && 'What type of provider are you?'}
            {step === 2 && 'Tell us about your organization'}
            {step === 3 && 'Location & Contact Details'}
            {step === 4 && 'Review & Launch'}
          </CardTitle>
          <CardDescription>
            {step === 1 && 'Select the option that best describes your educational service'}
            {step === 2 && 'This information will appear on your public website'}
            {step === 3 && 'Help parents and students find and contact you'}
            {step === 4 && 'Review your information before launching your website'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Provider Type */}
          {step === 1 && (
            <div className="grid gap-3 md:grid-cols-2">
              {PROVIDER_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setProviderType(type.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      providerType === type.id
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`rounded-lg ${type.bgColor} p-2`}>
                        <Icon className={`h-5 w-5 ${type.textColor}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{type.label}</p>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                      {providerType === type.id && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 2: Basic Details */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Organization Name *</Label>
                <Input
                  id="displayName"
                  placeholder="e.g., Riverside Learning Academy"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline (optional)</Label>
                <Input
                  id="tagline"
                  placeholder="e.g., Where curiosity leads learning"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <textarea
                  id="description"
                  className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Describe your organization, teaching philosophy, and what makes you unique..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {description.length}/2000 characters (minimum 20)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subdomain">Website Address</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="subdomain"
                    placeholder={suggestedSubdomain || 'your-name'}
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">.scholar.ly</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  You can add a custom domain later
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Location & Contact */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location (optional)
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="streetAddress">Street Address</Label>
                    <Input
                      id="streetAddress"
                      placeholder="123 Education Street"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="suburb">Suburb</Label>
                    <Input
                      id="suburb"
                      placeholder="Brisbane"
                      value={suburb}
                      onChange={(e) => setSuburb(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Select value={state} onValueChange={setState}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {AUSTRALIAN_STATES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postcode">Postcode</Label>
                    <Input
                      id="postcode"
                      placeholder="4000"
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Primary Contact *
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Name *</Label>
                    <Input
                      id="contactName"
                      placeholder="Sarah Mitchell"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactRole">Role *</Label>
                    <Input
                      id="contactRole"
                      placeholder="Principal"
                      value={contactRole}
                      onChange={(e) => setContactRole(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Email *</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      placeholder="contact@example.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Phone (optional)</Label>
                    <Input
                      id="contactPhone"
                      type="tel"
                      placeholder="+61 400 123 456"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="rounded-lg border p-6 space-y-4">
                <div className="flex items-start gap-4">
                  {selectedType && (
                    <div className={`rounded-lg ${selectedType.bgColor} p-3`}>
                      <selectedType.icon className={`h-6 w-6 ${selectedType.textColor}`} />
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-semibold">{displayName}</h3>
                    {tagline && <p className="text-muted-foreground">{tagline}</p>}
                    <Badge variant="secondary" className="mt-2">
                      {selectedType?.label}
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">{description}</p>

                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-primary">
                    {subdomain || suggestedSubdomain}.scholar.ly
                  </span>
                </div>

                {streetAddress && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>
                      {streetAddress}, {suburb} {state} {postcode}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{contactEmail}</span>
                </div>
              </div>

              {/* AI Features Highlight */}
              <div className="rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-6">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <Bot className="h-5 w-5 text-blue-600" />
                  AI-Powered Discovery
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Once your website is live, you&apos;ll be discoverable by AI assistants helping parents find the right educational fit.
                </p>
                <div className="grid gap-3 md:grid-cols-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-blue-600" />
                    <span>AI Search</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    <span>Quality Ranking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-green-600" />
                    <span>Smart Enquiries</span>
                  </div>
                </div>
              </div>

              {/* Next Steps */}
              <div className="rounded-lg bg-muted/50 p-4">
                <h4 className="font-medium mb-2">After launch, you can:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Add your logo and customize your theme colors</li>
                  <li>• Create offerings (courses, programs, packages)</li>
                  <li>• Add a custom domain</li>
                  <li>• Submit verification documents for quality badges</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-3">
          {step > 1 && (
            <Button variant="outline" onClick={handleBack} disabled={isLoading}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
          <Button onClick={handleNext} disabled={!canProceed || isLoading} className="flex-1">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating your website...
              </>
            ) : step === 4 ? (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Launch My Website
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
