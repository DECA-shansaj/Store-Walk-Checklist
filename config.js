/**
 * Application configuration
 * ---------------------------------------------------------
 * - No secrets, API keys, tokens, or credentials are stored here.
 * - Point API_BASE_URL at your deployed backend when ready.
 * - MOCK_API = true runs a local in-browser mock for UI testing.
 * - REPORT_NOTIFY_EMAIL is the address the *backend* is expected
 *   to use when emailing completed reports (PDF). The client
 *   never sends mail itself and never authenticates to a mail service.
 */
(function (global) {
  "use strict";

  const Config = {
    // Set to false and provide a real backend origin for production
    MOCK_API: true,

    // Example: "https://api.example.mil/store-walk"
    // Leave empty string when using relative paths on same origin
    API_BASE_URL: "",

    // Endpoints (relative to API_BASE_URL)
    ENDPOINTS: {
      CHECKLISTS: "/api/checklists",
      CHECKLIST_BY_ID: "/api/checklists/{recordId}",
      CHECKLIST_SYNC: "/api/checklists/{recordId}/sync",
      CHECKLIST_CONFIG: "/api/checklist-config",
      ISSUES: "/api/issues",
    },

    /**
     * Backend is responsible for generating a PDF of the report
     * and sending it to this distribution list when a record is
     * successfully submitted. Client only includes the address
     * in the payload as a hint / required notification target.
     * Do not put credentials or SMTP settings in the client.
     */
    REPORT_NOTIFY_EMAIL:
      "deca.lee.store-ops-grp.list.websitez09gulfport@mail.mil",

    // Local storage keys
    STORAGE: {
      DRAFT: "gp_sw_draft",
      QUEUE: "gp_sw_queue",
      HISTORY: "gp_sw_history",
      MOCK_DB: "gp_sw_mock_db",
    },

    // Queue retry
    QUEUE_RETRY_MS: 15000,
    QUEUE_MAX_ATTEMPTS: 8,

    APP_NAME: "Gulfport Store Walk Checklist",
    APP_VERSION: "2.0.0",
  };

  global.GPConfig = Config;
})(typeof window !== "undefined" ? window : globalThis);
