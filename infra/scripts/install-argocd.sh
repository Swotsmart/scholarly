#!/bin/bash
set -euo pipefail

# =============================================================================
# Install ArgoCD on AKS
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration
ARGOCD_VERSION="${ARGOCD_VERSION:-v2.10.0}"
INSTALL_IMAGE_UPDATER="${INSTALL_IMAGE_UPDATER:-true}"
HA_MODE="${HA_MODE:-true}"

echo "=========================================="
echo "Installing ArgoCD"
echo "=========================================="
echo "Version: $ARGOCD_VERSION"
echo "HA Mode: $HA_MODE"
echo "Image Updater: $INSTALL_IMAGE_UPDATER"
echo "=========================================="

# Check kubectl connection
echo "Checking cluster connection..."
kubectl cluster-info

# Create namespace
echo "Creating argocd namespace..."
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -

# Install ArgoCD
echo "Installing ArgoCD..."
if [[ "$HA_MODE" == "true" ]]; then
  kubectl apply -n argocd -f "https://raw.githubusercontent.com/argoproj/argo-cd/${ARGOCD_VERSION}/manifests/ha/install.yaml"
else
  kubectl apply -n argocd -f "https://raw.githubusercontent.com/argoproj/argo-cd/${ARGOCD_VERSION}/manifests/install.yaml"
fi

# Wait for ArgoCD to be ready
echo "Waiting for ArgoCD pods to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd
kubectl wait --for=condition=available --timeout=300s deployment/argocd-repo-server -n argocd
kubectl wait --for=condition=available --timeout=300s deployment/argocd-applicationset-controller -n argocd

# Apply custom configuration
echo "Applying custom configuration..."
kubectl apply -f "$INFRA_DIR/argocd/base/argocd-cm.yaml"
kubectl apply -f "$INFRA_DIR/argocd/base/argocd-rbac-cm.yaml"

# Install ArgoCD Image Updater (optional)
if [[ "$INSTALL_IMAGE_UPDATER" == "true" ]]; then
  echo "Installing ArgoCD Image Updater..."
  kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj-labs/argocd-image-updater/stable/manifests/install.yaml

  # Wait for image updater
  kubectl wait --for=condition=available --timeout=120s deployment/argocd-image-updater -n argocd
fi

# Get initial admin password
echo ""
echo "=========================================="
echo "ArgoCD Installation Complete!"
echo "=========================================="
echo ""
echo "Initial admin password:"
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
echo ""
echo ""
echo "To access ArgoCD UI:"
echo "  kubectl port-forward svc/argocd-server -n argocd 8080:443"
echo "  Open: https://localhost:8080"
echo "  Username: admin"
echo ""
echo "To install ArgoCD CLI:"
echo "  brew install argocd"
echo ""
echo "To login via CLI:"
echo "  argocd login localhost:8080 --username admin --password <password> --insecure"
echo ""
echo "NEXT STEPS:"
echo "1. Change the admin password"
echo "2. Configure repository access (see docs)"
echo "3. Apply the AppProject: kubectl apply -f $INFRA_DIR/argocd/projects/"
echo "4. Deploy applications: kubectl apply -f $INFRA_DIR/argocd/applications/"
echo "=========================================="
