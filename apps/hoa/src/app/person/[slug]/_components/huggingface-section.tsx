import type { EnrichedData } from "@/lib/enrichment";
import { formatNumber } from "@/lib/enrichment";
import { ExternalLinkIcon } from "./icons";
import { css, cx } from "styled-system/css";

type Props = {
  huggingface: EnrichedData["huggingface"];
};

const LANG_CODES = new Set(["en", "fr", "de", "es", "zh", "ja", "ko", "pt", "ru", "ar", "it", "nl", "pl", "sv", "tr", "hi", "th", "vi", "uk", "cs", "ro", "da", "fi", "hu", "no", "id", "ms", "he", "el", "bg", "ca", "hr", "sk", "sl", "et", "lt", "lv", "sr", "multilingual"]);

function getDisplayTags(tags: string[]): string[] {
  return tags.filter(
    (t) =>
      !t.startsWith("dataset:") &&
      !t.startsWith("base_model:") &&
      !t.startsWith("license:") &&
      !t.startsWith("region:") &&
      !LANG_CODES.has(t) &&
      t !== "safetensors",
  );
}

function getLicense(tags: string[]): string | null {
  const tag = tags.find((t) => t.startsWith("license:"));
  return tag ? tag.replace("license:", "") : null;
}

const MAX_DISPLAY = 10;

export function HuggingFaceSection({ huggingface }: Props) {
  if (!huggingface || huggingface.models.length === 0) return null;

  const totalModels = huggingface.totalModels ?? huggingface.models.length;
  const displayModels = huggingface.models.slice(0, MAX_DISPLAY);
  const remaining = totalModels - displayModels.length;

  return (
    <div className={css({ mt: '14' })}>
      <p className={css({ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#5A5A65', mb: '6' })}>
        Hugging Face
      </p>

      <div className={css({ display: 'flex', alignItems: 'center', gap: '4', mb: '6' })}>
        <div className={css({ w: '10', h: '10', rounded: 'full', bg: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)' })}>
          <svg viewBox="0 0 120 120" className={css({ w: '5', h: '5' })} fill="none">
            <path d="M35.5 72.1c-1-.6-2.1-.3-2.6.7-.5 1-.2 2.1.8 2.6 1 .6 2.1.3 2.6-.7.5-1 .2-2.1-.8-2.6zm49 0c-1-.6-2.1-.3-2.6.7-.5 1-.2 2.1.8 2.6 1 .6 2.1.3 2.6-.7.5-1 .2-2.1-.8-2.6z" fill="#FFD21E"/>
            <path d="M60 10C32.4 10 10 32.4 10 60s22.4 50 50 50 50-22.4 50-50S87.6 10 60 10z" stroke="#FFD21E" strokeWidth="6" strokeLinecap="round"/>
            <path d="M40 52c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="#FFD21E" strokeWidth="6" strokeLinecap="round"/>
            <path d="M64 52c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="#FFD21E" strokeWidth="6" strokeLinecap="round"/>
            <path d="M38 68c0 0 8 14 22 14s22-14 22-14" stroke="#FFD21E" strokeWidth="6" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <h2 className={css({ fontSize: 'xl', fontWeight: 'bold', color: '#E8E8ED' })}>AI Models</h2>
          <p className={css({ fontSize: 'xs', color: '#7B7B86', mt: '1' })}>
            {totalModels} model{totalModels !== 1 ? "s" : ""} on Hugging Face ·{" "}
            {formatNumber(huggingface.totalDownloads)} downloads
          </p>
        </div>
      </div>

      <div className={css({ display: 'flex', flexDir: 'column', gap: '5' })}>
        {displayModels.map((model, i) => {
          const displayTags = getDisplayTags(model.tags);
          const license = getLicense(model.tags);

          return (
            <a
              key={model.id}
              href={`https://huggingface.co/${model.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cx("group", "animate-row-enter", css({ display: 'block', px: '6', py: '6', rounded: 'xl', bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)', transition: 'all', transitionDuration: '200ms', _hover: { borderColor: 'rgba(255,255,255,0.1)' } }))}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className={css({ display: 'flex', alignItems: 'flex-start', gap: '4' })}>
                <div className={css({ flexShrink: 0, mt: '0.5', px: '2.5', py: '1', rounded: 'md', bg: 'rgba(255,214,30,0.08)', borderWidth: '1px', borderColor: 'rgba(255,214,30,0.15)', fontSize: '11px', fontFamily: 'mono', fontWeight: 'semibold', color: '#FFD21E', letterSpacing: 'wide', opacity: 0.8 })}>
                  HF
                </div>
                <div className={css({ minW: '0', flex: '1' })}>
                  <div className={css({ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '2' })}>
                    <span className={css({ fontSize: 'sm', fontWeight: 'medium', color: '#C4C4CC', transition: 'colors', transitionDuration: '200ms', _groupHover: { color: '#E8E8ED' } })}>
                      {model.id.split("/").pop()}
                    </span>
                    {model.pipelineTag && (
                      <span className={css({ px: '2.5', py: '0.5', rounded: 'full', bg: 'rgba(99,179,237,0.1)', borderWidth: '1px', borderColor: 'rgba(99,179,237,0.2)', fontSize: '10px', color: 'rgba(99,179,237,0.8)', fontWeight: 'medium' })}>
                        {model.pipelineTag}
                      </span>
                    )}
                    {license && (
                      <span className={css({ px: '2.5', py: '0.5', rounded: 'full', bg: 'rgba(72,187,120,0.08)', borderWidth: '1px', borderColor: 'rgba(72,187,120,0.15)', fontSize: '10px', color: 'rgba(72,187,120,0.7)', fontWeight: 'medium' })}>
                        {license}
                      </span>
                    )}
                  </div>

                  {displayTags.length > 0 && (
                    <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '1.5', mt: '3' })}>
                      {displayTags.slice(0, 8).map((tag) => (
                        <span
                          key={tag}
                          className={css({ px: '2', py: '0.5', rounded: 'md', bg: 'rgba(255,255,255,0.04)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)', fontSize: '10px', color: '#7B7B86', fontFamily: 'mono' })}
                        >
                          {tag}
                        </span>
                      ))}
                      {displayTags.length > 8 && (
                        <span className={css({ px: '2', py: '0.5', fontSize: '10px', color: '#5A5A65' })}>
                          +{displayTags.length - 8}
                        </span>
                      )}
                    </div>
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
          );
        })}

        {remaining > 0 && (
          <a
            href={`https://huggingface.co/${huggingface.models[0].id.split("/")[0]}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cx("group", css({ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2', px: '6', py: '4', rounded: 'xl', bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)', transition: 'all', transitionDuration: '200ms', _hover: { borderColor: 'rgba(255,255,255,0.1)', bg: '#1C1C22' } }))}
          >
            <span className={css({ fontSize: 'sm', color: '#7B7B86', transition: 'colors', transitionDuration: '200ms', _groupHover: { color: '#C4C4CC' } })}>
              +{remaining} more model{remaining !== 1 ? "s" : ""} on Hugging Face
            </span>
            <ExternalLinkIcon className={css({ w: '3.5', h: '3.5', color: '#5A5A65', transition: 'colors', transitionDuration: '200ms', _groupHover: { color: '#7B7B86' } })} />
          </a>
        )}
      </div>
    </div>
  );
}
