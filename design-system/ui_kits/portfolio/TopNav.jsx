function TopNav({ onHome }) {
  return (
    <nav className="mc-nav" style={{ width: "100%" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 24px 0", display: "flex", justifyContent: "center" }}>
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); onHome && onHome(); }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", textDecoration: "none", color: "inherit" }}
        >
          <div style={{
            fontFamily: "var(--font-bebas-neue)",
            fontSize: 48,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
            color: "var(--fg)",
            transition: "opacity 150ms ease",
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.7"}
          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >
            Maria Chevskaya
          </div>
          <div style={{
            fontFamily: "var(--font-inter)",
            fontSize: 14,
            letterSpacing: "0.15em",
            textTransform: "lowercase",
            color: "var(--muted)",
            marginTop: 4,
          }}>
            portrait and editorial photographer
          </div>
        </a>
      </div>
    </nav>
  );
}
window.TopNav = TopNav;
