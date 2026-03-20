import { PortfolioPanel } from "@/components/portfolio-panel";
import { PortfolioAnalytics } from "@/components/portfolio-analytics";

export const metadata = {
  title: "Portfolio | PropertyAI",
  description: "Track saved listings, monitor price changes, portfolio analytics, and manage alerts.",
};

export default function PortfolioPage() {
  return (
    <>
      <PortfolioPanel />
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 20px 64px" }}>
        <PortfolioAnalytics />
      </div>
    </>
  );
}
