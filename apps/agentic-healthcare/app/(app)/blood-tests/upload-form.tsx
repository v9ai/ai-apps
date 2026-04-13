"use client";

import { uploadBloodTest, uploadBloodTestNoRedirect, getExistingFileNames } from "./actions";
import { Box, Button, Callout, Flex, Text, Progress } from "@radix-ui/themes";
import { UploadIcon } from "@radix-ui/react-icons";
import { useFormStatus } from "react-dom";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { css } from "styled-system/css";

const ACCEPTED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);
const ACCEPTED_EXT = /\.(pdf|jpe?g|png)$/i;

const dropZoneClass = css({
  border: "2px dashed var(--indigo-a6)",
  borderRadius: "var(--radius-3)",
  padding: "var(--space-8)",
  textAlign: "center",
  transition: "border-color 150ms ease, background 150ms ease",
  _hover: {
    borderColor: "var(--indigo-a8)",
    background: "var(--indigo-a2)",
  },
});

const dateInputClass = css({
  fontSize: "var(--font-size-2)",
  color: "var(--gray-12)",
  padding: "var(--space-2) var(--space-3)",
  border: "1px solid var(--gray-a6)",
  borderRadius: "var(--radius-2)",
  background: "var(--color-background)",
  width: "100%",
  maxWidth: "220px",
  outline: "none",
  _focus: {
    borderColor: "var(--indigo-a8)",
    boxShadow: "0 0 0 1px var(--indigo-a6)",
  },
});

const toggleClass = css({
  display: "flex",
  gap: "0",
  border: "1px solid var(--gray-a6)",
  borderRadius: "var(--radius-2)",
  overflow: "hidden",
});

const toggleBtnClass = css({
  padding: "var(--space-1) var(--space-3)",
  fontSize: "var(--font-size-2)",
  fontWeight: "500",
  cursor: "pointer",
  border: "none",
  background: "transparent",
  color: "var(--gray-11)",
  transition: "background 100ms, color 100ms",
});

const toggleBtnActiveClass = css({
  background: "var(--indigo-a3)",
  color: "var(--indigo-11)",
});

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="3">
      <UploadIcon />
      {pending ? "Processing..." : "Upload & Extract"}
    </Button>
  );
}

export function UploadForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"file" | "directory">("file");
  const [error, setError] = useState<string | null>(null);
  const [dirFiles, setDirFiles] = useState<File[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    currentFile: string;
    results: { fileName: string; ok: boolean; error?: string }[];
  } | null>(null);
  const [isBatchUploading, startBatch] = useTransition();
  const dirInputRef = useRef<HTMLInputElement>(null);

  async function handleSingleAction(formData: FormData) {
    setError(null);
    try {
      await uploadBloodTest(formData);
    } catch (e: any) {
      if (e?.digest?.startsWith("NEXT_REDIRECT")) throw e;
      setError(e?.message ?? "Upload failed. Is the processing server running?");
    }
  }

  async function handleDirChange(e: React.ChangeEvent<HTMLInputElement>) {
    const all = Array.from(e.target.files ?? []);
    const valid = all.filter(
      (f) => ACCEPTED.has(f.type) || ACCEPTED_EXT.test(f.name),
    );
    setError(null);
    setBatchProgress(null);

    const existing = new Set(await getExistingFileNames());
    const newFiles = valid.filter((f) => !existing.has(f.name));
    setSkippedCount(valid.length - newFiles.length);
    setDirFiles(newFiles);
  }

  function handleBatchUpload(testDate: string) {
    if (dirFiles.length === 0) return;
    setError(null);

    startBatch(async () => {
      const results: { fileName: string; ok: boolean; error?: string }[] = [];
      let consecutiveFailures = 0;

      for (let i = 0; i < dirFiles.length; i++) {
        const file = dirFiles[i];
        setBatchProgress({
          current: i + 1,
          total: dirFiles.length,
          currentFile: file.name,
          results: [...results],
        });

        try {
          const fd = new FormData();
          fd.append("file", file);
          if (testDate) fd.append("test_date", testDate);
          await uploadBloodTestNoRedirect(fd);
          results.push({ fileName: file.name, ok: true });
          consecutiveFailures = 0;
        } catch (e: any) {
          results.push({ fileName: file.name, ok: false, error: e?.message ?? "Failed" });
          consecutiveFailures++;
          if (consecutiveFailures >= 2) {
            for (let j = i + 1; j < dirFiles.length; j++) {
              results.push({ fileName: dirFiles[j].name, ok: false, error: "Skipped — server unreachable" });
            }
            break;
          }
        }
      }

      setBatchProgress({
        current: dirFiles.length,
        total: dirFiles.length,
        currentFile: "",
        results,
      });

      setDirFiles([]);
      if (dirInputRef.current) dirInputRef.current.value = "";
      if (results.some((r) => r.ok)) router.refresh();
    });
  }

  const done = batchProgress && batchProgress.current === batchProgress.total && !batchProgress.currentFile;
  const successCount = batchProgress?.results.filter((r) => r.ok).length ?? 0;
  const failCount = batchProgress?.results.filter((r) => !r.ok).length ?? 0;

  return (
    <Flex direction="column" gap="4">
      {error && (
        <Callout.Root color="red">
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}

      <Flex align="center" gap="3">
        <Text size="2" color="gray" weight="medium">Mode</Text>
        <div className={toggleClass}>
          <button
            type="button"
            className={`${toggleBtnClass} ${mode === "file" ? toggleBtnActiveClass : ""}`}
            onClick={() => { setMode("file"); setBatchProgress(null); setDirFiles([]); }}
          >
            Single file
          </button>
          <button
            type="button"
            className={`${toggleBtnClass} ${mode === "directory" ? toggleBtnActiveClass : ""}`}
            onClick={() => { setMode("directory"); setBatchProgress(null); }}
          >
            Directory
          </button>
        </div>
      </Flex>

      {mode === "file" ? (
        <form action={handleSingleAction}>
          <Flex direction="column" gap="4">
            <div className={dropZoneClass}>
              <Flex direction="column" align="center" gap="3">
                <UploadIcon width={28} height={28} color="var(--indigo-9)" />
                <Flex direction="column" align="center" gap="1">
                  <Text size="2" weight="medium">Choose a file to upload</Text>
                  <Text size="1" color="gray">PDF or image (JPG, PNG)</Text>
                </Flex>
                <input
                  type="file"
                  name="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  required
                  className={css({ fontSize: "var(--font-size-2)", color: "var(--gray-11)" })}
                />
              </Flex>
            </div>
            <Flex align="end" gap="4">
              <Flex direction="column" gap="1">
                <Text size="2" color="gray" weight="medium">Test date</Text>
                <input type="date" name="test_date" className={dateInputClass} />
              </Flex>
              <Box>
                <SubmitButton />
              </Box>
            </Flex>
          </Flex>
        </form>
      ) : (
        <DirectoryUpload
          dirInputRef={dirInputRef}
          dirFiles={dirFiles}
          skippedCount={skippedCount}
          onDirChange={handleDirChange}
          onBatchUpload={handleBatchUpload}
          isBatchUploading={isBatchUploading}
          batchProgress={batchProgress}
          done={done}
          successCount={successCount}
          failCount={failCount}
        />
      )}
    </Flex>
  );
}

