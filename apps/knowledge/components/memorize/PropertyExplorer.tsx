"use client";

import { useState, useMemo } from "react";
import { Text, Badge, Button } from "@radix-ui/themes";
import type { CssProperty, CssCategory } from "@/lib/css-properties";
import { LiveDemo } from "./LiveDemo";
import { ProgressBar } from "./ProgressBar";

interface PropertyExplorerProps {
  categories: CssCategory[];
  mastery: Record<string, { pMastery: number; masteryLevel: string }>;
  onPractice?: (propertyId: string) => void;
}

export function PropertyExplorer({
  categories,
  mastery,
  onPractice,
}: PropertyExplorerProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allProperties = useMemo(
    () => categories.flatMap((c) => c.properties),
    [categories],
  );

  const filtered = useMemo(() => {
    let props = activeCategory
      ? allProperties.filter((p) => p.category === activeCategory)
      : allProperties;

    if (search.trim()) {
      const q = search.toLowerCase();
      props = props.filter(
        (p) =>
          p.property.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      );
    }

    return props;
  }, [allProperties, activeCategory, search]);

  return (
    <div className="explorer-container">
      <input
        className="explorer-search"
        type="text"
        placeholder="Search properties..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="explorer-tabs">
        <button
          className={`explorer-tab ${!activeCategory ? "explorer-tab--active" : ""}`}
          onClick={() => setActiveCategory(null)}
        >
          All ({allProperties.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`explorer-tab ${activeCategory === cat.id ? "explorer-tab--active" : ""}`}
            onClick={() =>
              setActiveCategory(activeCategory === cat.id ? null : cat.id)
            }
          >
            {cat.icon} {cat.name} ({cat.properties.length})
          </button>
        ))}
      </div>

      <div className="explorer-grid">
        {filtered.map((prop) => {
          const isExpanded = expandedId === prop.id;
          const m = mastery[prop.id];
          const cat = categories.find((c) => c.id === prop.category);

          return (
            <div
              key={prop.id}
              className={`explorer-card ${isExpanded ? "explorer-card--expanded" : ""}`}
              onClick={() => setExpandedId(isExpanded ? null : prop.id)}
            >
              <div className="explorer-card-header">
                <span className="explorer-card-property">{prop.property}</span>
                {cat && (
                  <Badge size="1" color={cat.color as "violet"} variant="soft">
                    {cat.icon} {cat.name}
                  </Badge>
                )}
              </div>
              <div className="explorer-card-desc">
                {prop.shortDescription}
              </div>
              {m && <ProgressBar pMastery={m.pMastery} masteryLevel={m.masteryLevel} />}

              {isExpanded && (
                <div className="explorer-card-detail">
                  <Text size="1" weight="bold" color="gray" mb="1">
                    Values:
                  </Text>
                  <ul className="explorer-card-values">
                    {prop.values.map((v) => (
                      <li key={v.value} className="explorer-card-value">
                        <code>{v.value}</code> &mdash; {v.description}
                      </li>
                    ))}
                  </ul>

                  <Text size="1" color="gray" mb="2" style={{ display: "block" }}>
                    Default: <code>{prop.defaultValue}</code> &middot;
                    Applies to: {prop.appliesTo}
                  </Text>

                  {prop.mnemonicHint && (
                    <div className="flashcard-hint" style={{ marginBottom: 12 }}>
                      {prop.mnemonicHint}
                    </div>
                  )}

                  <div className="explorer-card-demo">
                    <LiveDemo
                      html={prop.demo.html}
                      css={prop.demo.css}
                      height={140}
                    />
                  </div>

                  {onPractice && (
                    <Button
                      size="1"
                      variant="soft"
                      color="violet"
                      mt="3"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPractice(prop.id);
                      }}
                    >
                      Practice this property
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="memorize-empty">
            <Text size="2" color="gray">
              No properties match &quot;{search}&quot;
            </Text>
          </div>
        )}
      </div>
    </div>
  );
}
