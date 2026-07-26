/**
 * Visual mapping for REAL backend categories. Rows carry only slug + name_ar —
 * no icon or color — so we derive a stable icon + tint from the slug so every
 * category renders identically across the customer screens.
 */
import {
  BookOpen,
  Layers,
  Plug,
  Shirt,
  Smartphone,
  Sofa,
  Utensils,
  type LucideIcon,
} from "lucide-react";

const SLUG_ICONS: { match: string[]; icon: LucideIcon }[] = [
  { match: ["electronic", "phone", "tech"], icon: Smartphone },
  { match: ["accessor", "charger", "plug"], icon: Plug },
  { match: ["home", "furniture", "decor"], icon: Sofa },
  { match: ["fashion", "cloth", "abaya"], icon: Shirt },
  { match: ["grocery", "food", "veg", "fruit"], icon: Utensils },
  { match: ["book"], icon: BookOpen },
];

const TONES = [
  "bg-sky-50 text-sky-600",
  "bg-rose-50 text-rose-600",
  "bg-amber-50 text-amber-600",
  "bg-emerald-50 text-emerald-600",
  "bg-fuchsia-50 text-fuchsia-600",
  "bg-indigo-50 text-indigo-600",
  "bg-orange-50 text-orange-600",
  "bg-lime-50 text-lime-700",
];

export function iconForSlug(slug: string): LucideIcon {
  const lower = slug.toLowerCase();
  return SLUG_ICONS.find((e) => e.match.some((m) => lower.includes(m)))?.icon ?? Layers;
}

export function toneForSlug(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % TONES.length;
  return TONES[h];
}
