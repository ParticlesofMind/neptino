/**
 * Custom error classes for better error handling
 */

export class NeptinoError extends Error {
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'NeptinoError';
    this.code = code;
    this.details = details;
  }
}

export class AuthError extends NeptinoError {
  constructor(message: string, code: string, details?: any) {
    super(message, code, details);
    this.name = 'AuthError';
  }
}

export class ValidationError extends NeptinoError {
  public readonly field: string;

  constructor(message: string, field: string, code: string) {
    super(message, code);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class NetworkError extends NeptinoError {
  constructor(message: string = 'Network error occurred', details?: any) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

export class UnauthorizedError extends NeptinoError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}
