import { useEffect } from 'react';
import mottainaiLogo from '@/assets/icons/Logo-Orange.png';
import Spinner from '@/components/Spinner';
import styles from './style.module.css';

function Loading() {
    useEffect(() => {
        const previousTitle = document.title;
        const loadingTitle = 'Carregando | Mottainai';
        document.title = loadingTitle;

        return () => {
            if (document.title === loadingTitle) document.title = previousTitle;
        };
    }, []);

    return (
        <main
            className={styles.screen}
            aria-busy="true"
        >
            <div className={styles.content}>
                <header className={styles.brand}>
                    <img
                        className={styles.logo}
                        src={mottainaiLogo}
                        alt=""
                        aria-hidden="true"
                        width={48}
                        height={48}
                        decoding="async"
                    />
                    <h1 className={styles.brandName}>
                        Mottainai
                    </h1>
                </header>
                <Spinner label="Carregando página" size="large" />
            </div>
        </main>
    );
}

export default Loading
