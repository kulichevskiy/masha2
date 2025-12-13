import { ImageResponse } from "next/og";

export const alt = "Maria Chevskaya - Portrait and Editorial Photographer";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  const playfairDisplay = await fetch(
    "https://fonts.gstatic.com/s/playfairdisplay/v36/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvUDXdzTYg-F_cfO3pgq0nSybvLxQtAdY.ttf"
  ).then((res) => res.arrayBuffer());

  const robotoMono = await fetch(
    "https://fonts.gstatic.com/s/robotomono/v23/L0xuDF4xlVMF-BfR8bXMIhJHg45mwgGEFl0_3vq_SeW4Ep0C8.ttf"
  ).then((res) => res.arrayBuffer());

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
              fontFamily: "Playfair Display",
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
              fontFamily: "Roboto Mono",
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
      fonts: [
        {
          name: "Playfair Display",
          data: playfairDisplay,
          style: "normal",
          weight: 600,
        },
        {
          name: "Roboto Mono",
          data: robotoMono,
          style: "normal",
          weight: 400,
        },
      ],
    }
  );
}

