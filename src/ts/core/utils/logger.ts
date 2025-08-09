/**
 * Security logging utilities
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  SECURITY = 'security'
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  userId?: string;
  action?: string;
  details?: any;
}

export class Logger {
  private static instance: Logger;
  private isDevelopment = import.meta.env.DEV;
  private context: string;

  constructor(context: string = 'App') {
    this.context = context;
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    userId?: string,
    action?: string,
    details?: any
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      userId,
      action,
      details
    };
  }

  private log(entry: LogEntry): void {
    const contextualMessage = `[${this.context}] ${entry.message}`;
    
    if (this.isDevelopment) {
      console.log(`[${entry.level.toUpperCase()}] ${entry.timestamp}: ${contextualMessage}`, entry.details || '');
    }

    // In production, you would send logs to a logging service
    // For now, we'll just store security events locally
    if (entry.level === LogLevel.SECURITY) {
      this.storeSecurityEvent(entry);
    }
  }

  private storeSecurityEvent(entry: LogEntry): void {
    // Store security events for audit trail
    const securityEvents = JSON.parse(localStorage.getItem('neptino_security_logs') || '[]');
    securityEvents.push(entry);
    
    // Keep only last 100 events to prevent storage bloat
    if (securityEvents.length > 100) {
      securityEvents.splice(0, securityEvents.length - 100);
    }
    
    localStorage.setItem('neptino_security_logs', JSON.stringify(securityEvents));
  }

  public debug(message: string, details?: any): void {
    this.log(this.createLogEntry(LogLevel.DEBUG, message, undefined, undefined, details));
  }

  public info(message: string, details?: any): void {
    this.log(this.createLogEntry(LogLevel.INFO, message, undefined, undefined, details));
  }

  public warn(message: string, details?: any): void {
    this.log(this.createLogEntry(LogLevel.WARN, message, undefined, undefined, details));
  }

  public error(message: string, details?: any): void {
    this.log(this.createLogEntry(LogLevel.ERROR, message, undefined, undefined, details));
  }

  public security(message: string, userId?: string, action?: string, details?: any): void {
    this.log(this.createLogEntry(LogLevel.SECURITY, message, userId, action, details));
  }
}

export const logger = Logger.getInstance();
