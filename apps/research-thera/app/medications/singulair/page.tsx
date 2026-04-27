import type { Metadata } from "next";
import {
  Badge,
  Box,
  Callout,
  Card,
  Flex,
  Heading,
  Link as RadixLink,
  Separator,
  Text,
} from "@radix-ui/themes";
import { AlertTriangle, ExternalLink, Info } from "lucide-react";
import { MontelukastSafetyPanel } from "../../components/MontelukastSafetyPanel";

export const metadata: Metadata = {
  title:
    "Singulair Paediatric 5 mg chewable tablets (montelukast) — Patient Information Leaflet",
  description:
    "Patient Information Leaflet for Singulair Paediatric 5 mg chewable tablets (montelukast) — a leukotriene receptor antagonist used to control asthma in children aged 6 to 14. Sourced from the UK SmPC (Organon Pharma UK, leaflet revised December 2022).",
  openGraph: {
    title:
      "Singulair Paediatric 5 mg chewable tablets (montelukast) — Patient Information Leaflet",
    description:
      "Asthma maintenance treatment for children 6–14. Indications, dosing, side effects and warnings — sourced from the UK SmPC for Singulair Paediatric.",
  },
};

export default function SingulairPage() {
  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        <Header />
        <ReadCarefullyCallout />
        <SectionOne />
        <SectionTwo />
        <SectionThree />
        <SectionFour />
        <SectionFive />
        <SectionSix />
        <SourceFooter />
      </Flex>
    </Box>
  );
}

function Header() {
  return (
    <Flex direction="column" gap="2">
      <Text size="1" color="gray" weight="medium">
        Patient Information Leaflet
      </Text>
      <Heading size={{ initial: "6", md: "8" }} weight="bold">
        Singulair Paediatric 5 mg chewable tablets
      </Heading>
      <Flex align="center" gap="2" wrap="wrap">
        <Badge color="indigo" variant="soft">
          montelukast
        </Badge>
        <Badge color="gray" variant="soft">
          Asthma · ages 6–14
        </Badge>
        <Badge color="gray" variant="soft">
          Organon Pharma (UK) Ltd
        </Badge>
        <Badge color="gray" variant="soft">
          Leaflet revised Dec 2022
        </Badge>
      </Flex>
    </Flex>
  );
}

function ReadCarefullyCallout() {
  return (
    <Callout.Root color="amber" variant="surface">
      <Callout.Icon>
        <Info size={18} />
      </Callout.Icon>
      <Callout.Text>
        <Text as="div" weight="bold" mb="2">
          Read all of this leaflet carefully before you or your child start
          taking this medicine.
        </Text>
        <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
          <li>Keep this leaflet. You may need to read it again.</li>
          <li>
            If you have any further questions, ask your doctor or pharmacist.
          </li>
          <li>
            This medicine has been prescribed for you or your child only. Do
            not pass it on to others. It may harm them, even if their signs of
            illness are the same as yours.
          </li>
          <li>
            If you or your child get any side effects, talk to your doctor or
            pharmacist. This includes any possible side effects not listed in
            this leaflet.
          </li>
        </ul>
      </Callout.Text>
    </Callout.Root>
  );
}

