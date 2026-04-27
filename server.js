import express from "express";
import { nanoid } from "nanoid";
import { GoogleGenAI } from "@google/genai";
import { buildFallbackTriage, normalizeIncident, seedIncidents } from "./src/triage.js";

const app = express();
const port = Number(process.env.PORT || 8080);
const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const adminToken = process.env.DEMO_ADMIN_TOKEN?.trim();
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

let incidents = seedIncidents();

app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public", { extensions: ["html"] }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "crisisbridge-ai",
    incidentCount: incidents.length,
    geminiConfigured: Boolean(ai),
    adminRequired: Boolean(adminToken),
  });
});

app.get("/api/incidents", requireAdmin, (_req, res) => {
  res.json({ incidents: sortIncidents(incidents) });
});

app.post("/api/incidents", async (req, res) => {
  const incident = normalizeIncident({
    id: nanoid(10),
    createdAt: new Date().toISOString(),
    status: "New",
    assignedTeam: "Unassigned",
    ...req.body,
  });

  const triage = await triageIncident(incident);
  const saved = {
    ...incident,
    triage,
    timeline: [
      {
        at: incident.createdAt,
        actor: "Guest report",
        note: "Incident submitted and triaged.",
      },
    ],
  };

  incidents.push(saved);
  res.status(201).json({ incident: saved });
});

app.patch("/api/incidents/:id", requireAdmin, (req, res) => {
  const idx = incidents.findIndex((incident) => incident.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  const before = incidents[idx];
  const next = {
    ...before,
    status: req.body.status || before.status,
    assignedTeam: req.body.assignedTeam || before.assignedTeam,
  };

  const changed = [];
  if (next.status !== before.status) changed.push(`status -> ${next.status}`);
  if (next.assignedTeam !== before.assignedTeam) changed.push(`team -> ${next.assignedTeam}`);
  if (changed.length) {
    next.timeline = [
      ...(before.timeline || []),
      {
        at: new Date().toISOString(),
        actor: "Command dashboard",
        note: changed.join(", "),
      },
    ];
  }

  incidents[idx] = next;
  res.json({ incident: next });
});

app.post("/api/demo/reset", requireAdmin, (_req, res) => {
  incidents = seedIncidents();
  res.json({ incidents: sortIncidents(incidents) });
});

function requireAdmin(req, res, next) {
  if (!adminToken) {
    next();
    return;
  }

  const authorization = req.get("authorization") || "";
  if (authorization === `Bearer ${adminToken}`) {
    next();
    return;
  }

  res.status(401).json({ error: "Admin token required." });
}

app.use((err, _req, res, next) => {
  if (!err) {
    next();
    return;
  }

  const status = err.status === 413 ? 413 : err.statusCode || err.status || 500;
  const message = status === 413
    ? "Request body is too large."
    : status >= 500
      ? "Internal server error."
      : "Invalid request.";

  res.status(status).json({ error: message });
});

async function triageIncident(incident) {
  const fallback = buildFallbackTriage(incident);
  if (!ai) return { ...fallback, source: "fallback" };

  const prompt = `You are an emergency triage assistant for a hospitality venue.
Return strict JSON only with keys:
severity: Critical|High|Medium|Low
incidentType: fire|medical|security|evacuation|utility|other
summary: one sentence
nextActions: array of 4 short staff actions
responderBrief: concise message for first responders
guestMessage: reassuring guest message

Incident:
Zone: ${incident.zone}
Room/Area: ${incident.room}
Reporter: ${incident.reporterName}
Needs: ${incident.needs}
Description: ${incident.description}`;

  try {
    const response = await ai.models.generateContent({
      model: geminiModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });
    const text = response.text || "{}";
    return {
      ...fallback,
      ...JSON.parse(text),
      source: "gemini",
    };
  } catch (error) {
    return {
      ...fallback,
      source: "fallback",
      modelError: error instanceof Error ? error.message : "Gemini triage failed",
    };
  }
}

function sortIncidents(list) {
  const rank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  return [...list].sort((a, b) => {
    const severityDelta = (rank[a.triage?.severity] ?? 9) - (rank[b.triage?.severity] ?? 9);
    if (severityDelta) return severityDelta;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`CrisisBridge AI running on http://localhost:${port}`);
  });
}

export { app, triageIncident };
