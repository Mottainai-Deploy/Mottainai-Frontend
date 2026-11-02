import type { CatalogProductForm, CatalogProductErrors, CreateCatalogProduct } from '@/types/catalog-product.types';

export function validateCatalogProduct(form: CatalogProductForm): CatalogProductErrors {
  const errors: CatalogProductErrors = {};
  if (!form.name.trim() || form.name.trim().length > 150) errors.name = 'Informe um nome de até 150 caracteres.';
  if (!form.barcode.trim() || form.barcode.trim().length > 30) errors.barcode = 'Informe um código de barras de até 30 caracteres.';
  if (!/^[1-9]\d*$/.test(form.categoryId)) errors.categoryId = 'Selecione uma categoria.';
  if (!/^[1-9]\d*$/.test(form.taxProfileId)) errors.taxProfileId = 'Selecione um perfil fiscal.';
  if (!/^\d{8}$/.test(form.ncm.trim())) errors.ncm = 'Informe os 8 dígitos do NCM.';
  if (form.cest.trim() && !/^\d{7}$/.test(form.cest.trim())) errors.cest = 'Informe os 7 dígitos do CEST ou deixe vazio.';
  if (form.brand.trim().length > 100) errors.brand = 'Use até 100 caracteres.';
  if (!form.unitMeasure.trim() || form.unitMeasure.trim().length > 20) errors.unitMeasure = 'Informe uma unidade de até 20 caracteres.';
  if (form.weight.trim() && !/^\d{1,7}([.,]\d{1,3})?$/.test(form.weight.trim())) errors.weight = 'Informe um peso positivo ou zero, com até 7 dígitos inteiros e 3 decimais.';
  return errors;
}

export function toCatalogProductPayload(form: CatalogProductForm): CreateCatalogProduct {
  const errors = validateCatalogProduct(form);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  return { categoryId: Number(form.categoryId), taxProfileId: Number(form.taxProfileId),
    name: form.name.trim(), barcode: form.barcode.trim(), ncm: form.ncm.trim(),
    cest: form.cest.trim() || null, brand: form.brand.trim(), description: form.description.trim(),
    unitMeasure: form.unitMeasure.trim(), weight: form.weight.trim() ? Number(form.weight.trim().replace(',', '.')) : null };
}
