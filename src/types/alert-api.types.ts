export type AlertStatus = 'ACTIVE' | 'ANALYZING' | 'RESOLVED' | 'IGNORED';
export type AlertPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertType = 'EXPIRATION' | 'CRITICAL_STOCK' | 'RUPTURE' | 'SLOW_MOVING' | 'OVERSTOCK';
export type SuggestedActionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
export type SuggestedActionDecision = 'APPROVED' | 'REJECTED';
export type SuggestedActionType = 'CREATE_PURCHASE_ORDER' | 'CREATE_PROMOTION' | 'CREATE_TRANSFER' | 'CREATE_DONATION' | 'CREATE_DISPOSAL' | 'CREATE_REPLENISHMENT';

export interface ApiAlert {
  id: number;
  storeId: number;
  title: string;
  description: string | null;
  alertType: AlertType;
  priority: AlertPriority;
  status: AlertStatus;
  generatedAt: string;
  resolvedAt: string | null;
  createdAt: string;
}

export interface ApiSuggestedAction {
  id: number;
  alertId: number;
  actionType: SuggestedActionType;
  description: string | null;
  priority: AlertPriority;
  status: SuggestedActionStatus;
  sourceRecommendationUuid: string | null;
  generatedAt: string;
  createdAt: string;
}

export interface AlertDetailsProps {
  id: string;
  onChanged: () => void;
}

export interface AlertDetailsData {
  alert: ApiAlert;
  actions: ApiSuggestedAction[];
}

export type AlertReview = { kind: 'status'; status: AlertStatus } | { kind: 'decision'; id: number; decision: SuggestedActionDecision };

export interface AlertEditorState {
  reload: number;
  data: AlertDetailsData | null;
  busy: boolean;
  loading: boolean;
  uncertain: boolean;
  error: string;
  notice: string;
  review: AlertReview | null;
}
