"use client";

import { useSearchParams } from "next/navigation";
import { ContactDetailClient } from "@/app/contacts/[slug]/contact-detail-client";
import { ContactDetailEditorial } from "@/components/contact-detail/variants/editorial";
import { ContactDetailDashboard } from "@/components/contact-detail/variants/dashboard";
import { ContactDetailAction } from "@/components/contact-detail/variants/action";

type Props = {
  contactSlug: string;
};

export function ContactDetailProvider({ contactSlug }: Props) {
  const searchParams = useSearchParams();
  const ux = searchParams?.get("ux")?.toLowerCase() ?? null;

  const numericId = /^\d+$/.test(contactSlug) ? parseInt(contactSlug, 10) : null;
  const variantProps = numericId ? { contactId: numericId } : { contactSlug };

  if (ux === "a" || ux === "editorial") {
    return <ContactDetailEditorial {...variantProps} />;
  }
  if (ux === "b" || ux === "dashboard") {
    return <ContactDetailDashboard {...variantProps} />;
  }
  if (ux === "c" || ux === "action") {
    return <ContactDetailAction {...variantProps} />;
  }

  return numericId
    ? <ContactDetailClient contactId={numericId} />
    : <ContactDetailClient contactSlug={contactSlug} />;
}
