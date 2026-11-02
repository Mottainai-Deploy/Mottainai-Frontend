import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import InventoryCountEditor from '@/components/InventoryCountEditor';

export default function NewStockCount() {
  const [params, setParams] = useSearchParams();
  const countId = params.get('id') ?? '';
  const onCreated = useCallback((id: number) => setParams({ id: String(id) }, { replace: true }), [setParams]);
  return <InventoryCountEditor key={countId || 'new'} countId={countId} onCreated={onCreated} />;
}
