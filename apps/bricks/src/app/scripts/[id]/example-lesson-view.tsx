import { css } from "styled-system/css";
import {
  DEVICE_IMG_MAP,
  hubColor,
  hubDisplayName,
  ParsedScript,
} from "@/lib/parser";
import { LessonMarkdown } from "@/lib/render-lesson-markdown";
import { CodeViewer } from "@/components/code-viewer";

export function ExampleLessonView({
  script,
  slug,
}: {
  script: ParsedScript;
  slug: string;
}) {
  const color = hubColor(script.hubType);
  const title =
    script.lessonTitle ?? script.filename.replace(/\.py$/, "").replace(/_/g, " ");

  return (
    <div
      className={css({
        maxW: "6xl",
        mx: "auto",
        px: "5",
        py: "10",
      })}
    >
      <div
        className={css({
          display: "flex",
          alignItems: "center",
          gap: "3",
          mb: "2",
        })}
      >
        <a
          href="/scripts"
          className={css({
            fontSize: "sm",
            color: "ink.faint",
            textDecoration: "none",
            _hover: { color: "ink.secondary" },
          })}
        >
          Scripts
        </a>
        <span className={css({ color: "ink.faint", fontSize: "sm" })}>/</span>
        <span
          className={css({
            fontSize: "sm",
            color: "ink.secondary",
            fontWeight: "600",
          })}
        >
          {slug}
        </span>
      </div>

      <h1
        className={css({
          fontSize: "3xl",
          fontWeight: "900",
          fontFamily: "display",
          color: "ink.primary",
          letterSpacing: "-0.02em",
          mb: "4",
        })}
      >
        {title}
      </h1>

      {script.heroImage && (
        <div
          className={css({
            mb: "8",
            rounded: "brick",
            overflow: "hidden",
            border: "1.5px solid",
            borderColor: "plate.border",
            bg: "plate.surface",
          })}
        >
          <img
            src={script.heroImage}
            alt={title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className={css({
              w: "100%",
              h: "auto",
              display: "block",
            })}
          />
        </div>
      )}

      <div
        className={css({
          display: "flex",
          gap: "2",
          mb: "6",
          flexWrap: "wrap",
          alignItems: "center",
        })}
      >
        <span
          className={css({
            fontSize: "xs",
            fontWeight: "700",
            fontFamily: "display",
            px: "3",
            py: "1.5",
            rounded: "full",
            border: "1.5px solid",
          })}
          style={{
            backgroundColor: color + "15",
            borderColor: color + "50",
            color,
          }}
        >
          {hubDisplayName(script.hubType)}
        </span>
        {script.devices.length > 0 && (
          <span
            className={css({
              fontSize: "xs",
              fontWeight: "600",
              px: "2.5",
              py: "1",
              rounded: "full",
              bg: "rgba(254, 138, 24, 0.1)",
              color: "lego.orange",
              border: "1px solid rgba(254, 138, 24, 0.25)",
            })}
          >
            {script.devices.length} device
            {script.devices.length !== 1 && "s"}
          </span>
        )}
        {script.hasRemote && (
          <span
            className={css({
              fontSize: "xs",
              fontWeight: "600",
              px: "2.5",
              py: "1",
              rounded: "full",
              bg: "rgba(167, 139, 250, 0.1)",
              color: "#a78bfa",
              border: "1px solid rgba(167, 139, 250, 0.2)",
            })}
          >
            Remote
          </span>
        )}
      </div>

      {script.devices.length > 0 && (
        <div className={css({ mb: "8" })}>
          <h2
            className={css({
              fontSize: "sm",
              fontWeight: "700",
              fontFamily: "display",
              color: "ink.muted",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              mb: "3",
            })}
          >
            Devices
          </h2>
          <div
            className={css({
              display: "flex",
              gap: "3",
              flexWrap: "wrap",
            })}
          >
            {script.devices.map((d, i) => (
              <div
                key={i}
                className={css({
                  display: "flex",
                  alignItems: "center",
                  gap: "3",
                  p: "3",
                  rounded: "brick",
                  bg: "plate.surface",
                  border: "1.5px solid",
                })}
                style={{ borderColor: color + "30" }}
              >
                {DEVICE_IMG_MAP[d.deviceType] && (
                  <img
                    src={DEVICE_IMG_MAP[d.deviceType]}
                    alt={d.deviceType}
                    className={css({
                      w: "10",
                      h: "10",
                      objectFit: "contain",
                    })}
                  />
                )}
                <div>
                  <span
                    className={css({
                      fontSize: "sm",
                      fontWeight: "700",
                      fontFamily: "display",
                      color: "ink.primary",
                      display: "block",
                    })}
                  >
                    Port {d.port}
                  </span>
                  <span className={css({ fontSize: "xs", color: "ink.muted" })}>
                    {d.deviceType}
                  </span>
                  <span
                    className={css({
                      fontSize: "xs",
                      color: "ink.faint",
                      fontFamily: "mono, monospace",
                      ml: "2",
                    })}
                  >
                    {d.varName}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {script.lesson && (
        <div className={css({ mb: "10" })}>
          <LessonMarkdown source={script.lesson} />
        </div>
      )}

      <div className={css({ mb: "6" })}>
        <CodeViewer code={script.code} filename={script.filename} />
      </div>

      {script.lessonSourceUrl && (
        <p
          className={css({
            fontSize: "sm",
            color: "ink.faint",
            textAlign: "center",
            mt: "8",
          })}
        >
          Based on the LEGO® Education lesson{" "}
          <a
            href={script.lessonSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={css({
              color: "lego.orange",
              textDecoration: "underline",
              _hover: { color: "#FF9F33" },
            })}
          >
            {script.lessonTitle ?? title}
          </a>
        </p>
      )}
    </div>
  );
}
