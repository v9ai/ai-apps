import { css, cx } from "styled-system/css";
import { getCategoryColor, type Category } from "@/lib/personalities";
import { PersonalityTile } from "./personality-tile";

type Props = {
  category: Category;
};

export function CategorySection({ category }: Props) {
  const gradient = getCategoryColor(category.slug);

  return (
    <section
      id={category.slug}
      className={css({ mb: { base: "16", md: "20" }, scrollMarginTop: "24" })}
    >
      <div
        className={css({ h: "1px", mb: { base: "8", md: "10" } })}
        style={{
          backgroundImage:
            "linear-gradient(to right, transparent, rgba(255,255,255,0.06), transparent)",
        }}
      />

      <div
        className={css({
          display: "flex",
          alignItems: "center",
          gap: "3",
          mb: { base: "6", md: "8" },
        })}
      >
        <div
          className={css({
            w: "3px",
            h: "5",
            rounded: "full",
            flexShrink: 0,
          })}
          style={{ background: gradient }}
        />
        <h2
          className={css({
            fontSize: { base: "lg", md: "xl" },
            fontWeight: "semibold",
            letterSpacing: "-0.01em",
            color: "#E8E8ED",
          })}
        >
          {category.title}
        </h2>
        <span
          className={css({
            fontSize: "0.6875rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontWeight: "medium",
            color: "#7B7B86",
            bg: "rgba(255,255,255,0.04)",
            px: "2.5",
            py: "1",
            rounded: "full",
            borderWidth: "1px",
            borderColor: "rgba(255,255,255,0.06)",
          })}
        >
          {category.personalities.length}
        </span>
      </div>

      <div
        className={css({
          display: "grid",
          gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
          gap: { base: "4", sm: "5", lg: "6" },
          md: { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
          lg: { gridTemplateColumns: "repeat(3, minmax(0, 1fr))" },
        })}
      >
        {category.personalities.map((p, i) => (
          <div
            key={p.slug}
            className="animate-stagger-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <PersonalityTile personality={p} accentGradient={gradient} />
          </div>
        ))}
      </div>
    </section>
  );
}
