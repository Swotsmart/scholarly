import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'Scholarly - The Unified Learning Nexus',
    template: '%s | Scholarly',
  },
  description:
    'Transform education with AI-powered learning, design thinking, and professional portfolio showcasing.',
  keywords: [
    'education',
    'learning',
    'AI',
    'design thinking',
    'portfolio',
    'tutoring',
    'LMS',
  ],
  authors: [{ name: 'Scholarly' }],
  creator: 'Scholarly',
  openGraph: {
    type: 'website',
    locale: 'en_AU',
    url: 'https://scholarly.ai',
    siteName: 'Scholarly',
    title: 'Scholarly - The Unified Learning Nexus',
    description:
      'Transform education with AI-powered learning, design thinking, and professional portfolio showcasing.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scholarly - The Unified Learning Nexus',
    description:
      'Transform education with AI-powered learning, design thinking, and professional portfolio showcasing.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
