import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Box, Flex } from "@radix-ui/themes";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/navigation/Sidebar";
import { QuickCapture } from "@/components/navigation/QuickCapture";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <Flex style={{ minHeight: "100vh" }}>
      <Sidebar userName={session.user.name} />
      <Box
        style={{
          flex: 1,
          marginLeft: "var(--sidebar-width)",
          padding: "24px 32px",
        }}
      >
        {children}
      </Box>
      <QuickCapture />
    </Flex>
  );
}
