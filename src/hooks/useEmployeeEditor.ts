import { useRef, useState } from 'react';
import type { EmployeeDraft, EmployeeEditorProps, EmployeeMutationState } from '@/types/employee-api.types';
import { changeEmployeeStatus, createEmployee, inviteEmployee, updateEmployee } from '@/services/employeeService';
import { ApiRequestError } from '@/services/apiClient';
import { employeeContactInput, employeeCreateInput } from '@/utils/employeeApiValidation';

export function useEmployeeEditor({ employee, onSaved }: EmployeeEditorProps) {
  const [draft, setDraft] = useState<EmployeeDraft>({
    name: employee?.name ?? '', cpf: employee?.cpf ?? '', email: employee?.email ?? '', phone: employee?.phone ?? '',
    roleId: '', storeId: String(employee?.storeId ?? ''), hireDate: '', createLogin: false,
  });
  const [mutation, setMutation] = useState<EmployeeMutationState>({ busy: false, error: '', uncertain: false, review: false, action: 'save' });
  const busyRef = useRef(false);
  const locked = mutation.busy || mutation.review || mutation.uncertain;
  const change = <K extends keyof EmployeeDraft>(key: K, value: EmployeeDraft[K]) => {
    if (!locked) {
      setDraft((current) => ({ ...current, [key]: value }));
      setMutation((current) => ({ ...current, error: '' }));
    }
  };
  const review = (action: EmployeeMutationState['action']) => {
    if (locked) return;
    try {
      if (action === 'save') {
        if (employee) employeeContactInput(draft, employee.userId !== null);
        else employeeCreateInput(draft);
      }
      setMutation((current) => ({ ...current, review: true, action, error: '' }));
    } catch (error) { setMutation((current) => ({ ...current, error: error instanceof Error ? error.message : 'Revise os campos.' })); }
  };
  const confirm = async () => {
    if (busyRef.current || !mutation.review || mutation.uncertain) return;
    busyRef.current = true;
    setMutation((current) => ({ ...current, busy: true, error: '' }));
    try {
      const result = employee
        ? mutation.action === 'status' ? await changeEmployeeStatus(employee.employeeId, !employee.active)
          : mutation.action === 'invite' ? await inviteEmployee(employee.employeeId)
            : await updateEmployee(employee.employeeId, employeeContactInput(draft, employee.userId !== null))
        : await createEmployee(employeeCreateInput(draft));
      onSaved(result);
    } catch (error) {
      const uncertain = !(error instanceof ApiRequestError && error.status >= 400 && error.status < 500);
      setMutation((current) => ({ ...current, review: false, uncertain,
        error: uncertain ? 'Não foi possível confirmar o resultado. Volte à lista e confira o cadastro antes de realizar outra operação; o pedido pode ter sido aplicado.'
          : error.message,
      }));
    } finally {
      busyRef.current = false;
      setMutation((current) => ({ ...current, busy: false }));
    }
  };
  return { draft, mutation, locked, change, review, confirm,
    cancelReview: () => { if (!busyRef.current) setMutation((current) => ({ ...current, review: false })); },
  };
}
