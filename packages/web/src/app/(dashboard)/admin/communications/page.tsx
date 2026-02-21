'use client';

import { useState } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Mail, MessageSquare, Phone, FileText, CheckCircle2, XCircle,
  Send, Shield, ExternalLink, Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';

type EmailProvider = 'gmail' | 'outlook' | 'zimbra' | null;
type SmsProvider = 'twilio' | 'vonage' | null;
type WhatsAppProvider = 'twilio-whatsapp' | 'meta-cloud' | null;

interface ProviderStatus {
  configured: boolean;
  provider: string | null;
}

export default function AdminCommunicationsPage() {
  // Provider selections
  const [emailProvider, setEmailProvider] = useState<EmailProvider>(null);
  const [smsProvider, setSmsProvider] = useState<SmsProvider>(null);
  const [whatsappProvider, setWhatsappProvider] = useState<WhatsAppProvider>(null);

  // Credentials
  const [smsCredentials, setSmsCredentials] = useState({ accountSid: '', authToken: '', fromNumber: '' });
  const [whatsappCredentials, setWhatsappCredentials] = useState({ accountSid: '', authToken: '', fromNumber: '' });

  // Test send states
  const [testEmailTo, setTestEmailTo] = useState('');
  const [testSmsTo, setTestSmsTo] = useState('');
  const [testWhatsappTo, setTestWhatsappTo] = useState('');
  const [sending, setSending] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ channel: string; success: boolean; message: string } | null>(null);

  const handleSaveConfig = async () => {
    await api.adminComms.updateConfig({
      emailProvider,
      smsProvider,
      smsCredentials: smsProvider ? smsCredentials : undefined,
      whatsappProvider,
      whatsappCredentials: whatsappProvider ? whatsappCredentials : undefined,
    });
  };

  const handleTestEmail = async () => {
    setSending('email');
    setTestResult(null);
    try {
      const res = await api.adminComms.testEmail({
        to: testEmailTo,
        subject: 'Scholarly - Test Email',
        body: 'This is a test email from Scholarly Communications.',
      });
      setTestResult({
        channel: 'email',
        success: res.success,
        message: res.success ? 'Test email sent successfully' : 'Failed to send test email',
      });
    } catch {
      setTestResult({ channel: 'email', success: false, message: 'Failed to send test email' });
    } finally {
      setSending(null);
    }
  };

  const handleTestSms = async () => {
    setSending('sms');
    setTestResult(null);
    try {
      const res = await api.adminComms.testSms({
        to: testSmsTo,
        message: 'Scholarly test SMS - communications configured successfully.',
      });
      setTestResult({
        channel: 'sms',
        success: res.success,
        message: res.success ? 'Test SMS sent successfully' : 'Failed to send test SMS',
      });
    } catch {
      setTestResult({ channel: 'sms', success: false, message: 'Failed to send test SMS' });
    } finally {
      setSending(null);
    }
  };

  const handleTestWhatsapp = async () => {
    setSending('whatsapp');
    setTestResult(null);
    try {
      const res = await api.adminComms.testWhatsapp({
        to: testWhatsappTo,
        message: 'Scholarly test WhatsApp - communications configured successfully.',
      });
      setTestResult({
        channel: 'whatsapp',
        success: res.success,
        message: res.success ? 'Test WhatsApp sent successfully' : 'Failed to send test message',
      });
    } catch {
      setTestResult({ channel: 'whatsapp', success: false, message: 'Failed to send test message' });
    } finally {
      setSending(null);
    }
  };

  const statuses: ProviderStatus[] = [
    { configured: !!emailProvider, provider: emailProvider },
    { configured: !!smsProvider, provider: smsProvider },
    { configured: !!whatsappProvider, provider: whatsappProvider },
  ];
  const configuredCount = statuses.filter((s) => s.configured).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Communications</h1>
        <p className="text-muted-foreground">
          Configure email, SMS, and WhatsApp providers for your institution.
        </p>
      </div>

      {/* Status summary */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Email', icon: Mail, provider: emailProvider, color: 'blue' },
          { label: 'SMS', icon: Phone, provider: smsProvider, color: 'green' },
          { label: 'WhatsApp', icon: MessageSquare, provider: whatsappProvider, color: 'emerald' },
        ].map(({ label, icon: Icon, provider, color }) => (
          <Card key={label}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`rounded-lg bg-${color}-500/10 p-3`}>
                  <Icon className={`h-6 w-6 text-${color}-500`} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{label}</p>
                  <p className="text-sm text-muted-foreground">
                    {provider || 'Not configured'}
                  </p>
                </div>
                {provider ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground/40" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabbed configuration */}
      <Tabs defaultValue="email" className="space-y-4">
        <TabsList>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="sms" className="gap-2">
            <Phone className="h-4 w-4" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* EMAIL TAB */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Email Provider</CardTitle>
              <CardDescription>
                Connect an email provider for sending and receiving school communications.
                OAuth-based providers (Gmail, Outlook) will redirect you to authorise access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={emailProvider || ''}
                  onValueChange={(v) => setEmailProvider(v as EmailProvider)}
                >
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Select email provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gmail">Gmail (Google Workspace)</SelectItem>
                    <SelectItem value="outlook">Outlook 365</SelectItem>
                    <SelectItem value="zimbra">Zimbra</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {emailProvider && (
                <div className="space-y-4">
                  {(emailProvider === 'gmail' || emailProvider === 'outlook') && (
                    <div className="rounded-lg border bg-muted/50 p-4">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">OAuth Authentication</p>
                          <p className="text-xs text-muted-foreground">
                            Click connect to authorise Scholarly to access your {emailProvider === 'gmail' ? 'Google' : 'Microsoft'} account.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            // TODO: Wire to api.integrations.getAuthUrl(emailProvider)
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Connect
                        </Button>
                      </div>
                    </div>
                  )}

                  {emailProvider === 'zimbra' && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="zimbra-host">Zimbra Server URL</Label>
                        <Input id="zimbra-host" placeholder="https://mail.school.edu.au" />
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="zimbra-user">Admin Username</Label>
                          <Input id="zimbra-user" placeholder="admin@school.edu.au" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="zimbra-pass">Admin Password</Label>
                          <Input id="zimbra-pass" type="password" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Test email */}
                  <div className="border-t pt-4 space-y-3">
                    <Label>Send test email</Label>
                    <div className="flex gap-2">
                      <Input
                        value={testEmailTo}
                        onChange={(e) => setTestEmailTo(e.target.value)}
                        placeholder="test@example.com"
                        type="email"
                        className="max-w-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleTestEmail}
                        disabled={!testEmailTo || sending === 'email'}
                      >
                        {sending === 'email' ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Send Test
                      </Button>
                    </div>
                    {testResult?.channel === 'email' && (
                      <p className={`text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                        {testResult.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSaveConfig}>Save Email Configuration</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS TAB */}
        <TabsContent value="sms">
          <Card>
            <CardHeader>
              <CardTitle>SMS Provider</CardTitle>
              <CardDescription>
                Configure an SMS gateway for sending notifications, reminders, and alerts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={smsProvider || ''}
                  onValueChange={(v) => setSmsProvider(v as SmsProvider)}
                >
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Select SMS provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="twilio">Twilio</SelectItem>
                    <SelectItem value="vonage">Vonage (Nexmo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {smsProvider && (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="sms-sid">
                        {smsProvider === 'twilio' ? 'Account SID' : 'API Key'}
                      </Label>
                      <Input
                        id="sms-sid"
                        value={smsCredentials.accountSid}
                        onChange={(e) => setSmsCredentials({ ...smsCredentials, accountSid: e.target.value })}
                        placeholder={smsProvider === 'twilio' ? 'AC...' : 'Your API key'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sms-token">
                        {smsProvider === 'twilio' ? 'Auth Token' : 'API Secret'}
                      </Label>
                      <Input
                        id="sms-token"
                        type="password"
                        value={smsCredentials.authToken}
                        onChange={(e) => setSmsCredentials({ ...smsCredentials, authToken: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sms-from">
                      {smsProvider === 'twilio' ? 'From Number / Messaging Service SID' : 'From Number'}
                    </Label>
                    <Input
                      id="sms-from"
                      value={smsCredentials.fromNumber}
                      onChange={(e) => setSmsCredentials({ ...smsCredentials, fromNumber: e.target.value })}
                      placeholder="+61400000000"
                    />
                  </div>

                  {/* Test SMS */}
                  <div className="border-t pt-4 space-y-3">
                    <Label>Send test SMS</Label>
                    <div className="flex gap-2">
                      <Input
                        value={testSmsTo}
                        onChange={(e) => setTestSmsTo(e.target.value)}
                        placeholder="+61400000000"
                        className="max-w-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleTestSms}
                        disabled={!testSmsTo || sending === 'sms'}
                      >
                        {sending === 'sms' ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Send Test
                      </Button>
                    </div>
                    {testResult?.channel === 'sms' && (
                      <p className={`text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                        {testResult.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSaveConfig}>Save SMS Configuration</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WHATSAPP TAB */}
        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Business</CardTitle>
              <CardDescription>
                Configure WhatsApp for family communication, appointment reminders, and urgent notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={whatsappProvider || ''}
                  onValueChange={(v) => setWhatsappProvider(v as WhatsAppProvider)}
                >
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Select WhatsApp provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="twilio-whatsapp">Twilio WhatsApp Business API</SelectItem>
                    <SelectItem value="meta-cloud">Meta Cloud API</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {whatsappProvider && (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="wa-sid">
                        {whatsappProvider === 'twilio-whatsapp' ? 'Account SID' : 'App ID'}
                      </Label>
                      <Input
                        id="wa-sid"
                        value={whatsappCredentials.accountSid}
                        onChange={(e) => setWhatsappCredentials({ ...whatsappCredentials, accountSid: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wa-token">
                        {whatsappProvider === 'twilio-whatsapp' ? 'Auth Token' : 'Access Token'}
                      </Label>
                      <Input
                        id="wa-token"
                        type="password"
                        value={whatsappCredentials.authToken}
                        onChange={(e) => setWhatsappCredentials({ ...whatsappCredentials, authToken: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wa-from">
                      {whatsappProvider === 'twilio-whatsapp' ? 'WhatsApp Number' : 'Phone Number ID'}
                    </Label>
                    <Input
                      id="wa-from"
                      value={whatsappCredentials.fromNumber}
                      onChange={(e) => setWhatsappCredentials({ ...whatsappCredentials, fromNumber: e.target.value })}
                      placeholder={whatsappProvider === 'twilio-whatsapp' ? 'whatsapp:+14155238886' : '123456789'}
                    />
                  </div>

                  {/* Test WhatsApp */}
                  <div className="border-t pt-4 space-y-3">
                    <Label>Send test message</Label>
                    <div className="flex gap-2">
                      <Input
                        value={testWhatsappTo}
                        onChange={(e) => setTestWhatsappTo(e.target.value)}
                        placeholder="+61400000000"
                        className="max-w-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleTestWhatsapp}
                        disabled={!testWhatsappTo || sending === 'whatsapp'}
                      >
                        {sending === 'whatsapp' ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Send Test
                      </Button>
                    </div>
                    {testResult?.channel === 'whatsapp' && (
                      <p className={`text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                        {testResult.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSaveConfig}>Save WhatsApp Configuration</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TEMPLATES TAB */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Notification Templates</CardTitle>
              <CardDescription>
                View and customise message templates used for automated notifications.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Welcome Email', type: 'auth_verification', channels: ['email'], description: 'Sent when a new user registers' },
                  { name: 'Password Reset', type: 'auth_password_reset', channels: ['email'], description: 'Password reset confirmation' },
                  { name: 'Assignment Due', type: 'learning_assignment_due', channels: ['email', 'push', 'sms'], description: 'Reminder before an assignment is due' },
                  { name: 'Grade Published', type: 'learning_grade_published', channels: ['email', 'push'], description: 'Notifies student when a grade is posted' },
                  { name: 'Attendance Alert', type: 'parent_attendance_alert', channels: ['email', 'sms', 'whatsapp'], description: 'Alerts parent about student absence' },
                  { name: 'Payment Receipt', type: 'payment_receipt', channels: ['email'], description: 'Payment confirmation and receipt' },
                  { name: 'Session Reminder', type: 'tutoring_session_reminder', channels: ['email', 'sms', 'whatsapp'], description: 'Upcoming tutoring session reminder' },
                  { name: 'Wellbeing Alert', type: 'wellbeing_alert', channels: ['email', 'push'], description: 'Triggered by wellbeing monitoring system' },
                ].map((template) => (
                  <div
                    key={template.type}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{template.name}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {template.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{template.description}</p>
                      <div className="flex gap-1 pt-1">
                        {template.channels.map((ch) => (
                          <Badge key={ch} variant="secondary" className="text-[10px]">
                            {ch}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
