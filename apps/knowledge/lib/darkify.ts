/** Remap light hex colors to dark-mode equivalents inside iframe content */
const LIGHT_TO_DARK: [RegExp, string][] = [
  [/#fff(?:fff)?(?![0-9a-fA-F])/g, "#111113"],   // white → dark bg
  [/#f9fafb/gi, "#161618"],                        // gray-50
  [/#f3f4f6/gi, "#1c1c1e"],                        // gray-100
  [/#f0f0f0/gi, "#1c1c1e"],                        // generic light gray
  [/#e5e7eb/gi, "#2c2c30"],                        // gray-200
  [/#e2e8f0/gi, "#2c2c30"],                        // slate-200
  [/#d1d5db/gi, "#3a3a3f"],                        // gray-300
  [/#9ca3af/gi, "#706f78"],                        // gray-400
  [/#94a3b8/gi, "#706f78"],                        // slate-400
  [/#6b7280/gi, "#908e96"],                        // gray-500
  [/#374151/gi, "#c1c0c5"],                        // gray-700 (text)
  [/#1f2937/gi, "#d5d4d9"],                        // gray-800 (text)
  [/#111827/gi, "#eeeef0"],                        // gray-900 (text)
  [/#1a1a1a/gi, "#eeeef0"],                        // near-black text
  [/#000(?:000)?(?![0-9a-fA-F])/g, "#eeeef0"],    // black text
  // Tailwind tinted light backgrounds → dark tinted equivalents
  [/#fef2f2/gi, "#2a1215"],                        // red-50
  [/#fdf2f8/gi, "#2a1225"],                        // pink-50
  [/#f0fdf4/gi, "#122a18"],                        // green-50
  [/#eff6ff/gi, "#12182a"],                        // blue-50
  [/#faf5ff/gi, "#1a122a"],                        // purple-50
];

export function darkify(src: string): string {
  let out = src;
  for (const [re, rep] of LIGHT_TO_DARK) out = out.replace(re, rep);
  return out;
}
