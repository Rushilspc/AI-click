declare module 'electron' {
  export const app: {
    setName(name: string): void;
    disableHardwareAcceleration(): void;
    requestSingleInstanceLock(): boolean;
    whenReady(): Promise<void>;
    on(eventName: string, listener: (...args: any[]) => void): void;
    quit(): void;
    getPath(name: string): string;
  };
  export class BrowserWindow {
    constructor(options: Record<string, unknown>);
    loadFile(filePath: string): Promise<void>;
    on(eventName: string, listener: (...args: any[]) => void): void;
    hide(): void;
    show(): void;
    focus(): void;
    getBounds(): { width: number; height: number };
    setPosition(x: number, y: number): void;
    webContents: { send(channel: string, ...args: unknown[]): void };
  }
  export const globalShortcut: { register(accelerator: string, callback: () => void): boolean; unregisterAll(): void };
  export const ipcMain: { handle(channel: string, listener: (event: unknown, ...args: any[]) => unknown): void };
  export const ipcRenderer: {
    invoke(channel: string, ...args: unknown[]): Promise<any>;
    on(channel: string, listener: (...args: any[]) => void): void;
    off(channel: string, listener: (...args: any[]) => void): void;
  };
  export const contextBridge: { exposeInMainWorld(apiKey: string, api: unknown): void };
  export const Menu: { buildFromTemplate(template: Array<Record<string, unknown>>): unknown };
  export const nativeImage: { createFromDataURL(dataUrl: string): unknown };
  export class Tray {
    constructor(image: unknown);
    setToolTip(toolTip: string): void;
    setContextMenu(menu: unknown): void;
    on(eventName: string, listener: (...args: any[]) => void): void;
    getBounds(): { x: number; y: number; width: number; height: number };
  }
  export const safeStorage: { encryptString(value: string): Buffer; decryptString(value: Buffer): string };
  export const shell: { openExternal(url: string): Promise<void> };
  export const clipboard: { writeText(text: string): void };
  export const screen: { getPrimaryDisplay(): { bounds: { x: number; y: number; width: number; height: number } } };
  export namespace Electron {
    interface IpcRendererEvent {}
  }
}

declare module 'ws' {
  export default class WebSocket {
    static OPEN: number;
    readonly readyState: number;
    constructor(url: URL | string);
    once(eventName: string, listener: (...args: any[]) => void): void;
    on(eventName: string, listener: (...args: any[]) => void): void;
    send(data: string): void;
    close(): void;
  }
}

declare module 'screenshot-desktop' {
  interface ScreenshotDisplay {
    id: string | number;
  }
  interface ScreenshotOptions {
    format?: 'jpg' | 'png';
    screen?: string | number;
  }
  interface ScreenshotFunction {
    (options?: ScreenshotOptions): Promise<Buffer>;
    listDisplays(): Promise<ScreenshotDisplay[]>;
  }
  const screenshot: ScreenshotFunction;
  export default screenshot;
}

declare const process: { env: Record<string, string | undefined> };
declare const Buffer: { from(value: string, encoding?: string): Buffer };
type Buffer = { toString(encoding?: string): string };

declare namespace Electron {
  interface IpcRendererEvent {}
}

declare module 'node:child_process' {
  export function execFile(file: string, args: string[], callback: (error: Error | null, stdout: string, stderr: string) => void): void;
}

declare module 'node:util' {
  export function promisify<T extends (...args: any[]) => any>(fn: T): (...args: any[]) => Promise<any>;
}

declare module 'node:fs/promises' {
  export function mkdir(path: string, options?: Record<string, unknown>): Promise<void>;
  export function readFile(path: string, encoding: string): Promise<string>;
  export function rm(path: string, options?: Record<string, unknown>): Promise<void>;
  export function writeFile(path: string, data: string, encoding: string): Promise<void>;
  export function cp(source: string, destination: string, options?: Record<string, unknown>): Promise<void>;
}

declare module 'node:path' {
  const path: {
    dirname(filePath: string): string;
    join(...paths: string[]): string;
  };
  export default path;
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string;
}
