import type { EnrichedData } from "@/lib/enrichment";
import { formatNumber } from "@/lib/enrichment";
import { ExternalLinkIcon } from "./icons";
import { css, cx } from "styled-system/css";

type Props = {
  huggingface: EnrichedData["huggingface"];
};

const MAX_DISPLAY = 10;

export function HuggingFaceSection({ huggingface }: Props) {
  if (!huggingface || huggingface.models.length === 0) return null;

  const totalModels = huggingface.totalModels ?? huggingface.models.length;
  const displayModels = huggingface.models.slice(0, MAX_DISPLAY);
  const remaining = totalModels - displayModels.length;

  return (
    <div className={css({ mt: '10' })}>
      <p className={css({ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#5A5A65', mb: '3' })}>
        Hugging Face · {totalModels} model{totalModels !== 1 ? "s" : ""} · {formatNumber(huggingface.totalDownloads)} downloads
      </p>

      <div className={css({ display: 'grid', gap: '1.5', sm: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } })}>
        {displayModels.map((model, i) => (
          <a
            key={model.id}
            href={`https://huggingface.co/${model.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cx("group", "animate-row-enter", css({ display: 'flex', alignItems: 'baseline', gap: '2', px: '3', py: '2', rounded: 'md', bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.05)', transition: 'all', transitionDuration: '150ms', _hover: { borderColor: 'rgba(255,255,255,0.12)', bg: '#1a1a1f' } }))}
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <span className={css({ fontSize: '12px', fontWeight: '600', color: '#C4C4CC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1, minW: 0, _groupHover: { color: '#E8E8ED' } })}>
              {model.id.split("/").pop()}
            </span>
            {model.pipelineTag && (
              <span className={css({ fontSize: '10px', color: 'rgba(99,179,237,0.7)', flexShrink: 0 })}>
                {model.pipelineTag}
              </span>
            )}
            <span className={css({ display: 'inline-flex', alignItems: 'center', gap: '0.5', fontSize: '10px', color: '#5A5A66', flexShrink: 0, ml: 'auto' })}>
              <svg viewBox="0 0 24 24" className={css({ w: '2.5', h: '2.5' })} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {formatNumber(model.downloads)}
            </span>
          </a>
        ))}
      </div>

      {remaining > 0 && (
        <a
          href={`https://huggingface.co/${huggingface.models[0].id.split("/")[0]}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cx("group", css({ display: 'inline-flex', alignItems: 'center', gap: '1.5', mt: '2', fontSize: '11px', color: '#5A5A66', _hover: { color: '#7B7B86' } }))}
        >
          +{remaining} more on Hugging Face
          <ExternalLinkIcon className={css({ w: '2.5', h: '2.5' })} />
        </a>
      )}
    </div>
  );
}
