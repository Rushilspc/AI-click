import type { RendererToMainApi, RuntimeStatusSnapshot } from '../shared/workflow.js';

declare global {
  interface Window {
    tipTour: RendererToMainApi;
  }
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

window.tipTour.onStatusChanged((status) => renderStatus(status));
window.tipTour.getStatus().then((status) => renderStatus(status));

saveApiKeyButton?.addEventListener('click', async () => {
  await runSafely(async () => {
    await window.tipTour.saveGeminiApiKey(apiKeyInput?.value ?? '');
    if (apiKeyInput) {
      apiKeyInput.value = '';
      apiKeyInput.placeholder = 'Saved in Windows protected storage';
    }
  });
});

clearApiKeyButton?.addEventListener('click', async () => {
  await runSafely(() => window.tipTour.clearGeminiApiKey());
});

startSessionButton?.addEventListener('click', async () => {
  await runSafely(() => window.tipTour.startSession());
});

stopSessionButton?.addEventListener('click', async () => {
  await runSafely(() => window.tipTour.stopSession());
});

autopilotCheckbox?.addEventListener('change', async () => {
  await runSafely(() => window.tipTour.setAutopilotEnabled(Boolean(autopilotCheckbox.checked)));
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
    await window.tipTour.sendTextPrompt(prompt);
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
