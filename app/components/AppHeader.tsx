import { AppLogo } from "@/app/components/AppLogo";

type AppHeaderProps = {
  panelOpen: boolean;
  onTogglePanel: () => void;
};

export function AppHeader({ panelOpen, onTogglePanel }: AppHeaderProps) {
  return (
    <header className="landkoala-header">
      <AppLogo />
      <nav className="landkoala-nav" aria-label="Primary">
        <a href="#">Map</a>
        <a href="#">Insights</a>
        <a href="#">Data Sources</a>
      </nav>
      <button type="button" className="landkoala-nav-button" onClick={onTogglePanel}>
        {panelOpen ? "Hide controls" : "Show controls"}
      </button>
    </header>
  );
}
