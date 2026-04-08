import { forwardRef, type HTMLAttributes } from "react";
import { css, cx } from "styled-system/css";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padding?: "sm" | "md" | "lg";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { interactive = false, padding = "md", className, children, ...rest },
    ref
  ) => {
    const paddingMap = { sm: "2", md: "3", lg: "5" } as const;
    return (
      <div
        ref={ref}
        className={cx(
          css({
            bg: "ui.surface",
            border: "1px solid",
            borderColor: "ui.border",
            borderRadius: "0",
            boxShadow: "none",
            p: paddingMap[padding],
            ...(interactive
              ? {
                  cursor: "pointer",
                  transition:
                    "background 150ms ease, border-color 150ms ease",
                  _hover: {
                    bg: "ui.surfaceHover",
                    borderColor: "ui.borderHover",
                  },
                }
              : {}),
          }),
          className
        )}
        {...rest}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";
