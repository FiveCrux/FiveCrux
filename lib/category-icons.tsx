// Icon registry — categories store an icon NAME (string) in the DB; the client
// maps it to a lucide component here. Admin picks from CATEGORY_ICON_NAMES.
import {
  Code2, Package, Building2, Car, Crosshair, Shirt, Gift, Map, Coins, Boxes,
  Palette, Music, Wrench, Shield, Star, Tag, Briefcase, Home, Users, Zap,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Code2, Package, Building2, Car, Crosshair, Shirt, Gift, Map, Coins, Boxes,
  Palette, Music, Wrench, Shield, Star, Tag, Briefcase, Home, Users, Zap,
};

/** Resolve a stored icon name to a component (falls back to a generic Tag). */
export function categoryIcon(name?: string | null): LucideIcon {
  return (name && ICONS[name]) || Tag;
}

/** Names the admin can choose from. */
export const CATEGORY_ICON_NAMES = Object.keys(ICONS);