function SectionOne() {
  return (
    <Flex direction="column" gap="3">
      <Heading size="5">
        1. What Singulair Paediatric is and what it is used for
      </Heading>
      <Card>
        <Flex direction="column" gap="3" p="3">
          <Box>
            <Text as="div" size="2" weight="medium" mb="1">
              What it is
            </Text>
            <Text as="p" size="2">
              Singulair Paediatric is a leukotriene receptor antagonist that
              blocks substances called leukotrienes.
            </Text>
          </Box>
          <Box>
            <Text as="div" size="2" weight="medium" mb="1">
              How it works
            </Text>
            <Text as="p" size="2">
              Leukotrienes cause narrowing and swelling of airways in the
              lungs. By blocking leukotrienes, Singulair Paediatric improves
              asthma symptoms and helps control asthma.
            </Text>
          </Box>
          <Box>
            <Text as="div" size="2" weight="medium" mb="1">
              When it should be used
            </Text>
            <Text as="p" size="2" mb="2">
              Your doctor has prescribed Singulair Paediatric to treat asthma,
              preventing asthma symptoms during the day and night.
            </Text>
            <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
              <li>
                <Text size="2">
                  For paediatric patients 6 to 14 years of age who are not
                  adequately controlled on their medication and need additional
                  therapy.
                </Text>
              </li>
              <li>
                <Text size="2">
                  May also be used as an alternative to inhaled corticosteroids
                  for 6 to 14 year old patients who have not recently taken
                  oral corticosteroids and have shown they are unable to use
                  inhaled corticosteroids.
                </Text>
              </li>
              <li>
                <Text size="2">
                  Helps prevent the narrowing of airways triggered by exercise.
                </Text>
              </li>
            </ul>
          </Box>
          <Box>
            <Text as="div" size="2" weight="medium" mb="1">
              What is asthma?
            </Text>
            <Text as="p" size="2" mb="2">
              Asthma is a long-term disease that includes:
            </Text>
            <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
              <li>
                <Text size="2">
                  Difficulty breathing because of narrowed airways. This
                  narrowing worsens and improves in response to various
                  conditions.
                </Text>
              </li>
              <li>
                <Text size="2">
                  Sensitive airways that react to many things — cigarette
                  smoke, pollen, cold air, exercise.
                </Text>
              </li>
              <li>
                <Text size="2">
                  Swelling (inflammation) in the lining of the airways.
                </Text>
              </li>
            </ul>
            <Text as="p" size="2" mt="2" color="gray">
              Symptoms of asthma include: coughing, wheezing, and chest
              tightness.
            </Text>
          </Box>
        </Flex>
      </Card>
    </Flex>
  );
}

