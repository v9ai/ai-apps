"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the component tree,
 * logs those errors, and displays a fallback UI instead of crashing the app.
 *
 * Usage:
 * <ErrorBoundary fallback={<CustomFallback />}>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log to error reporting service (e.g., Sentry, LogRocket)
    // You can integrate your preferred error tracking here
  }

  public reset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className={css({ maxWidth: "640px", mx: "auto", px: "4", py: "6" })}>
          <div
            role="alert"
            className={css({
              p: "4",
              border: "1px solid",
              borderColor: "status.negative",
              bg: "ui.surface",
            })}
          >
            <h2 className={css({ fontSize: "xl", fontWeight: "semibold", color: "ui.heading", mb: "2" })}>
              Something went wrong
            </h2>
            <p className={css({ fontSize: "sm", color: "ui.body", mb: "3" })}>
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <div className={css({ mt: "4" })}>
              <button className={button({ variant: "solid" })} onClick={this.reset}>
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-Order Component wrapper for ErrorBoundary
 *
 * Usage:
 * const ProtectedComponent = withErrorBoundary(YourComponent);
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  ErrorFallback?: React.ComponentType<{ error: Error | null; reset: () => void }>,
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary
        fallback={
          ErrorFallback ? (
            <ErrorFallback error={null} reset={() => {}} />
          ) : undefined
        }
      >
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
