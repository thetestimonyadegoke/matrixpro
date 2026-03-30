/**
 * Settings Module - Index
 * Exports all settings functionality including validation, persistence, and metadata
 */

// Core settings types and defaults
export * from "./settings";

// Settings validation
export {
  validateSettings,
  validateSetting,
  mergeWithDefaults,
  resetSettingsToDefaults,
  getSettingMetadata,
  getSettingsByCategory,
  exportSettingsSchema,
  settingsMetadata,
} from "./settingsValidation";

export type {
  ValidationError,
  ValidationResult,
  SettingMetadata,
  SettingsMetadata,
} from "./settingsValidation";

// Settings persistence
export {
  SettingsPersistenceManager,
  SettingsMigrator,
  getSettingsPersistenceManager,
  initializeSettingsPersistence,
  resetSettingsPersistenceManager,
  DEFAULT_CONFIG,
  DEFAULT_MIGRATIONS,
} from "./settingsPersistence";

export type {
  SettingsStorage,
  SettingsStorageType,
  PersistedSettings,
  SettingsMigration,
  SettingsPersistenceConfig,
} from "./settingsPersistence";