function SectionTwo() {
  return (
    <Flex direction="column" gap="3">
      <Heading size="5">
        2. What you need to know before you take Singulair Paediatric
      </Heading>
      <Text as="p" size="2" color="gray">
        Tell your doctor about any medical problems or allergies you or your
        child has now or has had.
      </Text>

      <Card>
        <Flex direction="column" gap="2" p="3">
          <Heading size="3">Do not take Singulair Paediatric</Heading>
          <Text as="p" size="2">
            If you or your child is allergic to montelukast or any of the other
            ingredients of this medicine (listed in section 6).
          </Text>
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="3" p="3">
          <Heading size="3">Warnings and precautions</Heading>
          <Text as="p" size="2">
            Talk to your doctor or pharmacist before you or your child take
            Singulair Paediatric.
          </Text>
          <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
            <li>
              <Text size="2">
                If asthma or breathing gets worse, tell your doctor immediately.
              </Text>
            </li>
            <li>
              <Text size="2">
                Oral Singulair Paediatric is{" "}
                <Text as="span" weight="bold">
                  not meant to treat acute asthma attacks
                </Text>
                . Always have your inhaled rescue medicine with you.
              </Text>
            </li>
            <li>
              <Text size="2">
                Take all asthma medications prescribed by your doctor.
                Singulair Paediatric should not be used instead of other
                asthma medications.
              </Text>
            </li>
            <li>
              <Text size="2">
                Do not take aspirin or NSAIDs if they make asthma worse.
              </Text>
            </li>
          </ul>

          <Callout.Root color="red" variant="surface" size="1">
            <Callout.Icon>
              <AlertTriangle size={18} />
            </Callout.Icon>
            <Callout.Text>
              <Text as="div" weight="bold" mb="1">
                Churg–Strauss alert
              </Text>
              Any patient on anti-asthma medicines should be aware that if a
              combination of symptoms develops — flu-like illness, pins and
              needles or numbness of arms or legs, worsening of pulmonary
              symptoms, and/or rash — you should consult your doctor.
            </Callout.Text>
          </Callout.Root>

          <Callout.Root color="amber" variant="surface" size="1">
            <Callout.Icon>
              <AlertTriangle size={18} />
            </Callout.Icon>
            <Callout.Text>
              <Text as="div" weight="bold" mb="1">
                Neuropsychiatric events
              </Text>
              Various neuropsychiatric events (for example behaviour and
              mood-related changes) have been reported in adults, adolescents
              and children with Singulair (see section 4). If you or your
              child develop such symptoms while taking Singulair, consult your
              doctor.
            </Callout.Text>
          </Callout.Root>
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="2" p="3">
          <Heading size="3">Children and adolescents</Heading>
          <Text as="p" size="2">
            Do not give this medicine to children less than 6 years of age.
            Different forms of this medicine are available for paediatric
            patients under 18 years of age based on age range.
          </Text>
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="2" p="3">
          <Heading size="3">Other medicines and Singulair Paediatric</Heading>
          <Text as="p" size="2">
            Tell your doctor or pharmacist if you or your child are taking, or
            have recently taken, or might take any other medicines, including
            those obtained without a prescription.
          </Text>
          <Text as="p" size="2">
            Tell your doctor if you or your child is taking the following
            before starting Singulair Paediatric:
          </Text>
          <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
            <li>
              <Text size="2">phenobarbital (used for epilepsy)</Text>
            </li>
            <li>
              <Text size="2">phenytoin (used for epilepsy)</Text>
            </li>
            <li>
              <Text size="2">
                rifampicin (used to treat tuberculosis and some other
                infections)
              </Text>
            </li>
          </ul>
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="2" p="3">
          <Heading size="3">Singulair Paediatric with food and drink</Heading>
          <Text as="p" size="2">
            Singulair Paediatric 5 mg chewable tablets should not be taken
            immediately with food; take{" "}
            <Text as="span" weight="bold">
              at least 1 hour before or 2 hours after food
            </Text>
            .
          </Text>
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="2" p="3">
          <Heading size="3">Pregnancy and breast-feeding</Heading>
          <Text as="p" size="2">
            If you are pregnant or breast-feeding, think you may be pregnant or
            are planning to have a baby, ask your doctor or pharmacist for
            advice before taking Singulair Paediatric.
          </Text>
          <Text as="p" size="2">
            <Text as="span" weight="medium">
              Pregnancy:
            </Text>{" "}
            your doctor will assess whether you can take Singulair Paediatric
            during this time.
          </Text>
          <Text as="p" size="2">
            <Text as="span" weight="medium">
              Breast-feeding:
            </Text>{" "}
            it is not known if Singulair Paediatric appears in breast milk.
            Consult your doctor before taking it if you are breast-feeding or
            intend to.
          </Text>
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="2" p="3">
          <Heading size="3">Driving and using machines</Heading>
          <Text as="p" size="2">
            Singulair Paediatric is not expected to affect your ability to
            drive a car or operate machinery. However, individual responses
            vary — dizziness and drowsiness have been reported and may affect
            some patients.
          </Text>
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="2" p="3">
          <Heading size="3">Excipient warnings</Heading>
          <Text as="p" size="2">
            <Text as="span" weight="medium">
              Phenylketonuria:
            </Text>{" "}
            each 5 mg chewable tablet contains aspartame, a source of
            phenylalanine (equivalent to 0.842 mg phenylalanine per tablet).
          </Text>
          <Text as="p" size="2">
            <Text as="span" weight="medium">
              Sodium:
            </Text>{" "}
            this medicine contains less than 1 mmol sodium (23 mg) per tablet
            — that is to say essentially &lsquo;sodium-free&rsquo;.
          </Text>
        </Flex>
      </Card>
    </Flex>
  );
}

