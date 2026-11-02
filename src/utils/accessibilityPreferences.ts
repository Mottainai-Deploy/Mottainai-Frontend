import type { AccessibilityPreferences } from "@/types/accessibility.types";

export const ACCESSIBILITY_STORAGE_KEY = "acessibility_v1";

export const DEFAULT_ACCESSIBILITY_PREFERENCES: AccessibilityPreferences = {
  _versao: 3,
  textScale: 0,
  theme: "system",
  contrast: "normal",
  saturation: "normal",
  colorVision: "off",
  jargonSupport: true,
  font: "default",
  spacing: 0,
  lineSpacing: 0,
  motion: 0,
  border: 0,
  underline: false,
  align: false,
  targets: false,
  cursorColor: "default",
  cursorSize: "default",
  spotlight: "off",
  rate: 1,
};

function systemPreferences(): AccessibilityPreferences {
  const preferences = { ...DEFAULT_ACCESSIBILITY_PREFERENCES };
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) preferences.motion = 100;
  if (window.matchMedia?.("(prefers-contrast: more)").matches) preferences.contrast = "high";
  return preferences;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function sanitizeAccessibilityPreferences(value: unknown): AccessibilityPreferences {
  if (!isRecord(value) || (value._versao !== 1 && value._versao !== 2 && value._versao !== 3)) return { ...DEFAULT_ACCESSIBILITY_PREFERENCES };
  const defaults = { ...DEFAULT_ACCESSIBILITY_PREFERENCES };
  const candidate = value as Partial<AccessibilityPreferences>;
  const themes = ["system", "light", "dark"] as const;
  const contrasts = ["normal", "high", "low"] as const;
  const saturations = ["normal", "low", "gray"] as const;
  const colorVisions = ["off", "protanopia", "deuteranopia", "tritanopia"] as const;
  const fonts = ["default", "verdana", "arial", "lexend", "andika", "comic", "serif"] as const;
  const motions = [0, 25, 50, 100] as const;
  const cursors = ["default", "black", "white", "yellow", "red", "blue"] as const;
  const cursorSizes = ["default", "large", "xlarge"] as const;
  const spotlights = ["off", "lantern", "ruler"] as const;
  const rates = [0.75, 1, 1.25, 1.5] as const;

  return {
    ...defaults,
    textScale: typeof candidate.textScale === "number" ? Math.max(-1, Math.min(5, Math.round(candidate.textScale))) : defaults.textScale,
    spacing: typeof candidate.spacing === "number" ? Math.max(0, Math.min(2, Math.round(candidate.spacing * 10) / 10)) : defaults.spacing,
    lineSpacing: typeof value.lineSpacing === "number"
      ? Math.max(0, Math.min(2, Math.round(value.lineSpacing * 10) / 10))
      : value.lineSpacing === true ? 2 : defaults.lineSpacing,
    theme: themes.includes(candidate.theme as (typeof themes)[number]) ? candidate.theme as AccessibilityPreferences["theme"] : defaults.theme,
    contrast: contrasts.includes(candidate.contrast as (typeof contrasts)[number]) ? candidate.contrast as AccessibilityPreferences["contrast"] : defaults.contrast,
    saturation: saturations.includes(candidate.saturation as (typeof saturations)[number]) ? candidate.saturation as AccessibilityPreferences["saturation"] : defaults.saturation,
    colorVision: colorVisions.includes(candidate.colorVision as (typeof colorVisions)[number]) ? candidate.colorVision as AccessibilityPreferences["colorVision"] : defaults.colorVision,
    jargonSupport: candidate.jargonSupport !== false,
    font: fonts.includes(candidate.font as (typeof fonts)[number]) ? candidate.font as AccessibilityPreferences["font"] : defaults.font,
    motion: motions.includes(candidate.motion as (typeof motions)[number]) ? candidate.motion as AccessibilityPreferences["motion"] : defaults.motion,
    border: motions.includes(candidate.border as (typeof motions)[number]) ? candidate.border as AccessibilityPreferences["border"] : defaults.border,
    underline: candidate.underline === true,
    align: candidate.align === true,
    targets: candidate.targets === true,
    cursorColor: cursors.includes(candidate.cursorColor as (typeof cursors)[number]) ? candidate.cursorColor as AccessibilityPreferences["cursorColor"] : defaults.cursorColor,
    cursorSize: cursorSizes.includes(candidate.cursorSize as (typeof cursorSizes)[number]) ? candidate.cursorSize as AccessibilityPreferences["cursorSize"] : defaults.cursorSize,
    spotlight: spotlights.includes(candidate.spotlight as (typeof spotlights)[number]) ? candidate.spotlight as AccessibilityPreferences["spotlight"] : defaults.spotlight,
    rate: rates.includes(candidate.rate as (typeof rates)[number]) ? candidate.rate as AccessibilityPreferences["rate"] : defaults.rate,
  };
}

export function loadAccessibilityPreferences(): AccessibilityPreferences {
  try {
    const stored = window.localStorage.getItem(ACCESSIBILITY_STORAGE_KEY);
    return stored === null ? systemPreferences() : sanitizeAccessibilityPreferences(JSON.parse(stored) as unknown);
  } catch {
    return systemPreferences();
  }
}

export function saveAccessibilityPreferences(preferences: AccessibilityPreferences): void {
  try {
    window.localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // O painel segue funcional mesmo quando o navegador bloqueia o armazenamento local.
  }
}
