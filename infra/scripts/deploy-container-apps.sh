#!/bin/bash
set -euo pipefail

# =============================================================================
# Deploy to Azure Container Apps
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Configuration
RESOURCE_GROUP="${RESOURCE_GROUP:-scholarly-dev-rg}"
ACR_NAME="${ACR_NAME:-scholarlydevacr}"
APP_NAME="${APP_NAME:-scholarly-dev}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo "=========================================="
echo "Deploying to Azure Container Apps"
echo "=========================================="
echo "Resource Group: $RESOURCE_GROUP"
echo "ACR: $ACR_NAME"
echo "App: $APP_NAME"
echo "Tag: $IMAGE_TAG"
echo "=========================================="

# Login to ACR
echo "Logging in to ACR..."
az acr login --name "$ACR_NAME"

# Build and push image
echo "Building Docker image..."
cd "$PROJECT_ROOT"
docker build -t "${ACR_NAME}.azurecr.io/scholarly:${IMAGE_TAG}" .

echo "Pushing image to ACR..."
docker push "${ACR_NAME}.azurecr.io/scholarly:${IMAGE_TAG}"

# Update Container App
echo "Updating Container App..."
az containerapp update \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --image "${ACR_NAME}.azurecr.io/scholarly:${IMAGE_TAG}"

# Get the app URL
APP_URL=$(az containerapp show \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.configuration.ingress.fqdn" \
  --output tsv)

echo "=========================================="
echo "Deployment complete!"
echo "App URL: https://$APP_URL"
echo "=========================================="

# Health check
echo "Checking health endpoint..."
sleep 5
if curl -sf "https://${APP_URL}/health" > /dev/null; then
  echo "✓ Health check passed"
else
  echo "✗ Health check failed - please investigate"
  exit 1
fi
