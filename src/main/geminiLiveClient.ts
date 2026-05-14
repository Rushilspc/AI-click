import WebSocket from 'ws';
import type { WorkflowPlan } from '../shared/workflow.js';

interface GeminiLiveClientDelegate {
  onText(text: string): void;
  onWorkflowPlan(workflowPlan: WorkflowPlan): void;
  onError(error: Error): void;
  onClose(): void;
}

const geminiLiveModelName = process.env.TIPTOUR_GEMINI_LIVE_MODEL ?? 'models/gemini-2.0-flash-live-001';

export class GeminiLiveClient {
  private websocket?: WebSocket;

  constructor(
    private readonly geminiApiKey: string,
    private readonly delegate: GeminiLiveClientDelegate
  ) {}

  async connect(): Promise<void> {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      return;
    }

    const websocketUrl = new URL('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent');
    websocketUrl.searchParams.set('key', this.geminiApiKey);

    this.websocket = new WebSocket(websocketUrl);
    await new Promise<void>((resolve, reject) => {
      const websocket = this.websocket;
      if (!websocket) {
        reject(new Error('Gemini Live WebSocket was not created.'));
        return;
      }

      websocket.once('open', () => {
        websocket.send(JSON.stringify(this.createSetupMessage()));
        resolve();
      });
      websocket.once('error', reject);
    });

    this.websocket.on('message', (message) => this.handleMessage(message.toString()));
    this.websocket.on('error', (error) => this.delegate.onError(error));
    this.websocket.on('close', () => this.delegate.onClose());
  }

  sendText(text: string): void {
    this.sendJson({
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text }]
          }
        ],
        turnComplete: true
      }
    });
  }

  sendJpegImage(base64Jpeg: string): void {
    this.sendJson({
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'image/jpeg',
            data: base64Jpeg
          }
        ]
      }
    });
  }

  close(): void {
    this.websocket?.close();
    this.websocket = undefined;
  }

  private handleMessage(rawMessage: string): void {
    let parsedMessage: unknown;
    try {
      parsedMessage = JSON.parse(rawMessage);
    } catch {
      return;
    }

    const serverContent = this.readRecord(parsedMessage).serverContent;
    const modelTurn = this.readRecord(serverContent).modelTurn;
    const parts = this.readArray(this.readRecord(modelTurn).parts);
    for (const part of parts) {
      const text = this.readRecord(part).text;
      if (typeof text === 'string' && text.length > 0) {
        this.delegate.onText(text);
      }

      const functionCall = this.readRecord(part).functionCall;
      const functionName = this.readRecord(functionCall).name;
      if (functionName === 'submit_workflow_plan') {
        const args = this.readRecord(this.readRecord(functionCall).args);
        this.delegate.onWorkflowPlan({
          goal: typeof args.goal === 'string' ? args.goal : 'Untitled workflow',
          app: typeof args.app === 'string' ? args.app : undefined,
          steps: Array.isArray(args.steps) ? args.steps as WorkflowPlan['steps'] : []
        });
      }
    }

    const toolCall = this.readRecord(parsedMessage).toolCall;
    const functionCalls = this.readArray(this.readRecord(toolCall).functionCalls);
    for (const functionCall of functionCalls) {
      const functionName = this.readRecord(functionCall).name;
      if (functionName === 'submit_workflow_plan') {
        const args = this.readRecord(this.readRecord(functionCall).args);
        this.delegate.onWorkflowPlan({
          goal: typeof args.goal === 'string' ? args.goal : 'Untitled workflow',
          app: typeof args.app === 'string' ? args.app : undefined,
          steps: Array.isArray(args.steps) ? args.steps as WorkflowPlan['steps'] : []
        });
      }
    }
  }

  private createSetupMessage(): Record<string, unknown> {
    return {
      setup: {
        model: geminiLiveModelName,
        generationConfig: {
          responseModalities: ['TEXT']
        },
        systemInstruction: {
          parts: [
            {
              text: [
                'You are TipTour for Windows, a careful desktop assistant.',
                'Use screen images and the user request to decide whether a Windows workflow is needed.',
                'When computer control is needed, call submit_workflow_plan exactly once with concise steps.',
                'For click-like steps include a normalized box2d using 0-1000 coordinates whenever possible.',
                'Prefer safe reversible actions and ask for clarification when the target is ambiguous.'
              ].join(' ')
            }
          ]
        },
        tools: [
          {
            functionDeclarations: [
              {
                name: 'submit_workflow_plan',
                description: 'Submit a Windows desktop action plan for TipTour to execute or guide.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    goal: { type: 'STRING' },
                    app: { type: 'STRING' },
                    steps: {
                      type: 'ARRAY',
                      items: {
                        type: 'OBJECT',
                        properties: {
                          type: {
                            type: 'STRING',
                            enum: ['click', 'doubleClick', 'rightClick', 'type', 'keyboardShortcut', 'pressKey', 'openApp', 'openUrl', 'scroll', 'wait']
                          },
                          label: { type: 'STRING' },
                          value: { type: 'STRING' },
                          app: { type: 'STRING' },
                          url: { type: 'STRING' },
                          direction: { type: 'STRING', enum: ['up', 'down', 'left', 'right'] },
                          amount: { type: 'NUMBER' },
                          keys: { type: 'ARRAY', items: { type: 'STRING' } },
                          targetContext: { type: 'STRING', enum: ['visibleElement', 'currentHighlight', 'currentSelection', 'focusedElement'] },
                          box2d: {
                            type: 'OBJECT',
                            properties: {
                              xMin: { type: 'NUMBER' },
                              yMin: { type: 'NUMBER' },
                              xMax: { type: 'NUMBER' },
                              yMax: { type: 'NUMBER' }
                            }
                          }
                        },
                        required: ['type']
                      }
                    }
                  },
                  required: ['goal', 'steps']
                }
              }
            ]
          }
        ]
      }
    };
  }

  private sendJson(payload: Record<string, unknown>): void {
    if (this.websocket?.readyState !== WebSocket.OPEN) {
      throw new Error('Gemini Live is not connected.');
    }

    this.websocket.send(JSON.stringify(payload));
  }

  private readRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? value as Record<string, unknown> : {};
  }

  private readArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }
}
