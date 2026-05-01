import { css } from "styled-system/css";

const R2_BASE = "https://pub-deeee24180f2416990a1afb44a5c8b6d.r2.dev/building_instructions";

interface Instruction {
  title: string;
  file: string;
  source: string;
  directHref?: string; // when set, link straight here instead of R2
}

const INSTRUCTIONS: Instruction[] = [
  {
    title: "BuWizz Upgraded — Audi RS Q e-tron (42160)",
    file: "BuWizz_upgraded_42160_Audi_RS_Q_e-tron.pdf",
    source: "https://buwizz.com/building_instructions/BuWizz_upgraded_42160_Audi_RS_Q_e-tron.pdf",
  },
  {
    title: "LEGO Official — Set 6499548",
    file: "6499548.pdf",
    source: "https://www.lego.com/cdn/product-assets/product.bi.core.pdf/6499548.pdf",
  },
];

export default function BuildingInstructionsPage() {
  return (
    <main
      className={css({
        mx: "auto",
        maxW: "4xl",
        px: "4",
        py: "12",
      })}
    >
      <h1
        className={css({
          fontFamily: "display",
          fontWeight: "900",
          fontSize: "3xl",
          letterSpacing: "-0.02em",
          color: "ink.primary",
          mb: "2",
        })}
      >
        Building Instructions
      </h1>
      <p
        className={css({
          fontFamily: "display",
          color: "ink.secondary",
          fontSize: "sm",
          mb: "8",
        })}
      >
        PDF building guides for upgraded LEGO Technic sets and motorized MOCs.
      </p>

      <ul
        className={css({
          display: "flex",
          flexDirection: "column",
          gap: "3",
          listStyle: "none",
          p: 0,
        })}
      >
        {INSTRUCTIONS.map(({ title, file, source, directHref }) => {
          const href = directHref ?? `${R2_BASE}/${file}`;
          return (
            <li key={file}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={css({
                  display: "block",
                  textDecoration: "none",
                  bg: "plate.surface",
                  border: "1px solid",
                  borderColor: "plate.border",
                  rounded: "brick",
                  px: "5",
                  py: "4",
                  boxShadow:
                    "0 1px 0 rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)",
                  transition: "all 0.15s ease",
                  _hover: {
                    bg: "plate.raised",
                    borderColor: "plate.borderHover",
                    transform: "translateY(-1px)",
                  },
                })}
              >
                <div
                  className={css({
                    fontFamily: "display",
                    fontWeight: "800",
                    fontSize: "md",
                    color: "ink.primary",
                    mb: "1",
                  })}
                >
                  {title}
                </div>
                <div
                  className={css({
                    fontFamily: "mono",
                    fontSize: "xs",
                    color: "ink.faint",
                  })}
                >
                  {file} · source: {new URL(source).hostname}
                </div>
              </a>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
