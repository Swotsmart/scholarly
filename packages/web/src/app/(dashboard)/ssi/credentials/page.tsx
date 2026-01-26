'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FileKey2,
  ArrowLeft,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  GraduationCap,
  Award,
  BookOpen,
  Briefcase,
  Heart,
  Search,
  Eye,
  Download,
  Send,
  AlertTriangle,
  User,
  Building2,
  Calendar,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const credentialStats = [
  { label: 'My Credentials', value: '14', icon: FileKey2, bgClass: 'bg-blue-500/10', iconClass: 'text-blue-500' },
  { label: 'Issued by Me', value: '23', icon: Award, bgClass: 'bg-emerald-500/10', iconClass: 'text-emerald-500' },
  { label: 'Valid', value: '12', icon: ShieldCheck, bgClass: 'bg-green-500/10', iconClass: 'text-green-500' },
  { label: 'Expiring Soon', value: '2', icon: ShieldAlert, bgClass: 'bg-amber-500/10', iconClass: 'text-amber-500' },
];

const myCredentials = [
  {
    id: 'cred-1',
    type: 'Academic Transcript',
    icon: GraduationCap,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
    issuer: 'Melbourne Grammar School',
    issuerDID: 'did:web:melgrammar.vic.edu.au',
    issuedDate: '15 Dec 2025',
    expiryDate: '15 Dec 2030',
    status: 'valid',
    subject: 'Olivia Harper',
    description: 'Year 12 VCE Academic Transcript with ATAR score and subject results',
    claims: ['ATAR: 96.5', 'English: 42', 'Mathematics: 44', 'Physics: 40'],
  },
  {
    id: 'cred-2',
    type: 'Teaching Certificate',
    icon: Award,
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
    issuer: 'Victorian Institute of Teaching',
    issuerDID: 'did:web:vit.vic.gov.au',
    issuedDate: '1 Feb 2025',
    expiryDate: '1 Feb 2030',
    status: 'valid',
    subject: 'Olivia Harper',
    description: 'Full Registration as a Teacher in Victoria, accredited by VIT',
    claims: ['Registration: Full', 'Level: Proficient', 'Specialisation: Secondary Mathematics'],
  },
  {
    id: 'cred-3',
    type: 'Course Completion',
    icon: BookOpen,
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-500',
    issuer: 'University of Melbourne',
    issuerDID: 'did:web:unimelb.edu.au',
    issuedDate: '20 Nov 2025',
    expiryDate: 'No Expiry',
    status: 'valid',
    subject: 'Olivia Harper',
    description: 'Graduate Diploma of Education (Secondary) completion credential',
    claims: ['Program: GDipEd', 'GPA: 3.7', 'Specialisation: Mathematics & Science'],
  },
  {
    id: 'cred-4',
    type: 'Working with Children Check',
    icon: Heart,
    iconBg: 'bg-pink-500/10',
    iconColor: 'text-pink-500',
    issuer: 'NSW Government',
    issuerDID: 'did:web:ocg.nsw.gov.au',
    issuedDate: '10 Mar 2025',
    expiryDate: '15 Feb 2026',
    status: 'expiring',
    subject: 'Olivia Harper',
    description: 'NSW Working with Children Check clearance for employment',
    claims: ['Check Number: WWC0845912', 'Type: Employment', 'Clearance: Approved'],
  },
  {
    id: 'cred-5',
    type: 'First Aid Certificate',
    icon: Heart,
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-500',
    issuer: 'St John Ambulance Australia',
    issuerDID: 'did:web:stjohn.org.au',
    issuedDate: '5 Feb 2024',
    expiryDate: '5 Feb 2025',
    status: 'expired',
    subject: 'Olivia Harper',
    description: 'HLTAID011 Provide First Aid certification',
    claims: ['Unit: HLTAID011', 'CPR: Current', 'Anaphylaxis: Included'],
  },
  {
    id: 'cred-6',
    type: 'Professional Development',
    icon: Briefcase,
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-500',
    issuer: 'AITSL',
    issuerDID: 'did:web:aitsl.edu.au',
    issuedDate: '8 Jan 2026',
    expiryDate: '8 Jan 2029',
    status: 'valid',
    subject: 'Olivia Harper',
    description: 'Completed 40 hours of accredited professional development',
    claims: ['Hours: 40', 'Focus: Digital Pedagogy', 'Standards: 3.4, 6.2, 6.3'],
  },
];

