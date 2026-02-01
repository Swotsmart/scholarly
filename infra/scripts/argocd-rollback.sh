#!/bin/bash
set -euo pipefail

# =============================================================================
# ArgoCD Rollback Script
# =============================================================================

APP_NAME="${1:-}"
REVISION="${2:-}"

if [[ -z "$APP_NAME" ]]; then
  echo "Usage: $0 <app-name> [revision]"
  echo ""
  echo "Examples:"
  echo "  $0 scholarly-prod              # Show history"
  echo "  $0 scholarly-prod 5            # Rollback to revision 5"
  echo "  $0 scholarly-prod -1           # Rollback to previous revision"
  echo ""
  echo "Available applications:"
  kubectl get applications -n argocd -o custom-columns=NAME:.metadata.name,STATUS:.status.sync.status,HEALTH:.status.health.status
  exit 1
fi

echo "=========================================="
echo "ArgoCD Rollback: $APP_NAME"
echo "=========================================="

# Show deployment history
echo ""
echo "Deployment History:"
echo "-------------------"
argocd app history "$APP_NAME" 2>/dev/null || kubectl get application "$APP_NAME" -n argocd -o jsonpath='{.status.history[*]}' | jq -r '.[] | "\(.id)\t\(.deployedAt)\t\(.revision[0:7])"'

if [[ -z "$REVISION" ]]; then
  echo ""
  echo "To rollback, run: $0 $APP_NAME <revision-number>"
  exit 0
fi

# Handle relative revision (-1 = previous)
if [[ "$REVISION" == "-1" ]]; then
  echo ""
  echo "Rolling back to previous revision..."
  argocd app rollback "$APP_NAME" 2>/dev/null || {
    # Manual rollback via kubectl
    PREVIOUS_REVISION=$(kubectl get application "$APP_NAME" -n argocd -o jsonpath='{.status.history[-2].revision}')
    echo "Rolling back to revision: $PREVIOUS_REVISION"
    kubectl patch application "$APP_NAME" -n argocd --type=merge -p "{\"spec\":{\"source\":{\"targetRevision\":\"$PREVIOUS_REVISION\"}}}"
    kubectl patch application "$APP_NAME" -n argocd --type=merge -p '{"operation":{"initiatedBy":{"username":"rollback-script"},"sync":{"revision":"'"$PREVIOUS_REVISION"'"}}}'
  }
else
  echo ""
  echo "Rolling back to revision $REVISION..."
  argocd app rollback "$APP_NAME" "$REVISION" 2>/dev/null || {
    echo "ArgoCD CLI not available. Use the ArgoCD UI for rollback."
    echo "  kubectl port-forward svc/argocd-server -n argocd 8080:443"
    echo "  Open: https://localhost:8080"
    exit 1
  }
fi

# Wait for sync
echo ""
echo "Waiting for rollback to complete..."
kubectl wait --for=jsonpath='{.status.sync.status}'=Synced application/"$APP_NAME" -n argocd --timeout=300s

echo ""
echo "=========================================="
echo "Rollback Complete!"
echo "=========================================="
echo ""
echo "Current status:"
argocd app get "$APP_NAME" 2>/dev/null || kubectl get application "$APP_NAME" -n argocd -o custom-columns=NAME:.metadata.name,STATUS:.status.sync.status,HEALTH:.status.health.status,REVISION:.status.sync.revision
