"use client";

import { use, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Flex,
  Heading,
  Link as RadixLink,
  Separator,
  Spinner,
  Text,
} from "@radix-ui/themes";
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Eye,
  Heart,
  Pill,
  Search,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import {
  useAllergiesQuery,
  useGenerateResearchMutation,
  useGetFamilyMemberQuery,
  useGetGenerationJobQuery,
  useGetResearchQuery,
  useMedicationQuery,
} from "../../../../__generated__/hooks";
import { AuthGate } from "../../../../components/AuthGate";

export default function PersonMedicationDetailPage({
  params,
}: {
  params: Promise<{ slug: string; medication: string }>;
}) {
  const { slug, medication } = use(params);
  return (
    <AuthGate
      pageName="Medication detail"
      description="Sign in to view this medication."
    >
      <PersonMedicationDetailContent person={slug} medication={medication} />
    </AuthGate>
  );
}

function PersonMedicationDetailContent({
  person,
  medication,
}: {
  person: string;
  medication: string;
}) {
  const memberQ = useGetFamilyMemberQuery({ variables: { slug: person } });
  const medQ = useMedicationQuery({ variables: { id: medication } });
  const allergiesQ = useAllergiesQuery();

  const member = memberQ.data?.familyMember;
  const med = medQ.data?.medication;

  const loading = memberQ.loading || medQ.loading || allergiesQ.loading;
  const error = memberQ.error ?? medQ.error ?? allergiesQ.error;

  if (loading) {
    return (
      <Flex justify="center" py="9">
        <Spinner size="3" />
      </Flex>
    );
  }

  if (error) {
    return (
      <Box py="6">
        <Card>
          <Flex direction="column" gap="2" p="3">
            <Text color="red" weight="medium">
              Error loading page
            </Text>
            <Text size="2" color="gray">
              {error.message}
            </Text>
          </Flex>
        </Card>
      </Box>
    );
  }

  if (!member) {
    return (
      <NotFoundCard
        title="Person not found"
        body={`No family member with the slug "${person}".`}
        backHref="/allergies"
        backLabel="Back to all allergies"
      />
    );
  }

  if (!med) {
    return (
      <NotFoundCard
        title="Medication not found"
        body="This medication doesn't exist or you don't have access."
        backHref={`/allergies/${person}`}
        backLabel={`Back to ${member.firstName}`}
      />
    );
  }

  const personAllergies = (allergiesQ.data?.allergies ?? []).filter(
    (a) => a.familyMemberId === member.id,
  );

  const personDisplayName =
    member.firstName + (member.name ? ` (${member.name})` : "");
  const isMontelukast = /singulair|montelukast/i.test(med.name);

  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        {/* Breadcrumb */}
        <Flex direction="column" gap="2">
          <Flex align="center" gap="2" wrap="wrap">
            <Link href="/allergies" style={{ textDecoration: "none" }}>
              <Flex align="center" gap="1">
                <ArrowLeft size={14} color="var(--gray-10)" />
                <Text size="2" color="gray">
                  Allergies
                </Text>
              </Flex>
            </Link>
            <Text size="2" color="gray">
              ›
            </Text>
            <Link
              href={`/allergies/${person}`}
              style={{ textDecoration: "none" }}
            >
              <Text size="2" color="gray">
                {member.firstName}
              </Text>
            </Link>
            <Text size="2" color="gray">
              › Medications › {med.name}
            </Text>
          </Flex>
          <Flex align="center" gap="3" wrap="wrap">
            <Heading size={{ initial: "6", md: "8" }} weight="bold">
              {med.name}
            </Heading>
            {member.relationship && (
              <Badge color="cyan" variant="soft">
                {member.relationship}
              </Badge>
            )}
            {isMontelukast && (
              <Badge color="indigo" variant="soft">
                Leukotriene receptor antagonist
              </Badge>
            )}
          </Flex>
          <Text size="3" color="gray">
            {personDisplayName}&apos;s regimen, allergies it treats, drug facts,
            and academic evidence.
          </Text>
        </Flex>

        <Separator size="4" />

        {/* Regimen */}
        <Section icon={<Pill size={18} color="var(--gray-11)" />} title="Regimen">
          <Card>
            <Flex direction="column" gap="2" p="3">
              <Flex align="center" gap="2" wrap="wrap">
                <Text size="2" weight="medium">
                  {med.name}
                </Text>
                {med.dosage && (
                  <Badge color="indigo" variant="soft" size="1">
                    {med.dosage}
                  </Badge>
                )}
                {med.frequency && (
                  <Badge color="gray" variant="outline" size="1">
                    {med.frequency}
                  </Badge>
                )}
              </Flex>
              {(med.startDate || med.endDate) && (
                <Text size="1" color="gray">
                  {formatDate(med.startDate) ?? "—"} →{" "}
                  {formatDate(med.endDate) ?? "ongoing"}
                </Text>
              )}
              {med.notes && (
                <Text size="2" color="gray">
                  {med.notes}
                </Text>
              )}
            </Flex>
          </Card>
        </Section>

        {/* FDA boxed warning — show for montelukast/Singulair */}
        {isMontelukast && (
          <Callout.Root color="red" variant="surface">
            <Callout.Icon>
              <AlertTriangle size={18} />
            </Callout.Icon>
            <Callout.Text>
              <Text weight="bold">FDA Boxed Warning (March 2020) — </Text>
              Montelukast carries a boxed warning for serious neuropsychiatric
              events, including agitation, depression, sleep disturbance,
              suicidal thoughts, and behavior changes. Risk is reported in
              children and adolescents. Discuss benefits versus risks with the
              prescribing doctor and stop the drug + seek care if any of these
              appear.{" "}
              <RadixLink
                href="https://www.fda.gov/drugs/drug-safety-and-availability/fda-requires-boxed-warning-about-serious-mental-health-side-effects-asthma-and-allergy-drug"
                target="_blank"
                rel="noopener noreferrer"
              >
                FDA notice <ExternalLink size={12} style={{ display: "inline" }} />
              </RadixLink>
            </Callout.Text>
          </Callout.Root>
        )}

        {/* Allergies treated */}
        {personAllergies.length > 0 && (
          <Section
            icon={<ShieldAlert size={18} color="var(--gray-11)" />}
            title={`Allergies it may treat (${personAllergies.length})`}
          >
            <Flex
              direction="column"
              gap="3"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              }}
            >
              {personAllergies.map((a) => (
                <Card key={a.id}>
                  <Flex direction="column" gap="2" p="2">
                    <Flex align="center" gap="2" wrap="wrap">
                      <Text size="2" weight="medium">
                        {a.name}
                      </Text>
                      <Badge color="amber" variant="soft" size="1">
                        {a.kind}
                      </Badge>
                      {a.severity && (
                        <Badge color="red" variant="outline" size="1">
                          {a.severity}
                        </Badge>
                      )}
                    </Flex>
                    {a.notes && (
                      <Text
                        size="1"
                        color="gray"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {a.notes}
                      </Text>
                    )}
                  </Flex>
                </Card>
              ))}
            </Flex>
          </Section>
        )}

        {/* Drug overview — Singulair-specific for now */}
        {isMontelukast && (
          <Section
            icon={<Heart size={18} color="var(--gray-11)" />}
            title="What it is"
          >
            <Card>
              <Flex direction="column" gap="2" p="3">
                <Text size="2">
                  <Text as="span" weight="medium">
                    Singulair (montelukast)
                  </Text>{" "}
                  is a leukotriene receptor antagonist. It blocks CysLT1, the
                  receptor that drives airway inflammation, mucus production,
                  and bronchoconstriction during allergic reactions and asthma.
                </Text>
                <Text size="2">
                  Typical pediatric uses: persistent asthma, exercise-induced
                  bronchoconstriction, and allergic rhinitis (seasonal &
                  perennial). It is taken once daily, usually in the evening.
                </Text>
                <Text size="2" color="gray">
                  This is a short reference summary — not a substitute for the
                  prescribing physician.
                </Text>
              </Flex>
            </Card>
          </Section>
        )}

        {/* What to watch for */}
        {isMontelukast && (
          <Section
            icon={<Eye size={18} color="var(--gray-11)" />}
            title="What to watch for"
          >
            <Card>
              <Flex direction="column" gap="2" p="3" asChild>
                <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                  <li>
                    <Text size="2">
                      Sleep changes — insomnia, nightmares, sleepwalking
                    </Text>
                  </li>
                  <li>
                    <Text size="2">
                      Mood — irritability, anxiety, depression, tearfulness
                    </Text>
                  </li>
                  <li>
                    <Text size="2">
                      Behavior — aggression, agitation, restlessness, attention
                      changes
                    </Text>
                  </li>
                  <li>
                    <Text size="2">
                      Any suicidal ideation — stop and seek care immediately
                    </Text>
                  </li>
                  <li>
                    <Text size="2">
                      Allergy control — daytime/nighttime symptoms, rescue
                      inhaler use
                    </Text>
                  </li>
                  <li>
                    <Text size="2" color="gray">
                      Log observations in /journal or /discussions for the
                      prescribing doctor visit.
                    </Text>
                  </li>
                </ul>
              </Flex>
            </Card>
          </Section>
        )}

        <Separator size="4" />

        {/* Research panel */}
        <MedicationResearchPanel medicationId={med.id} medicationName={med.name} />

        <Separator size="4" />

        {/* Related links */}
        <Section
          icon={<ExternalLink size={18} color="var(--gray-11)" />}
          title="Related"
        >
          <Flex gap="2" wrap="wrap">
            <Link
              href={`/allergies/${person}`}
              style={{ textDecoration: "none" }}
            >
              <Button variant="soft" size="2">
                {personDisplayName}&apos;s allergies
              </Button>
            </Link>
            <Link
              href={`/medications/${person}`}
              style={{ textDecoration: "none" }}
            >
              <Button variant="soft" size="2">
                All of {member.firstName}&apos;s medications
              </Button>
            </Link>
            {person === "bogdan" && (
              <Link href="/discussions" style={{ textDecoration: "none" }}>
                <Button variant="soft" size="2">
                  Discussions with Bogdan
                </Button>
              </Link>
            )}
          </Flex>
        </Section>
      </Flex>
    </Box>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Flex direction="column" gap="3">
      <Flex align="center" gap="2">
        {icon}
        <Heading size="4">{title}</Heading>
      </Flex>
      {children}
    </Flex>
  );
}

