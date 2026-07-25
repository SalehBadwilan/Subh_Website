import type { ComponentType, SVGProps } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Boxes,
  Truck,
  BarChart3,
} from "lucide-react";

export type IconType = ComponentType<SVGProps<SVGSVGElement>>;

export type OperationsNavItem = {
  to: string;
  label: string;
  icon: IconType;
  exact?: boolean;
};

export const operationsNav: OperationsNavItem[] = [
  { to: "/operations", label: "لوحة العمليات", icon: LayoutDashboard, exact: true },
  { to: "/operations/orders", label: "الطلبات", icon: ClipboardList },
  { to: "/operations/inventory", label: "المخزون", icon: Boxes },
  { to: "/operations/shipments", label: "الشحنات", icon: Truck },
  { to: "/operations/reports", label: "التقارير", icon: BarChart3 },
];
