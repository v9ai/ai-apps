"use client";

import { Flex, Heading, Text, Card, Badge, Link as RadixLink } from "@radix-ui/themes";
import { AuthGate } from "@/app/components/AuthGate";

function MexiBuilderCard() {
  return (
    <Card>
      <Flex direction="column" gap="3" p="4">
        <Flex align="center" gap="2" wrap="wrap">
          <Heading size="4">MEXI</Heading>
          <Badge color="indigo" variant="soft">
            Builder option
          </Badge>
          <Badge color="gray" variant="soft">
            LSF specialist
          </Badge>
        </Flex>
        <Text size="2" color="gray">
          Producător român specializat 100% pe Light Steel Frame, cu fabrică
          proprie în Oradea și rețea națională de parteneri (acoperă Brașov).
        </Text>

        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            De ce e o opțiune serioasă
          </Text>
          <Text size="2" color="gray">
            • 1.000+ construcții finalizate (RO, Italia seismică, Norvegia cu
            sarcini mari de zăpadă)
          </Text>
          <Text size="2" color="gray">
            • Garanție pe viață contractuală pentru fiecare construcție
          </Text>
          <Text size="2" color="gray">
            • Profile C/Z/U dublu-galvanizate, 1.5–3.5 mm, cold-formed
          </Text>
          <Text size="2" color="gray">
            • 1.100+ proiecte tipizate în catalog — operațional matur
          </Text>
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            Proiecte casă + garaj relevante
          </Text>
          <Text size="2" color="gray">
            • B III 5 — 80 m² (parter, garaj 21 m², 2 dormitoare)
          </Text>
          <Text size="2" color="gray">
            • B XII (1–5) — 149 m² cu garaj integrat (5 variante de fațadă)
          </Text>
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            Catalog complet (1.100+ proiecte)
          </Text>
          <RadixLink
            href="https://casemexi.ro/proiecte-de-casa"
            target="_blank"
            rel="noopener noreferrer"
            size="2"
          >
            casemexi.ro/proiecte-de-casa
          </RadixLink>
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            Filtrate după dimensiune
          </Text>
          <RadixLink
            href="https://casemexi.ro/case-medii"
            target="_blank"
            rel="noopener noreferrer"
            size="2"
          >
            Case medii 120–160 m²
          </RadixLink>
          <RadixLink
            href="https://casemexi.ro/case-mici"
            target="_blank"
            rel="noopener noreferrer"
            size="2"
          >
            Case mici sub 120 m²
          </RadixLink>
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            Filtrate după regim de înălțime
          </Text>
          <RadixLink
            href="https://casemexi.ro/case-parter"
            target="_blank"
            rel="noopener noreferrer"
            size="2"
          >
            Case parter
          </RadixLink>
          <RadixLink
            href="https://casemexi.ro/case-mansarda"
            target="_blank"
            rel="noopener noreferrer"
            size="2"
          >
            Case cu mansardă
          </RadixLink>
          <RadixLink
            href="https://casemexi.ro/case-etaj"
            target="_blank"
            rel="noopener noreferrer"
            size="2"
          >
            Case cu etaj
          </RadixLink>
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            Modulare tipizate (mai ieftine, mai rapide — pilot)
          </Text>
          <RadixLink
            href="https://structurausoara.ro/case-pe-sistem-modular/"
            target="_blank"
            rel="noopener noreferrer"
            size="2"
          >
            structurausoara.ro/case-pe-sistem-modular
          </RadixLink>
          <RadixLink
            href="https://structurausoara.ro/categorii/cu-garaj/"
            target="_blank"
            rel="noopener noreferrer"
            size="2"
          >
            Categoria cu garaj integrat
          </RadixLink>
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            De citit înainte să ceri oferta
          </Text>
          <RadixLink
            href="https://casemexi.ro/etape"
            target="_blank"
            rel="noopener noreferrer"
            size="2"
          >
            Etapele construcției
          </RadixLink>
          <RadixLink
            href="https://casemexi.ro/sisteme-mexi"
            target="_blank"
            rel="noopener noreferrer"
            size="2"
          >
            Sisteme constructive (profile, izolații, finisaje)
          </RadixLink>
          <RadixLink
            href="https://casemexi.ro/atestari"
            target="_blank"
            rel="noopener noreferrer"
            size="2"
          >
            Atestări și certificări
          </RadixLink>
          <RadixLink
            href="https://casemexi.ro/rezistenta-seismica"
            target="_blank"
            rel="noopener noreferrer"
            size="2"
          >
            Rezistență seismică (relevant pentru Brașov)
          </RadixLink>
          <RadixLink
            href="https://casemexi.ro/3d/"
            target="_blank"
            rel="noopener noreferrer"
            size="2"
          >
            Tur virtual 3D
          </RadixLink>
          <RadixLink
            href="https://casemexi.ro/intrebari-frecvente"
            target="_blank"
            rel="noopener noreferrer"
            size="2"
          >
            Întrebări frecvente
          </RadixLink>
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            Contact (vorbesc Ro/Hu)
          </Text>
          <Text size="2" color="gray">
            Dorel Cherecheș: +40 773 751 610
          </Text>
          <Text size="2" color="gray">
            Szilárd Palásti: +40 749 011 448
          </Text>
          <RadixLink
            href="https://www.casemexi.ro/contact"
            target="_blank"
            rel="noopener noreferrer"
            size="2"
          >
            Formular de ofertă
          </RadixLink>
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            La primul telefon spune-le
          </Text>
          <Text size="2" color="gray">
            • Locația: Brașov (zonă seismică — important pentru calculul
            structural)
          </Text>
          <Text size="2" color="gray">
            • Dimensiunea aproximativă: ~130 m²
          </Text>
          <Text size="2" color="gray">• Numărul de camere: 5</Text>
          <Text size="2" color="gray">• Bugetul orientativ (dacă-l ai)</Text>
          <Text size="2" color="gray">• Timeline-ul: când vrei să fie gata</Text>
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            Cere-le pe email
          </Text>
          <Text size="2" color="gray">
            • Catalog complet de proiecte care se potrivesc
          </Text>
          <Text size="2" color="gray">
            • Ofertă orientativă pentru 2–3 proiecte alese
          </Text>
          <Text size="2" color="gray">
            • Ce e inclus / ce e exclus în prețul afișat
          </Text>
          <Text size="2" color="gray">
            • Costul transportului Oradea–Brașov + montaj
          </Text>
          <Text size="2" color="gray">
            • Specificațiile tehnice exacte (grosime profile, tip izolație,
            tâmplărie)
          </Text>
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            De cerut în ofertă (Brașov)
          </Text>
          <Text size="2" color="gray">
            • Calcul seismic explicit pentru zona Brașov
          </Text>
          <Text size="2" color="gray">
            • Grosime profile ≥ 2.0 mm pe elemente portante, zincare Z275 min
          </Text>
          <Text size="2" color="gray">
            • Document de garanție în scris (text exact, nu doar nr. de ani)
          </Text>
          <Text size="2" color="gray">
            • Ofertă la cheie cu transport Oradea → Brașov inclus
          </Text>
        </Flex>
      </Flex>
    </Card>
  );
}

function HouseContent() {
  return (
    <Flex direction="column" gap="4" p="4">
      <Heading size="6">House</Heading>
      <MexiBuilderCard />
    </Flex>
  );
}

export default function HousePage() {
  return (
    <AuthGate pageName="House" description="Sign in to view the household.">
      <HouseContent />
    </AuthGate>
  );
}
