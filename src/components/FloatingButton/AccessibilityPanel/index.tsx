import { useEffect, useRef, useState } from "react";
import type { AccessibilityPreferences, AccessibilityPreferenceKey, AccessibilityWidgetState } from "@/types/accessibility.types";
import type { AccessibilityPanelProps, ChoiceGroupProps } from "@/types/accessibility-widget.types";
import { cancelSpeech, pauseSpeech, resumeSpeech, speakText, updateSpeechRate } from "@/services/speechService";
import styles from "../style.module.css";

type PanelSpeechState = Omit<AccessibilityWidgetState, "isOpen">;

function ChoiceGroup({ id, legend, value, options, onChange }: ChoiceGroupProps) {
  return (
    <fieldset className={styles.group}>
      <legend>{legend}</legend>
      <div className={styles.choices}>
        {options.map(([optionValue, label]) => {
          const selected = String(value) === String(optionValue);
          return (
            <label className={styles.choice} htmlFor={`${id}-${optionValue}`} key={optionValue}>
              <input
                id={`${id}-${optionValue}`}
                type="radio"
                name={id}
                value={optionValue}
                checked={selected}
                onChange={(event) => onChange(event.currentTarget.value)}
              />
              <span>
                {label}
                {selected && <span className={styles.selectedTag} aria-hidden="true">Selecionado</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function AccessibilityPanel({ id, isOpen, preferences, onPreferenceChange, onResetPreferences, onClose }: AccessibilityPanelProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [state, setState] = useState<PanelSpeechState>({
    isReading: false,
    isPaused: false,
    statusMessage: "",
    statusIsError: false,
  });
  const { isReading, isPaused, statusMessage, statusIsError } = state;
  const updateState = (changes: Partial<PanelSpeechState>) => {
    setState((current) => ({ ...current, ...changes }));
  };
  const textPercent = 100 + preferences.textScale * 10;

  useEffect(() => {
    if (isOpen) {
      titleRef.current?.focus();
      return;
    }

    cancelSpeech();
  }, [isOpen]);

  useEffect(() => {
    return () => cancelSpeech();
  }, []);

  function choose<K extends AccessibilityPreferenceKey>(key: K, value: string) {
    const normalizedValue = key === "motion" || key === "border" || key === "rate"
      ? Number(value)
      : value;
    onPreferenceChange(key, normalizedValue as AccessibilityPreferences[K]);
    if (key === "rate") {
      const rate = Number(normalizedValue);
      if (isReading) {
        pauseSpeech();
        updateState({ isPaused: true });
      }
      updateSpeechRate(rate);
      updateState({
        statusMessage: isReading
          ? "Leitura pausada. Pressione Reproduzir para continuar com a nova velocidade."
          : "Velocidade selecionada. Ela será usada na próxima leitura.",
        statusIsError: false,
      });
    }
  }

  async function speak(text: string) {
    updateState({ isReading: true, isPaused: false, statusMessage: "Preparando a leitura em voz alta...", statusIsError: false });
    const result = await speakText(text, {
      language: document.documentElement.lang || "pt-BR",
      rate: preferences.rate,
      onStarted: () => updateState({ statusMessage: "Leitura iniciada." }),
    });
    if (result.status === "cancelled") {
      updateState({ isReading: false, isPaused: false });
      return;
    }

    updateState({ isReading: false, isPaused: false });
    if (result.status === "error") {
      updateState({ statusMessage: result.message, statusIsError: true });
      return;
    }
    updateState({ statusMessage: "Leitura concluída.", statusIsError: false });
  }

  function readPage() {
    const main = document.querySelector<HTMLElement>("main, [role='main']");
    const text = (main ?? document.body).innerText.replace(/\s+/g, " ").trim();
    void speak(text);
  }

  function readSelection() {
    const text = window.getSelection()?.toString().replace(/\s+/g, " ").trim() ?? "";
    if (!text) {
      updateState({ statusMessage: "Selecione um trecho de texto na página e tente novamente.", statusIsError: true });
      return;
    }
    void speak(text);
  }

  function resetPreferences() {
    onResetPreferences();
    cancelSpeech();
    updateState({ isReading: false, isPaused: false, statusMessage: "Preferências restauradas.", statusIsError: false });
  }

  function pauseReading() {
    pauseSpeech();
    updateState({ isPaused: true, statusMessage: "Leitura pausada. Pressione Reproduzir para continuar.", statusIsError: false });
  }

  function resumeReading() {
    resumeSpeech();
    updateState({ isPaused: false, statusMessage: "Leitura retomada com a velocidade selecionada.", statusIsError: false });
  }

  function stopReading() {
    cancelSpeech();
    updateState({ isReading: false, isPaused: false, statusMessage: "Leitura interrompida.", statusIsError: false });
  }

  return (
    <>
      <header className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>Preferências</p>
          <h2 id={`${id}-title`} ref={titleRef} tabIndex={-1}>Acessibilidade</h2>
        </div>
        <button className={styles.close} type="button" aria-label="Fechar preferências de acessibilidade" onClick={onClose}>×</button>
      </header>
      <p className={styles.intro}>As escolhas valem para todas as páginas e ficam salvas neste navegador.</p>
      <div className={styles.panelContent}>
        <h3>Cores</h3>
        <ChoiceGroup id={`${id}-theme`} legend="Tema" value={preferences.theme} options={[["system", "Sistema"], ["light", "Claro"], ["dark", "Escuro"]]} onChange={(value) => choose("theme", value)} />
        <ChoiceGroup id={`${id}-contrast`} legend="Contraste" value={preferences.contrast} options={[["normal", "Padrão"], ["high", "Alto contraste"], ["low", "Baixo contraste"]]} onChange={(value) => choose("contrast", value)} />
        <ChoiceGroup id={`${id}-saturation`} legend="Saturação das cores" value={preferences.saturation} options={[["normal", "Padrão"], ["low", "Baixa"], ["gray", "Cinza"]]} onChange={(value) => choose("saturation", value)} />
        <ChoiceGroup id={`${id}-color-vision`} legend="Filtro para daltonismo" value={preferences.colorVision} options={[["off", "Desligado"], ["protanopia", "Protanopia (vermelho)"], ["deuteranopia", "Deuteranopia (verde)"], ["tritanopia", "Tritanopia (azul)"]]} onChange={(value) => choose("colorVision", value)} />
        <div className={styles.toggles}>
          <button type="button" aria-pressed={preferences.jargonSupport} onClick={() => onPreferenceChange("jargonSupport", !preferences.jargonSupport)} className={styles.help}>
            Ajuda para termos técnicos
            {preferences.jargonSupport && <span className={styles.activeTag} aria-hidden="true">Ligado</span>}
          </button>
        </div>
        <p className={styles.hint}>Quando ativada, a ajuda aparece ao passar o cursor ou focar os termos marcados com “i”.</p>

        <h3>Texto</h3>
        <div className={styles.group} role="group" aria-labelledby={`${id}-text-size`}>
          <span id={`${id}-text-size`} className={styles.legend}>Tamanho do texto</span>
          <div className={styles.stepper}>
            <button type="button" aria-label="Diminuir texto" disabled={preferences.textScale <= -1} onClick={() => onPreferenceChange("textScale", Math.max(-1, preferences.textScale - 1))}>A−</button>
            <output aria-live="polite">{textPercent}%</output>
            <button type="button" aria-label="Aumentar texto" disabled={preferences.textScale >= 5} onClick={() => onPreferenceChange("textScale", Math.min(5, preferences.textScale + 1))}>A+</button>
          </div>
        </div>
        <ChoiceGroup id={`${id}-font`} legend="Tipo de fonte" value={preferences.font} options={[["default", "Padrão"], ["verdana", "Verdana"], ["arial", "Arial"], ["lexend", "Lexend"], ["andika", "Andika"], ["comic", "Comic Sans"], ["serif", "Com serifa"]]} onChange={(value) => choose("font", value)} />
        <p className={styles.hint}>Nenhuma fonte funciona igual para todo mundo: teste e escolha a mais confortável. Lexend e Andika dependem das fontes instaladas no dispositivo.</p>
        <label className={styles.rangeLabel} htmlFor={`${id}-spacing`}>Espaçamento entre letras e palavras <output htmlFor={`${id}-spacing`}>{preferences.spacing.toFixed(1)}</output></label>
        <input className={styles.range} id={`${id}-spacing`} type="range" min="0" max="2" step="0.1" value={preferences.spacing} onChange={(event) => onPreferenceChange("spacing", Number(event.currentTarget.value))} />
        <label className={styles.rangeLabel} htmlFor={`${id}-line-spacing`}>Espaçamento vertical entre linhas <output htmlFor={`${id}-line-spacing`}>{preferences.lineSpacing.toFixed(1)}</output></label>
        <input className={styles.range} id={`${id}-line-spacing`} type="range" min="0" max="2" step="0.1" value={preferences.lineSpacing} onChange={(event) => onPreferenceChange("lineSpacing", Number(event.currentTarget.value))} />
        <div className={styles.toggles}>
          <button type="button" aria-pressed={preferences.underline} onClick={() => onPreferenceChange("underline", !preferences.underline)}>
            Sublinhar links
            {preferences.underline && <span className={styles.activeTag} aria-hidden="true">Ligado</span>}
          </button>
          <button type="button" aria-pressed={preferences.align} onClick={() => onPreferenceChange("align", !preferences.align)}>
            Texto à esquerda e linhas curtas
            {preferences.align && <span className={styles.activeTag} aria-hidden="true">Ligado</span>}
          </button>
          <button type="button" aria-pressed={preferences.targets} onClick={() => onPreferenceChange("targets", !preferences.targets)}>
            Botões e links maiores
            {preferences.targets && <span className={styles.activeTag} aria-hidden="true">Ligado</span>}
          </button>
        </div>

        <h3>Movimento e bordas</h3>
        <ChoiceGroup id={`${id}-motion`} legend="Reduzir movimento" value={preferences.motion} options={[[0, "Normal"], [25, "25%"], [50, "50%"], [100, "Parar"]]} onChange={(value) => choose("motion", value)} />
        <ChoiceGroup id={`${id}-border`} legend="Aumentar borda" value={preferences.border} options={[[0, "Padrão"], [25, "25%"], [50, "50%"], [100, "100%"]]} onChange={(value) => choose("border", value)} />

        <h3>Mouse</h3>
        <ChoiceGroup id={`${id}-cursor-color`} legend="Cor do cursor" value={preferences.cursorColor} options={[["default", "Padrão"], ["black", "Preto"], ["white", "Branco"], ["yellow", "Amarelo"], ["red", "Vermelho"], ["blue", "Azul"]]} onChange={(value) => choose("cursorColor", value)} />
        <ChoiceGroup id={`${id}-cursor-size`} legend="Tamanho do cursor" value={preferences.cursorSize} options={[["default", "Padrão"], ["large", "Grande"], ["xlarge", "Extra grande"]]} onChange={(value) => choose("cursorSize", value)} />
        <ChoiceGroup id={`${id}-spotlight`} legend="Foco de leitura" value={preferences.spotlight} options={[["off", "Desligado"], ["lantern", "Lanterna"], ["ruler", "Régua"]]} onChange={(value) => choose("spotlight", value)} />

        <h3>Leitura em voz alta</h3>
        <div className={styles.reading} role="group" aria-label="Leitura em voz alta">
          <p>Usa a voz disponível no seu dispositivo para ler o conteúdo principal da página.</p>
          <button type="button" onClick={readPage} disabled={isReading}>Ouvir esta página</button>
          <button type="button" onClick={readSelection} disabled={isReading}>Ler seleção</button>
          {isReading && (isPaused
            ? <button type="button" onClick={resumeReading}>▶ Reproduzir leitura</button>
            : <button type="button" onClick={pauseReading}>Pausar leitura</button>)}
          <button type="button" onClick={stopReading} disabled={!isReading}>Parar leitura</button>
        </div>
        <ChoiceGroup id={`${id}-rate`} legend="Velocidade da voz" value={preferences.rate} options={[[0.75, "Lenta"], [1, "Normal"], [1.25, "Rápida"], [1.5, "Mais rápida"]]} onChange={(value) => choose("rate", value)} />
        <p className={styles.hint}>Ao escolher outra velocidade durante a leitura, ela será pausada. Pressione Reproduzir para continuar com a nova velocidade.</p>
        <button className={styles.reset} type="button" onClick={resetPreferences}>Restaurar preferências</button>
        <p className={styles.shortcut}>Atalho: Alt + Shift + A · Fechar: Esc</p>
      </div>
      <p className={styles.status} role={statusIsError ? "alert" : "status"} aria-live={statusIsError ? "assertive" : "polite"}>{statusMessage}</p>
    </>
  );
}

export default AccessibilityPanel;
