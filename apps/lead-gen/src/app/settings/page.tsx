"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Container,
  Heading,
  Text,
  Flex,
  Card,
  TextField,
  Button,
  Badge,
  Dialog,
  Callout,
} from "@radix-ui/themes";
import {
  InfoCircledIcon,
  Cross2Icon,
  ChevronRightIcon,
  CheckIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-hooks";
import {
  useGetUserSettingsQuery,
  useUpdateUserSettingsMutation,
} from "@/__generated__/hooks";
import { sortBy } from "lodash";

export const dynamic = "force-dynamic";

interface ToastState {
  show: boolean;
  message: string;
  type: "success" | "error";
}

function SettingsPageContent() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [excludedCompaniesChips, setExcludedCompaniesChips] = useState<string[]>([]);
  const [excludedCompaniesInput, setExcludedCompaniesInput] = useState("");
  const [initialExcludedCompanies, setInitialExcludedCompanies] = useState<string[]>([]);

  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: "",
    type: "success",
  });

  const excludedCompaniesInputRef = useRef<HTMLInputElement>(null);

  const {
    data,
    loading: settingsLoading,
    refetch,
  } = useGetUserSettingsQuery({
    variables: { userId: user?.id || "" },
    skip: !user?.id,
  });

  const [updateSettings, { loading: updateLoading }] = useUpdateUserSettingsMutation();

  useEffect(() => {
    if (data?.userSettings) {
      const excluded = data.userSettings.excluded_companies || [];
      setExcludedCompaniesChips(excluded);
      setInitialExcludedCompanies(excluded);
    }
  }, [data]);

  const hasUnsavedChanges = () =>
    JSON.stringify(sortBy(excludedCompaniesChips)) !==
    JSON.stringify(sortBy(initialExcludedCompanies));

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  const addExcludedCompanyChip = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !excludedCompaniesChips.includes(trimmed)) {
      setExcludedCompaniesChips([...excludedCompaniesChips, trimmed]);
      setExcludedCompaniesInput("");
    }
  };

  const handleExcludedCompaniesKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addExcludedCompanyChip(excludedCompaniesInput);
    } else if (e.key === "Backspace" && excludedCompaniesInput === "" && excludedCompaniesChips.length > 0) {
      setExcludedCompaniesChips(excludedCompaniesChips.slice(0, -1));
    }
  };

  const handleSave = useCallback(async () => {
    if (!user?.id) {
      showToast("You must be signed in to save settings", "error");
      return;
    }

    setSaveStatus("saving");

    try {
      await updateSettings({
        variables: {
          userId: user.id,
          settings: {
            excluded_companies: excludedCompaniesChips,
          },
        },
      });

      await refetch();
      setInitialExcludedCompanies(excludedCompaniesChips);
      setSaveStatus("saved");
      showToast("Settings saved successfully!", "success");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setSaveStatus("idle");
      showToast("Failed to save settings. Please try again.", "error");
    }
  }, [user?.id, excludedCompaniesChips, updateSettings, refetch]);

  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges()) {
      setShowDiscardDialog(true);
    } else {
      router.push("/");
    }
  }, [hasUnsavedChanges, router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (hasUnsavedChanges()) handleSave();
      } else if (e.key === "Escape") {
        handleCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, handleCancel, hasUnsavedChanges]);

  const handleDiscard = () => {
    setExcludedCompaniesChips(initialExcludedCompanies);
    setShowDiscardDialog(false);
    router.push("/");
  };

  if (loading || settingsLoading) {
    return (
      <Container size="3" px="8" py="6">
        <Text>Loading...</Text>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container size="3" px="8" py="6">
        <Flex direction="column" gap="4">
          <Heading size="8">Settings</Heading>
          <Text>You must be signed in to access settings.</Text>
          <Link href="/">
            <Button>Go to Home</Button>
          </Link>
        </Flex>
      </Container>
    );
  }

  return (
    <Container size="3" px="8" py="6">
      <Flex direction="column" gap="6">
        {/* Breadcrumb */}
        <Flex align="center" gap="2">
          <Link href="/" style={{ textDecoration: "none", color: "var(--gray-11)" }}>
            <Text size="3" weight="medium">Home</Text>
          </Link>
          <ChevronRightIcon style={{ color: "var(--gray-9)" }} />
          <Text size="3" weight="medium">Settings</Text>
        </Flex>

        {/* Excluded Companies */}
        <Card size="3">
          <Flex direction="column" gap="4">
            <Flex direction="column" gap="1">
              <Heading size="5">Excluded Companies</Heading>
              <Text size="2" color="gray">
                Companies hidden from outreach and company listings
              </Text>
            </Flex>

            <Flex direction="column" gap="2">
              {excludedCompaniesChips.length > 0 && (
                <Flex gap="2" wrap="wrap">
                  {excludedCompaniesChips.map((company, index) => (
                    <Badge key={index} size="2" variant="soft" color="red" style={{ paddingRight: "4px" }}>
                      <Flex align="center" gap="1">
                        {company}
                        <Cross2Icon
                          style={{ cursor: "pointer", width: "14px", height: "14px" }}
                          onClick={() =>
                            setExcludedCompaniesChips(excludedCompaniesChips.filter((_, i) => i !== index))
                          }
                        />
                      </Flex>
                    </Badge>
                  ))}
                </Flex>
              )}

              <TextField.Root
                ref={excludedCompaniesInputRef}
                placeholder="company-name, another-company, etc."
                value={excludedCompaniesInput}
                onChange={(e) => setExcludedCompaniesInput(e.target.value)}
                onKeyDown={handleExcludedCompaniesKeyDown}
                onBlur={() => {
                  if (excludedCompaniesInput.trim()) addExcludedCompanyChip(excludedCompaniesInput);
                }}
              />

              <Text size="1" color="gray">
                Press Enter or comma to add • Backspace to remove
              </Text>
            </Flex>

            {excludedCompaniesChips.length === 0 && (
              <Callout.Root color="gray" size="1">
                <Callout.Icon><InfoCircledIcon /></Callout.Icon>
                <Callout.Text>No companies excluded yet</Callout.Text>
              </Callout.Root>
            )}
          </Flex>
        </Card>

        {/* Action Buttons */}
        <Flex justify="end" gap="3" align="center">
          {saveStatus === "saved" && (
            <Flex align="center" gap="2" style={{ color: "var(--green-9)" }}>
              <CheckIcon />
              <Text size="2" weight="medium">Saved</Text>
            </Flex>
          )}

          <Button variant="soft" color="gray" onClick={handleCancel}>
            Cancel
          </Button>

          <Button
            onClick={handleSave}
            disabled={updateLoading || !hasUnsavedChanges()}
            loading={updateLoading}
          >
            {saveStatus === "saving" ? "Saving..." : "Save"}
          </Button>

          {hasUnsavedChanges() && saveStatus === "idle" && (
            <Text size="1" color="gray">⌘↵ to save</Text>
          )}
        </Flex>
      </Flex>

      {/* Discard Dialog */}
      <Dialog.Root open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <Dialog.Content style={{ maxWidth: 450 }} aria-describedby="discard-description">
          <Dialog.Title>Discard changes?</Dialog.Title>
          <Dialog.Description id="discard-description" size="2" mb="4">
            You have unsaved changes. Are you sure you want to discard them?
          </Dialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">Keep editing</Button>
            </Dialog.Close>
            <Button variant="solid" color="red" onClick={handleDiscard}>
              Discard changes
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Toast */}
      {toast.show && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            padding: "12px 20px",
            backgroundColor: toast.type === "success" ? "var(--green-9)" : "var(--red-9)",
            color: "white",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
          }}
        >
          <Flex align="center" gap="2">
            {toast.type === "success" && <CheckIcon />}
            <Text size="2" weight="medium">{toast.message}</Text>
          </Flex>
        </div>
      )}
    </Container>
  );
}

export default function SettingsPage() {
  return <SettingsPageContent />;
}
