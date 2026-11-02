import { Component } from "react";
import { Link, useLocation } from "react-router-dom";
import type {
  RouteLoadErrorBoundaryProps,
  RouteLoadErrorBoundaryState,
} from "@/types/route-load-error-boundary.types";
import styles from "./style.module.css";

class RouteLoadErrorBoundaryContent extends Component<
  RouteLoadErrorBoundaryProps,
  RouteLoadErrorBoundaryState
> {
  state: RouteLoadErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RouteLoadErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(): void {
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) {
      return (
        <main
          className={styles.errorScreen}
        >
          <section
            className={styles.content}
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
          >
            <h1 className={styles.title}>
              Não foi possível carregar esta página
            </h1>
            <p className={styles.description}>
              Tente voltar ao início e abrir a página novamente.
            </p>
            <Link className={styles.returnLink} to="/">
              Voltar ao início
            </Link>
            <button className={styles.returnLink} type="button" onClick={() => window.location.reload()}>
              Recarregar página
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default function RouteLoadErrorBoundary(props: RouteLoadErrorBoundaryProps) {
  const location = useLocation();

  // Uma navegação, inclusive para a mesma URL, inicia uma nova tentativa de renderização.
  return <RouteLoadErrorBoundaryContent key={location.key} {...props} />;
}
