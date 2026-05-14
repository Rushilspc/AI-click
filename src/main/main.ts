import { app, BrowserWindow, globalShortcut, ipcMain, Menu, nativeImage, Tray } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CompanionManager } from './companionManager.js';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectoryPath = path.dirname(currentFilePath);

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
  companionManager = new CompanionManager(() => panelWindow);
  await companionManager.initialize();
  createPanelWindow();
  createTray();
  registerGlobalShortcuts();
  registerIpcHandlers();
});

app.on('window-all-closed', (event: Event) => {
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
      preload: path.join(currentDirectoryPath, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  panelWindow.loadFile(path.join(currentDirectoryPath, '../renderer/index.html'));
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
}

function showPanelWindow(): void {
  if (!panelWindow || !tray) {
    return;
  }

  const trayBounds = tray.getBounds();
  const panelBounds = panelWindow.getBounds();
  panelWindow.setPosition(
    Math.round(trayBounds.x + trayBounds.width / 2 - panelBounds.width / 2),
    Math.round(trayBounds.y + trayBounds.height + 8)
  );
  panelWindow.show();
  panelWindow.focus();
}

function registerGlobalShortcuts(): void {
  globalShortcut.register('Control+Alt+Space', () => toggleSessionFromTray());
  globalShortcut.register('Control+Alt+H', () => showPanelWindow());
}

function registerIpcHandlers(): void {
  ipcMain.handle('get-status', () => companionManager.getStatusSnapshot());
  ipcMain.handle('save-gemini-api-key', (_event, apiKey: string) => companionManager.saveGeminiApiKey(apiKey));
  ipcMain.handle('clear-gemini-api-key', () => companionManager.clearGeminiApiKey());
  ipcMain.handle('start-session', () => companionManager.startSession());
  ipcMain.handle('stop-session', () => companionManager.stopSession());
  ipcMain.handle('send-text-prompt', (_event, prompt: string) => companionManager.sendTextPrompt(prompt));
  ipcMain.handle('set-autopilot-enabled', (_event, isEnabled: boolean) => companionManager.setAutopilotEnabled(isEnabled));
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

function createTrayIconDataUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#111827"/><path d="M7 17L24 7l-6 18-4-7-7-1z" fill="#60a5fa"/><circle cx="21" cy="11" r="2" fill="#dbeafe"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
