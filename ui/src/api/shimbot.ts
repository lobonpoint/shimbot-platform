import { api } from "./client";

export interface PPCSummary {
  total_spend: number;
  total_sales: number;
  total_orders: number;
  acos_pct: number;
  campaigns: number;
}

export interface PPCCampaign {
  campaign_id: string;
  campaign_name: string;
  asin: string;
  spend_7d: number;
  sales_7d: number;
  orders_7d: number;
  acos_pct: number;
}

export interface ShimbotDecision {
  task_id: string;
  title: string;
  description: string;
  category: string;
  priority: number;
  status: string;
  decision: string | null;
  action_type: string | null;
  action_params: string | null;
  confidence: string | null;
  risk_level: string | null;
  created_at: string;
  decided_at: string | null;
  executed_at: string | null;
  created_by: string;
}

export interface InventoryItem {
  asin: string;
  title: string;
  status: string;
  fba_quantity: number;
  daily_velocity: number;
  days_of_stock: number | null;
  reorder_point: number | null;
  updated_at: string | null;
}

export interface Product {
  asin: string;
  title: string;
  sku: string | null;
  status: string;
  target_acos: number | null;
  category: string | null;
}

export const shimbotApi = {
  ppcSummary: (companyId: string) =>
    api.get<PPCSummary>(`/companies/${companyId}/shimbot/ppc/summary`),

  ppcCampaigns: (companyId: string) =>
    api.get<PPCCampaign[]>(`/companies/${companyId}/shimbot/ppc/campaigns`),

  decisions: (companyId: string, status = "pending") =>
    api.get<ShimbotDecision[]>(`/companies/${companyId}/shimbot/decisions?status=${status}`),

  reviewDecision: (
    companyId: string,
    taskId: string,
    decision: "approved" | "rejected" | "deferred",
  ) =>
    api.post<{ ok: boolean }>(`/companies/${companyId}/shimbot/decisions/${taskId}/review`, {
      decision,
    }),

  inventory: (companyId: string) =>
    api.get<InventoryItem[]>(`/companies/${companyId}/shimbot/inventory`),

  products: (companyId: string) =>
    api.get<Product[]>(`/companies/${companyId}/shimbot/products`),
};
