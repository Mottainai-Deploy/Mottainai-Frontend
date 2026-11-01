import { Component } from "react";
import { Link } from "react-router-dom";
import type {
  RouteLoadErrorBoundaryProps,
  RouteLoadErrorBoundaryState,
} from "@/types/route-load-error-boundary.types";
import styles from "./style.module.css";

class RouteLoadErrorBoundary extends Component<
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
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default RouteLoadErrorBoundary;
