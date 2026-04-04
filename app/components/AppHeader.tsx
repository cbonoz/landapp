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
  const canTogglePanel = Boolean(onTogglePanel);

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
      <button
        type="button"
        className={`landkoala-nav-button ${canTogglePanel ? "" : "is-placeholder"}`.trim()}
        onClick={onTogglePanel}
        disabled={!canTogglePanel}
        aria-hidden={!canTogglePanel}
        tabIndex={canTogglePanel ? 0 : -1}
      >
        {panelOpen ? "Hide controls" : "Show controls"}
      </button>
    </header>
  );
}
