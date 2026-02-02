'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  User,
  Star,
  Clock,
  DollarSign,
  BookOpen,
  Award,
  Edit,
  Save,
  Camera,
  CheckCircle2,
} from 'lucide-react';

export default function TutorProfilePage() {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tutor Profile</h1>
          <p className="text-muted-foreground">Manage your public tutor profile</p>
        </div>
        <Button onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          ) : (
            <>
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="text-2xl">SC</AvatarFallback>
                </Avatar>
                {isEditing && (
                  <Button size="icon" variant="outline" className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full">
                    <Camera className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <h2 className="mt-4 text-xl font-semibold">Sarah Chen</h2>
              <p className="text-sm text-muted-foreground">Mathematics Specialist</p>
              <div className="flex items-center gap-1 mt-2">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">4.9</span>
                <span className="text-sm text-muted-foreground">(127 reviews)</span>
              </div>
              <Badge className="mt-2 bg-green-500">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Verified Tutor
              </Badge>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Sessions Completed</span>
                <span className="font-medium">342</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Hours Tutored</span>
                <span className="font-medium">512</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Response Rate</span>
                <span className="font-medium">98%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Member Since</span>
                <span className="font-medium">Jan 2023</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bio */}
          <Card>
            <CardHeader>
              <CardTitle>About Me</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  rows={4}
                  defaultValue="Passionate mathematics educator with over 10 years of experience. I specialize in making complex concepts accessible and enjoyable for students of all levels. My approach combines visual learning techniques with practical applications to build deep understanding."
                />
              ) : (
                <p className="text-muted-foreground">
                  Passionate mathematics educator with over 10 years of experience. I specialize in making complex concepts accessible and enjoyable for students of all levels. My approach combines visual learning techniques with practical applications to build deep understanding.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Subjects & Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Subjects & Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { subject: 'Algebra', level: 'Year 7-12', price: 65 },
                  { subject: 'Calculus', level: 'Year 11-12', price: 75 },
                  { subject: 'Statistics', level: 'Year 10-12', price: 70 },
                ].map((item) => (
                  <div key={item.subject} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{item.subject}</p>
                      <p className="text-sm text-muted-foreground">{item.level}</p>
                    </div>
                    {isEditing ? (
                      <Input type="number" defaultValue={item.price} className="w-24" />
                    ) : (
                      <Badge variant="secondary">${item.price}/hr</Badge>
                    )}
                  </div>
                ))}
                {isEditing && (
                  <Button variant="outline" className="w-full">
                    + Add Subject
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Qualifications */}
          <Card>
            <CardHeader>
              <CardTitle>Qualifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { title: 'Master of Education', institution: 'University of Sydney', year: '2015' },
                  { title: 'Bachelor of Mathematics', institution: 'UNSW', year: '2012' },
                  { title: 'Working with Children Check', institution: 'NSW Government', year: '2024' },
                ].map((qual) => (
                  <div key={qual.title} className="flex items-start gap-3">
                    <Award className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">{qual.title}</p>
                      <p className="text-sm text-muted-foreground">{qual.institution} • {qual.year}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Availability Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Availability</CardTitle>
              <CardDescription>Your typical weekly schedule</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 text-center text-sm">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day}>
                    <p className="font-medium mb-2">{day}</p>
                    <div className={`h-20 rounded ${
                      ['Mon', 'Wed', 'Fri'].includes(day) ? 'bg-green-100' :
                      ['Tue', 'Thu'].includes(day) ? 'bg-green-50' : 'bg-gray-100'
                    }`} />
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">
                Manage Availability
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
