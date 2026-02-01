#!/bin/bash
set -euo pipefail

# =============================================================================
# Deploy to Azure Kubernetes Service (AKS)
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
INFRA_DIR="$PROJECT_ROOT/infra"

# Configuration
RESOURCE_GROUP="${RESOURCE_GROUP:-scholarly-prod-rg}"
ACR_NAME="${ACR_NAME:-scholarlyprodacr}"
CLUSTER_NAME="${CLUSTER_NAME:-scholarly-prod-aks}"
NAMESPACE="${NAMESPACE:-scholarly}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
OVERLAY="${OVERLAY:-prod}"

echo "=========================================="
echo "Deploying to AKS"
echo "=========================================="
echo "Resource Group: $RESOURCE_GROUP"
echo "Cluster: $CLUSTER_NAME"
echo "Namespace: $NAMESPACE"
echo "Overlay: $OVERLAY"
echo "Tag: $IMAGE_TAG"
echo "=========================================="

# Get AKS credentials
echo "Getting AKS credentials..."
az aks get-credentials \
  --resource-group "$RESOURCE_GROUP" \
  --name "$CLUSTER_NAME" \
  --overwrite-existing

# Login to ACR
echo "Logging in to ACR..."
az acr login --name "$ACR_NAME"

# Build and push image
echo "Building Docker image..."
cd "$PROJECT_ROOT"
docker build -t "${ACR_NAME}.azurecr.io/scholarly:${IMAGE_TAG}" .

echo "Pushing image to ACR..."
docker push "${ACR_NAME}.azurecr.io/scholarly:${IMAGE_TAG}"

# Apply Kubernetes manifests with Kustomize
echo "Applying Kubernetes manifests..."
cd "$INFRA_DIR/kubernetes/overlays/$OVERLAY"

# Update image tag in kustomization
kustomize edit set image "scholarlyacr.azurecr.io/scholarly=${ACR_NAME}.azurecr.io/scholarly:${IMAGE_TAG}"

# Apply
kubectl apply -k .

# Wait for rollout
echo "Waiting for rollout to complete..."
kubectl rollout status deployment/scholarly -n "$NAMESPACE" --timeout=5m

# Get pod status
echo "Pod status:"
kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=scholarly

echo "=========================================="
echo "Deployment complete!"
echo "=========================================="

# Health check
echo "Checking health via port-forward..."
kubectl port-forward -n "$NAMESPACE" svc/scholarly 8080:80 &
PF_PID=$!
sleep 3

if curl -sf "http://localhost:8080/health" > /dev/null; then
  echo "✓ Health check passed"
else
  echo "✗ Health check failed - please investigate"
fi

kill $PF_PID 2>/dev/null || true
