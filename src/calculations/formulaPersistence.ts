/**
 * Formula Persistence Manager
 * Handles validation, storage, and retrieval of formulas
 * Ensures data integrity and provides Excel-like formula experience
 */

import { parseFormula, validateFormula, ASTNode, ParseError } from "./formulaParser";

export interface PersistedFormula {
  id: string;
  cellKey: string;
  formula: string;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  version: number;
}

export interface FormulaValidationResult {
  isValid: boolean;
  errors: ParseError[];
  warnings: string[];
  parsed?: ASTNode | null;
}

export interface FormulaStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

class FormulaPersistenceManager {
  private storage: FormulaStorage;
  private storageKey: string;
  private maxFormulas: number;
  private maxFormulaLength: number;

  constructor(
    storage: FormulaStorage = localStorage,
    storageKey: string = "matrixpro_formulas",
    maxFormulas: number = 10000,
    maxFormulaLength: number = 10000
  ) {
    this.storage = storage;
    this.storageKey = storageKey;
    this.maxFormulas = maxFormulas;
    this.maxFormulaLength = maxFormulaLength;
  }

  /**
   * Validate a formula before saving
   * Checks syntax, length, and available measures
   */
  validateFormula(formula: string, availableMeasures: string[] = []): FormulaValidationResult {
    const warnings: string[] = [];

    // Check for empty formula
    if (!formula || formula.trim().length === 0) {
      return {
        isValid: false,
        errors: [{ message: "Formula cannot be empty", position: 0 }],
        warnings,
      };
    }

    // Check formula length
    if (formula.length > this.maxFormulaLength) {
      return {
        isValid: false,
        errors: [{ message: `Formula exceeds maximum length of ${this.maxFormulaLength} characters`, position: 0 }],
        warnings,
      };
    }

    // Check for potential security issues
    const securityIssues = this.checkSecurityIssues(formula);
    if (securityIssues.length > 0) {
      return {
        isValid: false,
        errors: securityIssues.map(msg => ({ message: msg, position: 0 })),
        warnings,
      };
    }

    // Parse and validate
    const { ast, errors } = parseFormula(formula);

    if (errors.length > 0) {
      return {
        isValid: false,
        errors,
        warnings,
        parsed: ast,
      };
    }

    // Validate against available measures if provided
    if (availableMeasures.length > 0) {
      const measureErrors = validateFormula(formula, availableMeasures);
      if (measureErrors.length > 0) {
        return {
          isValid: false,
          errors: measureErrors,
          warnings,
          parsed: ast,
        };
      }
    }

    // Check for common issues
    const commonWarnings = this.checkCommonIssues(formula);
    warnings.push(...commonWarnings);

    return {
      isValid: true,
      errors: [],
      warnings,
      parsed: ast,
    };
  }

