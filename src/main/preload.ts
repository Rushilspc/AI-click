import { contextBridge, ipcRenderer } from 'electron';
import type { RendererToMainApi, RuntimeStatusSnapshot } from '../shared/workflow';

const tipTourApi: RendererToMainApi = {
  getStatus: () => ipcRenderer.invoke('get-status'),
  saveGeminiApiKey: (apiKey) => ipcRenderer.invoke('save-gemini-api-key', apiKey),
  clearGeminiApiKey: () => ipcRenderer.invoke('clear-gemini-api-key'),
  startSession: () => ipcRenderer.invoke('start-session'),
  stopSession: () => ipcRenderer.invoke('stop-session'),
  sendTextPrompt: (prompt) => ipcRenderer.invoke('send-text-prompt', prompt),
  setAutopilotEnabled: (isEnabled) => ipcRenderer.invoke('set-autopilot-enabled', isEnabled),
  onStatusChanged: (callback) => {
    const listener = (_event: unknown, status: RuntimeStatusSnapshot) => callback(status);
    ipcRenderer.on('status-changed', listener);
    return () => ipcRenderer.off('status-changed', listener);
  }
};

contextBridge.exposeInMainWorld('tipTour', tipTourApi);
