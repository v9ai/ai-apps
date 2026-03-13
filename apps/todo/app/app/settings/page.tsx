import { headers } from "next/headers";
import { Flex, Heading } from "@radix-ui/themes";
import { auth } from "@/lib/auth";
import { db } from "@/src/db";
import { userPreferences } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const prefs = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.user.id))
    .limit(1);

  const currentPrefs = prefs[0] ?? null;

  return (
    <Flex direction="column" gap="4">
      <Heading size="5">Settings</Heading>
      <SettingsForm
        chronotype={currentPrefs?.chronotype ?? "intermediate"}
        chunkSize={currentPrefs?.chunkSize ?? 7}
        gamificationEnabled={currentPrefs?.gamificationEnabled ?? true}
        bufferPercentage={currentPrefs?.bufferPercentage ?? 25}
        priorityWeights={
          currentPrefs?.priorityWeights ?? {
            deadlineUrgency: 0.4,
            userValue: 0.3,
            dependencyImpact: 0.2,
            projectWeight: 0.1,
          }
        }
      />
    </Flex>
  );
}
