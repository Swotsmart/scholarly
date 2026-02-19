'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api, {
  type VoiceCloneConsentResponse,
  type VoiceCloneProfileResponse,
  type VoiceCloneSampleInfo,
} from '@/lib/api';
import {
  Fingerprint, Shield, Upload, ChevronRight, ChevronLeft,
  Loader2, AlertCircle, Check, Trash2, RefreshCw, Mic,
} from 'lucide-react';

type Step = 'profiles-list' | 'consent' | 'create-profile' | 'upload-samples' | 'build';

const STATUS_STYLES: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  creating: { variant: 'secondary', label: 'Creating' },
  ready: { variant: 'default', label: 'Ready' },
  failed: { variant: 'destructive', label: 'Failed' },
  archived: { variant: 'outline', label: 'Archived' },
};

interface VoiceCloningTabProps {
  serviceStatus: 'checking' | 'online' | 'offline';
  setError: (error: string | null) => void;
  addJob: (type: 'narrate-book' | 'batch-variant' | 'clone-profile', detail: string) => string;
  updateJob: (id: string, updates: { status?: string; progress?: number; detail?: string; error?: string }) => void;
}

export function VoiceCloningTab({ serviceStatus, setError, addJob, updateJob }: VoiceCloningTabProps) {
  const [step, setStep] = useState<Step>('profiles-list');
  const [loading, setLoading] = useState(false);

  // Profiles list
  const [profiles, setProfiles] = useState<VoiceCloneProfileResponse[]>([]);

  // Consent form
  const [consentOwner, setConsentOwner] = useState('');
  const [consentPurpose, setConsentPurpose] = useState('');
  const [consentExpiry, setConsentExpiry] = useState('');
  const [consentId, setConsentId] = useState<string | null>(null);

  // Profile form
  const [profileName, setProfileName] = useState('');
  const [profileLanguage, setProfileLanguage] = useState('en-us');
  const [profileDescription, setProfileDescription] = useState('');
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);

  // Samples
  const [samples, setSamples] = useState<VoiceCloneSampleInfo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ valid: boolean; issues?: string[] } | null>(null);
  const [totalDurationMs, setTotalDurationMs] = useState(0);

  // Build
  const [building, setBuilding] = useState(false);
  const [buildResult, setBuildResult] = useState<{ status: string; quality_score: number; voice_id: string } | null>(null);

  useEffect(() => {
    if (step === 'profiles-list') loadProfiles();
  }, [step]);

  const loadProfiles = async () => {
    setLoading(true);
    const res = await api.voiceStudio.listProfiles();
    if (res.success) setProfiles(res.data.profiles);
    setLoading(false);
  };

  // ── Consent ──

  const handleCreateConsent = async () => {
    if (!consentOwner.trim() || !consentPurpose.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api.voiceStudio.createConsent({
        voice_owner_id: consentOwner,
        purpose: consentPurpose,
        granted_by: consentOwner,
        expires_at: consentExpiry || undefined,
      });
      if (!res.success) { setError(res.error || 'Consent creation failed'); return; }
      setConsentId(res.data.id);
      setStep('create-profile');
    } catch {
      setError('Failed to connect to voice service');
    } finally {
      setLoading(false);
    }
  };

  // ── Profile ──

  const handleCreateProfile = async () => {
    if (!profileName.trim() || !consentId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api.voiceStudio.createProfile({
        name: profileName,
        language: profileLanguage,
        consent_id: consentId,
        description: profileDescription || undefined,
      });
      if (!res.success) { setError(res.error || 'Profile creation failed'); return; }
      setActiveProfileId(res.data.id);
      setStep('upload-samples');
    } catch {
      setError('Failed to connect to voice service');
    } finally {
      setLoading(false);
    }
  };

  // ── Samples ──

  const handleUploadSample = async (file: File) => {
    if (!activeProfileId) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const res = await api.voiceStudio.uploadSample(activeProfileId, file);
      if (!res.success) { setError(res.error || 'Upload failed'); return; }
      setUploadResult({ valid: res.data.valid, issues: res.data.issues });
      if (res.data.valid && res.data.total_duration_ms) {
        setTotalDurationMs(res.data.total_duration_ms);
      }
      // Refresh sample list
      const samplesRes = await api.voiceStudio.listSamples(activeProfileId);
      if (samplesRes.success) {
        setSamples(samplesRes.data.samples);
        setTotalDurationMs(samplesRes.data.total_duration_ms);
      }
    } catch {
      setError('Failed to upload sample');
    } finally {
      setUploading(false);
    }
  };

  // ── Build ──

  const handleBuild = async () => {
    if (!activeProfileId) return;
    setBuilding(true);
    setBuildResult(null);
    const jobId = addJob('clone-profile', `Building voice clone: ${profileName}`);
    try {
      const res = await api.voiceStudio.buildProfile(activeProfileId);
      if (!res.success) {
        setError(res.error || 'Build failed');
        updateJob(jobId, { status: 'failed', error: res.error });
        return;
      }
      setBuildResult({
        status: res.data.status,
        quality_score: res.data.quality_score,
        voice_id: res.data.voice_id,
      });
      updateJob(jobId, { status: 'complete', progress: 100, detail: `Voice clone ready: ${res.data.voice_id}` });
    } catch {
      setError('Failed to connect to voice service');
      updateJob(jobId, { status: 'failed', error: 'Connection failed' });
    } finally {
      setBuilding(false);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    const res = await api.voiceStudio.deleteProfile(id);
    if (res.success) loadProfiles();
    else setError(res.error || 'Delete failed');
  };

  const resetFlow = () => {
    setConsentOwner('');
    setConsentPurpose('');
    setConsentExpiry('');
    setConsentId(null);
    setProfileName('');
    setProfileDescription('');
    setActiveProfileId(null);
    setSamples([]);
    setUploadResult(null);
    setBuildResult(null);
    setTotalDurationMs(0);
    setStep('profiles-list');
  };

  // ── Render ──

  // Profiles list
  if (step === 'profiles-list') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Voice Clone Profiles</h3>
            <p className="text-sm text-muted-foreground">Consent-first voice cloning for classroom narration</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadProfiles} disabled={loading}>
              <RefreshCw className="mr-2 h-3 w-3" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setStep('consent')} disabled={serviceStatus !== 'online'}>
              <Fingerprint className="mr-2 h-3 w-3" />
              New Voice Clone
            </Button>
          </div>
        </div>

        {loading ? (
          <Card><CardContent className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></CardContent></Card>
        ) : profiles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <Fingerprint className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Voice Clones</h3>
              <p className="text-muted-foreground mb-4">Create a voice clone to use your own voice for narration.</p>
              <Button onClick={() => setStep('consent')} disabled={serviceStatus !== 'online'}>
                <Fingerprint className="mr-2 h-4 w-4" />
                Create Voice Clone
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile) => {
              const style = STATUS_STYLES[profile.status] || STATUS_STYLES.creating;
              return (
                <Card key={profile.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{profile.name}</CardTitle>
                      <Badge variant={style.variant}>{style.label}</Badge>
                    </div>
                    <CardDescription className="text-xs">{profile.language} &middot; {profile.provider}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {profile.quality_score !== null && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Quality Score</span>
                          <span className="font-medium">{Math.round(profile.quality_score * 100)}%</span>
                        </div>
                        <Progress value={profile.quality_score * 100} className="h-1.5" />
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {profile.sample_count} sample{profile.sample_count !== 1 ? 's' : ''}
                    </div>
                    {/* Consent badge */}
                    <Badge variant="outline" className="text-xs">
                      <Shield className="mr-1 h-3 w-3 text-green-500" />
                      Consent Verified
                    </Badge>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteProfile(profile.id)}>
                      <Trash2 className="mr-2 h-3 w-3" />
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Step 1: Consent
  if (step === 'consent') {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={resetFlow}><ChevronLeft className="mr-2 h-4 w-4" />Back to Profiles</Button>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-2">
                <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle>Step 1: Grant Consent</CardTitle>
                <CardDescription>Voice cloning requires explicit consent before any processing</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Voice Owner ID</Label>
              <Input placeholder="User ID of the person whose voice will be cloned" value={consentOwner} onChange={(e) => setConsentOwner(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Purpose</Label>
              <Textarea placeholder="e.g. Classroom narration for Year 3 phonics content" value={consentPurpose} onChange={(e) => setConsentPurpose(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Expiry Date (optional)</Label>
              <Input type="date" value={consentExpiry} onChange={(e) => setConsentExpiry(e.target.value)} />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleCreateConsent} disabled={loading || !consentOwner.trim() || !consentPurpose.trim()}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Grant Consent &amp; Continue
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Step 2: Create Profile
  if (step === 'create-profile') {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setStep('consent')}><ChevronLeft className="mr-2 h-4 w-4" />Back to Consent</Button>
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Create Voice Profile</CardTitle>
            <CardDescription>Name your voice clone and select a language</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Badge variant="outline" className="text-xs"><Shield className="mr-1 h-3 w-3 text-green-500" />Consent: {consentId}</Badge>
            <div className="space-y-2">
              <Label>Profile Name</Label>
              <Input placeholder="e.g. Ms Smith's Narration Voice" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={profileLanguage} onValueChange={setProfileLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-us">English (US)</SelectItem>
                  <SelectItem value="en-gb">English (UK)</SelectItem>
                  <SelectItem value="en-au">English (AU)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea placeholder="Notes about this voice profile" value={profileDescription} onChange={(e) => setProfileDescription(e.target.value)} rows={2} />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleCreateProfile} disabled={loading || !profileName.trim()}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mic className="mr-2 h-4 w-4" />}
              Create Profile &amp; Upload Samples
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Step 3: Upload Samples
  if (step === 'upload-samples') {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setStep('create-profile')}><ChevronLeft className="mr-2 h-4 w-4" />Back</Button>
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Upload Audio Samples</CardTitle>
            <CardDescription>Upload clear voice recordings (minimum 6 seconds each). More samples = better quality.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border-2 border-dashed p-6 text-center">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                id="sample-upload"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadSample(file);
                  e.target.value = '';
                }}
              />
              <label htmlFor="sample-upload" className="cursor-pointer">
                <Button variant="outline" asChild disabled={uploading}>
                  <span>
                    {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    {uploading ? 'Uploading...' : 'Choose Audio File'}
                  </span>
                </Button>
              </label>
              <p className="text-xs text-muted-foreground mt-2">WAV, MP3, OGG, or FLAC &middot; Minimum 6 seconds</p>
            </div>

            {/* Upload result feedback */}
            {uploadResult && (
              <div className={`rounded-lg border p-3 ${uploadResult.valid ? 'border-green-300 bg-green-50 dark:bg-green-950/20' : 'border-red-300 bg-red-50 dark:bg-red-950/20'}`}>
                {uploadResult.valid ? (
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                    <Check className="h-4 w-4" />
                    Sample accepted
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                      <AlertCircle className="h-4 w-4" />
                      Sample rejected
                    </div>
                    {uploadResult.issues?.map((issue, i) => (
                      <p key={i} className="text-xs text-red-600 dark:text-red-400 ml-6">{issue}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sample list */}
            {samples.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">{samples.length} sample{samples.length !== 1 ? 's' : ''} uploaded ({(totalDurationMs / 1000).toFixed(1)}s total)</Label>
                {samples.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <span>{(s.duration_ms / 1000).toFixed(1)}s</span>
                    <div className="flex gap-2">
                      <Badge variant={s.quality_assessment.snr_db >= 15 ? 'outline' : 'destructive'} className="text-xs">
                        SNR {s.quality_assessment.snr_db.toFixed(0)} dB
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => setStep('build')} disabled={samples.length === 0 || totalDurationMs < 6000}>
              Continue to Build
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Step 4: Build
  return (
    <div className="max-w-lg mx-auto space-y-4">
      <Button variant="ghost" size="sm" onClick={() => setStep('upload-samples')}><ChevronLeft className="mr-2 h-4 w-4" />Back</Button>
      <Card>
        <CardHeader>
          <CardTitle>Step 4: Build Voice Clone</CardTitle>
          <CardDescription>Extract speaker embedding from uploaded samples (requires GPU)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
            <p><strong>Profile:</strong> {profileName}</p>
            <p><strong>Samples:</strong> {samples.length} ({(totalDurationMs / 1000).toFixed(1)}s total)</p>
            <p><strong>Consent:</strong> <Badge variant="outline" className="text-xs ml-1"><Shield className="mr-1 h-3 w-3 text-green-500" />{consentId}</Badge></p>
          </div>

          {buildResult ? (
            <div className="rounded-lg border-green-300 bg-green-50 dark:bg-green-950/20 border p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <Check className="h-5 w-5" />
                <span className="font-medium">Voice clone built successfully!</span>
              </div>
              <p className="text-sm">Voice ID: <Badge variant="outline" className="font-mono">{buildResult.voice_id}</Badge></p>
              <p className="text-sm">Quality Score: <strong>{Math.round(buildResult.quality_score * 100)}%</strong></p>
            </div>
          ) : (
            <Button className="w-full" onClick={handleBuild} disabled={building}>
              {building ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Fingerprint className="mr-2 h-4 w-4" />}
              {building ? 'Building...' : 'Build Voice Clone'}
            </Button>
          )}
        </CardContent>
        {buildResult && (
          <CardFooter>
            <Button className="w-full" variant="outline" onClick={resetFlow}>
              Done — Back to Profiles
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
