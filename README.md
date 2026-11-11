# Gulfport Store Walk Checklist

Mobile-first PWA for Opening and Closing Managers, with offline queue and optional central API.

**Live client example:** https://deca-shansaj.github.io/Store-Walk-Checklist/

---

## Phases included

| Phase | What shipped |
|-------|----------------|
| **A – Backend** | `backend/` Node API: persist walks, PDF, email adapter, all documented endpoints |
| **B – Admin UI** | In-app **Admin / Reporting** (filters + open issues) |
| **C – Production** | `config.js` switch `MOCK_API` / `API_BASE_URL`; health endpoint; CORS via env; no secrets in client |
| **D – UX** | **Local History**, status badges, empty states, clearer start screen |

---

## Client (flat layout for easy GitHub upload)

All client files sit at the **repo root** (no `css/` / `js/` folders required):

```
index.html
styles.css
config.js
checklist-data.js
storage.js
api.js
report.js
ui.js
app.js
checklist.json
manifest.json
service-worker.js
backend/          ← optional API server
```

### Config (`config.js`)

```js
MOCK_API: true,           // set false for real API
API_BASE_URL: "",         // e.g. "http://localhost:3080"
REPORT_NOTIFY_EMAIL: "deca.lee.store-ops-grp.list.websitez09gulfport@mail.mil"
```

---

## Backend (Phase A)

```bash
cd backend
npm install
npm start
```

- Default: http://localhost:3080  
- Health: `GET /api/health`  
- Email default mode: **log** (safe). SMTP via environment only — see `backend/.env.example`  
- PDF generated with pdfkit and attached when SMTP is configured  

Point the client at it:

```js
MOCK_API: false,
API_BASE_URL: "http://localhost:3080",
```

---

## Security assumptions

- Client has **no** API keys, tokens, or SMTP passwords  
- Production API sits behind HTTPS and org auth (SSO / mTLS / private network)  
- Backend validates all input  
- Records are treated as immutable after central accept  

---

## GitHub Pages

- Branch: `main` (or `master`)  
- Folder: **`/ (root)`**  
- Upload **all root client files** listed above  

---

## Privacy

Do not enter personal information beyond the required manager name.  
Do not enter CUI, customer information, cash amounts, sensitive incident details, employee disciplinary information, or unnecessary personal information.
