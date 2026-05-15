import { app, safeStorage } from 'electron';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

interface StoredConfigurationFile {
  encryptedGeminiApiKey?: string;
  isAutopilotEnabled?: boolean;
}

const configurationFileName = 'tiptour-windows-config.json';

export class ConfigurationStore {
  private readonly configurationFilePath: string;

  constructor() {
    this.configurationFilePath = path.join(app.getPath('userData'), configurationFileName);
  }

  async readGeminiApiKey(): Promise<string | undefined> {
    const workerProvidedGeminiApiKey = process.env.TIPTOUR_GEMINI_API_KEY;
    if (workerProvidedGeminiApiKey && workerProvidedGeminiApiKey.trim().length > 0) {
      return workerProvidedGeminiApiKey.trim();
    }

    const configurationFile = await this.readConfigurationFile();
    if (!configurationFile.encryptedGeminiApiKey) {
      return undefined;
    }

    try {
      return safeStorage.decryptString(Buffer.from(configurationFile.encryptedGeminiApiKey, 'base64'));
    } catch {
      return undefined;
    }
  }

  async saveGeminiApiKey(geminiApiKey: string): Promise<void> {
    const trimmedGeminiApiKey = geminiApiKey.trim();
    if (trimmedGeminiApiKey.length === 0) {
      throw new Error('Gemini API key cannot be empty.');
    }

    const configurationFile = await this.readConfigurationFile();
    const encryptedGeminiApiKey = safeStorage.encryptString(trimmedGeminiApiKey).toString('base64');
    await this.writeConfigurationFile({
      ...configurationFile,
      encryptedGeminiApiKey
    });
  }

  async clearGeminiApiKey(): Promise<void> {
    const configurationFile = await this.readConfigurationFile();
    delete configurationFile.encryptedGeminiApiKey;
    await this.writeConfigurationFile(configurationFile);
  }

  async readAutopilotEnabled(): Promise<boolean> {
    const configurationFile = await this.readConfigurationFile();
    return configurationFile.isAutopilotEnabled ?? true;
  }

  async saveAutopilotEnabled(isAutopilotEnabled: boolean): Promise<void> {
    const configurationFile = await this.readConfigurationFile();
    await this.writeConfigurationFile({
      ...configurationFile,
      isAutopilotEnabled
    });
  }

  async deleteConfiguration(): Promise<void> {
    await rm(this.configurationFilePath, { force: true });
  }

  private async readConfigurationFile(): Promise<StoredConfigurationFile> {
    try {
      const fileContents = await readFile(this.configurationFilePath, 'utf8');
      return JSON.parse(fileContents) as StoredConfigurationFile;
    } catch {
      return {};
    }
  }

  private async writeConfigurationFile(configurationFile: StoredConfigurationFile): Promise<void> {
    await mkdir(path.dirname(this.configurationFilePath), { recursive: true });
    await writeFile(this.configurationFilePath, JSON.stringify(configurationFile, null, 2), 'utf8');
  }
}
