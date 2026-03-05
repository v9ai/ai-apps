import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Badge, Box, Card, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import { Suspense } from "react";
import { AddSymptomForm } from "./add-form";
import { deleteSymptom } from "./actions";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { Activity } from "lucide-react";
import Link from "next/link";

const severityColor = {
  mild: "green" as const,
  moderate: "orange" as const,
  severe: "red" as const,
};

async function SymptomsList() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: symptoms } = await supabase
    .from("symptoms")
    .select("*")
    .order("logged_at", { ascending: false });

  if (!symptoms?.length) {
    return (
      <Flex direction="column" align="center" gap="3" py="6">
        <Activity size={48} color="var(--gray-8)" />
        <Heading size="4">No symptoms logged</Heading>
        <Text size="2" color="gray">Log a symptom above to start your health journal.</Text>
      </Flex>
    );
  }

  return (
    <>
      <Separator size="4" />
      <Flex direction="column" gap="2">
        <Heading size="4">Symptom journal</Heading>
        {symptoms.map((s) => (
          <Card key={s.id} asChild className="card-hover">
            <Link href={`/protected/symptoms/${s.id}`} style={{ textDecoration: "none" }}>
              <Flex justify="between" align="start">
                <Flex direction="column" gap="1">
                  <Flex align="center" gap="2">
                    <Text size="2" weight="medium">{s.description}</Text>
                    {s.severity && (
                      <Badge color={severityColor[s.severity as keyof typeof severityColor]} variant="soft" size="1">
                        {s.severity}
                      </Badge>
                    )}
                  </Flex>
                  <Text size="1" color="gray">
                    {new Date(s.logged_at).toLocaleString()}
                  </Text>
                </Flex>
                <DeleteConfirmButton
                  action={deleteSymptom.bind(null, s.id)}
                  description="This symptom entry will be permanently removed."
                  stopPropagation
                />
              </Flex>
            </Link>
          </Card>
        ))}
      </Flex>
    </>
  );
}

export default function SymptomsPage() {
  return (
    <Box py="8" style={{ maxWidth: 600, margin: "0 auto" }}>
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="1">
          <Heading size="7" weight="bold">Symptoms</Heading>
          <Text size="2" color="gray">Log and monitor your symptoms over time.</Text>
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">Log a symptom</Heading>
          <AddSymptomForm />
        </Flex>

        <Suspense fallback={
          <Flex direction="column" gap="2">
            <Skeleton height="52px" />
            <Skeleton height="52px" />
            <Skeleton height="52px" />
          </Flex>
        }>
          <SymptomsList />
        </Suspense>
      </Flex>
    </Box>
  );
}
