import { useState } from 'react';
import { useApiQuery } from './useApiQuery';
import { getCompanyEmployees, getStoreEmployees } from '@/services/employeeService';
import type { ApiEmployee } from '@/types/employee-api.types';

export function useEmployeeDirectory() {
  const [state, setState] = useState({ scope: 'store', search: '', role: '', reload: 0, editing: null as ApiEmployee | null, notice: '' });
  const query = useApiQuery(state.scope === 'company' ? getCompanyEmployees : getStoreEmployees, [], state.reload);
  const employees = query.data.filter((employee) =>
    employee.name.toLocaleLowerCase('pt-BR').includes(state.search.trim().toLocaleLowerCase('pt-BR')) && (!state.role || employee.role === state.role));
  const roles = [...new Set(query.data.map((employee) => employee.role))];
  return { state, setState, query, employees, roles };
}
