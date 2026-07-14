"use client";

// Shared category filter-chip row — same pill look (size, spacing, active
// gradient) wherever categories are filterable, so every page renders the
// exact same UI instead of each one hand-rolling its own copy.

export type CategoryChipItem = { id: string; name: string };

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
    `rounded-full px-4 py-1.5 text-sm font-semibold transition ${
      active
        ? "bg-gradient-to-r from-orange-500 to-yellow-400 text-black"
        : "border border-white/[0.08] bg-white/[0.04] text-white/70 hover:border-orange-500/40 hover:text-white"
    }`;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {showAll && (
        <button onClick={onClearAll} className={chipClass(selected.length === 0)}>
          All
        </button>
      )}
      {categories.map((cat) => (
        <button key={cat.id} onClick={() => onToggle(cat.id)} className={chipClass(selected.includes(cat.id))}>
          {cat.name}
        </button>
      ))}
    </div>
  );
}
