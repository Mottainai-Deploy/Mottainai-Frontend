export type AccessibilityPreferences = {
  _versao: 3;
  textScale: number;
  theme: "system" | "light" | "dark";
  contrast: "normal" | "high" | "low";
  saturation: "normal" | "low" | "gray";
  colorVision: "off" | "protanopia" | "deuteranopia" | "tritanopia";
  jargonSupport: boolean;
  font: "default" | "verdana" | "arial" | "lexend" | "andika" | "comic" | "serif";
  spacing: number;
  lineSpacing: number;
  motion: 0 | 25 | 50 | 100;
  border: 0 | 25 | 50 | 100;
  underline: boolean;
  align: boolean;
  targets: boolean;
  cursorColor: "default" | "black" | "white" | "yellow" | "red" | "blue";
  cursorSize: "default" | "large" | "xlarge";
  spotlight: "off" | "lantern" | "ruler";
  rate: 0.75 | 1 | 1.25 | 1.5;
};

export type AccessibilityPreferenceKey = Exclude<keyof AccessibilityPreferences, "_versao">;

export interface AccessibilityWidgetState {
  isOpen: boolean;
  isReading: boolean;
  isPaused: boolean;
  statusMessage: string;
  statusIsError: boolean;
}
