/**
 * Gulfport Store Walk Checklist – generic API server
 *
 * Security assumptions:
 * - Run behind HTTPS terminator / reverse proxy in production
 * - Authentication is expected at the edge (SSO, mTLS, private network)
 * - This process does not embed API keys or mail passwords in source
 * - Configure secrets only via environment variables
 */
const path = require("path");
const express = require("express");
const cors = require("cors");

const Storage = require("./lib/storage");
const EmailService = require("./lib/email");
const { createRoutes } = require("./lib/routes");

// Optional: load .env if present (no dependency required)
try {
  const envPath = path.join(__dirname, ".env");
  const fs = require("fs");
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, "utf8")
      .split("\n")
      .forEach((line) => {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (m && !process.env[m[1]]) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
        }
      });
  }
} catch (_) {}

const PORT = Number(process.env.PORT || 3080);
const DATA_DIR = path.resolve(__dirname, process.env.DATA_DIR || "./data");
const DEFAULT_NOTIFY_EMAIL =
  process.env.DEFAULT_NOTIFY_EMAIL ||
  "deca.lee.store-ops-grp.list.websitez09gulfport@mail.mil";
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const storage = new Storage(DATA_DIR);
const email = new EmailService({
  transport: process.env.EMAIL_TRANSPORT || "log",
  defaultTo: DEFAULT_NOTIFY_EMAIL,
  dataDir: DATA_DIR,
});

const routes = createRoutes({
  storage,
  email,
  defaultNotifyEmail: DEFAULT_NOTIFY_EMAIL,
  checklistConfigPath: path.join(__dirname, "..", "checklist.json"),
});

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));

app.use(
  cors({
    origin: function (origin, cb) {
      // Allow non-browser tools (no Origin header) and configured origins
      if (!origin) return cb(null, true);
      if (!CORS_ORIGINS.length || CORS_ORIGINS.indexOf(origin) !== -1) {
        return cb(null, true);
      }
      return cb(new Error("CORS blocked for origin: " + origin));
    },
    credentials: true,
  })
);

// API routes
app.get("/api/health", routes.health);
app.post("/api/checklists", routes.postChecklist);
app.get("/api/checklists/:recordId", routes.getChecklist);
app.get("/api/checklists", routes.listChecklists);
app.post("/api/checklists/:recordId/sync", routes.syncChecklist);
app.get("/api/checklist-config", routes.getChecklistConfig);
app.get("/api/issues", routes.getIssues);

// Basic not-found
app.use(function (req, res) {
  res.status(404).json({ ok: false, message: "Not found" });
});

app.use(function (err, req, res, next) {
  console.error(err);
  res.status(500).json({ ok: false, message: err.message || "Server error" });
});

app.listen(PORT, function () {
  console.log("Gulfport Store Walk API listening on port " + PORT);
  console.log("Data dir: " + DATA_DIR);
  console.log("Email transport: " + (process.env.EMAIL_TRANSPORT || "log"));
  console.log("CORS origins: " + (CORS_ORIGINS.join(", ") || "(any)"));
});
