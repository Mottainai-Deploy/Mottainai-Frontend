import { useState } from 'react';
import type { BatchStatusProps, BatchStatusState } from '@/types/batch-status.types';
import { getBatches, updateBatchStatus } from '@/services/batchService';
import { operationalId } from '@/utils/operationalValidation';
import { useApiQuery } from './useApiQuery';

export function useBatchStatus({ onChanged }: BatchStatusProps) {
  const [state, setState] = useState<BatchStatusState>({ id: '', active: false, busy: false, uncertain: false, revision: 0, confirmed: '' });
  const batches = useApiQuery(getBatches, [], state.revision);
  return { state, batches,
    validate: () => { operationalId(Number(state.id)); },
    changeId: (id: string) => { if (!state.busy) setState(previous => ({ ...previous, id, confirmed: '' })); },
    changeActive: (active: boolean) => { if (!state.busy) setState(previous => ({ ...previous, active, confirmed: '' })); },
    busy: (busy: boolean) => setState(previous => ({ ...previous, busy })),
    uncertain: (uncertain: boolean) => setState(previous => ({ ...previous, uncertain })),
    execute: async () => {
      const id = operationalId(Number(state.id));
      const batch = await updateBatchStatus(id, state.active);
      if (batch.id !== id || batch.active !== state.active) throw new Error('A resposta não confirmou o status solicitado.');
      setState(previous => ({ ...previous, revision: previous.revision + 1, confirmed: `Lote ${batch.batchCode}: ${batch.active ? 'ativo' : 'inativo'}.` }));
      onChanged();
    },
    verify: async () => { await getBatches(); setState(previous => ({ ...previous, revision: previous.revision + 1 })); onChanged(); },
  };
}
