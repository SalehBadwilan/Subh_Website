import type { ComponentType, SVGProps } from "react";
import {
  LayoutDashboard,
  ClipboardCheck,
  Store,
  BadgeCheck,
  Package,
  Layers,
  Users,
  BarChart3,
  Settings,
} from "lucide-react";

export type IconType = ComponentType<SVGProps<SVGSVGElement>>;

export type AdminNavItem = {
  to: string;
  label: string;
  icon: IconType;
  exact?: boolean;
};

export const adminNav: AdminNavItem[] = [
  { to: "/admin", label: "لوحة التحكم", icon: LayoutDashboard, exact: true },
  { to: "/admin/applications", label: "طلبات التجّار", icon: ClipboardCheck },
  { to: "/admin/merchants", label: "التجّار", icon: Store },
  { to: "/admin/packages", label: "الباقات", icon: BadgeCheck },
  { to: "/admin/products", label: "المنتجات", icon: Package },
  { to: "/admin/categories", label: "الفئات", icon: Layers },
  { to: "/admin/users", label: "المستخدمون", icon: Users },
  { to: "/admin/reports", label: "التقارير", icon: BarChart3 },
  { to: "/admin/settings", label: "الإعدادات", icon: Settings },
];

export type CatalogProduct = {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  price: number;
  sku: string;
  stock: number;
  assignedMerchantIds: string[];
  active: boolean;
};

export const seedCatalog: CatalogProduct[] = [
  { id: "cp-1", name: "سمّاعات لاسلكية بخاصية عزل الضوضاء", description: "سمّاعات بلوتوث بخاصية عزل الضوضاء النشط وبطارية تدوم ٣٠ ساعة.", categoryId: "electronics", price: 349, sku: "SUBH-EL-1001", stock: 120, assignedMerchantIds: [], active: true },
  { id: "cp-2", name: "ساعة ذكية للياقة البدنية", description: "ساعة ذكية لتتبع النشاط ومعدل النبض والنوم.", categoryId: "electronics", price: 599, sku: "SUBH-EL-1002", stock: 85, assignedMerchantIds: [], active: true },
  { id: "cp-3", name: "قهوة عربية مختصة ٢٥٠ج", description: "قهوة عربية محمّصة حديثًا بنكهة الهيل.", categoryId: "grocery", price: 65, sku: "SUBH-GR-2001", stock: 300, assignedMerchantIds: [], active: true },
  { id: "cp-4", name: "مبخرة كهربائية فاخرة", description: "مبخرة كهربائية بتصميم فاخر وتحكم بالحرارة.", categoryId: "home", price: 220, sku: "SUBH-HM-3001", stock: 60, assignedMerchantIds: [], active: true },
  { id: "cp-5", name: "طقم كاسات شاي زجاجي", description: "طقم من ٦ كاسات شاي زجاجية بتصميم أنيق.", categoryId: "home", price: 95, sku: "SUBH-HM-3002", stock: 150, assignedMerchantIds: [], active: true },
  { id: "cp-6", name: "خلاط كهربائي متعدد الاستخدامات", description: "خلاط بقوة ٨٠٠ واط لعصائر وسموذي.", categoryId: "home", price: 199, sku: "SUBH-HM-3003", stock: 45, assignedMerchantIds: [], active: true },
  { id: "cp-7", name: "شمعة معطّرة برائحة العود", description: "شمعة برائحة العود الفاخرة تدوم حتى ٤٠ ساعة.", categoryId: "home", price: 75, sku: "SUBH-HM-3004", stock: 200, assignedMerchantIds: [], active: true },
  { id: "cp-8", name: "زجاجة ماء حرارية", description: "زجاجة تحافظ على الحرارة حتى ١٢ ساعة.", categoryId: "sports", price: 89, sku: "SUBH-SP-4001", stock: 180, assignedMerchantIds: [], active: true },
  { id: "cp-9", name: "عباءة سوداء بتطريز فاخر", description: "عباءة سوداء بتطريز يدوي.", categoryId: "fashion", price: 289, sku: "SUBH-FS-5001", stock: 40, assignedMerchantIds: [], active: true },
  { id: "cp-10", name: "حقيبة ظهر جلدية", description: "حقيبة ظهر جلدية بجودة عالية للعمل والسفر.", categoryId: "fashion", price: 179, sku: "SUBH-FS-5002", stock: 70, assignedMerchantIds: [], active: true },
];

