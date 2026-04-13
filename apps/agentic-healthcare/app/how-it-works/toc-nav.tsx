"use client";

import { useEffect, useState } from "react";

const sections = [
  { id: "ingestion", label: "Ingestion" },
  { id: "pipeline", label: "Pipeline" },
  { id: "retrieval", label: "Retrieval" },
  { id: "safety-guard", label: "Safety Guard" },
  { id: "embedding", label: "Embedding" },
  { id: "tech-stack", label: "Tech Stack" },
  { id: "hiw-metrics", label: "Metrics" },
  { id: "hiw-foundations", label: "Foundations" },
  { id: "hiw-pipeline", label: "Stages" },
];

export function TocNav() {
  const [active, setActive] = useState("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );

    for (const { id } of sections) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <nav className="toc-nav" aria-label="Table of contents">
      <div className="toc-label">On this page</div>
      {sections.map(({ id, label }) => (
        <a
          key={id}
          href={`#${id}`}
          className={`toc-link${active === id ? " toc-active" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            document
              .getElementById(id)
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
