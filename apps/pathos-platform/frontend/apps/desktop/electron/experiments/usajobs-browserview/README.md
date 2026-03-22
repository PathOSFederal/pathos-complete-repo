# PathOS Desktop Shell Spike (Day 45)

This folder contains the minimal Electron wrapper that proves PathOS can run as
a desktop shell while rendering USAJOBS in a `BrowserView`.

## Why this exists

- **Desktop wrapper** for the existing Next.js app
- **BrowserView** renders `https://www.usajobs.gov` without iframes
- **Strict trust boundary**: no DOM access, no automation, no credential capture

## Development workflow

1) Start the Next.js dev server:

```
pnpm dev
```

2) In a second terminal, launch Electron (waits for port 3000):

```
pnpm desktop:electron
```

Or run both together:

```
pnpm desktop:dev
```

## Config notes

- The renderer defaults to `http://localhost:3000/desktop/usajobs-guided`.
- Override with:

```
PATHOS_DESKTOP_URL=http://localhost:3000/desktop/usajobs-guided pnpm desktop:electron
```

## Trust boundary reminder

PathOS does **not** access your USAJOBS account. The BrowserView is a direct
render of USAJOBS. The preload bridge only exposes:

- `ping()`
- `loadUsajobs()`

No DOM scraping. No automation. No credential capture.
