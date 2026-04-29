"use client";

import Link from "next/link";
import { CubeIcon, PlusIcon } from "@radix-ui/react-icons";
import { Heading, Text } from "@radix-ui/themes";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import { iconHolder, pipelineCard } from "@/recipes/cards";

export function ProductsEmptyState({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div
      className={css({
        display: "flex",
        justifyContent: "center",
        py: "8",
      })}
    >
      <div
        className={pipelineCard({})}
        style={{ maxWidth: 520, width: "100%", textAlign: "center" }}
      >
        <div
          className={css({
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4",
          })}
        >
          <span
            aria-hidden="true"
            className={iconHolder({ size: "md" })}
            style={{ width: 56, height: 56 }}
          >
            <CubeIcon width="28" height="28" />
          </span>
          <Heading size="5">
            {isAdmin ? "Add your first product" : "No products yet"}
          </Heading>
          <Text size="2" color="gray" className={css({ maxWidth: "32ch" })}>
            {isAdmin
              ? "Paste a URL — we'll fetch metadata, run ICP, and score competitors."
              : "Ask an operator to add the first product."}
          </Text>
          {isAdmin && (
            <>
              <Link
                href="/products/new"
                className={button({ variant: "gradient", size: "md" })}
              >
                <PlusIcon aria-hidden /> Add product
              </Link>
              <Text size="1" color="gray">
                Example: https://linear.app
              </Text>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
