"use client";

import { useState, useEffect } from "react";
import { Flex, Spinner } from "@radix-ui/themes";
import { OpportunitiesClient } from "@/app/opportunities/opportunities-client";
import { getOpportunities } from "./actions";

type Row = Awaited<ReturnType<typeof getOpportunities>>[number];

export function OpportunitiesTab() {
  const [data, setData] = useState<Row[] | null>(null);

  useEffect(() => {
    getOpportunities().then(setData);
  }, []);

  if (!data) {
    return (
      <Flex justify="center" py="8">
        <Spinner size="3" />
      </Flex>
    );
  }

  return <OpportunitiesClient opportunities={data} />;
}
