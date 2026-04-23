function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" style={{ width: 16, height: 16 }}>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.67 4.1-5.5 4.1-3.31 0-6.01-2.74-6.01-6.1S8.69 5.9 12 5.9c1.88 0 3.14.8 3.86 1.48l2.63-2.54C16.85 3.3 14.62 2.3 12 2.3 6.98 2.3 2.9 6.38 2.9 11.4s4.08 9.1 9.1 9.1c5.26 0 8.74-3.69 8.74-8.89 0-.6-.06-1.05-.14-1.51H12z"/>
      <path fill="#4285F4" d="M21.6 12.23c0-.67-.06-1.31-.17-1.93H12v3.65h5.42c-.23 1.26-.95 2.33-2.02 3.05v2.53h3.27c1.92-1.77 3.03-4.38 3.03-7.3z"/>
      <path fill="#FBBC05" d="M5.5 13.73a5.87 5.87 0 010-3.47V7.72H2.17a9.7 9.7 0 000 8.56l3.33-2.55z"/>
      <path fill="#34A853" d="M12 20.5c2.7 0 4.96-.9 6.62-2.44l-3.27-2.53c-.9.61-2.08.98-3.35.98-2.58 0-4.76-1.74-5.54-4.08l-3.33 2.55A9.98 9.98 0 0012 20.5z"/>
    </svg>
  );
}

function LoginCard({ onSubmit }) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [focus, setFocus] = React.useState(null);

  const input = (id) => ({
    width: "100%",
    height: 36,
    border: `1px solid ${focus === id ? "#252525" : "var(--border)"}`,
    borderRadius: 8,
    padding: "0 12px",
    fontSize: 14,
    boxSizing: "border-box",
    background: "transparent",
    fontFamily: "var(--font-geist-sans)",
    outline: "none",
    boxShadow: focus === id ? "0 0 0 3px rgba(107,114,128,0.2)" : "none",
    transition: "border-color 150ms, box-shadow 150ms",
  });

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, background: "#fff",
      fontFamily: "var(--font-geist-sans)",
    }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "24px 24px 28px",
          boxShadow: "0 1px 3px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04)",
        }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: "var(--fg)", lineHeight: 1.1 }}>Вход</div>
          <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 6, marginBottom: 20 }}>
            Введите email для входа в аккаунт
          </div>
          <form onSubmit={(e) => { e.preventDefault(); onSubmit && onSubmit(); }} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label htmlFor="email" style={{ fontSize: 13, fontWeight: 500 }}>Email</label>
              <input id="email" type="email" placeholder="email@example.com" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocus("email")} onBlur={() => setFocus(null)}
                style={input("email")}/>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <label htmlFor="password" style={{ fontSize: 13, fontWeight: 500 }}>Пароль</label>
                <a href="#" style={{ marginLeft: "auto", fontSize: 13, color: "var(--fg)", textDecoration: "none" }}
                   onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                   onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}>
                  Восстановить пароль
                </a>
              </div>
              <input id="password" type="password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocus("password")} onBlur={() => setFocus(null)}
                style={input("password")}/>
            </div>
            <button type="submit" style={{
              height: 36, background: "var(--fg)", color: "#fff",
              border: 0, borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer",
              fontFamily: "inherit",
            }}>
              Войти
            </button>
            <div style={{ position: "relative", textAlign: "center", fontSize: 13 }}>
              <span style={{ background: "#fff", padding: "0 10px", color: "var(--muted)", position: "relative", zIndex: 1 }}>или</span>
              <span style={{ position: "absolute", inset: "50% 0 auto 0", transform: "translateY(-50%)", height: 1, background: "var(--border)" }}/>
            </div>
            <button type="button" onClick={() => onSubmit && onSubmit()} style={{
              height: 36, background: "#fff", color: "var(--fg)",
              border: "1px solid var(--border)", borderRadius: 8, fontSize: 14, fontWeight: 500,
              cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontFamily: "inherit",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}>
              <GoogleIcon/> Войти через Google
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
window.LoginCard = LoginCard;
