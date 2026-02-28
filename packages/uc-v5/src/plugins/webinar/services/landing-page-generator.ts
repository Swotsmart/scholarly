/**
 * Chekd Unified Communications 3.2 — Webinar Landing Page Generator
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE SHOP WINDOW
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Every webinar needs a public-facing page that convinces people to register.
 * This service generates server-side rendered HTML landing pages from the
 * webinar's configuration, complete with Open Graph meta tags for social
 * sharing, responsive design, branding, and a dynamic registration form.
 */

import { Router, Request, Response } from 'express';
import type { Logger } from '../../../utils/logger';

// ─── Landing Page Data (minimal subset of Webinar to avoid circular deps) ────

export interface LandingPageWebinar {
  id: string;
  title: string;
  description: string;
  slug: string;
  phase: string;
  visibility: string;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
  timezone: string;
  maxParticipants: number;
  registrationCount: number;
  waitlistCount: number;
  registrationApproval: string;
  registrationFields: { id: string; label: string; type: string; required: boolean; options?: string[]; placeholder?: string }[];
  branding: {
    logoUrl?: string;
    bannerUrl?: string;
    primaryColor: string;
    accentColor: string;
    fontFamily: string;
    customCss?: string;
    landingPageHtml?: string;
    waitingRoomMessage: string;
  };
  agenda: { id: string; title: string; description?: string; durationMinutes: number; type: string; speakerIds: string[] }[];
  tags: string[];
}

export interface LandingPageConfig {
  /** Base URL of the platform API (default: '') */
  apiBaseUrl: string;
  /** Base URL for the public-facing pages (default: '') */
  publicBaseUrl: string;
  /** Organisation name for OG tags */
  orgName: string;
}

export const DEFAULT_LANDING_CONFIG: LandingPageConfig = {
  apiBaseUrl: '',
  publicBaseUrl: '',
  orgName: 'Chekd',
};

// ═══════════════════════════════════════════════════════════════════════════════
//  THE LANDING PAGE GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

export class LandingPageGenerator {
  private logger: Logger;
  private config: LandingPageConfig;
  private webinarLookup: (slug: string) => LandingPageWebinar | undefined;

  constructor(
    logger: Logger,
    webinarLookup: (slug: string) => LandingPageWebinar | undefined,
    config?: Partial<LandingPageConfig>,
  ) {
    this.logger = logger;
    this.webinarLookup = webinarLookup;
    this.config = { ...DEFAULT_LANDING_CONFIG, ...config };
  }

  /**
   * Create an Express router that serves landing pages at /webinar/:slug
   */
  createRouter(): Router {
    const router = Router();

    router.get('/webinar/:slug', (req: Request, res: Response) => {
      const webinar = this.webinarLookup(req.params.slug);
      if (!webinar) {
        res.status(404).send(this.render404());
        return;
      }
      if (webinar.visibility === 'private') {
        res.status(403).send(this.render403());
        return;
      }
      const html = this.renderLandingPage(webinar);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.send(html);
    });

    return router;
  }

  // ─── Core Renderer ─────────────────────────────────────────────────────

