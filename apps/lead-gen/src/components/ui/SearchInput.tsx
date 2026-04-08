import { forwardRef, type InputHTMLAttributes } from "react";
import { css, cx } from "styled-system/css";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { input } from "@/recipes/input";

interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: "sm" | "md" | "lg";
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    { placeholder = "search...", size = "sm", className, ...rest },
    ref
  ) => {
    return (
      <div
        className={css({
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
        })}
      >
        <div
          className={css({
            position: "absolute",
            left: "8px",
            display: "flex",
            alignItems: "center",
            pointerEvents: "none",
            color: "ui.tertiary",
          })}
        >
          <MagnifyingGlassIcon width={14} height={14} />
        </div>
        <input
          ref={ref}
          type="text"
          placeholder={placeholder}
          className={cx(
            input({ size }),
            css({ pl: "28px", width: "100%" }),
            className
          )}
          {...rest}
        />
      </div>
    );
  }
);
SearchInput.displayName = "SearchInput";
