type NavHeaderProps = {
  totalPersonalities: number;
  totalPodcasts: number;
};

export default function NavHeader({
  totalPersonalities,
  totalPodcasts,
}: NavHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <a
          href="/"
          className="font-[family-name:var(--font-playfair)] text-lg font-bold text-white"
        >
          Humans of AI
        </a>

        <div className="hidden sm:flex items-center gap-3 text-xs text-neutral-500 tracking-wide uppercase">
          <span>{totalPersonalities} Stories</span>
          <span aria-hidden="true">&middot;</span>
          <span>{totalPodcasts} Podcasts</span>
        </div>
      </div>
    </header>
  );
}
