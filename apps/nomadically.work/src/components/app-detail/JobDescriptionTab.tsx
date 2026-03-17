"use client";

import {
  Heading,
  Button,
  Flex,
  Text,
  Box,
  Card,
  TextArea,
} from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useUpdateApplicationMutation } from "@/__generated__/hooks";
import type { TabBaseProps } from "./types";

interface JobDescriptionTabProps extends TabBaseProps {
  refetch: () => Promise<any>;
}

export function JobDescriptionTab({
  app,
  isAdmin,
  refetch,
}: JobDescriptionTabProps) {
  const [updateApplication] = useUpdateApplicationMutation();

  const [editingJobDescription, setEditingJobDescription] = useState(false);
  const [jobDescriptionValue, setJobDescriptionValue] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");

  const handleSaveJobDescription = async () => {
    if (!app) return;
    await updateApplication({
      variables: { id: app.id, input: { jobDescription: jobDescriptionValue } },
      refetchQueries: ["GetApplication"],
    });
    setEditingJobDescription(false);
  };

  const handleSaveNotes = async () => {
    await updateApplication({
      variables: { id: app.id, input: { notes: notesValue } },
      refetchQueries: ["GetApplication"],
    });
    setEditingNotes(false);
  };

  return (
    <>
      {/* Job description card */}
      <Card mb="5" id="job-description" style={{ borderLeft: "3px solid var(--accent-6)", borderRadius: 0 }}>
        <Flex justify="between" align="center" mb="3">
          <Heading size="4">Job Description</Heading>
          {isAdmin && !editingJobDescription && (
            <Button
              variant="soft"
              size="1"
              onClick={() => {
                setJobDescriptionValue(app.jobDescription ?? "");
                setEditingJobDescription(true);
              }}
            >
              {app.jobDescription ? "Edit" : "Add"}
            </Button>
          )}
        </Flex>
        {editingJobDescription ? (
          <Flex direction="column" gap="2">
            <TextArea
              value={jobDescriptionValue}
              onChange={(e) => setJobDescriptionValue(e.target.value)}
              placeholder="Paste the job description here..."
              rows={12}
            />
            <Flex gap="2" justify="end">
              <Button
                variant="soft"
                color="gray"
                size="1"
                onClick={() => setEditingJobDescription(false)}
              >
                Cancel
              </Button>
              <Button size="1" onClick={handleSaveJobDescription}>
                Save
              </Button>
            </Flex>
          </Flex>
        ) : app.jobDescription ? (
          <Box className="deep-dive-content" style={{ lineHeight: 1.7, fontSize: "var(--font-size-2)" }}>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>
              {app.jobDescription}
            </pre>
          </Box>
        ) : (
          <Flex direction="column" align="center" justify="center" gap="2" py="6" style={{ opacity: 0.7 }}>
            <InfoCircledIcon width={24} height={24} color="var(--gray-8)" />
            <Text size="2" color="gray">No job description yet.</Text>
            {isAdmin && (
              <Button
                variant="soft"
                size="1"
                mt="1"
                onClick={() => {
                  setJobDescriptionValue("");
                  setEditingJobDescription(true);
                }}
              >
                Add
              </Button>
            )}
          </Flex>
        )}
        {/* Notes — merged into JD card */}
        <Box mt="5" pt="4" px="3" pb="3" style={{ borderTop: "1px solid var(--gray-4)", borderLeft: "3px solid var(--amber-6)", backgroundColor: "var(--amber-2)", borderRadius: 0 }}>
          <Flex justify="between" align="center" mb="3">
            <Heading size="4">Notes</Heading>
            {isAdmin && !editingNotes && (
              <Button
                variant="soft"
                size="1"
                onClick={() => { setNotesValue(app.notes ?? ""); setEditingNotes(true); }}
              >
                {app.notes ? "Edit" : "Add Notes"}
              </Button>
            )}
          </Flex>
          {editingNotes ? (
            <Flex direction="column" gap="2">
              <TextArea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder="Add notes about this application..."
                rows={4}
              />
              <Flex gap="2" justify="end">
                <Button variant="soft" color="gray" size="1" onClick={() => setEditingNotes(false)}>
                  Cancel
                </Button>
                <Button size="1" onClick={handleSaveNotes}>Save</Button>
              </Flex>
            </Flex>
          ) : (
            <Text size="2" color={app.notes ? undefined : "gray"}>
              {app.notes || "No notes yet."}
            </Text>
          )}
        </Box>
      </Card>

      {/* AI Interview Prep */}
      {app.aiInterviewQuestions && (
        <Card mb="5" style={{ borderLeft: "3px solid var(--violet-6)", borderRadius: 0 }}>
          <Heading size="4" mb="4">Interview Prep</Heading>
          <Box className="interview-prep-md">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <Heading size="5" mb="2" mt="4" style={{ color: "var(--violet-11)" }}>{children}</Heading>
                ),
                h2: ({ children }) => (
                  <Box mt="5" mb="2" pt="4" style={{ borderTop: "1px solid var(--gray-4)" }}>
                    <Heading size="4" style={{ color: "var(--violet-11)" }}>{children}</Heading>
                  </Box>
                ),
                h3: ({ children }) => (
                  <Box mt="4" mb="2" p="3" style={{ backgroundColor: "var(--violet-2)", borderLeft: "3px solid var(--violet-8)", borderRadius: 0 }}>
                    <Heading size="3">{children}</Heading>
                  </Box>
                ),
                p: ({ children }) => (
                  <Text as="p" size="2" mb="2" style={{ lineHeight: 1.7 }}>{children}</Text>
                ),
                strong: ({ children }) => (
                  <strong style={{ fontWeight: 600 }}>{children}</strong>
                ),
                em: ({ children }) => <em>{children}</em>,
                ul: ({ children }) => (
                  <Box as="ul" mb="3" style={{ paddingLeft: 20, lineHeight: 1.8 }}>{children}</Box>
                ),
                ol: ({ children }) => (
                  <Box as="ol" mb="3" style={{ paddingLeft: 20, lineHeight: 1.8 }}>{children}</Box>
                ),
                li: ({ children }) => (
                  <Text as="li" size="2" mb="1" style={{ lineHeight: 1.7 }}>{children}</Text>
                ),
                blockquote: ({ children }) => (
                  <Box mb="3" pl="3" style={{ borderLeft: "3px solid var(--gray-6)", color: "var(--gray-11)" }}>
                    {children}
                  </Box>
                ),
                code: ({ children, className }) => {
                  const isBlock = className?.includes("language-");
                  return isBlock ? (
                    <Box mb="3" p="3" style={{ backgroundColor: "var(--gray-2)", borderRadius: "var(--radius-2)", overflowX: "auto" }}>
                      <pre style={{ margin: 0, fontSize: "var(--font-size-1)", fontFamily: "var(--font-mono, monospace)", lineHeight: 1.6 }}>
                        <code>{children}</code>
                      </pre>
                    </Box>
                  ) : (
                    <code style={{ backgroundColor: "var(--gray-3)", padding: "1px 5px", borderRadius: "var(--radius-1)", fontSize: "0.9em", fontFamily: "var(--font-mono, monospace)" }}>
                      {children}
                    </code>
                  );
                },
                hr: () => <Box mb="4" style={{ borderTop: "1px solid var(--gray-4)" }} />,
              }}
            >
              {app.aiInterviewQuestions}
            </ReactMarkdown>
          </Box>
        </Card>
      )}

      {/* Questions & Answers */}
      {app.questions && app.questions.length > 0 && (
        <Card mb="5">
          <Heading size="4" mb="3">
            Questions & Answers ({app.questions.length})
          </Heading>
          <Flex direction="column" gap="3">
            {app.questions.map((q, idx) => (
              <Box
                key={q.questionId}
                p="3"
                style={{ backgroundColor: "var(--gray-2)", borderLeft: "3px solid var(--accent-6)", borderRadius: 0 }}
              >
                <Flex gap="3" align="start">
                  <Flex
                    align="center"
                    justify="center"
                    style={{
                      width: 24,
                      height: 24,
                      minWidth: 24,
                      backgroundColor: "var(--accent-9)",
                      color: "white",
                      fontSize: "var(--font-size-1)",
                      fontWeight: 600,
                      borderRadius: 0,
                    }}
                  >
                    {idx + 1}
                  </Flex>
                  <Flex direction="column" gap="2" style={{ flex: 1 }}>
                    <Text size="2" weight="medium" as="div">
                      {q.questionText}
                    </Text>
                    <Text size="2" color="gray" as="div" style={{ borderTop: "1px solid var(--gray-4)", paddingTop: 8 }}>
                      {q.answerText || "No answer provided"}
                    </Text>
                  </Flex>
                </Flex>
              </Box>
            ))}
          </Flex>
        </Card>
      )}
    </>
  );
}
