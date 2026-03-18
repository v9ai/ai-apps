type HeroSectionProps = {
  totalPersonalities: number;
};

export default function HeroSection({ totalPersonalities }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden pt-28 pb-8 text-center">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(139,92,246,0.06) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-[700px] mx-auto px-6">
        <h1
          className="font-bold tracking-[-0.03em]"
          style={{
            fontFamily: "var(--font-inter), system-ui, -apple-system, sans-serif",
            fontSize: "clamp(2.75rem, 8vw, 6.25rem)",
            backgroundImage: "linear-gradient(to bottom, #E8E8ED, #A8A8B3)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            animation: "fade-in-up 0.8s ease-out both",
          }}
        >
          Humans of AI
        </h1>

        <p
          className="mt-5 max-w-[36rem] mx-auto leading-[1.8]"
          style={{
            fontSize: "clamp(1rem, 2vw, 1.125rem)",
            color: "#ADADB8",
            animation: "fade-in-up 0.8s ease-out 0.15s both",
          }}
        >
          Behind every algorithm is a human story. These are the voices,
          visions, and journeys of {totalPersonalities} people shaping the age
          of artificial intelligence.
        </p>

        <div
          className="h-px w-20 mx-auto mt-7"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
            animation: "fade-in-up 0.8s ease-out 0.3s both",
          }}
        />
      </div>
    </section>
  );
}
