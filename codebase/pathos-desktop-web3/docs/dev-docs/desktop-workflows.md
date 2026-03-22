# PathOS Desktop Workflows

## Mode 1 — Realtime Dev (Next.js + Electron)

Run the Next.js dev server and point Electron at it.

**Terminal A (web app):**
```powershell
cd C:\path\to\fedpath-tier1-frontend
pnpm desktop:dev
```

**Terminal B (desktop shell):**
```powershell
cd C:\path\to\fedpath-tier1-frontend\pathos-desktop
pnpm dev
```

**Notes:**
- Electron loads `PATHOS_DESKTOP_DEV_URL` or defaults to `http://localhost:3000`.
- Use `Ctrl+R` to reload and `Ctrl+Shift+I` to open DevTools.
- To override the dev URL:
```powershell
$env:PATHOS_DESKTOP_DEV_URL="http://localhost:3000"
pnpm dev
```

---

## Mode 2 — Packaged QA (No Installer)

Build the Windows artifacts and run the unpacked executable.

```powershell
cd C:\path\to\fedpath-tier1-frontend\pathos-desktop
pnpm dist
.\release\win-unpacked\PathOS Desktop.exe
```

**Expected outputs:**
- `release\win-unpacked\PathOS Desktop.exe`
- `release\pathos-setup.exe`

**Bundled UI location:**
- The packaged app loads `pathos-desktop\renderer\index.html` (file://) in prod.

---

## Mode 3 — Installer Distribution

Distribute the Windows installer and keep the download link stable.

```powershell
# Copy the installer artifact into the web repo for distribution:
Copy-Item .\release\pathos-setup.exe `
  ..\public\downloads\pathos-setup.exe
```

**Public download path (keep stable):**
- `public/downloads/pathos-setup.exe`
- `/downloads/pathos-setup.exe`
