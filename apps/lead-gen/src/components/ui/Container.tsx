import { forwardRef, type HTMLAttributes } from "react";
import { css, cx } from "styled-system/css";

type ContainerSize = "sm" | "md" | "lg" | "xl" | "full";

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: ContainerSize;
}

const maxWidthMap: Record<ContainerSize, string> = {
  sm: "640px",
  md: "968px",
  lg: "1200px",
  xl: "1440px",
  full: "100%",
};

export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ size = "lg", className, children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={cx(
          css({
            width: "100%",
            maxWidth: maxWidthMap[size],
            mx: "auto",
            px: { base: "4", md: "6" },
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
Container.displayName = "Container";
