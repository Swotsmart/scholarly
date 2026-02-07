'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  ChevronLeft,
  ChevronRight,
  Check,
  Sparkles,
  BookOpen,
  Target,
  Palette,
  School,
  Bell,
  Users,
  Star,
  Gamepad2,
  Music,
  Paintbrush,
  Code,
  Calculator,
  Globe,
  Microscope,
  Dumbbell,
  PartyPopper,
  Rocket,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Learning interests for students
const LEARNING_INTERESTS = [
  { id: 'gaming', label: 'Gaming & Esports', icon: Gamepad2 },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'art', label: 'Art & Design', icon: Paintbrush },
  { id: 'coding', label: 'Coding', icon: Code },
  { id: 'maths', label: 'Mathematics', icon: Calculator },
  { id: 'languages', label: 'Languages', icon: Globe },
  { id: 'science', label: 'Science', icon: Microscope },
  { id: 'sport', label: 'Sport & Fitness', icon: Dumbbell },
];

// Learning goals for students
const LEARNING_GOALS = [
  { id: 'improve_grades', label: 'Improve my grades' },
  { id: 'learn_new_skills', label: 'Learn new skills' },
  { id: 'prepare_exams', label: 'Prepare for exams' },
  { id: 'explore_interests', label: 'Explore my interests' },
  { id: 'get_ahead', label: 'Get ahead of the curriculum' },
  { id: 'homework_help', label: 'Get help with homework' },
];

// Avatar options
const AVATARS: { id: string; color: string; icon: LucideIcon }[] = [
  { id: 'avatar-1', color: 'bg-blue-500', icon: GraduationCap },
  { id: 'avatar-2', color: 'bg-green-500', icon: BookOpen },
  { id: 'avatar-3', color: 'bg-purple-500', icon: Rocket },
  { id: 'avatar-4', color: 'bg-orange-500', icon: Sparkles },
  { id: 'avatar-5', color: 'bg-pink-500', icon: Palette },
  { id: 'avatar-6', color: 'bg-teal-500', icon: Microscope },
  { id: 'avatar-7', color: 'bg-amber-500', icon: Gamepad2 },
  { id: 'avatar-8', color: 'bg-indigo-500', icon: Music },
];

// Subject areas for teachers
const SUBJECT_AREAS = [
  'English',
  'Mathematics',
  'Science',
  'HASS (Humanities)',
  'The Arts',
  'Technologies',
  'Health & PE',
  'Languages',
];

// Year levels
const YEAR_LEVELS = [
  'Foundation',
  'Year 1-2',
  'Year 3-4',
  'Year 5-6',
  'Year 7-8',
  'Year 9-10',
  'Year 11-12',
];

// Notification preferences for parents
const NOTIFICATION_OPTIONS = [
  { id: 'daily_summary', label: 'Daily learning summary' },
  { id: 'weekly_report', label: 'Weekly progress report' },
  { id: 'grade_alerts', label: 'Grade change alerts' },
  { id: 'assignment_due', label: 'Assignment due reminders' },
  { id: 'teacher_messages', label: 'Teacher messages' },
  { id: 'attendance', label: 'Attendance notifications' },
];

