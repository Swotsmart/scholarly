import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  GraduationCap,
  Lightbulb,
  FolderOpen,
  Users,
  Sparkles,
  Target,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

const features = [
  {
    icon: Lightbulb,
    title: 'Design & Pitch AI',
    description:
      'Guide learners through design thinking with AI-powered coaching, from empathy to pitch.',
  },
  {
    icon: FolderOpen,
    title: 'Showcase Portfolios',
    description:
      'Transform raw iterations into polished, professional narratives for employers and admissions.',
  },
  {
    icon: Users,
    title: 'Peer Review System',
    description:
      'Double-blind reviews with Feedback Pins for context-aware, actionable feedback.',
  },
  {
    icon: Sparkles,
    title: 'AI Skill Mapping',
    description:
      'Automatically identify and tag skills demonstrated throughout the learning journey.',
  },
  {
    icon: Target,
    title: '10/20/30 Rule',
    description:
      'Built-in constraints for professional pitches: 10 slides, 20 minutes, 30pt font.',
  },
  {
    icon: TrendingUp,
    title: 'Analytics & Insights',
    description:
      'Track portfolio views, engagement, and growth with detailed analytics dashboards.',
  },
];

const stats = [
  { value: '10,000+', label: 'Active Learners' },
  { value: '50+', label: 'Institutions' },
  { value: '25,000+', label: 'Portfolios Created' },
  { value: '98%', label: 'Satisfaction Rate' },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Scholarly</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="#features"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="#about"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              About
            </Link>
            <Link
              href="#contact"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-20 md:py-32">
        <div className="container relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">
              The Unified Learning Nexus
            </Badge>
            <h1 className="heading-1 mb-6">
              Transform Learning into{' '}
              <span className="text-primary">Professional Impact</span>
            </h1>
            <p className="lead mb-8">
              From design thinking to portfolio showcase. Scholarly guides
              learners through iterative innovation, peer review, and
              professional pitching — all powered by AI.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="xl" asChild>
                <Link href="/register">
                  Start Your Journey
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="xl" variant="outline" asChild>
                <Link href="#features">Explore Features</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />
      </section>

      {/* Stats Section */}
      <section className="border-y bg-muted/50 py-12">
        <div className="container">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-primary md:text-4xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">
              Features
            </Badge>
            <h2 className="heading-2 mb-4">
              Everything You Need for Design Excellence
            </h2>
            <p className="text-muted-foreground">
              A complete platform for design thinking education, peer
              collaboration, and professional showcasing.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group rounded-lg border bg-card p-6 transition-shadow hover:shadow-lg"
                >
                  <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-primary py-20 text-primary-foreground">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="heading-2 mb-4">Ready to Transform Your Learning?</h2>
            <p className="mb-8 text-primary-foreground/80">
              Join thousands of learners and educators using Scholarly to create
              meaningful, portfolio-worthy work.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/register">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
                asChild
              >
                <Link href="/demo">Request Demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              <span className="font-semibold">Scholarly</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                Terms of Service
              </Link>
              <Link href="/contact" className="hover:text-foreground">
                Contact
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Scholarly. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
