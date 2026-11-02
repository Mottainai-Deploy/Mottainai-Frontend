export interface ApiSession {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  authenticated?: boolean;
}

export interface ApiPage<T> {
  number?: number;
  content: T[];
  last: boolean;
  totalElements: number;
}

export interface ApiProfile {
  id: number;
  name: string;
  email: string | null;
  role: string;
  storeId: number;
  active: boolean;
}
