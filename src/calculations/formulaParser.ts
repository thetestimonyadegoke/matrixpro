/**
 * Formula Parser for Calculated Measures
 * Supports Excel-like syntax with measure references and basic functions
 */

export type TokenType =
  | "NUMBER"
  | "MEASURE_REF"
  | "CALC_REF"
  | "CELL_REF"
  | "FUNCTION"
  | "OPERATOR"
  | "LPAREN"
  | "RPAREN"
  | "COMMA"
  | "COMPARISON"
  | "EOF";

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

export interface ParseError {
  message: string;
  position: number;
}

export type ASTNodeType =
  | "Number"
  | "MeasureRef"
  | "CalcRef"
  | "CellRef"
  | "BinaryOp"
  | "UnaryOp"
  | "FunctionCall"
  | "Conditional";

export interface ASTNode {
  type: ASTNodeType;
  value?: number | string;
  operator?: string;
  left?: ASTNode;
  right?: ASTNode;
  args?: ASTNode[];
  condition?: ASTNode;
  thenBranch?: ASTNode;
  elseBranch?: ASTNode;
}

const FUNCTIONS = new Set([
  "ABS", "ROUND", "MIN", "MAX", "SUM", "AVG",
  "IF", "COALESCE", "ISNULL", "FLOOR", "CEIL"
]);

const OPERATORS = new Set(["+", "-", "*", "/"]);
const COMPARISONS = new Set(["==", "!=", ">=", "<=", ">", "<"]);

export function tokenize(formula: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < formula.length) {
    const char = formula[pos];

    // Skip whitespace
    if (/\s/.test(char)) {
      pos++;
      continue;
    }

    // Numbers (including decimals)
    if (/[0-9]/.test(char) || (char === "." && /[0-9]/.test(formula[pos + 1] || ""))) {
      let numStr = "";
      const start = pos;
      let hasDecimal = false;
      while (pos < formula.length && /[0-9.]/.test(formula[pos])) {
        // Only allow one decimal point
        if (formula[pos] === ".") {
          if (hasDecimal) break; // Stop at second decimal
          hasDecimal = true;
        }
        numStr += formula[pos];
        pos++;
      }
      tokens.push({ type: "NUMBER", value: numStr, position: start });
      continue;
    }

    // Cell reference @{-1} or @{Column}
    if (char === "@") {
      const start = pos;
      pos++;
      if (formula[pos] === "{") {
        pos++;
        let content = "";
        while (pos < formula.length && formula[pos] !== "}") {
          content += formula[pos];
          pos++;
        }
        if (formula[pos] === "}") {
          pos++;
          tokens.push({ type: "CELL_REF", value: content.trim(), position: start });
        }
      }
      continue;
    }

    // Measure reference [MeasureName]
    if (char === "[") {
      const start = pos;
      pos++;
      let name = "";
      while (pos < formula.length && formula[pos] !== "]") {
        name += formula[pos];
        pos++;
      }
      if (formula[pos] === "]") {
        pos++;
        // Check if it's a calculated measure reference
        if (name.startsWith("Calculated:")) {
          tokens.push({ type: "CALC_REF", value: name.slice(11).trim(), position: start });
        } else {
          tokens.push({ type: "MEASURE_REF", value: name, position: start });
        }
      }
      continue;
    }

    // Function names or keywords
    if (/[A-Za-z_]/.test(char)) {
      let name = "";
      const start = pos;
      while (pos < formula.length && /[A-Za-z0-9_]/.test(formula[pos])) {
        name += formula[pos];
        pos++;
      }
      const upperName = name.toUpperCase();
      if (FUNCTIONS.has(upperName)) {
        tokens.push({ type: "FUNCTION", value: upperName, position: start });
      } else {
        // Treat as measure reference without brackets
        tokens.push({ type: "MEASURE_REF", value: name, position: start });
      }
      continue;
    }

    // Two-character comparison operators
    if (pos + 1 < formula.length) {
      const twoChar = formula.slice(pos, pos + 2);
      if (COMPARISONS.has(twoChar)) {
        tokens.push({ type: "COMPARISON", value: twoChar, position: pos });
        pos += 2;
        continue;
      }
    }

    // Single-character comparison operators
    if (char === ">" || char === "<") {
      tokens.push({ type: "COMPARISON", value: char, position: pos });
      pos++;
      continue;
    }

    // Operators
    if (OPERATORS.has(char)) {
      tokens.push({ type: "OPERATOR", value: char, position: pos });
      pos++;
      continue;
    }

    // Parentheses
    if (char === "(") {
      tokens.push({ type: "LPAREN", value: "(", position: pos });
      pos++;
      continue;
    }
    if (char === ")") {
      tokens.push({ type: "RPAREN", value: ")", position: pos });
      pos++;
      continue;
    }

    // Comma
    if (char === ",") {
      tokens.push({ type: "COMMA", value: ",", position: pos });
      pos++;
      continue;
    }

    // Unknown character - skip
    pos++;
  }

  tokens.push({ type: "EOF", value: "", position: pos });
  return tokens;
}

