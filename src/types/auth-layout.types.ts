import type { ReactNode } from 'react';

export type AuthArtworkVariant =
  | 'login'
  | 'recovery-email'
  | 'recovery-code'
  | 'new-password'
  | 'password-updated'
  | 'invalid-link';

export interface AuthLayoutProps {
  title: string;
  description: string;
  artworkVariant: AuthArtworkVariant;
  children: ReactNode;
}
