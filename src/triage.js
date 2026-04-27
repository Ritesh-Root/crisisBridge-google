const zoneCoords = {
  Lobby: { x: 24, y: 70 },
  "Floor 2": { x: 48, y: 45 },
  "Floor 3": { x: 60, y: 26 },
  Kitchen: { x: 78, y: 68 },
  Parking: { x: 20, y: 24 },
  Poolside: { x: 78, y: 30 },
};

const severityRules = [
  { severity: "Critical", words: ["fire", "smoke", "explosion", "unconscious", "stampede", "weapon"] },
  { severity: "High", words: ["bleeding", "chest pain", "trapped", "assault", "gas", "evacuate"] },
  { severity: "Medium", words: ["injury", "panic", "fall", "power", "short circuit", "missing"] },
];

const typeRules = [
  { incidentType: "fire", words: ["fire", "smoke", "burn", "gas", "short circuit"] },
  { incidentType: "medical", words: ["medical", "unconscious", "bleeding", "chest", "injury", "fall"] },
  { incidentType: "security", words: ["security", "assault", "theft", "weapon", "fight", "threat"] },
  { incidentType: "evacuation", words: ["evacuate", "trapped", "stampede", "crowd"] },
  { incidentType: "utility", words: ["power", "water", "lift", "elevator", "gas"] },
];

export function normalizeIncident(input) {
  const zone = String(input.zone || "Lobby").trim();
  return {
    id: String(input.id),
    createdAt: String(input.createdAt || new Date().toISOString()),
    reporterName: clean(input.reporterName, "Guest"),
    room: clean(input.room, "Unknown area"),
    zone,
    description: clean(input.description, "No description provided."),
    needs: clean(input.needs, "Not specified"),
    status: clean(input.status, "New"),
    assignedTeam: clean(input.assignedTeam, "Unassigned"),
    coordinates: zoneCoords[zone] || zoneCoords.Lobby,
  };
}

export function buildFallbackTriage(incident) {
  const text = `${incident.description} ${incident.needs}`.toLowerCase();
  const severity = severityRules.find((rule) => rule.words.some((word) => text.includes(word)))?.severity || "Low";
  const incidentType = typeRules.find((rule) => rule.words.some((word) => text.includes(word)))?.incidentType || "other";
  return {
    severity,
    incidentType,
    summary: `${severity} ${incidentType} report near ${incident.room}, ${incident.zone}.`,
    nextActions: buildActions(severity, incidentType, incident),
    responderBrief: `${severity} ${incidentType} incident at ${incident.room}, ${incident.zone}. Guest report: ${incident.description}`,
    guestMessage: "Your report has reached the response desk. Move to a safe area if possible and follow staff instructions.",
  };
}

export function seedIncidents() {
  return [
    normalizeWithTriage({
      id: "demo-fire",
      createdAt: minutesAgo(8),
      reporterName: "Aarav",
      room: "Room 312 corridor",
      zone: "Floor 3",
      description: "There is smoke near the service corridor and guests are coughing.",
      needs: "Evacuation guidance",
      status: "Responding",
      assignedTeam: "Fire response",
    }),
    normalizeWithTriage({
      id: "demo-medical",
      createdAt: minutesAgo(16),
      reporterName: "Nisha",
      room: "Lobby cafe",
      zone: "Lobby",
      description: "A guest fell and may have chest pain. Staff need medical help.",
      needs: "Medical support",
      status: "New",
      assignedTeam: "Medical",
    }),
    normalizeWithTriage({
      id: "demo-utility",
      createdAt: minutesAgo(22),
      reporterName: "Front desk",
      room: "Kitchen loading bay",
      zone: "Kitchen",
      description: "Power fluctuation and smell near electrical panel.",
      needs: "Maintenance inspection",
      status: "Monitoring",
      assignedTeam: "Engineering",
    }),
  ];
}

function normalizeWithTriage(input) {
  const incident = normalizeIncident(input);
  return {
    ...incident,
    triage: { ...buildFallbackTriage(incident), source: "demo" },
    timeline: [
      {
        at: incident.createdAt,
        actor: "Demo seed",
        note: "Incident added for prototype walkthrough.",
      },
    ],
  };
}

function buildActions(severity, incidentType, incident) {
  const shared = [
    `Confirm exact location: ${incident.room}, ${incident.zone}.`,
    "Assign nearest trained staff member and acknowledge in dashboard.",
  ];

  const byType = {
    fire: ["Trigger fire SOP and check evacuation route.", "Keep guests away from smoke and elevators."],
    medical: ["Send first-aid trained staff with kit/AED.", "Prepare concise medical brief for ambulance team."],
    security: ["Dispatch security and isolate guests from threat area.", "Preserve evidence and avoid escalation."],
    evacuation: ["Open nearest safe exit and guide guests calmly.", "Track guests needing assistance."],
    utility: ["Cut off affected utility if safe.", "Send engineering team and prevent guest access."],
    other: ["Collect more detail from reporter.", "Monitor for escalation."],
  };

  const urgent = severity === "Critical" || severity === "High"
    ? ["Notify emergency services liaison immediately."]
    : ["Keep front desk informed and reassess in five minutes."];

  return [...shared, ...(byType[incidentType] || byType.other), ...urgent].slice(0, 4);
}

function clean(value, fallback) {
  const text = String(value || "").trim();
  return (text || fallback).slice(0, 900);
}

function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}
