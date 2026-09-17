import { ImageResponse } from "next/og";

export const alt = "Touchline — Every match. One place.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "72px",
        background: "#f7f8fa",
        color: "#202d2a",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ color: "#176449", fontSize: 26, letterSpacing: 4 }}>
        TOUCHLINE
      </div>
      <div style={{ fontSize: 76, fontWeight: 700, marginTop: 24 }}>
        Every match.
      </div>
      <div style={{ fontSize: 76, fontWeight: 700, color: "#176449" }}>
        One place.
      </div>
      <div style={{ fontSize: 24, color: "#606f64", marginTop: 30 }}>
        Football discovery, matches and competitions.
      </div>
    </div>,
    size,
  );
}
