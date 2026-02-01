# Scholarly Infrastructure Runbook

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Quick Start](#quick-start)
3. [Initial Deployment](#initial-deployment)
4. [Day-to-Day Operations](#day-to-day-operations)
5. [Switching Between Container Apps and AKS](#switching-between-container-apps-and-aks)
6. [Scaling Operations](#scaling-operations)
7. [Disaster Recovery](#disaster-recovery)
8. [Troubleshooting](#troubleshooting)
9. [Cost Management](#cost-management)
10. [ArgoCD (GitOps)](#argocd-gitops)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Azure Infrastructure                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────────────────────────────────────┐ │
│  │                 │    │              Compute Layer                       │ │
│  │  Azure          │    │  ┌─────────────────┐  ┌─────────────────────┐   │ │
│  │  Container      │◄───┤  │ Container Apps  │  │  AKS (Optional)     │   │ │
│  │  Registry       │    │  │ (Primary)       │  │  (High Traffic)     │   │ │
│  │                 │    │  │                 │  │                     │   │ │
│  │  scholarly:tag  │    │  │ • Auto-scaling  │  │ • 3-zone HA         │   │ │
│  │                 │    │  │ • Scale to zero │  │ • HPA               │   │ │
│  └─────────────────┘    │  │ • ~$25-50/mo    │  │ • ~$200+/mo         │   │ │
│                         │  └────────┬────────┘  └──────────┬──────────┘   │ │
│                         │           │                      │              │ │
│                         └───────────┼──────────────────────┼──────────────┘ │
│                                     │                      │                │
│                                     ▼                      ▼                │
│                         ┌───────────────────────────────────────────────┐   │
│                         │           PostgreSQL Flexible Server          │   │
│                         │           (Zone-redundant HA in Prod)         │   │
│                         └───────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Deployment Strategy

| Phase | Compute | Monthly Cost | Use Case |
|-------|---------|--------------|----------|
| Development | Container Apps | ~$25-55 | Dev, testing, early users |
| Growth | Container Apps | ~$50-150 | Scaling traffic |
| Enterprise | AKS | ~$200+ | High traffic, compliance |

---

## Quick Start

### Prerequisites

```bash
# Install Azure CLI
brew install azure-cli

# Install Terraform
brew install terraform

# Install kubectl (for AKS)
brew install kubectl

# Login to Azure
az login
```

### Deploy Development Environment

```bash
cd infra/terraform/environments/dev

# Copy and configure variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your JWT_SECRET

# Initialize and deploy
terraform init
terraform plan
terraform apply
```

---

## Initial Deployment

### Step 1: Azure Setup

```bash
# Verify Azure subscription
az account show

# Set subscription (if multiple)
az account set --subscription "Your Subscription Name"
```

### Step 2: Deploy Infrastructure

```bash
# Development environment
cd infra/terraform/environments/dev
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars
vim terraform.tfvars

# Deploy
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

### Step 3: Build and Push Docker Image

```bash
# Get ACR name from Terraform output
ACR_NAME=$(terraform output -raw acr_login_server | sed 's/.azurecr.io//')

# Login to ACR
az acr login --name $ACR_NAME

# Build and push (from project root)
cd ../../../..
docker build -t ${ACR_NAME}.azurecr.io/scholarly:latest .
docker push ${ACR_NAME}.azurecr.io/scholarly:latest
```

### Step 4: Trigger Container App Update

```bash
# Get resource details
RESOURCE_GROUP=$(cd infra/terraform/environments/dev && terraform output -raw resource_group_name)
APP_NAME="scholarly-dev"

# Update the container
az containerapp update \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --image ${ACR_NAME}.azurecr.io/scholarly:latest
```

### Step 5: Verify Deployment

```bash
# Get app URL
APP_URL=$(az containerapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv)

# Test health endpoint
curl https://$APP_URL/health
```

---

## Day-to-Day Operations

### Deploy New Version

```bash
# Using the deployment script
./infra/scripts/deploy-container-apps.sh

# Or manually
IMAGE_TAG="v1.2.3"
docker build -t ${ACR_NAME}.azurecr.io/scholarly:${IMAGE_TAG} .
docker push ${ACR_NAME}.azurecr.io/scholarly:${IMAGE_TAG}

az containerapp update \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --image ${ACR_NAME}.azurecr.io/scholarly:${IMAGE_TAG}
```

### View Logs

```bash
# Container Apps logs
az containerapp logs show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --follow

# AKS logs (if deployed)
kubectl logs -f -l app.kubernetes.io/name=scholarly -n scholarly
```

### Check Application Status

```bash
# Container Apps
az containerapp show --name $APP_NAME --resource-group $RESOURCE_GROUP

# View revisions
az containerapp revision list --name $APP_NAME --resource-group $RESOURCE_GROUP -o table
```

### Restart Application

```bash
# Container Apps - create new revision
az containerapp update --name $APP_NAME --resource-group $RESOURCE_GROUP --revision-suffix "restart-$(date +%s)"

# AKS
kubectl rollout restart deployment/scholarly -n scholarly
```

---

## Switching Between Container Apps and AKS

### When to Switch to AKS

Consider switching when:
- Container Apps costs exceed ~$150/month consistently
- You need advanced networking (service mesh, network policies)
- You need multi-region deployment
- Compliance requires more infrastructure control

### Switch to AKS

```bash
# Automated switch
ENVIRONMENT=prod ./infra/scripts/switch-to-aks.sh

# Manual steps after script completes:
# 1. Update DNS to AKS ingress IP
# 2. Verify traffic flows to AKS
# 3. Optionally scale down Container Apps
```

### Switch Back to Container Apps

```bash
# Keep AKS running (for quick failback)
ENVIRONMENT=prod ./infra/scripts/switch-to-container-apps.sh

# Stop AKS to save costs (~$5/month for disks)
STOP_AKS=true ENVIRONMENT=prod ./infra/scripts/switch-to-container-apps.sh

# Delete AKS completely ($0/month)
DELETE_AKS=true ENVIRONMENT=prod ./infra/scripts/switch-to-container-apps.sh
```

### AKS Stop/Start Commands

```bash
# Stop AKS (preserves configuration)
az aks stop --name scholarly-prod-aks --resource-group scholarly-prod-rg

# Start AKS
az aks start --name scholarly-prod-aks --resource-group scholarly-prod-rg

# Check status
az aks show --name scholarly-prod-aks --resource-group scholarly-prod-rg --query "powerState"
```

---

## Scaling Operations

### Container Apps Scaling

```bash
# Manual scale
az containerapp update \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --min-replicas 2 \
  --max-replicas 10

# Scale to zero (cost savings, cold start delay)
az containerapp update \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --min-replicas 0
```

### AKS Scaling

```bash
# Scale deployment
kubectl scale deployment/scholarly --replicas=5 -n scholarly

# Update HPA
kubectl patch hpa scholarly -n scholarly -p '{"spec":{"minReplicas":3,"maxReplicas":15}}'

# Scale node pool
az aks nodepool scale \
  --cluster-name scholarly-prod-aks \
  --name system \
  --resource-group scholarly-prod-rg \
  --node-count 3
```

### Database Scaling

```bash
# Scale PostgreSQL
az postgres flexible-server update \
  --name scholarly-prod-db \
  --resource-group scholarly-prod-rg \
  --sku-name GP_Standard_D4s_v3  # Upgrade to 4 vCores
```

---

## Disaster Recovery

### Backup Procedures

```bash
# PostgreSQL backups are automatic (7-35 days retention)
# Check backup status
az postgres flexible-server backup list \
  --server-name scholarly-prod-db \
  --resource-group scholarly-prod-rg

# Manual backup (export)
pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d).sql
```

### Restore from Backup

```bash
# Point-in-time restore
az postgres flexible-server restore \
  --name scholarly-prod-db-restored \
  --resource-group scholarly-prod-rg \
  --source-server scholarly-prod-db \
  --restore-time "2024-01-15T10:00:00Z"
```

### Failover Procedures

#### Container Apps Failure

1. Check Container Apps status:
   ```bash
   az containerapp show --name $APP_NAME --resource-group $RESOURCE_GROUP
   ```

2. Force new revision:
   ```bash
   az containerapp update --name $APP_NAME --resource-group $RESOURCE_GROUP --image ${ACR_NAME}.azurecr.io/scholarly:latest
   ```

3. If persistent issues, switch to AKS:
   ```bash
   ./infra/scripts/switch-to-aks.sh
   ```

#### AKS Failure

1. Check cluster status:
   ```bash
   az aks show --name scholarly-prod-aks --resource-group scholarly-prod-rg
   kubectl get nodes
   kubectl get pods -n scholarly
   ```

2. Restart problematic pods:
   ```bash
   kubectl delete pod -l app.kubernetes.io/name=scholarly -n scholarly
   ```

3. If cluster-wide issues, switch to Container Apps:
   ```bash
   ./infra/scripts/switch-to-container-apps.sh
   ```

---

## Troubleshooting

### Container Apps Issues

| Issue | Command | Solution |
|-------|---------|----------|
| App not starting | `az containerapp logs show` | Check startup logs for errors |
| Health check failing | `curl https://$FQDN/health` | Verify `/health` endpoint |
| Out of memory | Check metrics in Azure Portal | Increase memory in Terraform |
| Cold start slow | Set `min_replicas = 1` | Keeps at least one instance warm |

### AKS Issues

| Issue | Command | Solution |
|-------|---------|----------|
| Pods pending | `kubectl describe pod` | Check resource requests, node capacity |
| ImagePullBackOff | `kubectl describe pod` | Verify ACR credentials, image exists |
| CrashLoopBackOff | `kubectl logs <pod>` | Check application logs |
| Node not ready | `kubectl describe node` | Check node health, restart if needed |

### Database Issues

```bash
# Check connection
psql "$DATABASE_URL" -c "SELECT 1"

# Check active connections
psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity"

# Check database size
psql "$DATABASE_URL" -c "SELECT pg_size_pretty(pg_database_size('scholarly'))"
```

### Common Error Codes

| Error | Cause | Fix |
|-------|-------|-----|
| 401 Unauthorized | Missing/invalid JWT | Check `JWT_SECRET` env var |
| 500 Internal Error | Application error | Check logs |
| 502 Bad Gateway | App not responding | Restart app, check health |
| 503 Service Unavailable | No healthy instances | Scale up, check health probes |

---

## Cost Management

### Current Cost Breakdown

| Resource | Dev (~$/mo) | Prod (~$/mo) |
|----------|-------------|--------------|
| Container Apps | $20-40 | $50-150 |
| PostgreSQL | $12 | $125+ |
| ACR | $5 | $10 |
| AKS (if enabled) | N/A | $200+ |
| **Total** | **~$37-57** | **~$185-485** |

### Cost Optimization Tips

1. **Scale to zero in dev:**
   ```bash
   az containerapp update --name scholarly-dev --min-replicas 0
   ```

2. **Use spot instances for AKS (non-prod):**
   Add to AKS node pool configuration

3. **Right-size PostgreSQL:**
   Start with B_Standard_B1ms, upgrade as needed

4. **Stop AKS when not using:**
   ```bash
   az aks stop --name scholarly-prod-aks --resource-group scholarly-prod-rg
   ```

5. **Review and delete unused resources:**
   ```bash
   az resource list --resource-group scholarly-dev-rg -o table
   ```

### Cost Alerts

Set up in Azure Portal:
1. Go to Cost Management + Billing
2. Create budget alert at 80% of expected spend
3. Configure email notifications

---

## Appendix: Command Reference

### Terraform Commands

```bash
terraform init          # Initialize providers
terraform plan          # Preview changes
terraform apply         # Apply changes
terraform destroy       # Destroy all resources
terraform output        # Show outputs
terraform state list    # List managed resources
```

### Azure CLI Commands

```bash
az login                                    # Login
az account list                             # List subscriptions
az group list -o table                      # List resource groups
az containerapp list -o table               # List Container Apps
az aks list -o table                        # List AKS clusters
az acr list -o table                        # List registries
az postgres flexible-server list -o table   # List databases
```

### Kubectl Commands

```bash
kubectl get all -n scholarly               # List all resources
kubectl logs -f deployment/scholarly       # Stream logs
kubectl exec -it <pod> -- /bin/sh          # Shell into pod
kubectl port-forward svc/scholarly 8080:80 # Port forward
kubectl rollout history deployment/scholarly # Deployment history
kubectl rollout undo deployment/scholarly  # Rollback
```

---

## ArgoCD (GitOps)

ArgoCD provides GitOps-based continuous delivery for AKS deployments.

### Why ArgoCD?

| Feature | Benefit |
|---------|---------|
| **GitOps** | Git is the single source of truth |
| **Auto-sync** | Detects changes and deploys automatically |
| **Rollback** | One-click rollback to any previous version |
| **Drift detection** | Alerts if cluster state differs from Git |
| **Audit trail** | Full history of all deployments |
| **Multi-cluster** | Manage multiple clusters from one place |

### Installation

```bash
# Install ArgoCD on AKS
./infra/scripts/install-argocd.sh

# Configure repository access
GITHUB_USERNAME=your-user GITHUB_TOKEN=your-token ./infra/scripts/setup-argocd-repo.sh
```

### Access ArgoCD UI

```bash
# Port forward to access UI
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Get initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Open browser
open https://localhost:8080
# Username: admin
```

### Deploy Applications

```bash
# Deploy project (access control)
kubectl apply -f infra/argocd/projects/scholarly-project.yaml

# Deploy dev application (auto-sync enabled)
kubectl apply -f infra/argocd/applications/scholarly-dev.yaml

# Deploy prod application (manual sync required)
kubectl apply -f infra/argocd/applications/scholarly-prod.yaml

# Or deploy all with app-of-apps pattern
kubectl apply -f infra/argocd/applications/app-of-apps.yaml
```

### ArgoCD Workflow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Git Push    │────▶│ ArgoCD      │────▶│ Sync to     │────▶│ App Running │
│ (manifests) │     │ Detects     │     │ Cluster     │     │ in AKS      │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Image       │ (Optional: auto-update
                    │ Updater     │  when new image pushed)
                    └─────────────┘
```

### Sync Policies

| Environment | Auto-Sync | Self-Heal | Prune |
|-------------|-----------|-----------|-------|
| Dev | ✅ Yes | ✅ Yes | ✅ Yes |
| Prod | ❌ No (manual) | ❌ No | ✅ Yes |

### Rollback Operations

```bash
# View deployment history
./infra/scripts/argocd-rollback.sh scholarly-prod

# Rollback to previous version
./infra/scripts/argocd-rollback.sh scholarly-prod -1

# Rollback to specific revision
./infra/scripts/argocd-rollback.sh scholarly-prod 5

# Via ArgoCD CLI
argocd app rollback scholarly-prod 5

# Via UI
# 1. Open ArgoCD UI
# 2. Click on application
# 3. Click "History and Rollback"
# 4. Select revision and click "Rollback"
```

### Sync Operations

```bash
# Manual sync (for prod)
argocd app sync scholarly-prod

# Sync with prune (delete removed resources)
argocd app sync scholarly-prod --prune

# Hard refresh (clear cache and sync)
argocd app get scholarly-prod --hard-refresh
argocd app sync scholarly-prod

# Via kubectl
kubectl patch application scholarly-prod -n argocd --type=merge -p '{"operation":{"sync":{}}}'
```

### Image Updater (Automatic Image Updates)

The ArgoCD Image Updater automatically updates applications when new images are pushed to ACR.

```bash
# Install Image Updater
kubectl apply -k infra/argocd/image-updater/

# Check logs
kubectl logs -f deployment/argocd-image-updater -n argocd
```

**Configuration in Application:**
```yaml
metadata:
  annotations:
    argocd-image-updater.argoproj.io/image-list: scholarly=scholarlyacr.azurecr.io/scholarly
    argocd-image-updater.argoproj.io/scholarly.update-strategy: latest
```

### Troubleshooting ArgoCD

| Issue | Command | Solution |
|-------|---------|----------|
| App stuck syncing | `argocd app get <app>` | Check sync status, force refresh |
| Sync failed | `argocd app sync <app> --retry-limit 0` | Retry sync |
| Image not updating | `kubectl logs -f deploy/argocd-image-updater -n argocd` | Check updater logs |
| Permission denied | Check AppProject | Verify source repos and destinations |
| Drift detected | `argocd app diff <app>` | Review differences |

### ArgoCD CLI Commands

```bash
# Login
argocd login localhost:8080 --insecure

# List applications
argocd app list

# Get application details
argocd app get scholarly-prod

# View diff between Git and cluster
argocd app diff scholarly-prod

# Sync application
argocd app sync scholarly-prod

# Rollback
argocd app rollback scholarly-prod

# Delete application (keeps resources)
argocd app delete scholarly-prod --cascade=false

# Delete application (deletes resources)
argocd app delete scholarly-prod
```

### Notifications (Optional)

Configure Slack notifications for deployment events:

```bash
# Install argocd-notifications
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj-labs/argocd-notifications/stable/manifests/install.yaml

# Configure Slack webhook (create secret)
kubectl create secret generic argocd-notifications-secret \
  -n argocd \
  --from-literal=slack-token=xoxb-your-slack-token
```
