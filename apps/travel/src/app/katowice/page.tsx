import { redirect } from "next/navigation";

// Redirect /katowice to / (root is Katowice home page)
export default function KatowicePage() {
  redirect("/");
}
