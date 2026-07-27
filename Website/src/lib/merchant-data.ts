import type { ComponentType, SVGProps } from "react";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ClipboardList,
  TrendingUp,
  Wallet,
  BadgeCheck,
  Users,
  UserCircle,
} from "lucide-react";

export type IconType = ComponentType<SVGProps<SVGSVGElement>>;

export type MerchantNavItem = {
  to: string;
  label: string;
  icon: IconType;
  exact?: boolean;
};

export const merchantNav: MerchantNavItem[] = [
  { to: "/merchant", label: "لوحة التحكم", icon: LayoutDashboard, exact: true },
  { to: "/merchant/products", label: "المنتجات", icon: Package },
  { to: "/merchant/inventory", label: "المخزون", icon: Warehouse },
  { to: "/merchant/orders", label: "الطلبات", icon: ClipboardList },
  { to: "/merchant/sales", label: "المبيعات والتقارير", icon: TrendingUp },
  { to: "/merchant/settlements", label: "التسويات المالية", icon: Wallet },
  { to: "/merchant/subscription", label: "باقة الاشتراك", icon: BadgeCheck },
  { to: "/merchant/employees", label: "الموظفون", icon: Users },
  { to: "/merchant/profile", label: "الملف التجاري", icon: UserCircle },
];

export type SubscriptionPackage = {
  id: string;
  name: string;
  price: number;
  tagline: string;
  features: string[];
  featured?: boolean;
};

export const packages: SubscriptionPackage[] = [
  {
    id: "starter",
    name: "الباقة الأساسية",
    price: 199,
    tagline: "مناسبة للتجّار الجدد",
    features: [
      "حتى ٥٠ منتجًا مُعيّنًا من صبح",
      "لوحة تحكم كاملة",
      "تسويات شهرية",
      "دعم فني في أوقات العمل",
    ],
  },
  {
    id: "growth",
    name: "باقة النمو",
    price: 499,
    tagline: "الأكثر اختيارًا",
    features: [
      "حتى ٢٠٠ منتج مُعيّن من صبح",
      "تقارير مبيعات متقدمة",
      "تسويات أسبوعية",
      "حتى ٥ موظفين",
      "دعم فني مميّز",
    ],
    featured: true,
  },
  {
    id: "pro",
    name: "الباقة الاحترافية",
    price: 999,
    tagline: "للتجّار الكبار",
    features: [
      "منتجات غير محدودة",
      "تقارير وتحليلات متقدمة",
      "تسويات يومية",
      "موظفون غير محدودون",
      "مدير حساب مخصّص",
    ],
  },
];

export type MerchantProduct = {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  sold30d: number;
};

export const merchantProducts: MerchantProduct[] = [
  {
    id: "mp1",
    name: "سمّاعات لاسلكية بخاصية عزل الضوضاء",
    sku: "SUBH-EL-1001",
    category: "إلكترونيات",
    price: 349,
    stock: 42,
    lowStockThreshold: 10,
    sold30d: 128,
  },
  {
    id: "mp2",
    name: "ساعة ذكية للياقة البدنية",
    sku: "SUBH-EL-1002",
    category: "إلكترونيات",
    price: 599,
    stock: 8,
    lowStockThreshold: 10,
    sold30d: 96,
  },
  {
    id: "mp3",
    name: "قهوة عربية مختصة ٢٥٠ج",
    sku: "SUBH-GR-2001",
    category: "بقالة",
    price: 65,
    stock: 210,
    lowStockThreshold: 30,
    sold30d: 512,
  },
  {
    id: "mp4",
    name: "مبخرة كهربائية فاخرة",
    sku: "SUBH-HM-3001",
    category: "منزل",
    price: 220,
    stock: 0,
    lowStockThreshold: 5,
    sold30d: 45,
  },
  {
    id: "mp5",
    name: "طقم كاسات شاي زجاجي",
    sku: "SUBH-HM-3002",
    category: "منزل",
    price: 95,
    stock: 63,
    lowStockThreshold: 15,
    sold30d: 189,
  },
  {
    id: "mp6",
    name: "خلاط كهربائي متعدد الاستخدامات",
    sku: "SUBH-HM-3003",
    category: "منزل",
    price: 199,
    stock: 4,
    lowStockThreshold: 8,
    sold30d: 71,
  },
  {
    id: "mp7",
    name: "شمعة معطّرة برائحة العود",
    sku: "SUBH-HM-3004",
    category: "منزل",
    price: 75,
    stock: 88,
    lowStockThreshold: 20,
    sold30d: 34,
  },
  {
    id: "mp8",
    name: "زجاجة ماء حرارية",
    sku: "SUBH-SP-4001",
    category: "رياضة",
    price: 89,
    stock: 0,
    lowStockThreshold: 10,
    sold30d: 22,
  },
];

