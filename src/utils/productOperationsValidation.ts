import { operationalDecimal } from './operationalValidation';

export function productPrice(value: string): number {
  const clean = value.trim().replace(',', '.');
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(clean)) throw new Error('Informe um preço maior que zero, com até duas casas decimais.');
  return operationalDecimal(Number(clean), 0.01, 2, 10);
}

export function productActive(value: boolean): boolean {
  if (typeof value !== 'boolean') throw new Error('Informe um status válido para o produto.');
  return value;
}
