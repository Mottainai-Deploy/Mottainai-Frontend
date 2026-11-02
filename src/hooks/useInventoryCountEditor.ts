import { useCallback, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { CountEditorState, CountItemForm, InventoryCount, InventoryCountItem, InventoryCountEditorProps } from '@/types/inventory-count-api.types';
import { getInventoryRows } from '@/services/inventoryService';
import { createInventoryCount, getInventoryCount, saveInventoryCountItem, finishInventoryCount, deleteInventoryCountItem } from '@/services/inventoryCountService';
import { ApiRequestError } from '@/services/apiClient';
import { countItemErrors } from '@/utils/inventoryValidation';
import { useApiQuery } from './useApiQuery';

const emptyItem: CountItemForm = { inventoryId: '', quantity: '', observation: '' };

export function useInventoryCountEditor({ countId, onCreated }: InventoryCountEditorProps) {
  const loadCount = useCallback((signal: AbortSignal): Promise<InventoryCount | null> =>
    countId ? getInventoryCount(countId, signal) : Promise.resolve(null), [countId]);
  const query = useApiQuery(loadCount, null);
  const inventory = useApiQuery(getInventoryRows, []);
  const lock = useRef(false);
  const finishKey = useRef<string | null>(null);
  const [state, setState] = useState<CountEditorState>({ countId, count: null, item: emptyItem, observation: '', busy: false, message: '', failed: false, reviewing: false, uncertainFinish: false, removal: null, uncertainRemoval: false, errors: {} });
  const count = state.count ?? query.data;
  const editable = count?.status === 'IN_PROGRESS' && !state.busy && !state.uncertainFinish && !state.removal && !state.uncertainRemoval;
  const availableInventory = inventory.data.filter((item) => !count || item.storeId === count.storeId);

  async function run(message: string, action: () => Promise<void>): Promise<void> {
    if (lock.current) return;
    lock.current = true;
    setState((previous) => ({ ...previous, busy: true, message, failed: false }));
    try { await action(); }
    catch (error) {
      setState((previous) => ({ ...previous, failed: true, message: error instanceof Error ? error.message : 'Não foi possível concluir a operação.' }));
    } finally {
      lock.current = false;
      setState((previous) => ({ ...previous, busy: false }));
    }
  }

  function change(field: keyof CountItemForm, value: string): void {
    setState((previous) => ({ ...previous, item: field === 'inventoryId' ? { ...emptyItem, inventoryId: value } : { ...previous.item, [field]: value }, errors: field === 'inventoryId' ? {} : { ...previous.errors, [field]: undefined }, message: '', failed: false, reviewing: false }));
  }

  async function create(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await run('Criando contagem…', async () => {
      try { onCreated((await createInventoryCount(state.observation)).id); }
      catch (error) { throw new Error(`${error instanceof Error ? error.message : 'Não foi possível criar a contagem.'} Se houve interrupção de conexão, consulte as contagens existentes antes de repetir.`, { cause: error }); }
    });
  }

  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!count || !editable) return;
    const errors = countItemErrors(state.item);
    if (!availableInventory.some((item) => String(item.id) === state.item.inventoryId)) errors.inventoryId = 'Selecione um item disponível nesta loja.';
    if (Object.keys(errors).length) {
      setState((previous) => ({ ...previous, errors, failed: true, message: 'Revise os campos indicados.' }));
      event.currentTarget.querySelector<HTMLElement>(`#count-item-${Object.keys(errors)[0]}`)?.focus();
      return;
    }
    const existing = count.items.find((item) => String(item.inventoryId) === state.item.inventoryId);
    await run('Salvando quantidade física…', async () => {
      const item = await saveInventoryCountItem(countId, state.item, existing?.id);
      const items = existing ? count.items.map((current) => current.id === item.id ? item : current) : [...count.items, item];
      setState((previous) => ({ ...previous, count: { ...count, items }, item: emptyItem, errors: {}, reviewing: false, message: 'Quantidade física salva na contagem.' }));
    });
  }

  function edit(item: InventoryCountItem): void {
    if (!editable) return;
    setState((previous) => ({ ...previous, item: { inventoryId: String(item.inventoryId), quantity: String(item.countedQuantity), observation: item.observation ?? '' }, errors: {}, reviewing: false, message: '', failed: false }));
  }

  async function finish(): Promise<void> {
    if (!count || !editable || !count.items.length || !state.reviewing) return;
    await run('Finalizando contagem e atualizando o estoque…', async () => {
      finishKey.current ??= crypto.randomUUID();
      const key = finishKey.current;
      setState((previous) => ({ ...previous, uncertainFinish: true }));
      const completed = await finishInventoryCount(countId, key);
      setState((previous) => ({ ...previous, count: completed, uncertainFinish: false, reviewing: false, message: 'Contagem concluída e ajustes confirmados pelo servidor.' }));
    });
  }

  async function reload(): Promise<void> {
    if (!countId) return;
    await run('Consultando estado da contagem…', async () => {
      const latest = await getInventoryCount(countId);
      setState((previous) => ({ ...previous, count: latest, uncertainFinish: false, reviewing: false, removal: null, uncertainRemoval: false, message: 'Estado da contagem atualizado.' }));
    });
  }

  async function remove(): Promise<void> {
    if (!state.removal || state.uncertainRemoval || !count || count.status !== 'IN_PROGRESS' || state.uncertainFinish) return;
    const itemId = state.removal.id;
    await run('Removendo item e consultando a contagem…', async () => {
      setState(previous => ({ ...previous, uncertainRemoval: true }));
      let deleted = false;
      try {
        await deleteInventoryCountItem(countId, itemId);
        deleted = true;
        const latest = await getInventoryCount(countId);
        if (latest.items.some(item => item.id === itemId)) throw new Error('O servidor ainda não confirmou a remoção. Consulte a contagem novamente.');
        setState(previous => ({ ...previous, count: latest, removal: null, uncertainRemoval: false, message: 'Item removido da contagem. Nenhum saldo de estoque foi alterado.' }));
      } catch (error) {
        if (!deleted && error instanceof ApiRequestError && error.status >= 400 && error.status < 500) setState(previous => ({ ...previous, uncertainRemoval: false }));
        throw error;
      }
    });
  }

  return { state, count, query, inventory, availableInventory, editable, change, create, save, edit, finish, reload, remove,
    askRemove: (item: InventoryCountItem | null) => {
      if (state.busy || state.uncertainRemoval || (item && !editable)) return;
      setState(previous => ({ ...previous, removal: item, message: '', failed: false }));
    },
    clearItem: () => setState((previous) => ({ ...previous, item: emptyItem, errors: {}, message: '' })),
    changeObservation: (value: string) => setState((previous) => ({ ...previous, observation: value })),
    review: (value: boolean) => setState((previous) => ({ ...previous, reviewing: value })) };
}
