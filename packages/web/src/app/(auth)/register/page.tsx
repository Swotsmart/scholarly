'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  GraduationCap,
  Loader2,
  Mail,
  Lock,
  User,
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Users,
  Briefcase,
  Eye,
  EyeOff,
  School,
  ShieldCheck,
  Info,
  Code2,
  Home,
  Globe,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Role definitions with icons - using static Tailwind classes (dynamic classes don't work with Tailwind purge)
const ROLES = [
  {
    id: 'parent',
    label: 'Parent',
    description: "Monitor your child's progress and communicate with teachers",
    icon: Users,
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-500',
  },
  {
    id: 'tutor',
    label: 'Tutor',
    description: 'Offer tutoring services and manage your students',
    icon: Briefcase,
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-500',
  },
  {
    id: 'developer',
    label: 'Developer',
    description: 'Build apps and integrations on the Scholarly platform',
    icon: Code2,
    bgColor: 'bg-cyan-500/10',
    textColor: 'text-cyan-500',
  },
  {
    id: 'homeschool_admin',
    label: 'Homeschool',
    description: 'Manage your family\'s homeschool curriculum and progress',
    icon: Home,
    bgColor: 'bg-rose-500/10',
    textColor: 'text-rose-500',
  },
  {
    id: 'micro_school_admin',
    label: 'Micro-School',
    description: 'Run and manage a micro-school learning community',
    icon: School,
    bgColor: 'bg-teal-500/10',
    textColor: 'text-teal-500',
  },
];

// Steps
const STEPS = [
  { id: 1, label: 'Role', description: 'Select your role' },
  { id: 2, label: 'Account', description: 'Basic information' },
  { id: 3, label: 'Profile', description: 'Profile details' },
  { id: 4, label: 'Verify', description: 'Email verification' },
];

// Year levels for Australia
const YEAR_LEVELS = [
  'Prep/Foundation',
  'Year 1',
  'Year 2',
  'Year 3',
  'Year 4',
  'Year 5',
  'Year 6',
  'Year 7',
  'Year 8',
  'Year 9',
  'Year 10',
  'Year 11',
  'Year 12',
];

// Subjects
const SUBJECTS = [
  'English',
  'Mathematics',
  'Science',
  'HASS',
  'The Arts',
  'Technologies',
  'Health & PE',
  'Languages',
];

// Password strength checker
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 20, label: 'Weak', color: 'bg-red-500' };
  if (score === 2) return { score: 40, label: 'Fair', color: 'bg-orange-500' };
  if (score === 3) return { score: 60, label: 'Good', color: 'bg-yellow-500' };
  if (score === 4) return { score: 80, label: 'Strong', color: 'bg-green-500' };
  return { score: 100, label: 'Excellent', color: 'bg-emerald-500' };
}

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Step 1: Role
  const [role, setRole] = useState('');

  // Step 2: Account info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 3: Profile (varies by role)
  // Student
  const [yearLevel, setYearLevel] = useState('');
  const [schoolName, setSchoolName] = useState('');
  // Teacher
  const [teachingSubjects, setTeachingSubjects] = useState<string[]>([]);
  const [teachingYears, setTeachingYears] = useState<string[]>([]);
  // Parent
  const [childEmail, setChildEmail] = useState('');
  // Tutor
  const [tutorSubjects, setTutorSubjects] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState('');
  // Developer
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  // Homeschool
  const [numberOfChildren, setNumberOfChildren] = useState('');
  const [homeschoolYears, setHomeschoolYears] = useState<string[]>([]);
  // Micro-School
  const [microSchoolName, setMicroSchoolName] = useState('');
  const [microSchoolCapacity, setMicroSchoolCapacity] = useState('');

  // Step 4: Verification
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);

  const { register } = useAuthStore();
  const router = useRouter();

  // Pre-select role from query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role');
    if (roleParam && ROLES.find(r => r.id === roleParam) && !role) {
      setRole(roleParam);
    }
  }, []);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const progressPercentage = ((step - 1) / (STEPS.length - 1)) * 100;

  const canProceed = useMemo(() => {
    switch (step) {
      case 1:
        return !!role;
      case 2:
        return (
          firstName.trim() !== '' &&
          lastName.trim() !== '' &&
          email.trim() !== '' &&
          password.length >= 8 &&
          password === confirmPassword &&
          termsAccepted
        );
      case 3:
        if (role === 'student') {
          return yearLevel !== '';
        }
        if (role === 'teacher') {
          return teachingSubjects.length > 0 && teachingYears.length > 0;
        }
        if (role === 'parent') {
          return true; // Child linking is optional
        }
        if (role === 'tutor') {
          return tutorSubjects.length > 0;
        }
        if (role === 'developer') {
          return true; // Company details are optional
        }
        if (role === 'homeschool_admin') {
          return numberOfChildren !== '';
        }
        if (role === 'micro_school_admin') {
          return microSchoolName.trim() !== '';
        }
        return true;
      case 4:
        return verificationCode.length === 6;
      default:
        return false;
    }
  }, [
    step,
    role,
    firstName,
    lastName,
    email,
    password,
    confirmPassword,
    termsAccepted,
    yearLevel,
    teachingSubjects,
    teachingYears,
    tutorSubjects,
    numberOfChildren,
    microSchoolName,
    verificationCode,
  ]);

  const handleNext = async () => {
    if (step === 3) {
      // Submit registration and send verification
      setIsLoading(true);
      setError('');

      try {
        const result = await register({
          firstName,
          lastName,
          email,
          password,
          role,
        });

        if (result.success) {
          setVerificationSent(true);
          setStep(4);
        } else {
          setError(result.error || 'Registration failed');
        }
      } catch {
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else if (step === 4) {
      // Verify and complete
      setIsLoading(true);

      // Simulate verification
      setTimeout(() => {
        setIsLoading(false);
        toast({
          title: 'Account created!',
          description: 'Welcome to Scholarly. Your account has been verified.',
        });
        router.push('/onboarding');
      }, 1500);
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError('');
    }
  };

  const handleResendCode = () => {
    toast({
      title: 'Verification code sent',
      description: `A new code has been sent to ${email}`,
    });
  };

  const toggleSubject = (subject: string, current: string[], setter: (val: string[]) => void) => {
    if (current.includes(subject)) {
      setter(current.filter((s) => s !== subject));
    } else {
      setter([...current, subject]);
    }
  };

  const toggleYear = (year: string, current: string[], setter: (val: string[]) => void) => {
    if (current.includes(year)) {
      setter(current.filter((y) => y !== year));
    } else {
      setter([...current, year]);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="w-full max-w-lg">
        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s, idx) => (
              <div
                key={s.id}
                className={`flex items-center ${idx < STEPS.length - 1 ? 'flex-1' : ''}`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    step > s.id
                      ? 'bg-primary text-primary-foreground'
                      : step === s.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step > s.id ? <Check className="h-4 w-4" /> : s.id}
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-1 flex-1 rounded-full transition-colors ${
                      step > s.id ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            {STEPS.map((s) => (
              <span
                key={s.id}
                className={step === s.id ? 'text-primary font-medium' : ''}
              >
                {s.label}
              </span>
            ))}
          </div>
        </div>

        {/* Apple-inspired centered card */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 text-center pb-4">
            <div className="flex justify-center mb-2">
              <div className="rounded-full bg-primary/10 p-3">
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">
              {step === 1 && 'Choose your role'}
              {step === 2 && 'Create your account'}
              {step === 3 && 'Complete your profile'}
              {step === 4 && 'Verify your email'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Select how you will use Scholarly'}
              {step === 2 && 'Enter your basic information'}
              {step === 3 && `Set up your ${ROLES.find((r) => r.id === role)?.label.toLowerCase()} profile`}
              {step === 4 && `We sent a verification code to ${email}`}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {/* Step 1: Role Selection */}
            {step === 1 && (
              <div className="space-y-3">
                {ROLES.map((r) => {
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id)}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        role === r.id
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`rounded-lg ${r.bgColor} p-2`}>
                          <Icon className={`h-5 w-5 ${r.textColor}`} />
                        </div>
                        <div>
                          <p className="font-medium">{r.label}</p>
                          <p className="text-sm text-muted-foreground">{r.description}</p>
                        </div>
                        {role === r.id && (
                          <Check className="h-5 w-5 text-primary ml-auto" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Step 2: Account Information */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      leftIcon={<User className="h-4 w-4" />}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leftIcon={<Mail className="h-4 w-4" />}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      leftIcon={<Lock className="h-4 w-4" />}
                      disabled={isLoading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Progress
                          value={passwordStrength.score}
                          className="h-1.5 flex-1"
                          indicatorClassName={passwordStrength.color}
                        />
                        <span className={`text-xs font-medium ${passwordStrength.color.replace('bg-', 'text-')}`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Use 8+ characters with uppercase, lowercase, numbers, and symbols
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    leftIcon={<Lock className="h-4 w-4" />}
                    disabled={isLoading}
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-destructive">Passwords do not match</p>
                  )}
                </div>

                {/* Terms Checkbox */}
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="terms" className="text-sm text-muted-foreground">
                    I agree to the{' '}
                    <Link href="/terms" className="text-primary hover:underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="text-primary hover:underline">
                      Privacy Policy
                    </Link>
                  </label>
                </div>
              </div>
            )}

            {/* Step 3: Profile Setup (varies by role) */}
            {step === 3 && (
              <div className="space-y-4">
                {/* Student Profile */}
                {role === 'student' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="yearLevel">Year Level</Label>
                      <Select value={yearLevel} onValueChange={setYearLevel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your year level" />
                        </SelectTrigger>
                        <SelectContent>
                          {YEAR_LEVELS.map((year) => (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schoolName">School Name (optional)</Label>
                      <Input
                        id="schoolName"
                        placeholder="Enter your school name"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        leftIcon={<School className="h-4 w-4" />}
                      />
                    </div>
                  </>
                )}

                {/* Teacher Profile */}
                {role === 'teacher' && (
                  <>
                    <div className="space-y-2">
                      <Label>Subjects You Teach</Label>
                      <div className="flex flex-wrap gap-2">
                        {SUBJECTS.map((subject) => (
                          <button
                            key={subject}
                            type="button"
                            onClick={() => toggleSubject(subject, teachingSubjects, setTeachingSubjects)}
                            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                              teachingSubjects.includes(subject)
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-muted hover:border-primary/50'
                            }`}
                          >
                            {subject}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Year Levels You Teach</Label>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {YEAR_LEVELS.map((year) => (
                          <button
                            key={year}
                            type="button"
                            onClick={() => toggleYear(year, teachingYears, setTeachingYears)}
                            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                              teachingYears.includes(year)
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-muted hover:border-primary/50'
                            }`}
                          >
                            {year}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schoolName">School Name</Label>
                      <Input
                        id="schoolName"
                        placeholder="Enter your school name"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        leftIcon={<School className="h-4 w-4" />}
                      />
                    </div>
                  </>
                )}

                {/* Parent Profile */}
                {role === 'parent' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="childEmail">Link Your Child&apos;s Account (optional)</Label>
                      <Input
                        id="childEmail"
                        type="email"
                        placeholder="Enter your child's email"
                        value={childEmail}
                        onChange={(e) => setChildEmail(e.target.value)}
                        leftIcon={<Mail className="h-4 w-4" />}
                      />
                      <p className="text-xs text-muted-foreground">
                        Your child will receive an invitation to link their account
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <h4 className="font-medium text-sm mb-2">Notification Preferences</h4>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" defaultChecked className="h-4 w-4 rounded" />
                          Weekly progress reports
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" defaultChecked className="h-4 w-4 rounded" />
                          Assignment submission alerts
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" defaultChecked className="h-4 w-4 rounded" />
                          Grade updates
                        </label>
                      </div>
                    </div>

                    {/* KYC Notice for Parents */}
                    <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-900/30 p-4">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-sm text-blue-800 dark:text-blue-400">
                            Identity Verification Required
                          </h4>
                          <p className="text-sm text-blue-700 dark:text-blue-400/80 mt-1">
                            To keep children safe, we require identity verification (KYC) for all parent accounts.
                            You can complete this after registration.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Tutor Profile */}
                {role === 'tutor' && (
                  <>
                    <div className="space-y-2">
                      <Label>Subjects You Tutor</Label>
                      <div className="flex flex-wrap gap-2">
                        {SUBJECTS.map((subject) => (
                          <button
                            key={subject}
                            type="button"
                            onClick={() => toggleSubject(subject, tutorSubjects, setTutorSubjects)}
                            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                              tutorSubjects.includes(subject)
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-muted hover:border-primary/50'
                            }`}
                          >
                            {subject}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hourlyRate">Hourly Rate (AUD)</Label>
                      <Input
                        id="hourlyRate"
                        type="number"
                        placeholder="e.g., 50"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(e.target.value)}
                        leftIcon={<span className="text-sm">$</span>}
                      />
                    </div>

                    {/* WWCC Notice */}
                    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-900/30 p-4">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-sm text-amber-800 dark:text-amber-400">
                            Working With Children Check Required
                          </h4>
                          <p className="text-sm text-amber-700 dark:text-amber-400/80 mt-1">
                            To tutor students on Scholarly, you&apos;ll need a valid Working With Children Check (WWCC) or Blue Card.
                            You can complete this verification after registration.
                          </p>
                          <div className="flex items-center gap-1 mt-2 text-xs text-amber-600 dark:text-amber-400/70">
                            <Info className="h-3 w-3" />
                            <span>Identity verification (KYC) is also required for all tutors</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Developer Profile */}
                {role === 'developer' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company / Organization (optional)</Label>
                      <Input
                        id="companyName"
                        placeholder="Your company name"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        leftIcon={<Briefcase className="h-4 w-4" />}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website (optional)</Label>
                      <Input
                        id="website"
                        placeholder="https://example.com"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        leftIcon={<Globe className="h-4 w-4" />}
                      />
                    </div>

                    {/* KYC Notice for Developers */}
                    <div className="rounded-lg border border-cyan-200 bg-cyan-50 dark:bg-cyan-900/20 dark:border-cyan-900/30 p-4">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="h-5 w-5 text-cyan-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-sm text-cyan-800 dark:text-cyan-400">
                            Identity Verification Required
                          </h4>
                          <p className="text-sm text-cyan-700 dark:text-cyan-400/80 mt-1">
                            To publish apps and access API keys, identity verification (KYC) is required.
                            You can complete this after registration.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Homeschool Profile */}
                {role === 'homeschool_admin' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="numberOfChildren">Number of Children</Label>
                      <Input
                        id="numberOfChildren"
                        type="number"
                        placeholder="e.g., 3"
                        value={numberOfChildren}
                        onChange={(e) => setNumberOfChildren(e.target.value)}
                        leftIcon={<Users className="h-4 w-4" />}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Year Levels</Label>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {YEAR_LEVELS.map((year) => (
                          <button
                            key={year}
                            type="button"
                            onClick={() => toggleYear(year, homeschoolYears, setHomeschoolYears)}
                            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                              homeschoolYears.includes(year)
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-muted hover:border-primary/50'
                            }`}
                          >
                            {year}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* KYC Notice */}
                    <div className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-900/30 p-4">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="h-5 w-5 text-rose-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-sm text-rose-800 dark:text-rose-400">
                            Identity Verification Required
                          </h4>
                          <p className="text-sm text-rose-700 dark:text-rose-400/80 mt-1">
                            To access curriculum management and student records, identity verification (KYC)
                            is required. You can complete this after registration.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Micro-School Profile */}
                {role === 'micro_school_admin' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="microSchoolName">Micro-School Name</Label>
                      <Input
                        id="microSchoolName"
                        placeholder="Enter your micro-school name"
                        value={microSchoolName}
                        onChange={(e) => setMicroSchoolName(e.target.value)}
                        leftIcon={<School className="h-4 w-4" />}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="microSchoolCapacity">Student Capacity (optional)</Label>
                      <Input
                        id="microSchoolCapacity"
                        type="number"
                        placeholder="e.g., 20"
                        value={microSchoolCapacity}
                        onChange={(e) => setMicroSchoolCapacity(e.target.value)}
                        leftIcon={<Users className="h-4 w-4" />}
                      />
                    </div>

                    {/* KYC + KYB Notice */}
                    <div className="rounded-lg border border-teal-200 bg-teal-50 dark:bg-teal-900/20 dark:border-teal-900/30 p-4">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="h-5 w-5 text-teal-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-sm text-teal-800 dark:text-teal-400">
                            Identity &amp; Business Verification Required
                          </h4>
                          <p className="text-sm text-teal-700 dark:text-teal-400/80 mt-1">
                            Running a micro-school requires identity verification (KYC) and business verification (ABN/KYB).
                            You can complete these after registration.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

              </div>
            )}

            {/* Step 4: Verification */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Mail className="h-10 w-10 text-primary" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="verificationCode">Verification Code</Label>
                  <Input
                    id="verificationCode"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                    maxLength={6}
                  />
                </div>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Didn&apos;t receive the code?
                  </p>
                  <Button variant="link" onClick={handleResendCode} className="text-primary">
                    Resend Code
                  </Button>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <div className="flex w-full gap-3">
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={!canProceed || isLoading}
                className={step === 1 ? 'w-full' : 'flex-1'}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {step === 3 ? 'Creating account...' : step === 4 ? 'Verifying...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    {step === 4 ? 'Complete Setup' : 'Continue'}
                    {step < 4 && <ChevronRight className="ml-2 h-4 w-4" />}
                  </>
                )}
              </Button>
            </div>

            {step === 1 && (
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
