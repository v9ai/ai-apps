import { css, cx } from "styled-system/css";
import type { PersonResearch, EnrichedTimelineEvent, TimelineSource } from "@/lib/personalities/types";
import { ExternalLinkIcon } from "./icons";

export const SOURCE_STYLES: Record<TimelineSource, { dot: string; badge: string; label: string }> = {
  research: { dot: css({ bg: '#7B7B86' }), badge: css({ bg: 'rgba(255,255,255,0.06)', color: '#8B8B96', borderColor: 'rgba(255,255,255,0.08)' }), label: "Research" },
  github: { dot: css({ bg: '#3fb950' }), badge: css({ bg: 'rgba(35,134,54,0.15)', color: '#3fb950', borderColor: 'rgba(35,134,54,0.3)' }), label: "GitHub" },
  paper: { dot: css({ bg: '#818cf8' }), badge: css({ bg: 'rgba(99,102,241,0.15)', color: '#818cf8', borderColor: 'rgba(99,102,241,0.3)' }), label: "Paper" },
  huggingface: { dot: css({ bg: '#FFD21E' }), badge: css({ bg: 'rgba(255,210,30,0.15)', color: '#FFD21E', borderColor: 'rgba(255,210,30,0.3)' }), label: "HF" },
  web: { dot: css({ bg: '#60a5fa' }), badge: css({ bg: 'rgba(96,165,250,0.15)', color: '#60a5fa', borderColor: 'rgba(96,165,250,0.3)' }), label: "Web" },
};

export function EnrichedTimelineSection({ events }: { events: EnrichedTimelineEvent[] }) {
  if (!events.length) return null;

  const byYear: Record<string, EnrichedTimelineEvent[]> = {};
  for (const event of events) {
    const year = event.date.slice(0, 4) || "Unknown";
    (byYear[year] ??= []).push(event);
  }
  const years = Object.keys(byYear).sort((a, b) => b.localeCompare(a));

  const sourceCounts: Partial<Record<TimelineSource, number>> = {};
  for (const e of events) {
    sourceCounts[e.source] = (sourceCounts[e.source] || 0) + 1;
  }

  let globalIdx = 0;

  return (
    <div className={css({ mt: '14' })}>
      <div className={css({ display: 'flex', alignItems: 'center', gap: '4', mb: '6' })}>
        <div className={css({ w: '10', h: '10', rounded: 'full', bg: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)' })}>
          <svg viewBox="0 0 24 24" className={css({ w: '5', h: '5', color: '#7B7B86' })} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <div>
          <h2 className={css({ fontSize: 'xl', fontWeight: 'bold', color: '#E8E8ED' })}>Timeline</h2>
          <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2', mt: '1.5' })}>
            {(Object.entries(sourceCounts) as [TimelineSource, number][]).map(([source, count]) => {
              const style = SOURCE_STYLES[source];
              return (
                <span
                  key={source}
                  className={cx(css({ display: 'inline-flex', alignItems: 'center', gap: '1.5', px: '2.5', py: '0.5', rounded: 'full', fontSize: '10px', fontWeight: 'medium', borderWidth: '1px' }), style.badge)}
                >
                  <span className={cx(css({ w: '1.5', h: '1.5', rounded: 'full' }), style.dot)} />
                  {count} {style.label}
                </span>
              );
            })}
            <span className={css({ fontSize: '10px', color: '#7B7B86', ml: '1' })}>{events.length} total</span>
          </div>
        </div>
      </div>

      <div className={css({ pos: 'relative', ml: '4', borderLeftWidth: '1px', borderColor: 'rgba(255,255,255,0.08)', pl: '6', display: 'flex', flexDir: 'column', md: { ml: '7', pl: '8' } })}>
        {years.map((year) => (
          <div key={year}>
            <div className={css({ pos: 'relative', display: 'flex', alignItems: 'center', gap: '3', mb: '5', mt: '10', _first: { mt: '0' } })}>
              <div className={css({ pos: 'absolute', left: '-29px', md: { left: '-41px' }, w: '2.5', h: '2.5', rounded: 'full', bg: 'rgba(255,255,255,0.15)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.2)' })} />
              <span className={css({ fontSize: 'sm', fontWeight: 'bold', color: '#C4C4CC', letterSpacing: 'wider', textTransform: 'uppercase' })}>{year}</span>
            </div>

            <div className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>
            {byYear[year].map((event) => {
              const style = SOURCE_STYLES[event.source];
              const idx = globalIdx++;
              return (
                <div
                  key={`${event.date}-${event.source}-${idx}`}
                  className={cx(css({ pos: 'relative' }), "animate-row-enter")}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className={cx(css({ pos: 'absolute', left: '-29px', md: { left: '-41px' }, top: '2', w: '2.5', h: '2.5', rounded: 'full', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.1)' }), style.dot)} />

                  <div className={css({ display: 'flex', alignItems: 'center', gap: '3', mb: '1.5' })}>
                    <span className={css({ fontSize: 'xs', color: '#7B7B86', fontFamily: 'mono' })}>{event.date}</span>
                    <span className={cx(css({ display: 'inline-flex', alignItems: 'center', px: '2', py: '1px', rounded: 'sm', fontSize: '9px', fontWeight: 'medium', borderWidth: '1px' }), style.badge)}>
                      {style.label}
                    </span>
                  </div>

                  {event.url ? (
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={css({ fontSize: 'sm', color: '#8B8B96', _hover: { color: '#E8E8ED' }, transition: 'colors', transitionDuration: '200ms', display: 'inline-flex', alignItems: 'center', gap: '1.5', lineHeight: 'relaxed' })}
                    >
                      {event.event}
                      <ExternalLinkIcon className={css({ w: '3', h: '3', color: '#7B7B86' })} />
                    </a>
                  ) : (
                    <p className={css({ fontSize: 'sm', color: '#8B8B96', lineHeight: 'relaxed' })}>{event.event}</p>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResearchTimeline({ research }: { research: PersonResearch }) {
  if (!research.timeline.length) return null;
  return (
    <EnrichedTimelineSection
      events={research.timeline.map((e) => ({ ...e, source: "research" as TimelineSource }))}
    />
  );
}
