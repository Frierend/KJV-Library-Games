import { BookOpen, Compass } from "lucide-react";

interface BrandMarkProps {
  large?: boolean;
}

export function BrandMark({ large = false }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={`brand-symbol ${large ? "brand-symbol--large" : ""}`}
    >
      <Compass className="brand-symbol__compass" strokeWidth={1.8} />
      <BookOpen className="brand-symbol__book" strokeWidth={2.2} />
    </span>
  );
}
