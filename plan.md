# CrisisBridge AI Plan

## Track
Rapid Crisis Response: Accelerated Emergency Response and Crisis Coordination in Hospitality.

## Project Summary
CrisisBridge AI is a real-time emergency coordination platform for hotels, hostels, event venues, resorts and campus guest houses. Guests report incidents from a QR/mobile page, staff coordinate from an operations dashboard, and Gemini helps convert messy reports into severity, incident type, safety actions and responder instructions.

The MVP is designed for Google Solution Challenge 2026 prototype submission:
- Live prototype link.
- Public GitHub repository.
- Short demo video.
- Project deck using the supplied template.
- Google AI model/service usage.
- Google Cloud deployment path.

## Why This Track
| Judge Lens | Reason |
| --- | --- |
| Technical merit | Real-time incident intake, AI triage, role-based workflow, map/floor status, deployable Node app. |
| User experience | Clear guest reporting flow and command dashboard; easy 3-minute demo. |
| Alignment with cause | Protects life and safety during fires, medical emergencies, violence, stampedes and evacuation events. |
| Innovation | Gemini turns fragmented reports into structured response plans and keeps guests, staff and responders synchronized. |

## MVP Scope
| Module | MVP Behavior |
| --- | --- |
| Guest SOS | Guest submits room/zone, incident type, description and optional assistance needs. |
| Gemini triage | Server calls Gemini when configured; otherwise uses deterministic fallback for demo safety. |
| Command dashboard | Staff see active incidents, severity, timeline, assigned response teams and next actions. |
| Crisis sync | In-memory event bus simulates real-time state updates. |
| Floor map | Visual zone map highlights incident locations and severity. |
| Demo mode | Seeded scenarios show fire, medical and security incidents without external dependencies. |

## Google Technologies
| Service | Use |
| --- | --- |
| Gemini API / Vertex AI Gemini | Multilingual emergency triage, summarization and response checklist generation. |
| Google Cloud Run | Containerized web/API deployment. |
| Firebase Hosting or Cloud Run static serving | Live MVP delivery. |
| Google Maps Platform / Routes API | Planned extension for responder routing and ETA. |
| Firebase Cloud Firestore | Planned extension for durable real-time incident state. |

## Build Phases
| Phase | Status | Deliverable |
| --- | --- | --- |
| P1: Concept and docs | Complete | Plan, README, deck outline, architecture notes. |
| P2: MVP web app | Complete | Node/Express app with guest and command views. |
| P3: AI triage | Complete | Gemini-backed incident creation with fallback. |
| P4: Google Cloud readiness | Complete | Dockerfile, env docs and Cloud Run deploy command. |
| P5: Verification | Complete | Local smoke test, npm audit and security gate note. |
| P6: Deck/video prep | Complete | Slide content mapped to supplied template. |

## Submission Fields
| Field | Planned Answer |
| --- | --- |
| Problem statement dropdown | `[Rapid Crisis Response] Accelerated Emergency Response and Crisis Coordination in Hospitality` |
| Prototype link | Cloud Run/Firebase URL after deployment. |
| GitHub repo link | Public GitHub repository after push. |
| Demo video | 3-minute walkthrough script in `docs/demo-script.md`. |
| Google Cloud deployed? | Yes, once Cloud Run deployment is complete. |
| Google AI model/service | Gemini API or Vertex AI Gemini, plus Cloud Run and optional Firebase. |

## Security Gate
Before final submission:
- Run static checklist if no credentials/live target exist.
- Run Shannon only on local/staging URL with source path and AI credentials available.
- Never run active exploit testing against third-party or production systems.
