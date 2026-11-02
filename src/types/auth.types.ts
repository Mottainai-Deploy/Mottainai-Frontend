export interface User {
  id: string;
  name: string;
  email: string;
}

export interface DecodedToken {
  sub: string;
  name?: string;
  email?: string;
  exp: number;
  iat?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user?: User;
}

// Tipo do objeto do autenticação do context
export interface AuthContextData {
  notice?: 'password-changed' | null;
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoggingIn: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export interface AuthProviderProps {
  children: ReactNode;
}

export interface AuthState {
  notice: 'password-changed' | null;
  token: string | null;
  user: User | null;
  isLoggingIn: boolean;
  error: string | null;
}

export type AuthAction =
  | { type: 'login-started' }
  | { type: 'login-succeeded'; token: string; user: User }
  | { type: 'login-failed'; error: string }
  | { type: 'logged-out'; notice?: 'password-changed' }
  | { type: 'error-cleared' };

import type { ReactNode } from 'react';
