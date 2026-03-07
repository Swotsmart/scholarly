'use client';

import Link from 'next/link';
import {
  GraduationCap,
  PlayCircle,
  Lock,
  Code2,
  Webhook,
  BookOpen,
  Zap,
  Globe,
  ArrowRight,
  CheckCircle2,
  Shield,
  FileCode,
  UserCheck,
  Key,
  Send,
  Store,
} from 'lucide-react';

const API_DOCS = [
  {
    title: 'Getting Started',
    description: 'Quick start guide for the Scholarly API',
    icon: PlayCircle,
  },
  {
    title: 'Authentication',
    description: 'OAuth 2.0 and API key authentication',
    icon: Lock,
  },
  {
    title: 'REST API Reference',
    description: 'Complete REST API documentation',
    icon: Code2,
  },
  {
    title: 'Webhooks Guide',
    description: 'Setting up and handling webhooks',
    icon: Webhook,
  },
  {
    title: 'SDK Libraries',
    description: 'Official SDKs for JavaScript, Python, and more',
    icon: BookOpen,
  },
  {
    title: 'Rate Limits',
    description: 'Understanding API rate limits and quotas',
    icon: Zap,
  },
];

const PROGRAM_STEPS = [
  {
    step: 1,
    title: 'Register',
    description: 'Create your developer account with a valid email address.',
    icon: FileCode,
  },
  {
    step: 2,
    title: 'Verify Identity',
    description: 'Complete KYC verification to unlock full API access.',
    icon: UserCheck,
  },
  {
    step: 3,
    title: 'Get API Keys',
    description: 'Generate sandbox and production API credentials.',
    icon: Key,
  },
  {
    step: 4,
    title: 'Build and Submit',
    description: 'Develop your integration and submit it for review.',
    icon: Send,
  },
  {
    step: 5,
    title: 'Publish',
    description: 'Launch on the Scholarly App Marketplace.',
    icon: Store,
  },
];

const HIGHLIGHTS = [
  { label: 'REST + WebSocket APIs', icon: Globe },
  { label: 'TypeScript SDK', icon: Code2 },
  { label: 'NATS Event Bus', icon: Zap },
  { label: '1EdTech Certified', icon: Shield },
];

const QUICK_START_CODE = `// Install the SDK
npm install @scholarly/sdk

// Initialize the client
import { Scholarly } from '@scholarly/sdk';

const client = new Scholarly({
  apiKey: process.env.SCHOLARLY_API_KEY,
});

// Fetch user data
const user = await client.users.get('user_123');
console.log(user);`;

export default function DeveloperPublicPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1e9df1]">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Scholarly
              </span>
            </Link>
            <span className="text-gray-300 dark:text-gray-600 mx-1">/</span>
            <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              Developer Portal
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register?role=developer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e9df1] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a8cd8] transition-colors"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        {/* Hero / Overview */}
        <section className="py-16 border-b border-gray-100 dark:border-gray-800">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Build on Scholarly
            </h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              Create education apps, platform integrations, and content tools
              that reach millions of learners. The Scholarly Developer Platform
              provides the APIs, SDKs, and infrastructure you need to build
              powerful learning experiences.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              {HIGHLIGHTS.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  <item.icon className="h-4 w-4 text-[#1e9df1]" />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* API Documentation */}
        <section className="py-16 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            API Documentation
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Explore the full API surface. Register for a developer account to
            access interactive docs and sandbox environments.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {API_DOCS.map((doc) => (
              <Link
                key={doc.title}
                href="/register?role=developer"
                className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 hover:border-[#1e9df1]/50 hover:shadow-md transition-all"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1e9df1]/10">
                  <doc.icon className="h-5 w-5 text-[#1e9df1]" />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900 dark:text-white group-hover:text-[#1e9df1] transition-colors">
                  {doc.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {doc.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Developer Program */}
        <section className="py-16 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Developer Program
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            From registration to marketplace launch in five steps.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {PROGRAM_STEPS.map((step) => (
              <div key={step.step} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#1e9df1] bg-[#1e9df1]/10">
                    <step.icon className="h-5 w-5 text-[#1e9df1]" />
                  </div>
                  <div className="mt-2 text-xs font-bold uppercase tracking-wider text-[#1e9df1]">
                    Step {step.step}
                  </div>
                  <h3 className="mt-1 font-semibold text-gray-900 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Start */}
        <section className="py-16 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Quick Start
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Get up and running with the Scholarly SDK in minutes.
          </p>
          <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-950 p-6 overflow-x-auto">
            <pre className="text-sm font-mono text-gray-300 leading-relaxed">
              {QUICK_START_CODE}
            </pre>
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Full documentation, playground access, and sandbox API keys are
            available after{' '}
            <Link
              href="/register?role=developer"
              className="text-[#1e9df1] hover:underline font-medium"
            >
              creating your developer account
            </Link>
            .
          </p>
        </section>

        {/* What You Can Build */}
        <section className="py-16 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            What You Can Build
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              {
                title: 'Education Apps',
                description:
                  'Interactive learning tools, assessment engines, and adaptive tutoring systems that integrate directly with Scholarly classrooms.',
                icon: GraduationCap,
              },
              {
                title: 'Platform Integrations',
                description:
                  'Connect Scholarly to LMS platforms, SIS systems, and institutional infrastructure via REST APIs and webhooks.',
                icon: Globe,
              },
              {
                title: 'Content Tools',
                description:
                  'Curriculum builders, content authoring tools, and AI-powered resource generators for educators and publishers.',
                icon: BookOpen,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1e9df1]/10">
                  <item.icon className="h-5 w-5 text-[#1e9df1]" />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-[#1e9df1]" />
          <h2 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
            Ready to build?
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
            Create your developer account to access API keys, sandbox
            environments, and the full documentation suite.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              href="/register?role=developer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#1e9df1] px-8 py-3 text-base font-semibold text-white hover:bg-[#1a8cd8] transition-colors"
            >
              Create your developer account
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              Already registered? Sign in
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>Scholarly Developer Platform</span>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              Privacy
            </Link>
            <Link href="/support" className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              Support
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
