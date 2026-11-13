/**
 * HTTP route handlers matching the client service interface
 */
const fs = require("fs");
const path = require("path");
const { buildPdfBuffer } = require("./pdf");

function createRoutes({ storage, email, defaultNotifyEmail, checklistConfigPath }) {
  async function postChecklist(req, res) {
    try {
      const body = req.body || {};
      if (!body.id || !body.managerName || !body.role) {
        return res.status(400).json({
          ok: false,
          message: "id, managerName, and role are required",
        });
      }

      const result = storage.upsertChecklist(body);
      const record = result.record;

      let emailResult = null;
      if (body.requestPdfEmail !== false) {
        try {
          const pdfBuffer = await buildPdfBuffer(record);
          emailResult = await email.sendReportPdf({
            to: body.notifyEmail || defaultNotifyEmail,
            subject: "Gulfport Store Walk Report – " + record.id,
            text:
              "Attached is the store walk report for " +
              record.id +
              " (" +
              (record.managerName || "") +
              ").",
            pdfBuffer,
            recordId: record.id,
          });
          record.emailQueued = true;
          record.emailNote = emailResult.message || emailResult.mode;
          storage.upsertChecklist(record);
        } catch (mailErr) {
          console.error("email/pdf failed", mailErr);
          record.emailQueued = false;
          record.emailNote = "PDF/email failed: " + mailErr.message;
          storage.upsertChecklist(record);
        }
      }

      return res.status(result.created ? 201 : 200).json({
        ok: true,
        data: {
          id: record.id,
          centralId: record.centralId,
          submittedAt: record.submittedAt,
          status: record.status,
          emailNote: record.emailNote,
          emailQueued: record.emailQueued,
          duplicate: result.duplicate,
        },
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: e.message || "Server error" });
    }
  }

  function getChecklist(req, res) {
    const rec = storage.getChecklist(req.params.recordId);
    if (!rec) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, data: rec });
  }

  function listChecklists(req, res) {
    const list = storage.listChecklists(req.query || {});
    return res.json({ ok: true, data: list });
  }

  function syncChecklist(req, res) {
    req.body = Object.assign({}, req.body || {}, { id: req.params.recordId });
    return postChecklist(req, res);
  }

  function getChecklistConfig(req, res) {
    try {
      if (checklistConfigPath && fs.existsSync(checklistConfigPath)) {
        const data = JSON.parse(fs.readFileSync(checklistConfigPath, "utf8"));
        return res.json({ ok: true, data });
      }
      // Fall back to sibling client checklist.json if present
      const fallback = path.join(__dirname, "..", "..", "checklist.json");
      if (fs.existsSync(fallback)) {
        const data = JSON.parse(fs.readFileSync(fallback, "utf8"));
        return res.json({ ok: true, data });
      }
      return res.status(404).json({ ok: false, message: "checklist config not found" });
    } catch (e) {
      return res.status(500).json({ ok: false, message: e.message });
    }
  }

  function getIssues(req, res) {
    const items = storage.listIssues(req.query || {});
    return res.json({ ok: true, data: items });
  }

  function health(req, res) {
    return res.json({
      ok: true,
      service: "gulfport-store-walk-api",
      time: new Date().toISOString(),
    });
  }

  return {
    postChecklist,
    getChecklist,
    listChecklists,
    syncChecklist,
    getChecklistConfig,
    getIssues,
    health,
  };
}

module.exports = { createRoutes };
