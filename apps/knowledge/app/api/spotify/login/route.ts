import { NextResponse } from "next/server";

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SCOPES = "user-read-private user-read-email";

export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "SPOTIFY_CLIENT_ID and SPOTIFY_REDIRECT_URI must be set" },
      { status: 500 },
    );
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: redirectUri,
  });

  return NextResponse.redirect(`${SPOTIFY_AUTH_URL}?${params.toString()}`);
}
