/**
 * API-related TypeScript type definitions
 */

export interface ApiResponse<T = any> {
  data: T | null;
  error: ApiError | null;
  success: boolean;
}

export interface ApiError {
  message: string;
  code: string;
  details?: any;
}

export interface SupabaseResponse<T = any> {
  data: T | null;
  error: {
    message: string;
    details?: string;
    hint?: string;
    code?: string;
  } | null;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}
