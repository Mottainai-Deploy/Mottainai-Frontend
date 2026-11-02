export interface ConfirmedActionProps {
  label: string;
  effect: string;
  execute: () => Promise<void>;
  verify: () => Promise<void>;
  validate?: () => void;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onUncertainChange?: (uncertain: boolean) => void;
}
export interface ConfirmedActionState {
  stage: 'idle' | 'review' | 'saving' | 'success' | 'error' | 'uncertain';
  message: string;
}
