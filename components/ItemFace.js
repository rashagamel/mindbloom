"use client";
import { itemLabel } from "@/lib/content";

const PATHS = {
  circle: <circle cx="50" cy="50" r="40" />,
  oval: <ellipse cx="50" cy="50" rx="44" ry="29" />,
  square: <rect x="14" y="14" width="72" height="72" rx="5" />,
  rectangle: <rect x="5" y="25" width="90" height="50" rx="5" />,
  triangle: <polygon points="50,10 92,86 8,86" strokeLinejoin="round" />,
  diamond: <polygon points="50,6 94,50 50,94 6,50" strokeLinejoin="round" />,
  star: <polygon points="50,6 62,38 95,38 68,58 78,92 50,72 22,92 32,58 5,38 38,38" strokeLinejoin="round" />,
  heart: <path d="M50 88 C10 58 6 30 24 18 C38 9 50 20 50 28 C50 20 62 9 76 18 C94 30 90 58 50 88Z" strokeLinejoin="round" />,
};

export function ShapeSvg({ id, color = "#ff7a59", size = 64, title }) {
  return (
    <svg className="shapesvg" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={title ?? id}
      fill={color} stroke="#ffffff" strokeWidth="4" style={{ filter: "drop-shadow(0 3px 0 rgba(0,0,0,.18))" }}>
      {PATHS[id]}
    </svg>
  );
}

// What a child sees for an item: the letter/number text, or a drawn shape.
export default function ItemFace({ domain, id, lang, size = 64 }) {
  if (domain.kind !== "shape") return <>{itemLabel(domain, id, lang)}</>;
  const item = domain.items.find((i) => i.id === id);
  return <ShapeSvg id={id} color={item?.color} size={size} title={itemLabel(domain, id, lang)} />;
}
