#!/bin/bash
set -euo pipefail

# =============================================================================
# Switch from Container Apps to AKS
# =============================================================================
# This script enables AKS deployment and migrates traffic from Container Apps
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

ENVIRONMENT="${ENVIRONMENT:-prod}"
TF_DIR="$INFRA_DIR/terraform/environments/$ENVIRONMENT"

echo "=========================================="
echo "Switching to AKS"
echo "=========================================="
echo "Environment: $ENVIRONMENT"
echo "=========================================="

# Step 1: Enable AKS in Terraform
echo "Step 1: Enabling AKS deployment..."
cd "$TF_DIR"

# Update terraform.tfvars to enable AKS
if grep -q "deploy_aks" terraform.tfvars 2>/dev/null; then
  sed -i.bak 's/deploy_aks = false/deploy_aks = true/' terraform.tfvars
else
  echo "deploy_aks = true" >> terraform.tfvars
fi

# Step 2: Apply Terraform
echo "Step 2: Applying Terraform (this will create AKS cluster)..."
terraform init
terraform plan -out=tfplan
terraform apply tfplan

# Step 3: Get outputs
RESOURCE_GROUP=$(terraform output -raw resource_group_name)
ACR_NAME=$(terraform output -raw acr_login_server | sed 's/.azurecr.io//')
CLUSTER_NAME=$(terraform output -raw aks_cluster_name)

# Step 4: Deploy to AKS
echo "Step 3: Deploying application to AKS..."
export RESOURCE_GROUP
export ACR_NAME
export CLUSTER_NAME
"$SCRIPT_DIR/deploy-aks.sh"

# Step 5: Update DNS (manual step)
AKS_IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")

echo "=========================================="
echo "AKS Deployment Complete!"
echo "=========================================="
echo ""
echo "MANUAL STEPS REQUIRED:"
echo ""
echo "1. Update DNS to point to AKS Ingress IP: $AKS_IP"
echo "   (If 'pending', wait for load balancer to provision)"
echo ""
echo "2. Verify traffic is flowing to AKS"
echo ""
echo "3. Scale down Container Apps (optional):"
echo "   az containerapp update --name scholarly-$ENVIRONMENT --resource-group $RESOURCE_GROUP --min-replicas 0"
echo ""
echo "=========================================="