export type StockMovement = {
  id: string;
  productId: string;
  productName: string;
  delta: number;
  reason: string;
  at: string;
};

export type AdminCategory = {
  id: string;
  name: string;
  description?: string;
  active: boolean;
};

export const seedCategories: AdminCategory[] = [
  { id: "fashion", name: "أزياء", description: "ملابس رجالية ونسائية وأطفال", active: true },
  { id: "electronics", name: "إلكترونيات", description: "هواتف، حواسيب، وإكسسوارات", active: true },
  { id: "home", name: "منزل وأثاث", description: "أثاث وديكور وأدوات منزلية", active: true },
  { id: "beauty", name: "جمال وعناية", description: "عطور، مكياج، والعناية الشخصية", active: true },
  { id: "grocery", name: "بقالة", description: "أطعمة ومشروبات ومنتجات يومية", active: true },
  { id: "kids", name: "أطفال", description: "ألعاب ومستلزمات الأطفال", active: true },
  { id: "sports", name: "رياضة", description: "معدات ولياقة ورياضات مختلفة", active: true },
  { id: "books", name: "كتب", description: "كتب أدبية وعلمية ودينية", active: true },
];

export type AdminPackage = {
  id: string;
  name: string;
  price: number;
  tagline: string;
  features: string[];
  active: boolean;
  featured?: boolean;
};

export const seedPackages: AdminPackage[] = [
  {
    id: "starter",
    name: "الباقة الأساسية",
    price: 199,
    tagline: "مناسبة للتجّار الجدد",
    features: ["حتى ٥٠ منتجًا", "لوحة تحكم كاملة", "تسويات شهرية", "دعم فني"],
    active: true,
  },
  {
    id: "growth",
    name: "باقة النمو",
    price: 499,
    tagline: "الأكثر اختيارًا",
    features: [
      "حتى ٢٠٠ منتج",
      "تقارير مبيعات متقدمة",
      "تسويات أسبوعية",
      "حتى ٥ موظفين",
    ],
    active: true,
    featured: true,
  },
  {
    id: "pro",
    name: "الباقة الاحترافية",
    price: 999,
    tagline: "للتجّار الكبار",
    features: [
      "منتجات غير محدودة",
      "تسويات يومية",
      "موظفون غير محدودون",
      "مدير حساب مخصّص",
    ],
    active: true,
  },
];

export type AdminUserRole = "customer" | "merchant" | "admin";

export type AdminUser = {
  id: string;
  name: string;
  role: AdminUserRole;
  email: string;
  phone: string;
  city?: string;
  active: boolean;
  joinedAt: string;
};

// Fresh system: no preloaded customers or admins. Only actually registered
// users should appear. Populate via the shared frontend store as needed.
export const seedUsers: AdminUser[] = [];

export type AdminRole = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
};

export const seedRoles: AdminRole[] = [
  {
    id: "super-admin",
    name: "مدير النظام",
    description: "صلاحيات كاملة على المنصة.",
    permissions: [
      "إدارة الطلبات",
      "إدارة التجّار",
      "إدارة المنتجات",
      "إدارة الفئات",
      "إدارة الباقات",
      "إدارة المستخدمين",
      "إعدادات المنصة",
    ],
  },
  {
    id: "operations",
    name: "مسؤول العمليات",
    description: "اعتماد التجّار وإدارة الطلبات والمنتجات.",
    permissions: [
      "إدارة الطلبات",
      "إدارة التجّار",
      "إدارة المنتجات",
      "إدارة الفئات",
    ],
  },
  {
    id: "support",
    name: "خدمة العملاء",
    description: "عرض المستخدمين والتجّار والرد على الاستفسارات.",
    permissions: ["عرض المستخدمين", "عرض التجّار", "عرض الطلبات"],
  },
];

export type PlatformSettings = {
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  commissionRate: number;
  settlementDays: number;
  currency: string;
};

export const seedSettings: PlatformSettings = {
  platformName: "منصة صبح",
  supportEmail: "support@subh.sa",
  supportPhone: "+966920000000",
  commissionRate: 8,
  settlementDays: 7,
  currency: "ر.س",
};

export function formatSAR(n: number): string {
  return `${n.toLocaleString("ar-SA")} ر.س`;
}
