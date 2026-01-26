'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Presentation,
  ArrowLeft,
  Plus,
  CheckCircle2,
  Clock,
  Send,
  Eye,
  QrCode,
  FileKey2,
  ShieldCheck,
  Users,
  Copy,
  Download,
  ExternalLink,
  User,
  Building2,
  Calendar,
  Globe,
  Link2,
  Search,
  GraduationCap,
  Award,
  BookOpen,
  Heart,
  Briefcase,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const presentationStats = [
  { label: 'Total Presentations', value: '9', icon: Presentation, bgClass: 'bg-violet-500/10', iconClass: 'text-violet-500' },
  { label: 'Shared', value: '7', icon: Send, bgClass: 'bg-blue-500/10', iconClass: 'text-blue-500' },
  { label: 'Times Verified', value: '31', icon: ShieldCheck, bgClass: 'bg-emerald-500/10', iconClass: 'text-emerald-500' },
  { label: 'Unique Verifiers', value: '12', icon: Users, bgClass: 'bg-amber-500/10', iconClass: 'text-amber-500' },
];

const presentations = [
  {
    id: 'pres-1',
    name: 'Teaching Registration Bundle',
    credentials: ['Teaching Certificate', 'Working with Children Check', 'First Aid Certificate'],
    credentialCount: 3,
    createdDate: '22 Jan 2026',
    sharedWith: 'Department of Education Victoria',
    verificationCount: 8,
    status: 'active',
  },
  {
    id: 'pres-2',
    name: 'Academic Qualifications',
    credentials: ['Academic Transcript', 'Course Completion'],
    credentialCount: 2,
    createdDate: '18 Jan 2026',
    sharedWith: 'University of Sydney',
    verificationCount: 5,
    status: 'active',
  },
  {
    id: 'pres-3',
    name: 'Professional Development Record',
    credentials: ['Professional Development', 'Teaching Certificate'],
    credentialCount: 2,
    createdDate: '14 Jan 2026',
    sharedWith: 'AITSL',
    verificationCount: 3,
    status: 'active',
  },
  {
    id: 'pres-4',
    name: 'Employment Application Pack',
    credentials: ['Teaching Certificate', 'Working with Children Check', 'Academic Transcript', 'Professional Development'],
    credentialCount: 4,
    createdDate: '10 Jan 2026',
    sharedWith: 'Scotch College Melbourne',
    verificationCount: 6,
    status: 'active',
  },
  {
    id: 'pres-5',
    name: 'Compliance Verification',
    credentials: ['Working with Children Check', 'First Aid Certificate'],
    credentialCount: 2,
    createdDate: '5 Jan 2026',
    sharedWith: 'NSW Education Standards Authority',
    verificationCount: 4,
    status: 'active',
  },
  {
    id: 'pres-6',
    name: 'Graduate Application',
    credentials: ['Academic Transcript', 'Course Completion', 'Professional Development'],
    credentialCount: 3,
    createdDate: '28 Dec 2025',
    sharedWith: 'Monash University',
    verificationCount: 5,
    status: 'expired',
  },
];

const verificationLog = [
  {
    id: 'vlog-1',
    presentationName: 'Teaching Registration Bundle',
    verifier: 'Department of Education Victoria',
    verifierDID: 'did:web:education.vic.gov.au',
    verifiedAt: '27 Jan 2026, 10:30 AM',
    result: 'success',
    credentialsChecked: 3,
  },
  {
    id: 'vlog-2',
    presentationName: 'Employment Application Pack',
    verifier: 'Scotch College Melbourne',
    verifierDID: 'did:web:scotch.vic.edu.au',
    verifiedAt: '26 Jan 2026, 2:15 PM',
    result: 'success',
    credentialsChecked: 4,
  },
  {
    id: 'vlog-3',
    presentationName: 'Academic Qualifications',
    verifier: 'University of Sydney',
    verifierDID: 'did:web:sydney.edu.au',
    verifiedAt: '25 Jan 2026, 11:45 AM',
    result: 'success',
    credentialsChecked: 2,
  },
  {
    id: 'vlog-4',
    presentationName: 'Compliance Verification',
    verifier: 'NSW Education Standards Authority',
    verifierDID: 'did:web:nesa.nsw.edu.au',
    verifiedAt: '24 Jan 2026, 9:20 AM',
    result: 'partial',
    credentialsChecked: 2,
  },
  {
    id: 'vlog-5',
    presentationName: 'Professional Development Record',
    verifier: 'AITSL',
    verifierDID: 'did:web:aitsl.edu.au',
    verifiedAt: '23 Jan 2026, 3:50 PM',
    result: 'success',
    credentialsChecked: 2,
  },
  {
    id: 'vlog-6',
    presentationName: 'Teaching Registration Bundle',
    verifier: 'Melbourne Grammar School',
    verifierDID: 'did:web:melgrammar.vic.edu.au',
    verifiedAt: '22 Jan 2026, 1:10 PM',
    result: 'success',
    credentialsChecked: 3,
  },
];

const availableCredentials = [
  { id: 'sel-1', type: 'Academic Transcript', icon: GraduationCap, selected: false },
  { id: 'sel-2', type: 'Teaching Certificate', icon: Award, selected: false },
  { id: 'sel-3', type: 'Course Completion', icon: BookOpen, selected: false },
  { id: 'sel-4', type: 'Working with Children Check', icon: Heart, selected: false },
  { id: 'sel-5', type: 'Professional Development', icon: Briefcase, selected: false },
  { id: 'sel-6', type: 'First Aid Certificate', icon: Heart, selected: false },
];

