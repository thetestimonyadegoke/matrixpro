/**
 * Validation Engine
 * Validates writeback changes against rules
 */

import {
  ValidationRule,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  WritebackChange,
  ValidationRuleConfig,
} from "./types";

export class ValidationEngine {
  private rules: ValidationRule[] = [];

  setRules(rules: ValidationRule[]): void {
    this.rules = rules;
  }

  getRules(): ValidationRule[] {
    return [...this.rules];
  }

  addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter((r) => r.id !== ruleId);
  }

  validateChanges(changes: WritebackChange[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (const change of changes) {
      for (const rule of this.rules) {
        if (!rule.enabled) continue;

        const result = this.validateChange(change, rule);

        if (result === "error") {
          errors.push({
            changeId: change.id,
            ruleId: rule.id,
            message: rule.errorMessage,
            severity: "error",
          });
        } else if (result === "warning") {
          warnings.push({
            changeId: change.id,
            ruleId: rule.id,
            message: rule.errorMessage,
            severity: "warning",
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateChange(
    change: WritebackChange,
    rule: ValidationRule
  ): "valid" | "warning" | "error" {
    const { type, config } = rule;
    const { newValue } = change;

    switch (type) {
      case "required":
        return newValue !== null && newValue !== undefined ? "valid" : "error";

      case "min":
        if (newValue === null || config.min === undefined) return "valid";
        return newValue >= config.min ? "valid" : "error";

      case "max":
        if (newValue === null || config.max === undefined) return "valid";
        return newValue <= config.max ? "valid" : "error";

      case "range":
        if (newValue === null || config.min === undefined || config.max === undefined) {
          return "valid";
        }
        return newValue >= config.min && newValue <= config.max ? "valid" : "error";

      case "dataType":
        return this.validateDataType(newValue, config);

      case "regex":
        if (newValue === null || !config.regex) return "valid";
        return new RegExp(config.regex).test(String(newValue)) ? "valid" : "error";

      case "custom":
        if (!config.customFormula) return "valid";
        return this.validateCustomRule(change, config);

      default:
        return "valid";
    }
  }

  private validateDataType(
    value: number | null,
    config: ValidationRuleConfig
  ): "valid" | "error" {
    if (value === null) return "valid";

    switch (config.dataType) {
      case "number":
        return typeof value === "number" && !isNaN(value) ? "valid" : "error";
      case "string":
        return "valid"; // Numbers can be strings
      default:
        return "valid";
    }
  }

  private validateCustomRule(
    change: WritebackChange,
    config: ValidationRuleConfig
  ): "valid" | "error" {
    // In a real implementation, this would evaluate a custom formula
    // For now, return valid
    return "valid";
  }

  // Predefined validation presets
  static createRequiredRule(field: string): ValidationRule {
    return {
      id: `required-${field}`,
      name: `${field} Required`,
      type: "required",
      config: {},
      enabled: true,
      errorMessage: `${field} cannot be empty`,
    };
  }

  static createRangeRule(
    field: string,
    min: number,
    max: number
  ): ValidationRule {
    return {
      id: `range-${field}`,
      name: `${field} Range`,
      type: "range",
      config: { min, max },
      enabled: true,
      errorMessage: `${field} must be between ${min} and ${max}`,
    };
  }

  static createPositiveNumberRule(field: string): ValidationRule {
    return {
      id: `positive-${field}`,
      name: `${field} Positive`,
      type: "min",
      config: { min: 0 },
      enabled: true,
      errorMessage: `${field} must be positive`,
    };
  }

  static createPercentageRule(field: string): ValidationRule {
    return {
      id: `percentage-${field}`,
      name: `${field} Percentage`,
      type: "range",
      config: { min: 0, max: 100 },
      enabled: true,
      errorMessage: `${field} must be between 0% and 100%`,
    };
  }
}
