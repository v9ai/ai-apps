import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, Grid, Text } from "@radix-ui/themes";
import Link from "next/link";

const sections = [
  { table: "blood_tests", label: "Blood Tests", href: "/protected/blood-tests" },
  { table: "conditions", label: "Conditions", href: "/protected/conditions" },
  { table: "medications", label: "Medications", href: "/protected/medications" },
  { table: "symptoms", label: "Symptoms", href: "/protected/symptoms" },
  { table: "appointments", label: "Appointments", href: "/protected/appointments" },
  { table: "health_state_embeddings", label: "Health States", href: "/protected/trajectory" },
] as const;

export async function QuickStats() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const counts = await Promise.all(
    sections.map((s) =>
      supabase.from(s.table).select("id", { count: "exact", head: true })
    )
  );

  return (
    <Grid columns={{ initial: "2", md: "3" }} gap="4">
      {sections.map((section, i) => (
        <Link
          key={section.table}
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
              {counts[i].count ?? 0}
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
