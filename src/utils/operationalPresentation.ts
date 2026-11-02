import type { PurchaseOrderStatus } from '@/types/purchase-order-api.types';
import type { ReceivingStatus } from '@/types/receiving-api.types';
import type { PromotionStatus, PromotionType } from '@/types/promotion-api.types';
import type { DonationStatus } from '@/types/donation-api.types';
import type { PreListStatus } from '@/types/replenishment-api.types';

export const purchaseOrderStatusLabels: Record<PurchaseOrderStatus, string> = {
  PENDING: 'Pendente', APPROVED: 'Aprovado', CANCELED: 'Cancelado',
};

export const receivingStatusLabels: Record<ReceivingStatus, string> = {
  PENDING: 'Pendente de conferência', CONFIRMED: 'Confirmado', DIVERGENT: 'Divergente',
};

export const promotionStatusLabels: Record<PromotionStatus, string> = {
  DRAFT: 'Rascunho', PENDING_APPROVAL: 'Pendente de aprovação', APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada', CANCELLED: 'Cancelada', EXPIRED: 'Expirada',
};

export const promotionTypeLabels: Record<PromotionType, string> = {
  DISCOUNT_PERCENT: 'Desconto percentual', DISCOUNT_FIXED: 'Desconto fixo', SPECIAL_PRICE: 'Preço especial',
};

export const donationStatusLabels: Record<DonationStatus, string> = {
  REGISTERED: 'Registrada; entrega pendente', COMPLETED: 'Concluída', CANCELED: 'Cancelada',
};

export const preListStatusLabels: Record<PreListStatus, string> = {
  GENERATED: 'Gerada', IN_PROGRESS: 'Em andamento', COMPLETED: 'Concluída', CANCELED: 'Cancelada',
};
