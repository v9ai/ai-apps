import { ImageResponse } from "next/og";
import {
  getPersonalityBySlug,
  getCategoryForPersonality,
} from "@/lib/personalities";

export const runtime = "nodejs";
export const alt = "Humans of AI — AI Leader Profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const person = getPersonalityBySlug(slug);
  const category = getCategoryForPersonality(slug);

  const name = person?.name ?? "Unknown";
  const role = person?.role ?? "";
  const org = person?.org ?? "";
  const categoryTitle = category?.title ?? "";

  const subtitle = [role, org].filter(Boolean).join(" | ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          backgroundColor: "#0B0B0F",
          padding: "60px 80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top-left gradient accent */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            left: "-80px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle at center, rgba(139,92,246,0.12) 0%, transparent 60%)",
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
              "linear-gradient(90deg, transparent 5%, rgba(139,92,246,0.4) 30%, rgba(59,130,246,0.3) 70%, transparent 95%)",
            display: "flex",
          }}
        />

        {/* Branding - top right */}
        <div
          style={{
            position: "absolute",
            top: "40px",
            right: "60px",
            fontSize: "20px",
            fontWeight: 600,
            color: "rgba(139,92,246,0.7)",
            letterSpacing: "-0.01em",
            display: "flex",
          }}
        >
          Humans of AI
        </div>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          {/* Category badge */}
          {categoryTitle && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 500,
                  color: "#A78BFA",
                  backgroundColor: "rgba(139,92,246,0.12)",
                  padding: "6px 18px",
                  borderRadius: "20px",
                  border: "1px solid rgba(139,92,246,0.2)",
                  display: "flex",
                }}
              >
                {categoryTitle}
              </div>
            </div>
          )}

          {/* Person name */}
          <div
            style={{
              fontSize: "72px",
              fontWeight: 700,
              color: "#FFFFFF",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              display: "flex",
            }}
          >
            {name}
          </div>

          {/* Role | Org */}
          {subtitle && (
            <div
              style={{
                fontSize: "28px",
                fontWeight: 400,
                color: "#9CA3AF",
                lineHeight: 1.4,
                display: "flex",
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
