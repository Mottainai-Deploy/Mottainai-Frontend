export interface AccessActivationDraft {
  email: string;
  firebasePassword: string;
  newPassword: string;
  confirmation: string;
}
export interface FirebaseIdentitySummary {
  email: string;
  uid: string;
}
export interface AccessActivationState {
  draft: AccessActivationDraft;
  status: 'idle' | 'saving' | 'success' | 'error';
  message: string;
}
