import type { FoodCategory } from "@/lib/format";

const ICON_PATHS: Record<FoodCategory, string> = {
  seafood:
    "M3 12c3-4 7-6 11-6 3 0 5 2 7 6-2 4-4 6-7 6-4 0-8-2-11-6zM3 12l-1-3M3 12l-1 3M16 11v.01",
  meat: "M15 4a5 5 0 0 1 4 8l-7 7a4 4 0 0 1-6-6l7-7a5 5 0 0 1 2-2zM6 18l-2 2",
  dairy: "M9 3h6l3 5v13H6V8l3-5zM6 8h12M9 3l3 5 3-5",
  bakery: "M4 11a4 4 0 0 1 4-4h8a4 4 0 0 1 1 7.9V19H7v-4.1A4 4 0 0 1 4 11z",
  drinks: "M4 8h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6zM17 10h2a2 2 0 0 1 0 4h-2",
  spices: "M9 3h6v3H9zM8 6h8l1 3v12H7V9l1-3zM10 13v.01M14 13v.01M12 16v.01",
  supplements:
    "M10.5 3.5a5 5 0 0 1 7 7l-7 7a5 5 0 0 1-7-7zM7 10.5l7 7",
  produce: "M5 19c0-8 6-14 14-14 0 8-6 14-14 14zM5 19l7-7",
  snacks: "M12 4a8 8 0 1 0 0 16 8 8 0 1 0 0-16zM9 10v.01M14 9v.01M10 14v.01M15 14v.01",
  meals: "M3 11h18a9 9 0 0 1-18 0zM8 7c0-2 2-2 2-4M13 7c0-2 2-2 2-4",
};

export function FoodIcon({
  category,
  className,
}: {
  category: FoodCategory;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={ICON_PATHS[category]} />
    </svg>
  );
}
