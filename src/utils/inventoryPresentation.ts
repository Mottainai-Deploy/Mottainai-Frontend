import type { InventoryResponse, InventoryRow, InventoryType } from '@/types/inventory-api.types';
import type { BatchResponse } from '@/types/batch-api.types';
import type { CatalogProduct } from '@/types/catalog-product.types';
import type { InventoryCountStatus } from '@/types/inventory-count-api.types';

export const inventoryTypeLabels: Record<InventoryType, string> = { NORMAL: 'Normal', CONSIGNED: 'Consignado', QUARANTINE: 'Quarentena' };
export const countStatusLabels: Record<InventoryCountStatus, string> = { IN_PROGRESS: 'Em andamento', COMPLETED: 'Concluída', CANCELED: 'Cancelada' };

export function inventoryRows(inventory: InventoryResponse[], batches: BatchResponse[], products: CatalogProduct[]): InventoryRow[] {
  const batchMap = new Map(batches.map((batch) => [batch.id, batch]));
  const productMap = new Map(products.map((product) => [product.id, product]));
  return inventory.map((item) => {
    const batch = batchMap.get(item.batchId);
    const product = batch ? productMap.get(batch.productId) : undefined;
    return { ...item, productId: batch?.productId ?? null, productName: product?.name ?? 'Produto não disponível',
      barcode: product?.barcode ?? 'Não disponível', unitMeasure: product?.unitMeasure ?? '',
      batchCode: batch?.batchCode ?? `Lote ${item.batchId}`, expirationDate: batch?.expirationDate ?? null };
  });
}

export function formatBatchDate(date: string | null): string {
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split('-').reverse().join('/') : 'Não informada';
}

export function formatCountDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Não informada' : date.toLocaleString('pt-BR');
}
