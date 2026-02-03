'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Settings, Building, Bell, Shield } from 'lucide-react';

export default function HostingSettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hosting Settings</h1>
        <p className="text-muted-foreground">Configure your micro-school hosting preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            School Information
          </CardTitle>
          <CardDescription>Basic details about your micro-school</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">School Name</label>
            <Input defaultValue="Sunshine Learning Hub" className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Tagline</label>
            <Input defaultValue="Where curiosity meets excellence" className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              defaultValue="A nurturing micro-school environment focused on personalized learning..."
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enquiry Alerts</p>
              <p className="text-sm text-muted-foreground">Get notified of new enquiries</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Booking Notifications</p>
              <p className="text-sm text-muted-foreground">Alert when tours are booked</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Review Notifications</p>
              <p className="text-sm text-muted-foreground">Get notified of new reviews</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Visibility
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Public Listing</p>
              <p className="text-sm text-muted-foreground">Show in micro-school directory</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Show Reviews</p>
              <p className="text-sm text-muted-foreground">Display parent reviews publicly</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Accept Online Enrolments</p>
              <p className="text-sm text-muted-foreground">Allow families to apply online</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>Save Settings</Button>
      </div>
    </div>
  );
}
