import type { CreatePromotionPayload, CreatePromotionItemPayload, UpdatePromotionPayload, PromotionItemFields } from './promotion-api.types';

export interface PromotionDraft {
  name: string;
  description: string;
  promotionType: string;
  startsAt: string;
  endsAt: string;
}

export interface PromotionItemDraft {
  productId: string;
  originalPrice: string;
  promotionalPrice: string;
  quantityAvailable: string;
}

export type PendingPromotionWrite =
  | { kind: 'create'; payload: CreatePromotionPayload }
  | { kind: 'update'; id: number; payload: UpdatePromotionPayload }
  | { kind: 'createItem'; promotionId: number; payload: CreatePromotionItemPayload }
  | { kind: 'updateItem'; promotionId: number; id: number; payload: PromotionItemFields };

export interface PromotionOperationsState {
  revision: number;
  selectedId: number | null;
  draft: PromotionDraft;
  itemDraft: PromotionItemDraft;
  editing: boolean;
  editingItemId: number | null;
  pending: PendingPromotionWrite | null;
  reviewing: boolean;
  busy: boolean;
  uncertain: boolean;
  feedback: string;
  feedbackIsError: boolean;
  search: string;
}
