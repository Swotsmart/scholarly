#!/bin/bash
set -euo pipefail

# =============================================================================
# Configure ArgoCD Repository Access
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration
REPO_URL="${REPO_URL:-https://github.com/your-org/scholarly.git}"
GITHUB_USERNAME="${GITHUB_USERNAME:-}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
ACR_NAME="${ACR_NAME:-scholarlyacr}"

echo "=========================================="
echo "Configuring ArgoCD Repository Access"
echo "=========================================="

# Check if credentials provided
if [[ -z "$GITHUB_USERNAME" || -z "$GITHUB_TOKEN" ]]; then
  echo "Please provide GitHub credentials:"
  echo "  GITHUB_USERNAME=your-username GITHUB_TOKEN=your-token ./setup-argocd-repo.sh"
  echo ""
  echo "To create a GitHub token:"
  echo "  1. Go to https://github.com/settings/tokens"
  echo "  2. Generate new token (classic)"
  echo "  3. Select 'repo' scope"
  exit 1
fi

# Create GitHub repository secret
echo "Creating GitHub repository credentials secret..."
kubectl create secret generic github-repo-creds \
  --namespace argocd \
  --from-literal=username="$GITHUB_USERNAME" \
  --from-literal=password="$GITHUB_TOKEN" \
  --dry-run=client -o yaml | kubectl apply -f -

# Label it for ArgoCD
kubectl label secret github-repo-creds -n argocd argocd.argoproj.io/secret-type=repo-creds --overwrite

# Add the repository to ArgoCD
echo "Adding repository to ArgoCD..."
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: scholarly-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: $REPO_URL
  username: $GITHUB_USERNAME
  password: $GITHUB_TOKEN
EOF

# Configure ACR access for Image Updater
echo "Configuring ACR access for Image Updater..."
ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query username -o tsv 2>/dev/null || echo "")
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv 2>/dev/null || echo "")

if [[ -n "$ACR_USERNAME" && -n "$ACR_PASSWORD" ]]; then
  kubectl create secret generic acr-credentials \
    --namespace argocd \
    --from-literal=username="$ACR_USERNAME" \
    --from-literal=password="$ACR_PASSWORD" \
    --dry-run=client -o yaml | kubectl apply -f -
  echo "ACR credentials configured"
else
  echo "Warning: Could not get ACR credentials. Configure manually if using Image Updater."
fi

echo ""
echo "=========================================="
echo "Repository Configuration Complete!"
echo "=========================================="
echo ""
echo "NEXT STEPS:"
echo "1. Apply the AppProject:"
echo "   kubectl apply -f $INFRA_DIR/argocd/projects/scholarly-project.yaml"
echo ""
echo "2. Deploy applications:"
echo "   kubectl apply -f $INFRA_DIR/argocd/applications/scholarly-dev.yaml"
echo "   kubectl apply -f $INFRA_DIR/argocd/applications/scholarly-prod.yaml"
echo ""
echo "Or deploy all apps at once with app-of-apps:"
echo "   kubectl apply -f $INFRA_DIR/argocd/applications/app-of-apps.yaml"
echo "=========================================="
