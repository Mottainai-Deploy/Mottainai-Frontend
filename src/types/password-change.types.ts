export interface PasswordChangeDraft { currentPassword: string; newPassword: string; confirmation: string; }
export interface PasswordChangePayload { currentPassword: string; newPassword: string; }
export interface PasswordChangeState {
  values: PasswordChangeDraft;
  status: 'idle' | 'review' | 'saving' | 'error';
  message: string;
}
