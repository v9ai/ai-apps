"use client";

import { useState } from "react";
import {
  Container,
  Heading,
  Text,
  Box,
  Card,
  Flex,
  Separator,
  Button,
  Link as RadixLink,
} from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import NextLink from "next/link";
import { useParams } from "next/navigation";

// Direct upload.wikimedia.org URLs (NOT Special:FilePath) so the CORS chain
// stays clean — Special:FilePath returns 302 without Access-Control-Allow-Origin,
// which causes browsers to reject crossorigin <img> loads needed for canvas export.
// URLs were resolved once via `Special:FilePath?width=1200` and baked here.
// "thumb" path = scaled rendition; non-"thumb" = original (used when source is
// already ≤ requested width).
const WM_URLS = {
  flag:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Flag_of_Slovenia.svg/960px-Flag_of_Slovenia.svg.png",
  coat:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Coat_of_arms_of_Slovenia.svg/960px-Coat_of_arms_of_Slovenia.svg.png",
  dragon:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Dragon_on_Dragon_Bridge_%28cropped%29.jpg/1280px-Dragon_on_Dragon_Bridge_%28cropped%29.jpg",
  triglav:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Triglav.jpg/1280px-Triglav.jpg",
  bled:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Bled_island.jpg/1280px-Bled_island.jpg",
  predjama:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/H%C3%B6hlenburg_Predjama_in_Slovenien.jpg/1280px-H%C3%B6hlenburg_Predjama_in_Slovenien.jpg",
  licitar:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Licitars2.jpg/1280px-Licitars2.jpg",
  bee:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Apis_mellifera_carnica_worker_hive_entrance_3.jpg/1280px-Apis_mellifera_carnica_worker_hive_entrance_3.jpg",
  lipizzan:
    "https://upload.wikimedia.org/wikipedia/commons/b/bb/Lipica.jpg",
  olm:
    "https://upload.wikimedia.org/wikipedia/commons/f/f0/Proteus_anguinus_Postojnska_Jama_Slovenija.jpg",
  flute:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Divje_Babe_flute_%28Late_Pleistocene_flute%29.jpg/1280px-Divje_Babe_flute_%28Late_Pleistocene_flute%29.jpg",
  freising:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Freising_manuscript.jpg/1280px-Freising_manuscript.jpg",
} as const;

type ImgItem = {
  src: string;
  title: string;
  caption: string;
  fit?: "cover" | "contain";
  bg?: string;
};

const FLAG_IMAGES: ImgItem[] = [
  {
    src: WM_URLS.flag,
    title: "Steagul Sloveniei",
    caption:
      "Trei dungi orizontale: alb, albastru, roșu. Pe partea stângă-sus apare stema cu Triglav, două linii ondulate (râurile/marea) și 3 stele aurii.",
    fit: "contain",
    bg: "#ffffff",
  },
  {
    src: WM_URLS.coat,
    title: "Stema Sloveniei",
    caption:
      "Vârful Triglav (alb) pe fond albastru, două linii ondulate (Marea Adriatică / râurile) și 3 stele aurii (preluate de la conții de Celje).",
    fit: "contain",
    bg: "#ffffff",
  },
];

const SYMBOLS: ImgItem[] = [
  {
    src: WM_URLS.dragon,
    title: "Dragonul Ljubljanei",
    caption:
      "Statuile de pe Podul Dragonilor (Zmajski most). Dragonul este simbolul orașului Ljubljana — apare pe stemă și pe steagul orașului.",
  },
  {
    src: WM_URLS.triglav,
    title: "Muntele Triglav (2.864 m)",
    caption:
      "Cel mai înalt munte din Slovenia, cu 3 vârfuri caracteristice. Apare pe stemă, pe bancnote, pe moneda de 50 cenți și pe tricoul echipei naționale de fotbal.",
  },
  {
    src: WM_URLS.bled,
    title: "Lacul Bled",
    caption:
      "Insula cu bisericuța (Cerkev Marijinega vnebovzetja) în mijlocul lacului — cea mai fotografiată imagine a Sloveniei.",
  },
  {
    src: WM_URLS.predjama,
    title: "Castelul Predjama",
    caption:
      "Castel construit într-o peșteră, sub o stâncă de 123 m. Cel mai mare castel-peșteră din lume (Cartea Recordurilor).",
  },
  {
    src: WM_URLS.licitar,
    title: "Licitarsko srce",
    caption:
      "Inima roșie din turtă dulce decorată — simbol tradițional sloven și croat, oferită ca semn de prietenie sau dragoste.",
  },
  {
    src: WM_URLS.bee,
    title: "Albina carniolică",
    caption:
      "Apis mellifera carnica — rasa autohtonă de albine. Slovenia a propus, în 2018, instituirea Zilei Mondiale a Albinelor (20 mai).",
  },
  {
    src: WM_URLS.lipizzan,
    title: "Calul Lipițan",
    caption:
      "Rasă cabalină originară din Lipica (Slovenia), crescută din 1580. Caii albi sunt celebri pentru spectacolele Școlii Spaniole de Călărie din Viena.",
  },
  {
    src: WM_URLS.olm,
    title: "Proteul (olm) — „pestișorul-dragon”",
    caption:
      "Proteus anguinus — amfibian orb care trăiește exclusiv în peșterile carstice (ex. Postojna). Trăiește peste 100 de ani și poate sta nemâncat 10 ani.",
  },
  {
    src: WM_URLS.flute,
    title: "Flautul de la Divje Babe",
    caption:
      "Os de urs cu găuri, vechi de ~60.000 de ani — considerat cel mai vechi instrument muzical din lume. Descoperit într-o peșteră din vestul Sloveniei.",
  },
];

