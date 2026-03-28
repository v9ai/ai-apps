import { forwardRef, type ButtonHTMLAttributes } from "react";
import { button } from "@/recipes/button";
import { cx } from "styled-system/css";

type ButtonVariant = "solid" | "ghost" | "outline" | "solidGreen" | "link";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "solid", size = "md", className, children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        className={cx(button({ variant, size }), className)}
        {...rest}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