function DirectoryUpload({
  dirInputRef,
  dirFiles,
  onDirChange,
  onBatchUpload,
  isBatchUploading,
  batchProgress,
  done,
  successCount,
  failCount,
}: {
  dirInputRef: React.RefObject<HTMLInputElement | null>;
  dirFiles: File[];
  onDirChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBatchUpload: (testDate: string) => void;
  isBatchUploading: boolean;
  batchProgress: {
    current: number;
    total: number;
    currentFile: string;
    results: { fileName: string; ok: boolean; error?: string }[];
  } | null;
  done: boolean | null | undefined;
  successCount: number;
  failCount: number;
}) {
  const [testDate, setTestDate] = useState("");

  return (
    <Flex direction="column" gap="4">
      <div className={dropZoneClass}>
        <Flex direction="column" align="center" gap="3">
          <UploadIcon width={28} height={28} color="var(--indigo-9)" />
          <Flex direction="column" align="center" gap="1">
            <Text size="2" weight="medium">Choose a directory</Text>
            <Text size="1" color="gray">
              All PDF and image files will be found recursively
            </Text>
          </Flex>
          <input
            ref={dirInputRef}
            type="file"
            /* @ts-expect-error webkitdirectory is non-standard but widely supported */
            webkitdirectory=""
            directory=""
            multiple
            onChange={onDirChange}
            className={css({ fontSize: "var(--font-size-2)", color: "var(--gray-11)" })}
          />
        </Flex>
      </div>

      {dirFiles.length > 0 && !isBatchUploading && (
        <Callout.Root color="blue">
          <Callout.Text>
            Found <strong>{dirFiles.length}</strong> file{dirFiles.length !== 1 && "s"} (PDF, JPG, PNG)
          </Callout.Text>
        </Callout.Root>
      )}

      {batchProgress && !done && (
        <Flex direction="column" gap="2">
          <Progress
            value={Math.round(((batchProgress.current - 1) / batchProgress.total) * 100)}
            size="3"
          />
          <Text size="2" color="gray">
            Uploading {batchProgress.current} of {batchProgress.total}: {batchProgress.currentFile}
          </Text>
        </Flex>
      )}

      {done && (
        <Callout.Root color={failCount > 0 ? "yellow" : "green"}>
          <Callout.Text>
            Done — {successCount} uploaded{failCount > 0 && `, ${failCount} failed`}
          </Callout.Text>
        </Callout.Root>
      )}

      {done && failCount > 0 && batchProgress && (
        <Flex direction="column" gap="1">
          {batchProgress.results
            .filter((r) => !r.ok)
            .map((r) => (
              <Text key={r.fileName} size="1" color="red">
                {r.fileName}: {r.error}
              </Text>
            ))}
        </Flex>
      )}

      <Flex align="end" gap="4">
        <Flex direction="column" gap="1">
          <Text size="2" color="gray" weight="medium">Test date (all files)</Text>
          <input
            type="date"
            value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
            className={dateInputClass}
          />
        </Flex>
        <Box>
          <Button
            size="3"
            disabled={dirFiles.length === 0 || isBatchUploading}
            onClick={() => onBatchUpload(testDate)}
          >
            <UploadIcon />
            {isBatchUploading
              ? "Processing..."
              : `Upload ${dirFiles.length} file${dirFiles.length !== 1 ? "s" : ""}`}
          </Button>
        </Box>
      </Flex>
    </Flex>
  );
}
