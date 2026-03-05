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

const STATS = [
  {
    number: "87%",
    label: "sensitivity",
    description: "Longitudinal algorithms vs static thresholds",
    color: "green" as const,
  },
  {
    number: "R\u00B2=0.97",
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
    description: "Blood panel \u2192 1024-dim health vector",
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
    stat: "R\u00B2=0.97, 186K pts",
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
    <Flex direction="column" gap="5">
      <Flex direction="column" gap="1">
        <Heading size="4">Why Health Trajectory?</Heading>
        <Text size="2" color="gray">
          A single blood test is a photograph. A trajectory is a motion picture.
        </Text>
      </Flex>

      {/* Big numbers grid */}
      <Grid columns={{ initial: "2", sm: "4" }} gap="3">
        {STATS.map((s) => (
          <Card key={s.number} size="1">
            <Flex direction="column" gap="1" align="center">
              <Text size="7" weight="bold" color={s.color}>
                {s.number}
              </Text>
              <Text size="1" weight="bold" color={s.color}>
                {s.label}
              </Text>
              <Text size="1" color="gray" align="center">
                {s.description}
              </Text>
            </Flex>
          </Card>
        ))}
      </Grid>

      {/* How it works */}
      <Flex direction="column" gap="2">
        <Heading size="3">How it works</Heading>
        <Grid columns={{ initial: "1", sm: "3" }} gap="3">
          {STEPS.map((s) => (
            <Flex key={s.step} align="start" gap="2">
              <Badge size="2" color="indigo" variant="solid">
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
            </Flex>
          ))}
        </Grid>
      </Flex>

      {/* Research */}
      <Flex direction="column" gap="2">
        <Flex align="center" gap="2">
          <Heading size="3">Research</Heading>
          <Badge size="1" color="gray" variant="soft">
            8 peer-reviewed papers
          </Badge>
        </Flex>
        <Grid columns={{ initial: "1", sm: "2" }} gap="2">
          {PAPERS.map((p) => (
            <Flex key={p.doi} align="center" gap="2">
              <Box flexShrink="0">
                <Text size="1" weight="bold">
                  {p.stat}
                </Text>
              </Box>
              <Text size="1" color="gray">
                {" \u2014 "}
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
            </Flex>
          ))}
        </Grid>
      </Flex>
    </Flex>
  );
}
