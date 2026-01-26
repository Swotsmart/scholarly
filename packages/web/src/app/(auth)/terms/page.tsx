'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, ArrowLeft } from 'lucide-react';

const sections = [
  {
    title: '1. Acceptance of Terms',
    content:
      'By accessing or using the Scholarly platform, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing the platform. These terms apply to all users, including students, teachers, parents, and administrators. We reserve the right to update these terms at any time, and continued use of the platform constitutes acceptance of any modifications.',
  },
  {
    title: '2. Description of Service',
    content:
      'Scholarly is an educational technology platform designed for Australian schools, homeschool families, and micro-school communities. Our services include curriculum management aligned to the Australian Curriculum (ACARA), learning progress tracking, resource libraries, assessment tools, AI-powered learning assistance, portfolio management, and communication tools. The platform is provided on a subscription basis with varying tiers for individual families, schools, and educational organisations.',
  },
  {
    title: '3. User Accounts',
    content:
      'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information when creating an account. Accounts for users under 16 must be created by a parent or legal guardian who accepts these terms on their behalf. You agree to notify us immediately of any unauthorised use of your account. Scholarly reserves the right to suspend or terminate accounts that violate these terms.',
  },
  {
    title: '4. Acceptable Use',
    content:
      'You agree to use the Scholarly platform only for lawful educational purposes. You must not: upload content that is offensive, harmful, or infringes on intellectual property rights; attempt to gain unauthorised access to other accounts or system infrastructure; use the platform for commercial purposes unrelated to education; harass, bully, or intimidate other users; distribute malware or disruptive code; or misrepresent your identity or affiliation. Violations may result in immediate account termination.',
  },
  {
    title: '5. Intellectual Property',
    content:
      'The Scholarly platform, including its design, features, code, content, and branding, is the intellectual property of Scholarly Pty Ltd and is protected by Australian and international copyright, trademark, and patent laws. Users retain ownership of content they create on the platform (such as assignments, portfolios, and learning resources), but grant Scholarly a non-exclusive licence to host and display that content within the platform. Educational resources provided through the platform are licensed for personal educational use only and may not be redistributed.',
  },
  {
    title: '6. Limitation of Liability',
    content:
      'Scholarly provides the platform on an "as is" and "as available" basis. While we strive for reliability and accuracy, we do not guarantee that the platform will be uninterrupted, error-free, or that all content is accurate. To the maximum extent permitted by law, Scholarly shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform. Our total liability for any claim shall not exceed the amount you have paid for the service in the twelve months preceding the claim.',
  },
  {
    title: '7. Australian Consumer Law',
    content:
      'Nothing in these Terms of Service excludes, restricts, or modifies any consumer rights under the Australian Consumer Law (Schedule 2 of the Competition and Consumer Act 2010) that cannot be excluded, restricted, or modified by agreement. If the Australian Consumer Law applies to you as a consumer, you may have certain rights and remedies (including consumer guarantee rights) that cannot be excluded, restricted, or modified. Our liability under the Australian Consumer Law is limited, to the extent permitted, to re-supplying the services or paying the cost of having the services re-supplied.',
  },
  {
    title: '8. Changes to Terms',
    content:
      'Scholarly reserves the right to modify these Terms of Service at any time. We will provide notice of material changes through the platform or via email at least 30 days before they take effect. Your continued use of the platform after changes take effect constitutes acceptance of the modified terms. If you disagree with the changes, you may terminate your account before the new terms take effect. These terms are governed by the laws of New South Wales, Australia, and any disputes shall be subject to the jurisdiction of the courts of New South Wales.',
  },
];

export default function TermsPage() {
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
            <CardTitle className="text-2xl">Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground">
              Last updated: 20 January 2026
            </p>
          </CardHeader>
          <CardContent className="space-y-8">
            <p className="text-sm text-muted-foreground">
              Please read these Terms of Service carefully before using the Scholarly
              educational platform. These terms govern your access to and use of our
              services and constitute a legally binding agreement between you and
              Scholarly Pty Ltd (ABN 12 345 678 901).
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
