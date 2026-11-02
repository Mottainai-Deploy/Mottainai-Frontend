import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import EmployeeApiEditor from '../src/components/EmployeeApiEditor';
import Users from '../src/pages/Users';
import { changeEmployeeStatus, createEmployee, getCompanyEmployees, getStoreEmployees, inviteEmployee, updateEmployee } from '../src/services/employeeService';
import { getEmployeeRoles } from '../src/services/employeeRoleService';
import { getStores } from '../src/services/storeService';
import { getAuditLogs } from '../src/services/auditService';
import { ApiRequestError } from '../src/services/apiClient';
import type { ApiEmployee } from '../src/types/employee-api.types';

vi.mock('../src/services/employeeService', () => ({ changeEmployeeStatus: vi.fn(), createEmployee: vi.fn(), getCompanyEmployees: vi.fn(), getStoreEmployees: vi.fn(), inviteEmployee: vi.fn(), updateEmployee: vi.fn() }));
vi.mock('../src/services/employeeRoleService', () => ({ getEmployeeRoles: vi.fn() }));
vi.mock('../src/services/storeService', () => ({ getStores: vi.fn() }));
vi.mock('../src/services/auditService', () => ({ getAuditLogs: vi.fn() }));
const employee: ApiEmployee = { employeeId: 7, userId: 9, name: 'Pessoa de teste', cpf: '***.***.***-12', email: 'teste@example.invalid', phone: null, role: 'Cargo personalizado', storeId: 10, active: true, lastLogin: null };
beforeEach(() => {
  vi.mocked(createEmployee).mockReset(); vi.mocked(updateEmployee).mockReset(); vi.mocked(changeEmployeeStatus).mockReset(); vi.mocked(inviteEmployee).mockReset();
  vi.mocked(getEmployeeRoles).mockResolvedValue([{ id: 50, name: 'Cargo personalizado', active: true, permissionLevel: 40, description: null }]);
  vi.mocked(getStores).mockResolvedValue([{ id: 10, name: 'Loja de teste', active: true }]);
  vi.mocked(getStoreEmployees).mockResolvedValue([employee]);
  vi.mocked(getCompanyEmployees).mockResolvedValue([employee]);
  vi.mocked(getAuditLogs).mockResolvedValue([]);
});
afterEach(cleanup);
async function editor(editing: ApiEmployee | null = null) {
  const onSaved = vi.fn();
  render(<EmployeeApiEditor employee={editing} onClose={vi.fn()} onSaved={onSaved} />);
  await screen.findByRole('option', { name: 'Cargo personalizado' });
  await waitFor(() => expect((screen.getByLabelText('Nome completo').closest('fieldset') as HTMLFieldSetElement).disabled).toBe(false));
  return onSaved;
}
async function newEmployee(login = false) {
  const saved = await editor();
  fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: '  Pessoa nova  ' } });
  fireEvent.change(screen.getByLabelText('CPF (11 dígitos)'), { target: { value: '123.456.789-01' } });
  fireEvent.change(screen.getByLabelText('Cargo'), { target: { value: '50' } });
  fireEvent.change(screen.getByLabelText('Loja'), { target: { value: '10' } });
  fireEvent.change(screen.getByLabelText('Data de admissão'), { target: { value: '2026-11-01' } });
  if (login) {
    fireEvent.change(screen.getByLabelText('Acesso ao sistema'), { target: { value: 'true' } });
    fireEvent.change(screen.getByLabelText(/E-mail/), { target: { value: 'NOVO@example.invalid' } });
  }
  fireEvent.click(screen.getByRole('button', { name: 'Revisar cadastro' }));
  await screen.findByRole('heading', { name: 'Confirmar cadastro' });
  return saved;
}
it('cadastra com cargo e loja reais, somente após confirmação e sem acesso por padrão', async () => {
  vi.mocked(createEmployee).mockResolvedValue({ ...employee, userId: null });
  const saved = await newEmployee();
  expect(createEmployee).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar operação' }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(createEmployee).toHaveBeenCalledWith({ name: 'Pessoa nova', cpf: '12345678901', email: null, phone: null, roleId: 50, storeId: 10, hireDate: '2026-11-01', createLogin: false });
});
it('cria acesso somente quando escolhido explicitamente', async () => {
  vi.mocked(createEmployee).mockResolvedValue(employee);
  await newEmployee(true);
  expect(screen.getByText(/Será solicitado um convite/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar operação' }));
  await waitFor(() => expect(createEmployee).toHaveBeenCalledWith(expect.objectContaining({ createLogin: true, email: 'novo@example.invalid' })));
});
it('preserva cargo na edição e não reenvia CPF protegido nem loja', async () => {
  vi.mocked(updateEmployee).mockResolvedValue(employee);
  const saved = await editor(employee);
  fireEvent.click(screen.getByRole('button', { name: 'Revisar cadastro' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Confirmar operação' }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(updateEmployee).toHaveBeenCalledWith(7, { name: employee.name, email: employee.email, phone: null, roleId: null });
});
it('bloqueia novo envio quando o resultado do cadastro é desconhecido', async () => {
  vi.mocked(createEmployee).mockRejectedValue(new Error('Conexão perdida'));
  const saved = await newEmployee();
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar operação' }));
  await screen.findByRole('alert');
  expect(screen.getByRole('alert').textContent).toContain('confira o cadastro');
  expect((screen.getByLabelText('Nome completo').closest('fieldset') as HTMLFieldSetElement).disabled).toBe(true);
  expect(screen.queryByRole('button', { name: 'Confirmar operação' })).toBeNull();
  expect(createEmployee).toHaveBeenCalledTimes(1); expect(saved).not.toHaveBeenCalled();
});
it('mostra a recusa de permissão e permite corrigir após erro conhecido', async () => {
  vi.mocked(updateEmployee).mockRejectedValue(new ApiRequestError('Sem permissão administrativa', 403));
  const saved = await editor(employee);
  fireEvent.click(screen.getByRole('button', { name: 'Revisar cadastro' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Confirmar operação' }));
  await screen.findByText('Sem permissão administrativa');
  expect((screen.getByLabelText('Nome completo').closest('fieldset') as HTMLFieldSetElement).disabled).toBe(false);
  expect(saved).not.toHaveBeenCalled();
});
it('altera status e solicita convite por rotas separadas e após revisão', async () => {
  vi.mocked(changeEmployeeStatus).mockResolvedValue({ ...employee, active: false });
  const saved = await editor(employee);
  fireEvent.click(screen.getByRole('button', { name: 'Revisar desativação' }));
  expect(changeEmployeeStatus).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByRole('button', { name: 'Confirmar operação' }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(changeEmployeeStatus).toHaveBeenCalledWith(7, false);
  cleanup();
  vi.mocked(inviteEmployee).mockResolvedValue(employee);
  await editor({ ...employee, active: false });
  fireEvent.click(screen.getByRole('button', { name: 'Revisar convite de acesso' }));
  expect(inviteEmployee).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByRole('button', { name: 'Confirmar operação' }));
  await waitFor(() => expect(inviteEmployee).toHaveBeenCalledWith(7));
});
it('consulta a loja e distingue falta de permissão de lista vazia da empresa', async () => {
  vi.mocked(getCompanyEmployees).mockRejectedValue(new ApiRequestError('Consulta da empresa não autorizada', 403));
  render(<MemoryRouter initialEntries={['/users']}><Users /></MemoryRouter>);
  await screen.findByText(employee.name);
  fireEvent.change(screen.getByLabelText('Consultar funcionários'), { target: { value: 'company' } });
  await screen.findByText('Consulta da empresa não autorizada');
  expect(screen.queryByText('Nenhum funcionário corresponde à consulta.')).toBeNull();
});
it('auditoria usa registros da API e não inventa IP ou histórico local', async () => {
  vi.mocked(getAuditLogs).mockResolvedValue([{ auditId: 99, tableAffected: 'employee', operation: 'INSERT', recordId: '7', userId: 9, oldData: null, newData: { sensitive: 'não mostrar' }, operationDate: '2026-11-01T12:00:00' }]);
  render(<MemoryRouter initialEntries={['/users/audit']}><Users /></MemoryRouter>);
  await screen.findByText('INSERT');
  expect(screen.queryByText('IP')).toBeNull(); expect(screen.queryByText('não mostrar')).toBeNull();
  fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2026-11-02' } });
  fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2026-11-01' } });
  fireEvent.click(screen.getByRole('button', { name: 'Consultar auditoria' }));
  await screen.findByText('A data final deve ser igual ou posterior à inicial.');
  expect(getAuditLogs).toHaveBeenCalledTimes(1);
});
