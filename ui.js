/**
 * UI rendering – screens are built primarily in code for flexibility
 */
(function (global) {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach((k) => {
        if (k === "className") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (k === "style" && typeof attrs[k] === "object") {
          Object.assign(node.style, attrs[k]);
        } else if (k.startsWith("on") && typeof attrs[k] === "function") {
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else if (attrs[k] !== undefined && attrs[k] !== null) {
          node.setAttribute(k, attrs[k]);
        }
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach((c) => {
        if (c == null) return;
        node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
      });
    }
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function statusBadge(status) {
    const map = {
      draft: { label: "Draft", cls: "badge-draft" },
      offline_pending: { label: "Offline Pending", cls: "badge-pending" },
      submission_failed: { label: "Submission Failed", cls: "badge-failed" },
      submitted: { label: "Submitted", cls: "badge-submitted" },
    };
    const m = map[status] || { label: status || "Unknown", cls: "badge-draft" };
    return el("span", { className: "badge " + m.cls, text: m.label });
  }

  const UI = {
    el,
    clear,
    statusBadge,

    showScreen(id) {
      $$(".screen").forEach((s) => s.classList.remove("active"));
      const s = $("#screen-" + id);
      if (s) s.classList.add("active");
      window.scrollTo(0, 0);
    },

    setOfflineBanner(offline) {
      const banner = $("#offline-banner");
      if (!banner) return;
      if (offline) {
        banner.classList.add("visible");
        banner.textContent =
          "You are offline. Changes save locally. Submissions queue until connectivity returns.";
      } else {
        banner.classList.remove("visible");
      }
    },

    setQueueBanner(count, failed) {
      let bar = $("#queue-banner");
      if (!bar) {
        bar = el("div", { id: "queue-banner", className: "queue-banner" });
        const offline = $("#offline-banner");
        if (offline && offline.parentNode) {
          offline.parentNode.insertBefore(bar, offline.nextSibling);
        } else {
          document.body.insertBefore(bar, document.body.firstChild);
        }
      }
      if (count <= 0 && failed <= 0) {
        bar.classList.remove("visible");
        bar.textContent = "";
        return;
      }
      bar.classList.add("visible");
      const parts = [];
      if (count > 0) parts.push(count + " pending submission" + (count > 1 ? "s" : ""));
      if (failed > 0) parts.push(failed + " failed");
      bar.textContent = "Sync queue: " + parts.join(", ") + ". Will retry automatically when online.";
    },

    renderStartScreen(root, handlers) {
      clear(root);
      root.appendChild(el("h1", { text: "Gulfport Store Walk Checklist" }));
      root.appendChild(
        el("div", { className: "warning-box", role: "note" }, [
          el("strong", { text: "Privacy & Security Warning" }),
          el("span", { text: global.GPReport.WARNING }),
        ])
      );
      root.appendChild(
        el("div", { className: "mt-2" }, [
          el("label", { for: "manager-name", html: 'Manager Name <span class="req">*</span>' }),
          el("input", {
            type: "text",
            id: "manager-name",
            name: "manager-name",
            autocomplete: "name",
            placeholder: "Enter your name",
            maxlength: "80",
            required: "true",
            "aria-required": "true",
          }),
        ])
      );
      root.appendChild(
        el("p", {
          className: "center mb-2",
          style: { color: "var(--text-muted)", fontSize: "0.95rem" },
          text: "Select your role to begin. Date and start time are recorded automatically.",
        })
      );
      root.appendChild(
        el(
          "button",
          {
            type: "button",
            id: "btn-opening",
            className: "role-btn",
            "aria-label": "Start as Opening Manager",
            onClick: () => handlers.onStart("opening"),
          },
          [el("span", { className: "role-icon", text: "🌅" }), el("span", { text: "Opening Manager" })]
        )
      );
      root.appendChild(
        el(
          "button",
          {
            type: "button",
            id: "btn-closing",
            className: "role-btn",
            "aria-label": "Start as Closing Manager",
            onClick: () => handlers.onStart("closing"),
          },
          [el("span", { className: "role-icon", text: "🌙" }), el("span", { text: "Closing Manager" })]
        )
      );

      root.appendChild(
        el("button", {
          type: "button",
          className: "btn btn-secondary btn-block",
          text: "Local History",
          onClick: () => handlers.onHistory && handlers.onHistory(),
        })
      );
      root.appendChild(
        el("button", {
          type: "button",
          className: "btn btn-secondary btn-block",
          text: "Admin / Reporting",
          onClick: () => handlers.onAdmin && handlers.onAdmin(),
        })
      );

      // Mode indicator
      const mode = global.GPApi && global.GPApi.isMock() ? "Local device mode (offline-capable)" : "Connected to central API";
      root.appendChild(
        el("p", {
          className: "center mt-2",
          style: { color: "var(--text-muted)", fontSize: "0.8rem" },
          text: "Mode: " + mode + " · v" + ((global.GPConfig && global.GPConfig.APP_VERSION) || ""),
        })
      );
    },

    renderMetaBar(record) {
      const bar = $("#meta-bar");
      if (!bar || !record) return;
      clear(bar);
      const dl = el("dl");
      const rows = [
        ["Record ID", record.id],
        ["Role", record.role === "opening" ? "Opening Manager" : "Closing Manager"],
        ["Manager", record.managerName],
        ["Date", record.dateDisplay],
        ["Start", record.startTime],
        ["Status", null],
      ];
      rows.forEach(([k, v]) => {
        dl.appendChild(el("dt", { text: k }));
        if (k === "Status") {
          const dd = el("dd");
          dd.appendChild(statusBadge(record.status || "draft"));
          dl.appendChild(dd);
        } else {
          dl.appendChild(el("dd", { text: v }));
        }
      });
      bar.appendChild(dl);
    },

    updateProgress(record, checklistConfig) {
      const { done, total, pct } = global.GPReport.calcProgress(record, checklistConfig);
      const open = global.GPReport.countOpenIssues(record);
      const fill = $("#progress-fill");
      const label = $("#progress-label");
      const openEl = $("#open-issues-count");
      if (fill) fill.style.width = pct + "%";
      if (label) label.textContent = done + " / " + total + " (" + pct + "%)";
      if (openEl) {
        openEl.textContent = String(open);
        openEl.classList.toggle("zero", open === 0);
      }
      return { done, total, pct, open };
    },

    renderChecklist(container, record, checklistConfig, handlers) {
      clear(container);
      if (!record || !checklistConfig) return;

      const sections = (checklistConfig.sections || []).slice();
      if (record.role === "closing") {
        sections.push({
          id: "closing-eod",
          title: "End of Day (Closing)",
          items: checklistConfig.closingOnlyItems || [],
        });
      }

      const immutable = record.status === "submitted";

      sections.forEach((sec) => {
        const sectionEl = el("div", { className: "section", "data-section-id": sec.id });
        const header = el(
          "button",
          {
            type: "button",
            className: "section-header",
            "aria-expanded": "true",
            onClick: () => {
              sectionEl.classList.toggle("collapsed");
              header.setAttribute(
                "aria-expanded",
                sectionEl.classList.contains("collapsed") ? "false" : "true"
              );
            },
          },
          [
            el("span", { text: sec.title }),
            el("span", { className: "chevron", "aria-hidden": "true", text: "▾" }),
          ]
        );
        const body = el("div", { className: "section-body" });
        (sec.items || []).forEach((item) => {
          body.appendChild(UI.renderItem(item, record, handlers, immutable));
        });
        sectionEl.appendChild(header);
        sectionEl.appendChild(body);
        container.appendChild(sectionEl);
      });
    },

    renderItem(item, record, handlers, immutable) {
      const resp = (record.responses || {})[item.id] || {};
      const wrap = el("div", { className: "item", "data-item-id": item.id });

      wrap.appendChild(
        el("div", {
          className: "item-text",
          html: escapeHtml(item.text) + (item.required ? '<span class="req" title="Required">*</span>' : ""),
        })
      );

      const group = el("div", {
        className: "response-group",
        role: "group",
        "aria-label": "Response for " + item.text,
      });

      ["pass", "issue", "na"].forEach((sel) => {
        const btn = el("button", {
          type: "button",
          className:
            "response-btn" + (resp.selection === sel ? " selected-" + sel : ""),
          "data-selection": sel,
          disabled: immutable ? "true" : null,
          text: sel === "pass" ? "Pass" : sel === "issue" ? "Issue Found" : "N/A",
          onClick: () => {
            if (immutable) return;
            handlers.onSelection(item.id, sel, wrap);
          },
        });
        group.appendChild(btn);
      });
      wrap.appendChild(group);

      // Issue panel
      const issueBox = el("div", {
        className: "conditional" + (resp.selection === "issue" ? " visible" : ""),
        "data-for": "issue",
      });
      issueBox.appendChild(el("label", { text: "Issue / Remarks (required)", for: "remarks-" + item.id }));
      const remarks = el("textarea", {
        id: "remarks-" + item.id,
        placeholder: "Describe the issue…",
        disabled: immutable ? "true" : null,
      });
      remarks.value = resp.remarks || "";
      remarks.addEventListener("input", () => {
        if (immutable) return;
        handlers.onField(item.id, { remarks: remarks.value });
      });
      issueBox.appendChild(remarks);

      issueBox.appendChild(el("label", { text: "Action Taken (required)", for: "action-" + item.id }));
      const action = el("textarea", {
        id: "action-" + item.id,
        placeholder: "What action was taken or will be taken…",
        disabled: immutable ? "true" : null,
      });
      action.value = resp.actionTaken || "";
      action.addEventListener("input", () => {
        if (immutable) return;
        handlers.onField(item.id, { actionTaken: action.value });
      });
      issueBox.appendChild(action);

      issueBox.appendChild(el("label", { text: "Issue Status" }));
      const statusGroup = el("div", { className: "issue-status-group" });
      ["open", "corrected", "deferred"].forEach((st) => {
        statusGroup.appendChild(
          el("button", {
            type: "button",
            className: "issue-status-btn" + (resp.issueStatus === st ? " selected" : ""),
            "data-status": st,
            disabled: immutable ? "true" : null,
            text: st === "open" ? "Open" : st === "corrected" ? "Corrected" : "Deferred",
            onClick: () => {
              if (immutable) return;
              handlers.onField(item.id, { issueStatus: st });
              $$(".issue-status-btn", statusGroup).forEach((b) =>
                b.classList.toggle("selected", b.getAttribute("data-status") === st)
              );
            },
          })
        );
      });
      issueBox.appendChild(statusGroup);
      wrap.appendChild(issueBox);

      // NA panel
      const naBox = el("div", {
        className: "conditional" + (resp.selection === "na" ? " visible" : ""),
        "data-for": "na",
      });
      naBox.appendChild(el("label", { text: "Reason for N/A (optional)", for: "nareason-" + item.id }));
      const naReason = el("textarea", {
        id: "nareason-" + item.id,
        placeholder: "Explain why this item is not applicable…",
        disabled: immutable ? "true" : null,
      });
      naReason.value = resp.naReason || "";
      naReason.addEventListener("input", () => {
        if (immutable) return;
        handlers.onField(item.id, { naReason: naReason.value });
      });
      naBox.appendChild(naReason);
      wrap.appendChild(naBox);

      wrap.appendChild(
        el("p", {
          className: "error-text",
          style: { display: "none" },
          "data-error": "1",
        })
      );

      return wrap;
    },

    applySelectionStyles(wrap, selection) {
      $$(".response-btn", wrap).forEach((b) => {
        b.classList.remove("selected-pass", "selected-issue", "selected-na");
        if (b.getAttribute("data-selection") === selection) {
          b.classList.add("selected-" + selection);
        }
      });
      const issueBox = wrap.querySelector('[data-for="issue"]');
      const naBox = wrap.querySelector('[data-for="na"]');
      if (issueBox) issueBox.classList.toggle("visible", selection === "issue");
      if (naBox) naBox.classList.toggle("visible", selection === "na");
    },

    renderReportScreen(root, record, reportText, handlers) {
      clear(root);
      root.appendChild(el("h1", { text: "Walk Complete" }));

      const statusRow = el("div", { className: "center mb-1" });
      statusRow.appendChild(statusBadge(record.status || "draft"));
      root.appendChild(statusRow);

      if (record.status === "submitted") {
        root.appendChild(
          el("p", {
            className: "center",
            style: { color: "var(--success)" },
            text: "Record submitted centrally. Local copy is locked.",
          })
        );
        if (global.GPApi && global.GPApi.isMock()) {
          root.appendChild(
            el("p", {
              className: "center",
              style: { color: "var(--text-muted)", fontSize: "0.9rem" },
              text: "Saved on this device. Central email/PDF delivery will be enabled when IT provides an approved API host.",
            })
          );
        } else if (record.emailNote) {
          root.appendChild(
            el("p", {
              className: "center",
              style: { color: "var(--text-muted)", fontSize: "0.9rem" },
              text: String(record.emailNote),
            })
          );
        }
      } else if (record.status === "offline_pending") {
        root.appendChild(
          el("p", {
            className: "center",
            style: { color: "var(--warning)" },
            text: "Saved offline. Will submit automatically when connectivity returns.",
          })
        );
      } else if (record.status === "submission_failed") {
        root.appendChild(
          el("p", {
            className: "center",
            style: { color: "var(--danger)" },
            text: "Submission failed. Record kept locally and will retry.",
          })
        );
      }

      root.appendChild(
        el("div", {
          id: "report-text",
          className: "report-box",
          role: "textbox",
          "aria-readonly": "true",
          tabindex: "0",
          text: reportText,
        })
      );

      const row = el("div", { className: "btn-row mt-2" });
      row.appendChild(
        el("button", {
          type: "button",
          className: "btn btn-primary",
          text: "Copy Report",
          onClick: handlers.onCopy,
        })
      );
      row.appendChild(
        el("button", {
          type: "button",
          className: "btn btn-secondary",
          text: "Print / Save PDF",
          onClick: handlers.onPrint,
        })
      );
      root.appendChild(row);

      if (record.status === "submission_failed" || record.status === "offline_pending") {
        root.appendChild(
          el("button", {
            type: "button",
            className: "btn btn-secondary btn-block mt-2",
            text: "Retry Submit Now",
            onClick: handlers.onRetry,
          })
        );
      }

      root.appendChild(
        el("button", {
          type: "button",
          className: "btn btn-secondary btn-block mt-2",
          text: "Start New Walk",
          onClick: handlers.onNew,
        })
      );
    },

    renderHistoryScreen(root, records, handlers) {
      clear(root);
      root.appendChild(el("h1", { text: "Local History" }));
      root.appendChild(
        el("p", {
          className: "center mb-2",
          style: { color: "var(--text-muted)", fontSize: "0.9rem" },
          text: "Walks saved on this device (drafts, queue, and submitted).",
        })
      );
      if (!records || !records.length) {
        root.appendChild(
          el("div", {
            className: "empty-state",
            text: "No local history yet. Complete a walk to see it here.",
          })
        );
      } else {
        records.forEach((r) => {
          const card = el("div", { className: "list-card" });
          card.appendChild(el("h3", { text: r.id }));
          const meta = el("div", { className: "meta" });
          meta.appendChild(statusBadge(r.status || "draft"));
          meta.appendChild(
            document.createTextNode(
              " · " +
                (r.role || "") +
                " · " +
                (r.managerName || "") +
                " · " +
                (r.dateDisplay || r.dateISO || "")
            )
          );
          card.appendChild(meta);
          if (r.openIssuesAtCompletion) {
            card.appendChild(
              el("p", {
                className: "meta",
                text: "Open issues at completion: " + r.openIssuesAtCompletion,
              })
            );
          }
          card.appendChild(
            el("button", {
              type: "button",
              className: "btn btn-secondary btn-block mt-1",
              text: "Open",
              onClick: () => handlers.onOpen && handlers.onOpen(r),
            })
          );
          root.appendChild(card);
        });
      }
      root.appendChild(
        el("button", {
          type: "button",
          className: "btn btn-secondary btn-block mt-2",
          text: "Back",
          onClick: handlers.onBack,
        })
      );
    },

    renderAdminScreen(root, state, handlers) {
      clear(root);
      root.appendChild(el("h1", { text: "Admin / Reporting" }));
      root.appendChild(
        el("p", {
          className: "center mb-2",
          style: { color: "var(--text-muted)", fontSize: "0.9rem" },
          text: state.sourceLabel || "Records available to this app",
        })
      );

      const filters = el("div", { className: "filter-row" });
      const fromInput = el("input", {
        type: "text",
        id: "admin-from",
        placeholder: "From YYYY-MM-DD",
        value: (state.query && state.query.fromDate) || "",
      });
      const toInput = el("input", {
        type: "text",
        id: "admin-to",
        placeholder: "To YYYY-MM-DD",
        value: (state.query && state.query.toDate) || "",
      });
      const typeSel = el("select", { id: "admin-type" });
      [["", "All types"], ["opening", "Opening"], ["closing", "Closing"]].forEach(([v, t]) => {
        const o = el("option", { value: v, text: t });
        if (state.query && state.query.type === v) o.selected = true;
        typeSel.appendChild(o);
      });
      const mgrInput = el("input", {
        type: "text",
        id: "admin-manager",
        placeholder: "Manager contains…",
        value: (state.query && state.query.manager) || "",
      });
      filters.appendChild(fromInput);
      filters.appendChild(toInput);
      filters.appendChild(typeSel);
      filters.appendChild(mgrInput);
      root.appendChild(filters);

      root.appendChild(
        el("button", {
          type: "button",
          className: "btn btn-primary btn-block",
          text: "Apply Filters",
          onClick: () => {
            handlers.onFilter &&
              handlers.onFilter({
                fromDate: fromInput.value.trim(),
                toDate: toInput.value.trim(),
                type: typeSel.value,
                manager: mgrInput.value.trim(),
              });
          },
        })
      );

      root.appendChild(
        el("button", {
          type: "button",
          className: "btn btn-secondary btn-block",
          text: "Open Issues Only",
          onClick: () => handlers.onOpenIssues && handlers.onOpenIssues(),
        })
      );

      if (state.error) {
        root.appendChild(
          el("div", { className: "warning-box", text: state.error })
        );
      }

      const list = state.records || [];
      if (!list.length && !state.error) {
        root.appendChild(
          el("div", {
            className: "empty-state",
            text: "No records match. Submit a walk or adjust filters.",
          })
        );
      }
      list.forEach((r) => {
        const card = el("div", { className: "list-card" });
        card.appendChild(el("h3", { text: r.id || r.centralId || "(record)" }));
        const meta = el("div", { className: "meta" });
        meta.appendChild(statusBadge(r.status || "submitted"));
        meta.appendChild(
          document.createTextNode(
            " · " +
              (r.role || r.type || "") +
              " · " +
              (r.managerName || "") +
              " · " +
              (r.dateISO || "")
          )
        );
        card.appendChild(meta);
        const openCount =
          r.openIssuesAtCompletion != null
            ? r.openIssuesAtCompletion
            : (r.reporting && r.reporting.openIssueCount) || 0;
        card.appendChild(
          el("p", { className: "meta", text: "Open issues: " + openCount })
        );
        root.appendChild(card);
      });

      if (state.issues && state.issues.length) {
        root.appendChild(el("h2", { text: "Open Issues", className: "mt-2" }));
        state.issues.forEach((iss) => {
          const card = el("div", { className: "list-card" });
          card.appendChild(
            el("h3", { text: (iss.recordId || "") + " / " + (iss.itemId || "") })
          );
          card.appendChild(
            el("p", {
              className: "meta",
              text:
                (iss.managerName || "") +
                " · " +
                (iss.status || "") +
                " · " +
                (iss.remarks || ""),
            })
          );
          root.appendChild(card);
        });
      }

      root.appendChild(
        el("button", {
          type: "button",
          className: "btn btn-secondary btn-block mt-2",
          text: "Back",
          onClick: handlers.onBack,
        })
      );
    },


  };

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  global.GPUI = UI;
})(typeof window !== "undefined" ? window : globalThis);
