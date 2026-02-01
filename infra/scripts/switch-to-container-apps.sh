#!/bin/bash
set -euo pipefail

# =============================================================================
# Switch from AKS back to Container Apps
# =============================================================================
# This script migrates traffic back to Container Apps and optionally stops AKS
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

ENVIRONMENT="${ENVIRONMENT:-prod}"
TF_DIR="$INFRA_DIR/terraform/environments/$ENVIRONMENT"
STOP_AKS="${STOP_AKS:-false}"
DELETE_AKS="${DELETE_AKS:-false}"

echo "=========================================="
echo "Switching to Container Apps"
echo "=========================================="
echo "Environment: $ENVIRONMENT"
echo "Stop AKS: $STOP_AKS"
echo "Delete AKS: $DELETE_AKS"
echo "=========================================="

cd "$TF_DIR"

# Get current state
RESOURCE_GROUP=$(terraform output -raw resource_group_name)
CONTAINER_APPS_URL=$(terraform output -raw container_apps_url)
CLUSTER_NAME=$(terraform output -raw aks_cluster_name 2>/dev/null || echo "")

# Step 1: Ensure Container Apps is running
echo "Step 1: Ensuring Container Apps is ready..."
APP_NAME="scholarly-$ENVIRONMENT"

az containerapp update \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --min-replicas 1

# Verify health
echo "Verifying Container Apps health..."
sleep 10
FQDN=$(az containerapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --query "properties.configuration.ingress.fqdn" -o tsv)

if curl -sf "https://${FQDN}/health" > /dev/null; then
  echo "✓ Container Apps health check passed"
else
  echo "✗ Container Apps health check failed - aborting"
  exit 1
fi

# Step 2: Update DNS (manual)
echo ""
echo "MANUAL STEP: Update DNS to point to Container Apps"
echo "Container Apps FQDN: $FQDN"
echo ""
read -p "Press Enter after DNS has been updated and propagated..."

# Step 3: Handle AKS
if [[ "$CLUSTER_NAME" != "" && "$CLUSTER_NAME" != "AKS not deployed" ]]; then
  if [[ "$DELETE_AKS" == "true" ]]; then
    echo "Step 3: Deleting AKS cluster..."

    # Update Terraform to disable AKS
    sed -i.bak 's/deploy_aks = true/deploy_aks = false/' terraform.tfvars

    terraform plan -out=tfplan
    terraform apply tfplan

    echo "✓ AKS cluster deleted"

  elif [[ "$STOP_AKS" == "true" ]]; then
    echo "Step 3: Stopping AKS cluster (preserves config, ~\$5/month)..."
    az aks stop --name "$CLUSTER_NAME" --resource-group "$RESOURCE_GROUP"
    echo "✓ AKS cluster stopped"
    echo ""
    echo "To restart later: az aks start --name $CLUSTER_NAME --resource-group $RESOURCE_GROUP"
  else
    echo "Step 3: AKS cluster left running"
    echo "To stop:   az aks stop --name $CLUSTER_NAME --resource-group $RESOURCE_GROUP"
    echo "To delete: Run this script with DELETE_AKS=true"
  fi
fi

echo "=========================================="
echo "Switch Complete!"
echo "=========================================="
echo "Container Apps URL: $CONTAINER_APPS_URL"
echo "=========================================="
