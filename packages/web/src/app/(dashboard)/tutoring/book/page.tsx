'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  GraduationCap,
  Calendar,
  Clock,
  CreditCard,
  Check,
  ChevronLeft,
  ChevronRight,
  User,
  BookOpen,
  Target,
  Mail,
  CalendarPlus,
  MessageSquare,
  Star,
  ShieldCheck,
  ArrowLeft,
  Video,
  Users,
  Package,
  AlertCircle,
} from 'lucide-react';

// Mock tutor data
const TUTORS_DB: Record<string, {
  id: string;
  name: string;
  subjects: string[];
  hourlyRate: number;
  rating: number;
  reviewCount: number;
}> = {
  tutor_1: {
    id: 'tutor_1',
    name: 'Sarah Chen',
    subjects: ['Mathematics', 'Physics', 'Advanced Mathematics'],
    hourlyRate: 75,
    rating: 4.9,
    reviewCount: 127,
  },
  tutor_5: {
    id: 'tutor_5',
    name: 'Priya Sharma',
    subjects: ['Primary Mathematics', 'Primary English', 'Science', 'NAPLAN Preparation'],
    hourlyRate: 55,
    rating: 5.0,
    reviewCount: 203,
  },
};

const DEFAULT_TUTOR = TUTORS_DB['tutor_1'];

