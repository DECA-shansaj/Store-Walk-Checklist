/**
 * Netlify Function – Store Walk API (serverless)
 *
 * Limitations vs long-running backend/:
 * - No durable local filesystem. This demo keeps data in-memory per
 *   warm instance OR you can plug Netlify Blobs / external DB later.
 * - Configure SMTP via Netlify env vars for real email (never in client).
 *
 * Routes (via redirect /api/* → this function):
 *   GET  /api/health
 *   POST /api/checklists
 *   GET  /api/checklists
 *   GET  /api/checklists/:id
 *   POST /api/checklists/:id/sync
 *   GET  /api/checklist-config
 *   GET  /api/issues
 */

const DEFAULT_NOTIFY =
  process.env.DEFAULT_NOTIFY_EMAIL ||
  "deca.lee.store-ops-grp.list.websitez09gulfport@mail.mil";

// Ephemeral store (resets when the function instance goes cold).
// For production, replace with Netlify Blobs, Cosmos, SQL, etc.
const mem = global.__gpStore || (global.__gpStore = { byId: {}, issues: [] });

function json(status, body) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function extractIssues(record) {
  const out = [];
  const responses = record.responses || {};
  Object.keys(responses).forEach((itemId) => {
    const r = responses[itemId];
    if (r && r.selection === "issue") {
      out.push({
        id: record.id + ":" + itemId,
        recordId: record.id,
        itemId,
        managerName: record.managerName,
        role: record.role,
        dateISO: record.dateISO,
        remarks: r.remarks || "",
        actionTaken: r.actionTaken || "",
        status: r.issueStatus || "open",
        submittedAt: record.submittedAt,
      });
    }
  });
  return out;
}

function pathOf(event) {
  // Netlify may pass /api/checklists or full path
  let p = event.path || "";
  if (event.rawUrl) {
    try {
      p = new URL(event.rawUrl).pathname;
    } catch (_) {}
  }
  return p.replace(/^\/\.netlify\/functions\/api/, "/api");
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  const method = event.httpMethod;
  const path = pathOf(event);
  const parts = path.split("/").filter(Boolean); // ["api", "checklists", ...]

  try {
    if (method === "GET" && path === "/api/health") {
      return json(200, {
        ok: true,
        service: "gulfport-store-walk-api-netlify",
        time: new Date().toISOString(),
        note: "In-memory store unless you attach Blobs/DB",
      });
    }

    if (method === "GET" && path === "/api/checklist-config") {
      return json(200, {
        ok: true,
        data: null,
        message: "Use client embedded checklist; server config optional",
      });
    }

    if (method === "POST" && path === "/api/checklists") {
      const body = JSON.parse(event.body || "{}");
      if (!body.id || !body.managerName || !body.role) {
        return json(400, { ok: false, message: "id, managerName, role required" });
      }
      const now = new Date().toISOString();
      const existing = mem.byId[body.id];
      const record = Object.assign({}, existing || {}, body, {
        status: "submitted",
        immutable: true,
        centralId: (existing && existing.centralId) || "NTL-" + body.id,
        submittedAt: (existing && existing.submittedAt) || now,
        emailNote:
          "Netlify function accepted record. Configure SMTP env for real mail to " +
          (body.notifyEmail || DEFAULT_NOTIFY),
        emailQueued: false,
      });
      mem.byId[record.id] = record;
      mem.issues = mem.issues.filter((i) => i.recordId !== record.id).concat(extractIssues(record));
      return json(existing ? 200 : 201, {
        ok: true,
        data: {
          id: record.id,
          centralId: record.centralId,
          submittedAt: record.submittedAt,
          status: record.status,
          emailNote: record.emailNote,
        },
      });
    }

    if (method === "GET" && parts[0] === "api" && parts[1] === "checklists" && parts[2]) {
      const id = decodeURIComponent(parts[2]);
      const rec = mem.byId[id];
      if (!rec) return json(404, { ok: false, message: "Not found" });
      return json(200, { ok: true, data: rec });
    }

    if (method === "POST" && parts[0] === "api" && parts[1] === "checklists" && parts[3] === "sync") {
      event.body = JSON.stringify(
        Object.assign(JSON.parse(event.body || "{}"), { id: decodeURIComponent(parts[2]) })
      );
      // reuse POST create
      const body = JSON.parse(event.body || "{}");
      const now = new Date().toISOString();
      const record = Object.assign({}, mem.byId[body.id] || {}, body, {
        status: "submitted",
        centralId: "NTL-" + body.id,
        submittedAt: now,
      });
      mem.byId[record.id] = record;
      return json(200, { ok: true, data: record });
    }

    if (method === "GET" && path.startsWith("/api/checklists")) {
      let list = Object.values(mem.byId);
      const q = event.queryStringParameters || {};
      if (q.fromDate) list = list.filter((r) => (r.dateISO || "") >= q.fromDate);
      if (q.toDate) list = list.filter((r) => (r.dateISO || "") <= q.toDate);
      if (q.type) list = list.filter((r) => r.role === q.type);
      if (q.manager)
        list = list.filter((r) =>
          (r.managerName || "").toLowerCase().includes(String(q.manager).toLowerCase())
        );
      return json(200, { ok: true, data: list });
    }

    if (method === "GET" && path.startsWith("/api/issues")) {
      const q = event.queryStringParameters || {};
      let items = mem.issues || [];
      if (q.status) items = items.filter((i) => i.status === q.status);
      return json(200, { ok: true, data: items });
    }

    return json(404, { ok: false, message: "Not found", path });
  } catch (e) {
    return json(500, { ok: false, message: e.message || "Server error" });
  }
};
