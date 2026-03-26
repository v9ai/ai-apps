"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  Button,
  Flex,
  Text,
  TextField,
  Separator,
} from "@radix-ui/themes";
import { authClient } from "@/lib/auth/client";

type Mode = "signin" | "signup";

interface AuthDialogProps {
  trigger?: React.ReactNode;
  defaultMode?: Mode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

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

  useEffect(() => {
    if (open) {
      setMode(defaultMode);
      setEmail("");
      setPassword("");
      setName("");
      setError(null);
    }
  }, [open, defaultMode]);

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
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {trigger && <Dialog.Trigger>{trigger}</Dialog.Trigger>}
      <Dialog.Content style={{ maxWidth: 400 }}>
        <Dialog.Title>
          {mode === "signin" ? "Sign In" : "Create Account"}
        </Dialog.Title>
        <Dialog.Description size="2" mb="4" color="gray">
          {mode === "signin"
            ? "Sign in to your account."
            : "Create a new account."}
        </Dialog.Description>

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="3">
            {mode === "signup" && (
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Name
                </Text>
                <TextField.Root
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </label>
            )}

            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Email
              </Text>
              <TextField.Root
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </label>

            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Password
              </Text>
              <TextField.Root
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </label>

            {error && (
              <Text size="2" color="red">
                {error}
              </Text>
            )}

            <Button type="submit" disabled={loading} mt="2">
              {loading
                ? "Loading..."
                : mode === "signin"
                  ? "Sign In"
                  : "Create Account"}
            </Button>
          </Flex>
        </form>

        <Separator size="4" my="4" />

        <Flex justify="center">
          <Text size="2" color="gray">
            {mode === "signin" ? "No account? " : "Already have an account? "}
            <Text
              size="2"
              color="indigo"
              style={{ cursor: "pointer" }}
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </Text>
          </Text>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
