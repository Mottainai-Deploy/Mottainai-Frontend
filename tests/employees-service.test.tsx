import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createEmployee, getCompanyEmployees, getStoreEmployees, updateEmployee, changeEmployeeStatus, inviteEmployee } from '../src/services/employeeService';
import { getEmployeeRoles } from '../src/services/employeeRoleService';
import { getAuditLogs } from '../src/services/auditService';
import { setApiSession } from '../src/services/apiClient';
import { employeeCreateInput } from '../src/utils/employeeApiValidation';

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://api.example.invalid/api/v1');
  setApiSession({ accessToken: 'synthetic-test', refreshToken: 'synthetic-test', tokenType: 'Bearer', expiresIn: 3600, refreshExpiresIn: 86400 });
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); setApiSession(null); });
it('mapeia diretórios, cargos, cadastro, edição, status e convite para os contratos da API', async () => {
  const input = employeeCreateInput({ name: 'Pessoa', cpf: '12345678901', email: '', phone: '', roleId: '50', storeId: '10', hireDate: '2026-11-01', createLogin: false });
  await getStoreEmployees(); await getCompanyEmployees(); await getEmployeeRoles(); await createEmployee(input);
  await updateEmployee(7, { name: 'Pessoa', email: null, phone: null, roleId: null });
  await changeEmployeeStatus(7, false); await inviteEmployee(7);
  const calls = vi.mocked(fetch).mock.calls;
  expect(calls.map(([url]) => new URL(String(url)).pathname)).toEqual(['/api/v1/employees-store', '/api/v1/employees-company', '/api/v1/employee-roles', '/api/v1/employees', '/api/v1/employees/7', '/api/v1/employees/7/status', '/api/v1/employees/7/invite']);
  expect(calls[3][1]?.method).toBe('POST'); expect(JSON.parse(String(calls[3][1]?.body))).toEqual(input);
  expect(calls[4][1]?.method).toBe('PUT'); expect(JSON.parse(String(calls[4][1]?.body))).toEqual({ name: 'Pessoa', email: null, phone: null, roleId: null });
  expect(JSON.parse(String(calls[5][1]?.body))).toEqual({ active: false }); expect(calls[6][1]?.method).toBe('POST');
});
it('auditoria envia o dia completo e bloqueia períodos inválidos antes da chamada', async () => {
  await getAuditLogs({ from: '2026-11-01', to: '2026-11-02' });
  const url = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
  expect(url.pathname).toBe('/api/v1/audit-logs'); expect(url.searchParams.get('from')).toBe('2026-11-01T00:00:00'); expect(url.searchParams.get('to')).toBe('2026-11-02T23:59:59.999');
  await expect(getAuditLogs({ from: '2026-01-01', to: '2026-11-02' })).rejects.toThrow(/seis meses/);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('valida admissão e e-mail obrigatório ao criar acesso', () => {
  const draft = { name: 'Pessoa', cpf: '12345678901', email: '', phone: '', roleId: '50', storeId: '10', hireDate: '2026-02-30', createLogin: false };
  expect(() => employeeCreateInput(draft)).toThrow(/admissão/);
  expect(() => employeeCreateInput({ ...draft, hireDate: '2026-11-01', createLogin: true })).toThrow(/e-mail/);
});

