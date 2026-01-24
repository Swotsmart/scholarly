# Scholarly - The Unified Learning Nexus

An AI-powered education platform connecting learners with tutors, enabling homeschool communities, supporting micro-schools, and creating a marketplace for educational content.

## Vision

Scholarly is Chekd's education vertical - a comprehensive platform that brings together:

- **AI Buddy**: Personalized learning companion
- **Design & Pitch AI**: Guy Kawasaki 10/20/30 methodology for student pitches
- **Showcase Portfolio**: Digital portfolio system for student work
- **Tutor Marketplace**: AI-powered matching between learners and verified tutors
- **Content Marketplace**: TPT-style resource marketplace with curriculum alignment
- **Curriculum Curator**: Australian Curriculum (ACARA) integration and cross-curricular discovery
- **Scheduling Engine**: Institutional scheduling with timetables, relief coverage, room booking
- **Homeschool Hub**: Community platform for homeschool families, co-ops, and excursions
- **Micro-Schools**: Tools for small learning communities
- **Relief Teacher Marketplace**: AI-powered absence prediction and instant booking
- **Blockchain Integration**: Soulbound credentials, payment escrow, reputation registry

---

## Table of Contents

- [Architecture](#architecture)
- [Module Locations](#module-locations)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Demo Accounts](#demo-accounts)
- [API Endpoints](#api-endpoints)
- [Australian Curriculum Integration](#australian-curriculum-integration)
- [Deployment Guide (Azure)](#deployment-guide-azure)
- [Contributing](#contributing)

---

## Architecture

```
scholarly/
├── apps/
│   └── web/                      # Legacy Next.js app
├── packages/
│   ├── api/                      # Express.js REST API
│   │   └── src/
│   │       ├── services/         # Business logic services
│   │       ├── routes/           # API route handlers
│   │       ├── middleware/       # Auth, rate limiting, CSRF
│   │       └── repositories/     # Data access layer
│   ├── blockchain/               # Solidity smart contracts
│   │   └── contracts/            # ERC-20, ERC-721, Escrow
│   ├── database/                 # Prisma ORM + PostgreSQL
│   │   └── prisma/               # Schema & migrations
│   ├── shared/                   # Shared types & utilities
│   │   └── src/
│   │       ├── types/            # TypeScript interfaces
│   │       ├── infrastructure/   # Base services, cache, events
│   │       └── utils/            # Validators, ID generation
│   ├── curriculum-processor/     # MRAC JSON-LD ingestion
│   └── web/                      # Next.js 14 frontend (main)
│       └── src/
│           ├── app/              # App Router pages
│           ├── components/       # React components
│           └── stores/           # Zustand state management
└── scholarly-project-files/      # Docs & Australian Curriculum data
```

---

## Module Locations

### Backend Services (`packages/api/src/services/`)

| Module | File | Description |
|--------|------|-------------|
| **Scheduling Engine** | `scheduling-engine.service.ts` | Institutional scheduling, timetables, constraint solving |
| **Curriculum Curator** | `curriculum-curator.service.ts` | Australian Curriculum alignment, standards mapping |
| **Design & Pitch AI** | `design-pitch-ai.service.ts` | Guy Kawasaki 10/20/30 methodology, AI pitch coaching |
| **Showcase Portfolio** | `showcase-portfolio.service.ts` | Digital portfolio system, sharing, analytics |
| **Digital Portfolio** | `digital-portfolio.service.ts` | Portfolio artifacts management |
| **Relief Marketplace** | `relief-marketplace.service.ts` | Relief/substitute teacher matching |
| **Tutor Booking** | `tutor-booking.service.ts` | Tutor marketplace & session bookings |
| **Homeschool Hub** | `homeschool-hub.service.ts` | Homeschool family support, co-ops |
| **Micro-school** | `micro-school.service.ts` | Micro-school/learning pod management |
| **Capacity Planning** | `capacity-planning.service.ts` | Resource & capacity optimization |
| **Content Marketplace** | `content-marketplace.service.ts` | Educational content trading |
| **EduScrum Orchestrator** | `eduscrum-orchestrator.service.ts` | Agile learning sprints |
| **AI Content Studio** | `ai-content-studio.service.ts` | AI-generated learning content |
| **AI Buddy** | `ai-buddy.service.ts` | Personalized student AI assistant |
| **AI Integration** | `ai-integration.service.ts` | LLM provider abstraction |
| **Analytics & Reporting** | `analytics-reporting.service.ts` | Learning analytics dashboard |
| **Standards Compliance** | `standards-compliance.service.ts` | Regulatory compliance checking |
| **Blockchain** | `blockchain.service.ts` | Web3 credential integration |
| **Auth** | `auth.service.ts` | JWT RS256 authentication |
| **Data Lake** | `data-lake.service.ts` | Analytics data warehouse |
| **ML Pipeline** | `ml-pipeline.service.ts` | Machine learning predictions |
| **LIS Bridge** | `lis-scholarly-bridge.service.ts` | Learning Information Services integration |
| **Project-Based Learning** | `project-based-learning.service.ts` | PBL workflow management |

### API Routes (`packages/api/src/routes/`)

| Endpoint | File | Description |
|----------|------|-------------|
| `/api/auth` | `auth.ts` | Authentication & token management |
| `/api/design-pitch` | `design-pitch-ai.ts` | Design challenges, journeys, pitch decks |
| `/api/showcase` | `showcase-portfolio.ts` | Portfolio CRUD, sharing, analytics |
| `/api/portfolio` | `portfolio.ts` | Portfolio artifacts |
| `/api/curriculum` | `curriculum.ts` | Curriculum search, standards alignment |
| `/api/relief` | `relief.ts` | Relief teacher slots & bookings |
| `/api/bookings` | `bookings.ts` | Tutor session bookings |
| `/api/tutors` | `tutors.ts` | Tutor profiles & availability |
| `/api/sessions` | `sessions.ts` | Learning sessions |
| `/api/homeschool` | `homeschool.ts` | Homeschool features |
| `/api/micro-school` | `micro-school.ts` | Micro-school management |
| `/api/content` | `content.ts` | Content marketplace |
| `/api/analytics` | `analytics.ts` | Reporting & analytics |
| `/api/dashboard` | `dashboard.ts` | Dashboard data |
| `/api/ai-buddy` | `ai-buddy.ts` | AI assistant interactions |
| `/api/data-lake` | `data-lake.ts` | Data warehouse queries |
| `/api/ml-pipeline` | `ml-pipeline.ts` | ML predictions |
| `/api/standards-compliance` | `standards-compliance.ts` | Compliance checks |
| `/api/users` | `users.ts` | User management |

### Frontend Pages (`packages/web/src/app/`)

#### Student Pages (`(dashboard)/`)

| Module | Path | Pages |
|--------|------|-------|
| **Dashboard** | `/dashboard` | Main student dashboard |
| **Design & Pitch** | `/design-pitch/` | `page.tsx` - Overview |
| | `/design-pitch/challenges/` | Active design challenges |
| | `/design-pitch/journeys/` | Design thinking journeys |
| | `/design-pitch/pitch-decks/` | Pitch deck builder |
| **Showcase Portfolio** | `/showcase/` | `page.tsx` - Portfolio overview |
| | `/showcase/portfolios/` | Portfolio management |
| | `/showcase/analytics/` | Portfolio view analytics |
| **Learning** | `/learning/` | `page.tsx` - Learning hub |
| | `/learning/courses/` | Course catalog |
| | `/learning/progress/` | Progress tracking |
| **Tutoring** | `/tutoring/` | `page.tsx` - Tutoring hub |
| | `/tutoring/search/` | Find tutors |
| | `/tutoring/bookings/` | Session bookings |
| **Analytics** | `/analytics/` | Personal analytics |
| **Settings** | `/settings/` | Account settings |

#### Teacher Pages (`(dashboard)/teacher/`)

| Module | Path | Pages |
|--------|------|-------|
| **Dashboard** | `/teacher/dashboard` | Teacher dashboard with pending actions |
| **Classes** | `/teacher/classes` | Class management |
| **Students** | `/teacher/students` | Student progress tracking |
| **Challenges** | `/teacher/challenges` | Design challenge management |
| **Journeys** | `/teacher/journeys` | Monitor student journeys |
| **Reviews** | `/teacher/reviews` | Peer review moderation |
| **Grading** | `/teacher/grading` | Pitch & portfolio evaluation |
| **Scheduling** | `/teacher/scheduling/` | Scheduling hub |
| | `/teacher/scheduling/timetable/` | Weekly timetable view |
| | `/teacher/scheduling/relief/` | Relief coverage management |
| | `/teacher/scheduling/rooms/` | Room & facility booking |
| **Reports** | `/teacher/reports` | Class reports & analytics |

### Blockchain Contracts (`packages/blockchain/contracts/`)

| Contract | File | Description |
|----------|------|-------------|
| **ScholarlyToken** | `ScholarlyToken.sol` | ERC-20 payment token |
| **CredentialNFT** | `CredentialNFT.sol` | Soulbound ERC-721 credentials |
| **BookingEscrow** | `BookingEscrow.sol` | Tutor payment escrow |
| **ReputationRegistry** | `ReputationRegistry.sol` | On-chain trust scores |

### Curriculum Data (`scholarly-project-files/Australian Curriculum/`)

| Category | Contents |
|----------|----------|
| **Learning Areas** | English, Mathematics, Science, HASS, Technologies, Arts, HPE, Languages |
| **General Capabilities** | Literacy, Numeracy, Digital Literacy, Critical & Creative Thinking, Personal & Social, Ethical Understanding, Intercultural Understanding |
| **Formats** | `.jsonld` (JSON-LD), `.rdf` (RDF/XML) |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript |
| **Styling** | Tailwind CSS, shadcn/ui components |
| **State** | Zustand, React Query (TanStack Query) |
| **Backend** | Express.js, TypeScript |
| **Database** | PostgreSQL 14+, Prisma ORM |
| **Auth** | JWT (RS256), httpOnly cookies, CSRF tokens |
| **Blockchain** | Solidity, Hardhat, ethers.js, Polygon |
| **Build** | Turborepo, pnpm workspaces |
| **Logging** | Pino (structured JSON logging) |

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- PostgreSQL 14+

### Installation

```bash
# Clone the repository
git clone https://github.com/Swotsmart/scholarly.git
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

# Testing
pnpm test         # Run all tests
pnpm test:unit    # Unit tests only
pnpm test:e2e     # End-to-end tests

# Blockchain
pnpm blockchain:compile   # Compile Solidity contracts
pnpm blockchain:test      # Run contract tests
pnpm blockchain:deploy    # Deploy to network
```

---

## Demo Accounts

Enable demo mode in `.env`:

```env
DEMO_MODE=true
```

| Account | Email | Password | Role |
|---------|-------|----------|------|
| Student | `student@scholarly.app` | `demo123` | learner |
| Teacher | `teacher@scholarly.app` | `demo123` | teacher |
| Parent | `parent@scholarly.demo` | `demo123` | parent |
| Tutor | `tutor@scholarly.demo` | `demo123` | tutor |
| Admin | `admin@scholarly.demo` | `demo123` | platform_admin |
| Creator | `creator@scholarly.demo` | `demo123` | content_creator |

---

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with credentials
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout and revoke tokens
- `GET /api/auth/me` - Get current user

### Design & Pitch AI
- `GET /api/design-pitch/challenges` - List design challenges
- `POST /api/design-pitch/challenges` - Create challenge
- `GET /api/design-pitch/journeys` - Student journeys
- `POST /api/design-pitch/journeys/:id/artifacts` - Submit artifact
- `POST /api/design-pitch/pitch-decks/:id/feedback` - Get AI feedback

### Showcase Portfolio
- `GET /api/showcase/portfolios` - List portfolios
- `POST /api/showcase/portfolios` - Create portfolio
- `POST /api/showcase/portfolios/:id/share` - Generate share link
- `GET /api/showcase/portfolios/:id/analytics` - View analytics

### Curriculum
- `GET /api/curriculum/standards` - Search standards
- `GET /api/curriculum/standards/:id` - Standard details
- `POST /api/curriculum/lesson-plans/generate` - AI lesson generation
- `GET /api/curriculum/cross-curricular` - Cross-curricular links

### Tutoring & Bookings
- `GET /api/tutors` - Search tutors
- `GET /api/tutors/:id/availability` - Tutor availability
- `POST /api/bookings` - Create booking
- `PATCH /api/bookings/:id/confirm` - Confirm booking

### Relief Teachers
- `GET /api/relief/absences` - View absences
- `GET /api/relief/predictions` - AI predictions
- `POST /api/relief/bookings` - Book relief teacher

---

## Australian Curriculum Integration

Scholarly includes a MRAC (Machine Readable Australian Curriculum) processor:

```bash
# Validate curriculum files
pnpm curriculum:validate --source ./scholarly-project-files/Australian\ Curriculum

# Import into database
pnpm curriculum:ingest --source ./scholarly-project-files/Australian\ Curriculum
```

### Supported Learning Areas

| Code | Learning Area |
|------|--------------|
| ENG | English |
| MAT | Mathematics |
| SCI | Science |
| HASS | Humanities and Social Sciences |
| ART | The Arts |
| TEC | Technologies |
| HPE | Health and Physical Education |
| LAN | Languages |

### Multi-Jurisdiction Support

| Jurisdiction | Safeguarding | Curriculum |
|-------------|--------------|------------|
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

---

## Deployment Guide (Azure)

This guide covers deploying Scholarly to Microsoft Azure using Azure Container Apps, Azure Database for PostgreSQL, and Azure Blob Storage.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Azure Cloud                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐        │
│  │   Azure      │     │   Azure      │     │   Azure      │        │
│  │   Front Door │────▶│   Container  │────▶│   Container  │        │
│  │   (CDN/WAF)  │     │   Apps (Web) │     │   Apps (API) │        │
│  └──────────────┘     └──────────────┘     └──────────────┘        │
│                              │                    │                  │
│                              │                    │                  │
│                              ▼                    ▼                  │
│                       ┌──────────────┐     ┌──────────────┐        │
│                       │   Azure      │     │   Azure      │        │
│                       │   Redis      │     │   PostgreSQL │        │
│                       │   Cache      │     │   Flexible   │        │
│                       └──────────────┘     └──────────────┘        │
│                                                   │                  │
│                              ┌────────────────────┘                  │
│                              ▼                                       │
│                       ┌──────────────┐     ┌──────────────┐        │
│                       │   Azure      │     │   Azure      │        │
│                       │   Blob       │     │   Key Vault  │        │
│                       │   Storage    │     │   (Secrets)  │        │
│                       └──────────────┘     └──────────────┘        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Prerequisites

1. **Azure CLI** installed and authenticated
2. **Docker** installed locally
3. **Azure subscription** with appropriate permissions

```bash
# Install Azure CLI (macOS)
brew install azure-cli

# Login to Azure
az login

# Set subscription
az account set --subscription "Your Subscription Name"
```

### Step 1: Create Resource Group

```bash
# Variables
export RESOURCE_GROUP="scholarly-prod"
export LOCATION="australiaeast"
export ENV_NAME="scholarly"

# Create resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION
```

### Step 2: Create Azure Container Registry

```bash
export ACR_NAME="scholarlyacr"

# Create container registry
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Standard \
  --admin-enabled true

# Get login credentials
az acr credential show --name $ACR_NAME
```

### Step 3: Create Azure Database for PostgreSQL

```bash
export PG_SERVER="scholarly-db"
export PG_ADMIN="scholarlyadmin"
export PG_PASSWORD="$(openssl rand -base64 32)"

# Create PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $PG_SERVER \
  --location $LOCATION \
  --admin-user $PG_ADMIN \
  --admin-password "$PG_PASSWORD" \
  --sku-name Standard_B2s \
  --tier Burstable \
  --storage-size 32 \
  --version 14 \
  --yes

# Create database
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $PG_SERVER \
  --database-name scholarly

# Configure firewall (allow Azure services)
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $PG_SERVER \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Get connection string
export DATABASE_URL="postgresql://${PG_ADMIN}:${PG_PASSWORD}@${PG_SERVER}.postgres.database.azure.com:5432/scholarly?sslmode=require"
echo "DATABASE_URL=$DATABASE_URL"
```

### Step 4: Create Azure Redis Cache

```bash
export REDIS_NAME="scholarly-redis"

# Create Redis Cache
az redis create \
  --resource-group $RESOURCE_GROUP \
  --name $REDIS_NAME \
  --location $LOCATION \
  --sku Basic \
  --vm-size c0

# Get connection string
az redis show \
  --resource-group $RESOURCE_GROUP \
  --name $REDIS_NAME \
  --query "hostName" -o tsv
```

### Step 5: Create Azure Key Vault

```bash
export VAULT_NAME="scholarly-vault"

# Create Key Vault
az keyvault create \
  --resource-group $RESOURCE_GROUP \
  --name $VAULT_NAME \
  --location $LOCATION

# Store secrets
az keyvault secret set --vault-name $VAULT_NAME --name "DATABASE-URL" --value "$DATABASE_URL"
az keyvault secret set --vault-name $VAULT_NAME --name "JWT-SECRET" --value "$(openssl rand -base64 64)"
az keyvault secret set --vault-name $VAULT_NAME --name "CSRF-SECRET" --value "$(openssl rand -base64 32)"
```

### Step 6: Create Azure Blob Storage

```bash
export STORAGE_ACCOUNT="scholarlystorage"

# Create storage account
az storage account create \
  --resource-group $RESOURCE_GROUP \
  --name $STORAGE_ACCOUNT \
  --location $LOCATION \
  --sku Standard_LRS

# Create containers
az storage container create --name portfolios --account-name $STORAGE_ACCOUNT
az storage container create --name curriculum --account-name $STORAGE_ACCOUNT
az storage container create --name content --account-name $STORAGE_ACCOUNT
```

### Step 7: Build and Push Docker Images

Create `Dockerfile.api`:

```dockerfile
# packages/api/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY packages/shared ./packages/shared
COPY packages/database ./packages/database
COPY packages/api ./packages/api
RUN pnpm --filter @scholarly/api build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/api/dist ./dist
COPY --from=builder /app/packages/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

Create `Dockerfile.web`:

```dockerfile
# packages/web/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY packages/web/package.json ./packages/web/
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY packages/web ./packages/web
RUN pnpm --filter @scholarly/web build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/web/.next/standalone ./
COPY --from=builder /app/packages/web/.next/static ./.next/static
COPY --from=builder /app/packages/web/public ./public
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
```

Build and push:

```bash
# Login to ACR
az acr login --name $ACR_NAME

# Build and push API
docker build -f packages/api/Dockerfile -t $ACR_NAME.azurecr.io/scholarly-api:latest .
docker push $ACR_NAME.azurecr.io/scholarly-api:latest

# Build and push Web
docker build -f packages/web/Dockerfile -t $ACR_NAME.azurecr.io/scholarly-web:latest .
docker push $ACR_NAME.azurecr.io/scholarly-web:latest
```

### Step 8: Create Container Apps Environment

```bash
export CONTAINERAPPS_ENV="scholarly-env"

# Create Container Apps environment
az containerapp env create \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINERAPPS_ENV \
  --location $LOCATION
```

### Step 9: Deploy API Container App

```bash
# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query "username" -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

# Deploy API
az containerapp create \
  --resource-group $RESOURCE_GROUP \
  --name scholarly-api \
  --environment $CONTAINERAPPS_ENV \
  --image $ACR_NAME.azurecr.io/scholarly-api:latest \
  --registry-server $ACR_NAME.azurecr.io \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --target-port 3001 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 10 \
  --cpu 0.5 \
  --memory 1Gi \
  --env-vars \
    NODE_ENV=production \
    DATABASE_URL=secretref:database-url \
    JWT_SECRET=secretref:jwt-secret \
    REDIS_URL="redis://$REDIS_NAME.redis.cache.windows.net:6380" \
  --secrets \
    database-url="$DATABASE_URL" \
    jwt-secret="$(az keyvault secret show --vault-name $VAULT_NAME --name JWT-SECRET --query value -o tsv)"

# Get API URL
API_URL=$(az containerapp show --resource-group $RESOURCE_GROUP --name scholarly-api --query "properties.configuration.ingress.fqdn" -o tsv)
echo "API URL: https://$API_URL"
```

### Step 10: Deploy Web Container App

```bash
# Deploy Web
az containerapp create \
  --resource-group $RESOURCE_GROUP \
  --name scholarly-web \
  --environment $CONTAINERAPPS_ENV \
  --image $ACR_NAME.azurecr.io/scholarly-web:latest \
  --registry-server $ACR_NAME.azurecr.io \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 10 \
  --cpu 0.5 \
  --memory 1Gi \
  --env-vars \
    NODE_ENV=production \
    NEXT_PUBLIC_API_URL="https://$API_URL"

# Get Web URL
WEB_URL=$(az containerapp show --resource-group $RESOURCE_GROUP --name scholarly-web --query "properties.configuration.ingress.fqdn" -o tsv)
echo "Web URL: https://$WEB_URL"
```

### Step 11: Configure Azure Front Door (Optional)

```bash
export FRONT_DOOR="scholarly-fd"

# Create Front Door profile
az afd profile create \
  --resource-group $RESOURCE_GROUP \
  --profile-name $FRONT_DOOR \
  --sku Standard_AzureFrontDoor

# Add endpoint
az afd endpoint create \
  --resource-group $RESOURCE_GROUP \
  --profile-name $FRONT_DOOR \
  --endpoint-name scholarly \
  --enabled-state Enabled

# Add origin group and origins for web and API
# (Configure routing rules as needed)
```

### Step 12: Run Database Migrations

```bash
# Connect to API container and run migrations
az containerapp exec \
  --resource-group $RESOURCE_GROUP \
  --name scholarly-api \
  --command "npx prisma migrate deploy"

# Seed initial data (optional)
az containerapp exec \
  --resource-group $RESOURCE_GROUP \
  --name scholarly-api \
  --command "npx prisma db seed"
```

### Step 13: Configure Custom Domain (Optional)

```bash
# Add custom domain to web app
az containerapp hostname add \
  --resource-group $RESOURCE_GROUP \
  --name scholarly-web \
  --hostname app.scholarly.edu.au

# Configure SSL certificate
az containerapp hostname bind \
  --resource-group $RESOURCE_GROUP \
  --name scholarly-web \
  --hostname app.scholarly.edu.au \
  --environment $CONTAINERAPPS_ENV \
  --validation-method CNAME
```

### Environment Variables Reference

| Variable | Description | Where to Set |
|----------|-------------|--------------|
| `DATABASE_URL` | PostgreSQL connection string | Key Vault → Container App secret |
| `JWT_SECRET` | JWT signing secret | Key Vault → Container App secret |
| `JWT_PRIVATE_KEY` | RS256 private key (optional) | Key Vault → Container App secret |
| `CSRF_SECRET` | CSRF token secret | Key Vault → Container App secret |
| `REDIS_URL` | Redis connection string | Container App env var |
| `AZURE_STORAGE_CONNECTION_STRING` | Blob storage connection | Key Vault → Container App secret |
| `NEXT_PUBLIC_API_URL` | API URL for frontend | Container App env var |
| `NODE_ENV` | Environment (production) | Container App env var |

### CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]

env:
  AZURE_CONTAINER_REGISTRY: scholarlyacr
  RESOURCE_GROUP: scholarly-prod

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Build and push API
        run: |
          az acr login --name ${{ env.AZURE_CONTAINER_REGISTRY }}
          docker build -f packages/api/Dockerfile -t ${{ env.AZURE_CONTAINER_REGISTRY }}.azurecr.io/scholarly-api:${{ github.sha }} .
          docker push ${{ env.AZURE_CONTAINER_REGISTRY }}.azurecr.io/scholarly-api:${{ github.sha }}

      - name: Build and push Web
        run: |
          docker build -f packages/web/Dockerfile -t ${{ env.AZURE_CONTAINER_REGISTRY }}.azurecr.io/scholarly-web:${{ github.sha }} .
          docker push ${{ env.AZURE_CONTAINER_REGISTRY }}.azurecr.io/scholarly-web:${{ github.sha }}

      - name: Deploy API
        run: |
          az containerapp update \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --name scholarly-api \
            --image ${{ env.AZURE_CONTAINER_REGISTRY }}.azurecr.io/scholarly-api:${{ github.sha }}

      - name: Deploy Web
        run: |
          az containerapp update \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --name scholarly-web \
            --image ${{ env.AZURE_CONTAINER_REGISTRY }}.azurecr.io/scholarly-web:${{ github.sha }}
```

### Cost Estimation (AUD/month)

| Service | SKU | Estimated Cost |
|---------|-----|----------------|
| Container Apps (API) | 0.5 vCPU, 1GB | ~$50 |
| Container Apps (Web) | 0.5 vCPU, 1GB | ~$50 |
| PostgreSQL Flexible | Standard_B2s | ~$80 |
| Redis Cache | Basic C0 | ~$25 |
| Blob Storage | Standard LRS | ~$5 |
| Container Registry | Standard | ~$25 |
| Front Door (optional) | Standard | ~$50 |
| **Total** | | **~$285/month** |

*Prices are estimates and may vary. Use [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/) for accurate quotes.*

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

Copyright © 2024 Scholarly. All rights reserved.

---

## Acknowledgments

- [Australian Curriculum (ACARA)](https://www.australiancurriculum.edu.au/) for the Machine Readable Australian Curriculum
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Prisma](https://www.prisma.io/) for the database toolkit
- [Guy Kawasaki](https://guykawasaki.com/) for the 10/20/30 pitch methodology
