# Gulfport Store Walk Checklist (v2)

Mobile-first Progressive Web App for Opening and Closing Managers.

**Stack:** Plain HTML, CSS, vanilla JavaScript  
**No hard-coded secrets, API keys, passwords, or cloud-provider lock-in**

---

## Features

- Opening and Closing Manager walks (closing adds end-of-day items)
- Pass / Issue Found / N/A with required remarks, actions, and issue status
- Local draft auto-save after every change
- Offline support via Service Worker
- **Central submission** through a generic backend API
- Offline submission **queue** with automatic retry
- Clear record statuses: **Draft**, **Offline Pending**, **Submission Failed**, **Submitted**
- Local record retained until central submission is confirmed
- Submitted records are **immutable** in the client
- Mock API mode for UI testing without a backend
- Administrator-oriented reporting payload (for central analytics / email)

---

## Privacy warning (shown in app)

> Do not enter personal information beyond the required manager name.  
> Do not enter CUI, customer information, cash amounts, sensitive incident details, employee disciplinary information, or unnecessary personal information.

---

## Project structure

```
gulfport-store-walk/
├── index.html
├── manifest.json
├── service-worker.js
├── css/styles.css
├── js/
│   ├── config.js      ← API base URL, mock flag, notify email target
│   ├── storage.js     ← drafts, queue, history, mock DB
│   ├── api.js         ← service interface + mock + real fetch
│   ├── report.js      ← plain-text report builder
│   ├── ui.js          ← code-driven screen rendering
│   └── app.js         ← orchestration
├── data/checklist.json
├── .gitignore
└── README.md
```

---

## Configuration (`js/config.js`)

| Setting | Purpose |
|--------|---------|
| `MOCK_API` | `true` = local mock backend (default for testing). `false` = real HTTP API |
| `API_BASE_URL` | Origin of your backend (e.g. `https://api.example.mil/store-walk`). Empty = same origin |
| `ENDPOINTS.*` | Path templates for the service interface |
| `REPORT_NOTIFY_EMAIL` | Address the **backend** should email PDF reports to |

**No API keys, tokens, SMTP passwords, or credentials belong in this file or anywhere in the client.**

Default notification target (backend responsibility):

`deca.lee.store-ops-grp.list.websitez09gulfport@mail.mil`

The client includes this address in the submission payload as `notifyEmail` and sets `requestPdfEmail: true`. The backend must generate the PDF and send the message. The browser never talks to a mail server.

---

## API service interface

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/checklists` | Create / submit completed checklist |
| `GET` | `/api/checklists/{recordId}` | Fetch one record |
| `GET` | `/api/checklists?fromDate=&toDate=&type=&manager=&issueStatus=` | Admin list / filter |
| `POST` | `/api/checklists/{recordId}/sync` | Re-sync / idempotent upsert |
| `GET` | `/api/checklist-config` | Server-provided checklist definition (optional) |
| `GET` | `/api/issues?status=open` | Open issues feed for administrators |

### Submission payload (administrator-ready)

```json
{
  "id": "GP-YYYYMMDD-XXXX",
  "role": "opening|closing",
  "type": "opening|closing",
  "managerName": "string",
  "dateISO": "YYYY-MM-DD",
  "startTime": "string",
  "endTime": "string",
  "completedAt": "ISO-8601",
  "certified": true,
  "responses": { "...": {} },
  "openIssuesAtCompletion": 0,
  "reportText": "plain text report",
  "appVersion": "2.0.0",
  "notifyEmail": "deca.lee.store-ops-grp.list.websitez09gulfport@mail.mil",
  "requestPdfEmail": true,
  "reporting": {
    "store": "Gulfport",
    "walkType": "opening|closing",
    "completionPercent": 100,
    "openIssueCount": 0,
    "issueSummary": []
  }
}
```

Backend should:

1. Persist the record immutably (or version it).
2. Generate a PDF from `reportText` / structured fields.
3. Email the PDF to `notifyEmail` (or the configured distribution list).
4. Return `{ centralId, submittedAt, ... }` so the client can mark **Submitted**.

---

## Offline queue behavior

1. User completes and certifies a walk.
2. If offline → status **Offline Pending**, record added to local queue. **Not deleted.**
3. When connectivity returns → automatic retry (also on an interval).
4. On HTTP success → status **Submitted**, removed from queue, UI locked.
5. On failure → status **Submission Failed**, kept in queue for retry (max attempts configurable).
6. User can tap **Retry Submit Now** on the report screen.

---

## Mock API mode

`js/config.js` → `MOCK_API: true` (default).

- No network required for submission testing.
- “Server” data stored in `localStorage` under `gp_sw_mock_db`.
- Simulates PDF email note in the response.
- Switch to `MOCK_API: false` and set `API_BASE_URL` when a real backend is available.

---

## Backend security assumptions & deployment dependencies

**Assumptions (client does not implement these):**

1. **Transport:** All production traffic is HTTPS (or equivalent protected channel).
2. **Authentication / authorization:** Handled outside the static app — e.g. reverse-proxy SSO, mutual TLS, device certificates, or network-only access on an intranet. The client uses `credentials: "same-origin"` and does not store tokens.
3. **Input validation:** Backend must validate and sanitize all fields; client validation is UX-only.
4. **Immutability:** Once accepted, central records should not be silently altered; use append-only or explicit versioning.
5. **Email:** Backend owns SMTP / enterprise mail relay credentials. Client only supplies the destination address and report content.
6. **PII / CUI:** Operators are instructed not to enter sensitive data. Backend logging and retention policies remain the hosting organization’s responsibility.
7. **CORS / CSP:** If the API is on another origin, configure CORS allow-lists and Content-Security-Policy appropriately.
8. **Idempotency:** `POST /api/checklists` and `/sync` should tolerate duplicate submissions of the same `id`.

**Deployment dependencies:**

- Static hosting for the PWA (GitHub Pages, internal web server, etc.).
- A backend implementing the endpoints above (any language/stack).
- Optional: enterprise mail relay for PDF delivery to the distribution list.
- Service Worker requires HTTPS (or localhost).

---

## GitHub upload (beginner)

1. Create a new repository on GitHub (do **not** auto-add a README).
2. Upload the contents of this folder (or the provided zip).
3. **Settings → Pages** → Deploy from branch `main` / root → Save.
4. Open the Pages URL on a phone once while online to cache the app.

---

## Local testing

Serve over HTTP (Service Worker needs a real origin):

```bash
npx serve .
# or any static file server
```

Complete a walk with `MOCK_API: true` to exercise submit, queue, and status badges.

---

## License

Provided as-is for internal store operations use.
