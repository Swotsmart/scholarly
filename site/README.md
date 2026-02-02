# Scholarly — Landing Site

**The Unified Learning Nexus** · Marketing & documentation site for the Scholarly education platform.

---

## What's In The Box

This package contains **17 production-ready HTML files** — one landing page and 16 service-specific inner pages — that together form the complete public-facing website for Scholarly. Every file is fully self-contained: all styles are inlined, all JavaScript is embedded, and all fonts are loaded from Google's CDN. There are no build steps, no bundlers, no node_modules. Think of it like a vinyl record — drop the needle anywhere and it plays.

```
scholarly-site/
├── index.html                  ← Landing page (hero, ecosystem overview, developer section)
├── ai-buddy.html               ← AI conversational tutor
├── golden-learning-path.html   ← Holistic learner profile & adaptive pathways
├── curriculum-intelligence.html ← Semantic curriculum engine & knowledge graphs
├── tutor-booking.html          ← AI-powered tutor matching & safeguarding
├── content-marketplace.html    ← Teachers Pay Teachers-style resource exchange
├── scheduling-engine.html      ← 6-stage optimization pipeline
├── eduscrum.html               ← Agile learning management with AI coaching
├── lis-bridge.html             ← Intelligence Mesh integration layer
├── relief-marketplace.html     ← Predictive relief teacher management
├── homeschool-hub.html         ← Family matching, co-ops & compliance
├── micro-schools.html          ← Small school lifecycle management
├── lingua-flow.html            ← Multi-language learning with XR immersion
├── token-economy.html          ← EDU-Nexus token & DAO governance
├── learning-portfolio.html     ← Verifiable credentials & SSI
├── assessment-engine.html      ← Dual-mode formative/summative assessment
├── developer-platform.html     ← API docs, SDK, event architecture
└── README.md                   ← You are here
```

**Total size:** ~500 KB (all 17 files combined — smaller than a single hero image on most marketing sites).

---

## Design System

The site uses a bespoke design language inspired by Apple's spatial clarity, adapted with an academic warmth:

| Role | Name | Primary | Usage |
|------|------|---------|-------|
| **Primary** | Sapphire | `#0C1B3A` → `#EEF3FB` | Knowledge, trust, navigation |
| **Accent** | Amber | `#B8860B` → `#FDF8EB` | Achievement, highlights, CTAs |
| **Growth** | Teal | `#0D6E6E` → `#F0FDFD` | Progress, wellness, exploration |
| **Care** | Rose | `#B44D6C` → `#FCE8EF` | Community, safety, alerts |
| **Neutral** | Ivory | `#2D2418` → `#FAF8F5` | Backgrounds, body text |

**Typography:** DM Serif Display (headings), Plus Jakarta Sans (body), JetBrains Mono (code) — all loaded via Google Fonts CDN.

**Animations:** Reveal-on-scroll via IntersectionObserver, pulse rings on interactive elements, staggered fade-up on card grids. All CSS-only, no animation libraries.

---

## Deployment

Because every file is static HTML with zero dependencies, you have remarkable freedom in how you deploy. Below are the most common approaches, ordered from simplest to most sophisticated.

### Option 1: Drag & Drop (Netlify / Cloudflare Pages)

The fastest path from folder to live URL. Both platforms offer generous free tiers that comfortably handle marketing sites.