const issuedByMe = [
  {
    id: 'issued-1',
    type: 'Course Completion',
    subject: 'James Nguyen',
    subjectDID: 'did:key:z6MkpTHR8VNs5xYaaLMNTXRWc75gRP5ei5k7',
    issuedDate: '25 Jan 2026',
    expiryDate: '25 Jan 2031',
    status: 'valid',
    description: 'Year 11 Advanced Mathematics completion',
  },
  {
    id: 'issued-2',
    type: 'Academic Achievement',
    subject: 'Priya Sharma',
    subjectDID: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGp',
    issuedDate: '20 Jan 2026',
    expiryDate: '20 Jan 2031',
    status: 'valid',
    description: 'Outstanding Performance in HSC Mathematics Extension 1',
  },
  {
    id: 'issued-3',
    type: 'Skill Assessment',
    subject: 'Ethan Williams',
    subjectDID: 'did:key:z6Mkf5rGMoatrSj1f4QLP1RhF3CnQHdD4xyz',
    issuedDate: '18 Jan 2026',
    expiryDate: '18 Jan 2029',
    status: 'valid',
    description: 'Mathematical Reasoning proficiency assessment',
  },
  {
    id: 'issued-4',
    type: 'Course Completion',
    subject: 'Mei Lin Chen',
    subjectDID: 'did:key:z6MkwJ4PtBfHSQp8Cda4bH3xR9DhqTem2nU5',
    issuedDate: '15 Jan 2026',
    expiryDate: '15 Jan 2031',
    status: 'valid',
    description: 'Year 10 Mathematics completion with Distinction',
  },
  {
    id: 'issued-5',
    type: 'Academic Achievement',
    subject: 'Sophie Tremblay',
    subjectDID: 'did:key:z6MkjchhfUsD6mmvni8mCdXHw76mc2MpF3Dq',
    issuedDate: '10 Jan 2026',
    expiryDate: '10 Jan 2031',
    status: 'revoked',
    description: 'Year 12 General Mathematics — credential revoked due to data error',
  },
];

