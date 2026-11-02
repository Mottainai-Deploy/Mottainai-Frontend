import { useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import type { EmployeeEditorProps } from '@/types/employee-api.types';
import { useEmployeeEditor } from '@/hooks/useEmployeeEditor';
import { useApiQuery } from '@/hooks/useApiQuery';
import { getEmployeeRoles } from '@/services/employeeRoleService';
import { getStores } from '@/services/storeService';
import type { StoreSummary } from '@/types/store-api.types';
import styles from '@/styles/operations.module.css';

const noStores = async (): Promise<StoreSummary[]> => [];

export default function EmployeeApiEditor(props: EmployeeEditorProps) {
  const { employee, onClose } = props;
  const { draft, mutation, locked, change, review, confirm, cancelReview } = useEmployeeEditor(props);
  const roles = useApiQuery(getEmployeeRoles, []);
  const stores = useApiQuery(employee ? noStores : getStores, []);
  const heading = useRef<HTMLHeadingElement>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const reviewButton = useRef<HTMLButtonElement>(null);
  const reviewOrigin = useRef<HTMLButtonElement | null>(null);
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => {
    if (mutation.review) reviewHeading.current?.focus();
    else if (mutation.error) feedback.current?.focus();
  }, [mutation.review, mutation.error]);
  const submit = (event: FormEvent) => { event.preventDefault(); reviewOrigin.current = reviewButton.current; review('save'); };
  const unavailable = roles.status !== 'success' || stores.status !== 'success';
  return <section className={styles.card} aria-labelledby="employee-editor-heading">
    <h2 id="employee-editor-heading" ref={heading} tabIndex={-1}>{employee ? `Editar ${employee.name}` : 'Novo funcionário'}</h2>
    <p>Alterações exigem permissão administrativa. A API verifica as permissões da sua conta.</p>
    {(roles.status === 'loading' || stores.status === 'loading') && <p role="status">Carregando cargos e lojas…</p>}
    {roles.error && <p role="alert">{roles.error}</p>}{stores.error && <p role="alert">{stores.error}</p>}
    {employee && <p>CPF: {employee.cpf}. Loja: {employee.storeId}. Esses dados são somente leitura nesta API. Status: {employee.active ? 'Ativo' : 'Inativo'}.</p>}
    <form onSubmit={submit}>
      <fieldset className={styles.fields} disabled={locked || unavailable}>
        <legend>Dados do funcionário</legend>
        <div className={styles.grid}>
          <div className={styles.field}><label htmlFor="staff-name">Nome completo</label><input id="staff-name" autoComplete="name" maxLength={150} required value={draft.name} onChange={(e) => change('name', e.target.value)} /></div>
          {!employee && <div className={styles.field}><label htmlFor="staff-cpf">CPF (11 dígitos)</label><input id="staff-cpf" inputMode="numeric" maxLength={14} required value={draft.cpf} onChange={(e) => change('cpf', e.target.value)} /></div>}
          <div className={styles.field}><label htmlFor="staff-email">E-mail{(draft.createLogin || employee?.userId != null) ? ' (obrigatório para acesso)' : ' (opcional)'}</label><input id="staff-email" type="email" autoComplete="email" maxLength={150} required={draft.createLogin || employee?.userId != null} value={draft.email} onChange={(e) => change('email', e.target.value)} /></div>
          <div className={styles.field}><label htmlFor="staff-phone">Telefone (opcional)</label><input id="staff-phone" type="tel" autoComplete="tel" maxLength={20} value={draft.phone} onChange={(e) => change('phone', e.target.value)} /></div>
          <div className={styles.field}><label htmlFor="staff-role">Cargo</label><select id="staff-role" required={!employee} value={draft.roleId} onChange={(e) => change('roleId', e.target.value)}><option value="">{employee ? `Manter cargo atual: ${employee.role}` : 'Selecione um cargo'}</option>{roles.data.filter((r) => r.active).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
          {!employee && <><div className={styles.field}><label htmlFor="staff-store">Loja</label><select id="staff-store" required value={draft.storeId} onChange={(e) => change('storeId', e.target.value)}><option value="">Selecione uma loja</option>{stores.data.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div className={styles.field}><label htmlFor="staff-hire">Data de admissão</label><input id="staff-hire" type="date" required value={draft.hireDate} onChange={(e) => change('hireDate', e.target.value)} /></div>
            <div className={styles.field}><label htmlFor="staff-login">Acesso ao sistema</label><select id="staff-login" value={String(draft.createLogin)} onChange={(e) => change('createLogin', e.target.value === 'true')}><option value="false">Cadastrar sem acesso</option><option value="true">Criar acesso e solicitar convite por e-mail</option></select></div></>}
        </div>
        <button type="submit" ref={reviewButton}>Revisar cadastro</button>
      </fieldset>
    </form>
    {employee && <div className={styles.actions}>
      <button type="button" disabled={locked} onClick={(event) => { reviewOrigin.current = event.currentTarget; review('status'); }}>{employee.active ? 'Revisar desativação' : 'Revisar ativação'}</button>
      <button type="button" disabled={locked || !employee.email || (employee.userId !== null && employee.active)} onClick={(event) => { reviewOrigin.current = event.currentTarget; review('invite'); }}>Revisar convite de acesso</button>
    </div>}
    {mutation.review && <section className={styles.card} aria-labelledby="staff-review-title">
      <h2 id="staff-review-title" ref={reviewHeading} tabIndex={-1}>Confirmar {mutation.action === 'status' ? (employee?.active ? 'desativação' : 'ativação') : mutation.action === 'invite' ? 'convite de acesso' : 'cadastro'}</h2>
      {mutation.action === 'save' ? <>
        <p>{draft.name} — {draft.email || 'Sem e-mail'} — {draft.phone || 'Sem telefone'}.</p>
        <p>Cargo: {roles.data.find((r) => String(r.id) === draft.roleId)?.name ?? employee?.role}. Loja: {draft.storeId}.</p>
        {!employee && <p>CPF: {draft.cpf}. Admissão: {draft.hireDate}. {draft.createLogin ? 'Será solicitado um convite por e-mail. O acesso depende da ativação do convite.' : 'O cadastro será criado sem acesso ao sistema.'}</p>}
        {employee && draft.email.trim().toLowerCase() !== (employee.email ?? '').toLowerCase() && employee.userId !== null && <p>A troca do e-mail pode desativar o acesso e solicitar novo convite.</p>}
      </> : <p>{mutation.action === 'invite' ? `Solicitar convite para ${employee?.email}. A API verifica se o cadastro pode receber o convite.` : `Alterar o status de ${employee?.name} para ${employee?.active ? 'Inativo' : 'Ativo'}. Isso pode afetar o acesso ao sistema.`}</p>}
      <div className={styles.actions}><button type="button" disabled={mutation.busy} onClick={() => void confirm()}>Confirmar operação</button><button type="button" disabled={mutation.busy} onClick={() => { cancelReview(); requestAnimationFrame(() => reviewOrigin.current?.focus()); }}>Voltar sem confirmar</button></div>
    </section>}
    {mutation.busy && <p role="status">Enviando operação…</p>}
    {mutation.error && <p role="alert" ref={feedback} tabIndex={-1}>{mutation.error}</p>}
    <button type="button" disabled={mutation.busy} onClick={onClose}>Voltar à lista de funcionários</button>
  </section>;
}
