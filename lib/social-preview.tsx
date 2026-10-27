import { ImageResponse } from "next/og";

const size = {
  width: 1200,
  height: 630,
};

export function SocialPreviewImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "white",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
          }}
        >
          <h1
            style={{
              fontSize: "72px",
              fontWeight: 600,
              fontFamily: "serif",
              color: "black",
              margin: 0,
              textAlign: "center",
              letterSpacing: "-0.02em",
            }}
          >
            Maria Chevskaya
          </h1>
          <p
            style={{
              fontSize: "24px",
              fontWeight: 400,
              fontFamily: "monospace",
              color: "#6b7280",
              margin: 0,
              textAlign: "center",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Portrait and Editorial Photographer
          </p>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

