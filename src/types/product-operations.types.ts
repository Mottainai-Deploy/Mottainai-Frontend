import type { ApiProfile } from './api.types';
import type { CatalogProduct } from './catalog-product.types';

export interface StoreProductPrice {
  id: number;
  storeId: number;
  productId: number;
  regularPrice: number;
  validFrom: string;
  validUntil: string | null;
  active: boolean;
  version: number;
}
export interface ProductOperationsContext {
  profile: ApiProfile;
  prices: StoreProductPrice[];
}
export interface ProductOperationsProps {
  product: CatalogProduct;
  onChanged: (message: string) => void;
  onDeleted: () => void;
}
export interface ProductOperationsState {
  price: string;
  action: 'price' | 'status' | 'delete' | null;
  stage: 'idle' | 'review' | 'saving' | 'error' | 'uncertain';
  message: string;
  revision: number;
}
