type HeroSectionProps = {
  totalPersonalities: number;
};

export default function HeroSection({ totalPersonalities }: HeroSectionProps) {
  return (
    <section className="relative pt-32 pb-16 text-center overflow-hidden">
      {/* Subtle warm glow behind title */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-start justify-center"
      >
        <div
          className="w-[600px] h-[400px] -mt-20 rounded-full opacity-100"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(212, 168, 83, 0.03) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
      </div>

      <div className="relative max-w-3xl mx-auto px-6">
        {/* Main title */}
        <h1
          className="font-[family-name:var(--font-playfair)] text-6xl md:text-7xl lg:text-8xl font-bold text-white"
          style={{
            animation: "fade-in-up 0.8s ease-out both",
          }}
        >
          Humans of AI
        </h1>

        {/* Subtitle */}
        <p
          className="mt-6 text-lg md:text-xl text-neutral-400 leading-relaxed max-w-2xl mx-auto"
          style={{
            animation: "fade-in-up 0.8s ease-out 0.15s both",
          }}
        >
          Behind every algorithm is a human story. These are the voices,
          visions, and journeys of {totalPersonalities} people shaping the age
          of artificial intelligence.
        </p>

        {/* Decorative amber line */}
        <div
          className="w-16 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent mx-auto mt-10"
          style={{
            animation: "fade-in 1s ease-out 0.4s both",
          }}
        />
      </div>
    </section>
  );
}
