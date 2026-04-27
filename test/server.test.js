import test from "node:test";
import assert from "node:assert/strict";

async function withServer(callback) {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.DEMO_ADMIN_TOKEN = "test-dashboard-token";
  process.env.NODE_ENV = "test";
  const { app } = await import(`../server.js?case=${Date.now()}-${Math.random()}`);
  const server = app.listen(0);

  try {
    await new Promise((resolve) => server.once("listening", resolve));
    const { port } = server.address();
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    delete process.env.DEMO_ADMIN_TOKEN;
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  }
}

test("incident listing stays public for the live demo", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/incidents`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.ok(Array.isArray(body.incidents));
  });
});

test("admin token protects staff incident updates", async () => {
  await withServer(async (baseUrl) => {
    const incidents = await fetch(`${baseUrl}/api/incidents`).then((response) => response.json());
    const id = incidents.incidents[0].id;

    const denied = await fetch(`${baseUrl}/api/incidents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Responding" }),
    });
    assert.equal(denied.status, 401);

    const allowed = await fetch(`${baseUrl}/api/incidents/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer test-dashboard-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "Responding" }),
    });
    assert.equal(allowed.status, 200);
    const body = await allowed.json();
    assert.equal(body.incident.status, "Responding");
  });
});

test("guest incident submission stays public", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/incidents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room: "Lobby cafe",
        zone: "Lobby",
        needs: "Medical support",
        description: "A guest has chest pain.",
      }),
    });

    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.incident.triage.severity, "High");
  });
});

test("assistant endpoint returns fallback guidance without Gemini credentials", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "What should staff do next?" }),
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.reply.source, "fallback");
    assert.match(body.reply.text, /venue SOPs|Confirm|Focus/);
  });
});
