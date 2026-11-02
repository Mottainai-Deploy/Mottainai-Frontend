import type { FolderNavigationItem } from "@/types/folder-navigation.types";

export const FOLDER_NAVIGATION_ITEMS = [
    { label: 'Visão Geral', to: '/overview' },
    { label: 'Alertas de Vencimento', to: '/expiringProducts' },
] as const satisfies readonly FolderNavigationItem[];

export const STOCK_FOLDER_NAVIGATION_ITEMS = [
    { label: 'Inventário/contagem', to: '/stock', end: true },
    { label: 'Avarias e consumo interno', to: '/stock/damages' },
    { label: 'Transferência de lojas', to: '/stock/transfers', end: false },
    { label: 'Fornecedores', to: '/stock/suppliers', end: false },
] as const satisfies readonly FolderNavigationItem[];

export const USERS_FOLDER_NAVIGATION_ITEMS = [
    { label: 'Funcionários', to: '/users', end: true, activePaths: ['/users/new'] },
    { label: 'Log de auditoria', to: '/users/audit', end: true },
] as const satisfies readonly FolderNavigationItem[];

export const FOLDER_NAVIGATION_PATHS: string[] = FOLDER_NAVIGATION_ITEMS.map((item) => item.to);
