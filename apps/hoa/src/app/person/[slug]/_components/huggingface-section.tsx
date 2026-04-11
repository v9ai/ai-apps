import type { EnrichedData } from "@/lib/enrichment";
import { formatNumber } from "@/lib/enrichment";
import { ExternalLinkIcon } from "./icons";
import { css, cx } from "styled-system/css";

type Props = {
  huggingface: EnrichedData["huggingface"];
};

export function HuggingFaceSection({ huggingface }: Props) {
  if (!huggingface || huggingface.models.length === 0) return null;

  return (
    <div className={css({ mt: '14' })}>
      {/* Section label */}
      <p className={css({ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#5A5A65', mb: '6' })}>
        Hugging Face
      </p>

      <div className={css({ display: 'flex', alignItems: 'center', gap: '4', mb: '6' })}>
        <div className={css({ w: '10', h: '10', rounded: 'full', bg: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)' })}>
          <svg
            viewBox="0 0 24 24"
            className={css({ w: '5', h: '5', color: '#7B7B86' })}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <h2 className={css({ fontSize: 'xl', fontWeight: 'bold', color: '#E8E8ED' })}>AI Models</h2>
          <p className={css({ fontSize: 'xs', color: '#7B7B86', mt: '1' })}>
            {huggingface.models.length} models on Hugging Face ·{" "}
            {formatNumber(huggingface.totalDownloads)} downloads
          </p>
        </div>
      </div>

      <div className={css({ display: 'flex', flexDir: 'column', gap: '5' })}>
        {huggingface.models.map((model, i) => (
          <a
            key={model.id}
            href={`https://huggingface.co/${model.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cx("group", "animate-row-enter", css({ display: 'block', px: '6', py: '6', rounded: 'xl', bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)', transition: 'all', transitionDuration: '200ms', _hover: { borderColor: 'rgba(255,255,255,0.1)' } }))}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className={css({ display: 'flex', alignItems: 'flex-start', gap: '4' })}>
              <div className={css({ flexShrink: 0, mt: '0.5', px: '2.5', py: '1', rounded: 'md', bg: 'rgba(255,255,255,0.05)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)', fontSize: '11px', fontFamily: 'mono', fontWeight: 'semibold', color: '#8B8B96', letterSpacing: 'wide' })}>
                HF
              </div>
              <div className={css({ minW: '0', flex: '1' })}>
                <span className={css({ fontSize: 'sm', fontWeight: 'medium', color: '#C4C4CC', transition: 'colors', transitionDuration: '200ms', _groupHover: { color: '#E8E8ED' } })}>
                  {model.id.split("/").pop()}
                </span>
                {model.pipelineTag && (
                  <span className={css({ ml: '3', px: '3', py: '1', rounded: 'full', bg: 'rgba(255,255,255,0.05)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)', fontSize: '11px', color: '#7B7B86' })}>
                    {model.pipelineTag}
                  </span>
                )}
                <div className={css({ display: 'flex', alignItems: 'center', gap: '6', mt: '4', fontSize: 'xs', color: '#7B7B86' })}>
                  <span className={css({ display: 'inline-flex', alignItems: 'center', gap: '2' })}>
                    <svg
                      viewBox="0 0 24 24"
                      className={css({ w: '3.5', h: '3.5' })}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {formatNumber(model.downloads)}
                  </span>
                  <span className={css({ display: 'inline-flex', alignItems: 'center', gap: '2' })}>
                    <svg viewBox="0 0 24 24" className={css({ w: '3.5', h: '3.5' })} fill="currentColor">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    {model.likes}
                  </span>
                </div>
              </div>
              <ExternalLinkIcon className={css({ w: '4', h: '4', color: '#7B7B86', flexShrink: 0, mt: '1', transition: 'colors', transitionDuration: '200ms', _groupHover: { color: '#C4C4CC' } })} />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
