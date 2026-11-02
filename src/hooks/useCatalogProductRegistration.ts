import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { CatalogProductForm, CatalogProductFormState } from '@/types/catalog-product.types';
import { createProduct } from '@/services/productService';
import { getProductCategories } from '@/services/productCategoryService';
import { getTaxProfiles } from '@/services/taxProfileService';
import { validateCatalogProduct } from '@/utils/catalogProductValidation';
import { useApiQuery } from './useApiQuery';

const initialValues: CatalogProductForm = { name: '', barcode: '', categoryId: '', taxProfileId: '', ncm: '', cest: '', brand: '', description: '', unitMeasure: '', weight: '' };

export function useCatalogProductRegistration() {
  const categories = useApiQuery(getProductCategories, []);
  const taxProfiles = useApiQuery(getTaxProfiles, []);
  const submitting = useRef(false);
  const [state, setState] = useState<CatalogProductFormState>({ values: initialValues, errors: {}, status: 'idle', message: '', created: null });
  const availableCategories = categories.data.filter((category) => category.active);
  const availableTaxProfiles = taxProfiles.data.filter((profile) => profile.active);
  const ready = categories.status === 'success' && taxProfiles.status === 'success'
    && availableCategories.length > 0 && availableTaxProfiles.length > 0;

  function change(field: keyof CatalogProductForm, value: string): void {
    setState((previous) => ({ ...previous, values: { ...previous.values, [field]: value },
      errors: { ...previous.errors, [field]: undefined }, status: 'idle', message: '', created: null }));
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting.current || !ready) return;
    const errors = validateCatalogProduct(state.values);
    if (!availableCategories.some((item) => String(item.id) === state.values.categoryId)) errors.categoryId = 'Selecione uma categoria disponível.';
    if (!availableTaxProfiles.some((item) => String(item.id) === state.values.taxProfileId)) errors.taxProfileId = 'Selecione um perfil fiscal disponível.';
    if (Object.keys(errors).length) {
      setState((previous) => ({ ...previous, errors, status: 'error', message: 'Revise os campos indicados.' }));
      const field = Object.keys(errors)[0];
      event.currentTarget.querySelector<HTMLElement>(`#catalog-${field}`)?.focus();
      return;
    }
    submitting.current = true;
    setState((previous) => ({ ...previous, status: 'saving', errors: {}, message: 'Cadastrando produto…' }));
    try {
      const created = await createProduct(state.values);
      setState({ values: initialValues, errors: {}, status: 'success', message: `Produto ${created.name} cadastrado. SKU: ${created.sku}.`, created });
    } catch (error) {
      setState((previous) => ({ ...previous, status: 'error', message: error instanceof Error ? error.message : 'Não foi possível cadastrar o produto.' }));
    } finally { submitting.current = false; }
  }

  return { state, categories, taxProfiles, availableCategories, availableTaxProfiles, ready, change, submit };
}
