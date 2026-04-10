import { forwardRef, type HTMLAttributes } from "react";
import { css, cx } from "styled-system/css";

interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  maxHeight?: string;
  direction?: "vertical" | "horizontal" | "both";
}

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  (
    { maxHeight, direction = "vertical", className, children, ...rest },
    ref
  ) => {
    const overflowMap = {
      vertical: { overflowY: "auto", overflowX: "hidden" },
      horizontal: { overflowY: "hidden", overflowX: "auto" },
      both: { overflow: "auto" },
    } as const;

    return (
      <div
        ref={ref}
        className={cx(
          css({
            ...overflowMap[direction],
            ...(maxHeight ? { maxHeight } : {}),
            scrollbarWidth: "thin",
            scrollbarColor: "token(colors.ui.border) transparent",
            "&::-webkit-scrollbar": {
              width: "6px",
              height: "6px",
            },
            "&::-webkit-scrollbar-track": {
              background: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              background: "ui.border",
              borderRadius: "full",
              _hover: {
                background: "ui.borderHover",
              },
            },
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
ScrollArea.displayName = "ScrollArea";
