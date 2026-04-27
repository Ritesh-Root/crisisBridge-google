# CrisisBridge AI Requirements

## Goals
- Demonstrate a working hospitality crisis response MVP.
- Use at least one Google AI model/service.
- Be deployable to Google Cloud.
- Produce a clear demo and deck for Solution Challenge submission.

## Functional Requirements
| ID | Requirement |
| --- | --- |
| FR1 | Guest can submit an incident from a simple form. |
| FR2 | Staff dashboard shows incidents sorted by severity and time. |
| FR3 | System generates AI triage: severity, incident type, summary, next actions and responder message. |
| FR4 | Dashboard shows a visual venue map with incident zones. |
| FR5 | Staff can update incident status and assigned team. |
| FR6 | Demo data can be reset or reseeded. |
| FR7 | App exposes health endpoint for deployment checks. |

## Non-Functional Requirements
| ID | Requirement |
| --- | --- |
| NFR1 | MVP must run locally with `npm install` and `npm run dev`. |
| NFR2 | App must work without a Gemini key by using a transparent fallback triage engine. |
| NFR3 | App must be responsive on laptop and mobile widths. |
| NFR4 | No sensitive API keys may be committed. |
| NFR5 | Dockerfile must support Google Cloud Run deployment. |

## Acceptance Criteria
- A reviewer can submit a guest incident and immediately see it on the command dashboard.
- The incident includes severity, AI summary, next actions and zone highlighting.
- `/api/health` returns healthy status.
- `npm test` passes.
- README includes Google Cloud deployment instructions.
