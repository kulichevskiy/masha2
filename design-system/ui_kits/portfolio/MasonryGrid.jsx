const ROW_SPANS = [2, 2, 3, 2, 2, 2, 3, 3, 2, 2];

const PHOTOS = [
  "DSC_0123.jpg",
  "DSC_1610-Edit.jpg",
  "DSC_2348-Edit.jpg",
  "DSC_3426-Edit.jpg",
  "DSC_4274-Edit.jpg",
  "DSC_5971-Edit.jpg",
  "DSC_6750.jpg",
  "DSC_7040.jpg",
  "DSC_8898-Edit.jpg",
  "DSC_9398.jpg",
  "DSC_1113.jpg",
  "DSC_6120.jpg",
  "DSC_3581.jpg",
  "DSC_3591.jpg",
  "DSC_4447.jpg",
];

function MasonryCell({ src, span }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        overflow: "hidden",
        background: "var(--mc-image-plate)",
        gridRow: `span ${span}`,
        cursor: "pointer",
      }}
    >
      <img
        src={`../../assets/photos/${src}`}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          transition: "transform 500ms ease",
          transform: hover ? "scale(1.05)" : "scale(1)",
        }}
      />
    </div>
  );
}

function MasonryGrid() {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 16,
      gridAutoRows: "200px",
      width: "100%",
    }}>
      {PHOTOS.map((p, i) => (
        <MasonryCell key={p} src={p} span={ROW_SPANS[i % ROW_SPANS.length]} />
      ))}
    </div>
  );
}
window.MasonryGrid = MasonryGrid;
