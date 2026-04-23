const ADMIN_PHOTOS = [
  { id: 1, file: "DSC_2348-Edit.jpg", title: "Curls, soft light", desc: "", alt: "Portrait, natural light", visible: true },
  { id: 2, file: "DSC_1610-Edit.jpg", title: "Woods, pine", desc: "Editorial, spring", alt: "Full-length in white dress", visible: true },
  { id: 3, file: "DSC_3426-Edit.jpg", title: "Ava / profile", desc: "", alt: "", visible: true },
  { id: 4, file: "DSC_0123.jpg", title: "Veil", desc: "Editorial test", alt: "Headshot, black backdrop", visible: false },
  { id: 5, file: "DSC_4274-Edit.jpg", title: "", desc: "", alt: "", visible: true },
  { id: 6, file: "DSC_6750.jpg", title: "Balcony", desc: "", alt: "", visible: true },
];

const Grip = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/>
    <circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/>
  </svg>
);
const Trash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>
  </svg>
);
const Upload = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>
  </svg>
);

function Switch({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 36, height: 20, borderRadius: 999, border: 0,
        background: checked ? "var(--fg)" : "#d1d5db",
        position: "relative", cursor: "pointer",
        transition: "background-color 150ms",
        padding: 0,
      }}
      aria-pressed={checked}
    >
      <span style={{
        position: "absolute", top: 2, left: checked ? 18 : 2,
        width: 16, height: 16, borderRadius: 999,
        background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
        transition: "left 150ms",
      }}/>
    </button>
  );
}

function Row({ photo, onToggle, onDelete }) {
  const [hover, setHover] = React.useState(false);
  return (
    <tr style={{ borderBottom: "1px solid var(--border)", background: hover ? "rgba(0,0,0,0.02)" : "transparent" }}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <td style={{ width: 40, padding: 8, color: "var(--muted)", cursor: "grab" }}><Grip/></td>
      <td style={{ padding: 8 }}>
        <img src={`../../assets/photos/${photo.file}`} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 4, display: "block" }}/>
      </td>
      <td style={{ padding: 8, fontSize: 14, color: photo.title ? "var(--fg)" : "var(--muted)" }}>
        {photo.title || "Заголовок"}
      </td>
      <td style={{ padding: 8, fontSize: 14, color: photo.desc ? "var(--fg)" : "var(--muted)" }}>
        {photo.desc || "Описание"}
      </td>
      <td style={{ padding: 8, fontSize: 14, color: photo.alt ? "var(--fg)" : "var(--muted)" }}>
        {photo.alt || "Alt текст"}
      </td>
      <td style={{ padding: 8, textAlign: "center" }}>
        <Switch checked={photo.visible} onChange={(v) => onToggle(photo.id, v)}/>
      </td>
      <td style={{ padding: 8, textAlign: "center" }}>
        <button onClick={() => onDelete(photo.id)} style={{
          background: "transparent", border: 0, color: "#dc2626", cursor: "pointer",
          width: 32, height: 32, borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}><Trash/></button>
      </td>
    </tr>
  );
}

function AdminShell({ email, onLogout }) {
  const [photos, setPhotos] = React.useState(ADMIN_PHOTOS);
  const toggle = (id, v) => setPhotos((ps) => ps.map((p) => p.id === id ? { ...p, visible: v } : p));
  const del = (id) => setPhotos((ps) => ps.filter((p) => p.id !== id));

  return (
    <div style={{ fontFamily: "var(--font-geist-sans)", background: "#fff", minHeight: "100vh", color: "var(--fg)" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
                Личный кабинет фотографа
              </h1>
              <p style={{ color: "var(--muted)", margin: "4px 0 0", fontSize: 14 }}>
                Управление фотографиями портфолио
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 14, color: "var(--muted)" }}>{email}</span>
              <button onClick={onLogout} style={{
                height: 36, padding: "0 16px",
                background: "#fff", color: "var(--fg)",
                border: "1px solid var(--border)", borderRadius: 8,
                fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
              }}>Выйти</button>
            </div>
          </div>
        </div>

        {/* Dropzone */}
        <div style={{
          border: "2px dashed var(--border)", borderRadius: 10,
          padding: 28, textAlign: "center", color: "var(--muted)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          marginBottom: 24, background: "#fafafa",
        }}>
          <Upload/>
          <div style={{ fontSize: 14, color: "var(--fg)", fontWeight: 500 }}>Перетащите фотографии сюда</div>
          <div style={{ fontSize: 13 }}>или нажмите, чтобы выбрать · до 50 файлов · 10MB каждый</div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.02)" }}>
                <th style={{ width: 40, padding: 8 }}/>
                <th style={{ padding: 8, textAlign: "left", color: "var(--muted)", fontWeight: 500 }}>Фото</th>
                <th style={{ padding: 8, textAlign: "left", color: "var(--muted)", fontWeight: 500 }}>Заголовок</th>
                <th style={{ padding: 8, textAlign: "left", color: "var(--muted)", fontWeight: 500 }}>Описание</th>
                <th style={{ padding: 8, textAlign: "left", color: "var(--muted)", fontWeight: 500 }}>Alt текст</th>
                <th style={{ padding: 8, textAlign: "center", color: "var(--muted)", fontWeight: 500 }}>Видимость</th>
                <th style={{ padding: 8, textAlign: "center", color: "var(--muted)", fontWeight: 500 }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {photos.map((p) => <Row key={p.id} photo={p} onToggle={toggle} onDelete={del}/>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
window.AdminShell = AdminShell;
