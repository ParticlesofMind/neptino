/**
 * User-related TypeScript type definitions
 */

export interface User {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'student' | 'teacher' | 'administrator';

export interface CreateUserData {
  firstName: string;
  lastName?: string;
  email: string;
  role: UserRole;
  password: string;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: any;
  error?: string;
  message?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    role?: UserRole;
  };
}

export interface UserSession {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}
