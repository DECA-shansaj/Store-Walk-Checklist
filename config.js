/**
 * Application configuration
 * ---------------------------------------------------------
 * Leave MOCK_API true until IT provides an approved API host. Then set MOCK_API false and API_BASE_URL.
 * No secrets, API keys, tokens, or SMTP passwords belong here.
 */
(function (global) {
  "use strict";

  const Config = {
    // true = in-browser mock (no server needed)
    // false = call real backend at API_BASE_URL
    MOCK_API: true,

    // Example local: "http://localhost:3080"
    // Example hosted: "https://api.example.mil/store-walk"
    API_BASE_URL: "", // e.g. "https://approved-api.example.mil"

    ENDPOINTS: {
      CHECKLISTS: "/api/checklists",
      CHECKLIST_BY_ID: "/api/checklists/{recordId}",
      CHECKLIST_SYNC: "/api/checklists/{recordId}/sync",
      CHECKLIST_CONFIG: "/api/checklist-config",
      ISSUES: "/api/issues",
      HEALTH: "/api/health",
    },

    REPORT_NOTIFY_EMAIL:
      "deca.lee.store-ops-grp.list.websitez09gulfport@mail.mil",

    STORAGE: {
      DRAFT: "gp_sw_draft",
      QUEUE: "gp_sw_queue",
      HISTORY: "gp_sw_history",
      MOCK_DB: "gp_sw_mock_db",
    },

    QUEUE_RETRY_MS: 15000,
    QUEUE_MAX_ATTEMPTS: 8,

    APP_NAME: "Gulfport Store Walk Checklist",
    APP_VERSION: "2.1.0",
  };

  global.GPConfig = Config;
})(typeof window !== "undefined" ? window : globalThis);
