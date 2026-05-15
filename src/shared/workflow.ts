export type WorkflowTargetContext =
  | 'visibleElement'
  | 'currentHighlight'
  | 'currentSelection'
  | 'focusedElement';

export type WorkflowStepType =
  | 'click'
  | 'doubleClick'
  | 'rightClick'
  | 'type'
  | 'keyboardShortcut'
  | 'pressKey'
  | 'openApp'
  | 'openUrl'
  | 'scroll'
  | 'wait';

export interface NormalizedBox2D {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

export interface WorkflowStep {
  type: WorkflowStepType;
  label?: string;
  value?: string;
  app?: string;
  url?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  amount?: number;
  keys?: string[];
  targetContext?: WorkflowTargetContext;
  box2d?: NormalizedBox2D;
}

export interface WorkflowPlan {
  goal: string;
  app?: string;
  steps: WorkflowStep[];
}

export interface RuntimeStatusSnapshot {
  isSessionRunning: boolean;
  isAutopilotEnabled: boolean;
  isGeminiConfigured: boolean;
  lastTranscript: string;
  lastResponse: string;
  currentGoal: string;
  currentStepDescription: string;
  errorMessage?: string;
}

export interface RendererToMainApi {
  getStatus(): Promise<RuntimeStatusSnapshot>;
  saveGeminiApiKey(apiKey: string): Promise<void>;
  clearGeminiApiKey(): Promise<void>;
  startSession(): Promise<void>;
  stopSession(): Promise<void>;
  sendTextPrompt(prompt: string): Promise<void>;
  setAutopilotEnabled(isEnabled: boolean): Promise<void>;
  onStatusChanged(callback: (status: RuntimeStatusSnapshot) => void): () => void;
}
