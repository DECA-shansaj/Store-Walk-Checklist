# Gulfport Store Walk Checklist

Mobile-first Progressive Web App for Opening and Closing Managers to complete a full store walk checklist.

**Built with:** Plain HTML, CSS, and vanilla JavaScript  
**No backend • No database • No login • Works offline after first load**

---

## Quick Start (for users)

1. Open the app in a modern mobile or desktop browser.
2. Enter your **Manager Name**.
3. Tap **Opening Manager** or **Closing Manager**.
4. Complete every checklist item (Pass / Issue Found / N/A).
5. Check the certification box.
6. Tap **Complete & Report**.
7. Copy the report or use **Print / Save as PDF**.

The app automatically saves a draft after every change and works offline once it has been loaded once while online.

---

## Privacy Warning (shown in the app)

> Do not enter personal information beyond the required manager name.  
> Do not enter CUI, customer information, cash amounts, sensitive incident details, employee disciplinary information, or unnecessary personal information.

---

## Project Structure

```
gulfport-store-walk/
├── index.html              ← Main app page
├── manifest.json           ← Makes it installable as a PWA
├── service-worker.js       ← Enables offline use
├── css/
│   └── styles.css
├── js/
│   └── app.js
├── data/
│   └── checklist.json      ← All checklist questions live here
├── .gitignore
└── README.md               ← This file
```

---

## How to Put This on GitHub (Beginner Guide)

You have **three easy options**. Choose the one that feels most comfortable.

### Option 1: Upload files using the GitHub website (easiest – no software needed)

1. Go to [https://github.com](https://github.com) and sign in (or create a free account).
2. Click the **+** in the top-right → **New repository**.
3. Fill in:
   - **Repository name:** `gulfport-store-walk` (or any name you like)
   - Description: `Gulfport Store Walk Checklist PWA`
   - Keep it **Public** (recommended) or Private.
   - **Do NOT** check “Add a README” (we already have one).
4. Click **Create repository**.
5. On the next page, click **uploading an existing file**.
6. Drag and drop **all the files and folders** from this project into the browser window  
   (or click “choose your files” and select everything).
7. Scroll down, type a short message like `Initial upload`, and click **Commit changes**.

Done! Your code is now on GitHub.

### Option 2: Use GitHub Desktop (recommended if you will make changes later)

1. Download and install [GitHub Desktop](https://desktop.github.com/).
2. Sign in with your GitHub account.
3. Click **File → Add Local Repository → Create a New Repository**.
4. Choose the folder that contains these files and create it.
5. Click **Publish repository** (keep “Keep this code private” unchecked if you want it public).

### Option 3: Command line (if you already know a little Git)

```bash
cd gulfport-store-walk
git init
git add .
git commit -m "Initial commit – Gulfport Store Walk Checklist"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/gulfport-store-walk.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your actual GitHub username.

---

## How to Host It for Free with GitHub Pages (so people can open it on their phones)

After the code is on GitHub:

1. Go to your repository on GitHub.
2. Click **Settings** → **Pages** (left sidebar).
3. Under **Source**, select **Deploy from a branch**.
4. Branch: `main` → folder: `/ (root)` → click **Save**.
5. Wait 1–2 minutes. GitHub will give you a link that looks like:  
   `https://YOUR-USERNAME.github.io/gulfport-store-walk/`

Open that link on a phone or computer. The first time it loads while online, the Service Worker caches everything so it works offline afterward.

> **Important:** Service Workers only work on `https://` or `localhost`. GitHub Pages gives you HTTPS automatically – perfect.

---

## Making Changes Later

- Edit `data/checklist.json` to change the questions or add new sections.
- Edit `css/styles.css` for appearance.
- Edit `js/app.js` for behavior.

After changing files, commit and push them to GitHub (or re-upload via the website). GitHub Pages will update automatically within a minute or two.

---

## Testing Offline

1. Open the live GitHub Pages link while online.
2. Turn on Airplane Mode (or DevTools → Network → Offline).
3. Refresh the page – the app should still load and show the offline banner.

---

## License

This project is provided as-is for internal store use.  
You may adapt it for your own locations.
