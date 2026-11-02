export interface SupplierRecord {
  id: string;
  addressId: number;
  tradeName: string;
  cnpj: string;
  email: string;
  phone: string;
  linkedSkus: string;
  active: boolean;
}

export interface SupplierFormState {
  addressId: string;
  tradeName: string;
  cnpj: string;
  email: string;
  phone: string;
  active: boolean;
}

export interface SupplierPageState {
  saving: boolean;
  deletionUncertain: boolean;
  search: string;
  records: SupplierRecord[];
  selectedSupplierId: string;
  editDraft: SupplierEditState | null;
  feedback: string;
  feedbackIsError: boolean;
}

export interface SupplierEditState {
  tradeName: string;
  active: boolean;
  email?: string;
  phone?: string;
}

export interface SupplierFormPageState {
  form: SupplierFormState;
  errors: Partial<Record<keyof SupplierFormState, string>>;
  feedback: string;
  feedbackIsError: boolean;
}
