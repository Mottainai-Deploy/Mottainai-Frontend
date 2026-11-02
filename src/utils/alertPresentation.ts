import type { AlertPriority, AlertStatus, AlertType, SuggestedActionDecision, SuggestedActionStatus, SuggestedActionType } from '@/types/alert-api.types';

export const alertStatusLabels: Record<AlertStatus, string> = { ACTIVE: 'Ativo', ANALYZING: 'Em análise', RESOLVED: 'Resolvido', IGNORED: 'Ignorado' };
export const alertPriorityLabels: Record<AlertPriority, string> = { LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', CRITICAL: 'Crítica' };
export const alertTypeLabels: Record<AlertType, string> = { EXPIRATION: 'Vencimento', CRITICAL_STOCK: 'Estoque crítico', RUPTURE: 'Ruptura', SLOW_MOVING: 'Baixa saída', OVERSTOCK: 'Excesso de estoque' };
export const actionStatusLabels: Record<SuggestedActionStatus, string> = { PENDING: 'Pendente', APPROVED: 'Aprovada', REJECTED: 'Rejeitada', EXECUTED: 'Executada' };
export const actionTypeLabels: Record<SuggestedActionType, string> = { CREATE_PURCHASE_ORDER: 'Pedido de compra', CREATE_PROMOTION: 'Promoção', CREATE_TRANSFER: 'Transferência', CREATE_DONATION: 'Doação', CREATE_DISPOSAL: 'Descarte', CREATE_REPLENISHMENT: 'Reposição' };

export function validateAlertStatus(status: string): asserts status is AlertStatus {
  if (!Object.prototype.hasOwnProperty.call(alertStatusLabels, status)) throw new Error('Selecione um status de alerta válido.');
}

export function validateSuggestedDecision(decision: string): asserts decision is SuggestedActionDecision {
  if (decision !== 'APPROVED' && decision !== 'REJECTED') throw new Error('Selecione aprovar ou rejeitar.');
}
