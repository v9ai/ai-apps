/**
 * Email logo — "VADIM NICOLAI" wordmark as base64-encoded SVG data URI.
 *
 * SVG-as-data-URI works in most modern email clients (Gmail web, Apple Mail,
 * Thunderbird). For Outlook desktop fallback, use the `logoUrl` override in
 * SignatureConfig to point at a hosted PNG.
 */

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 50" width="240" height="50">
  <text x="0" y="28" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-weight="700" font-size="24" fill="#1a1a1a" letter-spacing="3">VADIM NICOLAI</text>
  <rect x="0" y="35" width="200" height="2.5" rx="1" fill="#0066cc"/>
</svg>`;

export const LOGO_BASE64 = `data:image/svg+xml;base64,${Buffer.from(SVG).toString("base64")}`;
export const LOGO_WIDTH = 120;
export const LOGO_HEIGHT = 25;
export const LOGO_ALT = "Vadim Nicolai";