function SectionThree() {
  return (
    <Flex direction="column" gap="3">
      <Heading size="5">3. How to take Singulair Paediatric</Heading>
      <Card>
        <Flex direction="column" gap="3" p="3">
          <Text as="p" size="2">
            Always take this medicine exactly as your doctor or pharmacist has
            told you. Check with your doctor or pharmacist if you are not
            sure.
          </Text>
          <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
            <li>
              <Text size="2">
                Only one chewable tablet of Singulair Paediatric once a day,
                as prescribed.
              </Text>
            </li>
            <li>
              <Text size="2">
                Take it even when there are no symptoms or during an acute
                asthma attack.
              </Text>
            </li>
          </ul>

          <Box>
            <Text as="div" size="2" weight="medium" mb="1">
              For children 6 to 14 years of age
            </Text>
            <Text as="p" size="2">
              Recommended dose: one 5 mg chewable tablet daily, taken in the
              evening.
            </Text>
          </Box>

          <Text as="p" size="2">
            Do not take any other products that contain the same active
            ingredient (montelukast). This medicine is for oral use — chew the
            tablets before swallowing. Take at least 1 hour before or 2 hours
            after food.
          </Text>
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="2" p="3">
          <Heading size="3">If you take more than you should</Heading>
          <Text as="p" size="2">
            Contact your doctor immediately for advice. The most frequently
            occurring symptoms reported with overdose in adults and children
            include abdominal pain, sleepiness, thirst, headache, vomiting and
            hyperactivity.
          </Text>
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="2" p="3">
          <Heading size="3">If you forget to take a dose</Heading>
          <Text as="p" size="2">
            Try to take Singulair Paediatric as prescribed. If you miss a
            dose, just resume the usual schedule of one chewable tablet once
            daily.{" "}
            <Text as="span" weight="bold">
              Do not take a double dose to make up for a forgotten dose.
            </Text>
          </Text>
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="2" p="3">
          <Heading size="3">If you stop taking Singulair Paediatric</Heading>
          <Text as="p" size="2">
            Singulair Paediatric can treat asthma only if you continue to take
            it. Continue for as long as your doctor prescribes — it will help
            control asthma.
          </Text>
        </Flex>
      </Card>
    </Flex>
  );
}

function SectionFour() {
  return (
    <Flex direction="column" gap="3">
      <Heading size="5">4. Possible side effects</Heading>
      <Text as="p" size="2" color="gray">
        Like all medicines, this medicine can cause side effects, although not
        everybody gets them.
      </Text>
      <MontelukastSafetyPanel />
      <Card>
        <Flex direction="column" gap="2" p="3">
          <Text size="2" weight="medium">
            Reporting of side effects
          </Text>
          <Text as="p" size="2">
            If you or your child get any side effects, talk to your doctor,
            pharmacist or nurse. This includes any possible side effects not
            listed in this leaflet. You can also report side effects directly
            via the Yellow Card Scheme at{" "}
            <RadixLink
              href="https://yellowcard.mhra.gov.uk/"
              target="_blank"
              rel="noopener noreferrer"
            >
              yellowcard.mhra.gov.uk{" "}
              <ExternalLink size={12} style={{ display: "inline" }} />
            </RadixLink>{" "}
            or search for &lsquo;MHRA Yellow Card&rsquo; in the Google Play or
            Apple App Store. Reporting side effects helps provide more
            information on the safety of this medicine.
          </Text>
        </Flex>
      </Card>
    </Flex>
  );
}

function SectionFive() {
  return (
    <Flex direction="column" gap="3">
      <Heading size="5">5. How to store Singulair Paediatric</Heading>
      <Card>
        <Flex direction="column" gap="2" p="3">
          <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
            <li>
              <Text size="2">
                Keep this medicine out of the sight and reach of children.
              </Text>
            </li>
            <li>
              <Text size="2">
                Do not use after the expiry date stated on the blister after
                EXP. The first two numbers indicate the month; the last four
                numbers indicate the year. The expiry date refers to the last
                day of that month.
              </Text>
            </li>
            <li>
              <Text size="2">
                Store in the original package to protect from light and
                moisture.
              </Text>
            </li>
            <li>
              <Text size="2">
                Do not throw away medicines via wastewater or household waste.
                Ask your pharmacist how to dispose of medicines you no longer
                use.
              </Text>
            </li>
          </ul>
        </Flex>
      </Card>
    </Flex>
  );
}

