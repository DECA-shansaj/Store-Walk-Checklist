/**
 * Gulfport Store Walk Checklist – App orchestrator
 * Phase 2: generic backend API + offline queue + JS-driven UI
 */
(function () {
  "use strict";

  const Config = window.GPConfig;
  const Storage = window.GPStorage;
  const API = window.GPApi;
  const Report = window.GPReport;
  const UI = window.GPUI;

  let checklistConfig = null;
  let currentRecord = null;
  let queueTimer = null;

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  function pad(n, len) {
    return String(n).padStart(len || 2, "0");
  }
  function formatDateYYYYMMDD(d) {
    d = d || new Date();
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
  }
  function formatDisplayDate(d) {
    d = d || new Date();
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  function formatTime(d) {
    d = d || new Date();
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
  function generateRecordId(date) {
    date = date || new Date();
    const rand = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return "GP-" + formatDateYYYYMMDD(date) + "-" + rand;
  }

  function allRequiredComplete() {
    if (!currentRecord || !checklistConfig) return false;
    const items = Report.getAllItems(currentRecord.role, checklistConfig);
    if (!items.length) return false;
    return items.every((it) => Report.isItemComplete((currentRecord.responses || {})[it.id]));
  }

  function updateCompleteButton() {
    const cb = document.getElementById("cert-checkbox");
    const btn = document.getElementById("btn-complete");
    if (!btn) return;
    const cert = cb && cb.checked;
    const immutable = currentRecord && currentRecord.status === "submitted";
    btn.disabled = immutable || !(allRequiredComplete() && cert);
  }

  // -------------------------------------------------------------------------
  // Record mutations
  // -------------------------------------------------------------------------
  function setResponse(itemId, patch) {
    if (!currentRecord || currentRecord.status === "submitted") return;
    if (!currentRecord.responses) currentRecord.responses = {};
    const prev = currentRecord.responses[itemId] || {};
    currentRecord.responses[itemId] = Object.assign({}, prev, patch);
    Storage.saveDraft(currentRecord);
    UI.updateProgress(currentRecord, checklistConfig);
    updateCompleteButton();
  }

  function onSelection(itemId, selection, wrap) {
    if (!currentRecord || currentRecord.status === "submitted") return;
    const patch = { selection: selection };
    if (selection === "pass") {
      patch.remarks = "";
      patch.actionTaken = "";
      patch.issueStatus = null;
      patch.naReason = "";
    } else if (selection === "issue") {
      patch.naReason = "";
      if (!(currentRecord.responses[itemId] || {}).issueStatus) patch.issueStatus = "open";
    } else if (selection === "na") {
      patch.remarks = "";
      patch.actionTaken = "";
      patch.issueStatus = null;
    }
    setResponse(itemId, patch);
    UI.applySelectionStyles(wrap, selection);
    if (selection === "issue") {
      const statusGroup = wrap.querySelector(".issue-status-group");
      if (statusGroup) {
        const current = (currentRecord.responses[itemId] || {}).issueStatus || "open";
        Array.from(statusGroup.querySelectorAll(".issue-status-btn")).forEach((b) =>
          b.classList.toggle("selected", b.getAttribute("data-status") === current)
        );
      }
    }
  }

  function onField(itemId, patch) {
    setResponse(itemId, patch);
  }

  // -------------------------------------------------------------------------
  // Start / complete / submit
  // -------------------------------------------------------------------------
  function startWalk(role) {
    const nameInput = document.getElementById("manager-name");
    const name = ((nameInput && nameInput.value) || "").trim();
    if (!name) {
      alert("Please enter the manager name before starting the checklist.");
      if (nameInput) nameInput.focus();
      return;
    }
    const now = new Date();
    currentRecord = {
      id: generateRecordId(now),
      role: role,
      managerName: name,
      dateISO: now.toISOString().slice(0, 10),
      dateDisplay: formatDisplayDate(now),
      startTime: formatTime(now),
      endTime: null,
      startedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      responses: {},
      certified: false,
      status: "draft",
      queueAttempts: 0,
    };
    Storage.saveDraft(currentRecord);
    showChecklistScreen();
  }

  function showChecklistScreen() {
    UI.renderMetaBar(currentRecord);
    const container = document.getElementById("checklist-container");
    const items = Report.getAllItems(currentRecord.role, checklistConfig);
    if (!items.length) {
      container.innerHTML =
        '<div class="warning-box"><strong>Checklist did not load</strong>' +
        "No walk items are available. Tap Back, refresh the page while online, " +
        "and ensure the app files (especially js/checklist-data.js and checklist.json) were uploaded.</div>";
    } else {
      UI.renderChecklist(container, currentRecord, checklistConfig, {
        onSelection: onSelection,
        onField: onField,
      });
    }
    UI.updateProgress(currentRecord, checklistConfig);
    const cb = document.getElementById("cert-checkbox");
    if (cb) {
      cb.checked = !!currentRecord.certified;
      cb.disabled = currentRecord.status === "submitted";
    }
    updateCompleteButton();
    UI.showScreen("checklist");
  }

  async function completeWalk() {
    if (!currentRecord) return;
    if (currentRecord.status === "submitted") {
      showReportScreen();
      return;
    }
    if (!allRequiredComplete()) {
      alert("Please complete every required checklist item before certifying.");
      return;
    }
    const cb = document.getElementById("cert-checkbox");
    if (!cb || !cb.checked) {
      alert("You must check the certification box before completing.");
      return;
    }

    const now = new Date();
    currentRecord.endTime = formatTime(now);
    currentRecord.completedAt = now.toISOString();
    currentRecord.certified = true;
    const prog = Report.calcProgress(currentRecord, checklistConfig);
    currentRecord.completionPercent = prog.pct;
    currentRecord.openIssuesAtCompletion = Report.countOpenIssues(currentRecord);
    currentRecord.reportText = Report.generateReportText(currentRecord, checklistConfig);

    Storage.saveDraft(currentRecord);
    await submitRecord(currentRecord);
    showReportScreen();
  }

  /**
   * Submit or queue. Local record is NEVER deleted until central success.
   */
  async function submitRecord(record) {
    if (!record || record.status === "submitted") return record;

    if (!navigator.onLine) {
      record.status = "offline_pending";
      record.queuedAt = new Date().toISOString();
      Storage.enqueue(record);
      Storage.saveDraft(record);
      Storage.pushHistory(record);
      refreshQueueBanner();
      return record;
    }

    try {
      const res = await API.createChecklist(record);
      if (res.ok) {
        record.status = "submitted";
        record.submittedAt = (res.data && res.data.submittedAt) || new Date().toISOString();
        record.centralId = (res.data && res.data.centralId) || null;
        record.emailNote = (res.data && res.data.emailNote) || null;
        // Remove from queue only after confirmed success
        Storage.removeFromQueue(record.id);
        Storage.saveDraft(record);
        Storage.pushHistory(record);
        refreshQueueBanner();
        return record;
      }
      // Failed but keep local
      record.status = "submission_failed";
      record.lastError = res.error || "Submission failed";
      record.queueAttempts = (record.queueAttempts || 0) + 1;
      Storage.enqueue(record);
      Storage.saveDraft(record);
      Storage.pushHistory(record);
      refreshQueueBanner();
      return record;
    } catch (e) {
      record.status = "submission_failed";
      record.lastError = e.message || "Unexpected error";
      Storage.enqueue(record);
      Storage.saveDraft(record);
      Storage.pushHistory(record);
      refreshQueueBanner();
      return record;
    }
  }

  async function processQueue() {
    if (!navigator.onLine) return;
    const q = Storage.getQueue();
    if (!q.length) {
      refreshQueueBanner();
      return;
    }
    for (const entry of q.slice()) {
      if (entry.status === "submitted") {
        Storage.removeFromQueue(entry.id);
        continue;
      }
      if ((entry.queueAttempts || 0) >= Config.QUEUE_MAX_ATTEMPTS) continue;

      const res = await API.createChecklist(entry);
      if (res.ok) {
        entry.status = "submitted";
        entry.submittedAt = (res.data && res.data.submittedAt) || new Date().toISOString();
        entry.centralId = (res.data && res.data.centralId) || null;
        entry.emailNote = (res.data && res.data.emailNote) || null;
        Storage.removeFromQueue(entry.id);
        Storage.pushHistory(entry);
        if (currentRecord && currentRecord.id === entry.id) {
          currentRecord = entry;
          Storage.saveDraft(currentRecord);
        }
      } else {
        entry.status = "submission_failed";
        entry.queueAttempts = (entry.queueAttempts || 0) + 1;
        entry.lastError = res.error || "Retry failed";
        Storage.updateQueueEntry(entry.id, entry);
        Storage.pushHistory(entry);
      }
    }
    refreshQueueBanner();
  }

  function refreshQueueBanner() {
    const q = Storage.getQueue();
    const pending = q.filter((r) => r.status === "offline_pending").length;
    const failed = q.filter((r) => r.status === "submission_failed").length;
    UI.setQueueBanner(pending, failed);
  }

  function showReportScreen() {
    if (!currentRecord) return;
    const text =
      currentRecord.reportText ||
      Report.generateReportText(currentRecord, checklistConfig);
    UI.renderReportScreen(document.getElementById("screen-report"), currentRecord, text, {
      onCopy: copyReport,
      onPrint: () => window.print(),
      onRetry: async () => {
        await submitRecord(currentRecord);
        showReportScreen();
      },
      onNew: newWalk,
    });
    UI.showScreen("report");
  }

  function copyReport() {
    const node = document.getElementById("report-text");
    const text = (node && node.textContent) || "";
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => alert("Report copied to clipboard."),
        () => fallbackCopy(text)
      );
    } else fallbackCopy(text);
  }

  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      alert("Report copied to clipboard.");
    } catch {
      alert("Unable to copy automatically. Select and copy the report text.");
    }
    document.body.removeChild(ta);
  }

  function newWalk() {
    // Keep submitted/queued records in history & queue; only clear active draft
    if (currentRecord && currentRecord.status === "draft") {
      Storage.clearDraft();
    } else if (currentRecord && currentRecord.status === "submitted") {
      Storage.clearDraft();
    }
    currentRecord = null;
    const startRoot = document.getElementById("screen-start");
    UI.renderStartScreen(startRoot, { onStart: startWalk });
    UI.showScreen("start");
  }

  function resumeDraftIfAny() {
    const draft = Storage.getDraft();
    if (!draft) return false;
    const itemCount = Report.getAllItems(draft.role, checklistConfig).length;
    if (!itemCount && draft.status === "draft") {
      // Avoid trapping user on empty checklist from a prior broken session
      console.warn("Skipping resume: checklist has 0 items");
      return false;
    }
    if (
      confirm(
        "Resume previous walk?\n\nID: " +
          draft.id +
          "\nManager: " +
          draft.managerName +
          "\nRole: " +
          draft.role +
          "\nStatus: " +
          (draft.status || "draft")
      )
    ) {
      currentRecord = draft;
      if (draft.status === "submitted" || draft.status === "offline_pending" || draft.status === "submission_failed") {
        showReportScreen();
      } else {
        showChecklistScreen();
      }
      return true;
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // Init
  // -------------------------------------------------------------------------
  async function loadConfig() {
    // 1) Try API config
    try {
      const apiRes = await API.getChecklistConfig();
      if (apiRes.ok && apiRes.data && apiRes.data.sections && apiRes.data.sections.length) {
        checklistConfig = apiRes.data;
        return;
      }
    } catch (_) {}

    // 2) Try static JSON file
    try {
      const res = await fetch("checklist.json", { cache: "no-cache" });
      if (res.ok) {
        const data = await res.json();
        if (data && data.sections && data.sections.length) {
          checklistConfig = data;
          return;
        }
      }
    } catch (e) {
      console.warn("checklist.json fetch failed", e);
    }

    // 3) Embedded fallback (always available)
    if (window.GP_CHECKLIST_FALLBACK && window.GP_CHECKLIST_FALLBACK.sections) {
      console.warn("Using embedded checklist fallback");
      checklistConfig = window.GP_CHECKLIST_FALLBACK;
      return;
    }

    checklistConfig = { sections: [], closingOnlyItems: [] };
    alert(
      "Could not load checklist items. Please refresh the page while online, or re-upload the app files (include the js/ and data/ folders)."
    );
  }

  function bindStaticHandlers() {
    const cert = document.getElementById("cert-checkbox");
    if (cert) {
      cert.addEventListener("change", () => {
        if (!currentRecord || currentRecord.status === "submitted") return;
        currentRecord.certified = cert.checked;
        Storage.saveDraft(currentRecord);
        updateCompleteButton();
      });
    }
    const completeBtn = document.getElementById("btn-complete");
    if (completeBtn) completeBtn.addEventListener("click", completeWalk);

    const backBtn = document.getElementById("btn-back-start");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        if (
          currentRecord &&
          currentRecord.status === "draft" &&
          !confirm("Return to start? Your draft is saved locally and can be resumed.")
        ) {
          return;
        }
        const startRoot = document.getElementById("screen-start");
        UI.renderStartScreen(startRoot, { onStart: startWalk });
        UI.showScreen("start");
      });
    }

    window.addEventListener("online", () => {
      UI.setOfflineBanner(false);
      processQueue();
    });
    window.addEventListener("offline", () => {
      UI.setOfflineBanner(true);
    });
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("./service-worker.js")
        .then(() => console.log("SW registered"))
        .catch((err) => console.warn("SW registration failed", err));
    }
  }

  function startQueueTimer() {
    if (queueTimer) clearInterval(queueTimer);
    queueTimer = setInterval(() => {
      if (navigator.onLine) processQueue();
    }, Config.QUEUE_RETRY_MS);
  }

  async function init() {
    UI.setOfflineBanner(!navigator.onLine);
    await loadConfig();
    bindStaticHandlers();
    registerServiceWorker();
    refreshQueueBanner();
    startQueueTimer();
    if (navigator.onLine) processQueue();

    const startRoot = document.getElementById("screen-start");
    UI.renderStartScreen(startRoot, { onStart: startWalk });

    const sectionCount = (checklistConfig && checklistConfig.sections && checklistConfig.sections.length) || 0;
    console.log("[GP Store Walk] sections loaded:", sectionCount, "mock:", API.isMock());

    if (!sectionCount) {
      alert("Checklist failed to load. On GitHub, confirm js/checklist-data.js and checklist.json exist at the repo root paths.");
    }

    const resumed = resumeDraftIfAny();
    if (!resumed) UI.showScreen("start");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
