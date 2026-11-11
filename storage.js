/**
 * Local persistence – drafts, offline queue, history
 */
(function (global) {
  "use strict";

  const K = () => global.GPConfig.STORAGE;

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn("storage write failed", key, e);
      return false;
    }
  }

  const Storage = {
    // --- Draft (in-progress or just-completed local record) ---
    getDraft() {
      return read(K().DRAFT, null);
    },
    saveDraft(record) {
      if (!record) return false;
      record.updatedAt = new Date().toISOString();
      return write(K().DRAFT, record);
    },
    clearDraft() {
      localStorage.removeItem(K().DRAFT);
    },

    // --- Offline / retry queue ---
    getQueue() {
      return read(K().QUEUE, []);
    },
    saveQueue(list) {
      return write(K().QUEUE, list || []);
    },
    enqueue(record) {
      const q = Storage.getQueue();
      const idx = q.findIndex((r) => r.id === record.id);
      const entry = {
        ...record,
        queueStatus: record.queueStatus || "offline_pending",
        queueAttempts: record.queueAttempts || 0,
        queuedAt: record.queuedAt || new Date().toISOString(),
      };
      if (idx >= 0) q[idx] = entry;
      else q.push(entry);
      Storage.saveQueue(q);
      return entry;
    },
    removeFromQueue(recordId) {
      const q = Storage.getQueue().filter((r) => r.id !== recordId);
      Storage.saveQueue(q);
    },
    updateQueueEntry(recordId, patch) {
      const q = Storage.getQueue();
      const idx = q.findIndex((r) => r.id === recordId);
      if (idx < 0) return null;
      q[idx] = { ...q[idx], ...patch };
      Storage.saveQueue(q);
      return q[idx];
    },

    // --- Local history of successfully submitted (or failed) records ---
    getHistory() {
      return read(K().HISTORY, []);
    },
    pushHistory(record) {
      const list = Storage.getHistory();
      const idx = list.findIndex((r) => r.id === record.id);
      if (idx >= 0) list[idx] = record;
      else list.unshift(record);
      if (list.length > 50) list.length = 50;
      write(K().HISTORY, list);
    },

    // --- Mock backend DB (only used when MOCK_API = true) ---
    getMockDb() {
      return read(K().MOCK_DB, { checklists: {}, issues: [] });
    },
    saveMockDb(db) {
      return write(K().MOCK_DB, db);
    },
  };

  global.GPStorage = Storage;
})(typeof window !== "undefined" ? window : globalThis);
