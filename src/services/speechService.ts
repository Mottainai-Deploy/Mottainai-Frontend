import type { ActiveSpeechRun, SpeechOptions, SpeechResult } from "@/types/speech.types";

const MAX_CHUNK_LENGTH = 220;
let nextRunId = 0;
let activeRun: ActiveSpeechRun | null = null;

export async function speakText(text: string, options: SpeechOptions): Promise<SpeechResult> {
  try {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      return { status: "error", message: "Seu navegador não oferece leitura em voz alta." };
    }

    const chunks = splitIntoChunks(text);
    if (chunks.length === 0) {
      return { status: "error", message: "Não há texto disponível para leitura." };
    }

    if (activeRun) return activeRun.promise;

    const synthesis = window.speechSynthesis;
    const runId = ++nextRunId;

    let finishRun: (result: SpeechResult) => void = () => undefined;
    let speakNextChunk: () => void = () => undefined;
    let pauseRun: () => void = () => undefined;
    let resumeRun: () => void = () => undefined;
    let updateRunRate: (rate: number) => void = () => undefined;
    let chunkIndex = 0;
    let settled = false;
    let hasStarted = false;
    let rate = options.rate;
    let isPaused = false;
    let pendingText = "";
    let currentUtterance: SpeechSynthesisUtterance | null = null;
    let currentText = "";
    let currentCharIndex = 0;

    const promise = new Promise<SpeechResult>((resolve) => {
      finishRun = (result) => {
        if (settled) return;
        settled = true;
        if (activeRun?.id === runId) activeRun = null;
        resolve(result);
      };

      const speakChunk = (text: string) => {
        if (settled) return;
        try {
          const utterance = new SpeechSynthesisUtterance(text);
          currentUtterance = utterance;
          currentText = text;
          currentCharIndex = 0;
          utterance.lang = options.language;
          utterance.rate = rate;
          utterance.onstart = () => {
            if (currentUtterance !== utterance) return;
            if (hasStarted) return;
            hasStarted = true;
            options.onStarted?.();
          };
          utterance.onboundary = (event) => {
            if (currentUtterance === utterance) currentCharIndex = event.charIndex;
          };
          utterance.onend = () => {
            if (currentUtterance !== utterance) return;
            currentUtterance = null;
            chunkIndex += 1;
            speakNextChunk();
          };
          utterance.onerror = (event) => {
            if (currentUtterance !== utterance) return;
            currentUtterance = null;
            const message = event.error === "not-allowed"
              ? "O navegador bloqueou a reprodução de voz. Tente iniciar a leitura novamente."
              : "O navegador não conseguiu reproduzir a voz. Verifique se há uma voz disponível no dispositivo.";
            finishRun({ status: "error", message });
          };

          if (synthesis.paused) synthesis.resume();
          synthesis.speak(utterance);
        } catch {
          finishRun({
            status: "error",
            message: "O navegador não conseguiu iniciar a leitura em voz alta.",
          });
        }
      };

      speakNextChunk = () => {
        if (settled || isPaused) return;
        if (chunkIndex >= chunks.length) {
          finishRun({ status: "completed" });
          return;
        }
        speakChunk(chunks[chunkIndex]);
      };

      pauseRun = () => {
        if (settled || isPaused || !currentUtterance) return;
        pendingText = currentText.slice(currentCharIndex) || currentText;
        currentUtterance = null;
        isPaused = true;
        synthesis.cancel();
      };

      resumeRun = () => {
        if (settled || !isPaused) return;
        const text = pendingText || chunks[chunkIndex];
        pendingText = "";
        isPaused = false;
        speakChunk(text);
      };

      updateRunRate = (nextRate) => {
        if (settled || nextRate === rate) return;
        rate = nextRate;
        if (currentUtterance) pauseRun();
      };
    });

    activeRun = {
      id: runId,
      cancel: () => finishRun({ status: "cancelled" }),
      pause: pauseRun,
      resume: resumeRun,
      updateRate: updateRunRate,
      promise,
    };
    speakNextChunk();
    return await promise;
  } catch {
    return {
      status: "error",
      message: "O navegador não conseguiu iniciar a leitura em voz alta.",
    };
  }
}

export function pauseSpeech(): void {
  activeRun?.pause();
}

export function resumeSpeech(): void {
  activeRun?.resume();
}

export function updateSpeechRate(rate: number): void {
  activeRun?.updateRate(rate);
}

export function cancelSpeech(): void {
  const run = activeRun;
  if (!run) return;

  activeRun = null;
  run.cancel();

  try {
    window.speechSynthesis.cancel();
  } catch {
    // A interface ainda atualiza o estado mesmo se o navegador falhar ao cancelar a voz.
  }
}

function splitIntoChunks(text: string): string[] {
  const sentences = text.match(/[^.!?…]+[.!?…]*\s*/gu) ?? [text];
  const chunks: string[] = [];
  let current = "";

  sentences.forEach((sentence) => {
    const words = sentence.trim().split(/\s+/u).filter(Boolean);
    words.forEach((word) => {
      let remaining = word;
      while (remaining.length > MAX_CHUNK_LENGTH) {
        if (current) {
          chunks.push(current);
          current = "";
        }
        chunks.push(remaining.slice(0, MAX_CHUNK_LENGTH));
        remaining = remaining.slice(MAX_CHUNK_LENGTH);
      }

      if (current && current.length + remaining.length + 1 > MAX_CHUNK_LENGTH) {
        chunks.push(current);
        current = remaining;
      } else {
        current = current ? `${current} ${remaining}` : remaining;
      }
    });
  });

  if (current) chunks.push(current);
  return chunks;
}
