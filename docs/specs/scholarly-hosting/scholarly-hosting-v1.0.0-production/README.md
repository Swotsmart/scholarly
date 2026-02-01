# Scholarly Hosting

Educational web hosting platform for schools, tutors, micro-schools, and homeschool co-ops.

## Overview

Scholarly Hosting provides educational providers with professional web presences that are:
- **AI-Discoverable**: Schema.org structured data makes providers findable by AI agents
- **Trust-Verified**: Quality scores based on verified outcomes, accreditations, and reviews
- **Fully Integrated**: Connected to the Scholarly Intelligence Mesh for holistic student data

## Features

### For Providers
- Custom subdomains (`your-school.scholar.ly`) or bring your own domain
- Quality Profile with verified educational outcomes
- Review management with moderation
- Enquiry and tour booking management
- SEO optimisation with structured data

### For AI Agents
- RESTful API for educational discovery
- Provider search with quality filters
- Side-by-side comparison with recommendations
- Real-time availability checking
- Verified outcome data

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Redis 7+

### Installation

```bash
# Clone repository
git clone https://github.com/scholarly/hosting.git
cd hosting

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database (optional)
npm run db:seed

# Start development server
npm run dev
```

### Docker

```bash
# Start all services
docker-compose up -d

# Run migrations
docker-compose --profile migrate up

# View logs
docker-compose logs -f app
```

## API Endpoints

### Provider Management
```
POST   /api/hosting/providers           Create provider
GET    /api/hosting/providers/:id       Get provider
PATCH  /api/hosting/providers/:id       Update provider
POST   /api/hosting/providers/:id/activate  Activate provider
```

### Quality Profile
```
GET    /api/hosting/providers/:id/quality      Get quality profile
POST   /api/hosting/providers/:id/outcomes     Submit outcome
POST   /api/hosting/providers/:id/accreditations  Add accreditation
POST   /api/hosting/providers/:id/registration Submit registration
```

### Domain Management
```
POST   /api/hosting/providers/:id/domains           Add domain
POST   /api/hosting/providers/:id/domains/:id/verify  Verify domain
```

### Agent API
```
POST   /api/agent/search/providers    Search providers
POST   /api/agent/search/offerings    Search offerings
GET    /api/agent/providers/:id       Get provider details
GET    /api/agent/providers/:id/quality  Get quality profile
POST   /api/agent/compare             Compare providers
POST   /api/agent/enquiries           Submit enquiry
```

## Architecture

```
src/
├── types/           # TypeScript type definitions
├── infrastructure/  # Database, events, logging
├── repositories/    # Data access layer
├── services/        # Business logic
└── routes/          # API endpoints
```

## Quality Score

Providers are scored on:
- **Registration** (20%): Government registration status
- **Accreditation** (15%): IB, CRICOS, etc.
- **Outcomes** (25%): Verified academic results
- **Reviews** (15%): Parent/student reviews
- **Staff** (15%): Teacher qualifications
- **Compliance** (5%): Child safety, building codes
- **Engagement** (5%): Platform activity

## Development

```bash
# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint

# Format
npm run format

# Database studio
npm run db:studio
```

## Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure real database credentials
- [ ] Set up SSL certificates
- [ ] Configure rate limiting
- [ ] Set up monitoring (Sentry, Datadog)
- [ ] Configure backup strategy

### Environment Variables
See `.env.example` for all configuration options.

## License

Proprietary - Scholarly Pty Ltd
