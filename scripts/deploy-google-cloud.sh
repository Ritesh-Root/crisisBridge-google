#!/usr/bin/env bash
set -euo pipefail

SERVICE="${SERVICE:-crisisbridge-ai}"
REGION="${REGION:-asia-south1}"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
GEMINI_SECRET="${GEMINI_SECRET:-crisisbridge-gemini-api-key}"
ADMIN_SECRET="${ADMIN_SECRET:-crisisbridge-demo-admin-token}"
GEMINI_MODEL="${GEMINI_MODEL:-gemini-2.5-flash}"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud CLI is required. Install and authenticate it before deploying." >&2
  exit 1
fi

if [[ -z "${PROJECT_ID}" ]]; then
  echo "Set PROJECT_ID or run: gcloud config set project YOUR_PROJECT_ID" >&2
  exit 1
fi

if [[ -z "${GEMINI_API_KEY:-}" ]]; then
  echo "Set GEMINI_API_KEY in your shell before running this script." >&2
  exit 1
fi

if [[ -z "${DEMO_ADMIN_TOKEN:-}" ]]; then
  echo "Set DEMO_ADMIN_TOKEN in your shell before running this script." >&2
  exit 1
fi

upsert_secret() {
  local name="$1"
  local value="$2"

  if gcloud secrets describe "${name}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
    printf '%s' "${value}" | gcloud secrets versions add "${name}" \
      --project "${PROJECT_ID}" \
      --data-file=-
  else
    printf '%s' "${value}" | gcloud secrets create "${name}" \
      --project "${PROJECT_ID}" \
      --replication-policy=automatic \
      --data-file=-
  fi
}

gcloud config set project "${PROJECT_ID}"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  generativelanguage.googleapis.com \
  --project "${PROJECT_ID}"

upsert_secret "${GEMINI_SECRET}" "${GEMINI_API_KEY}"
upsert_secret "${ADMIN_SECRET}" "${DEMO_ADMIN_TOKEN}"

PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
RUN_SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding "${GEMINI_SECRET}" \
  --project "${PROJECT_ID}" \
  --member "serviceAccount:${RUN_SERVICE_ACCOUNT}" \
  --role roles/secretmanager.secretAccessor >/dev/null

gcloud secrets add-iam-policy-binding "${ADMIN_SECRET}" \
  --project "${PROJECT_ID}" \
  --member "serviceAccount:${RUN_SERVICE_ACCOUNT}" \
  --role roles/secretmanager.secretAccessor >/dev/null

for role in roles/storage.objectViewer roles/artifactregistry.writer roles/logging.logWriter; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member "serviceAccount:${RUN_SERVICE_ACCOUNT}" \
    --role "${role}" >/dev/null
done

gcloud run deploy "${SERVICE}" \
  --project "${PROJECT_ID}" \
  --source . \
  --region "${REGION}" \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_MODEL=${GEMINI_MODEL}" \
  --set-secrets "GEMINI_API_KEY=${GEMINI_SECRET}:latest,DEMO_ADMIN_TOKEN=${ADMIN_SECRET}:latest"
