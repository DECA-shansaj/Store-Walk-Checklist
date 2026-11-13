/**
 * Application configuration — client only.
 * MOCK_API stays true until IT provides an approved API host.
 * No secrets, API keys, tokens, passwords, or live mail credentials.
 */
(function (global) {
  "use strict";

  const Config = {
    MOCK_API: true,

    // Set only when IT provides an approved API origin (https://...)
    API_BASE_URL: "",

    ENDPOINTS: {
      CHECKLISTS: "/api/checklists",
      CHECKLIST_BY_ID: "/api/checklists/{recordId}",
      CHECKLIST_SYNC: "/api/checklists/{recordId}/sync",
      CHECKLIST_CONFIG: "/api/checklist-config",
      ISSUES: "/api/issues",
      HEALTH: "/api/health",
    },

    /**
     * Optional future notify target for a real backend only.
     * Left empty on purpose for pre-IT / mock mode so the client
     * does not embed a distribution address as an active dependency.
     * Populate only under IT direction for production backend deploy.
     */
    REPORT_NOTIFY_EMAIL: "",

    STORAGE: {
      DRAFT: "gp_sw_draft",
      QUEUE: "gp_sw_queue",
      HISTORY: "gp_sw_history",
      MOCK_DB: "gp_sw_mock_db",
    },

    QUEUE_RETRY_MS: 15000,
    QUEUE_MAX_ATTEMPTS: 8,

    APP_NAME: "Gulfport Store Walk Checklist",
    APP_VERSION: "2.2.0",
  };

  global.GPConfig = Config;
})(typeof window !== "undefined" ? window : globalThis);
