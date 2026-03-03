export { Card } from "@radix-ui/themes";

export function CardHeader({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "var(--space-4) var(--space-4) 0" }}>{children}</div>;
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: "var(--font-size-5)", fontWeight: "var(--font-weight-bold)", marginBottom: "var(--space-1)" }}>{children}</h2>;
}

export function CardDescription({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: "var(--font-size-2)", color: "var(--gray-9)" }}>{children}</p>;
}

export function CardContent({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "var(--space-4)" }}>{children}</div>;
}
