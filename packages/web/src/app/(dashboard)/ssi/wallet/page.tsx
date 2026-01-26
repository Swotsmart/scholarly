'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Wallet,
  ArrowLeft,
  Lock,
  Unlock,
  Plus,
  RefreshCw,
  Download,
  Upload,
  Key,
  Fingerprint,
  ShieldCheck,
  Copy,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Cloud,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const walletInfo = {
  address: '0x7a3B...F92d',
  fullAddress: '0x7a3B4cE1D8f6A29b5C0e8347dF1892dE4bC5F92d',
  status: 'unlocked' as const,
  createdAt: '15 Mar 2025',
  lastAccessed: '27 Jan 2026, 9:12 AM',
  encryptionAlgorithm: 'AES-256-GCM',
  totalDIDs: 6,
  totalKeyPairs: 8,
};

const dids = [
  {
    id: 'did-1',
    did: 'did:web:scholarly.edu.au:users:olivia-harper',
    method: 'did:web',
    status: 'active',
    created: '15 Mar 2025',
    lastRotated: '23 Jan 2026',
    keyType: 'Ed25519',
    isPrimary: true,
  },
  {
    id: 'did-2',
    did: 'did:key:z6Mkf5rGMoatrSj1f4QLP1RhF3CnQHdD4',
    method: 'did:key',
    status: 'active',
    created: '20 Apr 2025',
    lastRotated: '10 Dec 2025',
    keyType: 'Ed25519',
    isPrimary: false,
  },
  {
    id: 'did-3',
    did: 'did:ethr:0x7a3B4cE1D8f6A29b5C0e8347dF189',
    method: 'did:ethr',
    status: 'active',
    created: '5 Jun 2025',
    lastRotated: '5 Nov 2025',
    keyType: 'secp256k1',
    isPrimary: false,
  },
  {
    id: 'did-4',
    did: 'did:web:scholarly.edu.au:institutions:melbourne-grammar',
    method: 'did:web',
    status: 'active',
    created: '12 Jul 2025',
    lastRotated: '12 Jan 2026',
    keyType: 'Ed25519',
    isPrimary: false,
  },
  {
    id: 'did-5',
    did: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGp',
    method: 'did:key',
    status: 'inactive',
    created: '1 Sep 2025',
    lastRotated: 'Never',
    keyType: 'X25519',
    isPrimary: false,
  },
  {
    id: 'did-6',
    did: 'did:web:scholarly.edu.au:staff:teaching-cert',
    method: 'did:web',
    status: 'active',
    created: '18 Oct 2025',
    lastRotated: '18 Jan 2026',
    keyType: 'Ed25519',
    isPrimary: false,
  },
];

const keyPairs = [
  {
    id: 'key-1',
    name: 'Primary Signing Key',
    algorithm: 'Ed25519',
    usage: 'Signing & Authentication',
    created: '15 Mar 2025',
    lastUsed: '27 Jan 2026',
    associatedDID: 'did:web:scholarly.edu.au:users:olivia-harper',
    status: 'active',
  },
  {
    id: 'key-2',
    name: 'Credential Issuance Key',
    algorithm: 'Ed25519',
    usage: 'Credential Signing',
    created: '20 Apr 2025',
    lastUsed: '25 Jan 2026',
    associatedDID: 'did:key:z6Mkf5rGMoatrSj1f4QLP1RhF3CnQHdD4',
    status: 'active',
  },
  {
    id: 'key-3',
    name: 'Ethereum Identity Key',
    algorithm: 'secp256k1',
    usage: 'Blockchain Transactions',
    created: '5 Jun 2025',
    lastUsed: '14 Jan 2026',
    associatedDID: 'did:ethr:0x7a3B4cE1D8f6A29b5C0e8347dF189',
    status: 'active',
  },
  {
    id: 'key-4',
    name: 'Key Agreement Key',
    algorithm: 'X25519',
    usage: 'Encryption',
    created: '1 Sep 2025',
    lastUsed: '3 Dec 2025',
    associatedDID: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGp',
    status: 'inactive',
  },
];

const backupInfo = {
  lastBackup: '20 Jan 2026, 3:45 PM',
  backupLocation: 'Encrypted Cloud Storage (AWS S3)',
  backupSize: '2.4 KB',
  autoBackup: true,
  recoveryMethod: 'BIP-39 Mnemonic Phrase (24 words)',
  backupHistory: [
    { date: '20 Jan 2026', type: 'Automatic', status: 'success' },
    { date: '13 Jan 2026', type: 'Manual', status: 'success' },
    { date: '6 Jan 2026', type: 'Automatic', status: 'success' },
    { date: '30 Dec 2025', type: 'Automatic', status: 'success' },
  ],
};