function getVerificationResultBadge(result: string) {
  switch (result) {
    case 'success':
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    case 'partial':
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <Clock className="h-3 w-3 mr-1" />
          Partial
        </Badge>
      );
    default:
      return <Badge variant="secondary">{result}</Badge>;
  }
}

export default function PresentationsPage() {
  const [selectedCredentials, setSelectedCredentials] = useState<string[]>([]);
  const [presentationName, setPresentationName] = useState('');

  const toggleCredential = (id: string) => {
    setSelectedCredentials((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/ssi">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Link>
            </Button>
          </div>
          <h1 className="heading-2">Verifiable Presentations</h1>
          <p className="text-muted-foreground">
            Create, share, and track verifiable presentations with selective disclosure
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Presentation
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {presentationStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`rounded-lg ${stat.bgClass} p-3`}>
                  <Icon className={`h-6 w-6 ${stat.iconClass}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Presentation List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Presentations</CardTitle>
              <CardDescription>All verifiable presentations you have created</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search presentations..." className="pl-10" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Credentials Included</th>
                  <th className="px-4 py-3 text-left font-medium">Created Date</th>
                  <th className="px-4 py-3 text-left font-medium">Shared With</th>
                  <th className="px-4 py-3 text-left font-medium">Verifications</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {presentations.map((pres) => (
                  <tr key={pres.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Presentation className="h-4 w-4 text-violet-500 flex-shrink-0" />
                        <span className="font-medium">{pres.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {pres.credentials.map((cred) => (
                          <Badge key={cred} variant="secondary" className="text-xs">
                            {cred}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{pres.createdDate}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-muted-foreground">{pres.sharedWith}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="font-medium">{pres.verificationCount}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {pres.status === 'active' ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          Expired
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Send className="h-3.5 w-3.5 mr-1" />
                          Share
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Create Presentation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Presentation
            </CardTitle>
            <CardDescription>
              Select credentials to include in a new verifiable presentation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="pres-name">Presentation Name</Label>
              <Input
                id="pres-name"
                placeholder="e.g., Employment Application Pack"
                className="mt-1.5"
                value={presentationName}
                onChange={(e) => setPresentationName(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2 block">Select Credentials</Label>
              <div className="grid gap-2 md:grid-cols-2">
                {availableCredentials.map((cred) => {
                  const Icon = cred.icon;
                  const isSelected = selectedCredentials.includes(cred.id);
                  return (
                    <button
                      key={cred.id}
                      onClick={() => toggleCredential(cred.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                        isSelected
                          ? 'border-violet-500 bg-violet-500/5 dark:bg-violet-500/10'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className={`rounded-md p-1.5 ${isSelected ? 'bg-violet-500/10' : 'bg-muted'}`}>
                        <Icon className={`h-4 w-4 ${isSelected ? 'text-violet-500' : 'text-muted-foreground'}`} />
                      </div>
                      <span className={`text-sm font-medium ${isSelected ? 'text-violet-700 dark:text-violet-400' : ''}`}>
                        {cred.type}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 text-violet-500 ml-auto" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                {selectedCredentials.length} credential{selectedCredentials.length !== 1 ? 's' : ''} selected
              </p>
              <Button disabled={selectedCredentials.length === 0 || !presentationName.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Create Presentation
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sharing & QR Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Share Presentation
            </CardTitle>
            <CardDescription>
              Share a verifiable presentation via link, QR code, or direct transfer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Shareable Link</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <Input
                  readOnly
                  value="https://scholarly.edu.au/verify/pres-1?token=eyJhbGciOiJFZDI1..."
                  className="font-mono text-xs"
                />
                <Button variant="outline" size="sm" className="flex-shrink-0">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="mb-2 block">QR Code</Label>
              <div className="flex items-center justify-center p-8 rounded-lg border-2 border-dashed border-border bg-muted/30">
                <div className="text-center space-y-3">
                  <div className="mx-auto w-32 h-32 bg-muted rounded-lg flex items-center justify-center">
                    <QrCode className="h-16 w-16 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Select a presentation above to generate a scannable QR code
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-2 grid-cols-3">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download QR
              </Button>
              <Button variant="outline" size="sm">
                <Link2 className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Portal
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verification Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Verification Log</CardTitle>
              <CardDescription>
                Record of all verification requests against your presentations
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Log
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Presentation</th>
                  <th className="px-4 py-3 text-left font-medium">Verifier</th>
                  <th className="px-4 py-3 text-left font-medium">Verifier DID</th>
                  <th className="px-4 py-3 text-left font-medium">Verified At</th>
                  <th className="px-4 py-3 text-left font-medium">Credentials Checked</th>
                  <th className="px-4 py-3 text-left font-medium">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {verificationLog.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Presentation className="h-4 w-4 text-violet-500 flex-shrink-0" />
                        <span className="font-medium">{log.presentationName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {log.verifier}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded truncate max-w-[180px] block">
                        {log.verifierDID}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{log.verifiedAt}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{log.credentialsChecked} checked</Badge>
                    </td>
                    <td className="px-4 py-3">{getVerificationResultBadge(log.result)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
