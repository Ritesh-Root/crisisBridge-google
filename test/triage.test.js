import test from "node:test";
import assert from "node:assert/strict";
import { buildFallbackTriage, normalizeIncident, seedIncidents } from "../src/triage.js";

test("fallback triage marks smoke reports as critical fire incidents", () => {
  const incident = normalizeIncident({
    id: "case-1",
    zone: "Floor 3",
    room: "Room 301",
    description: "Smoke and fire near the staircase",
    needs: "Evacuation",
  });

  const triage = buildFallbackTriage(incident);
  assert.equal(triage.severity, "Critical");
  assert.equal(triage.incidentType, "fire");
  assert.ok(triage.nextActions.length >= 3);
});

test("seed incidents include triage and timeline", () => {
  const incidents = seedIncidents();
  assert.equal(incidents.length, 3);
  assert.ok(incidents.every((incident) => incident.triage));
  assert.ok(incidents.every((incident) => incident.timeline.length));
});
