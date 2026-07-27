import type { ComponentType, SVGProps } from "react";
import {
  Shirt,
  Smartphone,
  Sofa,
  Sparkles,
  Utensils,
  Baby,
  Dumbbell,
  BookOpen,
} from "lucide-react";

/**
 * Centralized placeholder data for the customer prototype.
 * On Subh, Subh owns products, prices, categories, orders, and packages.
 * Merchant info is only ever secondary.
 */

export type IconType = ComponentType<SVGProps<SVGSVGElement>>;

export type Category = {
  id: string;
  name: string;
  icon: IconType;
  tone: string;
  description?: string;
};

export const categories: Category[] = [
  {
    id: "fashion",
    name: "أزياء",
    icon: Shirt,
    tone: "bg-rose-50 text-rose-600",
    description: "ملابس رجالية ونسائية وأطفال",
  },
  {
    id: "electronics",
    name: "إلكترونيات",
    icon: Smartphone,
    tone: "bg-sky-50 text-sky-600",
    description: "هواتف، حواسيب، وإكسسوارات",
  },
  {
    id: "home",
    name: "منزل وأثاث",
    icon: Sofa,
    tone: "bg-amber-50 text-amber-600",
    description: "أثاث وديكور وأدوات منزلية",
  },
  {
    id: "beauty",
    name: "جمال وعناية",
    icon: Sparkles,
    tone: "bg-fuchsia-50 text-fuchsia-600",
    description: "عطور، مكياج، والعناية الشخصية",
  },
  {
    id: "grocery",
    name: "بقالة",
    icon: Utensils,
    tone: "bg-emerald-50 text-emerald-600",
    description: "أطعمة ومشروبات ومنتجات يومية",
  },
  {
    id: "kids",
    name: "أطفال",
    icon: Baby,
    tone: "bg-orange-50 text-orange-600",
    description: "ألعاب ومستلزمات الأطفال",
  },
  {
    id: "sports",
    name: "رياضة",
    icon: Dumbbell,
    tone: "bg-lime-50 text-lime-700",
    description: "معدات ولياقة ورياضات مختلفة",
  },
  {
    id: "books",
    name: "كتب",
    icon: BookOpen,
    tone: "bg-indigo-50 text-indigo-600",
    description: "كتب أدبية وعلمية ودينية",
  },
];

export function getCategory(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}

export type Product = {
  id: string;
  name: string;

  merchantId?: string;

  merchant: string;
  categoryId: string;
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  badge?: string;
  hue: number;
  description?: string;

  image?: string; // ✅ أضف هذا السطر
};

export const featured: Product[] = [
  {
    id: "p1",
    name: "سمّاعات لاسلكية بخاصية عزل الضوضاء",
    merchant: "متجر النخبة",
    categoryId: "electronics",
    price: 349,
    oldPrice: 499,
    rating: 4.7,
    reviews: 128,
    badge: "الأكثر مبيعًا",
    hue: 190,
  },
  {
    id: "p2",
    name: "عباءة سوداء بتطريز فاخر",
    merchant: "أناقة الرياض",
    categoryId: "fashion",
    price: 289,
    rating: 4.9,
    reviews: 86,
    hue: 260,
  },
  {
    id: "p3",
    name: "ساعة ذكية للياقة البدنية",
    merchant: "تِك ستور",
    categoryId: "electronics",
    price: 599,
    oldPrice: 749,
    rating: 4.6,
    reviews: 240,
    badge: "خصم ٢٠٪",
    hue: 20,
  },
  {
    id: "p4",
    name: "حقيبة ظهر جلدية",
    merchant: "بيت الجلود",
    categoryId: "fashion",
    price: 179,
    rating: 4.5,
    reviews: 54,
    hue: 30,
  },
];

export const bestSellers: Product[] = [
  {
    id: "b1",
    name: "قهوة عربية مختصة ٢٥٠ج",
    merchant: "محامص الجزيرة",
    categoryId: "grocery",
    price: 65,
    rating: 4.9,
    reviews: 512,
    badge: "الأعلى تقييمًا",
    hue: 35,
  },
  {
    id: "b2",
    name: "مبخرة كهربائية فاخرة",
    merchant: "دار العود",
    categoryId: "home",
    price: 220,
    rating: 4.8,
    reviews: 301,
    hue: 320,
  },
  {
    id: "b3",
    name: "طقم كاسات شاي زجاجي",
    merchant: "بيت البلور",
    categoryId: "home",
    price: 95,
    rating: 4.7,
    reviews: 189,
    hue: 210,
  },
  {
    id: "b4",
    name: "سجادة صلاة مطرّزة",
    merchant: "متجر الأصيل",
    categoryId: "home",
    price: 140,
    rating: 4.9,
    reviews: 402,
    hue: 155,
  },
];

export const newArrivals: Product[] = [
  {
    id: "n1",
    name: "قميص قطن كلاسيكي",
    merchant: "أزياء الوطن",
    categoryId: "fashion",
    price: 129,
    rating: 4.4,
    reviews: 12,
    badge: "جديد",
    hue: 220,
  },
  {
    id: "n2",
    name: "منظّم مكتب خشبي",
    merchant: "خشب وصنعة",
    categoryId: "home",
    price: 175,
    rating: 4.6,
    reviews: 8,
    badge: "جديد",
    hue: 40,
  },
  {
    id: "n3",
    name: "زجاجة ماء حرارية",
    merchant: "متجر الرحلة",
    categoryId: "sports",
    price: 89,
    rating: 4.5,
    reviews: 24,
    badge: "جديد",
    hue: 180,
  },
  {
    id: "n4",
    name: "شمعة معطّرة برائحة العود",
    merchant: "لمسة",
    categoryId: "home",
    price: 75,
    rating: 4.8,
    reviews: 17,
    badge: "جديد",
    hue: 350,
  },
];

