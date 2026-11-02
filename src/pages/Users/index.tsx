import { useRef } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import ReusableTable from '@/components/ReusableTable';
import EmployeeApiEditor from '@/components/EmployeeApiEditor';
import EmployeeAudit from '@/components/EmployeeAudit';
import { useEmployeeDirectory } from '@/hooks/useEmployeeDirectory';
import type { ApiEmployee } from '@/types/employee-api.types';
import type { ReusableTableColumn } from '@/types/reusable-table.types';
import { formatCountDate } from '@/utils/inventoryPresentation';
import styles from '@/styles/operations.module.css';

function EmployeeDirectory() {
  const { state, setState, query, employees, roles } = useEmployeeDirectory();
  const listHeading = useRef<HTMLHeadingElement>(null);
  const restoreFocus = () => requestAnimationFrame(() => listHeading.current?.focus());
  const close = () => { setState((s) => ({ ...s, editing: null })); restoreFocus(); };
  const columns: ReusableTableColumn<ApiEmployee>[] = [
    { id: 'name', header: 'Nome', renderCell: (e) => e.name },
    { id: 'cpf', header: 'CPF protegido', renderCell: (e) => e.cpf },
    { id: 'role', header: 'Cargo', renderCell: (e) => e.role },
    { id: 'store', header: 'Loja (ID)', renderCell: (e) => e.storeId },
    { id: 'status', header: 'Status', renderCell: (e) => e.active ? 'Ativo' : 'Inativo' },
    { id: 'access', header: 'Último acesso', renderCell: (e) => e.lastLogin ? formatCountDate(e.lastLogin) : 'Sem acesso registrado' },
    { id: 'edit', header: 'Ações', renderCell: () => '', display: 'action', actionText: () => 'Gerenciar funcionário', actionLabel: (e) => `Gerenciar funcionário ${e.name}`, onAction: (employee) => {
      setState((s) => ({ ...s, editing: employee, notice: '' }));
    } },
  ];
  if (state.editing) return <EmployeeApiEditor key={state.editing.employeeId} employee={state.editing} onClose={close} onSaved={() => {
    setState((s) => ({ ...s, editing: null, reload: s.reload + 1, notice: 'Operação confirmada pela API. A lista será consultada novamente. Se houve solicitação de convite, a entrega depende do serviço de e-mail.' }));
    restoreFocus();
  }} />;
  return <>
    <h2 ref={listHeading} tabIndex={-1}>Funcionários cadastrados</h2>
    <div className={styles.card}>
      <div className={styles.grid}>
        <div className={styles.field}><label htmlFor="staff-search">Buscar por nome</label><input id="staff-search" value={state.search} onChange={(e) => setState((s) => ({ ...s, search: e.target.value }))} /></div>
        <div className={styles.field}><label htmlFor="staff-scope">Consultar funcionários</label><select id="staff-scope" value={state.scope} onChange={(e) => setState((s) => ({ ...s, scope: e.target.value, role: '' }))}><option value="store">Minha loja</option><option value="company">Empresa (administrador)</option></select></div>
        <div className={styles.field}><label htmlFor="staff-filter-role">Filtrar por cargo</label><select id="staff-filter-role" value={state.role} onChange={(e) => setState((s) => ({ ...s, role: e.target.value }))}><option value="">Todos os cargos</option>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></div>
      </div>
      <div className={styles.actions}><Link className={styles.link} to="/users/new">Novo funcionário</Link><button type="button" onClick={() => setState((s) => ({ ...s, reload: s.reload + 1 }))}>Atualizar lista</button></div>
    </div>
    {state.notice && <p role="status">{state.notice}</p>}
    {query.status === 'loading' && <p role="status">Carregando funcionários…</p>}
    {query.status === 'error' && <p role="alert">{query.error}</p>}
    {query.status === 'success' && <><p role="status">Consulta concluída: {employees.length} funcionários encontrados.</p><ReusableTable title="Funcionários" columns={columns} data={employees} rowKey={(e) => e.employeeId} emptyMessage="Nenhum funcionário corresponde à consulta." /></>}
  </>;
}

export default function Users() {
  const { pathname, state } = useLocation();
  const navigate = useNavigate();
  const createdId: unknown = state && typeof state === 'object' && 'employeeCreated' in state ? state.employeeCreated : null;
  if (!['/users', '/users/new', '/users/audit'].includes(pathname)) return <Navigate to="/users" replace />;
  return <section className={styles.page} aria-labelledby="users-title">
    <h1 id="users-title">Administração de funcionários</h1>
    <nav className={styles.actions} aria-label="Funcionários"><Link className={styles.link} to="/users">Funcionários</Link><Link className={styles.link} to="/users/audit">Auditoria</Link></nav>
    {pathname === '/users' && <>{typeof createdId === 'number' && <p role="status">Funcionário {createdId} cadastrado pela API. Se solicitado, o convite depende da entrega pelo serviço de e-mail.</p>}<EmployeeDirectory /></>}
    {pathname === '/users/audit' && <EmployeeAudit />}
    {pathname === '/users/new' && <EmployeeApiEditor employee={null} onClose={() => navigate('/users')} onSaved={(employee) => navigate('/users', { state: { employeeCreated: employee.employeeId } })} />}
  </section>;
}
