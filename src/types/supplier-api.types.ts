import type { AddressPayload, AddressResponse } from './address-api.types';

export interface SupplierResponse {
  id: number;
  address: AddressResponse;
  tradeName: string;
  cnpj: string;
  email: string | null;
  phone: string | null;
  active: boolean;
}
export interface CreateSupplierPayload {
  address: AddressPayload;
  tradeName: string;
  cnpj: string;
  email: string;
  phone: string;
}
export interface UpdateSupplierPayload {
  address: AddressPayload;
  tradeName: string;
  email: string;
  phone: string;
  active: boolean;
}
