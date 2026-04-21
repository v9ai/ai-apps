import { css } from "styled-system/css";
import { SuspensionLinks } from "../../_components/SuspensionLinks";

export const metadata = {
  title: "Tank Suspensions — Bricks",
  description:
    "Direct YouTube links for LEGO tank suspensions: Christie, HVSS, torsion bar, and Technic suspension theory.",
};

export default function SuspensionsPage() {
  return (
    <main
      className={css({
        mx: "auto",
        maxW: "4xl",
        px: "4",
        py: "12",
      })}
    >
      <SuspensionLinks />
    </main>
  );
}
