"use client";

import {
  Container,
  Heading,
  Text,
  Box,
  Card,
  Flex,
  Separator,
  Link as RadixLink,
} from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import NextLink from "next/link";
import { useParams } from "next/navigation";

const wm = (filename: string, width = 800) => {
  if (!/\.(jpe?g|png)$/i.test(filename)) {
    throw new Error(`Only JPG/PNG sources allowed, got: ${filename}`);
  }
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=${width}`;
};

type ImgItem = {
  src: string;
  title: string;
  caption: string;
  fit?: "cover" | "contain";
  bg?: string;
};

const FLAG_IMAGES: ImgItem[] = [
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Flag_of_Slovenia.svg/1200px-Flag_of_Slovenia.svg.png",
    title: "Steagul Sloveniei",
    caption:
      "Trei dungi orizontale: alb, albastru, roșu. Pe partea stângă-sus apare stema cu Triglav, două linii ondulate (râurile/marea) și 3 stele aurii.",
    fit: "contain",
    bg: "#ffffff",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Coat_of_arms_of_Slovenia.svg/800px-Coat_of_arms_of_Slovenia.svg.png",
    title: "Stema Sloveniei",
    caption:
      "Vârful Triglav (alb) pe fond albastru, două linii ondulate (Marea Adriatică / râurile) și 3 stele aurii (preluate de la conții de Celje).",
    fit: "contain",
    bg: "#ffffff",
  },
];

const SYMBOLS: ImgItem[] = [
  {
    src: wm("Dragon_on_Dragon_Bridge_(cropped).jpg"),
    title: "Dragonul Ljubljanei",
    caption:
      "Statuile de pe Podul Dragonilor (Zmajski most). Dragonul este simbolul orașului Ljubljana — apare pe stemă și pe steagul orașului.",
  },
  {
    src: wm("Triglav.jpg"),
    title: "Muntele Triglav (2.864 m)",
    caption:
      "Cel mai înalt munte din Slovenia, cu 3 vârfuri caracteristice. Apare pe stemă, pe bancnote, pe moneda de 50 cenți și pe tricoul echipei naționale de fotbal.",
  },
  {
    src: wm("Bled_island.jpg"),
    title: "Lacul Bled",
    caption:
      "Insula cu bisericuța (Cerkev Marijinega vnebovzetja) în mijlocul lacului — cea mai fotografiată imagine a Sloveniei.",
  },
  {
    src: wm("Höhlenburg_Predjama_in_Slovenien.jpg"),
    title: "Castelul Predjama",
    caption:
      "Castel construit într-o peșteră, sub o stâncă de 123 m. Cel mai mare castel-peșteră din lume (Cartea Recordurilor).",
  },
  {
    src: wm("Licitars2.jpg"),
    title: "Licitarsko srce",
    caption:
      "Inima roșie din turtă dulce decorată — simbol tradițional sloven și croat, oferită ca semn de prietenie sau dragoste.",
  },
  {
    src: wm("Apis_mellifera_carnica_worker_hive_entrance_3.jpg"),
    title: "Albina carniolică",
    caption:
      "Apis mellifera carnica — rasa autohtonă de albine. Slovenia a propus, în 2018, instituirea Zilei Mondiale a Albinelor (20 mai).",
  },
  {
    src: wm("Lipica.jpg"),
    title: "Calul Lipițan",
    caption:
      "Rasă cabalină originară din Lipica (Slovenia), crescută din 1580. Caii albi sunt celebri pentru spectacolele Școlii Spaniole de Călărie din Viena.",
  },
  {
    src: wm("Proteus_anguinus_Postojnska_Jama_Slovenija.jpg"),
    title: "Proteul (olm) — „pestișorul-dragon”",
    caption:
      "Proteus anguinus — amfibian orb care trăiește exclusiv în peșterile carstice (ex. Postojna). Trăiește peste 100 de ani și poate sta nemâncat 10 ani.",
  },
  {
    src: wm("Divje_Babe_flute_(Late_Pleistocene_flute).jpg"),
    title: "Flautul de la Divje Babe",
    caption:
      "Os de urs cu găuri, vechi de ~60.000 de ani — considerat cel mai vechi instrument muzical din lume. Descoperit într-o peșteră din vestul Sloveniei.",
  },
];

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

function GalleryCard({ item }: { item: ImgItem }) {
  return (
    <Card>
      <Flex direction="column" gap="2">
        <GalleryImage item={item} />
        <Text size="3" weight="bold" as="div">
          {item.title}
        </Text>
        <Text size="2" color="gray" as="p">
          {item.caption}
        </Text>
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
      <Text color="gray" size="3" mb="6" as="p">
        Imagini de referință de înaltă calitate pentru standul Slovenia: steag,
        simboluri și limbă. Folosiți pentru afiș, decor 3D și prezentare.
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
        <GalleryCard
          item={{
            src: wm("Freising_manuscript.jpg"),
            title: "Manuscrisele de la Freising (sec. X–XI)",
            caption:
              "Cel mai vechi text scris în limba slovenă (și unul dintre cele mai vechi texte slave cu litere latine). Păstrat în biblioteca din München.",
          }}
        />
        <Card>
          <Heading size="4" mb="2">
            Cuvinte de bază
          </Heading>
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
