import {
  Badge,
  Box,
  Card,
  Flex,
  Grid,
  Heading,
  Link as RadixLink,
  Text,
} from "@radix-ui/themes";
import { css } from "styled-system/css";

const sectionHeadingAccent = css({
  borderLeft: "3px solid var(--indigo-9)",
  paddingLeft: "var(--space-4)",
});

const statCard = css({
  borderRadius: "var(--radius-4)",
  padding: "var(--space-4)",
  background: "var(--gray-a2)",
  border: "1px solid var(--gray-a4)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "var(--space-1)",
  textAlign: "center",
});

const stepRow = css({
  display: "flex",
  alignItems: "flex-start",
  gap: "var(--space-3)",
  padding: "var(--space-3)",
  borderRadius: "var(--radius-3)",
  background: "var(--indigo-a2)",
  border: "1px solid var(--indigo-a4)",
});

const paperRow = css({
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
  paddingTop: "var(--space-2)",
  paddingBottom: "var(--space-2)",
  borderBottom: "1px solid var(--gray-a3)",
  "&:last-child": {
    borderBottom: "none",
  },
});

const STATS = [
  {
    number: "87%",
    label: "sensitivity",
    description: "Longitudinal algorithms vs static thresholds",
    color: "green" as const,
  },
  {
    number: "R²=0.97",
    label: "prediction",
    description: "Biomarker slope validated across 186K patients",
    color: "blue" as const,
  },
  {
    number: "6x",
    label: "odds ratio",
    description: "TG/HDL for insulin resistance detection",
    color: "orange" as const,
  },
  {
    number: "1.64x",
    label: "mortality HR",
    description: "NLR predicts all-cause mortality risk",
    color: "purple" as const,
  },
];

const STEPS = [
  {
    step: "1",
    label: "Encode",
    description: "Blood panel → 1024-dim health vector",
  },
  {
    step: "2",
    label: "Compare",
    description: "Cosine similarity between consecutive panels",
  },
  {
    step: "3",
    label: "Alert",
    description: "Rate-of-change flags emerging risks",
  },
];

const PAPERS = [
  {
    stat: "87.1% sensitivity",
    author: "Blyuss et al.",
    doi: "10.1158/1078-0432.CCR-18-0208",
  },
  {
    stat: "R²=0.97, 186K pts",
    author: "Inker et al.",
    doi: "10.1681/ASN.2019010007",
  },
  {
    stat: "6.02x OR insulin resistance",
    author: "Giannini et al.",
    doi: "10.2337/dc10-2234",
  },
  {
    stat: "2.14x cardiovascular risk",
    author: "Luo et al.",
    doi: "10.3389/fcvm.2021.774781",
  },
  {
    stat: "HR 1.64 all-cause mortality",
    author: "Fest et al.",
    doi: "10.1007/s10654-018-0472-y",
  },
  {
    stat: "AST/ALT predicts fibrosis",
    author: "Botros & Sikaris",
    doi: "PMC3866949",
  },
  {
    stat: "TG/HDL cutoffs validated",
    author: "Gonzalez-Chavez et al.",
    doi: "10.3390/biomedicines12071493",
  },
  {
    stat: "Lipid ratios beat individual markers",
    author: "Millan et al.",
    doi: "10.2147/vhrm.s6269",
  },
];

export function WhyTrajectory() {
  return (
    <Flex direction="column" gap="8">
      {/* Header */}
      <div className={sectionHeadingAccent}>
        <Heading size="6">Why Health Trajectory?</Heading>
        <Text size="2" color="gray">
          A single blood test is a photograph. A trajectory is a motion picture.
        </Text>
      </div>

      {/* Big numbers grid */}
      <Grid columns={{ initial: "2", sm: "4" }} gap="3">
        {STATS.map((s) => (
          <div key={s.number} className={statCard}>
            <Text size="8" weight="bold" color={s.color}>
              {s.number}
            </Text>
            <Text size="1" weight="bold" color={s.color}>
              {s.label}
            </Text>
            <Text size="1" color="gray">
              {s.description}
            </Text>
          </div>
        ))}
      </Grid>

      {/* How it works */}
      <Flex direction="column" gap="3">
        <Heading size="4">How it works</Heading>
        <Grid columns={{ initial: "1", sm: "3" }} gap="3">
          {STEPS.map((s) => (
            <div key={s.step} className={stepRow}>
              <Badge size="2" color="indigo" variant="solid" style={{ flexShrink: 0 }}>
                {s.step}
              </Badge>
              <Flex direction="column" gap="1">
                <Text size="2" weight="bold">
                  {s.label}
                </Text>
                <Text size="1" color="gray">
                  {s.description}
                </Text>
              </Flex>
            </div>
          ))}
        </Grid>
      </Flex>

      {/* Research */}
      <Flex direction="column" gap="3">
        <Flex align="center" gap="2">
          <Heading size="4">Research</Heading>
          <Badge size="1" color="indigo" variant="soft">
            8 peer-reviewed papers
          </Badge>
        </Flex>
        <Card size="2">
          <Flex direction="column" gap="0">
            {PAPERS.map((p) => (
              <div key={p.doi} className={paperRow}>
                <Box flexShrink="0">
                  <Text size="1" weight="bold">
                    {p.stat}
                  </Text>
                </Box>
                <Text size="1" color="gray">
                  {" — "}
                  {p.author}
                  {p.doi.startsWith("10.") && (
                    <>
                      {" "}
                      <RadixLink
                        href={`https://doi.org/${p.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="1"
                      >
                        DOI
                      </RadixLink>
                    </>
                  )}
                </Text>
              </div>
            ))}
          </Flex>
        </Card>
      </Flex>
    </Flex>
  );
}
