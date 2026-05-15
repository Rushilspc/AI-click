type WorkflowTargetContext =
  | 'visibleElement'
  | 'currentHighlight'
  | 'currentSelection'
  | 'focusedElement';

type WorkflowStepType =
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

interface NormalizedBox2D {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

interface WorkflowStep {
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

interface RuntimeStatusSnapshot {
  isSessionRunning: boolean;
  isAutopilotEnabled: boolean;
  isGeminiConfigured: boolean;
  lastTranscript: string;
  lastResponse: string;
  currentGoal: string;
  currentStepDescription: string;
  errorMessage?: string;
}

interface RendererToMainApi {
  getStatus(): Promise<RuntimeStatusSnapshot>;
  saveGeminiApiKey(apiKey: string): Promise<void>;
  clearGeminiApiKey(): Promise<void>;
  startSession(): Promise<void>;
  stopSession(): Promise<void>;
  sendTextPrompt(prompt: string): Promise<void>;
  setAutopilotEnabled(isEnabled: boolean): Promise<void>;
  onStatusChanged(callback: (status: RuntimeStatusSnapshot) => void): () => void;
}

const statusBadge = document.querySelector<HTMLDivElement>('#statusBadge');
const apiKeyInput = document.querySelector<HTMLInputElement>('#apiKeyInput');
const saveApiKeyButton = document.querySelector<HTMLButtonElement>('#saveApiKeyButton');
const clearApiKeyButton = document.querySelector<HTMLButtonElement>('#clearApiKeyButton');
const startSessionButton = document.querySelector<HTMLButtonElement>('#startSessionButton');
const stopSessionButton = document.querySelector<HTMLButtonElement>('#stopSessionButton');
const autopilotCheckbox = document.querySelector<HTMLInputElement>('#autopilotCheckbox');
const promptInput = document.querySelector<HTMLTextAreaElement>('#promptInput');
const sendPromptButton = document.querySelector<HTMLButtonElement>('#sendPromptButton');
const transcriptText = document.querySelector<HTMLDivElement>('#transcriptText');
const responseText = document.querySelector<HTMLDivElement>('#responseText');
const workflowText = document.querySelector<HTMLDivElement>('#workflowText');
const errorText = document.querySelector<HTMLDivElement>('#errorText');

let currentStatus: RuntimeStatusSnapshot | undefined;

const tipTourApi = (window as unknown as { tipTour: RendererToMainApi }).tipTour;

tipTourApi.onStatusChanged((status: RuntimeStatusSnapshot) => renderStatus(status));
tipTourApi.getStatus().then((status: RuntimeStatusSnapshot) => renderStatus(status));

saveApiKeyButton?.addEventListener('click', async () => {
  await runSafely(async () => {
    await tipTourApi.saveGeminiApiKey(apiKeyInput?.value ?? '');
    if (apiKeyInput) {
      apiKeyInput.value = '';
      apiKeyInput.placeholder = 'Saved in Windows protected storage';
    }
  });
});

clearApiKeyButton?.addEventListener('click', async () => {
  await runSafely(() => tipTourApi.clearGeminiApiKey());
});

startSessionButton?.addEventListener('click', async () => {
  await runSafely(() => tipTourApi.startSession());
});

stopSessionButton?.addEventListener('click', async () => {
  await runSafely(() => tipTourApi.stopSession());
});

autopilotCheckbox?.addEventListener('change', async () => {
  await runSafely(() => tipTourApi.setAutopilotEnabled(Boolean(autopilotCheckbox.checked)));
});

sendPromptButton?.addEventListener('click', async () => {
  await sendPrompt();
});

promptInput?.addEventListener('keydown', async (keyboardEvent) => {
  if (keyboardEvent.key === 'Enter' && (keyboardEvent.ctrlKey || keyboardEvent.metaKey)) {
    keyboardEvent.preventDefault();
    await sendPrompt();
  }
});

async function sendPrompt(): Promise<void> {
  const prompt = promptInput?.value ?? '';
  await runSafely(async () => {
    await tipTourApi.sendTextPrompt(prompt);
    if (promptInput) {
      promptInput.value = '';
    }
  });
}

function renderStatus(status: RuntimeStatusSnapshot): void {
  currentStatus = status;

  if (statusBadge) {
    statusBadge.textContent = status.isSessionRunning ? 'Live session on' : 'Session off';
    statusBadge.className = status.isSessionRunning ? 'status-badge active' : 'status-badge';
  }

  if (autopilotCheckbox) {
    autopilotCheckbox.checked = status.isAutopilotEnabled;
  }

  if (transcriptText) {
    transcriptText.textContent = status.lastTranscript || 'No prompt sent yet.';
  }

  if (responseText) {
    responseText.textContent = status.lastResponse || 'Gemini responses will appear here.';
  }

  if (workflowText) {
    const goal = status.currentGoal || 'No active workflow.';
    const step = status.currentStepDescription ? `\n${status.currentStepDescription}` : '';
    workflowText.textContent = `${goal}${step}`;
  }

  if (errorText) {
    errorText.textContent = status.errorMessage ?? '';
    errorText.hidden = !status.errorMessage;
  }

  if (startSessionButton) {
    startSessionButton.disabled = status.isSessionRunning || !status.isGeminiConfigured;
  }

  if (stopSessionButton) {
    stopSessionButton.disabled = !status.isSessionRunning;
  }

  if (sendPromptButton) {
    sendPromptButton.disabled = !status.isGeminiConfigured;
  }
}

async function runSafely(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    renderStatus({
      ...(currentStatus ?? {
        isSessionRunning: false,
        isAutopilotEnabled: true,
        isGeminiConfigured: false,
        lastTranscript: '',
        lastResponse: '',
        currentGoal: '',
        currentStepDescription: ''
      }),
      errorMessage: error instanceof Error ? error.message : String(error)
    });
  }
}
