# Scholarly Infrastructure Documentation

Enterprise-grade Azure infrastructure for the Scholarly learning platform.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Network Architecture](#network-architecture)
- [Security Controls](#security-controls)
- [Resource Inventory](#resource-inventory)
- [Deployment Guide](#deployment-guide)
- [Secret Management](#secret-management)
- [Monitoring & Alerts](#monitoring--alerts)
- [Incident Response](#incident-response)
- [Cost Optimization](#cost-optimization)

---

## Architecture Overview

```
                                    ┌─────────────────────────────────────────────────────────────────┐
                                    │                        INTERNET                                  │
                                    └─────────────────────────────────────────────────────────────────┘
                                                              │
                                                              ▼
                            ┌─────────────────────────────────────────────────────────────────────────┐
                            │                     AZURE FRONT DOOR (Premium)                           │
                            │  ┌───────────────┐  ┌───────────────┐  ┌───────────────────────────┐    │
                            │  │  WAF Policy   │  │ Bot Manager   │  │   Global Load Balancing   │    │
                            │  │  OWASP 3.2    │  │   Rule Set    │  │   + SSL Termination       │    │
                            │  └───────────────┘  └───────────────┘  └───────────────────────────┘    │
                            │  ┌───────────────┐  ┌───────────────┐  ┌───────────────────────────┐    │
                            │  │ Rate Limiting │  │ Geo-Filtering │  │   Caching + Compression   │    │
                            │  │ 1000 req/min  │  │   AU/NZ Only  │  │   Static Assets           │    │
                            │  └───────────────┘  └───────────────┘  └───────────────────────────┘    │
                            └─────────────────────────────────────────────────────────────────────────┘
                                                              │
                                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    VIRTUAL NETWORK (10.0.0.0/16)                                              │
│                                    DDoS Protection Standard Enabled                                          │
│                                                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              CONTAINER APPS SUBNET (10.0.0.0/21)                                      │   │
│  │                              NSG: Allow Front Door, Deny Direct Access                                │   │
│  │                                                                                                       │   │
│  │   ┌───────────────────────────────────────────────────────────────────────────────────────────────┐  │   │
│  │   │                         CONTAINER APPS ENVIRONMENT                                              │  │   │
│  │   │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │  │   │
│  │   │   │ Scholarly App   │  │ Scholarly App   │  │ Scholarly App   │  │   System-Assigned      │  │  │   │
│  │   │   │ Replica 1       │  │ Replica 2       │  │ Replica N       │  │   Managed Identity     │  │  │   │
│  │   │   │ (API + Web)     │  │ (API + Web)     │  │ (Auto-scaled)   │  │                        │  │  │   │
│  │   │   └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │  │   │
│  │   └───────────────────────────────────────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                    │                                                         │
│                                                    ▼                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              POSTGRESQL SUBNET (10.0.16.0/24)                                         │   │
│  │                              NSG: Allow Container Apps Only, Deny All Outbound                        │   │
│  │   ┌───────────────────────────────────────────────────────────────────────────────────────────────┐  │   │
│  │   │                 AZURE DATABASE FOR POSTGRESQL (Flexible Server)                                 │  │   │
│  │   │   • GP_Standard_D2s_v3 (2 vCores)           • Zone-Redundant HA                                │  │   │
│  │   │   • 64 GB Storage                            • 35-day Backup Retention                          │  │   │
│  │   │   • Geo-Redundant Backup                     • Private Endpoint Only                            │  │   │
│  │   └───────────────────────────────────────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              PRIVATE ENDPOINTS SUBNET (10.0.17.0/24)                                  │   │
│  │   ┌─────────────────────────┐                        ┌─────────────────────────┐                     │   │
│  │   │  Key Vault Private EP   │                        │  PostgreSQL Private EP  │                     │   │
│  │   │  privatelink.vaultcore  │                        │  privatelink.postgres   │                     │   │
│  │   └─────────────────────────┘                        └─────────────────────────┘                     │   │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                    │
                                                    ▼
                            ┌─────────────────────────────────────────────────────────────────────────┐
                            │                         AZURE KEY VAULT                                   │
                            │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
                            │   │  database-url   │  │   jwt-secret    │  │  anthropic-api-key     │  │
                            │   │  (auto-gen)     │  │   (auto-gen)    │  │  (manual)              │  │
                            │   └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │
                            │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
                            │   │  openai-api-key │  │ stripe-secret   │  │  sendgrid-api-key      │  │
                            │   │  (manual)       │  │ (manual)        │  │  (manual)              │  │
                            │   └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │
                            └─────────────────────────────────────────────────────────────────────────┘
                                                    │
                                                    ▼
                            ┌─────────────────────────────────────────────────────────────────────────┐
                            │                    EXTERNAL SERVICES                                     │
                            │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
                            │   │    Anthropic    │  │     Stripe      │  │      SendGrid          │  │
                            │   │    Claude AI    │  │   Payments      │  │      Email             │  │
                            │   └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │
                            │   ┌─────────────────┐                                                    │
                            │   │     OpenAI      │                                                    │
                            │   │   (Fallback)    │                                                    │
                            │   └─────────────────┘                                                    │
                            └─────────────────────────────────────────────────────────────────────────┘
```

---

## Network Architecture

### Subnet Configuration

| Subnet | CIDR | Purpose | Service Endpoints |
|--------|------|---------|-------------------|
| Container Apps | 10.0.0.0/21 | Application hosting | KeyVault, Storage, SQL |
| PostgreSQL | 10.0.16.0/24 | Database server | Storage |
| Private Endpoints | 10.0.17.0/24 | Private service access | None |
| AKS (Optional) | 10.0.32.0/20 | Kubernetes cluster | KeyVault, Storage, SQL, ACR |

### NSG Rules Summary

#### Container Apps Subnet

| Direction | Priority | Name | Source | Destination | Port | Action |
|-----------|----------|------|--------|-------------|------|--------|
| Inbound | 100 | AllowFrontDoor | AzureFrontDoor.Backend | * | 80,443 | Allow |
| Inbound | 110 | AllowAzureLB | AzureLoadBalancer | * | * | Allow |
| Inbound | 120 | AllowVNet | VirtualNetwork | VirtualNetwork | * | Allow |
| Inbound | 4096 | DenyAllInbound | * | * | * | Deny |
| Outbound | 100 | AllowPostgreSQL | * | 10.0.16.0/24 | 5432 | Allow |
| Outbound | 110 | AllowKeyVault | * | AzureKeyVault | 443 | Allow |
| Outbound | 200 | AllowHTTPS | * | Internet | 443 | Allow |

#### PostgreSQL Subnet

| Direction | Priority | Name | Source | Destination | Port | Action |
|-----------|----------|------|--------|-------------|------|--------|
| Inbound | 100 | AllowContainerApps | 10.0.0.0/21 | * | 5432 | Allow |
| Inbound | 4096 | DenyAllInbound | * | * | * | Deny |
| Outbound | 100 | AllowStorage | * | Storage | 443 | Allow |
| Outbound | 4096 | DenyAllOutbound | * | * | * | Deny |

---

## Security Controls

### Security Controls Matrix

| Control | Implementation | Status |
|---------|----------------|--------|
| WAF | Azure Front Door Premium + OWASP 3.2 | ✅ Enabled |
| DDoS | Azure DDoS Protection Standard | ✅ Enabled |
| Network Segmentation | NSGs + VNet Integration | ✅ Enabled |
| Encryption at Rest | Azure Managed Keys | ✅ Enabled |
| Encryption in Transit | TLS 1.2+ enforced | ✅ Enabled |
| Secret Management | Azure Key Vault | ✅ Enabled |
| Identity | Managed Identity | ✅ Enabled |
| Logging | Log Analytics (90 days) | ✅ Enabled |
| Geo-Restriction | AU/NZ only | ✅ Enabled |
| Rate Limiting | 1000 req/min per IP | ✅ Enabled |
| Bot Protection | Microsoft Bot Manager | ✅ Enabled |

### WAF Rules

1. **OWASP 3.2 Core Rule Set** - Full protection against OWASP Top 10
2. **Bot Manager Rule Set** - Blocks malicious bots
3. **Custom Rate Limiting** - 1000 requests/minute per IP
4. **SQL Injection Blocking** - Custom patterns + OWASP rules
5. **XSS Pattern Blocking** - Custom patterns + OWASP rules
6. **Bad User Agent Blocking** - Blocks common attack tools

---

## Resource Inventory

### Production Environment

| Resource | Name | SKU/Size | Monthly Cost (est.) |
|----------|------|----------|---------------------|
| Resource Group | scholarly-prod-rg | N/A | $0 |
| Virtual Network | scholarly-prod-vnet | N/A | $0 |
| Log Analytics | scholarly-prod-logs | PerGB2018 | ~$50 |
| Front Door | scholarly-prod-fd | Premium_AzureFrontDoor | ~$330 |
| WAF Policy | scholarly-prod-fd-waf | Premium | Included |
| DDoS Protection | scholarly-prod-ddos | Standard | ~$2,944 |
| Key Vault | scholarlyprodkv | Standard | ~$5 |
| PostgreSQL | scholarly-prod-db | GP_Standard_D2s_v3 | ~$125 |
| Container Registry | scholarlyprodacr | Standard | ~$20 |
| Container Apps | scholarly-prod | 1 vCPU, 2Gi (1-5 replicas) | ~$50-250 |

**Total Estimated Monthly Cost: ~$3,500-$3,700**

> Note: DDoS Protection Standard is the largest cost component. For cost-sensitive deployments, this can be disabled.

---

## Deployment Guide

### Prerequisites

1. Azure CLI installed and authenticated
2. Terraform >= 1.5.0
3. Azure subscription with Owner/Contributor access
4. Service Principal (optional, for CI/CD)

### Initial Deployment

```bash
# 1. Navigate to environment directory
cd infra/terraform/environments/prod

# 2. Initialize Terraform
terraform init

# 3. Review the plan
terraform plan -out=tfplan

# 4. Apply the configuration
terraform apply tfplan

# 5. Note the outputs for next steps
terraform output
```

### Configure Secrets in Key Vault

After deployment, add the following secrets via Azure Portal or CLI:

```bash
# Get Key Vault name from outputs
KV_NAME=$(terraform output -raw key_vault_name)

# Add third-party API keys
az keyvault secret set --vault-name $KV_NAME --name "anthropic-api-key" --value "sk-ant-..."
az keyvault secret set --vault-name $KV_NAME --name "openai-api-key" --value "sk-..."
az keyvault secret set --vault-name $KV_NAME --name "stripe-secret-key" --value "sk_live_..."
az keyvault secret set --vault-name $KV_NAME --name "stripe-webhook-secret" --value "whsec_..."
az keyvault secret set --vault-name $KV_NAME --name "sendgrid-api-key" --value "SG...."
```

### Deploy Application

```bash
# 1. Login to ACR
ACR_NAME=$(terraform output -raw acr_login_server)
az acr login --name ${ACR_NAME%%.*}

# 2. Build and push image
docker build -t $ACR_NAME/scholarly:latest .
docker push $ACR_NAME/scholarly:latest

# 3. Restart Container App to pull new image
az containerapp revision restart \
  --name scholarly-prod \
  --resource-group scholarly-prod-rg
```

### Custom Domain Setup

```bash
# 1. Get Front Door hostname
FD_HOST=$(terraform output -raw front_door_host)

# 2. Add CNAME record in your DNS provider
# app.scholarly.edu.au -> $FD_HOST

# 3. Wait for SSL certificate provisioning (~10 minutes)

# 4. Verify
curl https://app.scholarly.edu.au/health
```

---

## Secret Management

### Secret Rotation Procedures

#### JWT Secret Rotation

```bash
# 1. Generate new secret
NEW_SECRET=$(openssl rand -base64 48)

# 2. Update Key Vault (creates new version)
az keyvault secret set \
  --vault-name $KV_NAME \
  --name "jwt-secret" \
  --value "$NEW_SECRET"

# 3. Restart Container App to pick up new secret
az containerapp revision restart \
  --name scholarly-prod \
  --resource-group scholarly-prod-rg

# Note: Existing sessions will be invalidated
```

#### Database Password Rotation

```bash
# 1. Generate new password
NEW_PASSWORD=$(openssl rand -base64 32)

# 2. Update PostgreSQL password
az postgres flexible-server update \
  --resource-group scholarly-prod-rg \
  --name scholarly-prod-db \
  --admin-password "$NEW_PASSWORD"

# 3. Update connection string in Key Vault
# (Build new connection string with new password)
az keyvault secret set \
  --vault-name $KV_NAME \
  --name "database-url" \
  --value "postgresql://..."

# 4. Restart Container App
az containerapp revision restart \
  --name scholarly-prod \
  --resource-group scholarly-prod-rg
```

#### API Key Rotation (Stripe, SendGrid, etc.)

```bash
# 1. Generate new key in provider's dashboard
# 2. Update Key Vault
az keyvault secret set \
  --vault-name $KV_NAME \
  --name "stripe-secret-key" \
  --value "sk_live_NEW_KEY"

# 3. Restart Container App
az containerapp revision restart \
  --name scholarly-prod \
  --resource-group scholarly-prod-rg

# 4. Revoke old key in provider's dashboard
```

---

## Monitoring & Alerts

### Log Analytics Queries

#### Application Errors (Last 24h)

```kusto
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(24h)
| where Log_s contains "error" or Log_s contains "Error"
| project TimeGenerated, ContainerAppName_s, Log_s
| order by TimeGenerated desc
```

#### Request Latency Percentiles

```kusto
ContainerAppSystemLogs_CL
| where TimeGenerated > ago(1h)
| summarize
    p50 = percentile(DurationMs, 50),
    p95 = percentile(DurationMs, 95),
    p99 = percentile(DurationMs, 99)
    by bin(TimeGenerated, 5m)
| render timechart
```

#### WAF Blocked Requests

```kusto
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.CDN"
| where Category == "FrontDoorWebApplicationFirewallLog"
| where action_s == "Block"
| project TimeGenerated, clientIP_s, requestUri_s, ruleName_s
| order by TimeGenerated desc
```

### Alert Configuration

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| DDoS Attack | IfUnderDDoSAttack > 0 | Critical (0) | Email + PagerDuty |
| High Error Rate | Error count > 100/5min | Error (1) | Email |
| Container Restart | Restart count > 3/5min | Warning (2) | Email |
| Database CPU | CPU > 80% for 10min | Warning (2) | Email |
| Key Vault Errors | Failures > 5/5min | Error (1) | Email |

---

## Incident Response

### Playbook: DDoS Attack

1. **Detection**: Alert triggered from DDoS Protection
2. **Assessment**: Check Azure Portal > DDoS Protection > Attack Analytics
3. **Immediate Actions**:
   - Verify Front Door is absorbing traffic
   - Check application health endpoints
   - Review NSG logs for unusual patterns
4. **Communication**: Notify stakeholders of potential service degradation
5. **Post-Incident**: Review attack patterns, adjust WAF rules if needed

### Playbook: Security Breach

1. **Containment**:
   ```bash
   # Disable public access immediately
   az containerapp ingress update \
     --name scholarly-prod \
     --resource-group scholarly-prod-rg \
     --type internal
   ```

2. **Investigation**:
   - Review Key Vault audit logs
   - Check Container App console logs
   - Analyze WAF logs for attack vectors

3. **Remediation**:
   - Rotate all secrets
   - Deploy patched application
   - Re-enable public access

4. **Recovery**:
   - Monitor for recurring attacks
   - Update WAF rules
   - Document lessons learned

### Playbook: Database Failure

1. **Detection**: Health check failures or connection errors
2. **Immediate Actions**:
   ```bash
   # Check server status
   az postgres flexible-server show \
     --resource-group scholarly-prod-rg \
     --name scholarly-prod-db

   # Check for HA failover
   az postgres flexible-server show \
     --resource-group scholarly-prod-rg \
     --name scholarly-prod-db \
     --query "highAvailability"
   ```

3. **If Primary Down**: HA will auto-failover to standby
4. **If Both Down**: Restore from backup
   ```bash
   az postgres flexible-server restore \
     --resource-group scholarly-prod-rg \
     --name scholarly-prod-db-restored \
     --source-server scholarly-prod-db \
     --restore-time "2024-01-15T10:00:00Z"
   ```

---

## Cost Optimization

### Production Cost Breakdown

| Component | Current | Optimized | Savings |
|-----------|---------|-----------|---------|
| DDoS Protection | $2,944/mo | Disable* | $2,944 |
| Front Door | $330/mo | Keep | $0 |
| PostgreSQL | $125/mo | Keep | $0 |
| Container Apps | ~$150/mo | Keep | $0 |
| Total | ~$3,550/mo | ~$600/mo | ~83% |

*Disabling DDoS Protection reduces protection but significantly cuts costs

### Cost Optimization Options

1. **Disable DDoS Protection** (if acceptable risk):
   ```hcl
   # In prod/main.tf
   enable_ddos_protection = false
   ```

2. **Reduce Container App resources** (for lower traffic):
   ```hcl
   cpu    = 0.5
   memory = "1Gi"
   ```

3. **Use Reserved Capacity** for PostgreSQL (1-3 year commitment)

4. **Enable Scale to Zero** for development environments

---

## Troubleshooting

### Common Issues

#### Container App Not Starting

```bash
# Check logs
az containerapp logs show \
  --name scholarly-prod \
  --resource-group scholarly-prod-rg \
  --follow

# Check secrets are accessible
az containerapp show \
  --name scholarly-prod \
  --resource-group scholarly-prod-rg \
  --query "properties.template.containers[0].env"
```

#### Key Vault Access Denied

```bash
# Verify managed identity
az containerapp identity show \
  --name scholarly-prod \
  --resource-group scholarly-prod-rg

# Check Key Vault access policies
az keyvault show \
  --name $KV_NAME \
  --query "properties.accessPolicies"
```

#### Database Connection Failures

```bash
# Test connectivity from within VNet
az postgres flexible-server show-connection-string \
  --server-name scholarly-prod-db

# Check private endpoint
az network private-endpoint show \
  --name scholarly-prod-db-pe \
  --resource-group scholarly-prod-rg
```

---

## Support Contacts

| Role | Contact | Escalation |
|------|---------|------------|
| Infrastructure | ops@scholarly.edu.au | PagerDuty |
| Security | security@scholarly.edu.au | Immediate |
| Azure Support | Azure Portal | Premier Support |

---

*Last Updated: February 2026*
*Version: 1.0.0*