// Confetti animation component
function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${3 + Math.random() * 2}s`,
          }}
        >
          <div
            className={`w-3 h-3 ${
              ['bg-primary', 'bg-yellow-400', 'bg-green-400', 'bg-pink-400', 'bg-blue-400'][
                Math.floor(Math.random() * 5)
              ]
            }`}
            style={{
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        </div>
      ))}
      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Get user role from auth store (in real app)
  const [userRole] = useState<'student' | 'teacher' | 'parent'>('student'); // Default for demo

  // Student onboarding state
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState('');

  // Teacher onboarding state
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedYearLevels, setSelectedYearLevels] = useState<string[]>([]);
  const [schoolName, setSchoolName] = useState('');

  // Parent onboarding state
  const [childCode, setChildCode] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([
    'weekly_report',
    'grade_alerts',
    'teacher_messages',
  ]);

  const router = useRouter();
  const { user } = useAuthStore();

  // Auto-save effect
  useEffect(() => {
    if (step > 1) {
      setAutoSaveStatus('saving');
      const timer = setTimeout(() => {
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [selectedInterests, selectedGoals, selectedAvatar, selectedSubjects, selectedYearLevels, selectedNotifications, step]);

  const getTotalSteps = () => {
    switch (userRole) {
      case 'student':
        return 3;
      case 'teacher':
        return 3;
      case 'parent':
        return 2;
      default:
        return 3;
    }
  };

  const totalSteps = getTotalSteps();
  const progressPercentage = (step / totalSteps) * 100;

  const canProceed = () => {
    if (userRole === 'student') {
      switch (step) {
        case 1:
          return selectedInterests.length >= 2;
        case 2:
          return selectedGoals.length >= 1;
        case 3:
          return !!selectedAvatar;
        default:
          return false;
      }
    }

    if (userRole === 'teacher') {
      switch (step) {
        case 1:
          return selectedSubjects.length >= 1;
        case 2:
          return selectedYearLevels.length >= 1;
        case 3:
          return true; // School name is optional
        default:
          return false;
      }
    }

    if (userRole === 'parent') {
      switch (step) {
        case 1:
          return true; // Child linking is optional
        case 2:
          return selectedNotifications.length >= 1;
        default:
          return false;
      }
    }

    return false;
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    toast({
      title: 'Onboarding skipped',
      description: 'You can complete your profile later in Settings.',
    });
    router.push('/dashboard');
  };

  const handleComplete = () => {
    setIsLoading(true);

    // Simulate saving
    setTimeout(() => {
      setIsLoading(false);
      setShowCelebration(true);

      // Redirect after celebration
      setTimeout(() => {
        toast({
          title: 'Welcome to Scholarly!',
          description: 'Your profile is all set up. Let\'s start learning!',
        });
        router.push('/dashboard');
      }, 3000);
    }, 1500);
  };

  const toggleSelection = (id: string, current: string[], setter: (val: string[]) => void) => {
    if (current.includes(id)) {
      setter(current.filter((item) => item !== id));
    } else {
      setter([...current, id]);
    }
  };

  // Celebration screen
  if (showCelebration) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
        <Confetti />
        <Card className="w-full max-w-md border-0 shadow-xl text-center">
          <CardContent className="pt-12 pb-12 space-y-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-24 w-24 rounded-full bg-primary/20 animate-ping" />
              </div>
              <div className="relative flex justify-center">
                <div className="rounded-full bg-primary p-4">
                  <PartyPopper className="h-12 w-12 text-primary-foreground" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">You&apos;re all set!</h1>
              <p className="text-muted-foreground">
                Welcome to Scholarly. Your personalized learning journey begins now.
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <Star className="h-6 w-6 text-yellow-400 fill-yellow-400 animate-bounce" style={{ animationDelay: '0s' }} />
              <Star className="h-6 w-6 text-yellow-400 fill-yellow-400 animate-bounce" style={{ animationDelay: '0.1s' }} />
              <Star className="h-6 w-6 text-yellow-400 fill-yellow-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Step {step} of {totalSteps}
            </span>
            <div className="flex items-center gap-2">
              {autoSaveStatus === 'saving' && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </span>
              )}
              {autoSaveStatus === 'saved' && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Saved
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                Skip for now
              </Button>
            </div>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <Card className="border-0 shadow-xl">
          {/* Student Onboarding */}
          {userRole === 'student' && (
            <>
              {/* Step 1: Interests */}
              {step === 1 && (
                <>
                  <CardHeader className="text-center space-y-1 pb-4">
                    <div className="flex justify-center mb-2">
                      <div className="rounded-full bg-primary/10 p-3">
                        <Sparkles className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <CardTitle className="text-2xl">What interests you?</CardTitle>
                    <CardDescription>
                      Select at least 2 topics you&apos;re interested in learning about
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {LEARNING_INTERESTS.map((interest) => {
                        const Icon = interest.icon;
                        const isSelected = selectedInterests.includes(interest.id);
                        return (
                          <button
                            key={interest.id}
                            type="button"
                            onClick={() => toggleSelection(interest.id, selectedInterests, setSelectedInterests)}
                            className={`p-4 rounded-lg border-2 text-left transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-muted hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                              <span className={`font-medium ${isSelected ? 'text-primary' : ''}`}>
                                {interest.label}
                              </span>
                              {isSelected && <Check className="h-4 w-4 text-primary ml-auto" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-4 text-center">
                      Selected: {selectedInterests.length}/2 minimum
                    </p>
                  </CardContent>
                </>
              )}

              {/* Step 2: Goals */}
              {step === 2 && (
                <>
                  <CardHeader className="text-center space-y-1 pb-4">
                    <div className="flex justify-center mb-2">
                      <div className="rounded-full bg-primary/10 p-3">
                        <Target className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <CardTitle className="text-2xl">What are your goals?</CardTitle>
                    <CardDescription>
                      Select the learning goals that matter most to you
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {LEARNING_GOALS.map((goal) => {
                        const isSelected = selectedGoals.includes(goal.id);
                        return (
                          <button
                            key={goal.id}
                            type="button"
                            onClick={() => toggleSelection(goal.id, selectedGoals, setSelectedGoals)}
                            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-muted hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`font-medium ${isSelected ? 'text-primary' : ''}`}>
                                {goal.label}
                              </span>
                              {isSelected && <Check className="h-5 w-5 text-primary" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </>
              )}

              {/* Step 3: Avatar */}
              {step === 3 && (
                <>
                  <CardHeader className="text-center space-y-1 pb-4">
                    <div className="flex justify-center mb-2">
                      <div className="rounded-full bg-primary/10 p-3">
                        <Palette className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <CardTitle className="text-2xl">Choose your avatar</CardTitle>
                    <CardDescription>
                      Pick an avatar that represents you
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      {AVATARS.map((avatar) => {
                        const isSelected = selectedAvatar === avatar.id;
                        return (
                          <button
                            key={avatar.id}
                            type="button"
                            onClick={() => setSelectedAvatar(avatar.id)}
                            className={`aspect-square rounded-2xl flex items-center justify-center transition-all ${
                              avatar.color
                            } ${
                              isSelected
                                ? 'ring-4 ring-primary ring-offset-2 scale-110'
                                : 'hover:scale-105'
                            }`}
                          >
                            <avatar.icon className="w-8 h-8 text-white" />
                          </button>
                        );
                      })}
                    </div>
                    {selectedAvatar && (
                      <div className="mt-6 flex justify-center">
                        {(() => {
                          const selected = AVATARS.find((a) => a.id === selectedAvatar);
                          const SelectedIcon = selected?.icon;
                          return (
                            <div className={`h-24 w-24 rounded-3xl flex items-center justify-center ${selected?.color}`}>
                              {SelectedIcon && <SelectedIcon className="w-12 h-12 text-white" />}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </CardContent>
                </>
              )}
            </>
          )}

          {/* Teacher Onboarding */}
          {userRole === 'teacher' && (
            <>
              {/* Step 1: Subjects */}
              {step === 1 && (
                <>
                  <CardHeader className="text-center space-y-1 pb-4">
                    <div className="flex justify-center mb-2">
                      <div className="rounded-full bg-primary/10 p-3">
                        <BookOpen className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <CardTitle className="text-2xl">What do you teach?</CardTitle>
                    <CardDescription>
                      Select the subjects you teach or are responsible for
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {SUBJECT_AREAS.map((subject) => {
                        const isSelected = selectedSubjects.includes(subject);
                        return (
                          <button
                            key={subject}
                            type="button"
                            onClick={() => toggleSelection(subject, selectedSubjects, setSelectedSubjects)}
                            className={`px-4 py-2 rounded-full border-2 transition-all ${
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-muted hover:border-primary/50'
                            }`}
                          >
                            {subject}
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </>
              )}

              {/* Step 2: Year Levels */}
              {step === 2 && (
                <>
                  <CardHeader className="text-center space-y-1 pb-4">
                    <div className="flex justify-center mb-2">
                      <div className="rounded-full bg-primary/10 p-3">
                        <Users className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <CardTitle className="text-2xl">Which year levels?</CardTitle>
                    <CardDescription>
                      Select the year levels you work with
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {YEAR_LEVELS.map((level) => {
                        const isSelected = selectedYearLevels.includes(level);
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => toggleSelection(level, selectedYearLevels, setSelectedYearLevels)}
                            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-muted hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`font-medium ${isSelected ? 'text-primary' : ''}`}>
                                {level}
                              </span>
                              {isSelected && <Check className="h-5 w-5 text-primary" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </>
              )}

              {/* Step 3: School */}
              {step === 3 && (
                <>
                  <CardHeader className="text-center space-y-1 pb-4">
                    <div className="flex justify-center mb-2">
                      <div className="rounded-full bg-primary/10 p-3">
                        <School className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <CardTitle className="text-2xl">Your school</CardTitle>
                    <CardDescription>
                      Tell us about your school (optional)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="schoolName">School Name</Label>
                      <Input
                        id="schoolName"
                        placeholder="Enter your school name"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This helps us connect you with other teachers at your school and provide
                      school-specific features.
                    </p>
                  </CardContent>
                </>
              )}
            </>
          )}

          {/* Parent Onboarding */}
          {userRole === 'parent' && (
            <>
              {/* Step 1: Link Children */}
              {step === 1 && (
                <>
                  <CardHeader className="text-center space-y-1 pb-4">
                    <div className="flex justify-center mb-2">
                      <div className="rounded-full bg-primary/10 p-3">
                        <Users className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <CardTitle className="text-2xl">Link your children</CardTitle>
                    <CardDescription>
                      Enter your child&apos;s account code to link their progress
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="childCode">Child&apos;s Link Code</Label>
                      <Input
                        id="childCode"
                        placeholder="e.g., SCHOL-ABC123"
                        value={childCode}
                        onChange={(e) => setChildCode(e.target.value.toUpperCase())}
                        className="text-center font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        Your child can find their link code in their profile settings
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <h4 className="font-medium text-sm mb-2">How it works</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>1. Your child shares their link code with you</li>
                        <li>2. Enter the code above and click Continue</li>
                        <li>3. Your child approves the link request</li>
                        <li>4. Start monitoring their progress!</li>
                      </ul>
                    </div>
                  </CardContent>
                </>
              )}

              {/* Step 2: Notification Preferences */}
              {step === 2 && (
                <>
                  <CardHeader className="text-center space-y-1 pb-4">
                    <div className="flex justify-center mb-2">
                      <div className="rounded-full bg-primary/10 p-3">
                        <Bell className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <CardTitle className="text-2xl">Stay informed</CardTitle>
                    <CardDescription>
                      Choose how you want to receive updates
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {NOTIFICATION_OPTIONS.map((option) => {
                        const isSelected = selectedNotifications.includes(option.id);
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() =>
                              toggleSelection(option.id, selectedNotifications, setSelectedNotifications)
                            }
                            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-muted hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`font-medium ${isSelected ? 'text-primary' : ''}`}>
                                {option.label}
                              </span>
                              <div
                                className={`w-10 h-6 rounded-full transition-colors ${
                                  isSelected ? 'bg-primary' : 'bg-muted'
                                }`}
                              >
                                <div
                                  className={`w-5 h-5 mt-0.5 rounded-full bg-white shadow transition-transform ${
                                    isSelected ? 'translate-x-4' : 'translate-x-0.5'
                                  }`}
                                />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </>
              )}
            </>
          )}

          <CardFooter className="flex gap-3 pt-4">
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
              disabled={!canProceed() || isLoading}
              className={step === 1 ? 'w-full' : 'flex-1'}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : step === totalSteps ? (
                <>
                  Complete Setup
                  <Check className="ml-2 h-4 w-4" />
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
    </div>
  );
}
