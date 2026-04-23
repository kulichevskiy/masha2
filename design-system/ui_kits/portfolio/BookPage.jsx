function EmailCTA() {
  const [hover, setHover] = React.useState(false);
  return (
    <a
      href="mailto:maria.chevskaya@gmail.com"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-block",
        background: hover ? "#1f2937" : "#000",
        color: "#fff",
        padding: "12px 56px",
        fontFamily: "var(--font-bebas-neue)",
        fontSize: 20,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        textDecoration: "none",
        borderRadius: 0,
        transition: "background-color 150ms ease",
      }}
    >
      Email me
    </a>
  );
}

function BookPage() {
  return (
    <main style={{
      maxWidth: 576,
      margin: "0 auto",
      padding: "64px 24px 96px",
      fontFamily: "var(--font-inter)",
      color: "var(--text)",
      lineHeight: 1.65,
    }}>
      <div style={{ marginBottom: 40 }}>
        <img
          src="../../assets/photos/photo_2026-02-01 17.14.58.jpeg"
          alt="Maria Chevskaya"
          style={{ width: "100%", display: "block" }}
        />
      </div>

      <h1 style={{
        fontFamily: "var(--font-bebas-neue)",
        fontSize: 30,
        lineHeight: 1,
        textTransform: "lowercase",
        color: "var(--fg)",
        margin: "0 0 32px",
        fontWeight: 400,
      }}>
        booking
      </h1>

      <p style={{ margin: "0 0 32px" }}>
        People I work with are seen, not just photographed. Each session is built around presence, character and rhythm, not poses or time slots. It is a collaborative process, calm and attentive, with space to arrive into yourself.
      </p>

      <p style={{ margin: 0, color: "var(--fg)" }}>Portrait sessions — from 450 €</p>
      <p style={{ margin: "0 0 32px" }}>
        For personal portraits, moments of transition, inner shifts and quiet confidence.
      </p>

      <p style={{ margin: 0, color: "var(--fg)" }}>Editorial / personal projects — upon request</p>
      <p style={{ margin: "0 0 32px" }}>
        For magazines, artists, authors and long-term collaborations.
      </p>

      <div>
        <p style={{ margin: "0 0 32px" }}>
          If this feels like a match, write to me and tell a few words about yourself or your idea.
        </p>
        <EmailCTA/>
      </div>
    </main>
  );
}
window.BookPage = BookPage;
