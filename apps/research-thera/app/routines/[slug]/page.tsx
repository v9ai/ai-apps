"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import NextLink from "next/link";
import {
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Spinner,
  Button,
  Separator,
  IconButton,
  Tooltip,
  Callout,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  CheckIcon,
  InfoCircledIcon,
  Pencil1Icon,
} from "@radix-ui/react-icons";
import {
  useGetFamilyMemberQuery,
  useGetHabitsQuery,
  useLogHabitMutation,
  HabitStatus,
  HabitFrequency,
} from "@/app/__generated__/hooks";
import { AuthGate } from "@/app/components/AuthGate";
import { format } from "date-fns";

type RoutineGroup = {
  key: "DAILY" | "WEEKLY";
  label: string;
  description: string;
};

const ROUTINE_GROUPS: RoutineGroup[] = [
  {
    key: "DAILY",
    label: "Daily routine",
    description: "Habits to complete every day",
  },
  {
    key: "WEEKLY",
    label: "Weekly routine",
    description: "Habits to complete weekly",
  },
];

function RoutineContent({ slug }: { slug: string }) {
  const {
    data: familyData,
    loading: familyLoading,
    error: familyError,
  } = useGetFamilyMemberQuery({
    variables: { slug },
    skip: !slug,
  });

  const familyMember = familyData?.familyMember;

  const {
    data: habitsData,
    loading: habitsLoading,
    refetch: refetchHabits,
  } = useGetHabitsQuery({
    variables: { familyMemberId: familyMember?.id },
    skip: !familyMember?.id,
  });

  const [logHabit, { loading: logging }] = useLogHabitMutation({
    onCompleted: () => refetchHabits(),
  });

  const habitsByFrequency = useMemo(() => {
    const byFreq: Record<string, typeof habitsData extends { habits: infer H } ? H : never> =
      {} as never;
    const all = habitsData?.habits ?? [];
    const active = all.filter((h) => h.status === HabitStatus.Active);
    return {
      DAILY: active.filter((h) => h.frequency === HabitFrequency.Daily),
      WEEKLY: active.filter((h) => h.frequency === HabitFrequency.Weekly),
      all: active,
    };
  }, [habitsData]);

  if (familyLoading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: 200 }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (familyError || !familyMember) {
    return (
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Text color="red">
            {familyError?.message || `No family member found for "${slug}"`}
          </Text>
          <Button variant="soft" asChild>
            <NextLink href="/routines">Back to Routines</NextLink>
          </Button>
        </Flex>
      </Card>
    );
  }

  const displayName =
    familyMember.name || familyMember.firstName || familyMember.slug || "Unnamed";

  return (
    <Flex direction="column" gap="5">
      <Flex align="center" gap="3">
        <Tooltip content="Back to routines">
          <IconButton variant="ghost" color="gray" asChild>
            <NextLink href="/routines" aria-label="Back to routines">
              <ArrowLeftIcon />
            </NextLink>
          </IconButton>
        </Tooltip>
        <Flex direction="column" gap="1">
          <Heading size="6">{displayName}&apos;s routine</Heading>
          <Flex gap="2" wrap="wrap">
            {familyMember.relationship ? (
              <Badge variant="soft" color="indigo">
                {familyMember.relationship}
              </Badge>
            ) : null}
            {familyMember.ageYears ? (
              <Badge variant="soft" color="gray">
                {familyMember.ageYears} y/o
              </Badge>
            ) : null}
            <Badge variant="soft" color="gray">
              {habitsByFrequency.all.length} active habit
              {habitsByFrequency.all.length === 1 ? "" : "s"}
            </Badge>
          </Flex>
        </Flex>
      </Flex>

      {habitsLoading ? (
        <Flex justify="center" py="6">
          <Spinner size="3" />
        </Flex>
      ) : habitsByFrequency.all.length === 0 ? (
        <Callout.Root color="gray" variant="surface">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            No active habits for {displayName} yet. Add habits from the{" "}
            <NextLink href="/habits" style={{ textDecoration: "underline" }}>
              Habits page
            </NextLink>{" "}
            and they will show up here as part of the routine.
          </Callout.Text>
        </Callout.Root>
      ) : (
        <Flex direction="column" gap="5">
          {ROUTINE_GROUPS.map((group) => {
            const items = habitsByFrequency[group.key];
            if (!items || items.length === 0) return null;
            return (
              <Flex key={group.key} direction="column" gap="3">
                <Flex direction="column" gap="1">
                  <Heading size="4">{group.label}</Heading>
                  <Text size="2" color="gray">
                    {group.description}
                  </Text>
                </Flex>
                <Flex direction="column" gap="2">
                  {items.map((habit) => {
                    const completed = !!habit.todayLog;
                    return (
                      <Card key={habit.id}>
                        <Flex align="center" justify="between" gap="3" p="2">
                          <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
                            <Flex align="center" gap="2">
                              <NextLink
                                href={`/habits/${habit.id}`}
                                style={{ textDecoration: "none", color: "inherit" }}
                              >
                                <Text weight="medium">{habit.title}</Text>
                              </NextLink>
                              {habit.targetCount > 1 ? (
                                <Badge variant="soft" color="gray" size="1">
                                  ×{habit.targetCount}
                                </Badge>
                              ) : null}
                            </Flex>
                            {habit.description ? (
                              <Text size="2" color="gray">
                                {habit.description}
                              </Text>
                            ) : null}
                          </Flex>
                          <Button
                            size="2"
                            variant={completed ? "soft" : "solid"}
                            color={completed ? "green" : "indigo"}
                            disabled={logging || completed}
                            onClick={() =>
                              logHabit({
                                variables: {
                                  habitId: habit.id,
                                  loggedDate: format(new Date(), "yyyy-MM-dd"),
                                },
                              })
                            }
                          >
                            <CheckIcon />
                            {completed ? "Done" : "Log"}
                          </Button>
                        </Flex>
                      </Card>
                    );
                  })}
                </Flex>
              </Flex>
            );
          })}

          <Separator size="4" />
          <Flex justify="end">
            <Button variant="soft" asChild>
              <NextLink href={`/family/${familyMember.id}`}>
                <Pencil1Icon />
                Manage {displayName}
              </NextLink>
            </Button>
          </Flex>
        </Flex>
      )}
    </Flex>
  );
}

export default function RoutineBySlugPage() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";

  return (
    <AuthGate pageName={`Routine · ${slug}`}>
      <RoutineContent slug={slug} />
    </AuthGate>
  );
}
