import { getDriver } from "./client";

export async function initSchema() {
  const session = getDriver().session();
  try {
    // Argument graph constraints
    await session.run("CREATE CONSTRAINT claim_id IF NOT EXISTS FOR (c:Claim) REQUIRE c.id IS UNIQUE");
    await session.run("CREATE CONSTRAINT evidence_id IF NOT EXISTS FOR (e:Evidence) REQUIRE e.id IS UNIQUE");
    await session.run("CREATE CONSTRAINT rule_id IF NOT EXISTS FOR (r:Rule) REQUIRE r.id IS UNIQUE");
    await session.run("CREATE CONSTRAINT authority_id IF NOT EXISTS FOR (a:Authority) REQUIRE a.id IS UNIQUE");

    // Knowledge graph constraints
    await session.run("CREATE CONSTRAINT case_citation IF NOT EXISTS FOR (c:Case) REQUIRE c.citation IS UNIQUE");
    await session.run("CREATE CONSTRAINT statute_citation IF NOT EXISTS FOR (s:Statute) REQUIRE s.citation IS UNIQUE");
    await session.run("CREATE CONSTRAINT principle_name IF NOT EXISTS FOR (p:LegalPrinciple) REQUIRE p.name IS UNIQUE");

    // Indexes for common queries
    await session.run("CREATE INDEX claim_session IF NOT EXISTS FOR (c:Claim) ON (c.session_id)");
    await session.run("CREATE INDEX claim_round IF NOT EXISTS FOR (c:Claim) ON (c.round)");
    await session.run("CREATE INDEX evidence_session IF NOT EXISTS FOR (e:Evidence) ON (e.session_id)");
    await session.run("CREATE INDEX case_jurisdiction IF NOT EXISTS FOR (c:Case) ON (c.jurisdiction)");
  } finally {
    await session.close();
  }
}
