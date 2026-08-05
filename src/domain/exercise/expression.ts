export type ExpressionNode =
  | { kind: "number"; value: number }
  | { kind: "variable"; name: string }
  | { kind: "unary"; operator: "+" | "-"; operand: ExpressionNode }
  | {
      kind: "binary";
      operator: "+" | "-" | "*" | "/" | "^";
      left: ExpressionNode;
      right: ExpressionNode;
    }
  | { kind: "function"; name: string; args: ExpressionNode[] };

export class ExpressionSyntaxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpressionSyntaxError";
  }
}

interface Token {
  kind: "number" | "identifier" | "operator" | "left-paren" | "right-paren" | "comma";
  value: string;
}

const supportedFunctions = new Set(["abs", "sqrt", "sin", "cos", "tan", "ln", "log", "exp"]);

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const character = source[index];
    if (/\s/.test(character)) {
      index += 1;
      continue;
    }
    const remainder = source.slice(index);
    const number = remainder.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
    if (number) {
      tokens.push({ kind: "number", value: number[0] });
      index += number[0].length;
      continue;
    }
    const identifier = remainder.match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (identifier) {
      tokens.push({ kind: "identifier", value: identifier[0] });
      index += identifier[0].length;
      continue;
    }
    if ("+-*/^".includes(character)) {
      tokens.push({ kind: "operator", value: character });
      index += 1;
      continue;
    }
    if (character === "(") tokens.push({ kind: "left-paren", value: character });
    else if (character === ")") tokens.push({ kind: "right-paren", value: character });
    else if (character === ",") tokens.push({ kind: "comma", value: character });
    else throw new ExpressionSyntaxError(`Unsupported character '${character}'.`);
    index += 1;
  }

  const withImplicitMultiplication: Token[] = [];
  for (const token of tokens) {
    const previous = withImplicitMultiplication.at(-1);
    const previousCanEnd =
      previous?.kind === "number" ||
      previous?.kind === "identifier" ||
      previous?.kind === "right-paren";
    const currentCanStart =
      token.kind === "number" || token.kind === "identifier" || token.kind === "left-paren";
    const isFunctionCall = previous?.kind === "identifier" && token.kind === "left-paren";
    if (previousCanEnd && currentCanStart && !isFunctionCall) {
      withImplicitMultiplication.push({ kind: "operator", value: "*" });
    }
    withImplicitMultiplication.push(token);
  }
  return withImplicitMultiplication;
}

class Parser {
  private index = 0;

  constructor(private readonly tokens: readonly Token[]) {}

  parse(): ExpressionNode {
    if (!this.tokens.length) throw new ExpressionSyntaxError("An expression cannot be empty.");
    const expression = this.parseAdditive();
    if (this.index < this.tokens.length) {
      throw new ExpressionSyntaxError(`Unexpected token '${this.tokens[this.index].value}'.`);
    }
    return expression;
  }

  private current(): Token | undefined {
    return this.tokens[this.index];
  }

  private take(kind?: Token["kind"], value?: string): Token {
    const token = this.current();
    if (!token || (kind && token.kind !== kind) || (value && token.value !== value)) {
      throw new ExpressionSyntaxError(
        value ? `Expected '${value}'.` : `Expected ${kind ?? "a token"}.`,
      );
    }
    this.index += 1;
    return token;
  }

  private parseAdditive(): ExpressionNode {
    let left = this.parseMultiplicative();
    while (this.current()?.kind === "operator" && ["+", "-"].includes(this.current()!.value)) {
      const operator = this.take("operator").value as "+" | "-";
      left = { kind: "binary", operator, left, right: this.parseMultiplicative() };
    }
    return left;
  }

  private parseMultiplicative(): ExpressionNode {
    let left = this.parseUnary();
    while (this.current()?.kind === "operator" && ["*", "/"].includes(this.current()!.value)) {
      const operator = this.take("operator").value as "*" | "/";
      left = { kind: "binary", operator, left, right: this.parseUnary() };
    }
    return left;
  }

  private parseUnary(): ExpressionNode {
    if (this.current()?.kind === "operator" && ["+", "-"].includes(this.current()!.value)) {
      const operator = this.take("operator").value as "+" | "-";
      return { kind: "unary", operator, operand: this.parseUnary() };
    }
    return this.parsePower();
  }

  private parsePower(): ExpressionNode {
    const left = this.parsePrimary();
    if (this.current()?.kind === "operator" && this.current()!.value === "^") {
      this.take("operator", "^");
      return { kind: "binary", operator: "^", left, right: this.parseUnary() };
    }
    return left;
  }

