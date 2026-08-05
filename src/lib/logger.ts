import { env } from "@/lib/env";

export type LogContext = Record<string, unknown>;
export type LogLevel = "debug" | "info" | "warn" | "error";

const priorities: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(level: LogLevel): boolean {
  return priorities[level] >= priorities[env.LOG_LEVEL];
}

function write(level: LogLevel, message: string, context: LogContext): void {
  if (!shouldLog(level)) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  const output = JSON.stringify(entry);
  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(context: LogContext): Logger;
}

export function createLogger(scope: string, inheritedContext: LogContext = {}): Logger {
  const baseContext = { scope, ...inheritedContext };

  return {
    debug: (message, context = {}) => write("debug", message, { ...baseContext, ...context }),
    info: (message, context = {}) => write("info", message, { ...baseContext, ...context }),
    warn: (message, context = {}) => write("warn", message, { ...baseContext, ...context }),
    error: (message, context = {}) => write("error", message, { ...baseContext, ...context }),
    child: (context) => createLogger(scope, { ...baseContext, ...context }),
  };
}

export const logger = createLogger("app");
