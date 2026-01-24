# Scholarly - The Unified Learning Nexus

An AI-powered education platform connecting learners with tutors, enabling homeschool communities, supporting micro-schools, and creating a marketplace for educational content.

## Vision

Scholarly is Chekd's education vertical - a comprehensive platform that brings together:

- **AI Buddy**: Personalized learning companion
- **Tutor Marketplace**: AI-powered matching between learners and verified tutors
- **Content Marketplace**: TPT-style resource marketplace with curriculum alignment
- **Curriculum Curator**: Australian Curriculum (ACARA) integration and cross-curricular discovery
- **Homeschool Hub**: Community platform for homeschool families, co-ops, and excursions
- **Micro-Schools**: Tools for small learning communities
- **Relief Teacher Marketplace**: AI-powered absence prediction and instant booking

## Architecture

```
scholarly/
├── apps/
│   └── web/                 # Next.js 14 frontend (App Router)
├── packages/
│   ├── api/                 # Express.js REST API
│   ├── database/            # Prisma ORM + PostgreSQL
│   ├── shared/              # Shared types, utilities, infrastructure
│   └── curriculum-processor/ # MRAC JSON-LD ingestion
└── scholarly-project-files/ # Vision docs, existing services, Australian Curriculum
```

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, shadcn/ui, React Query
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Build**: Turbo (monorepo orchestration), pnpm workspaces
- **Curriculum**: MRAC JSON-LD processor for Australian Curriculum

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- PostgreSQL 14+

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/scholarly.git
cd scholarly

# Install dependencies
pnpm install

# Copy environment files
cp .env.example .env
cp packages/database/.env.example packages/database/.env

# Set up database
pnpm db:generate
pnpm db:push
pnpm db:seed

# Start development servers
pnpm dev
```

### Development Commands

```bash
# Start all services (API + Web)
pnpm dev

# Start individual services
pnpm api:dev    # API server on http://localhost:3001
pnpm web:dev    # Next.js on http://localhost:3000

# Database operations
pnpm db:generate  # Generate Prisma client
pnpm db:push      # Push schema to database
pnpm db:migrate   # Run migrations
pnpm db:seed      # Seed demo data

# Curriculum ingestion
pnpm curriculum:validate  # Validate MRAC files
pnpm curriculum:ingest    # Import Australian Curriculum
pnpm curriculum:stats     # Show curriculum statistics
```

## Australian Curriculum Integration

Scholarly includes a MRAC (Machine Readable Australian Curriculum) processor that ingests ACARA's JSON-LD curriculum files:

```bash
# Validate curriculum files
pnpm curriculum:validate --source ./scholarly-project-files/Australian\ Curriculum

# Import into database
pnpm curriculum:ingest --source ./scholarly-project-files/Australian\ Curriculum
```

Supported learning areas:
- English (ENG)
- Mathematics (MAT)
- Science (SCI)
- Humanities and Social Sciences (HASS)
- The Arts (ART)
- Technologies (TEC)
- Health and Physical Education (HPE)
- Languages (LAN)

## Multi-Tenant & Multi-Jurisdiction

Scholarly supports multiple Australian states/territories with jurisdiction-specific requirements:

| Jurisdiction | Safeguarding Check | Curriculum Framework |
|-------------|-------------------|---------------------|
| AU_NSW | WWCC | ACARA |
| AU_VIC | WWCC | ACARA |
| AU_QLD | WWCC | ACARA |
| AU_WA | WWCC | ACARA |
| AU_SA | WWCC | ACARA |
| AU_TAS | WWCC | ACARA |
| AU_ACT | WWCC | ACARA |
| AU_NT | WWCC | ACARA |
| UK_ENGLAND | DBS | National Curriculum |
| UK_SCOTLAND | PVG | Curriculum for Excellence |

## Demo Mode

For development, enable demo mode to use simplified authentication:

```env
DEMO_MODE=true
```

Demo users:
- `parent@scholarly.demo` - Parent role
- `tutor@scholarly.demo` - Tutor role
- `admin@scholarly.demo` - Admin role
- `creator@scholarly.demo` - Content creator role

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Demo login
- `GET /api/v1/auth/me` - Current user

### Tutors
- `GET /api/v1/tutors` - Search tutors
- `GET /api/v1/tutors/:id` - Tutor profile
- `GET /api/v1/tutors/:id/availability` - Tutor availability

### Bookings
- `POST /api/v1/bookings` - Create booking
- `GET /api/v1/bookings` - List bookings
- `PATCH /api/v1/bookings/:id/confirm` - Confirm booking

### Curriculum
- `GET /api/v1/curriculum/standards` - Search standards
- `GET /api/v1/curriculum/standards/:id` - Standard details
- `POST /api/v1/curriculum/lesson-plans/generate` - AI lesson generation

### Content Marketplace
- `GET /api/v1/content` - Browse content
- `POST /api/v1/content` - Publish content
- `POST /api/v1/content/:id/purchase` - Purchase content

### Homeschool Hub
- `GET /api/v1/homeschool/coops` - Find co-ops
- `POST /api/v1/homeschool/excursions` - Plan excursion
- `GET /api/v1/homeschool/family` - Family profile

### Relief Teachers
- `GET /api/v1/relief/absences` - View absences
- `GET /api/v1/relief/predictions` - AI predictions
- `POST /api/v1/relief/bookings` - Book relief teacher

## Project Structure

```
packages/
├── api/
│   └── src/
│       ├── index.ts           # Express server
│       ├── middleware/        # Auth, error handling
│       └── routes/            # API routes
├── database/
│   └── prisma/
│       ├── schema.prisma      # Database schema
│       └── seed.ts            # Demo data
├── shared/
│   └── src/
│       ├── types/             # TypeScript types
│       ├── infrastructure/    # Base services, events, cache
│       └── utils/             # Validators, ID generation
└── curriculum-processor/
    └── src/
        ├── parser.ts          # MRAC JSON-LD parser
        ├── ingester.ts        # Database ingestion
        └── cli.ts             # CLI commands
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Copyright © 2024 Scholarly. All rights reserved.

## Acknowledgments

- [Australian Curriculum (ACARA)](https://www.australiancurriculum.edu.au/) for the Machine Readable Australian Curriculum
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Prisma](https://www.prisma.io/) for the database toolkit