const FREISING: ImgItem = {
  src: WM_URLS.freising,
  title: "Manuscrisele de la Freising (sec. X–XI)",
  caption:
    "Cel mai vechi text scris în limba slovenă (și unul dintre cele mai vechi texte slave cu litere latine). Păstrat în biblioteca din München.",
};

const PHRASES: Array<{ sl: string; ro: string; ipa?: string }> = [
  { sl: "Zdravo", ro: "Bună!", ipa: "[zdrávo]" },
  { sl: "Dober dan", ro: "Bună ziua", ipa: "[dóber dán]" },
  { sl: "Hvala", ro: "Mulțumesc", ipa: "[hvála]" },
  { sl: "Prosim", ro: "Te rog / Cu plăcere", ipa: "[prósim]" },
  { sl: "Nasvidenje", ro: "La revedere", ipa: "[nasvídenje]" },
  { sl: "Da / Ne", ro: "Da / Nu" },
  { sl: "Kako se imenuješ?", ro: "Cum te cheamă?" },
  { sl: "Sem iz Romunije", ro: "Sunt din România" },
];

// ---------- Canvas composition ----------

const SLUG = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Fetch the bytes via fetch() (separate cache slot from <img>), then decode
// from a same-origin Blob URL — guarantees the canvas is never tainted, even
// if the rendered <img> happened to use a non-CORS cached entry.
async function loadImg(src: string): Promise<HTMLImageElement> {
  const res = await fetch(src, { mode: "cors", credentials: "omit" });
  if (!res.ok) throw new Error(`Fetch failed (${res.status}) pentru ${src}`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Decodare eșuată pentru ${src}`));
      img.src = objectUrl;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
  }
}

// Wraps text into lines that fit `maxWidth`. Returns the lines.
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
): number {
  for (const ln of lines) {
    ctx.fillText(ln, x, y);
    y += lineHeight;
  }
  return y;
}

function triggerDownload(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    "image/jpeg",
    0.92,
  );
}

// Composes a single A4-portrait JPG: image on top, white panel with title + caption below.
async function downloadCardAsJpg(item: ImgItem) {
  const img = await loadImg(item.src);

  // A4 @ ~150dpi → 1240×1754
  const W = 1240;
  const H = 1754;
  const PAD = 70;
  const IMG_AREA_H = 1100;
  const IMG_BG = item.bg ?? "#f3f3f3";

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Image area background (for letterbox edges)
  ctx.fillStyle = IMG_BG;
  ctx.fillRect(0, 0, W, IMG_AREA_H);

  // Letterbox-fit the photo
  const fit = item.fit ?? "contain";
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;
  let dw: number, dh: number, dx: number, dy: number;
  if (fit === "cover") {
    const ratio = Math.max(W / sw, IMG_AREA_H / sh);
    dw = sw * ratio;
    dh = sh * ratio;
    dx = (W - dw) / 2;
    dy = (IMG_AREA_H - dh) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, IMG_AREA_H);
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  } else {
    const ratio = Math.min(W / sw, IMG_AREA_H / sh);
    dw = sw * ratio;
    dh = sh * ratio;
    dx = (W - dw) / 2;
    dy = (IMG_AREA_H - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  // Divider line
  ctx.strokeStyle = "#d4d4d4";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, IMG_AREA_H);
  ctx.lineTo(W - PAD, IMG_AREA_H);
  ctx.stroke();

  // Title
  ctx.fillStyle = "#0f172a";
  ctx.textBaseline = "top";
  ctx.font = "bold 56px -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
  const titleLines = wrapLines(ctx, item.title, W - 2 * PAD);
  let y = IMG_AREA_H + 60;
  y = drawLines(ctx, titleLines, PAD, y, 68);

  // Caption
  y += 22;
  ctx.fillStyle = "#334155";
  ctx.font = "34px -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
  const captionLines = wrapLines(ctx, item.caption, W - 2 * PAD);
  drawLines(ctx, captionLines, PAD, y, 46);

  // Footer
  ctx.fillStyle = "#94a3b8";
  ctx.font = "italic 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
  ctx.fillText("Ziua Europei 2026 · Slovenia", PAD, H - 50);

  triggerDownload(canvas, `slovenia-${SLUG(item.title)}.jpg`);
}

// Composes the "Cuvinte de bază" phrases card as a single JPG (no photo, just typography).
async function downloadPhrasesAsJpg() {
  const W = 1240;
  const H = 1754;
  const PAD = 90;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background — soft gradient strip on the left for visual interest
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Slovenian flag stripe down the left edge as decor
  const stripeW = 36;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, stripeW, H / 3);
  ctx.fillStyle = "#0b4ea2";
  ctx.fillRect(0, H / 3, stripeW, H / 3);
  ctx.fillStyle = "#c8102e";
  ctx.fillRect(0, (2 * H) / 3, stripeW, H / 3);

  // Title
  ctx.fillStyle = "#0f172a";
  ctx.textBaseline = "top";
  ctx.font = "bold 64px -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
  ctx.fillText("Cuvinte de bază în slovenă", PAD, 110);

  ctx.fillStyle = "#475569";
  ctx.font = "italic 28px -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
  ctx.fillText("De memorat pentru prezentare — repetați cu pronunția", PAD, 200);

  // Phrases
  let y = 290;
  for (const p of PHRASES) {
    ctx.fillStyle = "#0b4ea2";
    ctx.font = "bold 44px -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(p.sl, PAD, y);

    ctx.fillStyle = "#0f172a";
    ctx.font = "32px -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(`→  ${p.ro}`, PAD + 360, y + 8);

    if (p.ipa) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "italic 26px -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(p.ipa, PAD + 760, y + 12);
    }
    y += 80;
  }

  // Footer
  ctx.fillStyle = "#94a3b8";
  ctx.font = "italic 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
  ctx.fillText("Ziua Europei 2026 · Slovenia", PAD, H - 60);

  triggerDownload(canvas, "slovenia-cuvinte-de-baza.jpg");
}

// ---------- UI ----------

function GalleryImage({ item }: { item: ImgItem }) {
  const fit = item.fit ?? "cover";
  return (
    <Box
      style={{
        width: "100%",
        height: 240,
        borderRadius: "var(--radius-3)",
        overflow: "hidden",
        background: item.bg ?? "var(--gray-3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src={item.src}
        alt={item.title}
        loading="lazy"
        crossOrigin="anonymous"
        style={{
          width: "100%",
          height: "100%",
          objectFit: fit,
          display: "block",
        }}
      />
    </Box>
  );
}

function DownloadIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function GalleryCard({ item }: { item: ImgItem }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onDownload = async () => {
    setBusy(true);
    setErr(null);
    try {
      await downloadCardAsJpg(item);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Descărcare eșuată");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Flex direction="column" gap="2">
        <Box style={{ position: "relative" }}>
          <GalleryImage item={item} />
          <Box style={{ position: "absolute", top: 8, right: 8 }}>
            <IconButton
              size="2"
              variant="solid"
              color="gray"
              highContrast
              onClick={onDownload}
              disabled={busy}
              aria-label={`Descarcă „${item.title}” ca JPG`}
              title="Descarcă ca JPG (imagine + text)"
            >
              <DownloadIcon size={16} />
            </IconButton>
          </Box>
        </Box>
        <Text size="3" weight="bold" as="div">
          {item.title}
        </Text>
        <Text size="2" color="gray" as="p">
          {item.caption}
        </Text>
        {err && (
          <Text size="1" color="red">
            {err}
          </Text>
        )}
      </Flex>
    </Card>
  );
}

function PhrasesCard() {
  const [busy, setBusy] = useState(false);
  const onDownload = async () => {
    setBusy(true);
    try {
      await downloadPhrasesAsJpg();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Flex justify="between" align="start" gap="2" mb="2">
        <Heading size="4">Cuvinte de bază</Heading>
        <IconButton
          size="2"
          variant="solid"
          color="gray"
          highContrast
          onClick={onDownload}
          disabled={busy}
          aria-label="Descarcă „Cuvinte de bază” ca JPG"
          title="Descarcă ca JPG"
        >
          <DownloadIcon size={16} />
        </IconButton>
      </Flex>
      <Text size="1" color="gray" mb="3" as="p">
        De memorat pentru prezentare — repetați cu pronunția:
      </Text>
      <Flex direction="column" gap="2">
        {PHRASES.map((p) => (
          <Flex key={p.sl} align="baseline" gap="2" wrap="wrap">
            <Text size="3" weight="bold" style={{ minWidth: 140 }}>
              {p.sl}
            </Text>
            <Text size="2" color="gray">
              {p.ro}
            </Text>
            {p.ipa && (
              <Text size="1" color="gray" style={{ fontStyle: "italic" }}>
                {p.ipa}
              </Text>
            )}
          </Flex>
        ))}
      </Flex>
    </Card>
  );
}

export default function SloveniaImagesPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "bogdan";

  return (
    <Container size="3" py="8" className="cw-container">
      {/* Breadcrumb */}
      <Flex align="center" gap="2" mb="4">
        <RadixLink asChild color="gray" size="2">
          <NextLink href={`/coursework/${slug}/slovenia`}>
            <Flex align="center" gap="1">
              <ArrowLeftIcon /> Slovenia
            </Flex>
          </NextLink>
        </RadixLink>
      </Flex>

      {/* Header */}
      <Heading size="8" mb="2">
        Galerie imagini — Slovenia
      </Heading>
      <Text color="gray" size="3" mb="2" as="p">
        Imagini de referință de înaltă calitate pentru standul Slovenia: steag,
        simboluri și limbă.
      </Text>
      <Text color="gray" size="2" mb="6" as="p">
        Apăsați butonul ⬇ de pe fiecare card pentru a descărca un singur fișier
        JPG (format A4, ~1240×1754 px) care conține atât imaginea, cât și textul
        cu titlul și descrierea — gata de tipărit.
      </Text>

      {/* Steag și stemă */}
      <Heading size="5" mb="3" mt="2">
        Steag și stemă
      </Heading>
      <Box
        mb="6"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "var(--space-4)",
        }}
      >
        {FLAG_IMAGES.map((item) => (
          <GalleryCard key={item.src} item={item} />
        ))}
      </Box>

      <Separator size="4" my="5" />

      {/* Simboluri */}
      <Heading size="5" mb="3">
        Simboluri
      </Heading>
      <Text color="gray" size="2" mb="4" as="p">
        Cele mai recunoscute simboluri ale Sloveniei. Alegeți 1–2 ca element
        central al standului (recomandare: dragonul + Triglav).
      </Text>
      <Box
        mb="6"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "var(--space-4)",
        }}
      >
        {SYMBOLS.map((item) => (
          <GalleryCard key={item.src} item={item} />
        ))}
      </Box>

      <Separator size="4" my="5" />

      {/* Limba */}
      <Heading size="5" mb="3">
        Limba slovenă
      </Heading>
      <Text color="gray" size="2" mb="4" as="p">
        Slovena este o limbă slavă de sud, cu o particularitate rară: are{" "}
        <strong>formă duală</strong> (pentru exact 2 persoane sau obiecte), pe
        lângă singular și plural. Alfabetul are <strong>25 de litere</strong>:
        a, b, c, č, d, e, f, g, h, i, j, k, l, m, n, o, p, r, s, š, t, u, v, z,
        ž (lipsesc q, w, x, y; apar în plus č, š, ž).
      </Text>

      <Box
        mb="5"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "var(--space-4)",
        }}
      >
        <GalleryCard item={FREISING} />
        <PhrasesCard />
      </Box>

      <Separator size="4" my="5" />

      {/* Credit */}
      <Text size="1" color="gray" as="p">
        Imagini: Wikimedia Commons (licență Creative Commons / domeniu public).
        Format JPG / PNG, servite de pe upload.wikimedia.org.
      </Text>
    </Container>
  );
}
