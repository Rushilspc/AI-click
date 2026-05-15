import { app, BrowserWindow, globalShortcut, ipcMain, Menu, nativeImage, screen, Tray } from 'electron';
import path from 'node:path';
import { CompanionManager } from './companionManager';

const isDevelopmentMode = !app.isPackaged;

let tray: Tray | undefined;
let panelWindow: BrowserWindow | undefined;
let companionManager: CompanionManager;

app.setName('TipTour');
app.disableHardwareAcceleration();

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
}

app.whenReady().then(async () => {
  createPanelWindow();
  createTray();

  companionManager = new CompanionManager(() => panelWindow);
  registerGlobalShortcuts();
  registerIpcHandlers();
  await companionManager.initialize();

  if (shouldShowPanelOnLaunch()) {
    showPanelWindow();
  }
}).catch((error: Error) => {
  console.error('Failed to start TipTour:', error);
  app.quit();
});

app.on('second-instance', () => {
  showPanelWindow();
});

app.on('window-all-closed', (event: { preventDefault(): void }) => {
  event.preventDefault();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

function createPanelWindow(): void {
  panelWindow = new BrowserWindow({
    width: 420,
    height: 620,
    show: false,
    resizable: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  void panelWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  panelWindow.on('blur', () => panelWindow?.hide());
}

function createTray(): void {
  const trayIcon = nativeImage.createFromDataURL(createTrayIconDataUrl());
  tray = new Tray(trayIcon);
  tray.setToolTip('TipTour for Windows');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open TipTour', click: () => showPanelWindow() },
    { label: 'Toggle Gemini Session', click: () => toggleSessionFromTray() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]));
  tray.on('click', () => showPanelWindow());
  tray.on('double-click', () => showPanelWindow());
}

function showPanelWindow(): void {
  if (!panelWindow) {
    return;
  }

  panelWindow.setPosition(...calculatePanelWindowPosition());
  panelWindow.show();
  panelWindow.focus();
}

function calculatePanelWindowPosition(): [number, number] {
  const panelBounds = panelWindow?.getBounds() ?? { width: 420, height: 620 };
  const trayBounds = tray?.getBounds();
  const anchorBounds = trayBounds && trayBounds.width > 0 && trayBounds.height > 0
    ? trayBounds
    : screen.getPrimaryDisplay().workArea;
  const display = screen.getDisplayMatching(anchorBounds);
  const workArea = display.workArea;

  const preferredX = anchorBounds.x + anchorBounds.width / 2 - panelBounds.width / 2;
  const preferredY = anchorBounds.y < workArea.y + workArea.height / 2
    ? anchorBounds.y + anchorBounds.height + 8
    : anchorBounds.y - panelBounds.height - 8;

  const clampedX = clamp(Math.round(preferredX), workArea.x + 8, workArea.x + workArea.width - panelBounds.width - 8);
  const clampedY = clamp(Math.round(preferredY), workArea.y + 8, workArea.y + workArea.height - panelBounds.height - 8);
  return [clampedX, clampedY];
}

function registerGlobalShortcuts(): void {
  globalShortcut.register('Control+Alt+Space', () => toggleSessionFromTray());
  globalShortcut.register('Control+Alt+H', () => showPanelWindow());
}

function registerIpcHandlers(): void {
  ipcMain.handle('get-status', () => companionManager.getStatusSnapshot());
  ipcMain.handle('save-gemini-api-key', (_event: unknown, apiKey: string) => companionManager.saveGeminiApiKey(apiKey));
  ipcMain.handle('clear-gemini-api-key', () => companionManager.clearGeminiApiKey());
  ipcMain.handle('start-session', () => companionManager.startSession());
  ipcMain.handle('stop-session', () => companionManager.stopSession());
  ipcMain.handle('send-text-prompt', (_event: unknown, prompt: string) => companionManager.sendTextPrompt(prompt));
  ipcMain.handle('set-autopilot-enabled', (_event: unknown, isEnabled: boolean) => companionManager.setAutopilotEnabled(isEnabled));
}

function toggleSessionFromTray(): void {
  if (companionManager.getStatusSnapshot().isSessionRunning) {
    companionManager.stopSession();
  } else {
    void companionManager.startSession().catch((error: Error) => {
      showPanelWindow();
      panelWindow?.webContents.send('status-changed', {
        ...companionManager.getStatusSnapshot(),
        errorMessage: error.message
      });
    });
  }
}

function shouldShowPanelOnLaunch(): boolean {
  return isDevelopmentMode || process.argv.includes('--show-panel');
}

function clamp(value: number, minimumValue: number, maximumValue: number): number {
  if (maximumValue < minimumValue) {
    return minimumValue;
  }

  return Math.min(Math.max(value, minimumValue), maximumValue);
}

function createTrayIconDataUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#111827"/><path d="M7 17L24 7l-6 18-4-7-7-1z" fill="#60a5fa"/><circle cx="21" cy="11" r="2" fill="#dbeafe"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
