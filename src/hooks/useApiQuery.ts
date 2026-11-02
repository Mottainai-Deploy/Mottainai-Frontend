import { useEffect, useState } from 'react';
import type { ApiQueryState, ApiQuerySnapshot } from '@/types/api-query.types';

// Passe uma função estável (definida no módulo de serviço) para evitar novas consultas em cada renderização.
export function useApiQuery<T>(query: (signal: AbortSignal) => Promise<T>, initialData: T, reloadKey = 0): ApiQueryState<T> {
  const [state, setState] = useState<ApiQuerySnapshot<T>>({ query, reloadKey, data: initialData, status: 'loading', error: '' });
  useEffect(() => {
    const controller = new AbortController();
    void query(controller.signal).then((data) => {
      if (!controller.signal.aborted) setState({ query, reloadKey, data, status: 'success', error: '' });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState((previous) => ({
        ...previous, query, reloadKey, status: 'error', error: error instanceof Error ? error.message : 'Não foi possível carregar os dados.',
      }));
    });
    return () => controller.abort();
  }, [query, reloadKey]);
  return state.query === query && state.reloadKey === reloadKey ? state : { data: initialData, status: 'loading', error: '' };
}
