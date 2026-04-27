const state = {
  incidents: [],
  selectedId: null,
  adminRequired: false,
  adminToken: sessionStorage.getItem("crisisbridge-admin-token") || "",
};

const elements = {
  form: document.querySelector("#incidentForm"),
  resetDemo: document.querySelector("#resetDemo"),
  incidentList: document.querySelector("#incidentList"),
  incidentDetail: document.querySelector("#incidentDetail"),
  incidentCount: document.querySelector("#incidentCount"),
  urgentCount: document.querySelector("#urgentCount"),
  assignedCount: document.querySelector("#assignedCount"),
  sourceCount: document.querySelector("#sourceCount"),
  aiStatus: document.querySelector("#aiStatus"),
  venueMap: document.querySelector("#venueMap"),
};

await boot();

async function boot() {
  elements.form.addEventListener("submit", handleSubmit);
  elements.resetDemo.addEventListener("click", resetDemo);
  await loadHealth();
  await loadIncidents();
  setInterval(loadIncidents, 6000);
}

async function loadHealth() {
  const health = await fetchJson("/api/health");
  state.adminRequired = Boolean(health.adminRequired);
  elements.aiStatus.textContent = health.geminiConfigured ? "Gemini active" : "Fallback triage";
}

async function loadIncidents() {
  try {
    const data = await fetchJson("/api/incidents", withAdminAuth());
    state.incidents = data.incidents;
    if (!state.selectedId && state.incidents.length) state.selectedId = state.incidents[0].id;
    render();
  } catch (error) {
    if (state.adminRequired && !state.adminToken) {
      render();
      return;
    }
    throw error;
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(elements.form).entries());
  const data = await fetchJson("/api/incidents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  state.selectedId = data.incident.id;
  await loadIncidents();
}

async function resetDemo() {
  const data = await fetchJson("/api/demo/reset", withAdminAuth({ method: "POST" }));
  state.incidents = data.incidents;
  state.selectedId = state.incidents[0]?.id || null;
  render();
}

async function updateIncident(id, patch) {
  const data = await fetchJson(`/api/incidents/${id}`, {
    ...withAdminAuth(),
    method: "PATCH",
    headers: { ...adminHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  state.selectedId = data.incident.id;
  await loadIncidents();
}

function render() {
  renderMetrics();
  renderList();
  renderDetail();
  renderMap();
}

function renderMetrics() {
  const urgent = state.incidents.filter((item) => ["Critical", "High"].includes(item.triage.severity)).length;
  const assigned = state.incidents.filter((item) => item.assignedTeam !== "Unassigned").length;
  const sources = new Set(state.incidents.map((item) => item.triage.source));
  elements.incidentCount.textContent = `${state.incidents.length} active`;
  elements.urgentCount.textContent = urgent;
  elements.assignedCount.textContent = assigned;
  elements.sourceCount.textContent = [...sources].join(", ") || "-";
}

function renderList() {
  if (state.adminRequired && !state.adminToken) {
    elements.incidentList.innerHTML = `
      <div class="auth-panel">
        <h3>Staff token required</h3>
        <p>Enter the dashboard token to view and update incidents.</p>
        <input id="adminTokenInput" type="password" autocomplete="current-password" placeholder="Dashboard token">
        <button class="primary" id="saveAdminToken">Unlock Dashboard</button>
      </div>
    `;
    document.querySelector("#saveAdminToken").addEventListener("click", async () => {
      state.adminToken = document.querySelector("#adminTokenInput").value.trim();
      sessionStorage.setItem("crisisbridge-admin-token", state.adminToken);
      await loadIncidents();
    });
    return;
  }

  elements.incidentList.innerHTML = state.incidents.map((incident) => `
    <button class="incident-card ${incident.id === state.selectedId ? "is-selected" : ""}" data-id="${incident.id}">
      <header>
        <div>
          <h3>${escapeHtml(incident.triage.incidentType)} at ${escapeHtml(incident.room)}</h3>
          <p>${escapeHtml(incident.triage.summary)}</p>
        </div>
        <span class="severity ${incident.triage.severity}">${incident.triage.severity}</span>
      </header>
      <div class="meta-row">
        <span class="tag">${escapeHtml(incident.zone)}</span>
        <span class="tag">${escapeHtml(incident.status)}</span>
        <span class="tag">${escapeHtml(incident.assignedTeam)}</span>
      </div>
    </button>
  `).join("");

  elements.incidentList.querySelectorAll(".incident-card").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.id;
      render();
    });
  });
}

