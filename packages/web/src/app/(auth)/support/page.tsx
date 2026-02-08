import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help & Support - Scholarly',
  description: 'Get help with Scholarly - Learn to Read. FAQs, troubleshooting, and contact information.',
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-3xl prose prose-slate dark:prose-invert">
        <h1>Help &amp; Support</h1>
        <p className="text-muted-foreground">
          <strong>App:</strong> Scholarly - Learn to Read (iOS &amp; Android)
        </p>

        <h2>Frequently Asked Questions</h2>

        <h3>Getting Started</h3>

        <h4>What ages is Scholarly designed for?</h4>
        <p>
          Scholarly - Learn to Read is designed for children ages 3-7. The phonics
          curriculum follows a research-based progression from letter recognition
          through to decodable reading.
        </p>

        <h4>How do I create an account?</h4>
        <p>
          Download the app from the App Store or Google Play, open it, and follow
          the onboarding screens. You&apos;ll need to provide a parent email and
          password, and accept the COPPA parental consent.
        </p>

        <h4>Can I use the same account on multiple devices?</h4>
        <p>
          Yes. Sign in with your parent email and password on any device. Your
          child&apos;s progress syncs automatically.
        </p>

        <h3>Subscriptions &amp; Billing</h3>

        <h4>What subscription plans are available?</h4>
        <ul>
          <li><strong>Explorer</strong> ($4.99/month, 7-day free trial) — 1 child profile, Phonics Forest, Story Garden</li>
          <li><strong>Scholar</strong> ($9.99/month, 7-day free trial) — Up to 3 child profiles, progress reports, offline mode</li>
          <li><strong>Academy</strong> ($19.99/month, 14-day free trial) — Unlimited profiles, AI tutor sessions, priority support</li>
        </ul>

        <h4>How do I cancel my subscription?</h4>
        <p>
          Subscriptions are managed through your device&apos;s app store:
        </p>
        <ul>
          <li><strong>iOS:</strong> Settings → [Your Name] → Subscriptions → Scholarly</li>
          <li><strong>Android:</strong> Google Play → Menu → Subscriptions → Scholarly</li>
        </ul>
        <p>
          Cancellation takes effect at the end of your current billing period. You
          won&apos;t be charged again, and you&apos;ll retain access until the period ends.
        </p>

        <h4>How do I restore a previous purchase?</h4>
        <p>
          In the app, go to Parent tab → Subscription → &quot;Restore Purchases&quot;.
          This will check your App Store/Google Play account for active subscriptions.
        </p>

        <h3>Troubleshooting</h3>

        <h4>The app is showing &quot;No Internet&quot; but I&apos;m connected</h4>
        <p>Try these steps:</p>
        <ol>
          <li>Close and reopen the app</li>
          <li>Check that your device can reach other websites</li>
          <li>If on WiFi, try switching to mobile data (or vice versa)</li>
          <li>Restart your device</li>
        </ol>

        <h4>Audio isn&apos;t working</h4>
        <ul>
          <li>Ensure your device isn&apos;t in silent/vibrate mode</li>
          <li>Check that the volume is turned up</li>
          <li>Try using headphones to isolate the issue</li>
          <li>Close other apps that might be using audio</li>
        </ul>

        <h4>My child&apos;s progress seems lost</h4>
        <p>
          Progress is saved to your account. If you signed out and back in, or
          reinstalled the app, your child&apos;s progress should restore automatically.
          If it doesn&apos;t, contact us at <strong>support@scholarly.app</strong>.
        </p>

        <h3>Privacy &amp; Safety</h3>

        <h4>What is the parental gate?</h4>
        <p>
          The parental gate is a math question (e.g., &quot;14 + 23 = ?&quot;) that appears
          when accessing parent settings, subscriptions, or external links. This
          prevents children from accidentally changing settings or making purchases.
        </p>

        <h4>Does the app track my child?</h4>
        <p>
          No. We do not collect any personal information from children. We do not
          use advertising identifiers, location tracking, or third-party analytics.
          See our <a href="/privacy">Privacy Policy</a> for full details.
        </p>

        <h4>How do I delete my account and data?</h4>
        <p>
          Email <strong>privacy@scholarly.app</strong> from the email address
          associated with your account. We will verify your identity and delete
          all data within 30 days.
        </p>

        <h2>Contact Us</h2>
        <p>
          If you need further assistance, please reach out:
        </p>
        <ul>
          <li>Email: <strong>support@scholarly.app</strong></li>
          <li>Privacy concerns: <strong>privacy@scholarly.app</strong></li>
        </ul>
        <p>
          We aim to respond to all enquiries within 48 hours.
        </p>
      </article>
    </div>
  );
}
