'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, ArrowLeft } from 'lucide-react';

const sections = [
  {
    title: '1. Information We Collect',
    content:
      'We collect information you provide directly when creating an account, including your name, email address, role (student, teacher, parent, or administrator), and educational institution details. We also collect usage data such as pages visited, features used, learning progress, and assessment results. Device information including browser type, operating system, and IP address may be automatically collected to improve our services.',
  },
  {
    title: '2. How We Use Your Information',
    content:
      'Your information is used to provide and personalise the Scholarly learning experience, including curriculum recommendations, progress tracking, and adaptive learning pathways. We use aggregated and anonymised data to improve our platform, develop new features, and conduct educational research. We may send you service-related communications, updates about your learning progress, and relevant educational content.',
  },
  {
    title: '3. Data Storage and Security',
    content:
      'All data is stored on secure servers located within Australia, in compliance with Australian data sovereignty requirements. We employ industry-standard encryption (AES-256) for data at rest and TLS 1.3 for data in transit. Regular security audits and penetration testing are conducted by accredited third-party providers. Access to personal data is restricted to authorised personnel on a need-to-know basis with multi-factor authentication.',
  },
  {
    title: '4. Australian Privacy Principles',
    content:
      'Scholarly operates in compliance with the Australian Privacy Principles (APPs) set out in the Privacy Act 1988 (Cth). We are committed to open and transparent management of personal information (APP 1), collecting only information that is reasonably necessary (APP 3), and ensuring information is accurate, up-to-date, and complete (APP 10). We take reasonable steps to protect personal information from misuse, interference, loss, and unauthorised access (APP 11).',
  },
  {
    title: "5. Children's Privacy & COPPA Compliance",
    content:
      'We take the privacy of children seriously and comply with the Australian Privacy Act provisions regarding sensitive information about minors, as well as the US Children\'s Online Privacy Protection Act (COPPA). Parental or guardian consent is required for users under 16 years of age. Our "Learn to Read" mobile app (ages 3-7) collects no personal information from children: no names, photos, device identifiers (IDFA/GAID), location data, or audio recordings. The app contains no advertisements, no social features, no third-party tracking SDKs, and all parent-facing features are protected by a parental gate. Parents and guardians can review, modify, or request deletion of their child\'s information at any time by contacting privacy@scholarly.edu.au.',
  },
  {
    title: '6. Data Sharing and Third Parties',
    content:
      'We do not sell personal information to third parties. Information may be shared with educational institutions where you are enrolled, with your consent. We use carefully vetted third-party service providers for hosting, analytics, and communication services, all of whom are contractually bound to protect your data. We may disclose information when required by Australian law or to protect the safety of our users.',
  },
  {
    title: '7. Your Rights',
    content:
      'You have the right to access your personal information held by Scholarly and request corrections to inaccurate data. You may request deletion of your account and associated data, subject to legal retention requirements. You can opt out of non-essential communications at any time. You have the right to lodge a complaint with the Office of the Australian Information Commissioner (OAIC) if you believe your privacy has been breached. To exercise any of these rights, contact our Privacy Officer at privacy@scholarly.edu.au.',
  },
  {
    title: '8. Contact Us',
    content:
      'If you have any questions about this Privacy Policy or our data practices, please contact our Privacy Officer at privacy@scholarly.edu.au, by phone at +61 2 9000 1234, or by mail at Scholarly Pty Ltd, Level 12, 100 George Street, Sydney NSW 2000, Australia. We will respond to all privacy-related enquiries within 30 days.',
  },
];

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="w-full max-w-4xl space-y-6">
        {/* Branding */}
        <div className="flex items-center justify-center gap-2">
          <div className="rounded-full bg-primary/10 p-2">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <span className="text-xl font-bold">Scholarly</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground">
              Last updated: 20 January 2026
            </p>
          </CardHeader>
          <CardContent className="space-y-8">
            <p className="text-sm text-muted-foreground">
              At Scholarly, we are committed to protecting your privacy and ensuring
              the security of your personal information. This Privacy Policy explains
              how we collect, use, store, and protect your data when you use our
              educational platform.
            </p>

            {sections.map((section) => (
              <div key={section.title} className="space-y-2">
                <h3 className="heading-3">{section.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {section.content}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button variant="ghost" asChild>
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
