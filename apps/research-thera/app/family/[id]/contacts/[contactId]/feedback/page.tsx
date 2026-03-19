"use client";

import {
  Box,
  Flex,
  Heading,
  Text,
  Spinner,
  Button,
  Separator,
} from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { useRouter, useParams } from "next/navigation";
import NextLink from "next/link";
import dynamic from "next/dynamic";
import {
  useGetContactQuery,
  useGetFamilyMemberQuery,
  useGetContactFeedbacksQuery,
  useDeleteContactFeedbackMutation,
} from "@/app/__generated__/hooks";
import ContactFeedbackList from "@/app/components/ContactFeedbackList";
import AddContactFeedbackButton from "@/app/components/AddContactFeedbackButton";

function ContactFeedbackListContent() {
  const router = useRouter();
  const params = useParams();
  const familySlug = params.id as string;
  const contactRaw = params.contactId as string;

  const isContactNumeric = /^\d+$/.test(contactRaw);
  const contactId = isContactNumeric ? parseInt(contactRaw, 10) : NaN;
  const contactSlug = isContactNumeric ? undefined : contactRaw;

  const isFamilyNumeric = /^\d+$/.test(familySlug);
  const familyId = isFamilyNumeric ? parseInt(familySlug, 10) : NaN;
  const familyMemberSlug = isFamilyNumeric ? undefined : familySlug;

  const { data: contactData, loading: contactLoading } = useGetContactQuery({
    variables: isContactNumeric ? { id: contactId } : { slug: contactSlug },
    skip: isContactNumeric ? isNaN(contactId) : !contactSlug,
  });

  const { data: familyData, loading: familyLoading } = useGetFamilyMemberQuery({
    variables: isFamilyNumeric ? { id: familyId } : { slug: familyMemberSlug },
    skip: isFamilyNumeric ? isNaN(familyId) : !familyMemberSlug,
  });

  const contact = contactData?.contact;
  const familyMember = familyData?.familyMember;
  const resolvedContactId = contact?.id ?? NaN;
  const resolvedFamilyMemberId = familyMember?.id ?? NaN;

  const { data: feedbackData, loading: feedbackLoading } =
    useGetContactFeedbacksQuery({
      variables: {
        contactId: resolvedContactId,
        familyMemberId: resolvedFamilyMemberId,
      },
      skip: isNaN(resolvedContactId) || isNaN(resolvedFamilyMemberId),
    });

  const feedbacks = feedbackData?.contactFeedbacks ?? [];

  const [deleteFeedback, { loading: deleting }] =
    useDeleteContactFeedbackMutation({
      refetchQueries: ["GetContactFeedbacks"],
    });

  const handleDelete = (id: number) => {
    deleteFeedback({ variables: { id } });
  };

  const handleClickItem = (id: number) => {
    router.push(
      `/family/${familySlug}/contacts/${contactRaw}/feedback/${id}`,
    );
  };

  if (contactLoading || familyLoading || feedbackLoading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (!contact || !familyMember) {
    return (
      <Text color="red">
        {!contact ? "Contact not found" : "Family member not found"}
      </Text>
    );
  }

  return (
    <Flex direction="column" gap="4">
      <Flex justify="between" align="center">
        <Heading size="4">
          Feedback ({feedbacks.length})
        </Heading>
        <AddContactFeedbackButton
          contactId={resolvedContactId}
          familyMemberId={resolvedFamilyMemberId}
          size="2"
        />
      </Flex>
      <Separator size="4" />
      <ContactFeedbackList
        feedbacks={feedbacks}
        onDelete={handleDelete}
        deleting={deleting}
        onClickItem={handleClickItem}
      />
    </Flex>
  );
}

const DynamicContent = dynamic(
  () => Promise.resolve(ContactFeedbackListContent),
  { ssr: false },
);

export default function ContactFeedbackListPage() {
  const params = useParams();
  const familySlug = params.id as string;
  const contactRaw = params.contactId as string;

  const isContactNumeric = /^\d+$/.test(contactRaw);
  const contactId = isContactNumeric ? parseInt(contactRaw, 10) : NaN;
  const contactSlug = isContactNumeric ? undefined : contactRaw;

  const { data: contactData } = useGetContactQuery({
    variables: isContactNumeric ? { id: contactId } : { slug: contactSlug },
    skip: isContactNumeric ? isNaN(contactId) : !contactSlug,
  });

  const contact = contactData?.contact;
  const contactName = contact
    ? `${contact.firstName}${contact.lastName ? ` ${contact.lastName}` : ""}`
    : "Contact";

  return (
    <Flex direction="column" gap="5">
      {/* Sticky Header */}
      <Box
        position="sticky"
        top="0"
        style={{
          zIndex: 20,
          background: "var(--color-panel)",
          borderBottom: "1px solid var(--gray-a6)",
          backdropFilter: "blur(10px)",
          marginLeft: "calc(-1 * var(--space-3))",
          marginRight: "calc(-1 * var(--space-3))",
          paddingLeft: "var(--space-3)",
          paddingRight: "var(--space-3)",
        }}
      >
        <Flex
          py="3"
          align="center"
          gap={{ initial: "2", md: "4" }}
          style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}
        >
          <Button variant="soft" size="2" radius="full" color="gray" asChild>
            <NextLink href={`/family/${familySlug}/contacts/${contactRaw}`}>
              <ArrowLeftIcon />
              <Box display={{ initial: "none", sm: "inline" }} asChild>
                <span>{contactName}</span>
              </Box>
            </NextLink>
          </Button>

          <Box display={{ initial: "none", sm: "block" }}><Separator orientation="vertical" style={{ height: 20 }} /></Box>

          <Box minWidth="0" style={{ flex: 1 }}>
            <Heading size={{ initial: "5", md: "8" }} weight="bold" truncate>
              Feedback
            </Heading>
          </Box>
        </Flex>
      </Box>

      <Box style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        <DynamicContent />
      </Box>
    </Flex>
  );
}
