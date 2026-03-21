import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Humans of AI — Intimate Portraits of the Minds Building Artificial Intelligence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0B0B0F",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top gradient accent */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "900px",
            height: "400px",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at center, rgba(139,92,246,0.15) 0%, rgba(139,92,246,0.05) 40%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Bottom edge glow */}
        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "0",
            right: "0",
            height: "2px",
            background:
              "linear-gradient(90deg, transparent 10%, rgba(139,92,246,0.4) 50%, transparent 90%)",
            display: "flex",
          }}
        />

        {/* Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <div
            style={{
              fontSize: "80px",
              fontWeight: 700,
              color: "#FFFFFF",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              display: "flex",
            }}
          >
            Humans of AI
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: "26px",
              fontWeight: 400,
              color: "#9CA3AF",
              maxWidth: "700px",
              textAlign: "center",
              lineHeight: 1.5,
              display: "flex",
            }}
          >
            Intimate portraits of the minds building artificial intelligence
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
