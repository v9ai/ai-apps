"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { css, cx } from "styled-system/css";
import { flex } from "styled-system/patterns";
import { button as buttonRecipe } from "@/recipes/button";
import { authClient } from "@/lib/auth/client";

type Mode = "signin" | "signup";

interface AuthDialogProps {
  trigger?: React.ReactNode;
  defaultMode?: Mode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const overlayStyle = css({
  position: "fixed",
  inset: 0,
  zIndex: 50,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  bg: "rgba(10, 10, 15, 0.85)",
  animation: "fadeIn 150ms ease",
});

const panelStyle = css({
  bg: "ui.surface",
  border: "1px solid",
  borderColor: "ui.border",
  borderRadius: "md",
  p: "6",
  w: "full",
  maxW: "400px",
  mx: "4",
  position: "relative",
  animation: "fadeIn 150ms ease",
});

const inputStyle = css({
  display: "block",
  w: "full",
  px: "3",
  py: "2",
  fontSize: "sm",
  bg: "ui.bg",
  border: "1px solid",
  borderColor: "ui.border",
  borderRadius: "sm",
  color: "ui.body",
  outline: "none",
  transition: "border-color 150ms ease",
  _focus: {
    borderColor: "accent.primary",
  },
  _disabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  _placeholder: {
    color: "ui.dim",
  },
});

const labelTextStyle = css({
  display: "block",
  fontSize: "sm",
  fontWeight: "medium",
  mb: "1",
  color: "ui.body",
});

const separatorStyle = css({
  border: "none",
  borderTop: "1px solid",
  borderColor: "ui.border",
  my: "4",
});

export function AuthDialog({
  trigger,
  defaultMode = "signin",
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AuthDialogProps) {
  const isControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setUncontrolledOpen;

  const [mode, setMode] = useState<Mode>(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMode(defaultMode);
      setEmail("");
      setPassword("");
      setName("");
      setError(null);
    }
  }, [open, defaultMode]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    },
    [setOpen],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await authClient.signIn.email({ email, password });
        if (error) setError(error.message ?? "Sign in failed");
        else setOpen(false);
      } else {
        const { error } = await authClient.signUp.email({
          email,
          password,
          name: name || email.split("@")[0],
        });
        if (error) setError(error.message ?? "Sign up failed");
        else setOpen(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {trigger && (
        <span onClick={() => setOpen(true)} style={{ cursor: "pointer" }}>
          {trigger}
        </span>
      )}

      {open && (
        <div className={overlayStyle} onClick={handleOverlayClick}>
          <div className={panelStyle} ref={panelRef} role="dialog" aria-modal="true">
            <h2 className={css({ fontSize: "lg", fontWeight: "bold", color: "ui.heading", mb: "1" })}>
              {mode === "signin" ? "Sign In" : "Create Account"}
            </h2>
            <p className={css({ fontSize: "sm", color: "ui.tertiary", mb: "4" })}>
              {mode === "signin"
                ? "Sign in to your account."
                : "Create a new account."}
            </p>

            <form onSubmit={handleSubmit}>
              <div className={flex({ direction: "column", gap: "3" })}>
                {mode === "signup" && (
                  <label>
                    <span className={labelTextStyle}>Name</span>
                    <input
                      className={inputStyle}
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={loading}
                    />
                  </label>
                )}

                <label>
                  <span className={labelTextStyle}>Email</span>
                  <input
                    className={inputStyle}
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </label>

                <label>
                  <span className={labelTextStyle}>Password</span>
                  <input
                    className={inputStyle}
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </label>

                {error && (
                  <span className={css({ fontSize: "sm", color: "status.negative" })}>
                    {error}
                  </span>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={cx(
                    buttonRecipe({ variant: "solid", size: "md" }),
                    css({ mt: "2", w: "full", justifyContent: "center" }),
                  )}
                >
                  {loading
                    ? "Loading..."
                    : mode === "signin"
                      ? "Sign In"
                      : "Create Account"}
                </button>
              </div>
            </form>

            <hr className={separatorStyle} />

            <div className={flex({ justify: "center" })}>
              <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>
                {mode === "signin" ? "No account? " : "Already have an account? "}
                <span
                  className={css({
                    fontSize: "sm",
                    color: "accent.primary",
                    cursor: "pointer",
                    _hover: { textDecoration: "underline" },
                  })}
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                >
                  {mode === "signin" ? "Sign up" : "Sign in"}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
