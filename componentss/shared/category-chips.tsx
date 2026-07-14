"use client";

import { categoryIcon } from "@/lib/category-icons";

// Shared category chip row — one canonical look site-wide (matches the home
// page's hero chips: icon + solid-orange active state), so every page renders
// identical chips instead of each hand-rolling its own copy.

export type CategoryChipItem = {
  id: string;
  name: string;
  /** Stored lucide icon NAME (resolved via categoryIcon). Optional. */
  icon?: string | null;
};

type CategoryChipsProps = {
  categories: CategoryChipItem[];
  selected: string[];
  onToggle: (id: string) => void;
  /** Renders a leading "All" chip that's active when nothing is selected. */
  showAll?: boolean;
  onClearAll?: () => void;
  className?: string;
};

export default function CategoryChips({
  categories,
  selected,
  onToggle,
  showAll = false,
  onClearAll,
  className = "",
}: CategoryChipsProps) {
  const chipClass = (active: boolean) =>
    `flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
      active
        ? "bg-orange-500 font-semibold text-black"
        : "border border-white/[0.08] bg-white/[0.04] text-white/80 backdrop-blur-md hover:bg-white/10 hover:text-white"
    }`;

  return (
    <div className={`flex flex-wrap gap-2.5 ${className}`}>
      {showAll && (
        <button onClick={onClearAll} className={chipClass(selected.length === 0)}>
          All
        </button>
      )}
      {categories.map((cat) => {
        const Icon = categoryIcon(cat.icon);
        return (
          <button key={cat.id} onClick={() => onToggle(cat.id)} className={chipClass(selected.includes(cat.id))}>
            <Icon className="h-4 w-4" /> {cat.name}
          </button>
        );
      })}
    </div>
  );
}
