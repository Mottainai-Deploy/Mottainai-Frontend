export interface ApiEmployee {
  employeeId: number;
  userId: number | null;
  name: string;
  cpf: string;
  email: string | null;
  phone: string | null;
  role: string;
  storeId: number;
  active: boolean;
  lastLogin: string | null;
}

export interface ApiEmployeeRole {
  id: number;
  name: string;
  description: string | null;
  permissionLevel: number;
  active: boolean;
}

export interface EmployeeDraft {
  name: string;
  cpf: string;
  email: string;
  phone: string;
  roleId: string;
  storeId: string;
  hireDate: string;
  createLogin: boolean;
}

export interface CreateEmployeeInput {
  name: string;
  cpf: string;
  email: string | null;
  phone: string | null;
  roleId: number;
  storeId: number;
  hireDate: string;
  createLogin: boolean;
}

export interface UpdateEmployeeInput {
  name: string;
  email: string | null;
  phone: string | null;
  roleId: number | null;
}

export interface EmployeeEditorProps {
  employee: ApiEmployee | null;
  onClose: () => void;
  onSaved: (employee: ApiEmployee) => void;
}

export interface EmployeeMutationState {
  busy: boolean;
  error: string;
  uncertain: boolean;
  review: boolean;
  action: 'save' | 'status' | 'invite';
}
