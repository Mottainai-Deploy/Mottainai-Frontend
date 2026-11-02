import { useEffect, useMemo, useRef, useState } from 'react';
import { getSuppliers, updateSupplier } from '@/services/supplierService';
import { useApiQuery } from './useApiQuery';
import { useSupplierDeletion } from './useSupplierDeletion';
import type { SupplierPageState, SupplierRecord, SupplierEditState } from '@/types/supplier.types';

export function useSupplierDirectory() {
  const query = useApiQuery(getSuppliers, []);
  const [state, setState] = useState<SupplierPageState>({
    saving: false,
    deletionUncertain: false,
    search: "",
    records: [],
    selectedSupplierId: "",
    editDraft: null,
    feedback: "",
    feedbackIsError: false,
  });
  const saveLock = useRef(false);
  const saving = state.saving;
  const deletion = useSupplierDeletion(state.selectedSupplierId,
    () => setState(previous => ({ ...previous, deletionUncertain: false, records: previous.records.filter(item => item.id !== previous.selectedSupplierId), selectedSupplierId: '', editDraft: null, feedback: 'Fornecedor excluído pelo servidor.', feedbackIsError: false })),
    records => setState(previous => ({ ...previous, records, ...(records.some(item => item.id === previous.selectedSupplierId) ? {} : { selectedSupplierId: '', editDraft: null }), feedback: 'Lista de fornecedores consultada novamente.', feedbackIsError: false })));

  useEffect(() => {
    if (query.status === 'success') setState((previous) => ({ ...previous, records: query.data }));
  }, [query.data, query.status]);


  const filteredSuppliers = useMemo(() => {
    const normalizedSearch = state.search.trim().toLocaleLowerCase("pt-BR");

    if (!normalizedSearch) {
      return state.records;
    }

    return state.records.filter((supplier) =>
      [supplier.tradeName, supplier.cnpj, supplier.email, supplier.phone]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(normalizedSearch),
    );
  }, [state.records, state.search]);

  const handleEditDraftChange = <K extends keyof SupplierEditState>(
    field: K,
    value: SupplierEditState[K],
  ) => {
    setState((currentState) =>
      currentState.editDraft
        ? {
            ...currentState,
            editDraft: { ...currentState.editDraft, [field]: value },
            feedback: "",
            feedbackIsError: false,
          }
        : currentState,
    );
  };

  const saveSupplierEdit = async () => {
    if (saveLock.current || state.deletionUncertain) return;
    if (!state.selectedSupplierId || !state.editDraft?.tradeName.trim()) {
      setState((currentState) => ({
        ...currentState,
        feedback: "Informe um apelido para o fornecedor.",
        feedbackIsError: true,
      }));
      return;
    }

    saveLock.current = true;
    setState((previous) => ({ ...previous, saving: true }));
    try {
      const updated = await updateSupplier(state.selectedSupplierId, state.editDraft);
      setState((currentState) => ({
        ...currentState,
        records: currentState.records.map((supplier) => supplier.id === updated.id ? updated : supplier),
        selectedSupplierId: "",
        editDraft: null,
        feedback: "Fornecedor atualizado com sucesso.",
        feedbackIsError: false,
      }));
    } catch (error) {
      setState((previous) => ({ ...previous, feedbackIsError: true,
        feedback: error instanceof Error ? error.message : 'Não foi possível salvar o fornecedor.' }));
    } finally {
      saveLock.current = false;
      setState((previous) => ({ ...previous, saving: false }));
    }
  };

  const cancelSupplierEdit = () => {
    setState((currentState) => ({
      ...currentState,
      selectedSupplierId: "",
      editDraft: null,
      feedback: "",
      feedbackIsError: false,
    }));
  };


  return { query, state, saving, filteredSuppliers, deletion, handleEditDraftChange, saveSupplierEdit, cancelSupplierEdit,
    edit: (supplier: SupplierRecord) => {
      if (saving || state.deletionUncertain) return;
      setState(previous => ({ ...previous, selectedSupplierId: supplier.id,
        editDraft: { tradeName: supplier.tradeName, active: supplier.active, email: supplier.email, phone: supplier.phone }, feedback: '', feedbackIsError: false }));
    },
    search: (search: string) => setState(previous => ({ ...previous, search })),
    busy: (saving: boolean) => setState(previous => ({ ...previous, saving })),
    uncertain: (deletionUncertain: boolean) => setState(previous => ({ ...previous, deletionUncertain })),
  };
}
