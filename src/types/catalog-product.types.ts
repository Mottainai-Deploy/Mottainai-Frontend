export interface CatalogProduct {
  id: number;
  companyId: number;
  categoryId: number;
  categoryName: string;
  taxProfileId: number;
  sku: string;
  barcode: string;
  ncm: string;
  cest: string | null;
  name: string;
  description: string | null;
  brand: string | null;
  unitMeasure: string;
  weight: number | null;
  active: boolean;
  version: number;
}

export interface CreateCatalogProduct {
  categoryId: number;
  taxProfileId: number;
  barcode: string;
  ncm: string;
  cest: string | null;
  name: string;
  description: string;
  brand: string;
  unitMeasure: string;
  weight: number | null;
}

export interface CatalogProductForm {
  name: string;
  barcode: string;
  categoryId: string;
  taxProfileId: string;
  ncm: string;
  cest: string;
  brand: string;
  description: string;
  unitMeasure: string;
  weight: string;
}
export type CatalogProductErrors = Partial<Record<keyof CatalogProductForm, string>>;

export interface CatalogProductFormState {
  values: CatalogProductForm;
  errors: CatalogProductErrors;
  status: 'idle' | 'saving' | 'success' | 'error';
  message: string;
  created: CatalogProduct | null;
}
export interface CatalogProductField {
  name: Exclude<keyof CatalogProductForm, 'categoryId' | 'taxProfileId'>;
  label: string;
  required?: boolean;
  maxLength?: number;
  inputMode?: 'text' | 'decimal' | 'numeric';
}
