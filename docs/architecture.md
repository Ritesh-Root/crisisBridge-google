# CrisisBridge AI Architecture

```text
Guest QR / Mobile Report
        |
        v
Node + Express API on Cloud Run
        |
        +-- Incident Store (MVP: in-memory, future: Firestore)
        +-- Gemini Triage Service
        +-- Status / Assignment API
        |
        v
Staff Command Dashboard
        |
        +-- Live incident list
        +-- Venue zone map
        +-- Timeline and response tasks
        +-- Responder briefing
```

## Runtime
- `server.js` serves the frontend and API.
- `public/app.js` powers the dashboard and guest form.
- `public/styles.css` handles responsive UI.
- Gemini integration is isolated in the triage service inside `server.js`.

## Future Production Architecture
| MVP | Production Upgrade |
| --- | --- |
| In-memory incident store | Firebase Cloud Firestore |
| Polling refresh | Firestore listeners or WebSockets |
| Text incident input | Gemini Live API voice intake and Vision AI image analysis |
| Static venue zones | Google Maps Platform indoor/floor routing |
| Single venue | Multi-tenant hospitality groups |
