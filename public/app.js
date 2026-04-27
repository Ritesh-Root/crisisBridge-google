const state = {
  incidents: [],
  selectedId: null,
  adminRequired: false,
  adminToken: sessionStorage.getItem("crisisbridge-admin-token") || "",
};

const elements = {
  form: document.querySelector("#incidentForm"),
  resetDemo: document.querySelector("#resetDemo"),
  assistantForm: document.querySelector("#assistantForm"),
  assistantQuestion: document.querySelector("#assistantQuestion"),
  assistantMessages: document.querySelector("#assistantMessages"),
  assistantSource: document.querySelector("#assistantSource"),
  incidentList: document.querySelector("#incidentList"),
  incidentDetail: document.querySelector("#incidentDetail"),
  incidentCount: document.querySelector("#incidentCount"),
  urgentCount: document.querySelector("#urgentCount"),
  assignedCount: document.querySelector("#assignedCount"),
  sourceCount: document.querySelector("#sourceCount"),
  aiStatus: document.querySelector("#aiStatus"),
  lastSynced: document.querySelector("#lastSynced"),
  venueMap: document.querySelector("#venueMap"),
};

await boot();

async function boot() {
  elements.form.addEventListener("submit", handleSubmit);
  elements.resetDemo.addEventListener("click", resetDemo);
  elements.assistantForm.addEventListener("submit", handleAssistantSubmit);
  document.querySelectorAll("[data-question]").forEach((button) => {
    button.addEventListener("click", () => askAssistant(button.dataset.question));
  });
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
    const data = await fetchJson("/api/incidents");
    state.incidents = data.incidents;
    if (!state.selectedId && state.incidents.length) state.selectedId = state.incidents[0].id;
    elements.lastSynced.textContent = `Synced ${formatTime(new Date().toISOString())}`;
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
  const data = await fetchJson("/api/demo/reset", { method: "POST" });
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
  const urgent = state.incidents.filter((item) => ["Critical", "High"].includes(normalizeSeverity(item.triage.severity))).length;
  const assigned = state.incidents.filter((item) => item.assignedTeam !== "Unassigned").length;
  const sources = new Set(state.incidents.map((item) => item.triage.source));
  elements.incidentCount.textContent = `${state.incidents.length} active`;
  elements.urgentCount.textContent = urgent;
  elements.assignedCount.textContent = assigned;
  elements.sourceCount.textContent = [...sources].join(", ") || "-";
}

function renderList() {
  elements.incidentList.innerHTML = state.incidents.map((incident) => `
    <button class="incident-card ${normalizeSeverity(incident.triage.severity)} ${incident.id === state.selectedId ? "is-selected" : ""}" data-id="${incident.id}">
      <header>
        <div>
          <span class="incident-type">${escapeHtml(incident.triage.incidentType)}</span>
          <h3>${escapeHtml(incident.room)}</h3>
          <p>${escapeHtml(incident.triage.summary)}</p>
        </div>
        <span class="severity ${normalizeSeverity(incident.triage.severity)}">${escapeHtml(normalizeSeverity(incident.triage.severity))}</span>
      </header>
      <div class="meta-row">
        <span class="tag">${escapeHtml(incident.zone)}</span>
        <span class="tag">${escapeHtml(incident.status)}</span>
        <span class="tag">${escapeHtml(incident.assignedTeam)}</span>
        <span class="tag">${formatTime(incident.createdAt)}</span>
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

  const severity = normalizeSeverity(incident.triage.severity);
  elements.incidentDetail.innerHTML = `
    <div class="detail-head">
      <div>
        <p class="eyebrow">AI Triage</p>
        <h2>${escapeHtml(incident.triage.incidentType)} - ${escapeHtml(incident.zone)}</h2>
      </div>
      <span class="severity ${severity}">${escapeHtml(severity)}</span>
    </div>
    <p class="incident-description">${escapeHtml(incident.description)}</p>

    <div class="detail-section">
      <h3>Next Actions</h3>
      <ol>${incident.triage.nextActions.map((action) => `<li>${escapeHtml(action)}</li>`).join("")}</ol>
    </div>

    <div class="detail-section">
      <h3>Responder Brief</h3>
      <p>${escapeHtml(incident.triage.responderBrief)}</p>
    </div>

    <div class="detail-section">
      <h3>Staff Controls</h3>
      ${renderStaffControls(incident)}
    </div>

    <div class="detail-section">
      <h3>Timeline</h3>
      <ul class="timeline">${(incident.timeline || []).map((item) => `<li><time>${formatTime(item.at)}</time><span>${escapeHtml(item.actor)}: ${escapeHtml(item.note)}</span></li>`).join("")}</ul>
    </div>
  `;

  const saveUpdate = document.querySelector("#saveUpdate");
  if (saveUpdate) {
    saveUpdate.addEventListener("click", () => {
      updateIncident(incident.id, {
        status: document.querySelector("#statusSelect").value,
        assignedTeam: document.querySelector("#teamSelect").value,
      });
    });
  }

  const unlockStaff = document.querySelector("#unlockStaff");
  if (unlockStaff) {
    unlockStaff.addEventListener("click", () => {
      state.adminToken = document.querySelector("#adminTokenInput").value.trim();
      sessionStorage.setItem("crisisbridge-admin-token", state.adminToken);
      renderDetail();
    });
  }
}

function renderStaffControls(incident) {
  if (state.adminRequired && !state.adminToken) {
    return `
      <div class="staff-lock">
        <p>Public demo mode lets everyone view Gemini triage. Enter the staff token only when you want to change status or assign a response team.</p>
        <div class="unlock-row">
          <input id="adminTokenInput" type="password" autocomplete="current-password" placeholder="Staff dashboard token">
          <button class="primary" id="unlockStaff" type="button">Unlock Actions</button>
        </div>
      </div>
    `;
  }

  return `
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
      <button class="primary" id="saveUpdate" type="button">Update Incident</button>
    </div>
  `;
}

async function handleAssistantSubmit(event) {
  event.preventDefault();
  await askAssistant(elements.assistantQuestion.value);
}

async function askAssistant(question) {
  const cleanQuestion = String(question || "").trim();
  if (!cleanQuestion) return;

  elements.assistantQuestion.value = "";
  addAssistantMessage("user", "You", cleanQuestion);
  elements.assistantSource.textContent = "Thinking";

  try {
    const data = await fetchJson("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: cleanQuestion,
        incidentId: state.selectedId,
      }),
    });
    elements.assistantSource.textContent = data.reply.source === "gemini" ? "Gemini" : "Fallback";
    addAssistantMessage("ai", "CrisisBridge AI", data.reply.text);
  } catch (error) {
    elements.assistantSource.textContent = "Offline";
    addAssistantMessage("ai", "CrisisBridge AI", "I could not reach the assistant service. Keep following the visible next actions and venue SOPs.");
  }
}

function addAssistantMessage(kind, title, text) {
  const message = document.createElement("div");
  message.className = `assistant-message ${kind}`;
  const heading = document.createElement("strong");
  heading.textContent = title;
  const body = document.createElement("p");
  body.textContent = text;
  message.append(heading, body);
  elements.assistantMessages.append(message);
  elements.assistantMessages.scrollTop = elements.assistantMessages.scrollHeight;
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
    const severity = normalizeSeverity(incident.triage.severity);
    if (!current || severityRank[severity] > severityRank[current]) {
      byZone[incident.zone] = severity;
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

function normalizeSeverity(value) {
  return ["Critical", "High", "Medium", "Low"].includes(value) ? value : "Low";
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
