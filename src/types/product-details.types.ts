import type { HistoricalMetric } from "@/types/historical-metric.types";
import type { Product } from "@/types/product.types";

export interface ProductActionHistory {
  id: string;
  date: string;
  tactic: string;
  decision: string;
  efficacy: string;
  efficacyTone: "success" | "warning" | "danger";
}

export interface ProductDetail extends Product {
  sku: string;
  averageCostInCents: number;
  marginPercent: number;
  salesVelocityPerDay: number;
  effectiveShelfLifeDays: number;
  nextExpirationLot: string;
  nextExpirationDays: number;
  monthlySavedProfit: HistoricalMetric[];
  actionHistory: ProductActionHistory[];
}

export interface ProductSummaryRow {
  id: string;
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
  highlightRightValue?: boolean;
}

export interface ProductDetailsState {
  status: "loading" | "success" | "error";
  requestedProductId: string | null;
  data: ProductDetail | null;
  message: string;
}
