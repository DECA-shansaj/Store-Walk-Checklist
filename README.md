# Gulfport Store Walk Checklist

Mobile-first Progressive Web App for Opening and Closing Managers.

**Live site:** https://deca-shansaj.github.io/Store-Walk-Checklist/

## Current status (ready for store use)

Works fully **on the device** without IT API approval:

- Opening / Closing manager walks
- Full checklist + closing end-of-day items
- Pass / Issue Found / N/A (N/A needs no comments)
- Remarks, action taken, issue status for issues
- Certification before complete
- Progress and open-issue counts
- Local auto-save drafts
- Offline after first load
- Offline submission queue (stored on device until a central API exists)
- Plain-text report, Copy, Print / Save as PDF
- Local History
- Admin view of records stored on this device

Central database, PDF email to distribution lists, and shared multi-phone reporting are **deferred** until IT provides an approved host and mail path.

## Files (flat layout at repo root)

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
```

Optional later (not required for daily walks):

```
backend/     Generic Node API scaffold for when IT approves hosting
```

## Privacy

Do not enter personal information beyond the required manager name.  
Do not enter CUI, customer information, cash amounts, sensitive incident details, employee disciplinary information, or unnecessary personal information.

## GitHub Pages

- Branch: main (or master)
- Folder: / (root)
- Upload root client files listed above

## After IT approval

1. Host `backend/` (or equivalent) on an approved server  
2. In `config.js` set `MOCK_API: false` and `API_BASE_URL` to that origin  
3. Configure approved mail relay on the server only (never in the client)
