import { Link } from 'react-router-dom';
import DropdownSelect from '@/components/DropdownSelect';
import { useCatalogProductRegistration } from '@/hooks/useCatalogProductRegistration';
import type { CatalogProductField } from '@/types/catalog-product.types';
import styles from './style.module.css';

const fields: CatalogProductField[] = [
  { name: 'name', label: 'Nome do produto', required: true, maxLength: 150 },
  { name: 'barcode', label: 'Código de barras', required: true, maxLength: 30 },
  { name: 'ncm', label: 'NCM (8 dígitos)', required: true, maxLength: 8, inputMode: 'numeric' },
  { name: 'cest', label: 'CEST (7 dígitos, opcional)', maxLength: 7, inputMode: 'numeric' },
  { name: 'brand', label: 'Marca', maxLength: 100 },
  { name: 'unitMeasure', label: 'Unidade de medida', required: true, maxLength: 20 },
  { name: 'weight', label: 'Peso (opcional)', inputMode: 'decimal' },
  { name: 'description', label: 'Descrição' },
];

export default function ProductsRegistration() {
  const registration = useCatalogProductRegistration();
  const { state, change, categories, taxProfiles } = registration;
  const busy = state.status === 'saving';
  return (
    <section className={styles.page} aria-labelledby="registration-title">
      <section className={styles.card}>
        <h1 id="registration-title">Novo produto</h1>
        <p>O SKU é gerado após o cadastro. Preencha os dados fiscais de acordo com o produto.</p>
        {(categories.status === 'loading' || taxProfiles.status === 'loading') && <p role="status">Carregando categorias e perfis fiscais…</p>}
        {categories.status === 'error' && <p role="alert">{categories.error}</p>}
        {taxProfiles.status === 'error' && <p role="alert">{taxProfiles.error}</p>}
        {categories.status === 'success' && registration.availableCategories.length === 0 && <p role="status">Não há categorias ativas disponíveis.</p>}
        {taxProfiles.status === 'success' && registration.availableTaxProfiles.length === 0 && <p role="status">Não há perfis fiscais ativos disponíveis.</p>}
        <form className={styles['single-form']} onSubmit={registration.submit} noValidate aria-labelledby="registration-title">
          <fieldset disabled={busy} className={styles.catalogFields}>
            <legend>Dados cadastrais do produto</legend>
            <div className={styles['form-grid']}>
              {fields.map((field) => (
                <label key={field.name} htmlFor={`catalog-${field.name}`}>
                  {field.label}{field.required ? ' *' : ''}
                  <input id={`catalog-${field.name}`} name={field.name} value={state.values[field.name]}
                    required={field.required} maxLength={field.maxLength} inputMode={field.inputMode}
                    onChange={(event) => change(field.name, event.target.value)}
                    aria-invalid={Boolean(state.errors[field.name])}
                    aria-describedby={state.errors[field.name] ? `catalog-${field.name}-error` : undefined} />
                  {state.errors[field.name] && <span className={styles.fieldError} id={`catalog-${field.name}-error`}>{state.errors[field.name]}</span>}
                </label>
              ))}
              <label htmlFor="catalog-categoryId">Categoria *
                <DropdownSelect id="catalog-categoryId" value={state.values.categoryId}
                  onChange={(event) => change('categoryId', event.target.value)} required
                  ariaInvalid={Boolean(state.errors.categoryId)} ariaDescribedBy={state.errors.categoryId ? 'catalog-categoryId-error' : undefined}>
                  <option value="">Selecione</option>
                  {registration.availableCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </DropdownSelect>
                {state.errors.categoryId && <span className={styles.fieldError} id="catalog-categoryId-error">{state.errors.categoryId}</span>}
              </label>
              <label htmlFor="catalog-taxProfileId">Perfil fiscal *
                <DropdownSelect id="catalog-taxProfileId" value={state.values.taxProfileId}
                  onChange={(event) => change('taxProfileId', event.target.value)} required
                  ariaInvalid={Boolean(state.errors.taxProfileId)} ariaDescribedBy={state.errors.taxProfileId ? 'catalog-taxProfileId-error' : undefined}>
                  <option value="">Selecione</option>
                  {registration.availableTaxProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.code} — {profile.name}</option>)}
                </DropdownSelect>
                {state.errors.taxProfileId && <span className={styles.fieldError} id="catalog-taxProfileId-error">{state.errors.taxProfileId}</span>}
              </label>
            </div>
          </fieldset>
          <div className={styles.actions}>
            <button type="submit" className={styles.primary} disabled={busy || !registration.ready}>Cadastrar produto</button>
            <Link className={styles.secondary} to="/products">Voltar para produtos</Link>
          </div>
          {state.message && <p className={state.status === 'error' ? styles.error : styles.message} role={state.status === 'error' ? 'alert' : 'status'}>{state.message}</p>}
          {state.created && <Link to={`/products/${state.created.id}`}>Abrir produto cadastrado</Link>}
        </form>
      </section>
    </section>
  );
}