const walletStats = [
  { label: 'Total DIDs', value: '6', icon: Fingerprint, bgClass: 'bg-blue-500/10', iconClass: 'text-blue-500' },
  { label: 'Key Pairs', value: '8', icon: Key, bgClass: 'bg-violet-500/10', iconClass: 'text-violet-500' },
  { label: 'Credentials Stored', value: '14', icon: ShieldCheck, bgClass: 'bg-emerald-500/10', iconClass: 'text-emerald-500' },
  { label: 'Last Backup', value: '7d ago', icon: Cloud, bgClass: 'bg-amber-500/10', iconClass: 'text-amber-500' },
];

function getMethodBadge(method: string) {
  switch (method) {
    case 'did:web':
      return (
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          did:web
        </Badge>
      );
    case 'did:key':
      return (
        <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
          did:key
        </Badge>
      );
    case 'did:ethr':
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          did:ethr
        </Badge>
      );
    default:
      return <Badge variant="secondary">{method}</Badge>;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          Active
        </Badge>
      );
    case 'inactive':
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          Inactive
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function WalletPage() {
  const [isLocked, setIsLocked] = useState(false);

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
          <h1 className="heading-2">Digital Wallet</h1>
          <p className="text-muted-foreground">
            Manage your decentralised identifiers, cryptographic keys, and wallet security
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Create Backup
          </Button>
          <Button
            variant={isLocked ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsLocked(!isLocked)}
          >
            {isLocked ? (
              <>
                <Unlock className="h-4 w-4 mr-2" />
                Unlock Wallet
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Lock Wallet
              </>
            )}
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create DID
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {walletStats.map((stat) => {
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

      {/* Wallet Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-3">
                <Wallet className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Wallet Status</CardTitle>
                <CardDescription>Core identity wallet information</CardDescription>
              </div>
            </div>
            {isLocked ? (
              <Badge variant="destructive">
                <Lock className="h-3 w-3 mr-1" />
                Locked
              </Badge>
            ) : (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <Unlock className="h-3 w-3 mr-1" />
                Unlocked
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label className="text-xs text-muted-foreground">Wallet Address</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{walletInfo.fullAddress}</code>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Created</Label>
              <p className="text-sm font-medium mt-1">{walletInfo.createdAt}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Last Accessed</Label>
              <p className="text-sm font-medium mt-1">{walletInfo.lastAccessed}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Encryption</Label>
              <p className="text-sm font-medium mt-1">{walletInfo.encryptionAlgorithm}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Total DIDs</Label>
              <p className="text-sm font-medium mt-1">{walletInfo.totalDIDs}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Total Key Pairs</Label>
              <p className="text-sm font-medium mt-1">{walletInfo.totalKeyPairs}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DID List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Decentralised Identifiers</CardTitle>
              <CardDescription>All DIDs managed by this wallet</CardDescription>
            </div>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create DID
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">DID</th>
                  <th className="px-4 py-3 text-left font-medium">Method</th>
                  <th className="px-4 py-3 text-left font-medium">Key Type</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                  <th className="px-4 py-3 text-left font-medium">Last Key Rotation</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dids.map((did) => (
                  <tr key={did.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Fingerprint className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <code className="text-xs font-mono truncate max-w-[280px]">{did.did}</code>
                        {did.isPrimary && (
                          <Badge variant="secondary" className="text-xs flex-shrink-0">Primary</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{getMethodBadge(did.method)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{did.keyType}</span>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(did.status)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{did.created}</td>
                    <td className="px-4 py-3 text-muted-foreground">{did.lastRotated}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm">
                          <RefreshCw className="h-3.5 w-3.5 mr-1" />
                          Rotate
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
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

      {/* Key Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Key Management</CardTitle>
              <CardDescription>Cryptographic key pairs associated with your identifiers</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Rotate All Keys
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Algorithm</th>
                  <th className="px-4 py-3 text-left font-medium">Usage</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                  <th className="px-4 py-3 text-left font-medium">Last Used</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {keyPairs.map((kp) => (
                  <tr key={kp.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-violet-500 flex-shrink-0" />
                        <span className="font-medium">{kp.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{kp.algorithm}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{kp.usage}</td>
                    <td className="px-4 py-3">{getStatusBadge(kp.status)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{kp.created}</td>
                    <td className="px-4 py-3 text-muted-foreground">{kp.lastUsed}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm">
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Rotate
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Backup & Recovery */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-3">
                <HardDrive className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Backup Status</CardTitle>
                <CardDescription>Wallet backup and recovery information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Backup</span>
                <span className="text-sm font-medium">{backupInfo.lastBackup}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Storage Location</span>
                <span className="text-sm font-medium">{backupInfo.backupLocation}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Backup Size</span>
                <span className="text-sm font-medium">{backupInfo.backupSize}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Auto-Backup</span>
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Enabled
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Recovery Method</span>
                <span className="text-sm font-medium">{backupInfo.recoveryMethod}</span>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download Backup
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Upload className="h-4 w-4 mr-2" />
                Restore
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-3">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Backup History</CardTitle>
                <CardDescription>Recent wallet backup records</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {backupInfo.backupHistory.map((backup, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">{backup.date}</p>
                      <p className="text-xs text-muted-foreground">{backup.type} backup</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Success
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
