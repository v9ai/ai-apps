import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import {
  bloodTests,
  conditions,
  medications,
  symptoms,
  appointments,
  healthStateEmbeddings,
  doctors,
  familyMembers,
} from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { Card, Grid, Text } from "@radix-ui/themes";
import Link from "next/link";

const sections = [
  { table: bloodTests, label: "Blood Tests", href: "/blood-tests" },
  { table: conditions, label: "Conditions", href: "/conditions" },
  { table: medications, label: "Medications", href: "/medications" },
  { table: symptoms, label: "Symptoms", href: "/symptoms" },
  { table: appointments, label: "Appointments", href: "/appointments" },
  { table: healthStateEmbeddings, label: "Health States", href: "/trajectory" },
  { table: doctors, label: "Doctors", href: "/doctors" },
  { table: familyMembers, label: "Family", href: "/family" },
] as const;

export async function QuickStats() {
  const { userId } = await withAuth();

  const counts = await Promise.all(
    sections.map((s) =>
      db
        .select({ count: count() })
        .from(s.table)
        .where(eq(s.table.userId, userId))
        .then((r) => r[0]?.count ?? 0)
    )
  );

  return (
    <Grid columns={{ initial: "2", md: "3" }} gap="4">
      {sections.map((section, i) => (
        <Link
          key={section.href}
          href={section.href}
          style={{ textDecoration: "none" }}
        >
          <Card>
            <Text
              as="div"
              size="7"
              weight="bold"
              align="center"
            >
              {counts[i]}
            </Text>
            <Text as="div" size="2" color="gray" align="center">
              {section.label}
            </Text>
          </Card>
        </Link>
      ))}
    </Grid>
  );
}