function SectionSix() {
  return (
    <Flex direction="column" gap="3">
      <Heading size="5">6. Contents of the pack and other information</Heading>

      <Card>
        <Flex direction="column" gap="2" p="3">
          <Heading size="3">What Singulair Paediatric contains</Heading>
          <Text as="p" size="2">
            <Text as="span" weight="medium">
              Active substance:
            </Text>{" "}
            montelukast. Each chewable tablet contains montelukast sodium
            corresponding to 5 mg of montelukast.
          </Text>
          <Text as="p" size="2">
            <Text as="span" weight="medium">
              Other ingredients:
            </Text>{" "}
            mannitol (E 421), microcrystalline cellulose, hyprolose (E 463),
            red ferric oxide (E 172), croscarmellose sodium, cherry flavour,
            aspartame (E 951), and magnesium stearate.
          </Text>
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="2" p="3">
          <Heading size="3">What it looks like and pack contents</Heading>
          <Text as="p" size="2">
            5 mg Singulair Paediatric chewable tablets are pink, round,
            biconvex with{" "}
            <Text as="span" style={{ fontFamily: "var(--code-font-family)" }}>
              SINGULAIR
            </Text>{" "}
            engraved on one side and{" "}
            <Text as="span" style={{ fontFamily: "var(--code-font-family)" }}>
              MSD 275
            </Text>{" "}
            on the other.
          </Text>
          <Text as="p" size="2">
            Blisters in packs of: 7, 10, 14, 20, 28, 30, 50, 56, 84, 90, 98,
            100, 140, and 200 tablets. Unit-dose blisters in packs of 49×1,
            50×1 and 56×1 tablets. Not all pack sizes may be marketed.
          </Text>
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="2" p="3">
          <Heading size="3">Marketing Authorisation Holder & Manufacturer</Heading>
          <Text as="p" size="2">
            <Text as="span" weight="medium">
              Marketing Authorisation Holder:
            </Text>{" "}
            Organon Pharma (UK) Limited, The Hewett Building, 14 Hewett
            Street, London EC2A 3NP, United Kingdom.
          </Text>
          <Text as="p" size="2">
            <Text as="span" weight="medium">
              Manufacturer:
            </Text>{" "}
            Organon Pharma (UK) Limited, Shotton Lane, Cramlington, NE23 3JU,
            UK.
          </Text>
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="2" p="3">
          <Heading size="3">Asthma information</Heading>
          <Text as="p" size="2">
            Information is given by Asthma UK, 18 Mansell Street, London E1
            8AA. Helpline: 0300 222 5800, Monday to Friday 9 am – 5 pm. Asthma
            UK is an independent charity working to conquer asthma and is not
            associated with Organon Pharma (UK) Limited.
          </Text>
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="2" p="3">
          <Heading size="3">Authorised in the EEA under the name</Heading>
          <Text as="p" size="2" color="gray">
            Austria, Belgium, Denmark, Finland, France, Greece, Spain, Sweden,
            Germany, Ireland, United Kingdom, Italy, Luxembourg, Netherlands,
            Portugal — Singulair.
          </Text>
        </Flex>
      </Card>
    </Flex>
  );
}

function SourceFooter() {
  return (
    <>
      <Separator size="4" />
      <Flex direction="column" gap="2">
        <Text as="p" size="1" color="gray">
          Source:{" "}
          <RadixLink
            href="https://www.medicines.org.uk/emc/product/197/smpc"
            target="_blank"
            rel="noopener noreferrer"
          >
            medicines.org.uk SmPC product 197{" "}
            <ExternalLink size={12} style={{ display: "inline" }} />
          </RadixLink>{" "}
          and the Singulair Paediatric 5 mg chewable tablets Patient
          Information Leaflet, last revised December 2022. © 2022 Organon
          group of companies. Reference: PIL.SGA-5mg.22.UK.0191.IA-Cram-BR-SNC.NoRCN.
        </Text>
        <Text as="p" size="1" color="gray">
          This page reproduces the regulatory leaflet for informational
          purposes only and is not a substitute for medical advice. Always
          follow the directions of the prescribing doctor or pharmacist.
        </Text>
      </Flex>
    </>
  );
}
