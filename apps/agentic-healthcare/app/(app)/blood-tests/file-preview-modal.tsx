"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { IconButton } from "@radix-ui/themes";
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
          <IconButton variant="ghost" color="gray" size="1" aria-label="Preview file">
            <Eye size={14} />
          </IconButton>
        </Dialog.Trigger>
      </span>

      <Dialog.Portal>
        <Dialog.Overlay className={overlayClass} />
        <Dialog.Content className={contentClass}>
          <div className={headerClass}>
            <Dialog.Title className={titleClass}>{fileName}</Dialog.Title>
            <Dialog.Close asChild>
              <IconButton variant="ghost" color="gray" size="1" aria-label="Close">
                <X size={14} />
              </IconButton>
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
