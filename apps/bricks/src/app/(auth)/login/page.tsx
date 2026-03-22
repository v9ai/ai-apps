"use client";

import { useState } from "react";
import { css } from "styled-system/css";
import { signIn } from "@/lib/auth-client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    await signIn.email(
      { email, password },
      {
        onError: (ctx) => {
          setError(ctx.error.message);
          setLoading(false);
        },
        onSuccess: () => {
          window.location.href = "/";
        },
      }
    );
  }

  return (
    <div
      className={css({
        minH: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bg: "plate.base",
        px: "4",
      })}
    >
      <div
        className={css({
          w: "full",
          maxW: "400px",
          bg: "plate.surface",
          rounded: "brick",
          border: "2px solid",
          borderColor: "plate.border",
          boxShadow: "brick",
          p: "8",
        })}
      >
        <form onSubmit={handleSubmit}>
          {/* Studs */}
          <div
            className={css({
              display: "flex",
              justifyContent: "center",
              gap: "2",
              mb: "6",
            })}
          >
            {["#E3000B", "#FFD500", "#006CB7", "#00852B"].map((color, i) => (
              <div
                key={i}
                className={css({
                  w: "3.5",
                  h: "3.5",
                  rounded: "stud",
                  boxShadow: "stud",
                })}
                style={{ background: color }}
              />
            ))}
          </div>

          <h1
            className={css({
              fontSize: "2xl",
              fontWeight: "900",
              fontFamily: "display",
              textAlign: "center",
              color: "ink.primary",
              mb: "6",
            })}
          >
            Sign In
          </h1>

          {error && (
            <div
              className={css({
                mb: "4",
                rounded: "lg",
                border: "1px solid",
                borderColor: "rgba(227, 0, 11, 0.3)",
                bg: "rgba(227, 0, 11, 0.08)",
                px: "3",
                py: "2",
                fontSize: "sm",
                color: "#FF6B6B",
                textAlign: "center",
              })}
            >
              {error}
            </div>
          )}

          <div className={css({ display: "flex", flexDir: "column", gap: "4" })}>
            <div>
              <label
                className={css({
                  display: "block",
                  fontSize: "sm",
                  fontWeight: "600",
                  color: "ink.secondary",
                  mb: "1.5",
                })}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className={css({
                  w: "full",
                  bg: "plate.raised",
                  border: "1px solid",
                  borderColor: "plate.border",
                  rounded: "lg",
                  px: "3",
                  py: "2.5",
                  fontSize: "sm",
                  color: "ink.primary",
                  outline: "none",
                  transition: "border-color 0.15s",
                  _placeholder: { color: "ink.faint" },
                  _focus: { borderColor: "lego.orange" },
                })}
              />
            </div>

            <div>
              <label
                className={css({
                  display: "block",
                  fontSize: "sm",
                  fontWeight: "600",
                  color: "ink.secondary",
                  mb: "1.5",
                })}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className={css({
                  w: "full",
                  bg: "plate.raised",
                  border: "1px solid",
                  borderColor: "plate.border",
                  rounded: "lg",
                  px: "3",
                  py: "2.5",
                  fontSize: "sm",
                  color: "ink.primary",
                  outline: "none",
                  transition: "border-color 0.15s",
                  _placeholder: { color: "ink.faint" },
                  _focus: { borderColor: "lego.orange" },
                })}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={css({
                mt: "2",
                w: "full",
                rounded: "lg",
                bg: "lego.red",
                py: "2.5",
                fontSize: "sm",
                fontWeight: "800",
                fontFamily: "display",
                color: "white",
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #A30008, 0 3px 6px rgba(0,0,0,0.3)",
                _hover: {
                  bg: "#FF1A1A",
                  transform: "translateY(-1px)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.25), 0 3px 0 #A30008, 0 5px 10px rgba(0,0,0,0.35)",
                },
                _active: {
                  transform: "translateY(1px)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.1), 0 1px 0 #A30008, 0 1px 3px rgba(0,0,0,0.2)",
                },
                _disabled: { opacity: 0.5, cursor: "not-allowed" },
              })}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </div>

          <p
            className={css({
              mt: "6",
              textAlign: "center",
              fontSize: "sm",
              color: "ink.muted",
            })}
          >
            Don&apos;t have an account?{" "}
            <a
              href="/signup"
              className={css({
                color: "lego.orange",
                fontWeight: "600",
                textDecoration: "none",
                _hover: { textDecoration: "underline" },
              })}
            >
              Sign up
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
