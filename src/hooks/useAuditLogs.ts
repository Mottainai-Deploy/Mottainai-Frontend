import { useState } from 'react';
import { useApiQuery } from './useApiQuery';
import { getAuditLogs } from '@/services/auditService';
import { currentMonthRange, operationDateParams } from '@/utils/operationDateRange';

const initialRange = currentMonthRange();
const initialQuery = (signal: AbortSignal) => getAuditLogs(initialRange, signal);

export function useAuditLogs() {
  const [state, setState] = useState({ range: initialRange, query: initialQuery, error: '' });
  const query = useApiQuery(state.query, []);
  const search = () => {
    try {
      operationDateParams(state.range);
      const range = { ...state.range };
      setState((current) => ({ ...current, query: (signal) => getAuditLogs(range, signal), error: '' }));
    } catch (error) { setState((current) => ({ ...current, error: error instanceof Error ? error.message : 'Revise o período.' })); }
  };
  return { state, setState, query, search };
}
