function FloatingBookButton({ onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div style={{
      position: "fixed",
      left: 16, right: 16, bottom: 24,
      zIndex: 50,
      pointerEvents: "none",
      display: "flex",
      justifyContent: "flex-end",
      maxWidth: 1280,
      margin: "0 auto",
    }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          pointerEvents: "auto",
          background: hover ? "#000" : "rgba(0,0,0,0.8)",
          color: "#fff",
          padding: "12px 80px",
          border: 0,
          borderRadius: 0,
          fontFamily: "var(--font-bebas-neue)",
          fontSize: 20,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          cursor: "pointer",
          transform: hover ? "scale(1.05)" : "scale(1)",
          transition: "transform 150ms ease, background-color 150ms ease",
        }}
      >
        Book
      </button>
    </div>
  );
}
window.FloatingBookButton = FloatingBookButton;
