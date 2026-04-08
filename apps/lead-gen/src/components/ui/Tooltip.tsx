import { forwardRef, type HTMLAttributes } from "react";
import { css, cx } from "styled-system/css";

interface TooltipProps extends HTMLAttributes<HTMLSpanElement> {
  content: string;
  side?: "top" | "bottom";
}

export const Tooltip = forwardRef<HTMLSpanElement, TooltipProps>(
  ({ content, side = "top", className, children, ...rest }, ref) => {
    return (
      <span
        ref={ref}
        className={cx(
          css({
            position: "relative",
            display: "inline-flex",
            _hover: {
              "& > [data-tooltip]": {
                opacity: 1,
                visibility: "visible",
              },
            },
          }),
          className
        )}
        {...rest}
      >
        {children}
        <span
          data-tooltip=""
          className={css({
            position: "absolute",
            ...(side === "top"
              ? { bottom: "calc(100% + 6px)" }
              : { top: "calc(100% + 6px)" }),
            left: "50%",
            transform: "translateX(-50%)",
            px: "2",
            py: "1",
            bg: "ui.surfaceRaised",
            border: "1px solid",
            borderColor: "ui.border",
            color: "ui.secondary",
            fontSize: "xs",
            lineHeight: "compact",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            opacity: 0,
            visibility: "hidden",
            transition: "opacity 150ms ease",
            zIndex: "popover",
          })}
        >
          {content}
        </span>
      </span>
    );
  }
);
Tooltip.displayName = "Tooltip";
