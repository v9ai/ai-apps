import { css } from "../../styled-system/css";
import { resumeData } from "@ai-apps/resume";

const stackAlignment = [
  {
    zoe: "Python · FastAPI · Django",
    mine: "Python pipelines, FastAPI services across 5 AI projects, LangGraph orchestration",
    color: "zoe.purple",
    bg: "zoe.purpleLight",
  },
  {
    zoe: "React Native",
    mine: "12+ years React (hooks, server components, streaming), React Native adjacent — component architecture transfers directly",
    color: "zoe.coral",
    bg: "zoe.coralLight",
  },
  {
    zoe: "Kotlin · Spring Boot",
    mine: "Go microservices with gRPC + GraphQL at Vitrifi (3.5 yrs) — same JVM-adjacent server patterns, eager to pick up Kotlin",
    color: "zoe.green",
    bg: "zoe.greenLight",
  },
  {
    zoe: "GCP · Kubernetes · Terraform",
    mine: "AWS + Cloudflare production infra, Docker/CI-CD pipelines, Vercel serverless — cloud-native mindset, GCP ramp-up is fast",
    color: "zoe.purple",
    bg: "zoe.purpleLight",
  },
  {
    zoe: "Microservices at scale",
    mine: "Architected micro-frontend portal with Go microservices, gRPC, OpenAPI — led API migration REST → GraphQL across teams",
    color: "zoe.coral",
    bg: "zoe.coralLight",
  },
  {
    zoe: "AI-augmented development",
    mine: "5 production AI apps: agentic pipelines, RAG search, MLX inference (4,618 emb/sec), eval-driven development, LLM orchestration",
    color: "zoe.green",
    bg: "zoe.greenLight",
  },
];

const highlights = [
  {
    label: "End-to-end ownership",
    text: "Every AI project in my portfolio — from schema design to deployment — was shipped solo. I own the full stack, not just a layer.",
  },
  {
    label: "Ship fast, iterate",
    text: "I deploy multiple times daily across 5 production apps. Feature flags, short feedback loops, trunk-based development.",
  },
  {
    label: "Pragmatic, not precious",
    text: "Three similar lines of code beat a premature abstraction. I optimize for user experience and team velocity, not architectural purity.",
  },
  {
    label: "Science-driven product",
    text: "Built Agentic Healthcare (biomarker trajectories, clinical risk classification) and ResearchThera (clinical research ingestion from 7 sources). Health/science domains are where I thrive.",
  },
];