  private parsePrimary(): ExpressionNode {
    const token = this.current();
    if (!token) throw new ExpressionSyntaxError("The expression ends unexpectedly.");
    if (token.kind === "number") {
      this.take();
      const value = Number(token.value);
      if (!Number.isFinite(value)) throw new ExpressionSyntaxError("The number is not finite.");
      return { kind: "number", value };
    }
    if (token.kind === "identifier") {
      this.take();
      if (this.current()?.kind !== "left-paren") {
        if (token.value === "pi") return { kind: "number", value: Math.PI };
        if (token.value === "e") return { kind: "number", value: Math.E };
        return { kind: "variable", name: token.value };
      }
      if (!supportedFunctions.has(token.value)) {
        throw new ExpressionSyntaxError(`Function '${token.value}' is not allowed.`);
      }
      this.take("left-paren");
      const args: ExpressionNode[] = [];
      if (this.current()?.kind !== "right-paren") {
        args.push(this.parseAdditive());
        while (this.current()?.kind === "comma") {
          this.take("comma");
          args.push(this.parseAdditive());
        }
      }
      this.take("right-paren");
      if (args.length !== 1)
        throw new ExpressionSyntaxError(`${token.value} expects one argument.`);
      return { kind: "function", name: token.value, args };
    }
    if (token.kind === "left-paren") {
      this.take("left-paren");
      const expression = this.parseAdditive();
      this.take("right-paren");
      return expression;
    }
    throw new ExpressionSyntaxError(`Unexpected token '${token.value}'.`);
  }
}

export function parseMathematicalExpression(source: string): ExpressionNode {
  return new Parser(tokenize(source)).parse();
}

export function evaluateMathematicalExpression(
  expression: ExpressionNode,
  variables: Readonly<Record<string, number>> = {},
): number {
  switch (expression.kind) {
    case "number":
      return expression.value;
    case "variable":
      if (!(expression.name in variables)) {
        throw new ExpressionSyntaxError(`No value was supplied for '${expression.name}'.`);
      }
      return variables[expression.name];
    case "unary": {
      const value = evaluateMathematicalExpression(expression.operand, variables);
      return expression.operator === "-" ? -value : value;
    }
    case "binary": {
      const left = evaluateMathematicalExpression(expression.left, variables);
      const right = evaluateMathematicalExpression(expression.right, variables);
      if (expression.operator === "/" && right === 0)
        throw new ExpressionSyntaxError("Division by zero.");
      const value =
        expression.operator === "+"
          ? left + right
          : expression.operator === "-"
            ? left - right
            : expression.operator === "*"
              ? left * right
              : expression.operator === "/"
                ? left / right
                : Math.pow(left, right);
      if (!Number.isFinite(value)) throw new ExpressionSyntaxError("The expression is not finite.");
      return value;
    }
    case "function": {
      const value = evaluateMathematicalExpression(expression.args[0], variables);
      const result =
        expression.name === "abs"
          ? Math.abs(value)
          : expression.name === "sqrt"
            ? Math.sqrt(value)
            : expression.name === "sin"
              ? Math.sin(value)
              : expression.name === "cos"
                ? Math.cos(value)
                : expression.name === "tan"
                  ? Math.tan(value)
                  : expression.name === "ln"
                    ? Math.log(value)
                    : expression.name === "log"
                      ? Math.log10(value)
                      : Math.exp(value);
      if (!Number.isFinite(result))
        throw new ExpressionSyntaxError("The function result is not finite.");
      return result;
    }
  }
}

export function expressionVariables(expression: ExpressionNode): readonly string[] {
  const names = new Set<string>();
  function visit(node: ExpressionNode): void {
    if (node.kind === "variable") names.add(node.name);
    if (node.kind === "unary") visit(node.operand);
    if (node.kind === "binary") {
      visit(node.left);
      visit(node.right);
    }
    if (node.kind === "function") node.args.forEach(visit);
  }
  visit(expression);
  return [...names];
}

export function areEquivalentExpressions(
  leftSource: string,
  rightSource: string,
  declaredVariables: readonly string[] = [],
): boolean {
  let left: ExpressionNode;
  let right: ExpressionNode;
  try {
    left = parseMathematicalExpression(leftSource);
    right = parseMathematicalExpression(rightSource);
  } catch {
    return false;
  }
  const variables = [
    ...new Set([...expressionVariables(left), ...expressionVariables(right), ...declaredVariables]),
  ];
  if (!variables.length) {
    try {
      return (
        Math.abs(evaluateMathematicalExpression(left) - evaluateMathematicalExpression(right)) <
        1e-10
      );
    } catch {
      return false;
    }
  }
  const samples = [-3.25, -1.5, -0.75, 0.5, 1.25, 2.5, 4.75];
  let compared = 0;
  for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex += 1) {
    const values = Object.fromEntries(
      variables.map((name, variableIndex) => [
        name,
        samples[(sampleIndex + variableIndex) % samples.length],
      ]),
    );
    try {
      const leftValue = evaluateMathematicalExpression(left, values);
      const rightValue = evaluateMathematicalExpression(right, values);
      const scale = Math.max(1, Math.abs(leftValue), Math.abs(rightValue));
      if (Math.abs(leftValue - rightValue) > 1e-8 * scale) return false;
      compared += 1;
    } catch {
      // A sample can be outside a function's domain or hit a zero denominator.
    }
  }
  return compared >= Math.max(2, variables.length);
}