function NotFoundCard({
  title,
  body,
  backHref,
  backLabel,
}: {
  title: string;
  body: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <Box py="6">
      <Card>
        <Flex direction="column" gap="3" p="3" align="start">
          <Heading size="4">{title}</Heading>
          <Text size="2" color="gray">
            {body}
          </Text>
          <Link href={backHref} style={{ textDecoration: "none" }}>
            <Button variant="soft">
              <ArrowLeft size={14} /> {backLabel}
            </Button>
          </Link>
        </Flex>
      </Card>
    </Box>
  );
}

function formatDate(d: string | null | undefined): string | null {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function evidenceColor(level: string | null | undefined) {
  if (!level) return "gray" as const;
  const l = level.toLowerCase();
  if (l.includes("meta") || l.includes("systematic")) return "green" as const;
  if (l.includes("rct") || l.includes("randomized")) return "blue" as const;
  if (l.includes("cohort") || l.includes("observational"))
    return "orange" as const;
  return "gray" as const;
}

function MedicationResearchPanel({
  medicationId,
  medicationName,
}: {
  medicationId: string;
  medicationName: string;
}) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const researchQ = useGetResearchQuery({
    variables: { medicationId },
    fetchPolicy: "cache-and-network",
  });

  const { data: jobData, stopPolling } = useGetGenerationJobQuery({
    variables: { id: jobId! },
    skip: !jobId,
    pollInterval: 5000,
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "network-only",
    onCompleted: (d) => {
      const status = d.generationJob?.status;
      if (status === "SUCCEEDED" || status === "FAILED") {
        stopPolling();
        if (status === "SUCCEEDED") {
          researchQ.refetch();
          setMessage({ text: "Research updated.", type: "success" });
        } else {
          setMessage({
            text:
              d.generationJob?.error?.message ?? "Research generation failed.",
            type: "error",
          });
        }
        setJobId(null);
      }
    },
  });

  const [generateResearch, { loading: generating }] =
    useGenerateResearchMutation({
      onCompleted: (data) => {
        if (data.generateResearch.success) {
          setMessage(null);
          if (data.generateResearch.jobId)
            setJobId(data.generateResearch.jobId);
        } else {
          setMessage({
            text:
              data.generateResearch.message ?? "Failed to generate research.",
            type: "error",
          });
        }
      },
      onError: (err) => setMessage({ text: err.message, type: "error" }),
    });

  const papers = researchQ.data?.research ?? [];
  const jobStatus = jobData?.generationJob?.status;
  const jobProgress = jobData?.generationJob?.progress ?? 0;
  const isRunning =
    !!jobId && jobStatus !== "SUCCEEDED" && jobStatus !== "FAILED";

  return (
    <Section
      icon={<Search size={18} color="var(--gray-11)" />}
      title={`Research (${papers.length})`}
    >
      <Flex direction="column" gap="3">
        <Flex justify="between" align="center" wrap="wrap" gap="2">
          <Text size="2" color="gray">
            Academic evidence for {medicationName} — efficacy, pediatric safety,
            and long-term outcomes.
          </Text>
          <Button
            size="2"
            disabled={generating || isRunning}
            onClick={() =>
              generateResearch({ variables: { medicationId } })
            }
          >
            <Search size={14} />
            {isRunning ? `Running… ${jobProgress}%` : "Generate research"}
          </Button>
        </Flex>

        {message && (
          <Text
            size="2"
            color={message.type === "success" ? "green" : "red"}
          >
            {message.text}
          </Text>
        )}

        {researchQ.loading && papers.length === 0 && (
          <Flex justify="center" py="4">
            <Spinner size="2" />
          </Flex>
        )}

        {!researchQ.loading && papers.length === 0 && !isRunning && (
          <Card>
            <Flex direction="column" gap="2" p="3" align="center">
              <Text size="2" color="gray">
                No research yet. Click &ldquo;Generate research&rdquo; to pull
                academic papers.
              </Text>
            </Flex>
          </Card>
        )}

        {papers.length > 0 && (
          <Flex
            direction="column"
            gap="3"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            }}
          >
            {papers.map((p) => (
              <Card key={p.id}>
                <Flex direction="column" gap="2" p="3">
                  <Flex align="center" gap="2" wrap="wrap">
                    {p.evidenceLevel && (
                      <Badge color={evidenceColor(p.evidenceLevel)} size="1">
                        {p.evidenceLevel}
                      </Badge>
                    )}
                    {p.year && (
                      <Badge variant="outline" color="gray" size="1">
                        {p.year}
                      </Badge>
                    )}
                    <Badge variant="soft" color="gray" size="1">
                      relevance {(p.relevanceScore * 100).toFixed(0)}%
                    </Badge>
                  </Flex>
                  <Text size="2" weight="medium">
                    {p.title}
                  </Text>
                  {p.authors.length > 0 && (
                    <Text size="1" color="gray">
                      {p.authors.slice(0, 4).join(", ")}
                      {p.authors.length > 4 ? " et al." : ""}
                    </Text>
                  )}
                  {p.journal && (
                    <Text size="1" color="gray">
                      {p.journal}
                    </Text>
                  )}
                  {p.abstract && (
                    <Text
                      size="1"
                      color="gray"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {p.abstract}
                    </Text>
                  )}
                  {p.keyFindings && p.keyFindings.length > 0 && (
                    <Box>
                      <Text size="1" weight="medium">
                        Key findings:
                      </Text>
                      <ul style={{ margin: "4px 0 0 0", paddingLeft: "1rem" }}>
                        {p.keyFindings.slice(0, 3).map((f, i) => (
                          <li key={i}>
                            <Text size="1" color="gray">
                              {f}
                            </Text>
                          </li>
                        ))}
                      </ul>
                    </Box>
                  )}
                  {(p.url || p.doi) && (
                    <RadixLink
                      href={p.url ?? `https://doi.org/${p.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="1"
                    >
                      Open paper{" "}
                      <ExternalLink size={12} style={{ display: "inline" }} />
                    </RadixLink>
                  )}
                </Flex>
              </Card>
            ))}
          </Flex>
        )}
      </Flex>
    </Section>
  );
}
