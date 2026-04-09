type AppLogoProps = {
  compact?: boolean;
};

export function AppLogo({ compact = false }: AppLogoProps) {
  return (
    <div className={`landkoala-logo ${compact ? "is-compact" : ""}`.trim()}>
      <span className="landkoala-logo-mark" aria-hidden>
        <span className="landkoala-logo-dot" />
      </span>
      <div className="landkoala-logo-copy">
        <strong>LandKoala</strong>
        {!compact ? <small>Free site selection intelligence</small> : null}
      </div>
    </div>
  );
}
