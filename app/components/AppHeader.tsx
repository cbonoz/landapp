"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppLogo } from "@/app/components/AppLogo";

type AppHeaderProps = {
  panelOpen?: boolean;
  onTogglePanel?: () => void;
};

export function AppHeader({ panelOpen, onTogglePanel }: AppHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="landkoala-header">
      <AppLogo />
      <nav className="landkoala-nav" aria-label="Primary">
        <Link href="/" className={pathname === "/" ? "is-active" : undefined}>
          Map
        </Link>
        <Link
          href="/insights"
          className={pathname === "/insights" ? "is-active" : undefined}
        >
          Insights
        </Link>
        <Link
          href="/data-sources"
          className={pathname === "/data-sources" ? "is-active" : undefined}
        >
          Data Sources
        </Link>
      </nav>
      {onTogglePanel ? (
        <button type="button" className="landkoala-nav-button" onClick={onTogglePanel}>
          {panelOpen ? "Hide controls" : "Show controls"}
        </button>
      ) : null}
    </header>
  );
}