  /**
   * Check for potential security issues in formulas
   */
  private checkSecurityIssues(formula: string): string[] {
    const issues: string[] = [];

    // Block dangerous JavaScript patterns
    const dangerousPatterns = [
      /eval\s*\(/i,
      /Function\s*\(/i,
      /setTimeout\s*\(/i,
      /setInterval\s*\(/i,
      /fetch\s*\(/i,
      /XMLHttpRequest/i,
      /document\./i,
      /window\./i,
      /<script/i,
      /javascript:/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(formula)) {
        issues.push(`Formula contains potentially dangerous pattern: ${pattern.source}`);
      }
    }

    return issues;
  }

  /**
   * Check for common issues that might cause problems
   */
  private checkCommonIssues(formula: string): string[] {
    const warnings: string[] = [];

    // Check for unbalanced parentheses
    const openCount = (formula.match(/\(/g) || []).length;
    const closeCount = (formula.match(/\)/g) || []).length;
    if (openCount !== closeCount) {
      warnings.push(`Unbalanced parentheses: ${openCount} opening, ${closeCount} closing`);
    }

    // Check for unbalanced brackets
    const openBrackets = (formula.match(/\[/g) || []).length;
    const closeBrackets = (formula.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      warnings.push(`Unbalanced brackets: ${openBrackets} opening, ${closeBrackets} closing`);
    }

    // Check for empty references
    if (/\[\s*\]/.test(formula)) {
      warnings.push("Empty measure reference [] found");
    }

    // Check for consecutive operators
    if (/[+\-*/]{2,}/.test(formula)) {
      warnings.push("Consecutive operators found");
    }

    // Check for very long formulas (performance warning)
    if (formula.length > 1000) {
      warnings.push("Formula is long and may impact performance");
    }

    return warnings;
  }

  /**
   * Save a formula to persistent storage
   */
  saveFormula(formula: PersistedFormula): FormulaValidationResult {
    // Validate before saving
    const validation = this.validateFormula(formula.formula);
    if (!validation.isValid) {
      return validation;
    }

    try {
      const formulas = this.getAllFormulas();

      // Check if formula already exists
      const existingIndex = formulas.findIndex(f => f.id === formula.id);
      
      const formulaToSave: PersistedFormula = {
        ...formula,
        version: existingIndex >= 0 ? formulas[existingIndex].version + 1 : 1,
        updatedAt: Date.now(),
      };

      if (existingIndex >= 0) {
        formulas[existingIndex] = formulaToSave;
      } else {
        // Check storage limit
        if (formulas.length >= this.maxFormulas) {
          return {
            isValid: false,
            errors: [{ message: `Maximum number of formulas (${this.maxFormulas}) reached`, position: 0 }],
            warnings: validation.warnings,
          };
        }
        formulas.push(formulaToSave);
      }

      this.saveAllFormulas(formulas);
      return { isValid: true, errors: [], warnings: validation.warnings };
    } catch (error) {
      return {
        isValid: false,
        errors: [{ message: `Failed to save formula: ${error instanceof Error ? error.message : String(error)}`, position: 0 }],
        warnings: [],
      };
    }
  }

  /**
   * Get a formula by ID
   */
  getFormula(id: string): PersistedFormula | null {
    const formulas = this.getAllFormulas();
    return formulas.find(f => f.id === id) || null;
  }

  /**
   * Get a formula by cell key
   */
  getFormulaByCellKey(cellKey: string): PersistedFormula | null {
    const formulas = this.getAllFormulas();
    return formulas.find(f => f.cellKey === cellKey) || null;
  }

  /**
   * Get all persisted formulas
   */
  getAllFormulas(): PersistedFormula[] {
    try {
      const data = this.storage.getItem(this.storageKey);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * Delete a formula by ID
   */
  deleteFormula(id: string): boolean {
    try {
      const formulas = this.getAllFormulas();
      const filtered = formulas.filter(f => f.id !== id);
      this.saveAllFormulas(filtered);
      return filtered.length < formulas.length;
    } catch {
      return false;
    }
  }

  /**
   * Delete all formulas
   */
  deleteAllFormulas(): void {
    this.storage.removeItem(this.storageKey);
  }

  /**
   * Migrate formulas from old format to new format
   */
  migrateFormulas(): { success: boolean; migrated: number; errors: string[] } {
    const errors: string[] = [];
    let migrated = 0;

    try {
      const formulas = this.getAllFormulas();
      const migratedFormulas: PersistedFormula[] = [];

      for (const formula of formulas) {
        // Add version if missing
        if (!formula.version) {
          formula.version = 1;
        }

        // Add timestamps if missing
        if (!formula.createdAt) {
          formula.createdAt = Date.now();
        }
        if (!formula.updatedAt) {
          formula.updatedAt = formula.createdAt;
        }

        // Validate formula syntax
        const validation = this.validateFormula(formula.formula);
        if (validation.isValid) {
          migratedFormulas.push(formula);
          migrated++;
        } else {
          errors.push(`Formula ${formula.id} failed validation: ${validation.errors[0]?.message}`);
        }
      }

      this.saveAllFormulas(migratedFormulas);
      return { success: true, migrated, errors };
    } catch (error) {
      return {
        success: false,
        migrated,
        errors: [...errors, `Migration failed: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  /**
   * Get formulas that reference a specific measure
   */
  getFormulasReferencingMeasure(measureName: string): PersistedFormula[] {
    const formulas = this.getAllFormulas();
    const pattern = new RegExp(`\\[${measureName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'i');
    return formulas.filter(f => pattern.test(f.formula));
  }

  /**
   * Get formulas that might be affected by a cell change
   */
  getDependentFormulas(cellKey: string): PersistedFormula[] {
    // This is a simplified version - in production, you'd want proper dependency tracking
    const formulas = this.getAllFormulas();
    return formulas.filter(f => f.formula.includes(cellKey) || f.cellKey === cellKey);
  }

  /**
   * Export all formulas to JSON
   */
  exportToJSON(): string {
    const formulas = this.getAllFormulas();
    return JSON.stringify(formulas, null, 2);
  }

  /**
   * Import formulas from JSON
   */
  importFromJSON(json: string): { success: boolean; imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;

    try {
      const formulas: PersistedFormula[] = JSON.parse(json);

      for (const formula of formulas) {
        const result = this.saveFormula(formula);
        if (result.isValid) {
          imported++;
        } else {
          errors.push(`Failed to import formula ${formula.id}: ${result.errors[0]?.message}`);
        }
      }

      return { success: true, imported, errors };
    } catch (error) {
      return {
        success: false,
        imported,
        errors: [`Import failed: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  private saveAllFormulas(formulas: PersistedFormula[]): void {
    this.storage.setItem(this.storageKey, JSON.stringify(formulas));
  }
}

// Singleton instance for global use
let managerInstance: FormulaPersistenceManager | null = null;

export function getFormulaPersistenceManager(): FormulaPersistenceManager {
  if (!managerInstance) {
    managerInstance = new FormulaPersistenceManager();
  }
  return managerInstance;
}

export function initializeFormulaPersistence(storage?: FormulaStorage): FormulaPersistenceManager {
  managerInstance = new FormulaPersistenceManager(storage);
  return managerInstance;
}

export { FormulaPersistenceManager };
export default FormulaPersistenceManager;
