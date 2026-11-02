import type { PasswordChangeDraft, PasswordChangePayload } from '@/types/password-change.types';

export function passwordChangePayload(values: PasswordChangeDraft): PasswordChangePayload {
  if (!values.currentPassword.trim()) throw new Error('Informe a senha operacional atual.');
  if (!values.newPassword.trim() || values.newPassword.length < 8 || values.newPassword.length > 72 || new TextEncoder().encode(values.newPassword).length > 72) throw new Error('A nova senha deve ter de 8 a 72 caracteres e ocupar até 72 bytes.');
  if (!/\p{Lu}/u.test(values.newPassword) || !/\p{Ll}/u.test(values.newPassword) || !/\p{Nd}/u.test(values.newPassword) || !/[^\p{L}\p{N}\s]/u.test(values.newPassword)) throw new Error('Inclua letra maiúscula, minúscula, número e símbolo na nova senha.');
  if (values.newPassword !== values.confirmation) throw new Error('A confirmação deve ser igual à nova senha.');
  return { currentPassword: values.currentPassword, newPassword: values.newPassword };
}