export type MerchantOrderStatus = "new" | "accepted" | "preparing" | "ready" | "completed";

export const merchantOrderStatusLabels: Record<MerchantOrderStatus, string> = {
  new: "جديد",
  accepted: "مقبول",
  preparing: "قيد التجهيز",
  ready: "جاهز للاستلام",
  completed: "مكتمل",
};

export const merchantOrderStatusTone: Record<MerchantOrderStatus, string> = {
  new: "bg-sky-50 text-sky-700 border-sky-200",
  accepted: "bg-amber-50 text-amber-700 border-amber-200",
  preparing: "bg-violet-50 text-violet-700 border-violet-200",
  ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-muted text-foreground border-border",
};

export type MerchantOrder = {
  id: string;
  customer: string;
  city: string;
  date: string;
  status: MerchantOrderStatus;
  total: number;
  itemCount: number;
  items: { name: string; qty: number; price: number }[];
};

export const merchantOrders: MerchantOrder[] = [
  {
    id: "SUBH-20114",
    customer: "محمد العتيبي",
    city: "الرياض",
    date: "اليوم • ١٠:٢٤ ص",
    status: "new",
    total: 758,
    itemCount: 3,
    items: [
      { name: "سمّاعات لاسلكية", qty: 1, price: 349 },
      { name: "قهوة عربية مختصة", qty: 2, price: 65 },
      { name: "طقم كاسات شاي", qty: 1, price: 95 },
    ],
  },
  {
    id: "SUBH-20113",
    customer: "نورة الحربي",
    city: "جدة",
    date: "اليوم • ٠٩:٠٢ ص",
    status: "accepted",
    total: 499,
    itemCount: 2,
    items: [{ name: "ساعة ذكية", qty: 1, price: 599 }],
  },
  {
    id: "SUBH-20112",
    customer: "خالد الشمري",
    city: "الدمام",
    date: "أمس • ٠٥:٤٥ م",
    status: "preparing",
    total: 219,
    itemCount: 4,
    items: [
      { name: "قهوة عربية مختصة", qty: 3, price: 65 },
      { name: "شمعة معطّرة", qty: 1, price: 75 },
    ],
  },
  {
    id: "SUBH-20111",
    customer: "سارة القحطاني",
    city: "الرياض",
    date: "أمس • ١١:١٢ ص",
    status: "ready",
    total: 315,
    itemCount: 2,
    items: [
      { name: "مبخرة كهربائية", qty: 1, price: 220 },
      { name: "شمعة معطّرة", qty: 1, price: 75 },
    ],
  },
  {
    id: "SUBH-20110",
    customer: "عبدالله الغامدي",
    city: "مكة",
    date: "قبل يومين",
    status: "completed",
    total: 130,
    itemCount: 2,
    items: [{ name: "قهوة عربية مختصة", qty: 2, price: 65 }],
  },
  {
    id: "SUBH-20109",
    customer: "منى الزهراني",
    city: "الرياض",
    date: "قبل ٣ أيام",
    status: "completed",
    total: 890,
    itemCount: 3,
    items: [
      { name: "ساعة ذكية", qty: 1, price: 599 },
      { name: "سمّاعات لاسلكية", qty: 1, price: 349 },
    ],
  },
];