export const offers: Product[] = [
  {
    id: "o1",
    name: "خلاط كهربائي متعدد الاستخدامات",
    merchant: "بيت المطبخ",
    categoryId: "home",
    price: 199,
    oldPrice: 349,
    rating: 4.5,
    reviews: 96,
    badge: "‎-٤٣٪",
    hue: 10,
  },
  {
    id: "o2",
    name: "طقم مناشف قطن مصري",
    merchant: "نسيج",
    categoryId: "home",
    price: 149,
    oldPrice: 229,
    rating: 4.6,
    reviews: 71,
    badge: "‎-٣٥٪",
    hue: 200,
  },
  {
    id: "o3",
    name: "لعبة تركيب للأطفال",
    merchant: "عالم الصغار",
    categoryId: "kids",
    price: 79,
    oldPrice: 129,
    rating: 4.7,
    reviews: 143,
    badge: "‎-٣٩٪",
    hue: 100,
  },
  {
    id: "o4",
    name: "مصباح مكتبي LED",
    merchant: "إنارة بلس",
    categoryId: "home",
    price: 119,
    oldPrice: 189,
    rating: 4.4,
    reviews: 58,
    badge: "‎-٣٧٪",
    hue: 50,
  },
];

export const allProducts: Product[] = [...featured, ...bestSellers, ...newArrivals, ...offers];

export function getProduct(id: string): Product | undefined {
  return allProducts.find((p) => p.id === id);
}

export function getProductsByCategory(categoryId: string): Product[] {
  return allProducts.filter((p) => p.categoryId === categoryId);
}

export type CartLine = {
  product: Product;
  qty: number;
};

export const cartLines: CartLine[] = [
  { product: featured[0], qty: 1 },
  { product: bestSellers[0], qty: 2 },
  { product: offers[1], qty: 1 },
];

export type PaymentMethodKey = "card" | "apple" | "stc";

export const paymentMethodLabels: Record<PaymentMethodKey, string> = {
  card: "بطاقة ائتمانية",
  apple: "Apple Pay",
  stc: "STC Pay",
};

export type OpsOrderStatus =
  "new" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "cancelled";

export type Order = {
  id: string;
  date: string;
  status: "processing" | "shipped" | "delivered" | "cancelled";
  opsStatus?: OpsOrderStatus;
  total: number;
  itemCount: number;
  items: { product: Product; qty: number }[];
  delivery?: Address;
  payment?: PaymentMethodKey;
};

/**
 * Sample orders kept for reference/typing only. The live app store starts
 * empty — a newly registered customer has no order history until they place
 * an order during the current session.
 */
export const orders: Order[] = [];

export function getOrder(id: string): Order | undefined {
  return orders.find((o) => o.id === id);
}

export const orderStatusLabels: Record<Order["status"], string> = {
  processing: "قيد التجهيز",
  shipped: "في الطريق",
  delivered: "تم التوصيل",
  cancelled: "ملغى",
};

export const opsOrderStatusLabels: Record<OpsOrderStatus, string> = {
  new: "جديد",
  preparing: "قيد التجهيز",
  ready: "جاهز للشحن",
  out_for_delivery: "خرج للتوصيل",
  delivered: "تم التوصيل",
  cancelled: "ملغى",
};

/** Map operational status to the customer-facing base status. */
export function opsToBaseStatus(op: OpsOrderStatus): Order["status"] {
  switch (op) {
    case "new":
    case "preparing":
      return "processing";
    case "ready":
    case "out_for_delivery":
      return "shipped";
    case "delivered":
      return "delivered";
    case "cancelled":
      return "cancelled";
  }
}

export type Address = {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  city: string;
  district: string;
  street: string;
  isDefault?: boolean;
};

export const addresses: Address[] = [
  {
    id: "a1",
    label: "المنزل",
    recipient: "محمد العتيبي",
    phone: "+966501234567",
    city: "الرياض",
    district: "حي النرجس",
    street: "شارع الأمير محمد بن سلمان، مبنى ١٢",
    isDefault: true,
  },
  {
    id: "a2",
    label: "العمل",
    recipient: "محمد العتيبي",
    phone: "+966501234567",
    city: "الرياض",
    district: "حي العليا",
    street: "برج المملكة، الطابق ٢٠",
  },
];

export type Notification = {
  id: string;
  title: string;
  body: string;
  time: string;
  type: "order" | "promo" | "system";
  unread?: boolean;
};

export const notifications: Notification[] = [
  {
    id: "n1",
    title: "طلبك في الطريق",
    body: "طلب SUBH-10245 خرج للتوصيل وسيصلك اليوم.",
    time: "قبل ساعتين",
    type: "order",
    unread: true,
  },
  {
    id: "n2",
    title: "عروض صبح الأسبوعية",
    body: "خصومات تصل إلى ٥٠٪ على مئات المنتجات.",
    time: "أمس",
    type: "promo",
    unread: true,
  },
  {
    id: "n3",
    title: "تم تأكيد طلبك",
    body: "استلمنا طلبك SUBH-10245 وسيتم تجهيزه قريبًا.",
    time: "قبل يومين",
    type: "order",
  },
  {
    id: "n4",
    title: "شكرًا لتقييمك",
    body: "تم نشر تقييمك على منتج «قهوة عربية مختصة».",
    time: "الأسبوع الماضي",
    type: "system",
  },
];
