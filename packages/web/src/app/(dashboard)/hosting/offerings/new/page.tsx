'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Package, DollarSign, Users, Calendar } from 'lucide-react';

export default function NewOfferingPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Offering</h1>
        <p className="text-muted-foreground">Add a new program or service to your micro-school</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Offering Details
          </CardTitle>
          <CardDescription>Basic information about your offering</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Offering Name</label>
            <Input placeholder="e.g., Full-time Enrolment Year 1-6" className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea placeholder="Describe what's included..." className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Type</label>
              <select className="w-full mt-1 px-3 py-2 border rounded-md bg-background">
                <option>Full-time Program</option>
                <option>Part-time Program</option>
                <option>After-school Activity</option>
                <option>Holiday Program</option>
                <option>One-off Workshop</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Age Range</label>
              <select className="w-full mt-1 px-3 py-2 border rounded-md bg-background">
                <option>All Ages</option>
                <option>3-5 years</option>
                <option>6-8 years</option>
                <option>9-12 years</option>
                <option>13+ years</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Price (AUD)</label>
              <Input type="number" placeholder="0.00" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Billing Frequency</label>
              <select className="w-full mt-1 px-3 py-2 border rounded-md bg-background">
                <option>Per Term</option>
                <option>Per Month</option>
                <option>Per Week</option>
                <option>One-time</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Capacity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Maximum Students</label>
              <Input type="number" placeholder="20" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Current Availability</label>
              <Input type="number" placeholder="20" className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Save Draft</Button>
        <Button>Publish Offering</Button>
      </div>
    </div>
  );
}
