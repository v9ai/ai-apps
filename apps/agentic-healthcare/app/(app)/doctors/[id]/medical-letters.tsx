"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Box, Button, Card, Flex, Heading, Text, Badge } from "@radix-ui/themes";
import { FileText, Trash2 } from "lucide-react";
import { uploadMedicalLetter, deleteMedicalLetter } from "../actions";

type MedicalLetter = {
  id: string;
  fileName: string;
  description: string | null;
  letterDate: string | null;
  uploadedAt: Date;
};

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="2" disabled={pending}>
      {pending ? "Uploading…" : "Upload letter"}
    </Button>
  );
}

export function MedicalLettersSection({
  doctorId,
  initialLetters,
}: {
  doctorId: string;
  initialLetters: MedicalLetter[];
}) {
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(formData: FormData) {
    setError(null);
    try {
      await uploadMedicalLetter(doctorId, formData);
    } catch (e: unknown) {
      const err = e as { digest?: string; message?: string };
      if (err?.digest?.startsWith("NEXT_REDIRECT")) throw e;
      setError(err?.message ?? "Upload failed.");
    }
  }

  return (
    <Flex direction="column" gap="4">
      <Heading size="4">Medical letters</Heading>

      {initialLetters.length > 0 && (
        <Flex direction="column" gap="2">
          {initialLetters.map((letter) => (
            <Card key={letter.id}>
              <Flex align="center" justify="between" gap="3">
                <Flex align="center" gap="2" style={{ flex: 1, minWidth: 0 }}>
                  <FileText size={15} color="var(--gray-8)" style={{ flexShrink: 0 }} />
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      size="2"
                      weight="medium"
                      style={{
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {letter.fileName}
                    </Text>
                    {letter.description && (
                      <Text size="1" color="gray">
                        {letter.description}
                      </Text>
                    )}
                  </Box>
                  {letter.letterDate && (
                    <Badge variant="soft" color="gray" size="1" style={{ flexShrink: 0 }}>
                      {new Date(letter.letterDate + "T00:00:00").toLocaleDateString()}
                    </Badge>
                  )}
                </Flex>
                <Flex align="center" gap="2">
                  <Button size="1" variant="soft" asChild>
                    <a
                      href={`/api/medical-letters/${letter.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View
                    </a>
                  </Button>
                  <form action={deleteMedicalLetter.bind(null, letter.id, doctorId)}>
                    <Button size="1" variant="ghost" color="red" type="submit">
                      <Trash2 size={13} />
                    </Button>
                  </form>
                </Flex>
              </Flex>
            </Card>
          ))}
        </Flex>
      )}

      {initialLetters.length === 0 && (
        <Text size="2" color="gray">
          No letters uploaded yet.
        </Text>
      )}

      <Card>
        <form action={handleUpload}>
          <Flex direction="column" gap="3">
            {error && (
              <Text size="2" color="red">
                {error}
              </Text>
            )}
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                File
              </Text>
              <input
                type="file"
                name="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                required
                style={{ fontSize: "var(--font-size-2)", color: "var(--gray-12)" }}
              />
              <Text size="1" color="gray">
                PDF, image, or Word document
              </Text>
            </Flex>
            <Flex direction="column" gap="1">
              <Text size="2" color="gray">
                Description (optional)
              </Text>
              <input
                type="text"
                name="description"
                placeholder="e.g. Referral, lab report, discharge summary…"
                style={{
                  fontSize: "var(--font-size-2)",
                  color: "var(--gray-12)",
                  padding: "6px 8px",
                  border: "1px solid var(--gray-6)",
                  borderRadius: "var(--radius-2)",
                  background: "transparent",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
            </Flex>
            <Flex direction="column" gap="1">
              <Text size="2" color="gray">
                Letter date (optional)
              </Text>
              <input
                type="date"
                name="letter_date"
                style={{ fontSize: "var(--font-size-2)", color: "var(--gray-12)" }}
              />
            </Flex>
            <Box>
              <UploadButton />
            </Box>
          </Flex>
        </form>
      </Card>
    </Flex>
  );
}
