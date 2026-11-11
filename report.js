/**
 * Plain-text report generation
 */
(function (global) {
  "use strict";

  const WARNING =
    "Do not enter personal information beyond the required manager name. " +
    "Do not enter CUI, customer information, cash amounts, sensitive incident " +
    "details, employee disciplinary information, or unnecessary personal information.";

  function generateReportText(record, checklistConfig) {
    if (!record) return "";
    const lines = [];
    lines.push("GULFPORT STORE WALK CHECKLIST");
    lines.push("================================");
    lines.push("Record ID:     " + record.id);
    lines.push(
      "Role:          " + (record.role === "opening" ? "Opening Manager" : "Closing Manager")
    );
    lines.push("Manager:       " + record.managerName);
    lines.push("Date:          " + record.dateDisplay);
    lines.push("Start Time:    " + record.startTime);
    lines.push("End Time:      " + (record.endTime || "(in progress)"));
    lines.push("Status:        " + (record.status || "draft").toUpperCase());
    lines.push("Certified:     " + (record.certified ? "Yes" : "No"));
    if (record.centralId) lines.push("Central ID:    " + record.centralId);
    if (record.submittedAt) lines.push("Submitted:     " + record.submittedAt);
    lines.push("");

    const { done, total, pct } = calcProgress(record, checklistConfig);
    lines.push("Completion:    " + done + "/" + total + " (" + pct + "%)");
    lines.push("Open Issues:   " + countOpenIssues(record));
    lines.push("");

    const sections = (checklistConfig && checklistConfig.sections) || [];
    const allSections = sections.slice();
    if (record.role === "closing" && checklistConfig && checklistConfig.closingOnlyItems) {
      allSections.push({
        id: "closing-eod",
        title: "End of Day (Closing)",
        items: checklistConfig.closingOnlyItems,
      });
    }

    allSections.forEach((sec) => {
      lines.push("--- " + sec.title.toUpperCase() + " ---");
      (sec.items || []).forEach((item) => {
        const resp = (record.responses || {})[item.id];
        let status = "NOT ANSWERED";
        let detail = "";
        if (resp && resp.selection === "pass") status = "PASS";
        else if (resp && resp.selection === "na") {
          status = "N/A";
          detail = resp.naReason ? "Reason: " + resp.naReason : "";
        } else if (resp && resp.selection === "issue") {
          status = "ISSUE (" + (resp.issueStatus || "open").toUpperCase() + ")";
          const parts = [];
          if (resp.remarks) parts.push("Remarks: " + resp.remarks);
          if (resp.actionTaken) parts.push("Action: " + resp.actionTaken);
          detail = parts.join(" | ");
        }
        lines.push("[" + status + "] " + item.text);
        if (detail) lines.push("         " + detail);
      });
      lines.push("");
    });

    lines.push("--------------------------------");
    lines.push("WARNING: " + WARNING);
    lines.push("--------------------------------");
    lines.push("Notify email (backend): " + (global.GPConfig && global.GPConfig.REPORT_NOTIFY_EMAIL));
    lines.push("Generated: " + new Date().toLocaleString());
    return lines.join("\n");
  }

  function getAllItems(role, checklistConfig) {
    if (!checklistConfig) return [];
    const items = [];
    (checklistConfig.sections || []).forEach((sec) => {
      (sec.items || []).forEach((it) => {
        items.push(it);
      });
    });
    if (role === "closing") {
      (checklistConfig.closingOnlyItems || []).forEach((it) => items.push(it));
    }
    return items;
  }

  function isItemComplete(resp) {
    if (!resp || !resp.selection) return false;
    if (resp.selection === "pass") return true;
    if (resp.selection === "na") return !!(resp.naReason && String(resp.naReason).trim());
    if (resp.selection === "issue") {
      return !!(
        resp.remarks &&
        String(resp.remarks).trim() &&
        resp.actionTaken &&
        String(resp.actionTaken).trim() &&
        resp.issueStatus
      );
    }
    return false;
  }

  function calcProgress(record, checklistConfig) {
    const items = getAllItems(record.role, checklistConfig);
    const total = items.length;
    let done = 0;
    items.forEach((it) => {
      if (isItemComplete((record.responses || {})[it.id])) done += 1;
    });
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { done, total, pct };
  }

  function countOpenIssues(record) {
    let n = 0;
    Object.values(record.responses || {}).forEach((r) => {
      if (r.selection === "issue" && r.issueStatus === "open") n += 1;
    });
    return n;
  }

  global.GPReport = {
    generateReportText,
    calcProgress,
    countOpenIssues,
    isItemComplete,
    getAllItems,
    WARNING,
  };
})(typeof window !== "undefined" ? window : globalThis);
