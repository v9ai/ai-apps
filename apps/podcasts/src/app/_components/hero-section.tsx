type HeroSectionProps = {
  totalPersonalities: number;
};

export default function HeroSection({ totalPersonalities }: HeroSectionProps) {
  return (
    <section className="pt-32 pb-20 text-center">
      <div className="max-w-[700px] mx-auto px-6">
        {/* Main title */}
        <h1
          className="font-[family-name:var(--font-playfair)] text-5xl md:text-6xl lg:text-7xl font-bold text-[#1a1a1a] tracking-tight"
          style={{
            animation: "fade-in-up 0.8s ease-out both",
          }}
        >
          Humans of AI
        </h1>

        {/* Subtitle */}
        <p
          className="mt-6 text-lg md:text-xl text-[#666] leading-relaxed max-w-lg mx-auto font-[family-name:var(--font-inter)]"
          style={{
            animation: "fade-in-up 0.8s ease-out 0.15s both",
          }}
        >
          Behind every algorithm is a human story. These are the voices,
          visions, and journeys of {totalPersonalities} people shaping the age
          of artificial intelligence.
        </p>

        {/* Thin horizontal divider */}
        <div
          className="w-10 h-px bg-neutral-300 mx-auto mt-10"
          style={{
            animation: "fade-in-up 0.8s ease-out 0.3s both",
          }}
        />
      </div>
    </section>
  );
}
