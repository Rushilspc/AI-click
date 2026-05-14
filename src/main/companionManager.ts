import { BrowserWindow } from 'electron';
import type { RuntimeStatusSnapshot, WorkflowPlan } from '../shared/workflow.js';
import { ConfigurationStore } from './configuration.js';
import { GeminiLiveClient } from './geminiLiveClient.js';
import { ScreenCaptureService } from './screenCapture.js';
import { WorkflowRunner } from './workflowRunner.js';

export class CompanionManager {
  private readonly configurationStore = new ConfigurationStore();
  private readonly screenCaptureService = new ScreenCaptureService();
  private readonly workflowRunner: WorkflowRunner;
  private geminiLiveClient?: GeminiLiveClient;
  private statusSnapshot: RuntimeStatusSnapshot = {
    isSessionRunning: false,
    isAutopilotEnabled: true,
    isGeminiConfigured: false,
    lastTranscript: '',
    lastResponse: '',
    currentGoal: '',
    currentStepDescription: ''
  };

  constructor(private readonly getPanelWindow: () => BrowserWindow | undefined) {
    this.workflowRunner = new WorkflowRunner({
      onWorkflowProgress: (goal, currentStepDescription) => {
        this.updateStatus({ currentGoal: goal, currentStepDescription });
      },
      onWorkflowFinished: () => {
        this.updateStatus({ currentStepDescription: 'Done' });
      },
      onWorkflowError: (error) => {
        this.updateStatus({ errorMessage: error.message });
      }
    });
  }

  async initialize(): Promise<void> {
    const [isAutopilotEnabled, geminiApiKey] = await Promise.all([
      this.configurationStore.readAutopilotEnabled(),
      this.configurationStore.readGeminiApiKey()
    ]);

    this.updateStatus({
      isAutopilotEnabled,
      isGeminiConfigured: Boolean(geminiApiKey)
    });
  }

  getStatusSnapshot(): RuntimeStatusSnapshot {
    return this.statusSnapshot;
  }

  async saveGeminiApiKey(geminiApiKey: string): Promise<void> {
    await this.configurationStore.saveGeminiApiKey(geminiApiKey);
    this.updateStatus({ isGeminiConfigured: true, errorMessage: undefined });
  }

  async clearGeminiApiKey(): Promise<void> {
    await this.configurationStore.clearGeminiApiKey();
    this.updateStatus({ isGeminiConfigured: false });
  }

  async setAutopilotEnabled(isAutopilotEnabled: boolean): Promise<void> {
    await this.configurationStore.saveAutopilotEnabled(isAutopilotEnabled);
    this.updateStatus({ isAutopilotEnabled });
  }

  async startSession(): Promise<void> {
    if (this.statusSnapshot.isSessionRunning) {
      return;
    }

    const geminiApiKey = await this.configurationStore.readGeminiApiKey();
    if (!geminiApiKey) {
      throw new Error('Paste a Gemini API key before starting TipTour.');
    }

    this.geminiLiveClient = new GeminiLiveClient(geminiApiKey, {
      onText: (text) => this.updateStatus({ lastResponse: `${this.statusSnapshot.lastResponse}${text}` }),
      onWorkflowPlan: (workflowPlan) => void this.handleWorkflowPlan(workflowPlan),
      onError: (error) => this.updateStatus({ errorMessage: error.message }),
      onClose: () => this.updateStatus({ isSessionRunning: false })
    });

    await this.geminiLiveClient.connect();
    this.updateStatus({
      isSessionRunning: true,
      lastTranscript: '',
      lastResponse: '',
      currentGoal: '',
      currentStepDescription: '',
      errorMessage: undefined
    });
  }

  stopSession(): void {
    this.geminiLiveClient?.close();
    this.geminiLiveClient = undefined;
    this.updateStatus({ isSessionRunning: false, currentStepDescription: '' });
  }

  async sendTextPrompt(prompt: string): Promise<void> {
    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length === 0) {
      return;
    }

    if (!this.statusSnapshot.isSessionRunning) {
      await this.startSession();
    }

    this.updateStatus({ lastTranscript: trimmedPrompt, lastResponse: '', errorMessage: undefined });
    await this.sendScreenshotsToGemini();
    this.geminiLiveClient?.sendText(trimmedPrompt);
  }

  private async sendScreenshotsToGemini(): Promise<void> {
    const capturedDisplayImages = await this.screenCaptureService.captureAllDisplays();
    for (const capturedDisplayImage of capturedDisplayImages) {
      this.geminiLiveClient?.sendJpegImage(capturedDisplayImage.base64Jpeg);
    }
  }

  private async handleWorkflowPlan(workflowPlan: WorkflowPlan): Promise<void> {
    try {
      await this.workflowRunner.runWorkflowPlan(workflowPlan, this.statusSnapshot.isAutopilotEnabled);
    } catch (error) {
      this.updateStatus({ errorMessage: error instanceof Error ? error.message : String(error) });
    }
  }

  private updateStatus(partialStatusSnapshot: Partial<RuntimeStatusSnapshot>): void {
    this.statusSnapshot = {
      ...this.statusSnapshot,
      ...partialStatusSnapshot
    };

    this.getPanelWindow()?.webContents.send('status-changed', this.statusSnapshot);
  }
}
