import { useEffect, useRef } from 'react';
import type { ProductOperationsProps } from '@/types/product-operations.types';
import { useProductOperations } from '@/hooks/useProductOperations';
import { productPrice } from '@/utils/productOperationsValidation';
import styles from '@/styles/operations.module.css';

export default function ProductOperations(props: ProductOperationsProps) {
  const editor = useProductOperations(props);
  const { state, query } = editor;
  const heading = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLParagraphElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (state.stage === 'review') heading.current?.focus();
    if (state.stage === 'error' || state.stage === 'uncertain') feedback.current?.focus();
  }, [state.stage]);
  const storeId = query.data?.profile.storeId;
  const price = query.data?.prices.find(item => item.storeId === storeId && item.active && item.validUntil === null);
  return <section className={styles.page} aria-labelledby="product-operations-title">
    <h2 id="product-operations-title">Alterações do produto</h2>
    <div className={styles.card}>
      <p>O status do cadastro se aplica ao produto da empresa.</p>
      <button type="button" disabled={editor.blocked || state.stage === 'review'} onClick={event => { trigger.current = event.currentTarget; editor.review('status'); }}>
        {props.product.active ? 'Revisar desativação do produto' : 'Revisar ativação do produto'}
      </button>
    </div>
    <button type="button" disabled={editor.blocked || state.stage === 'review'} onClick={event => { trigger.current = event.currentTarget; editor.review('delete'); }}>Revisar exclusão do produto</button>
    {query.status === 'loading' && <p role="status">Carregando loja e preços…</p>}
    {query.status === 'error' && <p role="alert">{query.error}</p>}
    {query.status === 'success' && query.data && <>
      <p role="status">Loja vinculada à conta: {storeId}. Preço ativo: {price ? price.regularPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Não cadastrado'}.</p>
      <form className={styles.card} noValidate onSubmit={event => { event.preventDefault(); editor.review('price'); }}>
        <label htmlFor="product-store-price">Novo preço da sua loja (R$)</label>
        <input id="product-store-price" inputMode="decimal" value={state.price} disabled={editor.blocked || state.stage === 'review'}
          aria-describedby="product-price-hint" onChange={event => editor.changePrice(event.target.value)} />
        <p id="product-price-hint">Informe um valor maior que zero, com até duas casas decimais. A alteração afeta somente a loja {storeId}.</p>
        <button type="submit" disabled={editor.blocked || state.stage === 'review'} onClick={event => { trigger.current = event.currentTarget; }}>Revisar novo preço</button>
      </form>
    </>}
    {state.stage === 'review' && <section className={styles.card} aria-labelledby="product-change-review">
      <h3 id="product-change-review" ref={heading} tabIndex={-1}>Revisar alteração</h3>
      <p>{state.action === 'delete' ? `Excluir o cadastro de ${props.product.name}? O servidor verificará os vínculos e as permissões antes de excluir.` : state.action === 'price' ? `Confirmar preço de ${productPrice(state.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} para a loja ${storeId}?` : `Confirmar ${props.product.active ? 'desativação' : 'ativação'} de ${props.product.name}?`}</p>
      <div className={styles.actions}>
        <button type="button" onClick={() => void editor.confirm()}>Confirmar alteração do produto</button>
        <button type="button" onClick={() => { editor.cancel(); window.requestAnimationFrame(() => trigger.current?.focus()); }}>Voltar sem alterar</button>
      </div>
    </section>}
    {state.message && <p ref={feedback} tabIndex={-1} role={state.stage === 'error' || state.stage === 'uncertain' ? 'alert' : 'status'}>{state.message}</p>}
    {state.stage === 'uncertain' && <div className={styles.card}>
      <p>A resposta foi inconclusiva. Consulte os dados antes de tentar outra alteração.</p>
      <button type="button" onClick={() => void editor.check()}>Consultar produto e preços novamente</button>
    </div>}
  </section>;
}
