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

test("admin token protects incident listing", async () => {
  await withServer(async (baseUrl) => {
    const denied = await fetch(`${baseUrl}/api/incidents`);
    assert.equal(denied.status, 401);

    const allowed = await fetch(`${baseUrl}/api/incidents`, {
      headers: { Authorization: "Bearer test-dashboard-token" },
    });
    assert.equal(allowed.status, 200);
    const body = await allowed.json();
    assert.ok(Array.isArray(body.incidents));
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