function renderDetail() {
  const incident = state.incidents.find((item) => item.id === state.selectedId);
  if (!incident) {
    elements.incidentDetail.innerHTML = `<div class="empty">No active incident selected.</div>`;
    return;
  }

  elements.incidentDetail.innerHTML = `
    <div class="detail-head">
      <div>
        <p class="eyebrow">AI Triage</p>
        <h2>${escapeHtml(incident.triage.incidentType)} - ${escapeHtml(incident.zone)}</h2>
      </div>
      <span class="severity ${incident.triage.severity}">${incident.triage.severity}</span>
    </div>
    <p>${escapeHtml(incident.description)}</p>

    <div class="detail-section">
      <h3>Next Actions</h3>
      <ol>${incident.triage.nextActions.map((action) => `<li>${escapeHtml(action)}</li>`).join("")}</ol>
    </div>

    <div class="detail-section">
      <h3>Responder Brief</h3>
      <p>${escapeHtml(incident.triage.responderBrief)}</p>
    </div>

    <div class="detail-section">
      <h3>Command Controls</h3>
      <div class="control-grid">
        <label>
          Status
          <select id="statusSelect">
            ${["New", "Responding", "Monitoring", "Resolved"].map((status) => `<option ${status === incident.status ? "selected" : ""}>${status}</option>`).join("")}
          </select>
        </label>
        <label>
          Team
          <select id="teamSelect">
            ${["Unassigned", "Fire response", "Medical", "Security", "Engineering", "Evacuation"].map((team) => `<option ${team === incident.assignedTeam ? "selected" : ""}>${team}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="button-row" style="margin-top:10px">
        <button class="primary" id="saveUpdate">Update Incident</button>
      </div>
    </div>

    <div class="detail-section">
      <h3>Timeline</h3>
      <ul>${(incident.timeline || []).map((item) => `<li>${formatTime(item.at)} - ${escapeHtml(item.actor)}: ${escapeHtml(item.note)}</li>`).join("")}</ul>
    </div>
  `;

  document.querySelector("#saveUpdate").addEventListener("click", () => {
    updateIncident(incident.id, {
      status: document.querySelector("#statusSelect").value,
      assignedTeam: document.querySelector("#teamSelect").value,
    });
  });
}

function renderMap() {
  const zones = [...elements.venueMap.querySelectorAll(".zone")];
  zones.forEach((zone) => {
    zone.classList.remove("hot", "Critical", "High", "Medium", "Low");
  });

  const severityRank = { Critical: 4, High: 3, Medium: 2, Low: 1 };
  const byZone = {};
  for (const incident of state.incidents) {
    const current = byZone[incident.zone];
    if (!current || severityRank[incident.triage.severity] > severityRank[current]) {
      byZone[incident.zone] = incident.triage.severity;
    }
  }

  zones.forEach((zone) => {
    const severity = byZone[zone.dataset.zone];
    if (severity) zone.classList.add("hot", severity);
  });
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (response.status === 401 && state.adminRequired) {
    sessionStorage.removeItem("crisisbridge-admin-token");
    state.adminToken = "";
    render();
    throw new Error("Admin token required.");
  }
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

function withAdminAuth(options = {}) {
  return {
    ...options,
    headers: { ...adminHeaders(), ...(options.headers || {}) },
  };
}

function adminHeaders() {
  return state.adminToken ? { Authorization: `Bearer ${state.adminToken}` } : {};
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
