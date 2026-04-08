"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
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

const container = css({ maxWidth: "768px", mx: "auto", px: "8", py: "6" });
const flexCol = css({ display: "flex", flexDirection: "column" });
const card = css({
  border: "1px solid",
  borderColor: "ui.border",
  borderRadius: "lg",
  p: "6",
  bg: "ui.subtle",
});
const chipBadge = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1",
  px: "2",
  py: "0.5",
  borderRadius: "sm",
  fontSize: "sm",
  fontWeight: "medium",
  color: "var(--red-11)",
  bg: "var(--red-a3)",
  pr: "1",
});
const inputStyle = css({
  width: "100%",
  px: "3",
  py: "2",
  fontSize: "sm",
  border: "1px solid",
  borderColor: "ui.border",
  borderRadius: "md",
  bg: "transparent",
  color: "ui.primary",
  _placeholder: { color: "ui.tertiary" },
  _focus: { outline: "2px solid", outlineColor: "accent.primary", outlineOffset: "-1px" },
});

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
  const dialogRef = useRef<HTMLDialogElement>(null);

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

  useEffect(() => {
    if (showDiscardDialog) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [showDiscardDialog]);

  const hasUnsavedChanges = useCallback(
    () =>
      JSON.stringify(sortBy(excludedCompaniesChips)) !==
      JSON.stringify(sortBy(initialExcludedCompanies)),
    [excludedCompaniesChips, initialExcludedCompanies],
  );

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
      <div className={container}>
        <span className={css({ color: "ui.primary" })}>Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={container}>
        <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
          <h1 className={css({ fontSize: "2xl", fontWeight: "bold" })}>Settings</h1>
          <span>You must be signed in to access settings.</span>
          <Link href="/" className={button({ variant: "solid" })}>
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={container}>
      <div className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
        {/* Breadcrumb */}
        <div className={css({ display: "flex", alignItems: "center", gap: "2" })}>
          <Link href="/" style={{ textDecoration: "none" }} className={css({ color: "ui.secondary" })}>
            <span className={css({ fontSize: "md", fontWeight: "medium" })}>Home</span>
          </Link>
          <ChevronRightIcon className={css({ color: "ui.tertiary" })} />
          <span className={css({ fontSize: "md", fontWeight: "medium" })}>Settings</span>
        </div>

        {/* Excluded Companies */}
        <div className={card}>
          <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
            <div className={css({ display: "flex", flexDirection: "column", gap: "1" })}>
              <h2 className={css({ fontSize: "xl", fontWeight: "bold" })}>Excluded Companies</h2>
              <span className={css({ fontSize: "sm", color: "ui.secondary" })}>
                Companies hidden from outreach and company listings
              </span>
            </div>

            <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
              {excludedCompaniesChips.length > 0 && (
                <div className={css({ display: "flex", gap: "2", flexWrap: "wrap" })}>
                  {excludedCompaniesChips.map((company) => (
                    <span key={company} className={chipBadge}>
                      {company}
                      <Cross2Icon
                        style={{ cursor: "pointer", width: "14px", height: "14px" }}
                        onClick={() =>
                          setExcludedCompaniesChips(excludedCompaniesChips.filter((c) => c !== company))
                        }
                      />
                    </span>
                  ))}
                </div>
              )}

              <input
                ref={excludedCompaniesInputRef}
                className={inputStyle}
                placeholder="company-name, another-company, etc."
                value={excludedCompaniesInput}
                onChange={(e) => setExcludedCompaniesInput(e.target.value)}
                onKeyDown={handleExcludedCompaniesKeyDown}
                onBlur={() => {
                  if (excludedCompaniesInput.trim()) addExcludedCompanyChip(excludedCompaniesInput);
                }}
              />

              <span className={css({ fontSize: "xs", color: "ui.secondary" })}>
                Press Enter or comma to add -- Backspace to remove
              </span>
            </div>

            {excludedCompaniesChips.length === 0 && (
              <div className={css({ display: "flex", alignItems: "center", gap: "2", p: "3", borderRadius: "md", bg: "var(--gray-a3)", color: "var(--gray-11)", fontSize: "sm" })}>
                <InfoCircledIcon />
                <span>No companies excluded yet</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className={css({ display: "flex", justifyContent: "flex-end", gap: "3", alignItems: "center" })}>
          {saveStatus === "saved" && (
            <div className={css({ display: "flex", alignItems: "center", gap: "2", color: "status.positive" })}>
              <CheckIcon />
              <span className={css({ fontSize: "sm", fontWeight: "medium" })}>Saved</span>
            </div>
          )}

          <button className={button({ variant: "ghost" })} onClick={handleCancel}>
            Cancel
          </button>

          <button
            className={button({ variant: "solid" })}
            onClick={handleSave}
            disabled={updateLoading || !hasUnsavedChanges()}
          >
            {saveStatus === "saving" ? "Saving..." : "Save"}
          </button>

          {hasUnsavedChanges() && saveStatus === "idle" && (
            <span className={css({ fontSize: "xs", color: "ui.secondary" })}>Cmd+Enter to save</span>
          )}
        </div>
      </div>

      {/* Discard Dialog */}
      <dialog
        ref={dialogRef}
        className={css({
          maxWidth: "450px",
          width: "90%",
          p: "6",
          borderRadius: "lg",
          border: "1px solid",
          borderColor: "ui.border",
          bg: "ui.background",
          color: "ui.primary",
          _backdrop: { bg: "rgba(0, 0, 0, 0.5)" },
        })}
        onClose={() => setShowDiscardDialog(false)}
      >
        <h3 className={css({ fontSize: "lg", fontWeight: "bold", mb: "2" })}>Discard changes?</h3>
        <p className={css({ fontSize: "sm", color: "ui.secondary", mb: "4" })}>
          You have unsaved changes. Are you sure you want to discard them?
        </p>
        <div className={css({ display: "flex", gap: "3", justifyContent: "flex-end", mt: "4" })}>
          <button className={button({ variant: "ghost" })} onClick={() => setShowDiscardDialog(false)}>
            Keep editing
          </button>
          <button className={button({ variant: "solid" })} onClick={handleDiscard}>
            Discard changes
          </button>
        </div>
      </dialog>

      {/* Toast */}
      {toast.show && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            padding: "12px 20px",
            backgroundColor: toast.type === "success" ? "#30A46C" : "var(--red-9)",
            color: "white",
            borderRadius: 0,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
          }}
        >
          <div className={css({ display: "flex", alignItems: "center", gap: "2" })}>
            {toast.type === "success" && <CheckIcon />}
            <span className={css({ fontSize: "sm", fontWeight: "medium" })}>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return <SettingsPageContent />;
}
