import type { ApiSession } from '@/types/api.types';
import type { User } from '@/types/auth.types';

export function validateAuthSession(value: unknown): ApiSession {
  if (typeof value !== 'object' || value === null
    || !('accessToken' in value) || typeof value.accessToken !== 'string' || !value.accessToken.trim()
    || !('refreshToken' in value) || typeof value.refreshToken !== 'string' || !value.refreshToken.trim()
    || !('tokenType' in value) || value.tokenType !== 'Bearer'
    || !('expiresIn' in value) || typeof value.expiresIn !== 'number' || !Number.isFinite(value.expiresIn) || value.expiresIn <= 0
    || !('refreshExpiresIn' in value) || typeof value.refreshExpiresIn !== 'number' || !Number.isFinite(value.refreshExpiresIn) || value.refreshExpiresIn <= 0) {
    throw new Error('A API retornou uma sessão inválida. Tente entrar novamente.');
  }
  return {
    accessToken: value.accessToken, refreshToken: value.refreshToken, tokenType: value.tokenType,
    expiresIn: value.expiresIn, refreshExpiresIn: value.refreshExpiresIn,
  };
}

export function validateAuthProfile(value: unknown): User {
  if (typeof value === 'object' && value !== null && 'active' in value && value.active === false) {
    throw new Error('Seu acesso está inativo. Entre em contato com o responsável pelo seu cadastro.');
  }
  if (typeof value !== 'object' || value === null
    || !('active' in value) || value.active !== true
    || !('id' in value) || typeof value.id !== 'number' || !Number.isSafeInteger(value.id) || value.id <= 0
    || !('name' in value) || typeof value.name !== 'string' || !value.name.trim()
    || !('email' in value) || (value.email !== null && typeof value.email !== 'string')) {
    throw new Error('Não foi possível confirmar seu perfil. Tente entrar novamente.');
  }
  return { id: String(value.id), name: value.name, email: value.email ?? '' };
}