  renderLandingPage(w: LandingPageWebinar): string {
    const esc = this.escapeHtml;
    const pageUrl = `${this.config.publicBaseUrl}/webinar/${w.slug}`;
    const startDate = this.formatDate(w.scheduledStartAt, w.timezone);
    const startTime = this.formatTime(w.scheduledStartAt, w.timezone);
    const endTime = this.formatTime(w.scheduledEndAt, w.timezone);
    const spotsLeft = Math.max(0, w.maxParticipants - w.registrationCount);
    const isOpen = ['registration-open', 'scheduled', 'draft'].includes(w.phase);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${esc(w.title)} | ${esc(this.config.orgName)}</title>
  <meta name="description" content="${esc(w.description.substring(0, 160))}">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(w.title)}">
  <meta property="og:description" content="${esc(w.description.substring(0, 300))}">
  <meta property="og:url" content="${esc(pageUrl)}">
  <meta property="og:site_name" content="${esc(this.config.orgName)}">
  ${w.branding.bannerUrl ? `<meta property="og:image" content="${esc(w.branding.bannerUrl)}">` : ''}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(w.title)}">
  <meta name="twitter:description" content="${esc(w.description.substring(0, 200))}">
  ${w.branding.bannerUrl ? `<meta name="twitter:image" content="${esc(w.branding.bannerUrl)}">` : ''}

  <!-- Structured Data -->
  <script type="application/ld+json">
  ${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: w.title,
    description: w.description,
    startDate: w.scheduledStartAt.toISOString(),
    endDate: w.scheduledEndAt.toISOString(),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    location: { '@type': 'VirtualLocation', url: pageUrl },
    organizer: { '@type': 'Organization', name: this.config.orgName },
    maximumAttendeeCapacity: w.maxParticipants,
    remainingAttendeeCapacity: spotsLeft,
  })}
  </script>

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${w.branding.fontFamily};
      background: #f8fafc;
      color: #1e293b;
      line-height: 1.6;
    }
    .container { max-width: 800px; margin: 0 auto; padding: 24px; }
    .hero {
      background: linear-gradient(135deg, ${w.branding.primaryColor}, ${w.branding.accentColor});
      color: #fff;
      padding: 48px 24px;
      text-align: center;
      border-radius: 0 0 16px 16px;
    }
    .hero h1 { font-size: 2rem; margin-bottom: 8px; }
    .hero p { font-size: 1.1rem; opacity: 0.9; max-width: 600px; margin: 0 auto; }
    .logo { max-height: 56px; margin-bottom: 16px; }
    ${w.branding.bannerUrl ? `.banner { width: 100%; max-height: 300px; object-fit: cover; border-radius: 12px; margin: -40px auto 24px; display: block; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }` : ''}
    .meta-bar {
      display: flex; flex-wrap: wrap; gap: 16px; justify-content: center;
      background: #fff; border-radius: 12px; padding: 16px 24px; margin: 24px 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .meta-item { text-align: center; }
    .meta-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .meta-value { font-size: 1rem; font-weight: 600; color: ${w.branding.primaryColor}; }
    .section { background: #fff; border-radius: 12px; padding: 24px; margin: 16px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    .section h2 { font-size: 1.25rem; color: ${w.branding.primaryColor}; margin-bottom: 12px; }
    .agenda-item { padding: 12px 0; border-bottom: 1px solid #f1f5f9; display: flex; gap: 12px; align-items: flex-start; }
    .agenda-item:last-child { border-bottom: none; }
    .agenda-time { font-size: 0.85rem; color: #64748b; min-width: 60px; font-weight: 500; }
    .agenda-title { font-weight: 600; }
    .agenda-type { font-size: 0.75rem; background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 4px; display: inline-block; margin-top: 4px; }
    .tags { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
    .tag { background: ${w.branding.primaryColor}15; color: ${w.branding.primaryColor}; padding: 4px 12px; border-radius: 999px; font-size: 0.8rem; }
    .reg-form { margin-top: 16px; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-weight: 500; margin-bottom: 4px; font-size: 0.9rem; }
    .form-group input, .form-group select, .form-group textarea {
      width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px;
      font-size: 1rem; font-family: inherit; transition: border 0.2s;
    }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
      outline: none; border-color: ${w.branding.primaryColor}; box-shadow: 0 0 0 3px ${w.branding.primaryColor}22;
    }
    .required::after { content: ' *'; color: #ef4444; }
    .btn-register {
      width: 100%; padding: 14px; background: ${w.branding.primaryColor}; color: #fff;
      border: none; border-radius: 8px; font-size: 1.05rem; font-weight: 600;
      cursor: pointer; transition: opacity 0.2s; font-family: inherit;
    }
    .btn-register:hover { opacity: 0.9; }
    .btn-register:disabled { opacity: 0.5; cursor: not-allowed; }
    .spots-left { text-align: center; font-size: 0.85rem; color: #64748b; margin-top: 8px; }
    .alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 0.9rem; }
    .alert-success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
    .alert-error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .closed-message { text-align: center; padding: 32px; color: #64748b; }
    @media (max-width: 640px) {
      .hero h1 { font-size: 1.5rem; }
      .meta-bar { flex-direction: column; align-items: center; }
      .container { padding: 16px; }
    }
    ${w.branding.customCss || ''}
  </style>
</head>
<body>
  <header class="hero">
    ${w.branding.logoUrl ? `<img src="${esc(w.branding.logoUrl)}" alt="${esc(this.config.orgName)}" class="logo" />` : ''}
    <h1>${esc(w.title)}</h1>
    <p>${esc(w.description)}</p>
  </header>

  <div class="container">
    ${w.branding.bannerUrl ? `<img src="${esc(w.branding.bannerUrl)}" alt="${esc(w.title)}" class="banner" />` : ''}

    <div class="meta-bar">
      <div class="meta-item">
        <div class="meta-label">Date</div>
        <div class="meta-value">${startDate}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Time</div>
        <div class="meta-value">${startTime} – ${endTime}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Timezone</div>
        <div class="meta-value">${esc(w.timezone)}</div>
      </div>
      ${spotsLeft < 50 && isOpen ? `
      <div class="meta-item">
        <div class="meta-label">Spots Left</div>
        <div class="meta-value" style="color:#ef4444">${spotsLeft}</div>
      </div>` : ''}
    </div>

    ${w.tags.length > 0 ? `<div class="tags">${w.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}

    ${w.branding.landingPageHtml ? `<div class="section">${w.branding.landingPageHtml}</div>` : ''}

    ${w.agenda.length > 0 ? this.renderAgenda(w) : ''}

    <div class="section" id="register-section">
      <h2>Register</h2>
      <div id="form-alert"></div>
      ${isOpen ? this.renderRegistrationForm(w) : `<div class="closed-message"><p>Registration is currently closed.</p></div>`}
    </div>
  </div>

  ${isOpen ? this.renderFormScript(w) : ''}
</body>
</html>`;
  }

  // ─── Sub-renderers ─────────────────────────────────────────────────────

  private renderAgenda(w: LandingPageWebinar): string {
    let cumulativeMinutes = 0;
    const items = w.agenda.map((seg) => {
      const mins = cumulativeMinutes;
      cumulativeMinutes += seg.durationMinutes;
      return `<div class="agenda-item">
        <div class="agenda-time">${mins}min</div>
        <div>
          <div class="agenda-title">${this.escapeHtml(seg.title)}</div>
          ${seg.description ? `<div style="color:#64748b;font-size:0.85rem;">${this.escapeHtml(seg.description)}</div>` : ''}
          <span class="agenda-type">${this.escapeHtml(seg.type)} · ${seg.durationMinutes}min</span>
        </div>
      </div>`;
    }).join('');

    return `<div class="section"><h2>Agenda</h2>${items}</div>`;
  }

  private renderRegistrationForm(w: LandingPageWebinar): string {
    const fields = w.registrationFields.map((f) => {
      const req = f.required ? ' required' : '';
      const reqClass = f.required ? ' class="required"' : '';
      let input: string;

      switch (f.type) {
        case 'select':
          input = `<select name="${this.escapeHtml(f.id)}" id="field-${f.id}"${req}>
            <option value="">Select...</option>
            ${(f.options || []).map((o) => `<option value="${this.escapeHtml(o)}">${this.escapeHtml(o)}</option>`).join('')}
          </select>`;
          break;
        case 'textarea':
          input = `<textarea name="${this.escapeHtml(f.id)}" id="field-${f.id}" rows="3" placeholder="${this.escapeHtml(f.placeholder || '')}"${req}></textarea>`;
          break;
        case 'checkbox':
          input = `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" name="${this.escapeHtml(f.id)}" id="field-${f.id}"${req} style="width:auto;">
            ${this.escapeHtml(f.label)}
          </label>`;
          return `<div class="form-group">${input}</div>`;
        default:
          input = `<input type="${f.type === 'email' ? 'email' : 'text'}" name="${this.escapeHtml(f.id)}" id="field-${f.id}" placeholder="${this.escapeHtml(f.placeholder || '')}"${req}>`;
      }

      return `<div class="form-group"><label for="field-${f.id}"${reqClass}>${this.escapeHtml(f.label)}</label>${input}</div>`;
    }).join('');

    return `<form class="reg-form" id="registration-form" novalidate>
      ${fields}
      <button type="submit" class="btn-register" id="submit-btn">Register Now</button>
      <p class="spots-left">${Math.max(0, w.maxParticipants - w.registrationCount)} spots remaining</p>
    </form>`;
  }

  private renderFormScript(w: LandingPageWebinar): string {
    const apiUrl = `${this.config.apiBaseUrl}/api/webinar/webinars/${w.id}/register`;

    return `<script>
(function() {
  var form = document.getElementById('registration-form');
  var btn = document.getElementById('submit-btn');
  var alert = document.getElementById('form-alert');

  if (!form) return;

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    btn.disabled = true;
    btn.textContent = 'Registering...';
    alert.innerHTML = '';

    var formData = {};
    var fields = form.querySelectorAll('input, select, textarea');
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      if (f.type === 'checkbox') {
        formData[f.name] = f.checked;
      } else {
        formData[f.name] = f.value;
      }
    }

    var body = {
      email: formData.email || '',
      name: formData.name || '',
      formData: formData
    };

    fetch('${apiUrl}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    .then(function(res) { return res.json().then(function(d) { return { ok: res.ok, data: d }; }); })
    .then(function(result) {
      if (result.ok) {
        var msg = result.data.status === 'waitlisted'
          ? 'You have been added to the waitlist. We will notify you if a spot opens up.'
          : 'Registration successful! Check your email for confirmation details.';
        alert.innerHTML = '<div class="alert alert-success">' + msg + '</div>';
        form.style.display = 'none';
      } else {
        alert.innerHTML = '<div class="alert alert-error">' + (result.data.error || 'Registration failed. Please try again.') + '</div>';
        btn.disabled = false;
        btn.textContent = 'Register Now';
      }
    })
    .catch(function() {
      alert.innerHTML = '<div class="alert alert-error">Network error. Please try again.</div>';
      btn.disabled = false;
      btn.textContent = 'Register Now';
    });
  });
})();
</script>`;
  }

  // ─── Error Pages ───────────────────────────────────────────────────────

  private render404(): string {
    return `<!DOCTYPE html><html><head><title>Webinar Not Found</title><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;color:#1e293b;}
.c{text-align:center;padding:24px;}h1{font-size:4rem;margin:0;color:#94a3b8;}p{color:#64748b;}</style></head>
<body><div class="c"><h1>404</h1><p>This webinar doesn't exist or has been removed.</p></div></body></html>`;
  }

  private render403(): string {
    return `<!DOCTYPE html><html><head><title>Private Webinar</title><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;color:#1e293b;}
.c{text-align:center;padding:24px;}h1{font-size:4rem;margin:0;color:#94a3b8;}p{color:#64748b;}</style></head>
<body><div class="c"><h1>🔒</h1><p>This webinar is private. You need an invitation to access it.</p></div></body></html>`;
  }

  // ─── Utilities ─────────────────────────────────────────────────────────

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  private formatDate(date: Date, _timezone: string): string {
    return date.toLocaleDateString('en-AU', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  }

  private formatTime(date: Date, _timezone: string): string {
    return date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
}

export default LandingPageGenerator;
