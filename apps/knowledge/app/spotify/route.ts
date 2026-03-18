import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db";
import { spotifyTokens } from "@/src/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return new NextResponse(
      html("Spotify Auth Failed", `<p>Error: ${error}</p><a href="/">Back</a>`),
      { headers: { "Content-Type": "text/html" } },
    );
  }

  if (!code) {
    return new NextResponse(
      html("Missing Code", `<p>No authorization code received.</p><a href="/">Back</a>`),
      { headers: { "Content-Type": "text/html" } },
    );
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI!;

  // Exchange code for tokens
  const tokenResp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResp.ok) {
    const err = await tokenResp.text();
    return new NextResponse(
      html("Token Exchange Failed", `<p>${err}</p><a href="/">Back</a>`),
      { headers: { "Content-Type": "text/html" } },
    );
  }

  const tokens = await tokenResp.json();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  // Upsert tokens (single-row table keyed on "default")
  await db
    .insert(spotifyTokens)
    .values({
      id: "default",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: spotifyTokens.id,
      set: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        expiresAt,
        updatedAt: new Date(),
      },
    });

  return new NextResponse(
    html(
      "Spotify Connected",
      `<p style="color:#2dd4bf">Spotify connected successfully.</p>
       <p>Access token expires: ${expiresAt.toISOString()}</p>
       <p>Refresh token stored — the pipeline will auto-renew.</p>
       <a href="/">Back to lessons</a>`,
    ),
    { headers: { "Content-Type": "text/html" } },
  );
}

function html(title: string, body: string) {
  return `<!DOCTYPE html>
<html><head><title>${title}</title>
<style>body{background:#111;color:#e5e5e5;font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
.box{text-align:center;max-width:400px}a{color:#2dd4bf;text-decoration:none}</style>
</head><body><div class="box"><h1>${title}</h1>${body}</div></body></html>`;
}
