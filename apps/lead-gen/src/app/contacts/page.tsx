import { ContactsClient } from "./contacts-client";
import { Suspense } from "react";
import { css } from "styled-system/css";

export default function ContactsPage() {
  return (
    <Suspense
      fallback={
        <div className={css({ maxWidth: "1200px", mx: "auto", p: "8" })}>
          <span className={css({ color: "ui.secondary" })}>Loading...</span>
        </div>
      }
    >
      <ContactsClient />
    </Suspense>
  );
}
