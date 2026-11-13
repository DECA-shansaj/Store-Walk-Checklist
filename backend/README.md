[README.md](https://github.com/user-attachments/files/34820874/README.md)
# Gulfport Store Walk API (Phase A)

Generic Node.js backend for centralized checklist records, PDF generation, and email notification.

## Quick start

```bash
cd backend
npm install
npm start
```

API base: `http://localhost:3080`

Health check: `GET http://localhost:3080/api/health`

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Liveness |
| POST | `/api/checklists` | Submit completed walk |
| GET | `/api/checklists/{id}` | Fetch one |
| GET | `/api/checklists?fromDate=&toDate=&type=&manager=&issueStatus=` | List / filter |
| POST | `/api/checklists/{id}/sync` | Idempotent re-submit |
| GET | `/api/checklist-config` | Checklist definition |
| GET | `/api/issues?status=open` | Issue feed |

## Email / PDF

On successful `POST /api/checklists`:

1. Record is stored under `backend/data/checklists.json`
2. PDF is generated with **pdfkit**
3. Notification is sent via the email adapter to  
   `deca.lee.store-ops-grp.list.websitez09gulfport@mail.mil`  
   (or `notifyEmail` from the client payload)

**Default email mode is `log`** (no real mail sent).  
To send real mail, set environment variables (see `.env.example`):

```
EMAIL_TRANSPORT=smtp
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...
```

Install optional SMTP support: `npm install nodemailer`

## Point the PWA at this API

In the client `config.js`:

```js
MOCK_API: false,
API_BASE_URL: "http://localhost:3080",
```

For GitHub Pages + hosted API, use your HTTPS API origin and set `CORS_ORIGINS` accordingly.

## Security

- No secrets in source control
- Run behind HTTPS in production
- Put SSO / mTLS / private network controls in front of this service
- Client remains static and keyless
