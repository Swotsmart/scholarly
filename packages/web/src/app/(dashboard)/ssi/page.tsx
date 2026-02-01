'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Fingerprint,
  ShieldCheck,
  Wallet,
  FileKey2,
  Presentation,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  RefreshCw,
  KeyRound,
  Send,
  Eye,
  XCircle,
  QrCode,
  Share2,
  ScanLine,
  Download,
  Upload,
  Lock,
  Key,
  Building2,
  Calendar,
  User,
  GraduationCap,
  Award,
  Heart,
  Briefcase,
  BookOpen,
  Shield,
  AlertTriangle,
  Camera,
  Copy,
  ExternalLink,
  HardDrive,
  Cloud,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const STATS = [
  { label: 'Total Credentials', value: '14', icon: FileKey2, bgClass: 'bg-blue-500/10', iconClass: 'text-blue-500' },
  { label: 'Verified', value: '12', icon: ShieldCheck, bgClass: 'bg-emerald-500/10', iconClass: 'text-emerald-500' },
  { label: 'Shared This Month', value: '7', icon: Share2, bgClass: 'bg-violet-500/10', iconClass: 'text-violet-500' },
  { label: 'Verification Rate', value: '97.3%', icon: CheckCircle2, bgClass: 'bg-amber-500/10', iconClass: 'text-amber-500' },
];

const MY_CREDENTIALS = [
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
    status: 'valid' as const,
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
    status: 'valid' as const,
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
    status: 'valid' as const,
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
    status: 'expiring' as const,
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
    status: 'expired' as const,
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
    status: 'valid' as const,
    subject: 'Olivia Harper',
    description: 'Completed 40 hours of accredited professional development',
    claims: ['Hours: 40', 'Focus: Digital Pedagogy', 'Standards: 3.4, 6.2, 6.3'],
  },
];

const SHARING_HISTORY = [
  {
    id: 'share-1',
    credential: 'Teaching Certificate',
    recipient: 'AITSL',
    sharedDate: '24 Jan 2026',
    expiresDate: '24 Feb 2026',
    disclosedFields: ['Registration Status', 'Level', 'Specialisation'],
    status: 'active' as const,
  },
  {
    id: 'share-2',
    credential: 'Academic Transcript',
    recipient: 'University of Sydney',
    sharedDate: '21 Jan 2026',
    expiresDate: '21 Jan 2026',
    disclosedFields: ['ATAR Score', 'Subject Results'],
    status: 'expired' as const,
  },
  {
    id: 'share-3',
    credential: 'Working with Children Check',
    recipient: 'Sydney Grammar School',
    sharedDate: '15 Jan 2026',
    expiresDate: '15 Apr 2026',
    disclosedFields: ['Check Number', 'Clearance Status'],
    status: 'active' as const,
  },
];

