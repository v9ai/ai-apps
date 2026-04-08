import { forwardRef, type InputHTMLAttributes } from "react";
import { cx } from "styled-system/css";
import { input } from "@/recipes/input";

interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: "sm" | "md" | "lg";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ size = "md", className, ...rest }, ref) => {
    return (
      <input
        ref={ref}
        className={cx(input({ size }), className)}
        {...rest}
      />
    );
  }
);
Input.displayName = "Input";
