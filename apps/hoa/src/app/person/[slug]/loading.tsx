import { css, cx } from "styled-system/css";
import {
  Shimmer,
  SkeletonAvatar,
  SkeletonPill,
  SkeletonText,
} from "../../_components/skeleton";

export default function PersonLoading() {
  return (
    <>
      <main className={css({ minH: 'screen', bg: '#0B0B0F' })}>
        <div className={css({ pos: 'relative', overflow: 'hidden' })}>
          <div className={css({ pos: 'relative', zIndex: 10, maxW: '7xl', mx: 'auto', px: '6' })}>
            {/* ── Back button + edit skeleton ──────────────── */}
            <div className={css({ pt: '8', pb: '4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
              <div className={css({ display: 'flex', alignItems: 'center', gap: '2' })}>
                <Shimmer className={css({ h: '4', w: '4', rounded: 'md' })} />
                <Shimmer className={css({ h: '4', w: '10' })} style={{ animationDelay: "40ms" }} />
              </div>
              <div className={css({ display: 'flex', alignItems: 'center', gap: '2', px: '4', py: '2', rounded: 'lg', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)' })}>
                <Shimmer className={css({ h: '3.5', w: '3.5', rounded: 'md' })} style={{ animationDelay: "80ms" }} />
                <Shimmer className={css({ h: '3.5', w: '8' })} style={{ animationDelay: "120ms" }} />
                <Shimmer className={css({ h: '3', w: '3', rounded: 'md' })} style={{ animationDelay: "160ms" }} />
              </div>
            </div>

            {/* ── Profile hero ─────────────────────────────── */}
            <div className={css({ display: 'flex', alignItems: 'center', gap: '6', pb: '8' })}>
              {/*
                Mirror the real avatar's ring-1 wrapper so the circular
                placeholder sits at exactly the right visual weight.
              */}
              <div className={css({ display: 'none', md: { display: 'block' }, rounded: 'full', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)', p: '2px', flexShrink: 0 })}>
                <SkeletonAvatar size={120} />
              </div>
              <div className={css({ display: { base: 'block', md: 'none' }, rounded: 'full', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)', p: '2px', flexShrink: 0 })}>
                <SkeletonAvatar size={80} />
              </div>

              <div className={css({ display: 'flex', flexDir: 'column', minW: '0', flex: '1' })}>
                {/* Category badge — rounded-full pill */}
                <Shimmer className={css({ h: '1.375rem', w: '24', rounded: 'full', mb: '1.5' })} style={{ animationDelay: "60ms" }} />
                {/* Name — prominent bar */}
                <Shimmer className={css({ h: '8', w: '56', sm: { h: '10', w: '72' }, md: { w: '80' }, rounded: 'lg', mb: '2' })} style={{ animationDelay: "120ms" }} />
                {/* Role · Org — secondary line */}
                <Shimmer className={css({ h: '4', w: '44', sm: { w: '52' }, mb: '3' })} style={{ animationDelay: "180ms" }} />
                {/* Description — two lines, ragged right */}
                <Shimmer className={css({ h: '3.5', w: 'full', maxW: 'xl', mb: '1.5' })} style={{ animationDelay: "240ms" }} />
                <Shimmer className={css({ h: '3.5', w: '75%', maxW: 'md' })} style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className={css({ pos: 'relative', zIndex: 10, maxW: '7xl', mx: 'auto', px: '6' })}>
            <div className={css({ h: '1px', bg: 'rgba(255,255,255,0.06)' })} />
          </div>
        </div>

        {/* ── Content area ─────────────────────────────────── */}
        <div className={css({ maxW: '7xl', mx: 'auto', px: '6', pb: '16' })}>
          {/* ── Quick info / stats bar ────────────────────── */}
          {/*
            Each pill mirrors a real stat chip: icon · value · label.
            Panda CSS classes replace the computed pixel widths for legibility.
          */}
          <div className={css({ mt: '8', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2.5' })}>
            {[
              { icon: css({ w: '4' }), val: css({ w: '6' }),  label: css({ w: '14' }) }, /* podcasts  */
              { icon: css({ w: '4' }), val: css({ w: '8' }),  label: css({ w: '16' }) }, /* episodes  */
              { icon: css({ w: '4' }), val: css({ w: '6' }),  label: css({ w: '12' }) }, /* stars     */
              { icon: css({ w: '4' }), val: css({ w: '8' }),  label: css({ w: '20' }) }, /* downloads */
              { icon: css({ w: '4' }), val: css({ w: '8' }),  label: css({ w: '16' }) }, /* followers */
            ].map((widths, i) => (
              <div
                key={i}
                className={css({ display: 'flex', alignItems: 'center', gap: '2.5', px: '5', py: '2.5', rounded: 'xl', bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)' })}
              >
                <Shimmer className={cx(css({ h: '4' }), widths.icon)} style={{ animationDelay: `${i * 60}ms` }} />
                <Shimmer className={cx(css({ h: '4' }), widths.val)}  style={{ animationDelay: `${i * 60 + 30}ms` }} />
                <Shimmer className={cx(css({ h: '3' }), widths.label)} style={{ animationDelay: `${i * 60 + 60}ms` }} />
              </div>
            ))}

            {/* Separator + GitHub link skeleton */}
            <div className={css({ w: '1px', h: '6', bg: 'rgba(255,255,255,0.08)', display: 'none', sm: { display: 'block' } })} />
            <div className={css({ display: 'none', sm: { display: 'flex' }, alignItems: 'center', gap: '2', px: '4', py: '2.5', rounded: 'xl', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)' })}>
              <Shimmer className={css({ h: '4', w: '4', rounded: 'md' })} style={{ animationDelay: "360ms" }} />
              <Shimmer className={css({ h: '3.5', w: '24' })} style={{ animationDelay: "400ms" }} />
              <Shimmer className={css({ h: '3', w: '3', rounded: 'md' })} style={{ animationDelay: "440ms" }} />
            </div>
          </div>

          {/* ── Section 1: Open Source Projects ───────────── */}
          <div className={css({ mt: '16' })}>
            <div className={css({ display: 'flex', alignItems: 'center', gap: '3', mb: '6' })}>
              <Shimmer className={css({ h: '10', w: '10', rounded: 'full' })} />
              <div>
                <Shimmer className={css({ h: '5', w: '44', mb: '1.5' })} style={{ animationDelay: "40ms" }} />
                <Shimmer className={css({ h: '3', w: '32' })} style={{ animationDelay: "80ms" }} />
              </div>
            </div>

            <div className={css({ display: 'grid', gap: '3.5', sm: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } })}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={css({ px: '5', py: '4', rounded: 'xl', bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)' })}
                >
                  <div className={css({ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: '2' })}>
                    <Shimmer className={css({ h: '4', w: '75%' })} style={{ animationDelay: `${i * 80}ms` }} />
                    <Shimmer className={css({ h: '3.5', w: '3.5', rounded: 'md', flexShrink: 0, ml: '2' })} style={{ animationDelay: `${i * 80 + 40}ms` }} />
                  </div>
                  <SkeletonText lines={2} />
                  <div className={css({ display: 'flex', alignItems: 'center', gap: '3', mt: '3' })}>
                    <SkeletonPill className={css({ w: '14', h: '6' })} />
                    <SkeletonPill className={css({ w: '16', h: '6' })} />
                    <Shimmer className={css({ h: '4', w: '12', ml: 'auto' })} style={{ animationDelay: `${i * 80 + 120}ms` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Section 2: Episodes ──────────────────────── */}
          <div className={css({ mt: '16' })}>
            <div className={css({ display: 'flex', alignItems: 'center', gap: '3', mb: '6' })}>
              <Shimmer className={css({ h: '10', w: '10', rounded: 'full' })} />
              <div>
                <Shimmer className={css({ h: '5', w: '36', mb: '1.5' })} style={{ animationDelay: "40ms" }} />
                <Shimmer className={css({ h: '3', w: '28' })} style={{ animationDelay: "80ms" }} />
              </div>
            </div>

            <div className={css({ display: 'flex', flexDir: 'column', gap: '3' })}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className={css({ display: 'flex', alignItems: 'center', gap: '4', px: '5', py: '4', rounded: 'xl', bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)' })}
                >
                  <Shimmer className={css({ h: '12', w: '12', rounded: 'lg', flexShrink: 0 })} style={{ animationDelay: `${i * 60}ms` }} />
                  <div className={css({ flex: '1', minW: '0' })}>
                    <Shimmer className={css({ h: '4', w: '75%', mb: '1.5' })} style={{ animationDelay: `${i * 60 + 30}ms` }} />
                    <Shimmer className={css({ h: '3', w: '50%' })} style={{ animationDelay: `${i * 60 + 60}ms` }} />
                  </div>
                  <Shimmer className={css({ h: '3', w: '10', flexShrink: 0 })} style={{ animationDelay: `${i * 60 + 90}ms` }} />
                </div>
              ))}
            </div>
          </div>

          {/* ── Section 3: Deep Research ──────────────────── */}
          <div className={css({ mt: '16' })}>
            <div className={css({ display: 'flex', alignItems: 'center', gap: '3', mb: '6' })}>
              <Shimmer className={css({ h: '10', w: '10', rounded: 'full' })} />
              <Shimmer className={css({ h: '5', w: '32' })} style={{ animationDelay: "40ms" }} />
            </div>

            <SkeletonText lines={4} className={css({ maxW: '3xl' })} />

            <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '2', mt: '4' })}>
              {[css({ w: '20' }), css({ w: '24' }), css({ w: '16' }), css({ w: '28' }), css({ w: '20' })].map((w, i) => (
                <SkeletonPill key={i} className={cx(w, css({ h: '6' }))} />
              ))}
            </div>
          </div>

          {/* ── Section 4: Key Contributions ─────────────── */}
          <div className={css({ mt: '16' })}>
            <div className={css({ display: 'flex', alignItems: 'center', gap: '3', mb: '6' })}>
              <Shimmer className={css({ h: '10', w: '10', rounded: 'full' })} />
              <Shimmer className={css({ h: '5', w: '40' })} style={{ animationDelay: "40ms" }} />
            </div>

            <div className={css({ display: 'grid', gap: '3.5', sm: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } })}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={css({ px: '5', py: '4', rounded: 'xl', bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)' })}
                >
                  <Shimmer className={css({ h: '4', w: '66%', mb: '2' })} style={{ animationDelay: `${i * 80}ms` }} />
                  <SkeletonText lines={2} />
                </div>
              ))}
            </div>
          </div>

          {/* ── Footer ─────────────────────────────────────── */}
          <div className={css({ mt: '20' })}>
            <div className={css({ h: '1px', bg: 'rgba(255,255,255,0.06)', mb: '8' })} />
            <div className={css({ display: 'flex', flexDir: 'column', sm: { flexDir: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: '4' })}>
              <div className={css({ display: 'flex', alignItems: 'center', gap: '3' })}>
                <Shimmer className={css({ w: '2.5', h: '2.5', rounded: 'full' })} />
                <Shimmer className={css({ h: '3.5', w: '20' })} style={{ animationDelay: "40ms" }} />
                <span className={css({ color: '#7B7B86' })}>/</span>
                <Shimmer className={css({ h: '3.5', w: '28' })} style={{ animationDelay: "80ms" }} />
              </div>
              <Shimmer className={css({ h: '10', w: '32', rounded: 'full' })} style={{ animationDelay: "120ms" }} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
