import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { css, cx } from "styled-system/css";

type CardVariant = "surface" | "elevated" | "outlined" | "glass";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  hoverLift?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
}

const baseStyle = css({
  borderRadius: "lg",
  transition:
    "transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94), border-color 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
});

const variantStyles: Record<CardVariant, string> = {
  surface: css({
    background: "ui.surface",
    border: "1px solid",
    borderColor: "ui.border",
  }),
  elevated: css({
    background: "ui.surfaceRaised",
    border: "1px solid",
    borderColor: "ui.border",
    boxShadow: "card",
  }),
  outlined: css({
    background: "transparent",
    border: "1px solid",
    borderColor: "ui.border",
  }),
  glass: css({
    background: "whiteAlpha.5",
    border: "1px solid",
    borderColor: "whiteAlpha.10",
    backdropFilter: "blur(12px)",
  }),
};

const hoverLiftStyle = css({
  _hover: {
    transform: "translateY(-2px)",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.40)",
    borderColor: "ui.borderHover",
  },
});

const paddingStyles: Record<NonNullable<CardProps["padding"]>, string> = {
  none: css({ padding: "0" }),
  sm: css({ padding: "3" }),
  md: css({ padding: "5" }),
  lg: css({ padding: "7" }),
};

const headerStyle = css({
  padding: "4",
  borderBottom: "1px solid",
  borderBottomColor: "ui.border",
});

const bodyStyle = css({
  padding: "4",
});

const footerStyle = css({
  padding: "4",
  borderTop: "1px solid",
  borderTopColor: "ui.border",
});

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = "surface",
      hoverLift = false,
      header,
      footer,
      padding = "md",
      className,
      children,
      ...rest
    },
    ref
  ) => {
    const hasSlots = header !== undefined || footer !== undefined;

    return (
      <div
        ref={ref}
        className={cx(
          baseStyle,
          variantStyles[variant],
          hoverLift ? hoverLiftStyle : undefined,
          hasSlots ? undefined : paddingStyles[padding],
          className
        )}
        {...rest}
      >
        {hasSlots ? (
          <>
            {header && <div className={headerStyle}>{header}</div>}
            <div className={bodyStyle}>{children}</div>
            {footer && <div className={footerStyle}>{footer}</div>}
          </>
        ) : (
          children
        )}
      </div>
    );
  }
);
Card.displayName = "Card";
