'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Star, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

export default function HostingQualityPage() {
  const metrics = [
    { label: 'Overall Rating', value: '4.8', max: '5.0', trend: '+0.2' },
    { label: 'Parent Satisfaction', value: '92%', trend: '+5%' },
    { label: 'Student Engagement', value: '88%', trend: '+3%' },
    { label: 'Curriculum Compliance', value: '95%', trend: '+2%' },
  ];

  const checklist = [
    { item: 'Registration documents current', status: 'complete' },
    { item: 'Insurance certificates uploaded', status: 'complete' },
    { item: 'Staff qualifications verified', status: 'complete' },
    { item: 'Safety inspection due', status: 'attention' },
    { item: 'Annual review scheduled', status: 'pending' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quality Assurance</h1>
        <p className="text-muted-foreground">Monitor and maintain your micro-school standards</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold">{metric.value}</div>
                {metric.max && <div className="text-sm text-muted-foreground">of {metric.max}</div>}
                <p className="text-sm text-muted-foreground mt-1">{metric.label}</p>
                <p className="text-xs text-green-500 mt-1">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  {metric.trend}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Compliance Checklist
            </CardTitle>
            <CardDescription>Required items for operation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {checklist.map((item) => (
                <div key={item.item} className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="text-sm">{item.item}</span>
                  {item.status === 'complete' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : item.status === 'attention' ? (
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-muted" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Recent Reviews
            </CardTitle>
            <CardDescription>What families are saying</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm">&ldquo;Amazing personalized attention for our daughter.&rdquo;</p>
                <p className="text-xs text-muted-foreground mt-1">— Parent, Year 2</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-1 mb-1">
                  {[1, 2, 3, 4].map((star) => (
                    <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                  <Star className="h-4 w-4 text-yellow-400" />
                </div>
                <p className="text-sm">&ldquo;Great curriculum flexibility.&rdquo;</p>
                <p className="text-xs text-muted-foreground mt-1">— Parent, Year 5</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
