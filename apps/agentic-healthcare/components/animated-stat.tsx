"use client";

import { useEffect, useRef, useState } from "react";
import { Text } from "@radix-ui/themes";

export function AnimatedStat({
  value,
  prefix = "",
  suffix = "",
  size = "8",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  size?: "6" | "7" | "8";
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          const start = performance.now();
          const duration = 1200;
          const step = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            setDisplay(Math.round(eased * value));
            if (t < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <Text
      ref={ref}
      size={size}
      weight="bold"
      style={{
        letterSpacing: "-0.03em",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {prefix}
      {display}
      {suffix}
    </Text>
  );
}
