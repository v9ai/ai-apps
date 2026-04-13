"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Eye, X } from "lucide-react";
import { css } from "styled-system/css";

const overlayClass = css({
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.6)",
  backdropFilter: "blur(4px)",
  zIndex: 50,
});

const contentClass = css({
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "90vw",
  height: "90vh",
  maxWidth: "1400px",
  background: "var(--color-surface)",
  borderRadius: "var(--radius-3)",
  boxShadow: "0 16px 70px rgba(0,0,0,0.2)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  zIndex: 51,
  _focus: { outline: "none" },
});

const headerClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "var(--space-3) var(--space-4)",
  borderBottom: "1px solid var(--gray-a5)",
  flexShrink: 0,
});

const titleClass = css({
  fontSize: "var(--font-size-2)",
  fontWeight: "500",
  color: "var(--gray-12)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  marginRight: "var(--space-3)",
});

const bodyClass = css({
  flex: 1,
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

const triggerBtnClass = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "32px",
  height: "32px",
  borderRadius: "var(--radius-2)",
  border: "none",
  background: "transparent",
  color: "var(--gray-11)",
  cursor: "pointer",
  transition: "background 100ms, color 100ms",
  _hover: {
    background: "var(--indigo-a3)",
    color: "var(--indigo-11)",
  },
});

const closeBtnClass = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "28px",
  height: "28px",
  borderRadius: "var(--radius-2)",
  border: "none",
  background: "transparent",
  color: "var(--gray-11)",
  cursor: "pointer",
  flexShrink: 0,
  _hover: {
    background: "var(--gray-a4)",
  },
});

function isPdf(name: string) {
  return /\.pdf$/i.test(name);
}

export function FilePreviewModal({
  testId,
  fileName,
}: {
  testId: string;
  fileName: string;
}) {
  const src = `/api/blood-tests/${testId}/file`;

  return (
    <Dialog.Root>
      <span onClick={(e) => e.stopPropagation()}>
        <Dialog.Trigger asChild>
          <button className={triggerBtnClass} aria-label="Preview file">
            <Eye size={18} />
          </button>
        </Dialog.Trigger>
      </span>

      <Dialog.Portal>
        <Dialog.Overlay className={overlayClass} />
        <Dialog.Content className={contentClass}>
          <div className={headerClass}>
            <Dialog.Title className={titleClass}>{fileName}</Dialog.Title>
            <Dialog.Close asChild>
              <button className={closeBtnClass} aria-label="Close">
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <div className={bodyClass}>
            {isPdf(fileName) ? (
              <iframe
                src={src}
                title={fileName}
                style={{ width: "100%", height: "100%", border: "none" }}
              />
            ) : (
              <img
                src={src}
                alt={fileName}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
              />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