function getCredentialStatusBadge(status: string) {
  switch (status) {
    case 'valid':
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Valid
        </Badge>
      );
    case 'expiring':
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Expiring Soon
        </Badge>
      );
    case 'expired':
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Expired
        </Badge>
      );
    case 'revoked':
      return (
        <Badge variant="destructive">
          <ShieldX className="h-3 w-3 mr-1" />
          Revoked
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function CredentialsPage() {
  const [activeTab, setActiveTab] = useState('held');
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<null | 'valid' | 'invalid'>(null);

  const handleVerify = () => {
    if (verifyInput.trim().length > 0) {
      setVerifyResult('valid');
    }
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
          <h1 className="heading-2">Verifiable Credentials</h1>
          <p className="text-muted-foreground">
            Manage, issue, and verify W3C Verifiable Credentials for academic records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Search className="h-4 w-4 mr-2" />
            Verify Credential
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Issue Credential
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {credentialStats.map((stat) => {
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="held">My Credentials</TabsTrigger>
          <TabsTrigger value="issued">Issued by Me</TabsTrigger>
        </TabsList>

        {/* My Credentials Tab */}
        <TabsContent value="held" className="space-y-4">
          {/* Credential Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myCredentials.map((cred) => {
              const Icon = cred.icon;
              return (
                <Card key={cred.id} className="transition-shadow hover:shadow-md">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className={`rounded-lg ${cred.iconBg} p-2.5`}>
                        <Icon className={`h-5 w-5 ${cred.iconColor}`} />
                      </div>
                      {getCredentialStatusBadge(cred.status)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{cred.type}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{cred.description}</p>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{cred.issuer}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Issued: {cred.issuedDate}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Expires: {cred.expiryDate}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {cred.claims.map((claim) => (
                        <Badge key={claim} variant="secondary" className="text-xs">
                          {claim}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button variant="ghost" size="sm" className="flex-1">
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        View
                      </Button>
                      <Button variant="ghost" size="sm" className="flex-1">
                        <Send className="h-3.5 w-3.5 mr-1" />
                        Share
                      </Button>
                      <Button variant="ghost" size="sm" className="flex-1">
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Export
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Credentials Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Credential Registry</CardTitle>
              <CardDescription>Complete list of all held credentials</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Type</th>
                      <th className="px-4 py-3 text-left font-medium">Issuer</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Issued Date</th>
                      <th className="px-4 py-3 text-left font-medium">Expiry</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {myCredentials.map((cred) => {
                      const Icon = cred.icon;
                      return (
                        <tr key={cred.id} className="hover:bg-muted/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${cred.iconColor} flex-shrink-0`} />
                              <span className="font-medium">{cred.type}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{cred.issuer}</td>
                          <td className="px-4 py-3">{getCredentialStatusBadge(cred.status)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{cred.issuedDate}</td>
                          <td className="px-4 py-3 text-muted-foreground">{cred.expiryDate}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm">View</Button>
                              <Button variant="ghost" size="sm">Share</Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Issued by Me Tab */}
        <TabsContent value="issued" className="space-y-4">
          {/* Issue Credential Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Issue New Credential
              </CardTitle>
              <CardDescription>
                Create and issue a new verifiable credential to a learner or staff member
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label htmlFor="cred-type">Credential Type</Label>
                  <Input id="cred-type" placeholder="e.g., Course Completion" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="subject-name">Subject Name</Label>
                  <Input id="subject-name" placeholder="e.g., James Nguyen" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="subject-did">Subject DID</Label>
                  <Input id="subject-did" placeholder="did:key:z6Mk..." className="mt-1.5 font-mono text-xs" />
                </div>
                <div className="flex items-end">
                  <Button className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Issue Credential
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Issued Credentials Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Issued Credentials</CardTitle>
              <CardDescription>Credentials you have issued to learners and staff</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Type</th>
                      <th className="px-4 py-3 text-left font-medium">Subject</th>
                      <th className="px-4 py-3 text-left font-medium">Description</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Issued Date</th>
                      <th className="px-4 py-3 text-left font-medium">Expiry</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {issuedByMe.map((cred) => (
                      <tr key={cred.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Award className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                            <span className="font-medium">{cred.type}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {cred.subject}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                          {cred.description}
                        </td>
                        <td className="px-4 py-3">{getCredentialStatusBadge(cred.status)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{cred.issuedDate}</td>
                        <td className="px-4 py-3 text-muted-foreground">{cred.expiryDate}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm">View</Button>
                            {cred.status === 'valid' && (
                              <Button variant="ghost" size="sm" className="text-red-600">Revoke</Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Verify Credential Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-3">
              <Shield className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Verify Credential</CardTitle>
              <CardDescription>
                Paste a verifiable credential JSON or JWT to validate its authenticity and status
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Paste credential JWT or JSON-LD document..."
                value={verifyInput}
                onChange={(e) => {
                  setVerifyInput(e.target.value);
                  setVerifyResult(null);
                }}
                className="font-mono text-xs"
              />
            </div>
            <Button onClick={handleVerify}>
              <ShieldCheck className="h-4 w-4 mr-2" />
              Verify
            </Button>
          </div>
          {verifyResult === 'valid' && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/40">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-400">Credential Verified</p>
                <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                  The credential signature is valid, the issuer DID is resolvable, and the credential has not been revoked.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
