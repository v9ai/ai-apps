"use client";

import { useMemo, useState } from "react";
import { css } from "styled-system/css";
import {
  DEVICE_IMG_MAP,
  hubColor,
  hubDisplayName,
  ParsedScript,
} from "@/lib/parser";
import { LessonMarkdown } from "@/lib/render-lesson-markdown";
import { CodeViewer } from "@/components/code-viewer";
import { HubDeployPanel } from "@/components/hub-deploy-panel";
import {
  HubPicker,
  detectActiveHub,
  setActiveHub,
  type HubChoice,
} from "@/components/hub-picker";
import { useLanguage } from "@/lib/language";

export function ExampleLessonView({
  script,
  slug,
}: {
  script: ParsedScript;
  slug: string;
}) {
  const { language } = useLanguage();
  const isRo = language === "ro" && script.lessonRo !== null;
  const t = isRo
    ? {
        scripts: "Scripturi",
        devices: "Dispozitive",
        port: "Portul",
        remote: "Telecomandă",
        deviceSingular: "dispozitiv",
        devicePlural: "dispozitive",
        basedOn: "Bazat pe lecția LEGO® Education",
        chooseHub: "Alege hub-ul tău",
      }
    : {
        scripts: "Scripts",
        devices: "Devices",
        port: "Port",
        remote: "Remote",
        deviceSingular: "device",
        devicePlural: "devices",
        basedOn: "Based on the LEGO® Education lesson",
        chooseHub: "Choose your hub",
      };

  const supportsHubSwap = detectActiveHub(script.code) !== null;
  const [selectedHub, setSelectedHub] = useState<HubChoice>(
    () => detectActiveHub(script.code) ?? "EssentialHub"
  );
  const code = useMemo(
    () => (supportsHubSwap ? setActiveHub(script.code, selectedHub) : script.code),
    [script.code, selectedHub, supportsHubSwap]
  );
  const color = hubColor(script.hubType);
  const fallbackTitle = script.filename.replace(/\.py$/, "").replace(/_/g, " ");
  const title = isRo
    ? script.lessonTitleRo ?? script.lessonTitle ?? fallbackTitle
    : script.lessonTitle ?? fallbackTitle;
  const lessonBody = isRo ? script.lessonRo : script.lesson;

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
          {t.scripts}
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

      <HubDeployPanel code={code} />

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
            {script.devices.length}{" "}
            {script.devices.length === 1 ? t.deviceSingular : t.devicePlural}
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
            {t.remote}
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
            {t.devices}
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
                    {t.port} {d.port}
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

      {lessonBody && (
        <div className={css({ mb: "10" })}>
          <LessonMarkdown source={lessonBody} />
        </div>
      )}

      {supportsHubSwap && (
        <HubPicker
          value={selectedHub}
          onChange={setSelectedHub}
          label={t.chooseHub}
        />
      )}

      <div className={css({ mb: "6" })}>
        <CodeViewer code={code} filename={script.filename} />
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
          {t.basedOn}{" "}
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
            {title}
          </a>
        </p>
      )}
    </div>
  );
}