export class Parser {
  private tokens: Token[];
  private pos: number = 0;
  private errors: ParseError[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private current(): Token {
    return this.tokens[this.pos] || { type: "EOF", value: "", position: -1 };
  }

  private advance(): Token {
    const token = this.current();
    if (token.type !== "EOF") {
      this.pos++;
    }
    return token;
  }

  private expect(type: TokenType): Token | null {
    if (this.current().type === type) {
      return this.advance();
    }
    this.errors.push({
      message: `Expected ${type}, got ${this.current().type}`,
      position: this.current().position,
    });
    return null;
  }

  public parse(): { ast: ASTNode | null; errors: ParseError[] } {
    const ast = this.parseExpression();
    if (this.current().type !== "EOF") {
      this.errors.push({
        message: `Unexpected token: ${this.current().value}`,
        position: this.current().position,
      });
    }
    return { ast, errors: this.errors };
  }

  private parseExpression(): ASTNode | null {
    return this.parseComparison();
  }

  private parseComparison(): ASTNode | null {
    let left = this.parseAddSub();
    if (!left) return null;

    while (this.current().type === "COMPARISON") {
      const op = this.advance().value;
      const right = this.parseAddSub();
      if (!right) return null;
      left = { type: "BinaryOp", operator: op, left, right };
    }

    return left;
  }

  private parseAddSub(): ASTNode | null {
    let left = this.parseMulDiv();
    if (!left) return null;

    while (this.current().type === "OPERATOR" && (this.current().value === "+" || this.current().value === "-")) {
      const op = this.advance().value;
      const right = this.parseMulDiv();
      if (!right) return null;
      left = { type: "BinaryOp", operator: op, left, right };
    }

    return left;
  }

  private parseMulDiv(): ASTNode | null {
    let left = this.parseUnary();
    if (!left) return null;

    while (this.current().type === "OPERATOR" && (this.current().value === "*" || this.current().value === "/")) {
      const op = this.advance().value;
      const right = this.parseUnary();
      if (!right) return null;
      left = { type: "BinaryOp", operator: op, left, right };
    }

    return left;
  }

  private parseUnary(): ASTNode | null {
    if (this.current().type === "OPERATOR" && this.current().value === "-") {
      this.advance();
      const operand = this.parseUnary();
      if (!operand) return null;
      return { type: "UnaryOp", operator: "-", right: operand };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode | null {
    const token = this.current();

    // Number
    if (token.type === "NUMBER") {
      this.advance();
      return { type: "Number", value: parseFloat(token.value) };
    }

    // Measure reference
    if (token.type === "MEASURE_REF") {
      this.advance();
      return { type: "MeasureRef", value: token.value };
    }

    // Calculated measure reference
    if (token.type === "CALC_REF") {
      this.advance();
      return { type: "CalcRef", value: token.value };
    }

    // Cell reference
    if (token.type === "CELL_REF") {
      this.advance();
      return { type: "CellRef", value: token.value };
    }

    // Function call
    if (token.type === "FUNCTION") {
      return this.parseFunctionCall();
    }

    // Parenthesized expression
    if (token.type === "LPAREN") {
      this.advance();
      const expr = this.parseExpression();
      this.expect("RPAREN");
      return expr;
    }

    this.errors.push({
      message: `Unexpected token: ${token.value || token.type}`,
      position: token.position,
    });
    return null;
  }

  private parseFunctionCall(): ASTNode | null {
    const funcName = this.advance().value;

    if (!this.expect("LPAREN")) return null;

    const args: ASTNode[] = [];

    // Handle IF specially
    if (funcName === "IF") {
      const condition = this.parseExpression();
      if (!condition) return null;

      if (this.current().type !== "COMMA") {
        this.errors.push({ message: "IF requires 3 arguments", position: this.current().position });
        return null;
      }
      this.advance();

      const thenBranch = this.parseExpression();
      if (!thenBranch) return null;

      if (this.current().type !== "COMMA") {
        this.errors.push({ message: "IF requires 3 arguments", position: this.current().position });
        return null;
      }
      this.advance();

      const elseBranch = this.parseExpression();
      if (!elseBranch) return null;

      this.expect("RPAREN");

      return {
        type: "Conditional",
        condition,
        thenBranch,
        elseBranch,
      };
    }

    // Regular function arguments
    if (this.current().type !== "RPAREN") {
      const firstArg = this.parseExpression();
      if (firstArg) args.push(firstArg);

      while (this.current().type === "COMMA") {
        this.advance();
        const arg = this.parseExpression();
        if (arg) args.push(arg);
      }
    }

    this.expect("RPAREN");

    return {
      type: "FunctionCall",
      value: funcName,
      args,
    };
  }
}

export function parseFormula(formula: string): { ast: ASTNode | null; errors: ParseError[] } {
  const tokens = tokenize(formula);
  const parser = new Parser(tokens);
  return parser.parse();
}

export function validateFormula(formula: string, availableMeasures: string[]): ParseError[] {
  const { ast, errors } = parseFormula(formula);

  if (errors.length > 0) {
    return errors;
  }

  if (!ast) {
    return [{ message: "Empty formula", position: 0 }];
  }

  // Check for unknown measure references
  const measureSet = new Set(availableMeasures.map(m => m.toLowerCase()));
  const validationErrors: ParseError[] = [];

  function checkMeasureRefs(node: ASTNode): void {
    if (node.type === "MeasureRef" && typeof node.value === "string") {
      if (!measureSet.has(node.value.toLowerCase())) {
        validationErrors.push({
          message: `Unknown measure: ${node.value}`,
          position: 0,
        });
      }
    }
    if (node.left) checkMeasureRefs(node.left);
    if (node.right) checkMeasureRefs(node.right);
    if (node.args) node.args.forEach(checkMeasureRefs);
    if (node.condition) checkMeasureRefs(node.condition);
    if (node.thenBranch) checkMeasureRefs(node.thenBranch);
    if (node.elseBranch) checkMeasureRefs(node.elseBranch);
  }

  checkMeasureRefs(ast);
  return validationErrors;
}
