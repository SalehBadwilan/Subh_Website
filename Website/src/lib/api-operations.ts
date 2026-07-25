import { apiFetch } from "@/lib/api";

export interface ApiOperationsInventory {
  id: string;
  sellable_type: "product" | "package";
  sellable_id: string;
  sku: string;

  on_hand: number;
  reserved: number;
  available: number;
  reorder_threshold: number;

  catalog?: {
  id: string;
  name_ar: string;
  sku: string;
  status: string;
  price_sar: number;
} | null;

}

export interface ApiStockMovement {
  id: string;
  inventory_id: string;
  type: string;
  delta: number;
  reason: string;
  actor_id?: string;
  created_at: string;
}

export function getOperationsInventory() {
  return apiFetch<ApiOperationsInventory[]>(
    "/operations/inventory?limit=100"
  ).then((r) => r.data);
}

export function getInventoryMovements() {
  return apiFetch<ApiStockMovement[]>(
    "/operations/inventory/movements?limit=100"
  ).then((r) => r.data);
}

export function adjustInventory(
  inventoryId: string,
  delta: number,
  reason: string
) {
  return apiFetch(`/operations/inventory/${inventoryId}/adjust`, {
    method: "POST",
    body: {
      delta,
      reason,
    },
  }).then((r) => r.data);
}
export interface ApiOperationsDashboard {
  orders: {
    total: number;
    actionable: number;
    by_status: Record<string, number>;
  };

  shipments: {
    in_flight: number;
    delivered: number;
    failed: number;
  };

  inventory: {
    total_skus: number;
    low_stock_skus: number;
    out_of_stock_skus: number;
  };

  recent_movements: {
    id: string;
    inventory_id: string;
    type: string;
    delta: number;
    reason: string;
    actor_id: string | null;
    created_at: string;
  }[];
}

export interface ApiOperationsReports {
  fulfilment: {
    orders_by_status: Record<string, number>;
    shipped: number;
    delivered: number;
    cancelled: number;
    returned: number;
  };

  shipments: {
    total: number;
    delivered: number;
    failed: number;
    delivery_success_rate_pct: number | null;
    by_status: Record<string, number>;
  };

  inventory: {
    total_skus: number;
    total_units_on_hand: number;
    low_stock_skus: number;
    out_of_stock_skus: number;
  };

  top_adjusted_skus: {
    inventory_id: string;
    sku: string;
    name_ar: string;
    movements: number;
    net_delta: number;
    current_on_hand: number;
  }[];

  adjustments: {
    count: number;
    net_delta: number;
  };
}

export function getOperationsDashboard() {
  return apiFetch<ApiOperationsDashboard>(
    "/operations/dashboard"
  ).then((r) => r.data);
}

export function getOperationsReports() {
  return apiFetch<ApiOperationsReports>(
    "/operations/reports"
  ).then((r) => r.data);
}