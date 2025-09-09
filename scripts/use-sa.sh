#!/usr/bin/env bash
set -euo pipefail
CFG="sb-crm-sa"
PROJECT_ID="santa-brisa-crm"
SA="firebase-app-hosting-compute@${PROJECT_ID}.iam.gserviceaccount.com"

# crea/activa config y fija proyecto + impersonation
gcloud config configurations describe "$CFG" >/dev/null 2>&1 || gcloud config configurations create "$CFG"
gcloud config configurations activate "$CFG"
gcloud config set core/project "$PROJECT_ID"
gcloud config set auth/impersonate_service_account "$SA"

# variables para SDKs (ADC) y herramientas
if ! grep -q "GOOGLE_IMPERSONATE_SERVICE_ACCOUNT" "$HOME/.bashrc"; then
  {
    echo ''
    echo '# --- Santa Brisa CRM Service Account Impersonation ---'
    echo 'export CLOUDSDK_ACTIVE_CONFIG_NAME=sb-crm-sa'
    echo 'export GOOGLE_CLOUD_PROJECT=santa-brisa-crm'
    echo 'export GOOGLE_IMPERSONATE_SERVICE_ACCOUNT=firebase-app-hosting-compute@santa-brisa-crm.iam.gserviceaccount.com'
  } >> "$HOME/.bashrc"
fi

echo "✅ Configuración 'sb-crm-sa' activada y guardada."
echo "✅ Variables de entorno añadidas a ~/.bashrc."
echo "➡️  Abre una nueva terminal o ejecuta 'source ~/.bashrc' para aplicar los cambios."
echo ""
gcloud config list --configuration="$CFG"
