'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Upload,
  ExternalLink,
  RefreshCw,
  Loader2,
  Calendar,
  MapPin,
  User,
  FileText,
  Info,
  ChevronRight,
} from 'lucide-react';
import {
  verificationApi,
  type WWCCVerification,
  type StateInfo,
  type SubmitWWCCRequest,
  type WWCCState,
} from '@/lib/verification-api';

type FormStep = 'select-state' | 'enter-details' | 'upload-card' | 'review' | 'submitted';

export default function WWCCVerificationPage() {
  const [states, setStates] = useState<StateInfo[]>([]);
  const [existingVerifications, setExistingVerifications] = useState<WWCCVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<FormStep>('select-state');
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [selectedState, setSelectedState] = useState<WWCCState | ''>('');
  const [formData, setFormData] = useState<Partial<SubmitWWCCRequest>>({});
  const [cardFrontFile, setCardFrontFile] = useState<File | null>(null);
  const [cardBackFile, setCardBackFile] = useState<File | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [statesData, verificationsData] = await Promise.all([
          verificationApi.wwcc.getStates(),
          verificationApi.wwcc.getUserVerifications(),
        ]);
        setStates(statesData);
        setExistingVerifications(verificationsData);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load verification data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const selectedStateInfo = states.find(s => s.code === selectedState);

  const handleStateSelect = (state: WWCCState) => {
    setSelectedState(state);
    setFormData({ ...formData, state });
    setStep('enter-details');
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('upload-card');
  };

  const handleUploadSubmit = () => {
    setStep('review');
  };

  const handleFinalSubmit = async () => {
    if (!formData.wwccNumber || !formData.state || !formData.firstName || !formData.lastName || !formData.dateOfBirth) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const verification = await verificationApi.wwcc.submit(formData as SubmitWWCCRequest);

      // Upload card images if provided
      if (cardFrontFile) {
        await verificationApi.wwcc.uploadCardImage(verification.id, 'front', cardFrontFile);
      }
      if (cardBackFile) {
        await verificationApi.wwcc.uploadCardImage(verification.id, 'back', cardBackFile);
      }

      setStep('submitted');
      setExistingVerifications([...existingVerifications, verification]);
    } catch (err) {
      console.error('Failed to submit WWCC:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit verification');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'checking':
      case 'pending':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'failed':
      case 'revoked':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'expired':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return '';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle2 className="h-3 w-3 mr-1" />;
      case 'checking':
      case 'pending':
        return <Clock className="h-3 w-3 mr-1" />;
      case 'failed':
      case 'revoked':
        return <XCircle className="h-3 w-3 mr-1" />;
      case 'expired':
        return <AlertTriangle className="h-3 w-3 mr-1" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings?tab=verification">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Working With Children Check</h1>
          <p className="text-muted-foreground">
            Verify your WWCC to work with students on Scholarly
          </p>
        </div>
      </div>

      {/* Existing Verifications */}
      {existingVerifications.length > 0 && !showForm && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Your Verifications</h2>
            <Button onClick={() => setShowForm(true)}>
              Add Another State
            </Button>
          </div>

          {existingVerifications.map((verification) => (
            <Card key={verification.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-3 ${
                      verification.status === 'verified'
                        ? 'bg-green-500/10'
                        : verification.status === 'failed' || verification.status === 'revoked'
                        ? 'bg-red-500/10'
                        : 'bg-muted'
                    }`}>
                      <ShieldCheck className={`h-5 w-5 ${
                        verification.status === 'verified'
                          ? 'text-green-600'
                          : verification.status === 'failed' || verification.status === 'revoked'
                          ? 'text-red-600'
                          : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {states.find(s => s.code === verification.state)?.name || verification.state}
                        <Badge variant="outline">{verification.wwccNumber}</Badge>
                      </CardTitle>
                      <CardDescription>
                        {states.find(s => s.code === verification.state)?.cardName || 'Working With Children Check'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={getStatusColor(verification.status)}>
                    {getStatusIcon(verification.status)}
                    {verification.status.charAt(0).toUpperCase() + verification.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <User className="h-4 w-4" />
                      Card Holder
                    </p>
                    <p className="font-medium">{verification.firstName} {verification.lastName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Issue Date
                    </p>
                    <p className="font-medium">
                      {verification.issuedAt
                        ? new Date(verification.issuedAt).toLocaleDateString()
                        : '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Expiry Date
                    </p>
                    <p className={`font-medium ${
                      verification.expiresAt && new Date(verification.expiresAt) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                        ? 'text-amber-600'
                        : ''
                    }`}>
                      {verification.expiresAt
                        ? new Date(verification.expiresAt).toLocaleDateString()
                        : '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <RefreshCw className="h-4 w-4" />
                      Last Checked
                    </p>
                    <p className="font-medium">
                      {verification.registryLastChecked
                        ? new Date(verification.registryLastChecked).toLocaleDateString()
                        : '-'}
                    </p>
                  </div>
                </div>

                {verification.status === 'checking' && (
                  <div className="mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        Verification in progress
                      </p>
                    </div>
                    <p className="text-sm text-amber-600 dark:text-amber-400/80 mt-1">
                      We&apos;re checking your WWCC with the {verification.state} registry. This usually takes a few minutes.
                    </p>
                  </div>
                )}

                {verification.status === 'failed' && (
                  <div className="mt-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">
                      Verification Failed
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400/80 mt-1">
                      {verification.failureMessage || 'Unable to verify your WWCC. Please check the details and try again.'}
                    </p>
                  </div>
                )}

                {verification.monitoringEnabled && verification.status === 'verified' && (
                  <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Automatic monitoring enabled - we&apos;ll alert you if your status changes
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add New Verification Form */}
      {(existingVerifications.length === 0 || showForm) && (
        <div className="space-y-6">
          {showForm && (
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to verifications
            </Button>
          )}

          {/* Progress Steps */}
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {['select-state', 'enter-details', 'upload-card', 'review'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  step === s
                    ? 'border-primary bg-primary text-primary-foreground'
                    : ['select-state', 'enter-details', 'upload-card', 'review'].indexOf(step) > i
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/30 text-muted-foreground'
                }`}>
                  {['select-state', 'enter-details', 'upload-card', 'review'].indexOf(step) > i ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < 3 && (
                  <div className={`w-16 md:w-24 h-0.5 ${
                    ['select-state', 'enter-details', 'upload-card', 'review'].indexOf(step) > i
                      ? 'bg-primary'
                      : 'bg-muted-foreground/30'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step: Select State */}
          {step === 'select-state' && (
            <Card>
              <CardHeader>
                <CardTitle>Select Your State</CardTitle>
                <CardDescription>
                  Choose the state where your Working With Children Check was issued
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {states.map((state) => (
                    <button
                      key={state.code}
                      onClick={() => handleStateSelect(state.code)}
                      className="flex items-start gap-4 p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                    >
                      <div className="rounded-lg bg-muted p-2">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{state.name}</p>
                        <p className="text-sm text-muted-foreground">{state.cardName}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {state.verificationMethod === 'api' ? 'Instant Verification' : 'Manual Review'}
                          </Badge>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step: Enter Details */}
          {step === 'enter-details' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Enter Your {selectedStateInfo?.cardName} Details</CardTitle>
                    <CardDescription>
                      Enter the details exactly as they appear on your card
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{selectedState}</Badge>
                </div>
              </CardHeader>
              <form onSubmit={handleDetailsSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="wwccNumber">
                      {selectedStateInfo?.cardName} Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="wwccNumber"
                      placeholder={selectedState === 'QLD' ? 'e.g., 1234567/1' : 'e.g., WWC1234567E'}
                      value={formData.wwccNumber || ''}
                      onChange={(e) => setFormData({ ...formData, wwccNumber: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">
                        First Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="firstName"
                        placeholder="As shown on card"
                        value={formData.firstName || ''}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">
                        Last Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="lastName"
                        placeholder="As shown on card"
                        value={formData.lastName || ''}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">
                        Date of Birth <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth || ''}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cardType">Card Type</Label>
                      <Select
                        value={formData.cardType || ''}
                        onValueChange={(value) => setFormData({ ...formData, cardType: value as 'employee' | 'volunteer' | 'both' })}
                      >
                        <SelectTrigger id="cardType">
                          <SelectValue placeholder="Select card type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="volunteer">Volunteer</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="employerRegistrationNumber">Employer Registration Number</Label>
                      <Input
                        id="employerRegistrationNumber"
                        placeholder="Optional"
                        value={formData.employerRegistrationNumber || ''}
                        onChange={(e) => setFormData({ ...formData, employerRegistrationNumber: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="organisationName">Organisation Name</Label>
                      <Input
                        id="organisationName"
                        placeholder="Optional"
                        value={formData.organisationName || ''}
                        onChange={(e) => setFormData({ ...formData, organisationName: e.target.value })}
                      />
                    </div>
                  </div>

                  {selectedStateInfo?.verificationMethod === 'api' && (
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                            Instant Verification Available
                          </p>
                          <p className="text-sm text-blue-600 dark:text-blue-400/80 mt-1">
                            {selectedState} supports real-time verification. Your card will be checked with the registry automatically.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedStateInfo?.verificationMethod === 'manual' && (
                    <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                            Manual Verification Required
                          </p>
                          <p className="text-sm text-amber-600 dark:text-amber-400/80 mt-1">
                            {selectedState} requires manual verification. Please upload images of your card in the next step. Processing takes {selectedStateInfo.processingTime}.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setStep('select-state')}>
                    Back
                  </Button>
                  <Button type="submit">Continue</Button>
                </CardFooter>
              </form>
            </Card>
          )}

          {/* Step: Upload Card */}
          {step === 'upload-card' && (
            <Card>
              <CardHeader>
                <CardTitle>Upload Card Images</CardTitle>
                <CardDescription>
                  Upload photos of your {selectedStateInfo?.cardName} card for verification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Front of card */}
                  <div className="space-y-2">
                    <Label>Front of Card</Label>
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer ${
                        cardFrontFile ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'
                      }`}
                      onClick={() => document.getElementById('cardFront')?.click()}
                    >
                      <input
                        id="cardFront"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setCardFrontFile(e.target.files?.[0] || null)}
                      />
                      {cardFrontFile ? (
                        <div className="space-y-2">
                          <CheckCircle2 className="h-8 w-8 text-primary mx-auto" />
                          <p className="font-medium">{cardFrontFile.name}</p>
                          <p className="text-sm text-muted-foreground">Click to replace</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                          <p className="font-medium">Upload front of card</p>
                          <p className="text-sm text-muted-foreground">PNG, JPG up to 10MB</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Back of card */}
                  <div className="space-y-2">
                    <Label>Back of Card (Optional)</Label>
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer ${
                        cardBackFile ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'
                      }`}
                      onClick={() => document.getElementById('cardBack')?.click()}
                    >
                      <input
                        id="cardBack"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setCardBackFile(e.target.files?.[0] || null)}
                      />
                      {cardBackFile ? (
                        <div className="space-y-2">
                          <CheckCircle2 className="h-8 w-8 text-primary mx-auto" />
                          <p className="font-medium">{cardBackFile.name}</p>
                          <p className="text-sm text-muted-foreground">Click to replace</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                          <p className="font-medium">Upload back of card</p>
                          <p className="text-sm text-muted-foreground">PNG, JPG up to 10MB</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">Photo Tips</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Ensure all text on the card is clearly readable</li>
                    <li>• Take photos in good lighting conditions</li>
                    <li>• Make sure the entire card is visible in the frame</li>
                    <li>• Avoid glare or reflections on the card</li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep('enter-details')}>
                  Back
                </Button>
                <Button onClick={handleUploadSubmit}>
                  Continue
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Step: Review */}
          {step === 'review' && (
            <Card>
              <CardHeader>
                <CardTitle>Review Your Details</CardTitle>
                <CardDescription>
                  Please verify all information is correct before submitting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">State</p>
                    <p className="font-medium">{selectedStateInfo?.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Card Number</p>
                    <p className="font-medium">{formData.wwccNumber}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{formData.firstName} {formData.lastName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Date of Birth</p>
                    <p className="font-medium">
                      {formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString() : '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Card Type</p>
                    <p className="font-medium capitalize">{formData.cardType || 'Not specified'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Documents</p>
                    <p className="font-medium">
                      {cardFrontFile ? 'Front uploaded' : 'No front'}{cardBackFile ? ', Back uploaded' : ''}
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30">
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                  </div>
                )}

                <div className="p-4 rounded-lg border">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Privacy Notice</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your WWCC details will be securely stored and verified with the relevant state registry.
                        We will only use this information to verify your eligibility to work with children on the platform.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep('upload-card')}>
                  Back
                </Button>
                <Button onClick={handleFinalSubmit} disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit for Verification'
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Step: Submitted */}
          {step === 'submitted' && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-green-500/10 p-4 mb-4">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold">Verification Submitted</h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  Your WWCC has been submitted for verification.
                  {selectedStateInfo?.verificationMethod === 'api'
                    ? ' Results should be available within a few minutes.'
                    : ` Manual verification typically takes ${selectedStateInfo?.processingTime || '1-2 business days'}.`}
                </p>
                <div className="flex gap-3 mt-6">
                  <Button variant="outline" onClick={() => {
                    setShowForm(false);
                    setStep('select-state');
                    setFormData({});
                    setCardFrontFile(null);
                    setCardBackFile(null);
                  }}>
                    Back to Verifications
                  </Button>
                  <Button asChild>
                    <Link href="/settings?tab=verification">
                      Go to Settings
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Help Link */}
          {step !== 'submitted' && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Need to apply for a WWCC?</p>
                      <p className="text-sm text-muted-foreground">
                        Visit your state&apos;s website to apply
                      </p>
                    </div>
                  </div>
                  {selectedStateInfo ? (
                    <Button variant="outline" asChild>
                      <a href={selectedStateInfo.websiteUrl} target="_blank" rel="noopener noreferrer">
                        Visit {selectedState} Website
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                  ) : (
                    <Button variant="outline" asChild>
                      <a href="https://aifs.gov.au/resources/resource-sheets/working-children-checks" target="_blank" rel="noopener noreferrer">
                        State Information
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
