"use client";

import { ContactDetailClient } from "@/app/contacts/[slug]/contact-detail-client";

type Props = {
  contactSlug: string;
};

export function ContactDetailProvider({ contactSlug }: Props) {
  const numericId = /^\d+$/.test(contactSlug) ? parseInt(contactSlug, 10) : null;
  return numericId
    ? <ContactDetailClient contactId={numericId} />
    : <ContactDetailClient contactSlug={contactSlug} />;
}
