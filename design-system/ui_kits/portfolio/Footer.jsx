function DimLink({ href, label, children, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <a
      href={href}
      onClick={onClick}
      aria-label={label}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        color: "var(--muted)",
        opacity: hover ? 1 : 0.5,
        transition: "opacity 150ms ease",
        display: "inline-flex",
        textDecoration: "none",
      }}
    >
      {children}
    </a>
  );
}

// Simple inline approximations of lucide-react icons (stroke 1, 24px)
const IG = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor"/>
  </svg>
);
const Mail = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 6l10 7 10-7"/>
  </svg>
);
const User = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>
  </svg>
);

function Footer({ onHome, onLogin }) {
  const [hoverWm, setHoverWm] = React.useState(false);
  return (
    <footer style={{ marginTop: 96, borderTop: "1px solid var(--border)", background: "#fff" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, textAlign: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); onHome && onHome(); }}
              onMouseEnter={() => setHoverWm(true)}
              onMouseLeave={() => setHoverWm(false)}
              style={{
                fontFamily: "var(--font-bebas-neue)",
                fontSize: 24,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                textTransform: "uppercase",
                color: "var(--fg)",
                opacity: hoverWm ? 1 : 0.5,
                textDecoration: "none",
                transition: "opacity 150ms ease",
              }}
            >
              Maria Chevskaya
            </a>
            <div style={{
              fontFamily: "var(--font-inter)",
              fontSize: 14,
              letterSpacing: "0.1em",
              textTransform: "lowercase",
              color: "var(--muted)",
              opacity: 0.5,
            }}>
              portrait and editorial photographer
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <DimLink href="https://www.instagram.com/maria.chevskaya/" label="Instagram"><IG/></DimLink>
            <DimLink href="mailto:maria.chevskaya@gmail.com" label="Email"><Mail/></DimLink>
            <DimLink href="#" label="Login" onClick={(e) => { e.preventDefault(); onLogin && onLogin(); }}><User/></DimLink>
          </div>
          <div style={{ fontSize: 14, color: "var(--muted)", opacity: 0.5 }}>
            © 2026 Maria Chevskaya. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
window.Footer = Footer;
