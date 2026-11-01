import { lazy, Suspense, useCallback, useEffect, useId, useRef, useState } from "react";
import universalAccessImage from "@/assets/icons/universal-access.svg";
import type { AccessibilityPreferences, AccessibilityPreferenceKey } from "@/types/accessibility.types";
import { cancelSpeech } from "@/services/speechService";
import type { AccessibilityPanelProps } from "@/types/accessibility-widget.types";
import { DEFAULT_ACCESSIBILITY_PREFERENCES, loadAccessibilityPreferences, saveAccessibilityPreferences } from "@/utils/accessibilityPreferences";
import { loadModuleWithMinimumDuration } from "@/utils/loadModuleWithMinimumDuration";
import styles from "./style.module.css";

const loadAccessibilityPanel = () => import("./AccessibilityPanel");
const AccessibilityPanel = lazy(() => loadModuleWithMinimumDuration(loadAccessibilityPanel));

function FloatingButton() {
  const id = useId();
  const panelId = `${id}-panel`;
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(loadAccessibilityPreferences);
  const [{ isOpen, shouldRenderPanel }, setPanelVisibility] = useState({
    isOpen: false,
    shouldRenderPanel: false,
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  const updatePreference = useCallback(<K extends AccessibilityPreferenceKey>(key: K, value: AccessibilityPreferences[K]) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences({ ...DEFAULT_ACCESSIBILITY_PREFERENCES });
  }, []);

  const closePanel = useCallback(() => {
    setPanelVisibility((current) => ({ ...current, isOpen: false }));
    triggerRef.current?.focus();
  }, []);

  const openPanel = useCallback(() => {
    setPanelVisibility({ isOpen: true, shouldRenderPanel: true });
  }, []);

  useEffect(() => {
    if (isOpen || !shouldRenderPanel) return;
    const timeoutId = window.setTimeout(() => {
      setPanelVisibility((current) => ({ ...current, shouldRenderPanel: false }));
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen, shouldRenderPanel]);

  useEffect(() => {
    saveAccessibilityPreferences(preferences);
    const root = document.documentElement;
    const rootStyles = root.style;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const useDarkTheme = preferences.theme === "dark"
        || (preferences.theme === "system" && systemTheme.matches);
      if (useDarkTheme) root.setAttribute("data-a11y-theme", "dark");
      else root.removeAttribute("data-a11y-theme");
    };
    applyTheme();
    if (preferences.theme === "system") systemTheme.addEventListener("change", applyTheme);
    const attrs: Record<string, string | undefined> = {
      "data-a11y-contrast": preferences.contrast === "normal" ? undefined : preferences.contrast,
      "data-a11y-saturation": preferences.saturation === "normal" ? undefined : preferences.saturation,
      "data-a11y-color-vision": preferences.colorVision === "off" ? undefined : `${id}-${preferences.colorVision}`,
      "data-a11y-jargon": preferences.jargonSupport ? "on" : undefined,
      "data-a11y-font": preferences.font === "default" ? undefined : preferences.font,
      "data-a11y-spacing": preferences.spacing > 0 ? "on" : undefined,
      "data-a11y-motion": preferences.motion ? String(preferences.motion) : undefined,
      "data-a11y-border": preferences.border ? String(preferences.border) : undefined,
      "data-a11y-underline": preferences.underline ? "on" : undefined,
      "data-a11y-align": preferences.align ? "on" : undefined,
      "data-a11y-targets": preferences.targets ? "on" : undefined,
      "data-a11y-spotlight": preferences.spotlight === "off" ? undefined : preferences.spotlight,
      "data-a11y-cursor": preferences.cursorColor !== "default" || preferences.cursorSize !== "default" ? "on" : undefined,
    };
    Object.entries(attrs).forEach(([name, value]) => value ? root.setAttribute(name, value) : root.removeAttribute(name));
    rootStyles.setProperty("--a11y-spacing", String(preferences.spacing));
    const textScale = (100 + preferences.textScale * 10) / 100;
    rootStyles.setProperty("--a11y-text-scale", String(textScale));
    rootStyles.setProperty("--a11y-cursor", getCursorValue(preferences.cursorColor, preferences.cursorSize));
    rootStyles.setProperty("--a11y-color-vision-filter", preferences.colorVision === "off" ? "none" : `url(#${id}-${preferences.colorVision})`);
    return () => {
      if (preferences.theme === "system") systemTheme.removeEventListener("change", applyTheme);
      root.removeAttribute("data-a11y-theme");
      Object.keys(attrs).forEach((name) => root.removeAttribute(name));
      ["--a11y-spacing", "--a11y-text-scale", "--a11y-cursor", "--a11y-color-vision-filter"].forEach((name) => rootStyles.removeProperty(name));
    };
  }, [preferences, id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.shiftKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        if (isOpen) closePanel();
        else openPanel();
      } else if (event.key === "Escape" && isOpen) {
        closePanel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closePanel, openPanel]);

  useEffect(() => {
    if (preferences.spotlight === "off") return;
    const moveSpotlight = (x: number, y: number) => {
      const overlay = spotlightRef.current;
      if (overlay) {
        overlay.style.setProperty("--a11y-x", `${x}px`);
        overlay.style.setProperty("--a11y-y", `${y}px`);
      }
    };
    const onPointer = (event: PointerEvent) => moveSpotlight(event.clientX, event.clientY);
    const onFocus = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || target.closest(".a11y-widget")) return;
      const bounds = target.getBoundingClientRect();
      moveSpotlight(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("focusin", onFocus);
    moveSpotlight(window.innerWidth / 2, window.innerHeight / 2);
    return () => {
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("focusin", onFocus);
    };
  }, [preferences.spotlight]);

  useEffect(() => () => cancelSpeech(), []);

  const panelProps: AccessibilityPanelProps = {
    id,
    isOpen,
    preferences,
    onPreferenceChange: updatePreference,
    onResetPreferences: resetPreferences,
    onClose: closePanel,
  };

  return (
    <>
      <svg className={styles.filterDefs} aria-hidden="true" focusable="false">
        <defs>
          <filter id={`${id}-protanopia`}><feColorMatrix type="matrix" values="0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0" /></filter>
          <filter id={`${id}-deuteranopia`}><feColorMatrix type="matrix" values="0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0" /></filter>
          <filter id={`${id}-tritanopia`}><feColorMatrix type="matrix" values="0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0" /></filter>
        </defs>
      </svg>
      {preferences.spotlight !== "off" && (
        <div ref={spotlightRef} className={`a11y-spotlight ${styles.spotlight}`} aria-hidden="true" data-mode={preferences.spotlight} />
      )}
      <div className={`a11y-widget ${styles.widget}`} data-open={isOpen}>
        <button
          ref={triggerRef}
          className={styles.trigger}
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          aria-keyshortcuts="Alt+Shift+A"
          aria-label={isOpen ? "Fechar preferências de acessibilidade" : "Abrir preferências de acessibilidade"}
          onFocus={() => { void loadAccessibilityPanel(); }}
          onPointerEnter={() => { void loadAccessibilityPanel(); }}
          onClick={() => isOpen ? closePanel() : openPanel()}
        >
          <img src={universalAccessImage} alt="" aria-hidden="true" />
          <span>Acessibilidade</span>
        </button>

        <section
          className={styles.panel}
          id={panelId}
          aria-labelledby={isOpen ? `${id}-title` : undefined}
          aria-hidden={!isOpen}
          data-open={isOpen}
          inert={!isOpen}
        >
          {shouldRenderPanel && (
            <Suspense fallback={(
              <>
                <header className={styles.panelHeader}>
                  <h2 id={`${id}-title`}>Acessibilidade</h2>
                </header>
                <p className={styles.status} role="status">Carregando preferências de acessibilidade...</p>
              </>
            )}>
              <AccessibilityPanel key={isOpen ? "open" : "closed"} {...panelProps} />
            </Suspense>
          )}
        </section>
      </div>
    </>
  );
}

function getCursorValue(color: AccessibilityPreferences["cursorColor"], size: AccessibilityPreferences["cursorSize"]): string {
  if (color === "default" && size === "default") return "";
  const palettes: Record<Exclude<AccessibilityPreferences["cursorColor"], "default">, [string, string]> = {
    black: ["#000", "#fff"], white: ["#fff", "#000"], yellow: ["#ffd400", "#000"], red: ["#e00000", "#fff"], blue: ["#0057ff", "#fff"],
  };
  const [fill, stroke] = palettes[color === "default" ? "black" : color];
  const dimensions = size === "xlarge" ? 48 : size === "large" ? 36 : 24;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${dimensions}" height="${dimensions}" viewBox="0 0 24 24"><path d="M3 2v18l5-4.5 3.5 7.5 3-1.4-3.5-7.4H19z" fill="${fill}" stroke="${stroke}" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 3 2, auto`;
}

export default FloatingButton;