export default function Page() {
  const basics = resumeData.basics;
  const aiProjects = resumeData.activities.aiProjects;
  const relevantProjects = aiProjects.filter((p) =>
    ["Agentic Healthcare", "ResearchThera.com", "Knowledge", "Agentic Lead Gen"].includes(p.name)
  );

  return (
    <main
      className={css({
        maxWidth: "860px",
        mx: "auto",
        px: "24px",
        py: "64px",
      })}
    >
      {/* Header */}
      <header className={css({ mb: "56px" })}>
        <p
          className={css({
            fontSize: "label",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "zoe.purple",
            mb: "12px",
          })}
        >
          Application
        </p>
        <h1
          className={css({
            fontFamily: "display",
            fontSize: "hero",
            fontWeight: 700,
            lineHeight: 1.1,
            color: "text.primary",
            mb: "16px",
          })}
        >
          Senior Full Stack Engineer
        </h1>
        <p
          className={css({
            fontSize: "h2",
            color: "text.secondary",
            lineHeight: 1.5,
          })}
        >
          {basics.name} · {basics.profiles.find((p) => p.network === "github")?.url}
        </p>
        <div
          className={css({
            display: "flex",
            gap: "16px",
            mt: "20px",
            flexWrap: "wrap",
          })}
        >
          <a
            href={`mailto:${basics.email}`}
            className={css({
              fontSize: "small",
              color: "zoe.purple",
              textDecoration: "none",
              _hover: { textDecoration: "underline" },
            })}
          >
            {basics.email}
          </a>
          <a
            href={basics.profiles.find((p) => p.network === "linkedin")?.url}
            className={css({
              fontSize: "small",
              color: "zoe.purple",
              textDecoration: "none",
              _hover: { textDecoration: "underline" },
            })}
          >
            LinkedIn
          </a>
          <a
            href={basics.profiles.find((p) => p.network === "github")?.url}
            className={css({
              fontSize: "small",
              color: "zoe.purple",
              textDecoration: "none",
              _hover: { textDecoration: "underline" },
            })}
          >
            GitHub
          </a>
          <a
            href="https://jobs.ashbyhq.com/zoe/daedebb4-ce18-4bb5-b413-4ef69b58a3d2"
            className={css({
              fontSize: "small",
              color: "text.muted",
              textDecoration: "none",
              _hover: { textDecoration: "underline" },
            })}
          >
            Job posting ↗
          </a>
        </div>
      </header>

      {/* Why ZOE */}
      <section className={css({ mb: "56px" })}>
        <h2
          className={css({
            fontFamily: "display",
            fontSize: "h1",
            fontWeight: 600,
            color: "text.primary",
            mb: "20px",
          })}
        >
          Why ZOE
        </h2>
        <div
          className={css({
            fontSize: "body",
            color: "text.secondary",
            lineHeight: 1.8,
            "& p": { mb: "16px" },
          })}
        >
          <p>
            I&apos;ve spent the past two years building AI-powered health and science products — clinical
            biomarker analysis, research ingestion pipelines, knowledge graphs with Bayesian mastery
            tracing. ZOE&apos;s mission to transform health through personalized nutrition is the exact
            intersection of science and product engineering where I do my best work.
          </p>
          <p>
            What draws me most is ZOE&apos;s &ldquo;product-first engineer&rdquo; framing. I&apos;m
            allergic to over-engineering. I&apos;d rather ship a pragmatic solution that users love
            today than architect a perfect system nobody uses. My five production AI apps were all built
            with this philosophy: optimize for the user, deploy constantly, iterate on real feedback.
          </p>
        </div>
      </section>

      {/* Why me — highlights */}
      <section className={css({ mb: "56px" })}>
        <h2
          className={css({
            fontFamily: "display",
            fontSize: "h1",
            fontWeight: 600,
            color: "text.primary",
            mb: "24px",
          })}
        >
          Why me
        </h2>
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "16px",
            md: { gridTemplateColumns: "1fr 1fr" },
          })}
        >
          {highlights.map((h) => (
            <div
              key={h.label}
              className={css({
                bg: "zoe.surface",
                border: "1px solid",
                borderColor: "zoe.border",
                borderRadius: "card",
                p: "24px",
                shadow: "card",
              })}
            >
              <h3
                className={css({
                  fontSize: "h3",
                  fontWeight: 600,
                  color: "text.primary",
                  mb: "8px",
                })}
              >
                {h.label}
              </h3>
              <p className={css({ fontSize: "small", color: "text.secondary", lineHeight: 1.7 })}>
                {h.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Stack alignment */}
      <section className={css({ mb: "56px" })}>
        <h2
          className={css({
            fontFamily: "display",
            fontSize: "h1",
            fontWeight: 600,
            color: "text.primary",
            mb: "24px",
          })}
        >
          Technical alignment
        </h2>
        <div className={css({ display: "flex", flexDirection: "column", gap: "12px" })}>
          {stackAlignment.map((s) => (
            <div
              key={s.zoe}
              className={css({
                display: "grid",
                gridTemplateColumns: "180px 1fr",
                gap: "16px",
                alignItems: "baseline",
                py: "12px",
                borderBottom: "1px solid",
                borderColor: "zoe.border",
                sm: { gridTemplateColumns: "200px 1fr" },
              })}
            >
              <span
                className={css({
                  fontSize: "small",
                  fontWeight: 600,
                  color: "text.primary",
                })}
              >
                {s.zoe}
              </span>
              <span className={css({ fontSize: "small", color: "text.secondary", lineHeight: 1.6 })}>
                {s.mine}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Relevant projects */}
      <section className={css({ mb: "56px" })}>
        <h2
          className={css({
            fontFamily: "display",
            fontSize: "h1",
            fontWeight: 600,
            color: "text.primary",
            mb: "24px",
          })}
        >
          Relevant projects
        </h2>
        <div className={css({ display: "flex", flexDirection: "column", gap: "20px" })}>
          {relevantProjects.map((p) => (
            <div
              key={p.id}
              className={css({
                bg: "zoe.surface",
                border: "1px solid",
                borderColor: "zoe.border",
                borderRadius: "card",
                p: "24px",
                shadow: "card",
              })}
            >
              <div
                className={css({
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  mb: "8px",
                  flexWrap: "wrap",
                  gap: "8px",
                })}
              >
                <h3 className={css({ fontSize: "h3", fontWeight: 600, color: "text.primary" })}>
                  {p.name}
                </h3>
                <div className={css({ display: "flex", gap: "12px" })}>
                  {p.websiteUrl && (
                    <a
                      href={p.websiteUrl}
                      className={css({
                        fontSize: "label",
                        color: "zoe.purple",
                        textDecoration: "none",
                        _hover: { textDecoration: "underline" },
                      })}
                    >
                      Live ↗
                    </a>
                  )}
                  {p.githubUrl && (
                    <a
                      href={p.githubUrl}
                      className={css({
                        fontSize: "label",
                        color: "text.muted",
                        textDecoration: "none",
                        _hover: { textDecoration: "underline" },
                      })}
                    >
                      Source ↗
                    </a>
                  )}
                </div>
              </div>
              <p className={css({ fontSize: "small", color: "text.secondary", mb: "12px", lineHeight: 1.7 })}>
                {p.description}
              </p>
              <ul className={css({ pl: "16px", "& li": { fontSize: "label", color: "text.muted", mb: "4px", lineHeight: 1.6 } })}>
                {p.highlights.slice(0, 3).map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Work history — condensed */}
      <section className={css({ mb: "56px" })}>
        <h2
          className={css({
            fontFamily: "display",
            fontSize: "h1",
            fontWeight: 600,
            color: "text.primary",
            mb: "24px",
          })}
        >
          Experience
        </h2>
        <div className={css({ display: "flex", flexDirection: "column", gap: "16px" })}>
          {resumeData.work.slice(0, 4).map((w) => (
            <div
              key={w.id}
              className={css({
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: "4px",
                py: "12px",
                borderBottom: "1px solid",
                borderColor: "zoe.border",
                sm: { gridTemplateColumns: "200px 1fr" },
              })}
            >
              <div>
                <p className={css({ fontSize: "small", fontWeight: 600, color: "text.primary" })}>
                  {w.name}
                </p>
                <p className={css({ fontSize: "label", color: "text.muted" })}>
                  {w.startDate} — {w.endDate} · {w.years}
                </p>
              </div>
              <p className={css({ fontSize: "small", color: "text.secondary" })}>{w.position}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Open-source */}
      {resumeData.volunteer[0] && (
        <section className={css({ mb: "56px" })}>
          <h2
            className={css({
              fontFamily: "display",
              fontSize: "h1",
              fontWeight: 600,
              color: "text.primary",
              mb: "16px",
            })}
          >
            Open source
          </h2>
          <div
            className={css({
              bg: "zoe.surfaceAlt",
              borderRadius: "card",
              p: "24px",
            })}
          >
            <h3 className={css({ fontSize: "h3", fontWeight: 600, color: "text.primary", mb: "4px" })}>
              {resumeData.volunteer[0].organization}
            </h3>
            <p className={css({ fontSize: "label", color: "text.muted", mb: "8px" })}>
              {resumeData.volunteer[0].position}
            </p>
            <p className={css({ fontSize: "small", color: "text.secondary", lineHeight: 1.7 })}>
              100+ PRs to core Rust/Python trading engine. Built production exchange adapters (dYdX, Hyperliquid)
              with REST, WebSocket, gRPC, auth, rate limiting. High-performance Rust indicators with Python parity.
            </p>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer
        className={css({
          pt: "32px",
          borderTop: "1px solid",
          borderColor: "zoe.border",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
        })}
      >
        <p className={css({ fontSize: "label", color: "text.muted" })}>
          {basics.name} · {basics.email} · {basics.phone}
        </p>
        <p className={css({ fontSize: "label", color: "text.muted" })}>
          UK &amp; EU · Remote
        </p>
      </footer>
    </main>
  );
}
