export interface SpeechOptions {
  language: string;
  rate: number;
  onStarted?: () => void;
}

export type SpeechResult =
  | { status: "completed" }
  | { status: "cancelled" }
  | { status: "error"; message: string };

export interface ActiveSpeechRun {
  id: number;
  cancel: () => void;
  pause: () => void;
  resume: () => void;
  updateRate: (rate: number) => void;
  promise: Promise<SpeechResult>;
}
