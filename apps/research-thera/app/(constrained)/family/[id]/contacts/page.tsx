"use client";

import {
  Box,
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Spinner,
  Button,
  Separator,
} from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { useParams, useRouter } from "next/navigation";
import NextLink from "next/link";
import dynamic from "next/dynamic";
import { useGetFamilyMemberQuery } from "@/app/__generated__/hooks";
import AddContactButton from "@/app/components/AddContactButton";

function ContactsListContent() {
  const router = useRouter();
  const params = useParams();
  const familySlug = params.id as string;
  const isNumeric = /^\d+$/.test(familySlug);
  const familyIdFromRoute = isNumeric ? parseInt(familySlug, 10) : NaN;

  const { data, loading, error } = useGetFamilyMemberQuery({
    variables: isNumeric ? { id: familyIdFromRoute } : { slug: familySlug },
    skip: isNumeric ? isNaN(familyIdFromRoute) : !familySlug,
  });

  const familyMember = data?.familyMember;
  const familyMemberId = familyMember?.id ?? NaN;

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (error || !familyMember) {
    return (
      <Card>
        <Flex direction="column" gap="3" p="4" align="center">
          <Text color="red">
            {error ? `Error: ${error.message}` : "Family member not found"}
          </Text>
        </Flex>
      </Card>
    );
  }

  const contactRelationships = (familyMember.relationships ?? []).filter(
    (r) => r.relatedType === "CONTACT",
  );

  return (
    <Flex direction="column" gap="5" p="5">
      <Flex justify="between" align="center" wrap="wrap" gap="3">
        <Flex gap="3" align="center">
          <Button variant="ghost" size="2" asChild>
            <NextLink href={`/family/${familySlug}`}>
              <ArrowLeftIcon />
            </NextLink>
          </Button>
          <Box>
            <Heading size="5">Contacts</Heading>
            <Text size="2" color="gray">
              for {familyMember.firstName}
              {familyMember.name ? ` ${familyMember.name}` : ""}
            </Text>
          </Box>
        </Flex>
        {!isNaN(familyMemberId) && (
          <AddContactButton
            familyMemberId={familyMemberId}
            refetchQueries={["GetFamilyMember"]}
            size="2"
          />
        )}
      </Flex>

      <Separator size="4" />

      {contactRelationships.length === 0 ? (
        <Card>
          <Flex direction="column" gap="3" align="center" justify="center" p="6">
            <Text size="3" color="gray">
              No contacts yet. Add classmates, teachers, or others.
            </Text>
          </Flex>
        </Card>
      ) : (
        <Flex direction="column" gap="3">
          {contactRelationships.map((rel) => {
            const contact = rel.related;
            if (!contact) return null;
            const href = `/family/${familySlug}/contacts/${contact.slug || contact.id}`;
            return (
              <Card
                key={rel.id}
                variant="surface"
                style={{ cursor: "pointer" }}
                onClick={() => router.push(href)}
              >
                <Flex direction="column" gap="2" p="4">
                  <Flex justify="between" align="center" wrap="wrap" gap="2">
                    <Flex gap="2" align="center" wrap="wrap">
                      <Text size="3" weight="bold" color="indigo">
                        {contact.firstName}
                        {contact.lastName ? ` ${contact.lastName}` : ""}
                      </Text>
                      <Badge color="violet" variant="soft" size="1">
                        {rel.relationshipType.replace(/_/g, " ")}
                      </Badge>
                    </Flex>
                    <Button variant="soft" size="2" asChild onClick={(e) => e.stopPropagation()}>
                      <NextLink href={href}>View</NextLink>
                    </Button>
                  </Flex>
                  {rel.context && (
                    <Text size="2" color="gray" style={{ fontStyle: "italic" }}>
                      {rel.context}
                    </Text>
                  )}
                </Flex>
              </Card>
            );
          })}
        </Flex>
      )}
    </Flex>
  );
}

const DynamicContactsList = dynamic(() => Promise.resolve(ContactsListContent), {
  ssr: false,
});

export default function ContactsListPage() {
  return <DynamicContactsList />;
}
