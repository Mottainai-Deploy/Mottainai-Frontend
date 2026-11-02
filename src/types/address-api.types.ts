export interface AddressPayload {
  zipCode: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
}
export interface AddressResponse extends AddressPayload { id: number }