export type Settlement = {
  id: string;
  date: string;
  amount: number;
  method: string;
  status: "paid" | "pending";
  reference: string;
};

export const settlements: Settlement[] = [
  {
    id: "s1",
    date: "١٠ يوليو ٢٠٢٦",
    amount: 12480,
    method: "تحويل بنكي",
    status: "paid",
    reference: "SETL-9821",
  },
  {
    id: "s2",
    date: "٣ يوليو ٢٠٢٦",
    amount: 9640,
    method: "تحويل بنكي",
    status: "paid",
    reference: "SETL-9744",
  },
  {
    id: "s3",
    date: "٢٦ يونيو ٢٠٢٦",
    amount: 15220,
    method: "تحويل بنكي",
    status: "paid",
    reference: "SETL-9663",
  },
  {
    id: "s4",
    date: "١٩ يونيو ٢٠٢٦",
    amount: 7890,
    method: "تحويل بنكي",
    status: "paid",
    reference: "SETL-9581",
  },
];

export type Employee = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  active: boolean;
};

export const employees: Employee[] = [
  {
    id: "e1",
    name: "ياسر الدوسري",
    role: "مدير الفرع",
    email: "yasser@subh.sa",
    phone: "+966501112233",
    active: true,
  },
  {
    id: "e2",
    name: "هند العمري",
    role: "مسؤولة الطلبات",
    email: "hind@subh.sa",
    phone: "+966502223344",
    active: true,
  },
  {
    id: "e3",
    name: "فهد الرشيد",
    role: "مسؤول المخزون",
    email: "fahad@subh.sa",
    phone: "+966503334455",
    active: true,
  },
  {
    id: "e4",
    name: "ريم السالم",
    role: "خدمة العملاء",
    email: "reem@subh.sa",
    phone: "+966504445566",
    active: false,
  },
];

export type DailySale = { day: string; sales: number };

export const weeklySales: DailySale[] = [
  { day: "السبت", sales: 3200 },
  { day: "الأحد", sales: 4100 },
  { day: "الاثنين", sales: 3850 },
  { day: "الثلاثاء", sales: 5200 },
  { day: "الأربعاء", sales: 4620 },
  { day: "الخميس", sales: 6100 },
  { day: "الجمعة", sales: 7250 },
];

export const monthlySeries: { month: string; sales: number }[] = [
  { month: "يناير", sales: 82000 },
  { month: "فبراير", sales: 94000 },
  { month: "مارس", sales: 110000 },
  { month: "أبريل", sales: 98000 },
  { month: "مايو", sales: 128000 },
  { month: "يونيو", sales: 142000 },
  { month: "يوليو", sales: 156000 },
];

export const merchantProfile = {
  businessName: "متجر النخبة",
  crNumber: "1010234567",
  taxNumber: "300123456700003",
  ownerName: "عبدالرحمن الفهد",
  phone: "+966501234567",
  email: "elite@subh.sa",
  city: "الرياض",
  address: "حي العليا، برج المملكة، الطابق ١٥",
  joinedAt: "١٥ مارس ٢٠٢٥",
  package: "growth",
  packageExpiry: "١٥ مارس ٢٠٢٧",
};

export const saudiCities = [
  "الرياض",
  "جدة",
  "مكة المكرمة",
  "المدينة المنورة",
  "الدمام",
  "الخبر",
  "الطائف",
  "بريدة",
  "تبوك",
  "أبها",
  "حائل",
  "نجران",
  "جازان",
  "الأحساء",
  "ينبع",
];

export function formatSAR(n: number): string {
  return `${n.toLocaleString("ar-SA")} ر.س`;
}
