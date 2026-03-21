import { css, cx } from "styled-system/css";
import { Shimmer, SkeletonCard, SkeletonPill } from "./_components/skeleton";

export default function HomeLoading() {
  return (
    <>
      <main className={css({ minH: 'screen', bg: '#0B0B0F', color: '#E8E8ED', pt: '14' })}>
        {/* ── Skeleton nav header ──────────────────────────── */}
        <header className={css({ pos: 'fixed', top: '0', left: '0', right: '0', zIndex: 50, h: '14', bg: 'rgba(11,11,15,0.95)', backdropFilter: 'blur(24px)', borderBottomWidth: '1px', borderColor: 'rgba(255,255,255,0.06)' })}>
          <div className={css({ maxW: '80rem', mx: 'auto', px: '6', h: 'full', display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
            {/* Logo */}
            <Shimmer className={css({ h: '5', w: '7.5rem' })} />

            <div className={css({ display: 'flex', alignItems: 'center', gap: '3', h: 'full' })}>
              {/* Nav links */}
              <div className={css({ display: 'none', md: { display: 'flex' }, alignItems: 'center', gap: '1', mr: '2' })}>
                <Shimmer className={css({ h: '7', w: '12', rounded: 'lg' })} />
                <Shimmer className={css({ h: '7', w: '4.5rem', rounded: 'lg' })} style={{ animationDelay: "60ms" }} />
              </div>
              {/* Search trigger */}
              <Shimmer className={css({ h: '8', w: '8', rounded: 'lg' })} style={{ animationDelay: "120ms" }} />
              {/* Stats counters */}
              <div className={css({ display: 'none', sm: { display: 'flex' }, alignItems: 'center', gap: '3', ml: '2' })}>
                <Shimmer className={css({ h: '3', w: '4.5rem' })} style={{ animationDelay: "180ms" }} />
                <span className={css({ fontSize: 'xs', color: '#4A4A52', userSelect: 'none' })}>&middot;</span>
                <Shimmer className={css({ h: '3', w: '5.5rem' })} style={{ animationDelay: "240ms" }} />
              </div>
            </div>
          </div>
        </header>

        {/* ── Skeleton hero section ────────────────────────── */}
        <section className={css({ pos: 'relative', overflow: 'hidden', pt: '28', pb: '8' })}>
          <div className={css({ pos: 'relative', maxW: '700px', mx: 'auto', px: '6', display: 'flex', flexDir: 'column', alignItems: 'center' })}>
            {/* Main title */}
            <Shimmer className={css({ h: '3.5rem', w: '72', sm: { h: '4.5rem', w: '26rem' }, rounded: 'lg', mb: '5' })} />
            {/* Subtitle lines */}
            <Shimmer className={css({ h: '4', w: '64', sm: { w: '96' }, mb: '2' })} style={{ animationDelay: "80ms" }} />
            <Shimmer className={css({ h: '4', w: '48', sm: { w: '72' }, mb: '7' })} style={{ animationDelay: "160ms" }} />
            {/* Divider */}
            <div className={css({ h: '1px', w: '20', bg: 'rgba(255,255,255,0.06)' })} />
          </div>
        </section>

        {/* ── "Their Stories" section skeleton ─────────────── */}
        <section className={css({ maxW: '7xl', mx: 'auto', px: '6', pt: '10', pb: '32' })}>
          {/* Section heading */}
          <div className={css({ display: 'flex', flexDir: 'column', alignItems: 'center', mb: '10' })}>
            <Shimmer className={css({ h: '10', md: { h: '12' }, w: '56', rounded: 'lg', mb: '2' })} />
            <Shimmer className={css({ h: '3', w: '17rem' })} style={{ animationDelay: "60ms" }} />
            <div className={cx("gradient-divider", css({ maxW: 'xs', w: 'full', mt: '6' }))} />
          </div>

          {/* ── Category filter pills ───────────────────────── */}
          <div className={css({ display: 'flex', justifyContent: 'center', mb: '12' })}>
            <div className={css({ rounded: 'full', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.04)', bg: 'rgba(255,255,255,0.02)', p: '1' })}>
              <div className={css({ display: 'flex', gap: '1' })}>
                {[
                  css({ w: '14' }),                                                    /* All */
                  css({ w: '5.5rem' }),                                                /* Lab Leaders */
                  css({ w: '4.5rem' }),                                                /* Builders */
                  css({ w: '5.5rem' }),                                                /* Researchers */
                  css({ w: '16', display: 'none', sm: { display: 'block' } }),         /* Hosts */
                  css({ w: '6rem', display: 'none', sm: { display: 'block' } }),       /* Rising Leaders */
                  css({ w: '5.5rem', display: 'none', md: { display: 'block' } }),     /* Infrastructure */
                ].map((w, i) => (
                  <SkeletonPill
                    key={i}
                    className={cx(css({ h: '7' }), w)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── Skeleton masonry grid ───────────────────────── */}
          {/*
            9 cards, staggered in 80ms steps so the shimmer sweep
            visually cascades across the grid rather than all pulsing in sync.
          */}
          <div className={css({ columns: 1, gap: '6', sm: { columns: 2 }, lg: { columns: 3 } })}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className={css({ breakInside: 'avoid', mb: '6' })}>
                <SkeletonCard delay={i * 80} />
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
