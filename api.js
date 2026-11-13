/**
 * Generic backend API service interface
 * ---------------------------------------------------------
 * Real mode: fetch() against GPConfig.API_BASE_URL + endpoints
 * Mock mode: in-memory / localStorage "server" for UI testing
 *
 * The client NEVER holds API keys, auth tokens, or SMTP credentials.
 * Authentication (if required) is expected to be handled by the
 * hosting environment (e.g. mutual TLS, reverse-proxy SSO, device cert).
 */
(function (global) {
  "use strict";

  const C = () => global.GPConfig;
  const S = () => global.GPStorage;

  function url(path, params) {
    let p = path;
    if (params) {
      Object.keys(params).forEach((k) => {
        p = p.replace("{" + k + "}", encodeURIComponent(params[k]));
      });
    }
    const base = (C().API_BASE_URL || "").replace(/\/$/, "");
    return base + p;
  }

  function qs(query) {
    if (!query) return "";
    const parts = [];
    Object.keys(query).forEach((k) => {
      if (query[k] !== undefined && query[k] !== null && query[k] !== "") {
        parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(query[k]));
      }
    });
    return parts.length ? "?" + parts.join("&") : "";
  }

  // -------------------------------------------------------------------------
  // Mock implementation
  // -------------------------------------------------------------------------
  const Mock = {
    async postChecklist(payload) {
      await delay(300 + Math.random() * 300);
      const db = S().getMockDb();
      const id = payload && payload.id;
      if (!id) {
        return { ok: false, status: 400, error: "record id required (idempotency key)" };
      }
      const existing = db.checklists[id];
      // Idempotency: same recordId already accepted → return stored record, no duplicate
      if (existing && existing.status === "submitted") {
        return {
          ok: true,
          status: 200,
          data: existing,
          message: "Already submitted (idempotent)",
          duplicate: true,
        };
      }
      const record = Object.assign({}, payload, {
        status: "submitted",
        submittedAt: new Date().toISOString(),
        centralId: "MOCK-" + id,
        emailQueued: false,
        emailNote: "Mock mode: local central store only (no external email).",
      });
      db.checklists[id] = record;
      const issues = extractIssues(record);
      db.issues = (db.issues || []).filter((i) => i.recordId !== id).concat(issues);
      S().saveMockDb(db);
      return { ok: true, status: 201, data: record, duplicate: false };
    },

    async getChecklist(recordId) {
      await delay(200);
      const db = S().getMockDb();
      const rec = db.checklists[recordId];
      if (!rec) return { ok: false, status: 404, error: "Not found" };
      return { ok: true, status: 200, data: rec };
    },

    async listChecklists(query) {
      await delay(250);
      const db = S().getMockDb();
      let list = Object.values(db.checklists || {});
      if (query.fromDate) list = list.filter((r) => (r.dateISO || "") >= query.fromDate);
      if (query.toDate) list = list.filter((r) => (r.dateISO || "") <= query.toDate);
      if (query.type) list = list.filter((r) => r.role === query.type);
      if (query.manager)
        list = list.filter((r) =>
          (r.managerName || "").toLowerCase().includes(String(query.manager).toLowerCase())
        );
      if (query.issueStatus) {
        list = list.filter((r) =>
          Object.values(r.responses || {}).some(
            (x) => x.selection === "issue" && x.issueStatus === query.issueStatus
          )
        );
      }
      list.sort((a, b) => (b.submittedAt || b.completedAt || "").localeCompare(a.submittedAt || a.completedAt || ""));
      return { ok: true, status: 200, data: list };
    },

    async syncChecklist(recordId, payload) {
      return Mock.postChecklist({ ...payload, id: recordId });
    },

    async getChecklistConfig() {
      await delay(150);
      // Prefer bundled static config; mock just returns a flag
      try {
        const res = await fetch("checklist.json");
        if (res.ok) {
          const data = await res.json();
          return { ok: true, status: 200, data };
        }
      } catch (_) {}
      return { ok: false, status: 500, error: "Config unavailable" };
    },

    async getIssues(query) {
      await delay(200);
      const db = S().getMockDb();
      let issues = db.issues || [];
      if (query && query.status) {
        issues = issues.filter((i) => i.status === query.status);
      }
      return { ok: true, status: 200, data: issues };
    },
  };

  function extractIssues(record) {
    const out = [];
    const responses = record.responses || {};
    Object.keys(responses).forEach((itemId) => {
      const r = responses[itemId];
      if (r.selection === "issue") {
        out.push({
          recordId: record.id,
          itemId,
          managerName: record.managerName,
          role: record.role,
          dateISO: record.dateISO,
          remarks: r.remarks || "",
          actionTaken: r.actionTaken || "",
          status: r.issueStatus || "open",
          submittedAt: record.submittedAt || record.completedAt,
        });
      }
    });
    return out;
  }

  function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // -------------------------------------------------------------------------
  // Real fetch implementation
  // -------------------------------------------------------------------------
  async function realFetch(method, path, body, query) {
    const full = url(path) + qs(query);
    const opts = {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      credentials: "same-origin", // adjust if backend uses cookies / SSO
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    try {
      const res = await fetch(full, opts);
      let data = null;
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }
      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          error: (data && data.message) || res.statusText || "Request failed",
          data,
        };
      }
      return { ok: true, status: res.status, data };
    } catch (e) {
      return { ok: false, status: 0, error: e.message || "Network error", offline: true };
    }
  }

  // -------------------------------------------------------------------------
  // Public service interface
  // -------------------------------------------------------------------------
  const API = {
    isMock() {
      return !!C().MOCK_API;
    },

    /** POST /api/checklists */
    async createChecklist(record) {
      const payload = buildSubmissionPayload(record);
      if (C().MOCK_API) return Mock.postChecklist(payload);
      return realFetch("POST", C().ENDPOINTS.CHECKLISTS, payload);
    },

    /** GET /api/checklists/{recordId} */
    async getChecklist(recordId) {
      if (C().MOCK_API) return Mock.getChecklist(recordId);
      const path = C().ENDPOINTS.CHECKLIST_BY_ID.replace(
        "{recordId}",
        encodeURIComponent(recordId)
      );
      return realFetch("GET", path);
    },

    /** GET /api/checklists?fromDate=&toDate=&type=&manager=&issueStatus= */
    async listChecklists(query) {
      if (C().MOCK_API) return Mock.listChecklists(query || {});
      return realFetch("GET", C().ENDPOINTS.CHECKLISTS, undefined, query);
    },

    /** POST /api/checklists/{recordId}/sync */
    async syncChecklist(recordId, record) {
      const payload = buildSubmissionPayload(record);
      if (C().MOCK_API) return Mock.syncChecklist(recordId, payload);
      const path = C().ENDPOINTS.CHECKLIST_SYNC.replace("{recordId}", encodeURIComponent(recordId));
      return realFetch("POST", path, payload);
    },

    /** GET /api/checklist-config */
    async getChecklistConfig() {
      if (C().MOCK_API) return Mock.getChecklistConfig();
      return realFetch("GET", C().ENDPOINTS.CHECKLIST_CONFIG);
    },

    /** GET /api/issues?status=open */
    async getIssues(query) {
      if (C().MOCK_API) return Mock.getIssues(query || {});
      return realFetch("GET", C().ENDPOINTS.ISSUES, undefined, query);
    },
  };

  /**
   * Administrator-ready reporting payload.
   * Backend uses this to persist, generate PDF, and email.
   */
  function buildSubmissionPayload(record) {
    return {
      id: record.id,
      role: record.role,
      type: record.role, // alias for query param "type"
      managerName: record.managerName,
      dateISO: record.dateISO,
      dateDisplay: record.dateDisplay,
      startTime: record.startTime,
      endTime: record.endTime,
      startedAt: record.startedAt,
      completedAt: record.completedAt,
      certified: !!record.certified,
      responses: record.responses || {},
      openIssuesAtCompletion: record.openIssuesAtCompletion || 0,
      reportText: record.reportText || "",
      appVersion: C().APP_VERSION,
      clientSubmittedAt: new Date().toISOString(),
      // Only include notify hint when explicitly configured (never a secret)
      notifyEmail: C().REPORT_NOTIFY_EMAIL || undefined,
      requestPdfEmail: !!(C().REPORT_NOTIFY_EMAIL),
      // Reporting dimensions for admin analytics
      reporting: {
        store: "Gulfport",
        walkType: record.role,
        completionPercent: record.completionPercent,
        openIssueCount: record.openIssuesAtCompletion || 0,
        issueSummary: summarizeIssues(record),
      },
    };
  }

  function summarizeIssues(record) {
    const list = [];
    const responses = record.responses || {};
    Object.keys(responses).forEach((id) => {
      const r = responses[id];
      if (r.selection === "issue") {
        list.push({
          itemId: id,
          status: r.issueStatus || "open",
          remarks: r.remarks || "",
          actionTaken: r.actionTaken || "",
        });
      }
    });
    return list;
  }

  global.GPApi = API;
})(typeof window !== "undefined" ? window : globalThis);