**Netlify:**
1. Go to [app.netlify.com](https://app.netlify.com) and sign in
2. Drag the entire folder onto the deploy area
3. Your site is live at `https://<random-name>.netlify.app`
4. Add your custom domain under **Domain settings → Add custom domain**

**Cloudflare Pages:**
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create**
2. Choose **Upload assets** (Direct Upload)
3. Drag the folder, name your project, deploy
4. Live at `https://<project>.pages.dev`

Both platforms handle HTTPS, global CDN distribution, and cache invalidation automatically. No configuration files needed — the presence of `index.html` in the root is all they need.

### Option 2: GitHub Pages (via private repository)

Even though the codebase isn't public on GitHub, you can use a private repository with GitHub Pages for hosting.

1. Create a private repository on GitHub
2. Push all HTML files to the `main` branch root (or a `/docs` subfolder)
3. Go to **Settings → Pages → Source** and select your branch/folder
4. Enable HTTPS, add your custom domain via a CNAME file

```bash
# Quick setup
git init
git add *.html README.md
git commit -m "Initial landing site"
git remote add origin git@github.com:Swotsmart/scholarly-site.git
git push -u origin main
```

### Option 3: AWS S3 + CloudFront

For tighter integration with existing AWS infrastructure and fine-grained control over caching, headers, and access policies.

```bash
# Create and configure the S3 bucket
aws s3 mb s3://scholarly-site
aws s3 website s3://scholarly-site \
  --index-document index.html \
  --error-document index.html

# Upload all HTML files
aws s3 sync . s3://scholarly-site \
  --exclude "*" --include "*.html" \
  --cache-control "public, max-age=86400" \
  --content-type "text/html"

# Create a CloudFront distribution (for HTTPS + CDN)
aws cloudfront create-distribution \
  --origin-domain-name scholarly-site.s3.amazonaws.com \
  --default-root-object index.html
```

Then point your custom domain's DNS to the CloudFront distribution.

### Option 4: Vercel

If the Scholarly platform already uses Vercel for the Next.js app, co-locating the marketing site there keeps everything under one roof.

1. Install the Vercel CLI: `npm i -g vercel`
2. From the site folder: `vercel --prod`
3. Follow the prompts to link to your Vercel account
4. Add custom domain in the Vercel dashboard

### Option 5: Docker / Self-Hosted

For air-gapped environments or when the site needs to run alongside the platform services behind a reverse proxy.

```dockerfile
FROM nginx:alpine
COPY *.html /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

With a minimal `nginx.conf`:

```nginx
server {
    listen 80;
    server_name scholarly.app;
    root /usr/share/nginx/html;
    index index.html;

    # Clean URLs: /ai-buddy serves ai-buddy.html
    location / {
        try_files $uri $uri.html $uri/ =404;
    }

    # Cache static assets aggressively
    location ~* \.(html)$ {
        expires 1d;
        add_header Cache-Control "public, no-transform";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

Then build and run:

```bash
docker build -t scholarly-site .
docker run -d -p 80:80 scholarly-site
```

---

## Custom Domain Setup

Regardless of which hosting platform you choose, the DNS configuration follows the same pattern:

| Record Type | Name | Value | TTL |
|------------|------|-------|-----|
| `A` | `@` | Platform's IP (or ALIAS to CDN) | 300 |
| `CNAME` | `www` | `your-site.netlify.app` (or equivalent) | 300 |

Most platforms will guide you through this and issue SSL certificates automatically via Let's Encrypt.

---

## Updating the `#docs` Placeholder

All "Read the Docs" and "View Documentation" buttons currently link to `#docs` — a placeholder for your future documentation URL. When your docs site is ready, a single find-and-replace updates every file:

```bash
# Replace across all HTML files
sed -i 's|#docs|https://docs.scholarly.app|g' *.html
```

---

## Linking Between Pages

All 17 pages are designed to live in the same directory (flat structure, no subfolders). The navigation and cross-links use relative paths like `href="ai-buddy.html"`, so the files must remain siblings. If you need a subfolder structure (e.g., `/services/ai-buddy.html`), you'll need to update the relative links — or use the nginx `try_files` approach above to serve clean URLs from a flat directory.

**Cross-linking architecture:**
- The **landing page** links to all 16 inner pages via the mega dropdown navigation, the ecosystem card grid, and the footer
- Each **inner page** links back to the landing page and to its "Connected Services" via chips at the bottom
- All pages share a consistent footer with links to Home, All Services, and Developers

---

## Performance Notes

The site is already optimised for fast loading, but here are some additional measures worth considering for production:

**What's already done:**
- All CSS and JS is inlined (zero render-blocking requests beyond fonts)
- No external dependencies beyond Google Fonts
- Animations use CSS transforms and opacity (GPU-accelerated, no layout thrashing)
- Semantic HTML5 with accessible markup

**Worth adding for production:**
- **Font preloading** — add `<link rel="preload">` tags for the three Google Fonts to eliminate the flash of unstyled text
- **Image optimisation** — if you add hero images or screenshots later, use WebP format with `<picture>` fallbacks
- **Compression** — most hosting platforms enable gzip/brotli automatically, but verify in your CDN settings
- **Preconnect** — already done for `fonts.googleapis.com` and `fonts.gstatic.com`

---

## Browser Support

The site uses modern CSS (custom properties, grid, flexbox, backdrop-filter) and JavaScript (IntersectionObserver, optional chaining). Supported browsers:

- Chrome / Edge 80+
- Firefox 78+
- Safari 13.1+
- iOS Safari 13.4+
- Samsung Internet 13+

Internet Explorer is not supported (and doesn't deserve to be).

---

## File Size Breakdown

| File | Size | Lines |
|------|------|-------|
| `index.html` | ~83 KB | ~1,317 |
| `ai-buddy.html` | ~26 KB | ~310 |
| `developer-platform.html` | ~23 KB | ~280 |
| `curriculum-intelligence.html` | ~23 KB | ~270 |
| `golden-learning-path.html` | ~24 KB | ~260 |
| `scheduling-engine.html` | ~21 KB | ~250 |
| All other inner pages | ~20 KB each | ~230 each |
| **Total** | **~500 KB** | **~5,200** |

---

## Colour Theming by Service

Each inner page carries its own accent colour from the design system, creating visual identity while maintaining brand cohesion:

| Colour | Services |
|--------|----------|
| **Sapphire** | AI Buddy, Curriculum Intelligence, LIS Bridge, Developer Platform |
| **Amber** | Golden Learning Path, Homeschool Hub, Token Economy, EduScrum |
| **Teal** | Tutor Booking, Scheduling Engine, Micro-Schools, LinguaFlow, Learning Portfolio |
| **Rose** | Content Marketplace, Relief Marketplace, Assessment Engine |

---

## License

Proprietary. All rights reserved by Scholarly / Swotsmart.

---

*Built with care for the Scholarly platform · February 2026*
