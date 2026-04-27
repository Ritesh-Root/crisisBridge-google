# CrisisBridge AI

Gemini-powered emergency response and crisis coordination prototype for hospitality venues.

## Challenge Track
`[Rapid Crisis Response] Accelerated Emergency Response and Crisis Coordination in Hospitality`

## What It Does
CrisisBridge AI gives guests a QR-first emergency report page and gives hotel staff a command dashboard. Gemini can triage messy reports into structured severity, incident type, next actions and responder messages.

## What Problem It Solves
Hotels often handle emergencies through scattered phone calls, front-desk notes, staff chats and delayed responder handoffs. That makes it hard to know what is urgent, which team owns the response, what guests should be told and what responders need to know first.

CrisisBridge AI creates one command bridge:
- Guests submit an emergency report without installing an app.
- Gemini converts the report into structured triage.
- Staff see the incident, severity, zone, next actions and responder brief in one dashboard.
- The Gemini Response Coach can answer staff questions such as what to do next, what to tell guests and how to brief responders.

## How It Works
1. A guest submits a report with room/area, zone, assistance needed and description.
2. The Cloud Run API normalizes the incident and sends the report to Gemini.
3. Gemini returns severity, incident type, summary, next actions, guest message and responder brief.
4. The command dashboard shows live incidents, venue zone highlights and AI triage details.
5. Staff can ask the Gemini Response Coach for concise coordination guidance.
6. Staff-only actions such as status changes and team assignment require the dashboard token.

## Google AI / Cloud Usage
- Gemini API or Vertex AI Gemini for incident triage and responder brief generation.
- Gemini Response Coach for concise staff Q&A around the selected incident.
- Google Cloud Run for containerized deployment.
- Planned production extensions: Firebase Cloud Firestore for realtime incident state and Google Maps Platform for responder routing.

## Local Run
```bash
npm install
cp .env.example .env
npm run dev
```

Open:
- `http://localhost:8080`
- Health check: `http://localhost:8080/api/health`

If `GEMINI_API_KEY` is not configured, the app uses a transparent fallback triage engine so the demo still works.

## Tests
```bash
npm test
```

## Google Cloud Run Deploy
This deployment uses:
- Cloud Run for the Node/Express container.
- Google Gemini API for AI triage through `GEMINI_API_KEY`.
- Secret Manager for `GEMINI_API_KEY` and `DEMO_ADMIN_TOKEN`.
- Cloud Logging/Monitoring through Cloud Run defaults.

Set these values in your shell:

```bash
export PROJECT_ID=your-google-cloud-project
export GEMINI_API_KEY=your-google-ai-studio-key
export DEMO_ADMIN_TOKEN=a-long-random-dashboard-token
```

Deploy from this directory with the helper script:

```bash
./scripts/deploy-google-cloud.sh
```

Or deploy manually:

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com generativelanguage.googleapis.com
printf '%s' "$GEMINI_API_KEY" | gcloud secrets create crisisbridge-gemini-api-key --data-file=-
printf '%s' "$DEMO_ADMIN_TOKEN" | gcloud secrets create crisisbridge-demo-admin-token --data-file=-
```

```bash
gcloud run deploy crisisbridge-ai \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_MODEL=gemini-2.5-flash \
  --set-secrets GEMINI_API_KEY=crisisbridge-gemini-api-key:latest,DEMO_ADMIN_TOKEN=crisisbridge-demo-admin-token:latest
```

After deployment, use the Cloud Run service URL as the live prototype link.
Guests can submit reports publicly. Staff dashboard incident listing, status changes, and demo reset require the dashboard token.

## Submission Answers
- Google AI model/service: Gemini API / Vertex AI Gemini, Google Cloud Run.
- Deployed on Google Cloud: Yes, after Cloud Run deployment.
- Demo video: use `docs/demo-script.md`.
- Deck: use `docs/deck-outline.md` with the supplied PPT template.

## Safety Note
This is a coordination prototype, not a replacement for trained emergency services. Production use would require venue-specific SOPs, compliance review, data retention controls, offline fallback and human confirmation.
