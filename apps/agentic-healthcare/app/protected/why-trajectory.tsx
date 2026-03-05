import {
  Badge,
  Box,
  Callout,
  Card,
  Flex,
  Grid,
  Heading,
  Link as RadixLink,
  Separator,
  Text,
} from "@radix-ui/themes";

const BENEFITS = [
  {
    title: "Catch Trends Before They Become Critical",
    description:
      "Longitudinal algorithms using personal baselines achieve 87% sensitivity vs static thresholds (Blyuss et al., 2018). Your trajectory catches shifts months before they cross population cutoffs.",
    badge: "Early Detection",
    color: "green" as const,
  },
  {
    title: "Rate-of-Change Reveals What Static Numbers Hide",
    description:
      "Biomarker slope is a validated predictor of disease progression (R\u00B2 = 0.97 in 186K patients, Inker et al., 2019). We compute per-day velocity between consecutive panels.",
    badge: "Velocity Analysis",
    color: "blue" as const,
  },
  {
    title: "Derived Ratios Outperform Individual Markers",
    description:
      "TG/HDL shows 6x odds for insulin resistance (Giannini et al.), TyG predicts 2.14x cardiovascular risk (Luo et al.), NLR predicts 1.64x all-cause mortality (Fest et al.).",
    badge: "Clinical Ratios",
    color: "orange" as const,
  },
  {
    title: "Cosine Similarity Measures Overall Health Stability",
    description:
      "Each blood panel is encoded into a high-dimensional vector. Cosine similarity between panels quantifies how much your overall health state has shifted.",
    badge: "Vector Analysis",
    color: "purple" as const,
  },
];

const RESEARCH_PAPERS = [
  {
    authors: "Blyuss O, Burnell M, Ryan A, et al",
    title:
      "Comparison of longitudinal CA125 algorithms as a first-line screen for ovarian cancer in the general population",
    journal: "Clin Cancer Res. 2018;24(19):4726-4733",
    doi: "10.1158/1078-0432.CCR-18-0208",
    summary:
      "Longitudinal algorithms using serial biomarker measurements achieve 87.1% sensitivity vs fixed thresholds -- the core principle behind trajectory tracking.",
  },
  {
    authors: "Inker LA, Heerspink HJL, Tighiouart H, et al",
    title:
      "GFR slope as a surrogate end point for kidney disease progression in clinical trials: a meta-analysis",
    journal: "J Am Soc Nephrol. 2019;30(9):1735-1745",
    doi: "10.1681/ASN.2019010007",
    summary:
      "Meta-analysis of 186,312 patients proving rate-of-change (slope) in eGFR is a validated surrogate for kidney failure progression (R\u00B2 = 0.97).",
  },
  {
    authors: "Giannini C, Santoro N, Caprio S, et al",
    title:
      "The triglyceride-to-HDL cholesterol ratio: association with insulin resistance in obese youths of different ethnic backgrounds",
    journal: "Diabetes Care. 2011;34(8):1869-1874",
    doi: "10.2337/dc10-2234",
    summary:
      "TG/HDL-C ratio shows 6.02x odds ratio for insulin resistance (1,452 subjects), validating derived ratios over individual markers.",
  },
  {
    authors: "Luo J-W, Duan W-H, Yu Y-Q, Song L, Shi D-Z",
    title:
      "Prognostic significance of triglyceride-glucose index for adverse cardiovascular events in patients with coronary artery disease",
    journal: "Front Cardiovasc Med. 2021;8:774781",
    doi: "10.3389/fcvm.2021.774781",
    summary:
      "Meta-analysis of 28,795 patients: higher TyG index associated with 2.14-fold elevated risk of major adverse cardiovascular events.",
  },
  {
    authors: "Fest J, Ruiter TR, Groot Koerkamp B, et al",
    title:
      "The neutrophil-to-lymphocyte ratio is associated with mortality in the general population: The Rotterdam Study",
    journal: "Eur J Epidemiol. 2019;34:463-470",
    doi: "10.1007/s10654-018-0472-y",
    summary:
      "Large prospective cohort: NLR independently associated with all-cause mortality (HR 1.64) and cardiovascular mortality (HR 1.92).",
  },
  {
    authors: "Botros M, Sikaris KA",
    title: "The De Ritis Ratio: The Test of Time",
    journal: "Clin Biochem Rev. 2013;34(3):117-130",
    doi: "PMC3866949",
    summary:
      "Comprehensive review showing AST/ALT ratio predicts fibrosis and cirrhosis progression in chronic liver disease.",
  },
  {
    authors: "Gonzalez-Chavez A, et al",
    title:
      "The triglyceride/HDL ratio as a surrogate biomarker for insulin resistance",
    journal: "Biomedicines. 2024;12(7):1493",
    doi: "10.3390/biomedicines12071493",
    summary:
      "Systematic review of 32 studies (49,782 participants) establishing TG/HDL cutoffs as a simple surrogate for insulin resistance.",
  },
  {
    authors: "Millan J, Pinto X, Munoz A, et al",
    title:
      "Lipoprotein ratios: physiological significance and clinical usefulness in cardiovascular prevention",
    journal: "Vasc Health Risk Manag. 2009;5:757-765",
    doi: "10.2147/vhrm.s6269",
    summary:
      "Lipid ratios (TC/HDL, LDL/HDL) are better cardiovascular risk predictors than individual lipid values.",
  },
];

