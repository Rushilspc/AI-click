<div align="center">

# TipTour for Windows

**A Windows tray companion that sees your desktop, understands your requests, and can act for you.**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Platform: Windows 10/11](https://img.shields.io/badge/Platform-Windows%2010%2F11-blue)](https://www.microsoft.com/windows)

</div>

TipTour has been ported from the original macOS menu-bar project into a Windows tray app. The Windows version is built with Electron + TypeScript so it can live in the notification area, show a compact floating control panel, capture screenshots, send context to Gemini Live, and execute desktop actions through Windows-compatible automation primitives.

## What TipTour Can Do on Windows

- Capture your current desktop and send screen context to Gemini Live.
- Accept natural-language prompts from the tray panel.
- Ask Gemini to produce a `submit_workflow_plan` action plan.
- Execute Autopilot steps such as clicking, double-clicking, right-clicking, typing, opening apps, opening URLs, scrolling, pressing single keys, and pressing keyboard shortcuts.
- Store your Gemini API key in Electron `safeStorage`, which uses OS-backed user protection on Windows.
- Run from the Windows notification area instead of opening a normal app window.

> Voice capture is the next Windows-specific integration point. The current Windows port keeps the Gemini Live session, screenshot streaming, tool calling, and Autopilot execution path in place, while the panel prompt is the reliable input surface across Windows 10/11.

## Controls

| Control | Action |
|---|---|
| Tray icon click | Open the TipTour panel |
| `Ctrl + Alt + H` | Open the TipTour panel |
| `Ctrl + Alt + Space` | Toggle the Gemini Live session |
| Panel prompt + `Ctrl + Enter` | Send the prompt with screenshots |

## Install and Run From Source

### Requirements

- Windows 10 or Windows 11
- Node.js 20+
- npm 10+
- A Gemini API key from Google AI Studio

### 1. Clone and install

```powershell
git clone https://github.com/<your-user>/<your-fork>.git
cd <your-fork>
npm install
```

### 2. Start TipTour in development mode

```powershell
npm run dev
```

In development mode, TipTour opens the setup panel automatically and also starts in the Windows notification area. If you close or lose the panel, click the tray icon or press `Ctrl + Alt + H` to reopen it.

### 3. Add your Gemini API key

1. Open the TipTour tray panel.
2. Paste your Gemini API key into the **Gemini API key** field.
3. Click **Save**.
4. Confirm the status controls become available.

You can also provide a key for local testing with an environment variable:

```powershell
$env:TIPTOUR_GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
npm run dev
```

### 4. Use TipTour

1. Press `Ctrl + Alt + Space` or click **Start session**.
2. Type a request such as:
   - “Open Notepad and write a short checklist.”
   - “Click the search box and type calculator.”
   - “Open https://example.com.”
3. Leave **Autopilot** enabled if you want TipTour to perform the actions.
4. Disable **Autopilot** if you only want to inspect the generated workflow in the panel.

## Build a Windows Installer or Portable App

```powershell
npm run package:win
```

Build artifacts are written to `release/`:

- NSIS installer
- Portable executable

## Optional Cloudflare Worker

The existing Worker is still included for teams that want a small proxy/deployment helper. It is not required for source builds.

```powershell
cd worker
npm install
npx wrangler secret put GEMINI_API_KEY
npx wrangler deploy
```

## Project Structure

| Path | Purpose |
|---|---|
| `src/main/main.ts` | Electron app entry point, tray lifecycle, panel window, global shortcuts, automatic dev panel display, and IPC handlers. |
| `src/main/companionManager.ts` | Main Windows companion state machine for configuration, Gemini session lifecycle, screenshot sending, and workflow execution. |
| `src/main/geminiLiveClient.ts` | Gemini Live WebSocket client with the `submit_workflow_plan` tool declaration. |
| `src/main/screenCapture.ts` | Windows-compatible desktop screenshot capture. |
| `src/main/actionExecutor.ts` | Autopilot adapter for mouse, keyboard, typing, app launch, URL open, and scrolling actions. |
| `src/main/workflowRunner.ts` | Sequential workflow runner that either executes Autopilot steps or reports the plan in teaching mode. |
| `src/main/configuration.ts` | Safe local API-key and preference storage. |
| `src/main/preload.ts` | Secure Electron bridge exposed to the renderer. |
| `src/renderer/*` | Tray panel HTML, CSS, and TypeScript UI, built with `tsconfig.renderer.json` so browser code is emitted without CommonJS wrappers. |
| `src/shared/workflow.ts` | Shared workflow and status types. |
| `tsconfig.json` / `tsconfig.renderer.json` | Separate TypeScript configs for Electron main/preload CommonJS output and browser-safe renderer output. |
| `worker/` | Optional Cloudflare Worker proxy/helper. |

## Privacy and Permissions

TipTour sends screenshots and prompts to Gemini only after you start a session and send a request. Autopilot uses local Windows input automation to perform actions. Review generated workflows in the panel and turn Autopilot off whenever you want TipTour to stop controlling the desktop.

## Notes for Fork Maintainers

This repository was originally a macOS SwiftUI app. The Windows port intentionally removes the Xcode project and macOS-only Accessibility/ScreenCaptureKit/AppKit code because those APIs cannot run on Windows. Windows-specific equivalents now live in the Electron main process and can be iterated independently.

## License

[MIT](LICENSE)
