type NavHeaderProps = {
  totalPersonalities: number;
  totalPodcasts: number;
};

export default function NavHeader({
  totalPersonalities,
  totalPodcasts,
}: NavHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#FAFAF7]/95 backdrop-blur-md border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <a
          href="/"
          className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1a1a1a] tracking-tight"
        >
          Humans of AI
        </a>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-400 tracking-wide">
          <span>{totalPersonalities} Stories</span>
          <span aria-hidden="true" className="text-neutral-300">&middot;</span>
          <span>{totalPodcasts} Podcasts</span>
        </div>
      </div>
    </header>
  );
}
