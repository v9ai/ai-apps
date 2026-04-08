import { forwardRef, type HTMLAttributes } from "react";
import { cx } from "styled-system/css";
import { heading } from "@/recipes/text";

type HeadingLevel = 1 | 2 | 3 | 4;

interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
}

const tagMap: Record<HeadingLevel, "h1" | "h2" | "h3" | "h4"> = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
};

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ level = 2, as, className, children, ...rest }, ref) => {
    const Component = as ?? tagMap[level];
    return (
      <Component
        ref={ref}
        className={cx(heading({ level }), className)}
        {...rest}
      >
        {children}
      </Component>
    );
  }
);
Heading.displayName = "Heading";
