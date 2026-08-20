import { Library, Settings2 } from "lucide-react";
import { lazy, Suspense, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { BrandMark } from "../components/ui/BrandMark";

const PwaStatus = import.meta.env.MODE === "test"
  ? function TestPwaStatus() { return null; }
  : lazy(() => import("../pwa/PwaStatus"));

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="app-shell product-shell">
      <header className="product-header">
        <Link aria-label="KJVenture home" className="product-brand" to="/">
          <BrandMark />
          <span>
            <strong>KJVenture</strong>
            <small>Play Together. Journey Through the Word.</small>
          </span>
        </Link>
        <nav aria-label="Primary navigation">
          <NavLink to="/games"><Library size={18} /> Games</NavLink>
          <NavLink to="/studio"><Settings2 size={18} /> Session Studio</NavLink>
        </nav>
      </header>
      {children}
      <Suspense fallback={null}>
        <PwaStatus />
      </Suspense>
    </main>
  );
}
