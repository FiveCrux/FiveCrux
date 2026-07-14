"use client";

import Link from "next/link";
import { useNavData } from "@/componentss/shared/nav-data-context";
import { categoryIcon } from "@/lib/category-icons";
import { Code2, Package, Gift, type LucideIcon } from "lucide-react";

// The site-wide "browse" chip row — fixed page shortcuts + the home-flagged
// categories, all as navigation links, rendered in the canonical hero style
// (icon + solid-orange active pill). Used on the home page and every browse
// page (props, etc.) so the chip row looks and behaves identically everywhere.
const SHORTCUTS: { name: string; icon: LucideIcon; href: string }[] = [
  { name: "Assets", icon: Code2, href: "/scripts" },
  { name: "Props", icon: Package, href: "/props" },
  { name: "Giveaways", icon: Gift, href: "/giveaways" },
];

export default function BrowseNav({
  activeName,
  className = "",
}: {
  /** Which chip to highlight (e.g. "Props" on the props page). */
  activeName?: string;
  className?: string;
}) {
  const { categories } = useNavData();
  const cats = Array.isArray(categories)
    ? [...categories]
        .filter((c) => c.showOnHome)
        .sort((a, b) => (a.homeOrder ?? 0) - (b.homeOrder ?? 0))
    : [];

  const items = [
    ...SHORTCUTS.map((s) => ({ name: s.name, Icon: s.icon, href: s.href })),
    ...cats.map((c) => ({
      name: c.name as string,
      Icon: categoryIcon(c.icon),
      href: `/scripts?category=${c.slug}`,
    })),
  ];

  return (
    <div
      className={`w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      <div className="flex w-max items-center gap-2.5 pb-1">
        {items.map(({ name, Icon, href }) => {
          const active = name === activeName;
          return (
            <Link
              key={name}
              href={href}
              className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                active
                  ? "bg-orange-500 font-semibold text-black"
                  : "border border-white/[0.08] bg-white/[0.04] backdrop-blur-md hover:bg-white/10"
              }`}
            >
              <Icon className="h-4 w-4" /> {name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
