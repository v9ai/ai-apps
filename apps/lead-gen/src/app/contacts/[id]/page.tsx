import { ContactDetailClient } from "./contact-detail-client";
import { Suspense } from "react";
import { css } from "styled-system/css";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className={css({ maxWidth: "768px", mx: "auto", p: "8" })}>
          <span className={css({ color: "ui.secondary" })}>Loading...</span>
        </div>
      }
    >
      <ContactDetailClient contactId={parseInt(id)} />
    </Suspense>
  );
}
