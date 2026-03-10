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
