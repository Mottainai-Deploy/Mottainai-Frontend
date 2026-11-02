export type PromotionStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
export type PromotionType = 'DISCOUNT_PERCENT' | 'DISCOUNT_FIXED' | 'SPECIAL_PRICE';
export interface PromotionFields {
  name: string;
  description?: string | null;
  promotionType: PromotionType;
  startsAt: string;
  endsAt: string;
  active?: boolean | null;
}
export interface CreatePromotionPayload extends PromotionFields { storeId: number; }
export interface UpdatePromotionPayload {
  name?: string;
  description?: string | null;
  promotionType?: PromotionType;
  startsAt?: string;
  endsAt?: string;
  active?: boolean | null;
}
export interface PromotionResponse extends PromotionFields {
  id: number;
  storeId: number;
  status: PromotionStatus;
  active: boolean;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface PromotionItemFields {
  originalPrice: number;
  promotionalPrice: number;
  quantityAvailable?: number | null;
}
export interface CreatePromotionItemPayload extends PromotionItemFields { productId: number; }
export interface PromotionItemResponse extends PromotionItemFields {
  id: number;
  promotionId: number;
  productId: number;
  productName: string;
  createdAt: string;
}
