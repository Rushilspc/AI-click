# TipTour for Windows - Agent Instructions

## Overview

TipTour is now a Windows notification-area companion. It is built with Electron + TypeScript and runs as a tray app with a compact floating panel instead of a normal desktop window. The app sends screenshots and prompts to Gemini Live, declares one `submit_workflow_plan(goal, app, steps)` tool, and executes returned workflow steps through Windows-compatible mouse/keyboard automation.

The original macOS SwiftUI/AppKit implementation was removed because AppKit, ScreenCaptureKit, macOS Accessibility, Keychain, and Xcode project files cannot run on Windows.

## Architecture

- **App Type**: Windows tray app. No normal taskbar window by default.
- **Framework**: Electron main process + renderer UI, written in TypeScript.
- **Panel UI**: `BrowserWindow` with a frameless compact HTML/CSS/TypeScript renderer.
- **Configuration**: `ConfigurationStore` stores the Gemini API key with Electron `safeStorage`; `TIPTOUR_GEMINI_API_KEY` can override it for local development.
- **Gemini Mode**: `GeminiLiveClient` opens a Gemini Live WebSocket and declares the `submit_workflow_plan` tool. It sends text prompts plus JPEG screenshots from the current Windows desktop.
- **Screen Capture**: `screenshot-desktop` captures one JPEG per display when possible, falling back to the primary display.
- **Action Execution**: `ActionExecutor` uses Electron plus PowerShell `user32.dll` helpers for clicking, typing, keyboard shortcuts, app launch, URL open, and scrolling.
- **Workflow Execution**: `WorkflowRunner` runs Gemini-produced workflow steps sequentially. Autopilot executes the steps; teaching mode leaves execution disabled while still surfacing plan progress.
- **Global Shortcuts**: `Ctrl+Alt+Space` toggles the session. `Ctrl+Alt+H` opens the tray panel.
- **Optional Worker**: `worker/` remains a Cloudflare Worker helper and is separate from the Electron app.

## Key Files

| File | Purpose |
|---|---|
| `package.json` | Root Windows app scripts, Electron Builder config, runtime dependencies, and TypeScript tooling. |
| `tsconfig.json` | Strict TypeScript build configuration. |
| `src/main/main.ts` | Electron entry point, tray icon/menu, panel lifecycle, global shortcuts, and IPC registration. |
| `src/main/companionManager.ts` | Central state manager for Gemini setup, session lifecycle, screenshot sending, prompt handling, and workflow status. |
| `src/main/geminiLiveClient.ts` | Gemini Live WebSocket client and workflow-plan tool declaration. |
| `src/main/screenCapture.ts` | Windows desktop screenshot capture service. |
| `src/main/actionExecutor.ts` | Windows Autopilot execution adapter over mouse, keyboard, clipboard, app launch, URL open, and scrolling primitives. |
| `src/main/workflowRunner.ts` | Sequential Gemini workflow runner. |
| `src/main/configuration.ts` | API-key and preference persistence using Electron safeStorage. |
| `src/main/preload.ts` | Secure IPC bridge for renderer code. |
| `src/renderer/index.html` | Floating tray panel markup. |
| `src/renderer/styles.css` | Floating tray panel styling. |
| `src/renderer/renderer.ts` | Renderer event handling and status rendering. |
| `src/shared/workflow.ts` | Shared status and workflow schema types. |
| `worker/src/index.ts` | Optional Cloudflare Worker routes. |

## Build and Run

```powershell
npm install
npm run dev
```

Package Windows artifacts:

```powershell
npm run package:win
```

Run type checks:

```powershell
npm run typecheck
```

## Code Style and Conventions

- Use TypeScript strict mode.
- Keep Electron main-process code in `src/main/`.
- Keep DOM renderer code in `src/renderer/`.
- Keep shared serializable schemas in `src/shared/`.
- Prefer clear, descriptive names over short names.
- Do not wrap imports in try/catch blocks.
- Keep renderer access to Node APIs behind `preload.ts`; do not enable renderer `nodeIntegration`.
- For interactive UI, make hover and disabled states visually obvious.
- Do not hardcode a maintainer-owned Gemini API key or Worker URL.

## Git Workflow

- Commit messages should be concise and imperative.
- Do not force-push to main.