// Mock availability
const AVAILABILITY = [
  { date: '2026-01-30', dayName: 'Thu', day: 30, slots: ['3:00 PM', '4:00 PM', '5:00 PM'] },
  { date: '2026-01-31', dayName: 'Fri', day: 31, slots: [] },
  { date: '2026-02-01', dayName: 'Sat', day: 1, slots: ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM'] },
  { date: '2026-02-02', dayName: 'Sun', day: 2, slots: [] },
  { date: '2026-02-03', dayName: 'Mon', day: 3, slots: ['4:00 PM', '5:00 PM', '6:00 PM'] },
  { date: '2026-02-04', dayName: 'Tue', day: 4, slots: [] },
  { date: '2026-02-05', dayName: 'Wed', day: 5, slots: ['4:00 PM', '5:00 PM'] },
  { date: '2026-02-06', dayName: 'Thu', day: 6, slots: ['3:00 PM', '4:00 PM'] },
  { date: '2026-02-07', dayName: 'Fri', day: 7, slots: ['4:00 PM'] },
  { date: '2026-02-08', dayName: 'Sat', day: 8, slots: ['9:00 AM', '10:00 AM', '11:00 AM'] },
];

const SESSION_TYPES = [
  {
    id: 'single',
    name: 'Single Session',
    description: 'One 1-hour tutoring session',
    duration: '1 hour',
    discount: 0,
    icon: User,
  },
  {
    id: 'package-5',
    name: '5-Session Package',
    description: 'Five 1-hour sessions - Save 10%',
    duration: '5 x 1 hour',
    discount: 10,
    icon: Package,
  },
  {
    id: 'package-10',
    name: '10-Session Package',
    description: 'Ten 1-hour sessions - Save 15%',
    duration: '10 x 1 hour',
    discount: 15,
    icon: Package,
  },
  {
    id: 'group',
    name: 'Group Session',
    description: 'Up to 4 students - 50% off per student',
    duration: '1 hour',
    discount: 50,
    icon: Users,
  },
];

const STEPS = [
  { id: 1, name: 'Date & Time', icon: Calendar },
  { id: 2, name: 'Session Type', icon: Package },
  { id: 3, name: 'Goals', icon: Target },
  { id: 4, name: 'Payment', icon: CreditCard },
];

function BookingContent() {
  const searchParams = useSearchParams();
  const tutorId = searchParams.get('tutor') || 'tutor_1';
  const preselectedDate = searchParams.get('date');
  const preselectedTime = searchParams.get('time');
  const preselectedSubject = searchParams.get('subject');

  const tutor = TUTORS_DB[tutorId] || DEFAULT_TUTOR;

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(preselectedDate);
  const [selectedTime, setSelectedTime] = useState<string | null>(preselectedTime ? decodeURIComponent(preselectedTime) : null);
  const [selectedSubject, setSelectedSubject] = useState<string>(preselectedSubject ? decodeURIComponent(preselectedSubject) : tutor.subjects[0]);
  const [sessionType, setSessionType] = useState('single');
  const [goals, setGoals] = useState('');
  const [topics, setTopics] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'saved' | 'new'>('saved');
  const [isBookingComplete, setIsBookingComplete] = useState(false);

  const selectedDaySlots = AVAILABILITY.find((d) => d.date === selectedDate)?.slots || [];
  const selectedSessionType = SESSION_TYPES.find((t) => t.id === sessionType) || SESSION_TYPES[0];

  const calculatePrice = () => {
    const basePrice = tutor.hourlyRate;
    const discount = selectedSessionType.discount;
    const discountedPrice = basePrice * (1 - discount / 100);

    if (sessionType === 'package-5') return discountedPrice * 5;
    if (sessionType === 'package-10') return discountedPrice * 10;
    return discountedPrice;
  };

  const price = calculatePrice();

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedDate && selectedTime && selectedSubject;
      case 2:
        return sessionType;
      case 3:
        return goals.trim().length > 0;
      case 4:
        return paymentMethod;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsBookingComplete(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Booking Confirmation Screen
  if (isBookingComplete) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Booking Confirmed!</h1>
            <p className="text-muted-foreground mb-6">
              Your tutoring session with {tutor.name} has been booked.
            </p>

            <div className="bg-muted rounded-lg p-6 text-left space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">
                  {selectedDate && new Date(selectedDate).toLocaleDateString('en-AU', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium">{selectedTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subject</span>
                <span className="font-medium">{selectedSubject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Session Type</span>
                <span className="font-medium">{selectedSessionType.name}</span>
              </div>
              <div className="flex justify-between border-t pt-4">
                <span className="text-muted-foreground">Total Paid</span>
                <span className="text-xl font-bold">${price.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-muted-foreground justify-center">
                <Mail className="h-4 w-4" />
                <span>Confirmation email sent</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground justify-center">
                <CalendarPlus className="h-4 w-4" />
                <span>Calendar invite added</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground justify-center">
                <MessageSquare className="h-4 w-4" />
                <span>SMS reminder 1 hour before</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center gap-4 pb-6">
            <Button variant="outline" asChild>
              <Link href="/tutoring/bookings">View My Bookings</Link>
            </Button>
            <Button asChild>
              <Link href="/tutoring">Find More Tutors</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/tutoring/${tutor.id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {tutor.name}&apos;s Profile
        </Link>
      </Button>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Booking Form */}
        <div className="flex-1 space-y-6">
          {/* Progress Steps */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                {STEPS.map((step, index) => {
                  const StepIcon = step.icon;
                  const isActive = currentStep === step.id;
                  const isComplete = currentStep > step.id;
                  return (
                    <div key={step.id} className="flex items-center">
                      <div
                        className={`flex items-center gap-2 ${
                          isActive
                            ? 'text-primary'
                            : isComplete
                            ? 'text-green-500'
                            : 'text-muted-foreground'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : isComplete
                              ? 'bg-green-500 text-white'
                              : 'bg-muted'
                          }`}
                        >
                          {isComplete ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <StepIcon className="h-4 w-4" />
                          )}
                        </div>
                        <span className="hidden md:inline text-sm font-medium">
                          {step.name}
                        </span>
                      </div>
                      {index < STEPS.length - 1 && (
                        <div
                          className={`w-12 md:w-24 h-0.5 mx-2 ${
                            isComplete ? 'bg-green-500' : 'bg-muted'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Step 1: Date & Time */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Select Date & Time</CardTitle>
                <CardDescription>
                  Choose when you would like to have your tutoring session
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Subject Selection */}
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger id="subject" className="mt-1.5">
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {tutor.subjects.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Selection */}
                <div>
                  <Label>Select a Date</Label>
                  <div className="grid grid-cols-5 md:grid-cols-10 gap-2 mt-2">
                    {AVAILABILITY.map((day) => {
                      const isSelected = selectedDate === day.date;
                      const hasSlots = day.slots.length > 0;
                      return (
                        <button
                          key={day.date}
                          type="button"
                          onClick={() => {
                            if (hasSlots) {
                              setSelectedDate(day.date);
                              setSelectedTime(null);
                            }
                          }}
                          disabled={!hasSlots}
                          className={`p-2 rounded-lg border text-center transition-all ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : hasSlots
                              ? 'hover:bg-muted cursor-pointer'
                              : 'opacity-40 cursor-not-allowed'
                          }`}
                        >
                          <p className="text-xs">{day.dayName}</p>
                          <p className="text-lg font-bold">{day.day}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Selection */}
                {selectedDate && (
                  <div>
                    <Label>Select a Time</Label>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mt-2">
                      {selectedDaySlots.map((slot) => (
                        <Button
                          key={slot}
                          type="button"
                          variant={selectedTime === slot ? 'default' : 'outline'}
                          onClick={() => setSelectedTime(slot)}
                        >
                          {slot}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Session Type */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Choose Session Type</CardTitle>
                <CardDescription>
                  Select the type of session that best fits your needs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {SESSION_TYPES.map((type) => {
                    const TypeIcon = type.icon;
                    const isSelected = sessionType === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setSessionType(type.id)}
                        className={`p-4 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`rounded-lg p-2 ${
                              isSelected ? 'bg-primary/10' : 'bg-muted'
                            }`}
                          >
                            <TypeIcon
                              className={`h-5 w-5 ${
                                isSelected ? 'text-primary' : 'text-muted-foreground'
                              }`}
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{type.name}</p>
                              {type.discount > 0 && (
                                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                  Save {type.discount}%
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {type.description}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Duration: {type.duration}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Goals & Topics */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Session Goals</CardTitle>
                <CardDescription>
                  Help {tutor.name} prepare by sharing your learning goals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="goals">What would you like to achieve?</Label>
                  <Textarea
                    id="goals"
                    placeholder="e.g., I want to improve my understanding of quadratic equations and prepare for my upcoming exam."
                    value={goals}
                    onChange={(e) => setGoals(e.target.value)}
                    className="mt-1.5 min-h-[100px]"
                  />
                </div>
                <div>
                  <Label htmlFor="topics">Specific topics to cover (optional)</Label>
                  <Textarea
                    id="topics"
                    placeholder="e.g., Factoring, completing the square, graphing parabolas"
                    value={topics}
                    onChange={(e) => setTopics(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700 dark:text-blue-400">
                    <p className="font-medium">Tip: Be specific!</p>
                    <p className="mt-1">
                      The more details you provide, the better {tutor.name} can tailor the session
                      to your needs.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Payment */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Details</CardTitle>
                <CardDescription>Choose your payment method</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Saved Card Option */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('saved')}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    paymentMethod === 'saved'
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-full w-5 h-5 border-2 flex items-center justify-center ${
                        paymentMethod === 'saved' ? 'border-primary' : 'border-muted-foreground'
                      }`}
                    >
                      {paymentMethod === 'saved' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                      )}
                    </div>
                    <CreditCard className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Saved Card</p>
                      <p className="text-sm text-muted-foreground">**** **** **** 4242</p>
                    </div>
                  </div>
                </button>

                {/* New Card Option */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('new')}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    paymentMethod === 'new'
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-full w-5 h-5 border-2 flex items-center justify-center ${
                        paymentMethod === 'new' ? 'border-primary' : 'border-muted-foreground'
                      }`}
                    >
                      {paymentMethod === 'new' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                      )}
                    </div>
                    <CreditCard className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Add New Card</p>
                      <p className="text-sm text-muted-foreground">Enter card details</p>
                    </div>
                  </div>
                </button>

                {/* New Card Form */}
                {paymentMethod === 'new' && (
                  <div className="space-y-4 pl-8">
                    <div>
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        className="mt-1.5"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expiry">Expiry Date</Label>
                        <Input id="expiry" placeholder="MM/YY" className="mt-1.5" />
                      </div>
                      <div>
                        <Label htmlFor="cvv">CVV</Label>
                        <Input id="cvv" placeholder="123" className="mt-1.5" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="cardName">Name on Card</Label>
                      <Input id="cardName" placeholder="John Smith" className="mt-1.5" />
                    </div>
                  </div>
                )}

                {/* Security Note */}
                <div className="rounded-lg bg-muted p-4 flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">Secure Payment</p>
                    <p className="text-muted-foreground mt-1">
                      Your payment details are encrypted and securely processed. We never store your
                      full card number.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleNext} disabled={!canProceed()}>
              {currentStep === 4 ? 'Confirm & Pay' : 'Continue'}
              {currentStep < 4 && <ChevronRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:w-80">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg">Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tutor Info */}
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{tutor.name}</p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {tutor.rating} ({tutor.reviewCount})
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                {selectedSubject && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subject</span>
                    <span className="font-medium">{selectedSubject}</span>
                  </div>
                )}
                {selectedDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">
                      {new Date(selectedDate).toLocaleDateString('en-AU', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                )}
                {selectedTime && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Time</span>
                    <span className="font-medium">{selectedTime}</span>
                  </div>
                )}
                {sessionType && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Session</span>
                    <span className="font-medium">{selectedSessionType.name}</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Hourly Rate</span>
                  <span>${tutor.hourlyRate}/hr</span>
                </div>
                {selectedSessionType.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount ({selectedSessionType.discount}%)</span>
                    <span>-${((tutor.hourlyRate * selectedSessionType.discount) / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>${price.toFixed(2)}</span>
                </div>
              </div>

              <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                <p>Free cancellation up to 24 hours before the session.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading booking...</div>}>
      <BookingContent />
    </Suspense>
  );
}
