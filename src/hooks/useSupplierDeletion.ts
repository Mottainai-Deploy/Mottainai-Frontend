import { deleteSupplier, getSuppliers } from '@/services/supplierService';
import type { SupplierRecord } from '@/types/supplier.types';

export function useSupplierDeletion(id: string, onDeleted: () => void, onRefreshed: (records: SupplierRecord[]) => void) {
  return {
    execute: async () => { await deleteSupplier(id); onDeleted(); },
    verify: async () => { onRefreshed(await getSuppliers()); },
  };
}
