import { useEffect, useRef, useState } from 'react';
import mottainaiLogo from '@/assets/icons/Logo-Orange.png';
import darkRisingWave from '@/assets/imgs/post-login/onda-azul-escuro.svg';
import lightRisingWave from '@/assets/imgs/post-login/onda-azul-claro.svg';
import sun from '@/assets/imgs/post-login/sol.svg';
import circularWave from '@/assets/imgs/post-login/onda-circular.svg';
import centralWave from '@/assets/imgs/post-login/onda-central.svg';
import foamLayers from '@/assets/imgs/post-login/ondas-espuma.svg';
import footerWaveLines from '@/assets/imgs/post-login/ondas-footer-linhas.svg';
import progressCrane from '@/assets/imgs/post-login/tsuru-progresso.svg';
import type { PostLoginLoadingProps } from '@/types/post-login-loading.types';
import { POST_LOGIN_WAVE_DURATION_MS } from '@/utils/minimumLoadingDuration';
import styles from './style.module.css';

function PostLoginLoading({ onWaveComplete }: PostLoginLoadingProps) {
    const [progress, setProgress] = useState(0);
    const darkWaveRef = useRef<HTMLDivElement>(null);
    const completionScheduled = useRef(false);
    const firstCompletionFrame = useRef<number | null>(null);
    const secondCompletionFrame = useRef<number | null>(null);

    useEffect(() => {
        const previousTitle = document.title;
        const preparingTitle = 'Preparando | Mottainai';
        document.title = preparingTitle;

        return () => {
            if (document.title === preparingTitle) document.title = previousTitle;
        };
    }, []);

    useEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        const previousHtmlOverflow = html.style.overflow;
        const previousBodyOverflow = body.style.overflow;
        const previousHtmlOverscroll = html.style.overscrollBehavior;
        const previousBodyOverscroll = body.style.overscrollBehavior;

        html.style.overflow = 'hidden';
        body.style.overflow = 'hidden';
        html.style.overscrollBehavior = 'none';
        body.style.overscrollBehavior = 'none';

        return () => {
            html.style.overflow = previousHtmlOverflow;
            body.style.overflow = previousBodyOverflow;
            html.style.overscrollBehavior = previousHtmlOverscroll;
            body.style.overscrollBehavior = previousBodyOverscroll;
        };
    }, []);

    useEffect(() => {
        const startedAt = performance.now();
        let progressFrameId: number | null = null;

        const updateProgress = () => {
            const elapsed = performance.now() - startedAt;
            const nextProgress = Math.min(
                (elapsed / POST_LOGIN_WAVE_DURATION_MS) * 99,
                99,
            );
            setProgress(nextProgress);

            if (nextProgress < 99) {
                progressFrameId = window.requestAnimationFrame(updateProgress);
            }
        };

        progressFrameId = window.requestAnimationFrame(updateProgress);

        return () => {
            if (progressFrameId !== null) window.cancelAnimationFrame(progressFrameId);
        };
    }, []);

    useEffect(() => {
        const wave = darkWaveRef.current;
        if (!wave) return;

        function handleWaveAnimationFinished(event: globalThis.AnimationEvent) {
            if (
                event.target !== wave
                || completionScheduled.current
            ) {
                return;
            }

            completionScheduled.current = true;
            setProgress(100);
            firstCompletionFrame.current = window.requestAnimationFrame(() => {
                secondCompletionFrame.current = window.requestAnimationFrame(onWaveComplete);
            });
        }

        wave.addEventListener('animationend', handleWaveAnimationFinished);
        wave.addEventListener('animationcancel', handleWaveAnimationFinished);

        return () => {
            wave.removeEventListener('animationend', handleWaveAnimationFinished);
            wave.removeEventListener('animationcancel', handleWaveAnimationFinished);
        };
    }, [onWaveComplete]);

    useEffect(() => {
        const wave = darkWaveRef.current;
        if (!wave) return;

        const animation = window.getComputedStyle(wave);
        const hasVisibleAnimation = animation.animationName !== 'none'
            && animation.animationDuration.split(',').some((duration) => Number.parseFloat(duration) > 0);

        if (hasVisibleAnimation) return;

        completionScheduled.current = true;
        setProgress(100);
        firstCompletionFrame.current = window.requestAnimationFrame(() => {
            secondCompletionFrame.current = window.requestAnimationFrame(onWaveComplete);
        });
    }, [onWaveComplete]);

    useEffect(() => () => {
        if (firstCompletionFrame.current !== null) {
            window.cancelAnimationFrame(firstCompletionFrame.current);
        }
        if (secondCompletionFrame.current !== null) {
            window.cancelAnimationFrame(secondCompletionFrame.current);
        }
    }, []);

    const craneProgress = progress;

    return (
        <section
            className={styles.screen}
            aria-label="Preparando o Mottainai"
            aria-busy="true"
            data-node-id="2024:2"
        >
            <div className={styles.stage}>
                <div className={styles.lightRisingWave} aria-hidden="true">
                    <img className={styles.fullFrameAsset} src={lightRisingWave} alt="" />
                </div>

                <div
                    ref={darkWaveRef}
                    className={styles.darkRisingWave}
                    data-node-id="2024:58"
                    aria-hidden="true"
                >
                    <img className={styles.fullFrameAsset} src={darkRisingWave} alt="" />
                </div>

                <img
                    className={`${styles.sceneImage} ${styles.logo}`}
                    src={mottainaiLogo}
                    alt=""
                    aria-hidden="true"
                    width={280}
                    height={280}
                    decoding="async"
                    data-node-id="2024:4"
                />
                <h1 className={styles.title} data-node-id="2024:5">mottainai</h1>
                <p className={styles.subtitle} lang="ja" data-node-id="2024:6">
                    もったいない
                </p>

                <img
                    className={`${styles.sceneImage} ${styles.sun}`}
                    src={sun}
                    alt=""
                    aria-hidden="true"
                    data-node-id="2024:7"
                />

                <div className={styles.sea} aria-hidden="true" data-node-id="2024:8" />
                <img
                    className={`${styles.sceneImage} ${styles.wave} ${styles.waveLeftOuter}`}
                    src={circularWave}
                    alt=""
                    aria-hidden="true"
                    data-node-id="2024:9"
                />
                <img
                    className={`${styles.sceneImage} ${styles.wave} ${styles.waveLeftInner}`}
                    src={circularWave}
                    alt=""
                    aria-hidden="true"
                    data-node-id="2024:10"
                />
                <img
                    className={`${styles.sceneImage} ${styles.wave} ${styles.waveCenter}`}
                    src={centralWave}
                    alt=""
                    aria-hidden="true"
                    data-node-id="2024:11"
                />
                <img
                    className={`${styles.sceneImage} ${styles.wave} ${styles.waveRightInner}`}
                    src={circularWave}
                    alt=""
                    aria-hidden="true"
                    data-node-id="2024:12"
                />
                <img
                    className={`${styles.sceneImage} ${styles.wave} ${styles.waveRightOuter}`}
                    src={circularWave}
                    alt=""
                    aria-hidden="true"
                    data-node-id="2024:13"
                />

                <div className={styles.foamLayers} data-node-id="2024:14" aria-hidden="true">
                    <img className={styles.fullFrameAsset} src={foamLayers} alt="" />
                </div>
                <div className={styles.footerWaveLines} aria-hidden="true">
                    <img className={styles.fullFrameAsset} src={footerWaveLines} alt="" />
                </div>

                <div
                    className={styles.progressTrack}
                    role="progressbar"
                    aria-label="Progresso da entrada"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.floor(progress / 5) * 5}
                    data-node-id="2024:37"
                >
                    <div
                        className={styles.progressFill}
                        style={{ width: `${progress}%` }}
                        data-node-id="2024:38"
                    />
                    <span
                        className={styles.progressCrane}
                        style={{ left: `${craneProgress}%` }}
                        aria-hidden="true"
                    >
                        <img
                            className={styles.progressCraneArtwork}
                            src={progressCrane}
                            alt=""
                            aria-hidden="true"
                            decoding="async"
                        />
                    </span>
                </div>
                <p className={styles.loadingStatus} role="status" aria-live="polite" aria-atomic="true">
                    Preparando...
                </p>
            </div>
        </section>
    );
}

export default PostLoginLoading;