export function WhyTrajectory() {
  return (
    <Flex direction="column" gap="5">
      <Flex direction="column" gap="2">
        <Heading size="4">Why Health Trajectory?</Heading>
        <Text size="2" color="gray">
          A single blood test is a photograph. A trajectory is a motion picture.
          By tracking how your biomarkers evolve across multiple panels, we
          detect patterns that static snapshots miss entirely.
        </Text>
      </Flex>

      <Grid columns={{ initial: "1", sm: "2" }} gap="3">
        {BENEFITS.map((b) => (
          <Card key={b.title} size="1">
            <Flex direction="column" gap="1">
              <Flex align="center" gap="2">
                <Badge color={b.color} variant="soft" size="1">
                  {b.badge}
                </Badge>
              </Flex>
              <Text size="2" weight="bold">
                {b.title}
              </Text>
              <Text size="1" color="gray">
                {b.description}
              </Text>
            </Flex>
          </Card>
        ))}
      </Grid>

      <Callout.Root size="1" color="gray">
        <Callout.Text size="1">
          <Text weight="bold">How it works.</Text> Each blood panel is encoded
          into a 1024-dimensional health state vector. Derived clinical ratios
          (TG/HDL, NLR, TyG, De Ritis, etc.) are classified against
          peer-reviewed thresholds. Cosine similarity between vectors measures
          overall health stability. Velocity analysis tracks per-day rate of
          change between consecutive panels.
        </Callout.Text>
      </Callout.Root>

      <Flex direction="column" gap="2">
        <Text size="2" weight="bold">
          Grounded in Research
        </Text>
        <Text size="1" color="gray">
          Every metric threshold and classification is backed by peer-reviewed
          clinical research.
        </Text>
        <Flex direction="column" gap="2">
          {RESEARCH_PAPERS.map((paper) => (
            <Card key={paper.doi} size="1" variant="surface">
              <Flex direction="column" gap="1">
                <Text size="1" weight="bold">
                  {paper.authors}
                </Text>
                <Text size="1">{paper.title}</Text>
                <Text size="1" color="gray">
                  {paper.journal}
                </Text>
                <Text size="1" color="gray" style={{ fontStyle: "italic" }}>
                  {paper.summary}
                </Text>
                {paper.doi.startsWith("10.") && (
                  <Text size="1">
                    <RadixLink
                      href={`https://doi.org/${paper.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      DOI: {paper.doi}
                    </RadixLink>
                  </Text>
                )}
              </Flex>
            </Card>
          ))}
        </Flex>
      </Flex>
    </Flex>
  );
}
