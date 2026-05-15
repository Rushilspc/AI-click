import { clipboard, screen, shell } from 'electron';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { NormalizedBox2D, WorkflowStep } from '../shared/workflow';

const execFileAsync = promisify(execFile);

type MouseButton = 'left' | 'right';

const virtualKeyMap: Record<string, number> = {
  alt: 0x12,
  backspace: 0x08,
  control: 0x11,
  ctrl: 0x11,
  delete: 0x2e,
  down: 0x28,
  enter: 0x0d,
  escape: 0x1b,
  esc: 0x1b,
  left: 0x25,
  meta: 0x5b,
  pagedown: 0x22,
  pageup: 0x21,
  right: 0x27,
  shift: 0x10,
  space: 0x20,
  tab: 0x09,
  up: 0x26,
  win: 0x5b,
  windows: 0x5b
};

export class ActionExecutor {
  async executeWorkflowStep(workflowStep: WorkflowStep): Promise<void> {
    switch (workflowStep.type) {
      case 'click':
        await this.clickStep(workflowStep, 'left');
        break;
      case 'doubleClick':
        await this.clickStep(workflowStep, 'left', 2);
        break;
      case 'rightClick':
        await this.clickStep(workflowStep, 'right');
        break;
      case 'type':
        await this.typeText(workflowStep.value ?? '');
        break;
      case 'keyboardShortcut':
        await this.pressKeyboardShortcut(workflowStep.keys ?? []);
        break;
      case 'pressKey':
        await this.pressSingleKey(workflowStep.value ?? workflowStep.keys?.[0] ?? '');
        break;
      case 'openApp':
        await this.openApplication(workflowStep.app ?? workflowStep.value ?? '');
        break;
      case 'openUrl':
        await shell.openExternal(workflowStep.url ?? workflowStep.value ?? '');
        break;
      case 'scroll':
        await this.scroll(workflowStep.direction ?? 'down', workflowStep.amount ?? 5);
        break;
      case 'wait':
        await new Promise((resolve) => setTimeout(resolve, workflowStep.amount ?? 800));
        break;
    }
  }

  private async clickStep(workflowStep: WorkflowStep, mouseButton: MouseButton, clickCount = 1): Promise<void> {
    const clickPoint = this.pointFromNormalizedBox(workflowStep.box2d);
    if (!clickPoint) {
      throw new Error(`Step "${workflowStep.label ?? workflowStep.type}" needs a box2d coordinate on Windows.`);
    }

    await this.runPowerShellAutomation(`
      [MouseAutomation]::SetCursorPos(${clickPoint.x}, ${clickPoint.y}) | Out-Null
      Start-Sleep -Milliseconds 120
      ${Array.from({ length: clickCount }, () => this.mouseClickPowerShell(mouseButton)).join('\n')}
    `);
  }

  private async typeText(textToType: string): Promise<void> {
    if (textToType.length === 0) {
      return;
    }

    clipboard.writeText(textToType);
    await this.pressKeyboardShortcut(['ctrl', 'v']);
  }

  private async pressKeyboardShortcut(keyNames: string[]): Promise<void> {
    const virtualKeys = keyNames.map((keyName) => this.resolveVirtualKey(keyName));
    await this.runPowerShellAutomation(`
      ${virtualKeys.map((virtualKey) => `[KeyboardAutomation]::KeyDown(${virtualKey})`).join('\n')}
      Start-Sleep -Milliseconds 60
      ${virtualKeys.reverse().map((virtualKey) => `[KeyboardAutomation]::KeyUp(${virtualKey})`).join('\n')}
    `);
  }

  private async pressSingleKey(keyName: string): Promise<void> {
    const virtualKey = this.resolveVirtualKey(keyName);
    await this.runPowerShellAutomation(`
      [KeyboardAutomation]::KeyDown(${virtualKey})
      Start-Sleep -Milliseconds 40
      [KeyboardAutomation]::KeyUp(${virtualKey})
    `);
  }

  private async openApplication(applicationName: string): Promise<void> {
    if (applicationName.trim().length === 0) {
      throw new Error('Cannot open an application without an app name.');
    }

    await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      `Start-Process ${JSON.stringify(applicationName)}`
    ]);
  }

  private async scroll(direction: NonNullable<WorkflowStep['direction']>, amount: number): Promise<void> {
    const normalizedAmount = Math.max(1, Math.min(20, Math.round(amount))) * 120;
    const wheelDelta = direction === 'up' || direction === 'left' ? normalizedAmount : -normalizedAmount;
    const eventFlag = direction === 'left' || direction === 'right' ? 0x01000 : 0x0800;
    await this.runPowerShellAutomation(`[MouseAutomation]::MouseEvent(${eventFlag}, 0, 0, ${wheelDelta}, 0)`);
  }

  private resolveVirtualKey(keyName: string): number {
    const normalizedKeyName = keyName.trim().toLowerCase();
    const mappedVirtualKey = virtualKeyMap[normalizedKeyName];
    if (mappedVirtualKey !== undefined) {
      return mappedVirtualKey;
    }

    if (/^[a-z]$/.test(normalizedKeyName)) {
      return normalizedKeyName.toUpperCase().charCodeAt(0);
    }

    if (/^[0-9]$/.test(normalizedKeyName)) {
      return normalizedKeyName.charCodeAt(0);
    }

    throw new Error(`Unsupported key: ${keyName}`);
  }

  private pointFromNormalizedBox(normalizedBox2D: NormalizedBox2D | undefined): { x: number; y: number } | undefined {
    if (!normalizedBox2D) {
      return undefined;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const screenBounds = primaryDisplay.bounds;
    const centerX = screenBounds.x + ((normalizedBox2D.xMin + normalizedBox2D.xMax) / 2 / 1000) * screenBounds.width;
    const centerY = screenBounds.y + ((normalizedBox2D.yMin + normalizedBox2D.yMax) / 2 / 1000) * screenBounds.height;
    return { x: Math.round(centerX), y: Math.round(centerY) };
  }

  private mouseClickPowerShell(mouseButton: MouseButton): string {
    if (mouseButton === 'right') {
      return '[MouseAutomation]::MouseEvent(0x0008, 0, 0, 0, 0); [MouseAutomation]::MouseEvent(0x0010, 0, 0, 0, 0); Start-Sleep -Milliseconds 80';
    }

    return '[MouseAutomation]::MouseEvent(0x0002, 0, 0, 0, 0); [MouseAutomation]::MouseEvent(0x0004, 0, 0, 0, 0); Start-Sleep -Milliseconds 80';
  }

  private async runPowerShellAutomation(scriptBody: string): Promise<void> {
    const script = `
      Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      public static class MouseAutomation {
        [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
        [DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
        public static void MouseEvent(int flags, int dx, int dy, int data, int extra) { mouse_event(flags, dx, dy, data, extra); }
      }
      public static class KeyboardAutomation {
        [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, int dwFlags, int dwExtraInfo);
        public static void KeyDown(int key) { keybd_event((byte)key, 0, 0, 0); }
        public static void KeyUp(int key) { keybd_event((byte)key, 0, 2, 0); }
      }
"@
      ${scriptBody}
    `;

    await execFileAsync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script]);
  }
}
