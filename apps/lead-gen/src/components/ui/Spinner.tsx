import { css, cx } from "styled-system/css";

interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 16, className }: SpinnerProps) {
  return (
    <div
      className={cx(
        css({
          width: `${size}px`,
          height: `${size}px`,
          border: "2px solid",
          borderColor: "ui.border",
          borderTopColor: "accent.primary",
          borderRadius: "50%",
          animation: "toolbar-spin 0.6s linear infinite",
        }),
        className
      )}
    />
  );
}
