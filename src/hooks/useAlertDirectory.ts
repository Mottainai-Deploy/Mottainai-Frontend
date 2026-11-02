import { useState } from 'react';
import { getStoreAlerts } from '@/services/alertService';
import { useApiQuery } from './useApiQuery';

export function useAlertDirectory() {
  const [state, setState] = useState({ search: '', status: '', reload: 0 });
  const query = useApiQuery(getStoreAlerts, [], state.reload);
  const alerts = query.data.filter((alert) => (!state.status || alert.status === state.status) &&
    `${alert.title} ${alert.description ?? ''}`.toLocaleLowerCase('pt-BR').includes(state.search.trim().toLocaleLowerCase('pt-BR')));
  return { state, setState, query, alerts };
}
