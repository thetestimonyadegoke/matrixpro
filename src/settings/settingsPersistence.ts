/**
 * Settings Persistence Manager
 * Handles saving, loading, and migration of visual settings
 * Provides Excel-like settings persistence with validation
 */

import { VisualSettings, defaultSettings } from "./settings";
import { validateSettings, ValidationResult, mergeWithDefaults } from "./settingsValidation";

export type SettingsStorageType = "localStorage" | "sessionStorage" | "memory" | "custom";

export interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear?(): void;
}

export interface PersistedSettings {
  settings: VisualSettings;
  version: string;
  timestamp: number;
  source: string;
  checksum: string;
}

export interface SettingsMigration {
  fromVersion: string;
  toVersion: string;
  migrate: (settings: any) => any;
  description: string;
}

export interface SettingsPersistenceConfig {
  storageType: SettingsStorageType;
  storageKey: string;
  version: string;
  enableCompression: boolean;
  maxStorageSize: number; // in bytes
  customStorage?: SettingsStorage;
}

export const DEFAULT_CONFIG: SettingsPersistenceConfig = {
  storageType: "localStorage",
  storageKey: "matrixpro_settings",
  version: "1.0.0",
  enableCompression: false,
  maxStorageSize: 5 * 1024 * 1024, // 5MB
};

// Simple checksum for integrity verification
function generateChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

function createMemoryStorage(): SettingsStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };
}

export class SettingsPersistenceManager {
  private config: SettingsPersistenceConfig;
  private storage: SettingsStorage;
  private currentSettings: VisualSettings;
  private listeners: Set<(settings: VisualSettings) => void>;

  constructor(config: Partial<SettingsPersistenceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.storage = this.initializeStorage();
    this.currentSettings = { ...defaultSettings };
    this.listeners = new Set();
    
    // Load settings on initialization
    this.load();
  }

  private initializeStorage(): SettingsStorage {
    switch (this.config.storageType) {
      case "localStorage":
        if (typeof localStorage !== "undefined") {
          return localStorage;
        }
        console.warn("localStorage not available, falling back to memory storage");
        return createMemoryStorage();
        
      case "sessionStorage":
        if (typeof sessionStorage !== "undefined") {
          return sessionStorage;
        }
        console.warn("sessionStorage not available, falling back to memory storage");
        return createMemoryStorage();
        
      case "memory":
        return createMemoryStorage();
        
      case "custom":
        if (this.config.customStorage) {
          return this.config.customStorage;
        }
        throw new Error("Custom storage specified but not provided");
        
      default:
        return createMemoryStorage();
    }
  }

  /**
   * Save settings to storage with validation
   */
  save(settings: Partial<VisualSettings>): ValidationResult {
    // Merge with current settings
    const merged = { ...this.currentSettings, ...settings };
    
    // Validate
    const validation = validateSettings(merged);
    
    if (!validation.isValid) {
      console.error("Settings validation failed:", validation.errors);
      return validation;
    }

    // Update current settings
    this.currentSettings = validation.sanitized;
    
    // Create persisted structure
    const persisted: PersistedSettings = {
      settings: this.currentSettings,
      version: this.config.version,
      timestamp: Date.now(),
      source: "matrixpro",
      checksum: "",
    };
    
    // Generate checksum
    const dataString = JSON.stringify(persisted.settings);
    persisted.checksum = generateChecksum(dataString);
    
    // Serialize and save
    try {
      const serialized = JSON.stringify(persisted);
      
      // Check size limit
      if (serialized.length > this.config.maxStorageSize) {
        return {
          isValid: false,
          errors: [{
            path: "storage",
            message: `Settings exceed maximum storage size of ${this.config.maxStorageSize} bytes`,
            value: serialized.length,
            constraint: `< ${this.config.maxStorageSize}`,
          }],
          warnings: validation.warnings,
          sanitized: validation.sanitized,
        };
      }
      
      this.storage.setItem(this.config.storageKey, serialized);
      
      // Notify listeners
      this.notifyListeners();
      
      return validation;
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          path: "storage",
          message: `Failed to save settings: ${error instanceof Error ? error.message : String(error)}`,
          value: null,
          constraint: "valid JSON",
        }],
        warnings: validation.warnings,
        sanitized: validation.sanitized,
      };
    }
  }

  /**
   * Load settings from storage
   */
  load(): VisualSettings {
    try {
      const serialized = this.storage.getItem(this.config.storageKey);
      
      if (!serialized) {
        // No saved settings, use defaults
        this.currentSettings = { ...defaultSettings };
        return this.currentSettings;
      }
      
      const persisted: PersistedSettings = JSON.parse(serialized);
      
      // Verify checksum
      const dataString = JSON.stringify(persisted.settings);
      const expectedChecksum = generateChecksum(dataString);
      
      if (persisted.checksum && persisted.checksum !== expectedChecksum) {
        console.warn("Settings checksum mismatch, possible corruption");
        // Still try to load, but warn
      }
      
      // Validate loaded settings
      const validation = validateSettings(persisted.settings);
      
      if (!validation.isValid) {
        console.warn("Loaded settings had errors, applying defaults where needed", validation.errors);
      }
      
      this.currentSettings = validation.sanitized;
      return this.currentSettings;
      
    } catch (error) {
      console.error("Failed to load settings:", error);
      this.currentSettings = { ...defaultSettings };
      return this.currentSettings;
    }
  }

  /**
   * Get current settings
   */
  getSettings(): VisualSettings {
    return { ...this.currentSettings };
  }

  /**
   * Update specific setting
   */
  updateSetting(group: keyof VisualSettings, key: string, value: any): ValidationResult {
    const update: Partial<VisualSettings> = {
      [group]: {
        ...this.currentSettings[group],
        [key]: value,
      },
    } as Partial<VisualSettings>;
    
    return this.save(update);
  }

  /**
   * Update multiple settings
   */
  updateSettings(settings: Partial<VisualSettings>): ValidationResult {
    return this.save(settings);
  }

  /**
   * Reset all settings to defaults
   */
  resetToDefaults(): void {
    this.currentSettings = { ...defaultSettings };
    
    const persisted: PersistedSettings = {
      settings: this.currentSettings,
      version: this.config.version,
      timestamp: Date.now(),
      source: "matrixpro",
      checksum: generateChecksum(JSON.stringify(this.currentSettings)),
    };
    
    this.storage.setItem(this.config.storageKey, JSON.stringify(persisted));
    this.notifyListeners();
  }

  /**
   * Export settings to JSON string
   */
  exportToJSON(): string {
    return JSON.stringify({
      settings: this.currentSettings,
      exportedAt: new Date().toISOString(),
      version: this.config.version,
    }, null, 2);
  }

  /**
   * Import settings from JSON string
   */
  importFromJSON(json: string): ValidationResult {
    try {
      const data = JSON.parse(json);
      
      if (!data.settings) {
        return {
          isValid: false,
          errors: [{
            path: "import",
            message: "Invalid import format: missing settings object",
            value: null,
            constraint: "valid MatrixPro settings export",
          }],
          warnings: [],
          sanitized: this.currentSettings,
        };
      }
      
      return this.save(data.settings);
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          path: "import",
          message: `Failed to parse import JSON: ${error instanceof Error ? error.message : String(error)}`,
          value: null,
          constraint: "valid JSON",
        }],
        warnings: [],
        sanitized: this.currentSettings,
      };
    }
  }

  /**
   * Subscribe to settings changes
   */
  subscribe(callback: (settings: VisualSettings) => void): () => void {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of settings change
   */
  private notifyListeners(): void {
    const settings = this.getSettings();
    this.listeners.forEach(callback => {
      try {
        callback(settings);
      } catch (error) {
        console.error("Settings listener error:", error);
      }
    });
  }

  /**
   * Clear all saved settings
   */
  clear(): void {
    this.storage.removeItem(this.config.storageKey);
    this.currentSettings = { ...defaultSettings };
    this.notifyListeners();
  }

  /**
   * Get storage info
   */
  getStorageInfo(): {
    used: number;
    max: number;
    available: number;
    lastSaved: number | null;
  } {
    const serialized = this.storage.getItem(this.config.storageKey);
    const used = serialized ? serialized.length : 0;
    
    let lastSaved: number | null = null;
    if (serialized) {
      try {
        const persisted: PersistedSettings = JSON.parse(serialized);
        lastSaved = persisted.timestamp;
      } catch {
        // ignore
      }
    }
    
    return {
      used,
      max: this.config.maxStorageSize,
      available: this.config.maxStorageSize - used,
      lastSaved,
    };
  }
}

