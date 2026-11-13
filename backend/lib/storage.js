/**
 * File-based persistence (no external database required).
 * Swap this module for SQL/NoSQL later without changing routes.
 */
const fs = require("fs");
const path = require("path");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function Storage(dataDir) {
  this.dataDir = dataDir;
  this.checklistsPath = path.join(dataDir, "checklists.json");
  this.issuesPath = path.join(dataDir, "issues.json");
  ensureDir(dataDir);
  if (!fs.existsSync(this.checklistsPath)) {
    fs.writeFileSync(this.checklistsPath, JSON.stringify({ byId: {} }, null, 2));
  }
  if (!fs.existsSync(this.issuesPath)) {
    fs.writeFileSync(this.issuesPath, JSON.stringify({ items: [] }, null, 2));
  }
}

Storage.prototype._read = function (file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
};

Storage.prototype._write = function (file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

Storage.prototype.upsertChecklist = function (record) {
  const db = this._read(this.checklistsPath);
  const existing = db.byId[record.id];
  if (existing && existing.status === "submitted" && existing.immutable) {
    return { record: existing, created: false, duplicate: true };
  }
  const now = new Date().toISOString();
  const saved = Object.assign({}, existing || {}, record, {
    status: "submitted",
    immutable: true,
    centralId: (existing && existing.centralId) || "CTR-" + record.id,
    submittedAt: (existing && existing.submittedAt) || now,
    updatedAt: now,
  });
  db.byId[record.id] = saved;
  this._write(this.checklistsPath, db);
  this.rebuildIssuesForRecord(saved);
  return { record: saved, created: !existing, duplicate: false };
};

Storage.prototype.getChecklist = function (id) {
  const db = this._read(this.checklistsPath);
  return db.byId[id] || null;
};

Storage.prototype.listChecklists = function (query) {
  const db = this._read(this.checklistsPath);
  let list = Object.values(db.byId || {});
  query = query || {};
  if (query.fromDate) list = list.filter((r) => (r.dateISO || "") >= query.fromDate);
  if (query.toDate) list = list.filter((r) => (r.dateISO || "") <= query.toDate);
  if (query.type) list = list.filter((r) => r.role === query.type || r.type === query.type);
  if (query.manager) {
    const m = String(query.manager).toLowerCase();
    list = list.filter((r) => (r.managerName || "").toLowerCase().includes(m));
  }
  if (query.issueStatus) {
    list = list.filter((r) =>
      Object.values(r.responses || {}).some(
        (x) => x.selection === "issue" && x.issueStatus === query.issueStatus
      )
    );
  }
  list.sort((a, b) =>
    String(b.submittedAt || b.completedAt || "").localeCompare(
      String(a.submittedAt || a.completedAt || "")
    )
  );
  return list;
};

Storage.prototype.rebuildIssuesForRecord = function (record) {
  const db = this._read(this.issuesPath);
  db.items = (db.items || []).filter((i) => i.recordId !== record.id);
  const responses = record.responses || {};
  Object.keys(responses).forEach((itemId) => {
    const r = responses[itemId];
    if (r && r.selection === "issue") {
      db.items.push({
        id: record.id + ":" + itemId,
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
  this._write(this.issuesPath, db);
};

Storage.prototype.listIssues = function (query) {
  const db = this._read(this.issuesPath);
  let items = db.items || [];
  if (query && query.status) {
    items = items.filter((i) => i.status === query.status);
  }
  return items;
};

module.exports = Storage;
