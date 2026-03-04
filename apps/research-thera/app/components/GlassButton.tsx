import React from "react";
import { Slot } from "@radix-ui/react-slot";
import styles from "./GlassButton.module.css";

export interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive";
  size?: "small" | "medium" | "large";
  asChild?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

export const GlassButton = React.forwardRef<
  HTMLButtonElement,
  GlassButtonProps
>(
  (
    {
      variant = "primary",
      size = "medium",
      asChild = false,
      loading = false,
      fullWidth = false,
      className,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    const classNames = [
      styles.glassButton,
      styles[`variant${variant.charAt(0).toUpperCase()}${variant.slice(1)}`],
      styles[`size${size.charAt(0).toUpperCase()}${size.slice(1)}`],
      loading && styles.loading,
      fullWidth && styles.fullWidth,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <Comp
        ref={ref}
        className={classNames}
        disabled={disabled || loading}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);

GlassButton.displayName = "GlassButton";
