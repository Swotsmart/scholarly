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
  CreditCard,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Mail,
  Plus,
  Trash2,
  Edit,
  Building2,
  DollarSign,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  RefreshCw,
  Star,
  Zap,
  Users,
  Shield,
  Eye,
  Send,
  Banknote,
  Wallet,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const PAYMENT_STATS = [
  { label: 'Outstanding', value: '$2,450', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { label: 'Paid This Month', value: '$8,720', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
  { label: 'Active Subscriptions', value: '3', icon: RefreshCw, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { label: 'Payment Methods', value: '5', icon: CreditCard, color: 'text-purple-500', bg: 'bg-purple-500/10' },
];

const INVOICES = [
  {
    id: 'INV-2026-001',
    date: '27 Jan 2026',
    dueDate: '10 Feb 2026',
    description: 'Premium Plan Subscription - February 2026',
    amount: 299,
    status: 'outstanding' as const,
    recipient: 'Scholarly Pty Ltd',
  },
  {
    id: 'INV-2026-002',
    date: '25 Jan 2026',
    dueDate: '8 Feb 2026',
    description: 'VR Chemistry Lab Module License',
    amount: 850,
    status: 'outstanding' as const,
    recipient: 'ScienceEd Australia',
  },
  {
    id: 'INV-2026-003',
    date: '20 Jan 2026',
    dueDate: '3 Feb 2026',
    description: 'Professional Development Course Bundle',
    amount: 1301,
    status: 'outstanding' as const,
    recipient: 'AITSL',
  },
  {
    id: 'INV-2025-089',
    date: '27 Dec 2025',
    dueDate: '10 Jan 2026',
    description: 'Premium Plan Subscription - January 2026',
    amount: 299,
    status: 'paid' as const,
    paidDate: '5 Jan 2026',
    recipient: 'Scholarly Pty Ltd',
  },
  {
    id: 'INV-2025-088',
    date: '15 Dec 2025',
    dueDate: '29 Dec 2025',
    description: 'Curriculum Content License - Indigenous Studies',
    amount: 2500,
    status: 'paid' as const,
    paidDate: '22 Dec 2025',
    recipient: 'First Nations Education',
  },
  {
    id: 'INV-2025-087',
    date: '10 Dec 2025',
    dueDate: '24 Dec 2025',
    description: 'Annual API Access Fee',
    amount: 1200,
    status: 'paid' as const,
    paidDate: '18 Dec 2025',
    recipient: 'Scholarly Pty Ltd',
  },
  {
    id: 'INV-2025-086',
    date: '1 Dec 2025',
    dueDate: '15 Dec 2025',
    description: 'Teacher Training Workshop',
    amount: 450,
    status: 'overdue' as const,
    recipient: 'EdProfessional Training',
  },
];

const PAYMENT_METHODS = [
  {
    id: 'pm-001',
    type: 'card' as const,
    name: 'Visa ending in 4242',
    details: '**** **** **** 4242',
    expiry: '12/28',
    isDefault: true,
    brand: 'Visa',
  },
  {
    id: 'pm-002',
    type: 'card' as const,
    name: 'Mastercard ending in 8888',
    details: '**** **** **** 8888',
    expiry: '06/27',
    isDefault: false,
    brand: 'Mastercard',
  },
  {
    id: 'pm-003',
    type: 'becs' as const,
    name: 'Commonwealth Bank',
    details: 'BSB: 062-000, Account: ****4567',
    expiry: null,
    isDefault: false,
    brand: 'BECS Direct Debit',
  },
  {
    id: 'pm-004',
    type: 'payid' as const,
    name: 'PayID',
    details: 'admin@school.edu.au',
    expiry: null,
    isDefault: false,
    brand: 'PayID',
  },
  {
    id: 'pm-005',
    type: 'apple_pay' as const,
    name: 'Apple Pay',
    details: 'iPhone 15 Pro',
    expiry: null,
    isDefault: false,
    brand: 'Apple Pay',
  },
];

const TRANSACTION_HISTORY = [
  {
    id: 'txn-001',
    date: '27 Jan 2026',
    description: 'Premium Plan Subscription',
    amount: -299,
    status: 'completed' as const,
    method: 'Visa *4242',
    reference: 'TXN-2026-001',
  },
  {
    id: 'txn-002',
    date: '25 Jan 2026',
    description: 'Marketplace Sale - Indigenous Art Curriculum',
    amount: 1200,
    status: 'completed' as const,
    method: 'Bank Transfer',
    reference: 'TXN-2026-002',
  },
  {
    id: 'txn-003',
    date: '22 Jan 2026',
    description: 'VR Chemistry Lab Module',
    amount: -850,
    status: 'completed' as const,
    method: 'Visa *4242',
    reference: 'TXN-2026-003',
  },
  {
    id: 'txn-004',
    date: '18 Jan 2026',
    description: 'Tutoring Session Payout',
    amount: 320,
    status: 'completed' as const,
    method: 'BECS *4567',
    reference: 'TXN-2026-004',
  },
  {
    id: 'txn-005',
    date: '15 Jan 2026',
    description: 'Professional Development Course',
    amount: -450,
    status: 'pending' as const,
    method: 'Mastercard *8888',
    reference: 'TXN-2026-005',
  },
  {
    id: 'txn-006',
    date: '10 Jan 2026',
    description: 'Content Validation Reward',
    amount: 180,
    status: 'completed' as const,
    method: 'Bank Transfer',
    reference: 'TXN-2026-006',
  },
  {
    id: 'txn-007',
    date: '5 Jan 2026',
    description: 'Premium Plan Subscription (Dec)',
    amount: -299,
    status: 'completed' as const,
    method: 'Visa *4242',
    reference: 'TXN-2026-007',
  },
];

const SUBSCRIPTIONS = [
  {
    id: 'sub-001',
    name: 'Premium Plan',
    description: 'Full access to all platform features, priority support, and advanced analytics',
    price: 299,
    interval: 'month',
    status: 'active' as const,
    nextBilling: '27 Feb 2026',
    features: ['Unlimited students', 'Advanced analytics', 'Priority support', 'API access'],
    icon: Star,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    id: 'sub-002',
    name: 'LinguaFlow Pro',
    description: 'Enhanced language learning tools with AI conversation practice',
    price: 49,
    interval: 'month',
    status: 'active' as const,
    nextBilling: '15 Feb 2026',
    features: ['AI conversation', 'Speech analysis', 'Custom vocabularies'],
    icon: Zap,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    id: 'sub-003',
    name: 'Team Collaboration',
    description: 'Enhanced collaboration tools for teaching teams',
    price: 99,
    interval: 'month',
    status: 'active' as const,
    nextBilling: '1 Mar 2026',
    features: ['Shared resources', 'Team chat', 'Co-teaching tools'],
    icon: Users,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    id: 'sub-004',
    name: 'Data Backup Pro',
    description: 'Advanced backup and recovery for all your educational content',
    price: 29,
    interval: 'month',
    status: 'cancelled' as const,
    cancelledDate: '15 Jan 2026',
    features: ['Daily backups', 'Version history', 'Instant recovery'],
    icon: Shield,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
];

function getInvoiceStatusBadge(status: string) {
  switch (status) {
    case 'outstanding':
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <Clock className="h-3 w-3 mr-1" />
          Outstanding
        </Badge>
      );
    case 'paid':
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Paid
        </Badge>
      );
    case 'overdue':
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Overdue
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  );
}

function getPaymentMethodIcon(type: string) {
  switch (type) {
    case 'card':
      return <CreditCard className="h-5 w-5" />;
    case 'becs':
      return <Building2 className="h-5 w-5" />;
    case 'payid':
      return <Banknote className="h-5 w-5" />;
    case 'apple_pay':
      return <AppleIcon className="h-5 w-5" />;
    default:
      return <Wallet className="h-5 w-5" />;
  }
}

export default function PaymentCenterPage() {
  const [activeTab, setActiveTab] = useState('invoices');
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'outstanding' | 'paid'>('all');

  const filteredInvoices = INVOICES.filter((inv) => {
    if (invoiceFilter === 'all') return true;
    if (invoiceFilter === 'outstanding') return inv.status === 'outstanding' || inv.status === 'overdue';
    return inv.status === 'paid';
  });

  const outstandingTotal = INVOICES.filter((i) => i.status === 'outstanding' || i.status === 'overdue').reduce(
    (sum, i) => sum + i.amount,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Payment Center</h1>
          <p className="text-muted-foreground">
            Manage invoices, payment methods, and subscriptions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Statement
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Payment Method
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PAYMENT_STATS.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`rounded-lg ${stat.bg} p-3`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Invoices</span>
          </TabsTrigger>
          <TabsTrigger value="methods" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Methods</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Subscriptions</span>
          </TabsTrigger>
          <TabsTrigger value="receipts" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Receipts</span>
          </TabsTrigger>
        </TabsList>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          {/* Outstanding Alert */}
          {outstandingTotal > 0 && (
            <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="font-semibold">Outstanding Balance</p>
                      <p className="text-sm text-muted-foreground">
                        You have ${outstandingTotal.toLocaleString()} in unpaid invoices
                      </p>
                    </div>
                  </div>
                  <Button>Pay All Now</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filter Tabs */}
          <div className="flex items-center gap-2">
            <Button
              variant={invoiceFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setInvoiceFilter('all')}
            >
              All
            </Button>
            <Button
              variant={invoiceFilter === 'outstanding' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setInvoiceFilter('outstanding')}
            >
              Outstanding
            </Button>
            <Button
              variant={invoiceFilter === 'paid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setInvoiceFilter('paid')}
            >
              Paid
            </Button>
          </div>

          {/* Invoices Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Invoice</th>
                      <th className="px-4 py-3 text-left font-medium">Description</th>
                      <th className="px-4 py-3 text-left font-medium">Recipient</th>
                      <th className="px-4 py-3 text-left font-medium">Due Date</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Amount</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-muted/50">
                        <td className="px-4 py-4">
                          <p className="font-medium">{invoice.id}</p>
                          <p className="text-xs text-muted-foreground">{invoice.date}</p>
                        </td>
                        <td className="px-4 py-4 max-w-[200px]">
                          <p className="truncate">{invoice.description}</p>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">{invoice.recipient}</td>
                        <td className="px-4 py-4 text-muted-foreground">{invoice.dueDate}</td>
                        <td className="px-4 py-4">{getInvoiceStatusBadge(invoice.status)}</td>
                        <td className="px-4 py-4 text-right font-medium">${invoice.amount.toLocaleString()}</td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                            {(invoice.status === 'outstanding' || invoice.status === 'overdue') && (
                              <Button size="sm">Pay</Button>
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

        {/* Payment Methods Tab */}
        <TabsContent value="methods" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {PAYMENT_METHODS.map((method) => (
              <Card key={method.id} className={method.isDefault ? 'border-primary/30' : ''}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-muted p-3">
                        {getPaymentMethodIcon(method.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{method.name}</p>
                          {method.isDefault && (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{method.details}</p>
                        {method.expiry && (
                          <p className="text-xs text-muted-foreground mt-1">Expires: {method.expiry}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{method.brand}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!method.isDefault && (
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {!method.isDefault && (
                    <Button variant="outline" size="sm" className="mt-4">
                      Set as Default
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Add New Method Card */}
            <Card className="border-dashed">
              <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[180px]">
                <div className="rounded-lg bg-muted p-3 mb-3">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-semibold">Add Payment Method</p>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  Add a credit card, Apple Pay, BECS Direct Debit, or PayID
                </p>
                <Button variant="outline" className="mt-4">
                  Add Method
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Payment Method Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Supported Payment Methods</CardTitle>
              <CardDescription>We accept the following payment methods for Australian customers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-500/10 p-2">
                    <CreditCard className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium">Credit/Debit Cards</p>
                    <p className="text-xs text-muted-foreground">Visa, Mastercard, American Express</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-gray-900/10 dark:bg-white/10 p-2">
                    <AppleIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Apple Pay</p>
                    <p className="text-xs text-muted-foreground">Fast, secure payments with Face ID or Touch ID</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-emerald-500/10 p-2">
                    <Building2 className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-medium">BECS Direct Debit</p>
                    <p className="text-xs text-muted-foreground">Australian bank accounts</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-purple-500/10 p-2">
                    <Banknote className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium">PayID</p>
                    <p className="text-xs text-muted-foreground">Instant payments via email or phone</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transaction History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Log</CardTitle>
              <CardDescription>Complete history of all payments and receipts</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Date</th>
                      <th className="px-4 py-3 text-left font-medium">Description</th>
                      <th className="px-4 py-3 text-left font-medium">Reference</th>
                      <th className="px-4 py-3 text-left font-medium">Method</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {TRANSACTION_HISTORY.map((tx) => (
                      <tr key={tx.id} className="hover:bg-muted/50">
                        <td className="px-4 py-4 text-muted-foreground whitespace-nowrap">{tx.date}</td>
                        <td className="px-4 py-4 font-medium">{tx.description}</td>
                        <td className="px-4 py-4 text-muted-foreground font-mono text-xs">{tx.reference}</td>
                        <td className="px-4 py-4 text-muted-foreground">{tx.method}</td>
                        <td className="px-4 py-4">
                          {tx.status === 'completed' ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </td>
                        <td
                          className={`px-4 py-4 text-right font-medium whitespace-nowrap ${
                            tx.amount > 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-4">
          {/* Active Subscriptions */}
          <div className="grid gap-4 md:grid-cols-2">
            {SUBSCRIPTIONS.filter((s) => s.status === 'active').map((sub) => {
              const Icon = sub.icon;
              return (
                <Card key={sub.id} className="border-primary/30">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg ${sub.bg} p-3`}>
                          <Icon className={`h-6 w-6 ${sub.color}`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{sub.name}</CardTitle>
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 mt-1">
                            Active
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">${sub.price}</p>
                        <p className="text-sm text-muted-foreground">/{sub.interval}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{sub.description}</p>
                    <div className="space-y-2">
                      {sub.features.map((feature) => (
                        <div key={feature} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
                      <span>Next billing: {sub.nextBilling}</span>
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Cancelled Subscriptions */}
          {SUBSCRIPTIONS.filter((s) => s.status === 'cancelled').length > 0 && (
            <>
              <h3 className="text-lg font-semibold mt-6">Cancelled Subscriptions</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {SUBSCRIPTIONS.filter((s) => s.status === 'cancelled').map((sub) => {
                  const Icon = sub.icon;
                  return (
                    <Card key={sub.id} className="opacity-75">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="rounded-lg bg-muted p-3">
                              <Icon className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-semibold">{sub.name}</p>
                              <Badge variant="secondary" className="mt-1">
                                Cancelled
                              </Badge>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            Reactivate
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">
                          Cancelled on {sub.cancelledDate}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>

        {/* Receipts Tab */}
        <TabsContent value="receipts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Download Receipts</CardTitle>
              <CardDescription>Download or email receipts for completed transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-0 divide-y">
                {TRANSACTION_HISTORY.filter((t) => t.status === 'completed').map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-muted p-2">
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tx.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{tx.date}</span>
                          <span className="text-xs text-muted-foreground">-</span>
                          <span className="text-xs text-muted-foreground font-mono">{tx.reference}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-sm font-medium ${
                          tx.amount > 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toLocaleString()}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Mail className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <div className="flex items-center justify-between w-full">
                <p className="text-sm text-muted-foreground">
                  Showing {TRANSACTION_HISTORY.filter((t) => t.status === 'completed').length} receipts
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download All
                  </Button>
                  <Button variant="outline" size="sm">
                    <Mail className="h-4 w-4 mr-2" />
                    Email All
                  </Button>
                </div>
              </div>
            </CardFooter>
          </Card>

          {/* Email Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Receipt Preferences</CardTitle>
              <CardDescription>Configure automatic receipt delivery</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Receipts Automatically</p>
                  <p className="text-sm text-muted-foreground">
                    Receive receipts via email after each transaction
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </div>
              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <p className="font-medium">Receipt Email Address</p>
                  <p className="text-sm text-muted-foreground">accounts@school.edu.au</p>
                </div>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Change
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
