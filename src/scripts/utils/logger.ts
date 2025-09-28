/**
 * Centralized logging utility with environment-based levels
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

class Logger {
  private currentLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = import.meta.env?.MODE === 'development';
    this.currentLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR;
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.currentLevel <= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.currentLevel <= LogLevel.INFO) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.currentLevel <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.currentLevel <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  // Special methods for common patterns
  debugLog(component: string, message: string, data?: unknown): void {
    if (this.isDevelopment && (window as any).__NEPTINO_DEBUG_LOGS) {
      this.debug(`${component}: ${message}`, data);
    }
  }

  apiError(operation: string, error: unknown): void {
    this.error(`API Error in ${operation}:`, error);
  }
}

export const logger = new Logger();
export default logger;