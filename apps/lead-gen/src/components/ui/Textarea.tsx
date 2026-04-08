import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cx } from "styled-system/css";
import { textarea } from "@/recipes/input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  // Extensible for future variants
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...rest }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cx(textarea(), className)}
        {...rest}
      />
    );
  }
);
Textarea.displayName = "Textarea";