const BACKUP_STATUS = {
  lastBackup: '25 Jan 2026, 3:45 PM',
  backupLocation: 'Google Drive',
  encryptionStatus: 'AES-256 Encrypted',
  totalCredentials: 14,
  totalKeys: 8,
  storageUsed: '2.3 MB',
};

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
          <XCircle className="h-3 w-3 mr-1" />
          Revoked
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function CredentialWalletPage() {
  const [activeTab, setActiveTab] = useState('credentials');
  const [selectedCredential, setSelectedCredential] = useState<typeof MY_CREDENTIALS[0] | null>(null);
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<null | 'valid' | 'invalid'>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  const handleVerify = () => {
    if (verifyInput.trim().length > 0) {
      setVerifyResult('valid');
    }
  };

  const validCredentials = MY_CREDENTIALS.filter((c) => c.status === 'valid').length;
  const expiringCredentials = MY_CREDENTIALS.filter((c) => c.status === 'expiring').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Credential Wallet</h1>
          <p className="text-muted-foreground">
            Manage your decentralised identity and verifiable credentials
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/ssi/wallet">
              <Wallet className="mr-2 h-4 w-4" />
              Open DID Wallet
            </Link>
          </Button>
          <Button asChild>
            <Link href="/ssi/credentials">
              <Plus className="mr-2 h-4 w-4" />
              Add Credential
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => {
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

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="credentials" className="flex items-center gap-2">
            <FileKey2 className="h-4 w-4" />
            <span className="hidden sm:inline">Credentials</span>
          </TabsTrigger>
          <TabsTrigger value="detail" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Detail</span>
          </TabsTrigger>
          <TabsTrigger value="share" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            <span className="hidden sm:inline">Share</span>
          </TabsTrigger>
          <TabsTrigger value="verify" className="flex items-center gap-2">
            <ScanLine className="h-4 w-4" />
            <span className="hidden sm:inline">Verify</span>
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            <span className="hidden sm:inline">Backup</span>
          </TabsTrigger>
        </TabsList>

        {/* Credentials Tab - Card Gallery */}
        <TabsContent value="credentials" className="space-y-4">
          {/* Alerts */}
          {expiringCredentials > 0 && (
            <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="font-semibold">Credentials Expiring Soon</p>
                    <p className="text-sm text-muted-foreground">
                      {expiringCredentials} credential(s) will expire within 30 days. Consider renewing them.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Credential Cards Gallery */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {MY_CREDENTIALS.map((cred) => {
              const Icon = cred.icon;
              return (
                <Card
                  key={cred.id}
                  className={`cursor-pointer transition-shadow hover:shadow-lg ${
                    selectedCredential?.id === cred.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => {
                    setSelectedCredential(cred);
                    setActiveTab('detail');
                  }}
                >
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
                      {cred.claims.slice(0, 3).map((claim) => (
                        <Badge key={claim} variant="secondary" className="text-xs">
                          {claim}
                        </Badge>
                      ))}
                      {cred.claims.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{cred.claims.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center">
            <Link href="/ssi/credentials">
              <Button variant="outline">
                View All Credentials
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </TabsContent>

        {/* Detail Tab */}
        <TabsContent value="detail" className="space-y-4">
          {selectedCredential ? (
            <>
              {/* Selected Credential Detail */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`rounded-lg ${selectedCredential.iconBg} p-4`}>
                        <selectedCredential.icon className={`h-8 w-8 ${selectedCredential.iconColor}`} />
                      </div>
                      <div>
                        <CardTitle>{selectedCredential.type}</CardTitle>
                        <CardDescription className="mt-1">{selectedCredential.description}</CardDescription>
                      </div>
                    </div>
                    {getCredentialStatusBadge(selectedCredential.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Issuer Info */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">Issuer Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Issuer</span>
                          <span className="font-medium">{selectedCredential.issuer}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Issuer DID</span>
                          <span className="font-mono text-xs truncate max-w-[200px]">{selectedCredential.issuerDID}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">Validity</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Issued Date</span>
                          <span className="font-medium">{selectedCredential.issuedDate}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Expiry Date</span>
                          <span className="font-medium">{selectedCredential.expiryDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Claims */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Credential Claims</h4>
                    <div className="grid gap-2 md:grid-cols-2">
                      {selectedCredential.claims.map((claim) => (
                        <div key={claim} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span className="text-sm">{claim}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Verification Status */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Verification Status</h4>
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/40">
                      <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-400">
                          Cryptographically Verified
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                          This credential's signature is valid and the issuer DID is resolvable.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedFields(selectedCredential.claims);
                        setActiveTab('share');
                      }}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button variant="outline">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy DID
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg">No Credential Selected</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Select a credential from the Credentials tab to view its details
                </p>
                <Button variant="outline" className="mt-4" onClick={() => setActiveTab('credentials')}>
                  Browse Credentials
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Share Tab */}
        <TabsContent value="share" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* QR Code Generation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Share via QR Code
                </CardTitle>
                <CardDescription>
                  Generate a QR code for selective disclosure presentation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Credential Selection */}
                <div className="space-y-2">
                  <Label>Select Credential</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedCredential?.id || ''}
                    onChange={(e) => {
                      const cred = MY_CREDENTIALS.find((c) => c.id === e.target.value);
                      setSelectedCredential(cred || null);
                      if (cred) setSelectedFields(cred.claims);
                    }}
                  >
                    <option value="">Choose a credential...</option>
                    {MY_CREDENTIALS.filter((c) => c.status === 'valid').map((cred) => (
                      <option key={cred.id} value={cred.id}>
                        {cred.type} - {cred.issuer}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selective Disclosure */}
                {selectedCredential && (
                  <div className="space-y-3">
                    <Label>Selective Disclosure - Choose fields to share</Label>
                    <div className="space-y-2">
                      {selectedCredential.claims.map((claim) => (
                        <div key={claim} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={claim}
                            checked={selectedFields.includes(claim)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFields([...selectedFields, claim]);
                              } else {
                                setSelectedFields(selectedFields.filter((f) => f !== claim));
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor={claim} className="text-sm cursor-pointer">
                            {claim}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* QR Code Preview */}
                <div className="flex flex-col items-center p-6 bg-muted/50 rounded-lg">
                  {selectedCredential && selectedFields.length > 0 ? (
                    <>
                      <div className="h-48 w-48 bg-white rounded-lg flex items-center justify-center border">
                        <QrCode className="h-32 w-32 text-gray-800" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 text-center">
                        Sharing {selectedFields.length} field(s) from {selectedCredential.type}
                      </p>
                    </>
                  ) : (
                    <div className="text-center">
                      <QrCode className="h-16 w-16 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Select a credential and fields to generate QR code
                      </p>
                    </div>
                  )}
                </div>

                <Button className="w-full" disabled={!selectedCredential || selectedFields.length === 0}>
                  <QrCode className="h-4 w-4 mr-2" />
                  Generate Presentation
                </Button>
              </CardContent>
            </Card>

            {/* Sharing History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Sharing History
                </CardTitle>
                <CardDescription>Recent credential presentations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-0 divide-y">
                  {SHARING_HISTORY.map((share) => (
                    <div key={share.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium">{share.credential}</p>
                          <p className="text-xs text-muted-foreground">Shared with {share.recipient}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {share.sharedDate} - Expires: {share.expiresDate}
                          </p>
                        </div>
                        {share.status === 'active' ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Expired</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {share.disclosedFields.map((field) => (
                          <Badge key={field} variant="outline" className="text-xs">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Verify Tab */}
        <TabsContent value="verify" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Scan to Verify */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Scan to Verify
                </CardTitle>
                <CardDescription>
                  Scan a QR code to verify someone else's credential
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center p-8 bg-muted/50 rounded-lg border-2 border-dashed">
                  <ScanLine className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-sm font-medium">Point camera at QR code</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Or click below to enable camera access
                  </p>
                  <Button className="mt-4">
                    <Camera className="h-4 w-4 mr-2" />
                    Enable Camera
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Manual Verification */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Manual Verification
                </CardTitle>
                <CardDescription>
                  Paste a verifiable credential or presentation to verify
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Credential JWT or JSON-LD</Label>
                  <Input
                    placeholder="Paste credential here..."
                    value={verifyInput}
                    onChange={(e) => {
                      setVerifyInput(e.target.value);
                      setVerifyResult(null);
                    }}
                    className="font-mono text-xs"
                  />
                </div>
                <Button onClick={handleVerify} className="w-full">
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Verify Credential
                </Button>

                {verifyResult === 'valid' && (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/40">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">Credential Verified</p>
                      <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                        The credential signature is valid and the issuer DID is resolvable.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Verification Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How Verification Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 h-8 w-8 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Scan or Paste</p>
                    <p className="text-xs text-muted-foreground">Scan a QR code or paste credential data</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 h-8 w-8 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Check Signature</p>
                    <p className="text-xs text-muted-foreground">Verify cryptographic signature</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 h-8 w-8 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Resolve Issuer</p>
                    <p className="text-xs text-muted-foreground">Verify issuer DID is valid</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 h-8 w-8 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">4</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Check Status</p>
                    <p className="text-xs text-muted-foreground">Ensure not revoked or expired</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup Tab */}
        <TabsContent value="backup" className="space-y-4">
          {/* Backup Status */}
          <Card className="border-green-500/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-500/10 p-3">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <CardTitle>Backup Status</CardTitle>
                    <CardDescription>Your wallet is securely backed up</CardDescription>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Up to Date
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Last Backup</p>
                  <p className="font-medium">{BACKUP_STATUS.lastBackup}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{BACKUP_STATUS.backupLocation}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Encryption</p>
                  <p className="font-medium">{BACKUP_STATUS.encryptionStatus}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Backup Contents */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-blue-500/10 p-3">
                  <FileKey2 className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{BACKUP_STATUS.totalCredentials}</p>
                  <p className="text-sm text-muted-foreground">Credentials</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-purple-500/10 p-3">
                  <Key className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{BACKUP_STATUS.totalKeys}</p>
                  <p className="text-sm text-muted-foreground">Key Pairs</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-amber-500/10 p-3">
                  <HardDrive className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{BACKUP_STATUS.storageUsed}</p>
                  <p className="text-sm text-muted-foreground">Storage Used</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Backup Options */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Cloud className="h-5 w-5" />
                  Cloud Backup
                </CardTitle>
                <CardDescription>Automatic encrypted backup to cloud storage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-blue-500/10 flex items-center justify-center">
                        <Cloud className="h-4 w-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Google Drive</p>
                        <p className="text-xs text-muted-foreground">Connected</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                        <Cloud className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">iCloud</p>
                        <p className="text-xs text-muted-foreground">Not connected</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Connect
                    </Button>
                  </div>
                </div>
                <Button className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Backup Now
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Download className="h-5 w-5" />
                  Local Backup
                </CardTitle>
                <CardDescription>Download an encrypted backup file</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 border-2 border-dashed text-center">
                  <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium">Encrypted Backup</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your backup will be encrypted with your recovery phrase
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Encryption Password</Label>
                  <Input type="password" placeholder="Enter a strong password" />
                  <p className="text-xs text-muted-foreground">
                    Store this password securely. You'll need it to restore your backup.
                  </p>
                </div>
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download Backup
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Restore */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="h-5 w-5" />
                Restore from Backup
              </CardTitle>
              <CardDescription>Restore your credentials from a backup file</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1 p-4 rounded-lg border-2 border-dashed text-center">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm">Drop backup file here or click to browse</p>
                </div>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Backup
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
