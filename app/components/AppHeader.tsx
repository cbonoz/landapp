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

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  return (
    <header className="landkoala-header">
      <Link href="/" className="landkoala-logo-link" aria-label="Go to home">
        <AppLogo />
      </Link>
      <nav className="landkoala-nav" aria-label="Primary">
        <Link href="/" className={isActive("/") ? "is-active" : undefined}>
          Home
        </Link>
        <Link href="/map" className={isActive("/map") ? "is-active" : undefined}>
          Map
        </Link>
        <Link
          href="/insights"
          className={isActive("/insights") ? "is-active" : undefined}
        >
          Insights
        </Link>
        <Link
          href="/blog"
          className={isActive("/blog") ? "is-active" : undefined}
        >
          Blog
        </Link>
        <Link
          href="/about"
          className={isActive("/about") ? "is-active" : undefined}
        >
          About
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