// Migration system for handling version changes
export class SettingsMigrator {
  private migrations: SettingsMigration[] = [];

  registerMigration(migration: SettingsMigration): void {
    this.migrations.push(migration);
  }

  migrate(settings: any, fromVersion: string): any {
    let currentSettings = { ...settings };
    let currentVersion = fromVersion;

    // Find applicable migrations
    const applicableMigrations = this.migrations.filter(
      m => this.compareVersions(currentVersion, m.fromVersion) >= 0 &&
           this.compareVersions(currentVersion, m.toVersion) < 0
    );

    // Sort by target version
    applicableMigrations.sort((a, b) =>
      this.compareVersions(a.toVersion, b.toVersion)
    );

    // Apply migrations
    for (const migration of applicableMigrations) {
      try {
        currentSettings = migration.migrate(currentSettings);
        currentVersion = migration.toVersion;
        console.log(`Applied settings migration: ${migration.description}`);
      } catch (error) {
        console.error(`Migration failed ${migration.fromVersion} -> ${migration.toVersion}:`, error);
        // Continue with next migration
      }
    }

    return currentSettings;
  }

  private compareVersions(a: string, b: string): number {
    const partsA = a.split(".").map(Number);
    const partsB = b.split(".").map(Number);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const partA = partsA[i] || 0;
      const partB = partsB[i] || 0;

      if (partA < partB) return -1;
      if (partA > partB) return 1;
    }

    return 0;
  }
}

// Predefined migrations
export const DEFAULT_MIGRATIONS: SettingsMigration[] = [
  {
    fromVersion: "0.0.0",
    toVersion: "1.0.0",
    description: "Initial version with manual data settings",
    migrate: (settings: any) => {
      // Ensure manualData exists
      if (!settings.manualData) {
        settings.manualData = {
          notes: "{}",
          edits: "{}",
          rowOrder: "[]",
          colOrder: "[]",
          labelOverrides: "{}",
          locks: "[]",
        };
      }
      return settings;
    },
  },
];

// Singleton instance
let managerInstance: SettingsPersistenceManager | null = null;

export function getSettingsPersistenceManager(
  config?: Partial<SettingsPersistenceConfig>
): SettingsPersistenceManager {
  if (!managerInstance) {
    managerInstance = new SettingsPersistenceManager(config);
  }
  return managerInstance;
}

export function initializeSettingsPersistence(
  config: Partial<SettingsPersistenceConfig>
): SettingsPersistenceManager {
  managerInstance = new SettingsPersistenceManager(config);
  return managerInstance;
}

export function resetSettingsPersistenceManager(): void {
  managerInstance = null;
}
