# Azure Deployment Guide

This document outlines the various approaches for deploying to Azure and the permissions/setup required for each.

---

## Table of Contents

1. [Overview](#overview)
2. [Common Prerequisites](#common-prerequisites)
3. [Deployment Approaches](#deployment-approaches)
   - [Option A: Azure Container Apps (Recommended)](#option-a-azure-container-apps-recommended)
   - [Option B: Azure App Service](#option-b-azure-app-service)
   - [Option C: Azure Kubernetes Service (AKS)](#option-c-azure-kubernetes-service-aks)
   - [Option D: Azure Container Instances (ACI)](#option-d-azure-container-instances-aci)
4. [Authentication Methods](#authentication-methods)
5. [Permission Summary Matrix](#permission-summary-matrix)
6. [Post-Setup Checklist](#post-setup-checklist)

---

## Overview

| Approach | Complexity | Cost | Best For |
|----------|------------|------|----------|
| Container Apps | Low | $$ | Modern containerized apps, auto-scaling |
| App Service | Low | $$ | Traditional web apps, quick deployments |
| AKS | High | $$$ | Enterprise, multi-service architectures |
| Container Instances | Very Low | $ | Simple, single-container workloads |

---

## Common Prerequisites

Before any deployment approach, you need:

### 1. Azure CLI Installed

```bash
# macOS
brew install azure-cli

# Verify installation
az version
```

### 2. Azure Subscription

- Active Azure subscription with billing enabled
- Subscription ID (find in Azure Portal > Subscriptions)

### 3. Azure Authentication

```bash
# Interactive login (opens browser)
az login

# Verify authentication
az account show
```

### 4. Docker Installed (for container-based deployments)

```bash
# Verify Docker
docker --version
```

---

## Deployment Approaches

---

### Option A: Azure Container Apps (Recommended)

**What it is:** Serverless container platform with built-in scaling, traffic splitting, and Dapr integration.

**Best for:** Modern microservices, auto-scaling workloads, cost-effective container hosting.

#### Permissions Required

| Permission/Role | Scope | Purpose |
|-----------------|-------|---------|
| `Contributor` | Resource Group | Create/manage Container Apps, Container Registry |
| `AcrPush` | Container Registry | Push Docker images |
| `AcrPull` | Container Registry | Pull images for deployment |

#### Setup Steps (User Action Required)

**Step 1: Create Resource Group**
```bash
az group create \
  --name scholarly-rg \
  --location australiaeast
```

**Step 2: Create Azure Container Registry (ACR)**
```bash
az acr create \
  --resource-group scholarly-rg \
  --name scholarlyacr \
  --sku Basic \
  --admin-enabled true
```

**Step 3: Create Container Apps Environment**
```bash
az containerapp env create \
  --name scholarly-env \
  --resource-group scholarly-rg \
  --location australiaeast
```

**Step 4: Get ACR Credentials**
```bash
az acr credential show --name scholarlyacr
```

**Step 5: Provide Claude with:**
- Resource Group name: `scholarly-rg`
- ACR name: `scholarlyacr`
- ACR login server: `scholarlyacr.azurecr.io`
- ACR username and password (from Step 4)
- Container Apps environment name: `scholarly-env`

#### What Claude Can Do Once Enabled

1. Build Docker image locally
2. Push image to ACR
3. Create/update Container App with environment variables
4. Configure health checks and scaling rules
5. Set up custom domains and TLS

#### Estimated Monthly Cost

- Container Apps: ~$20-50/month (consumption-based)
- ACR Basic: ~$5/month
- Total: ~$25-55/month (light usage)

---

### Option B: Azure App Service

**What it is:** Fully managed PaaS for web applications with built-in CI/CD, scaling, and SSL.

**Best for:** Traditional web apps, teams familiar with PaaS, quick deployments without Docker expertise.

#### Permissions Required

| Permission/Role | Scope | Purpose |
|-----------------|-------|---------|
| `Contributor` | Resource Group | Create/manage App Service |
| `Website Contributor` | App Service | Deploy and configure |

#### Setup Steps (User Action Required)

**Step 1: Create Resource Group**
```bash
az group create \
  --name scholarly-rg \
  --location australiaeast
```

**Step 2: Create App Service Plan**
```bash
az appservice plan create \
  --name scholarly-plan \
  --resource-group scholarly-rg \
  --sku B1 \
  --is-linux
```

**Step 3: Create Web App (Container)**
```bash
az webapp create \
  --resource-group scholarly-rg \
  --plan scholarly-plan \
  --name scholarly-app \
  --deployment-container-image-name nginx:latest
```

**Step 4: Configure Container Registry (if using ACR)**
```bash
az webapp config container set \
  --name scholarly-app \
  --resource-group scholarly-rg \
  --docker-registry-server-url https://scholarlyacr.azurecr.io \
  --docker-registry-server-user <acr-username> \
  --docker-registry-server-password <acr-password>
```

**Step 5: Provide Claude with:**
- Resource Group name
- App Service name
- ACR credentials (if applicable)

#### What Claude Can Do Once Enabled

1. Build and push Docker image
2. Update App Service container configuration
3. Set environment variables
4. Configure custom domains
5. Set up deployment slots for blue/green deployments

#### Estimated Monthly Cost

- App Service B1: ~$13/month
- App Service P1V2: ~$81/month (production)
- ACR Basic: ~$5/month (if used)

---

### Option C: Azure Kubernetes Service (AKS)

**What it is:** Fully managed Kubernetes cluster for enterprise-grade container orchestration.

**Best for:** Complex microservices, teams with Kubernetes expertise, enterprise requirements.

#### Permissions Required

| Permission/Role | Scope | Purpose |
|-----------------|-------|---------|
| `Contributor` | Resource Group | Create/manage AKS cluster |
| `Azure Kubernetes Service Cluster Admin` | AKS Cluster | Full cluster access |
| `AcrPull` | Container Registry | Pull images to cluster |

#### Setup Steps (User Action Required)

**Step 1: Create Resource Group**
```bash
az group create \
  --name scholarly-rg \
  --location australiaeast
```

**Step 2: Create ACR**
```bash
az acr create \
  --resource-group scholarly-rg \
  --name scholarlyacr \
  --sku Basic
```

**Step 3: Create AKS Cluster**
```bash
az aks create \
  --resource-group scholarly-rg \
  --name scholarly-aks \
  --node-count 2 \
  --node-vm-size Standard_B2s \
  --enable-managed-identity \
  --attach-acr scholarlyacr \
  --generate-ssh-keys
```

**Step 4: Get Cluster Credentials**
```bash
az aks get-credentials \
  --resource-group scholarly-rg \
  --name scholarly-aks
```

**Step 5: Verify kubectl Access**
```bash
kubectl get nodes
```

**Step 6: Provide Claude with:**
- Confirmation that `kubectl` is configured
- ACR name
- Namespace to deploy to (or use `default`)

#### What Claude Can Do Once Enabled

1. Build and push Docker image to ACR
2. Create Kubernetes manifests (Deployment, Service, Ingress)
3. Apply manifests to cluster
4. Set up ConfigMaps and Secrets
5. Configure Horizontal Pod Autoscaler
6. Set up Ingress with TLS

#### Estimated Monthly Cost

- AKS Control Plane: Free
- 2x Standard_B2s nodes: ~$60/month
- ACR Basic: ~$5/month
- Load Balancer: ~$18/month
- Total: ~$83/month minimum

---

### Option D: Azure Container Instances (ACI)

**What it is:** Serverless containers without orchestration. Simple, fast, pay-per-second billing.

**Best for:** Dev/test environments, simple single-container apps, batch jobs.

#### Permissions Required

| Permission/Role | Scope | Purpose |
|-----------------|-------|---------|
| `Contributor` | Resource Group | Create/manage container instances |

#### Setup Steps (User Action Required)

**Step 1: Create Resource Group**
```bash
az group create \
  --name scholarly-rg \
  --location australiaeast
```

**Step 2: Create ACR (optional, can use Docker Hub)**
```bash
az acr create \
  --resource-group scholarly-rg \
  --name scholarlyacr \
  --sku Basic \
  --admin-enabled true
```

**Step 3: Get ACR Credentials**
```bash
az acr credential show --name scholarlyacr
```

**Step 4: Provide Claude with:**
- Resource Group name
- ACR credentials (or Docker Hub credentials)

#### What Claude Can Do Once Enabled

1. Build and push Docker image
2. Create container instance with environment variables
3. Configure resource limits (CPU, memory)
4. Set up health probes
5. Expose public IP or integrate with VNET

#### Estimated Monthly Cost

- 1 vCPU, 1.5 GB RAM running 24/7: ~$35/month
- ACR Basic: ~$5/month (if used)

---

## Authentication Methods

### Method 1: Interactive Login (Simplest)

```bash
az login
```
Opens browser for Microsoft account authentication. Good for development.

### Method 2: Service Principal (CI/CD & Automation)

**Create Service Principal:**
```bash
az ad sp create-for-rbac \
  --name "scholarly-deployer" \
  --role Contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/scholarly-rg \
  --sdk-auth
```

**Output (save securely):**
```json
{
  "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "subscriptionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

**Login with Service Principal:**
```bash
az login --service-principal \
  -u <clientId> \
  -p <clientSecret> \
  --tenant <tenantId>
```

### Method 3: Managed Identity (Azure-hosted workloads)

For deployments from Azure DevOps, GitHub Actions with OIDC, or Azure VMs.

**GitHub Actions Example:**
```yaml
- name: Azure Login
  uses: azure/login@v1
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

---

## Permission Summary Matrix

| Action | Container Apps | App Service | AKS | ACI |
|--------|---------------|-------------|-----|-----|
| Create Resource Group | Contributor | Contributor | Contributor | Contributor |
| Create Registry (ACR) | Contributor | Contributor | Contributor | Contributor |
| Push to ACR | AcrPush | AcrPush | AcrPush | AcrPush |
| Pull from ACR | AcrPull | AcrPull | AcrPull | AcrPull |
| Create/Manage Service | Contributor | Website Contributor | AKS Cluster Admin | Contributor |
| Configure Networking | Network Contributor | - | Network Contributor | Network Contributor |
| Manage DNS | DNS Zone Contributor | - | DNS Zone Contributor | - |

---

## Post-Setup Checklist

After completing the setup for your chosen approach, provide the following:

### Required Information

- [ ] **Subscription ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- [ ] **Resource Group**: `scholarly-rg`
- [ ] **Region**: `australiaeast` (or your choice)
- [ ] **ACR Name**: `scholarlyacr` (if applicable)
- [ ] **ACR Credentials**: username and password

### Environment Variables Needed

Prepare these values for the deployment:

```bash
# Required
DATABASE_URL=postgresql://user:pass@host:5432/scholarly
JWT_SECRET=your-production-secret-min-32-characters

# Optional
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://scholarly.example.com
```

### Verification Commands

Run these to confirm setup is complete:

```bash
# Check Azure CLI authentication
az account show

# Check resource group exists
az group show --name scholarly-rg

# Check ACR exists (if created)
az acr show --name scholarlyacr

# Check Docker can login to ACR
az acr login --name scholarlyacr
```

---

## Quick Start Recommendation

For most use cases, I recommend **Azure Container Apps**:

1. Lowest operational complexity
2. Built-in auto-scaling (scale to zero)
3. Cost-effective for variable workloads
4. Native container support
5. Easy integration with ACR

**Minimum Setup (5 commands):**

```bash
# 1. Login
az login

# 2. Create resource group
az group create --name scholarly-rg --location australiaeast

# 3. Create container registry
az acr create --resource-group scholarly-rg --name scholarlyacr --sku Basic --admin-enabled true

# 4. Create Container Apps environment
az containerapp env create --name scholarly-env --resource-group scholarly-rg --location australiaeast

# 5. Get ACR credentials and share with Claude
az acr credential show --name scholarlyacr
```

Then provide me with the resource names and credentials, and I can handle the rest.
