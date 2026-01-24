'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen, Users, GraduationCap, School, Calendar, FileText, Sparkles, Shield, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Users,
    title: 'Tutor Marketplace',
    description: 'Connect with verified tutors using AI-powered matching based on learning needs and teaching styles.',
    href: '/tutors',
  },
  {
    icon: FileText,
    title: 'Content Marketplace',
    description: 'Access thousands of curriculum-aligned resources created by educators.',
    href: '/content',
  },
  {
    icon: BookOpen,
    title: 'Curriculum Curator',
    description: 'Align your teaching with the Australian Curriculum using our intelligent mapping system.',
    href: '/curriculum',
  },
  {
    icon: GraduationCap,
    title: 'Homeschool Hub',
    description: 'Find co-ops, plan excursions, and connect with other homeschool families.',
    href: '/homeschool',
  },
  {
    icon: School,
    title: 'Micro-Schools',
    description: 'Tools and guidance for starting and running your own micro-school.',
    href: '/micro-schools',
  },
  {
    icon: Calendar,
    title: 'Relief Teachers',
    description: 'AI-powered absence prediction and instant relief teacher booking.',
    href: '/relief',
  },
];

const stats = [
  { label: 'Active Tutors', value: '2,500+' },
  { label: 'Learning Resources', value: '15,000+' },
  { label: 'Curriculum Standards', value: '8,000+' },
  { label: 'Families Connected', value: '10,000+' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-scholarly-600" />
            <span className="text-xl font-bold gradient-text">Scholarly</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/tutors" className="text-sm font-medium hover:text-scholarly-600 transition-colors">
              Tutors
            </Link>
            <Link href="/content" className="text-sm font-medium hover:text-scholarly-600 transition-colors">
              Content
            </Link>
            <Link href="/curriculum" className="text-sm font-medium hover:text-scholarly-600 transition-colors">
              Curriculum
            </Link>
            <Link href="/homeschool" className="text-sm font-medium hover:text-scholarly-600 transition-colors">
              Homeschool
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Log In</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-scholarly-600 hover:bg-scholarly-700">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-scholarly-50 via-white to-scholarly-100 py-20 lg:py-32">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-scholarly-100 text-scholarly-700 text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              The Future of AI-Powered Education
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              <span className="gradient-text">Unified Learning Nexus</span>
              <br />
              for Every Learner
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Connect with expert tutors, access curriculum-aligned resources, and join a vibrant
              community of learners, educators, and families—all powered by AI.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="bg-scholarly-600 hover:bg-scholarly-700 w-full sm:w-auto">
                  Start Learning Today
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Watch Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-b bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-scholarly-600">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything You Need to Learn & Teach</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Scholarly brings together all the tools educators and learners need in one unified platform.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Link
                key={feature.title}
                href={feature.href}
                className="group p-6 bg-white rounded-xl border hover:border-scholarly-300 hover:shadow-lg transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-lg bg-scholarly-100 flex items-center justify-center mb-4 group-hover:bg-scholarly-200 transition-colors">
                  <feature.icon className="h-6 w-6 text-scholarly-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-scholarly-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Verified & Safe</h3>
              <p className="text-muted-foreground text-sm">
                All tutors undergo rigorous verification including Working With Children Checks.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Curriculum Aligned</h3>
              <p className="text-muted-foreground text-sm">
                All content is mapped to the Australian Curriculum for seamless integration.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <Globe className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Connected Community</h3>
              <p className="text-muted-foreground text-sm">
                Join thousands of families and educators in a supportive learning community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-scholarly-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Learning Journey?
          </h2>
          <p className="text-scholarly-100 mb-8 max-w-2xl mx-auto">
            Join thousands of learners, educators, and families who are already using Scholarly
            to achieve their educational goals.
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="bg-white text-scholarly-600 hover:bg-scholarly-50">
              Get Started for Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-gray-400">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="h-6 w-6 text-scholarly-400" />
                <span className="text-lg font-bold text-white">Scholarly</span>
              </div>
              <p className="text-sm">
                The Unified Learning Nexus for AI-powered education.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/tutors" className="hover:text-white transition-colors">Find Tutors</Link></li>
                <li><Link href="/content" className="hover:text-white transition-colors">Content Marketplace</Link></li>
                <li><Link href="/curriculum" className="hover:text-white transition-colors">Curriculum</Link></li>
                <li><Link href="/homeschool" className="hover:text-white transition-colors">Homeschool Hub</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">For Educators</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/become-tutor" className="hover:text-white transition-colors">Become a Tutor</Link></li>
                <li><Link href="/create-content" className="hover:text-white transition-colors">Create Content</Link></li>
                <li><Link href="/micro-schools" className="hover:text-white transition-colors">Start a Micro-School</Link></li>
                <li><Link href="/relief" className="hover:text-white transition-colors">Relief Teaching</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} Scholarly. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
